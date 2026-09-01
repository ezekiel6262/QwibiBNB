import { z } from "zod";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { parseCsvSource, parseJsonSource, fetchOnchainSource } from "./sources";
import { cleanTable } from "./cleaning";
import { buildCleanedWorkbook } from "./workbook";

const inputSchema = z
  .object({
    sourceType: z.enum(["csv", "onchain", "json"]),
    rawInput: z.string().min(3, "provide CSV/JSON text or an address to clean"),
    targetSchema: z.string().optional(),
  })
  .transform((v) => ({
    ...v,
    prompt: `Data clean and structure: ${v.sourceType} source`,
  }));

const SOURCE_LABELS: Record<string, string> = {
  csv: "CSV/Excel paste",
  onchain: "On-chain address",
  json: "Raw JSON dump",
};

export const s14DataClean: ServiceModule = {
  id: "s14-data-clean",
  label: "Data Clean and Structure",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const sourceType = String(ctx.job.inputs.sourceType ?? "csv") as "csv" | "onchain" | "json";
    const rawInput = String(ctx.job.inputs.rawInput ?? "");
    const targetSchema = ctx.job.inputs.targetSchema ? String(ctx.job.inputs.targetSchema) : undefined;

    const source =
      sourceType === "csv"
        ? parseCsvSource(rawInput)
        : sourceType === "json"
          ? parseJsonSource(rawInput)
          : await fetchOnchainSource(rawInput);

    const { table, report } = cleanTable(source, targetSchema);

    const title = `Cleaned dataset: ${SOURCE_LABELS[sourceType]}`;
    const buffer = await buildCleanedWorkbook({
      title,
      sourceType: SOURCE_LABELS[sourceType],
      table,
      report,
      jobId: ctx.job.id,
    });

    return {
      title,
      file: {
        buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      },
    };
  },
};
