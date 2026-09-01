import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import {
  parseDataset,
  computeNumericStats,
  computeCategoricalStats,
  computeCorrelations,
} from "./stats";
import { buildAnalysisWorkbook } from "./workbook";

const inputSchema = z
  .object({
    csvData: z.string().min(20, "paste CSV data with a header row and at least 3 rows"),
    question: z.string().optional(),
  })
  .transform((v) => ({
    csvData: v.csvData,
    question: v.question?.trim() ?? "",
    prompt: `Data analysis${v.question ? `: ${v.question}` : ""}`,
  }));

function describeFindings(args: {
  rowCount: number;
  numericStats: ReturnType<typeof computeNumericStats>[];
  correlations: ReturnType<typeof computeCorrelations>;
}): string {
  const parts: string[] = [`${args.rowCount} rows analyzed.`];
  const withOutliers = args.numericStats.filter((s) => s.outlierCount > 0);
  if (withOutliers.length > 0) {
    parts.push(
      `Outliers (1.5x IQR) found in: ${withOutliers.map((s) => `${s.column} (${s.outlierCount})`).join(", ")}.`
    );
  }
  const strongCorrelation = args.correlations[0];
  if (strongCorrelation && Math.abs(strongCorrelation.r) >= 0.3) {
    parts.push(
      `Strongest correlation: ${strongCorrelation.columnA} and ${strongCorrelation.columnB} ` +
        `at r=${strongCorrelation.r.toFixed(2)}.`
    );
  }
  return parts.join(" ");
}

export const s3DataAnalysisRun: ServiceModule = {
  id: "s3-data-analysis-run",
  label: "Data Analysis Run",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const csvData = String(ctx.job.inputs.csvData ?? "");
    const question = String(ctx.job.inputs.question ?? "");

    const dataset = parseDataset(csvData);
    const numericStats = dataset.columns.filter((c) => c.type === "numeric").map(computeNumericStats);
    const categoricalStats = dataset.columns
      .filter((c) => c.type === "categorical")
      .map(computeCategoricalStats);
    const correlations = computeCorrelations(dataset.columns.filter((c) => c.type === "numeric"));

    const findings = describeFindings({ rowCount: dataset.rowCount, numericStats, correlations });

    const narrative = await anthropic.writeSection({
      heading: "Executive summary",
      instructions:
        `${ctx.plan.composeInstructions} Key figures to interpret: ${findings}` +
        (question ? ` The question asked: ${question}.` : ""),
      context: ctx.research,
    });

    const title = question || "Data analysis run";
    const buffer = await buildAnalysisWorkbook({
      title,
      dataset,
      numericStats,
      categoricalStats,
      correlations,
      narrative,
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
