import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { buildDcfWorkbook, type DcfAssumptions } from "./workbook";
import { computeDcf } from "./calc";

const inputSchema = z
  .object({
    modelName: z.string().min(1).optional(),
    initialRevenue: z.number().positive().optional(),
    growthRate: z.number().optional(),
    ebitdaMargin: z.number().optional(),
    taxRate: z.number().optional(),
    wacc: z.number().optional(),
    terminalGrowth: z.number().optional(),
    years: z.number().int().min(1).max(10).optional(),
    context: z.string().optional(),
  })
  .refine((v) => (v.wacc ?? 10) > (v.terminalGrowth ?? 3), {
    message: "WACC must be greater than the terminal growth rate",
  })
  .transform((v) => {
    const modelName = v.modelName?.trim() || "DCF Model";
    return {
      modelName,
      initialRevenue: v.initialRevenue ?? 1_000_000,
      growthRate: (v.growthRate ?? 15) / 100,
      ebitdaMargin: (v.ebitdaMargin ?? 25) / 100,
      taxRate: (v.taxRate ?? 21) / 100,
      wacc: (v.wacc ?? 10) / 100,
      terminalGrowth: (v.terminalGrowth ?? 3) / 100,
      years: v.years ?? 5,
      context: v.context?.trim() ?? "",
      prompt: `DCF financial model: ${modelName}`,
    };
  });

export const s2PromptToFinancialModel: ServiceModule = {
  id: "s2-prompt-to-financial-model",
  label: "Prompt to Financial Model",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const assumptions: DcfAssumptions = {
      modelName: String(ctx.job.inputs.modelName ?? "DCF Model"),
      initialRevenue: Number(ctx.job.inputs.initialRevenue ?? 1_000_000),
      growthRate: Number(ctx.job.inputs.growthRate ?? 0.15),
      ebitdaMargin: Number(ctx.job.inputs.ebitdaMargin ?? 0.25),
      taxRate: Number(ctx.job.inputs.taxRate ?? 0.21),
      wacc: Number(ctx.job.inputs.wacc ?? 0.1),
      terminalGrowth: Number(ctx.job.inputs.terminalGrowth ?? 0.03),
      years: Number(ctx.job.inputs.years ?? 5),
    };
    const context = String(ctx.job.inputs.context ?? "");

    const result = computeDcf(assumptions);

    const narrative = await anthropic.writeSection({
      heading: "Executive summary",
      instructions:
        `${ctx.plan.composeInstructions} Key figures to interpret: enterprise value of ` +
        `$${Math.round(result.enterpriseValue).toLocaleString("en-US")}, computed over ` +
        `${assumptions.years} years at a WACC of ${(assumptions.wacc * 100).toFixed(1)}% ` +
        `and a terminal growth rate of ${(assumptions.terminalGrowth * 100).toFixed(1)}%.` +
        (context ? ` Additional context from the requester: ${context}` : ""),
      context: ctx.research,
    });

    const buffer = await buildDcfWorkbook(assumptions, { narrative, jobId: ctx.job.id });

    return {
      title: assumptions.modelName,
      file: {
        buffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        extension: "xlsx",
      },
    };
  },
};
