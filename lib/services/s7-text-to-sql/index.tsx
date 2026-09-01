import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import { renderPdfDocument } from "@/lib/pdf/render";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { answerFromDemoData } from "./query-engine";
import { assertReadOnlySelect } from "./guard";
import { introspectSchema, runReadOnlyQuery } from "./postgres";
import { translateQuestionToSql } from "./translate";
import { TextToSqlDocument } from "./render";

const inputSchema = z
  .object({
    question: z.string().min(6, "ask a question about the data"),
    connectionString: z.string().optional(),
  })
  .transform((v) => ({
    question: v.question.trim(),
    connectionString: v.connectionString?.trim() ?? "",
    prompt: `Text to SQL: ${v.question.trim()}`,
  }));

function describeFigures(columns: string[], rows: Record<string, unknown>[], totalRows: number): string {
  const sample = rows.slice(0, 10).map((r) => columns.map((c) => `${c}=${r[c]}`).join(", "));
  return `Columns: ${columns.join(", ")}. ${totalRows} row(s) returned. Sample: ${sample.join(" | ")}`;
}

export const s7TextToSql: ServiceModule = {
  id: "s7-text-to-sql",
  label: "Text to SQL",

  validateInputs(inputs: unknown) {
    const parsed = inputSchema.parse(inputs);
    if (parsed.connectionString && process.env.MOCK_MODE === "true") {
      throw new Error("real database connections are disabled while MOCK_MODE=true - remove the connection string to use the built-in demo dataset");
    }
    if (parsed.connectionString && !process.env.ANTHROPIC_API_KEY) {
      throw new Error("a real database connection requires ANTHROPIC_API_KEY to be set for natural-language-to-SQL translation");
    }
    return parsed;
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const question = String(ctx.job.inputs.question ?? "");
    const connectionString = String(ctx.job.inputs.connectionString ?? "");

    let sql: string;
    let columns: string[];
    let rows: Record<string, unknown>[];
    let totalRows: number;
    let truncated: boolean;
    let sourceLabel: string;

    if (connectionString) {
      const schemaDescription = await introspectSchema(connectionString);
      const rawSql = await translateQuestionToSql(question, schemaDescription);
      sql = assertReadOnlySelect(rawSql);
      const result = await runReadOnlyQuery(connectionString, sql);
      columns = result.columns;
      rows = result.rows;
      totalRows = rows.length;
      truncated = false;
      sourceLabel = "Live connection - data as of " + new Date().toISOString().slice(0, 10);
    } else {
      const engine = answerFromDemoData(question);
      sql = engine.sql;
      columns = engine.columns;
      rows = engine.rows;
      totalRows = engine.totalRows;
      truncated = engine.truncated;
      sourceLabel = "Demo dataset (orders) - no connection string provided";
    }

    const figures = describeFigures(columns, rows, totalRows);
    const answer = await anthropic.writeSection({
      heading: "Answer",
      instructions: `${ctx.plan.composeInstructions} The question asked: ${question}. Key figures to interpret: ${figures}`,
      context: ctx.research,
    });

    const title = `Text to SQL: ${question}`;
    const document = (
      <TextToSqlDocument
        question={question}
        sql={sql}
        columns={columns}
        rows={rows}
        totalRows={totalRows}
        truncated={truncated}
        answer={answer}
        sourceLabel={sourceLabel}
        jobId={ctx.job.id}
      />
    );

    const buffer = await renderPdfDocument(document);

    return { title, file: { buffer, contentType: "application/pdf", extension: "pdf" } };
  },
};
