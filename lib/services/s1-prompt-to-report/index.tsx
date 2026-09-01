import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { ReportDocument } from "./render";

const inputSchema = z.object({
  prompt: z.string().min(8, "describe what the report should cover"),
  audience: z.string().optional(),
  length: z.enum(["brief", "standard", "deep"]).optional(),
});

export const s1PromptToReport: ServiceModule = {
  id: "s1-prompt-to-report",
  label: "Prompt to Report",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const sections = await Promise.all(
      ctx.plan.outline.map(async (section) => ({
        heading: section.heading,
        body: await anthropic.writeSection({
          heading: section.heading,
          instructions: ctx.plan.composeInstructions,
          context: ctx.research,
        }),
      }))
    );

    const title = ctx.job.prompt ?? "Untitled report";

    const document = (
      <ReportDocument
        title={title}
        audience={(ctx.job.inputs.audience as string) ?? "General"}
        sections={sections}
        sources={ctx.research}
        jobId={ctx.job.id}
      />
    );

    const buffer = await renderPdfDocument(document);

    return { title, file: { buffer, contentType: "application/pdf", extension: "pdf" } };
  },
};
