import { z } from "zod";
import JSZip from "jszip";
import { anthropic } from "@/lib/adapters/anthropic";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ResearchSnippet, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { getOutline, OUTPUT_FORMAT_LABELS, type OutputFormat, type WriteupMode } from "./outlines";
import { runAnalysis, describeAnalysisFigures, buildAnalysisAppendix } from "./analysis";
import { WriteupDocument } from "./render";

const inputSchema = z
  .object({
    mode: z.enum(["do_assignment", "writeup_existing"]),
    outputFormat: z.enum(["project_report", "technical_article", "proposal", "case_study"]),
    topic: z.string().min(6, "describe the project or topic"),
    audience: z.string().optional(),
    objective: z.string().optional(),
    requiredSections: z.string().optional(),
    csvData: z.string().optional(),
    targetColumn: z.string().optional(),
    horizon: z.coerce.number().optional(),
    existingWorkNotes: z.string().optional(),
    timeline: z.string().optional(),
    budgetNotes: z.string().optional(),
    companionThread: z.coerce.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "writeup_existing" && (!v.existingWorkNotes || v.existingWorkNotes.trim().length < 20)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "describe the existing work in at least 20 characters",
        path: ["existingWorkNotes"],
      });
    }
  })
  .transform((v) => ({ ...v, prompt: v.topic }));

export const s13WriteupStudio: ServiceModule = {
  id: "s13-writeup-studio",
  label: "Project Writeup and Proposal Studio",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const mode = ctx.job.inputs.mode as WriteupMode;
    const outputFormat = ctx.job.inputs.outputFormat as OutputFormat;
    const topic = String(ctx.job.inputs.topic ?? "");
    const audience = String(ctx.job.inputs.audience ?? "General");
    const objective = String(ctx.job.inputs.objective ?? "");
    const requiredSections = String(ctx.job.inputs.requiredSections ?? "");
    const csvData = String(ctx.job.inputs.csvData ?? "");
    const targetColumn = ctx.job.inputs.targetColumn ? String(ctx.job.inputs.targetColumn) : undefined;
    const horizon = Number(ctx.job.inputs.horizon ?? 6);
    const existingWorkNotes = String(ctx.job.inputs.existingWorkNotes ?? "");
    const timeline = String(ctx.job.inputs.timeline ?? "");
    const budgetNotes = String(ctx.job.inputs.budgetNotes ?? "");
    const companionThread = Boolean(ctx.job.inputs.companionThread);

    const analysis = csvData ? runAnalysis(csvData, mode === "do_assignment" ? targetColumn : undefined, horizon) : null;
    const figures = analysis ? describeAnalysisFigures(analysis) : "";

    const notesSnippets: ResearchSnippet[] =
      mode === "writeup_existing" && existingWorkNotes
        ? [{ id: "user-notes", source: "User-provided notes", text: existingWorkNotes }]
        : [];
    const combinedContext = [...ctx.research, ...notesSnippets];

    const extraContext = [
      objective ? `Objective: ${objective}.` : "",
      requiredSections ? `Required coverage: ${requiredSections}.` : "",
      outputFormat === "proposal" && timeline ? `Timeline as stated by the requester: ${timeline}.` : "",
      outputFormat === "proposal" && budgetNotes ? `Budget/resources as stated by the requester: ${budgetNotes}.` : "",
      figures ? `Key figures to interpret: ${figures}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const outline = getOutline(outputFormat);
    const sections = await Promise.all(
      outline.map(async (section) => ({
        heading: section.heading,
        body: await anthropic.writeSection({
          heading: section.heading,
          instructions: `${ctx.plan.composeInstructions} ${extraContext}`,
          context: combinedContext,
        }),
      }))
    );

    if (outputFormat === "technical_article" && companionThread) {
      const thread = await anthropic.writeSection({
        heading: "Companion thread draft",
        instructions:
          `${ctx.plan.composeInstructions} Write a short companion X/Twitter thread draft: a ` +
          `hook tweet followed by 6 to 10 short numbered points covering the same work. ${extraContext}`,
        context: combinedContext,
      });
      sections.push({ heading: "Companion thread draft", body: thread });
    }

    const title = `${topic} - ${OUTPUT_FORMAT_LABELS[outputFormat]}`;
    const document = (
      <WriteupDocument
        title={title}
        mode={mode}
        outputFormat={outputFormat}
        audience={audience}
        sections={sections}
        sources={ctx.research}
        hasAppendix={!!analysis}
        jobId={ctx.job.id}
      />
    );

    const pdfBuffer = await renderPdfDocument(document);

    if (!analysis) {
      return { title, file: { buffer: pdfBuffer, contentType: "application/pdf", extension: "pdf" } };
    }

    const appendixBuffer = await buildAnalysisAppendix(analysis);
    const zip = new JSZip();
    zip.file("writeup.pdf", pdfBuffer);
    zip.file("analysis-appendix.xlsx", appendixBuffer);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return { title, file: { buffer: zipBuffer, contentType: "application/zip", extension: "zip" } };
  },
};
