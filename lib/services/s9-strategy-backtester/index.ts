import { z } from "zod";
import { anthropic } from "@/lib/adapters/anthropic";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { parsePriceSeries } from "./price-data";
import { runBacktest, type StrategyType } from "./backtest";
import { buildBacktestWorkbook } from "./workbook";

const inputSchema = z
  .object({
    csvData: z.string().min(20, "paste CSV price history with a date column and a price column"),
    strategy: z.enum(["sma_crossover", "rsi_threshold", "buy_and_hold"]).optional(),
    shortWindow: z.coerce.number().int().min(2).max(500).optional(),
    longWindow: z.coerce.number().int().min(3).max(1000).optional(),
    rsiPeriod: z.coerce.number().int().min(2).max(500).optional(),
    oversold: z.coerce.number().min(0).max(100).optional(),
    overbought: z.coerce.number().min(0).max(100).optional(),
    initialCapital: z.coerce.number().positive().max(1_000_000_000_000).optional(),
  })
  .superRefine((v, ctx) => {
    const shortWindow = v.shortWindow ?? 20;
    const longWindow = v.longWindow ?? 50;
    if (shortWindow >= longWindow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shortWindow"],
        message: "shortWindow must be smaller than longWindow",
      });
    }
    const oversold = v.oversold ?? 30;
    const overbought = v.overbought ?? 70;
    if (oversold >= overbought) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["oversold"],
        message: "oversold must be smaller than overbought",
      });
    }
  })
  .transform((v) => ({
    csvData: v.csvData,
    strategy: (v.strategy ?? "sma_crossover") as StrategyType,
    shortWindow: v.shortWindow ?? 20,
    longWindow: v.longWindow ?? 50,
    rsiPeriod: v.rsiPeriod ?? 14,
    oversold: v.oversold ?? 30,
    overbought: v.overbought ?? 70,
    initialCapital: v.initialCapital ?? 10000,
    prompt: `Strategy backtest: ${v.strategy ?? "sma_crossover"}`,
  }));

export const s9StrategyBacktester: ServiceModule = {
  id: "s9-strategy-backtester",
  label: "Strategy Backtester",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const csvData = String(ctx.job.inputs.csvData ?? "");
    const strategy = ctx.job.inputs.strategy as StrategyType;
    const initialCapital = Number(ctx.job.inputs.initialCapital ?? 10000);

    const series = parsePriceSeries(csvData);
    const result = runBacktest(
      series,
      strategy,
      {
        shortWindow: Number(ctx.job.inputs.shortWindow ?? 20),
        longWindow: Number(ctx.job.inputs.longWindow ?? 50),
        rsiPeriod: Number(ctx.job.inputs.rsiPeriod ?? 14),
        oversold: Number(ctx.job.inputs.oversold ?? 30),
        overbought: Number(ctx.job.inputs.overbought ?? 70),
      },
      initialCapital
    );

    const figures =
      `Strategy: ${result.strategyLabel}. Rule: ${result.ruleDescription} Total return ` +
      `${result.totalReturnPct}% vs buy-and-hold ${result.buyHoldReturnPct}%. Max drawdown ` +
      `${result.maxDrawdownPct}%. Sharpe ratio ${result.sharpeRatio}. Win rate ${result.winRatePct}% ` +
      `across ${result.numTrades} trades.`;

    const narrative = await anthropic.writeSection({
      heading: "Executive summary",
      instructions: `${ctx.plan.composeInstructions} Key figures to interpret: ${figures}`,
      context: ctx.research,
    });

    const title = `${result.strategyLabel} backtest`;
    const buffer = await buildBacktestWorkbook({
      title,
      priceColumn: series.priceColumn,
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
