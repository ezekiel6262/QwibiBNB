import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { parseSeries, computeForecast } from "./forecast";
import { buildForecastWorkbook } from "./workbook";

const inputSchema = z
  .object({
    csvData: z.string().min(20, "paste CSV data with a header row and at least 6 rows"),
    targetColumn: z.string().optional(),
    horizon: z.number().int().min(1).max(24).optional(),
    objective: z.string().optional(),
  })
  .transform((v) => ({
    csvData: v.csvData,
    targetColumn: v.targetColumn?.trim() || undefined,
    horizon: v.horizon ?? 6,
    objective: v.objective?.trim() ?? "",
    prompt: `ML forecast${v.objective ? `: ${v.objective}` : ""}`,
  }));

export const s4MlForecasts: ServiceModule = {
  id: "s4-ml-forecasts",
  label: "ML Forecasts",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const csvData = String(ctx.job.inputs.csvData ?? "");
    const targetColumn = ctx.job.inputs.targetColumn as string | undefined;
    const horizon = Number(ctx.job.inputs.horizon ?? 6);
    const objective = String(ctx.job.inputs.objective ?? "");

    const series = parseSeries(csvData, targetColumn);
    const result = computeForecast(series, horizon);

    const narrative = await anthropic.writeSection({
      heading: "Executive summary",
      instructions:
        `${ctx.plan.composeInstructions} Key figures to interpret: the ${result.model} ` +
        `model was selected with a validation MAE of ${result.metrics.mae.toFixed(2)} and ` +
        `MAPE of ${result.metrics.mape.toFixed(1)}%, forecasting ${horizon} periods ahead ` +
        `for "${series.targetColumn}".` +
        (objective ? ` The stated objective: ${objective}.` : ""),
      context: ctx.research,
    });

    const title = objective || `Forecast: ${series.targetColumn}`;
    const buffer = await buildForecastWorkbook({
      title,
      targetColumn: series.targetColumn,
      result,
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
