import { NextResponse } from "next/server";
import { createValidatedX402Route } from "@/lib/x402/validated-route";
import { parseSeries, computeForecast } from "@/lib/services/s4-ml-forecasts/forecast";
import { parsePriceSeries } from "@/lib/services/s9-strategy-backtester/price-data";
import { runBacktest, type StrategyType } from "@/lib/services/s9-strategy-backtester/backtest";

export const maxDuration = 300;

const handlers = createValidatedX402Route(
  (body) => {
    if (body.strategy) {
      return {
        serviceId: "s9-strategy-backtester",
        inputs: {
          csvData: body.csvData,
          strategy: body.strategy,
          shortWindow: body.shortWindow,
          longWindow: body.longWindow,
          rsiPeriod: body.rsiPeriod,
          oversold: body.oversold,
          overbought: body.overbought,
          initialCapital: body.initialCapital,
        },
      };
    }

    return {
      serviceId: "s4-ml-forecasts",
      inputs: {
        csvData: body.csvData,
        targetColumn: body.targetColumn,
        horizon: body.horizon,
        objective: body.objective,
      },
    };
  },
  ({ serviceId, inputs }) => {
    // Keep this endpoint inline so the paid x402 replay itself is the delivery.
    if (serviceId === "s4-ml-forecasts") {
      const series = parseSeries(
        String(inputs.csvData ?? ""),
        typeof inputs.targetColumn === "string" ? inputs.targetColumn : undefined
      );
      const horizon = Number(inputs.horizon ?? 6);
      const result = computeForecast(series, horizon);

      return NextResponse.json({
        status: "delivered",
        service: serviceId,
        targetColumn: series.targetColumn,
        model: result.model,
        metrics: result.metrics,
        limitations: result.limitations,
        forecast: result.rows.filter((row) => row.split === "forecast"),
        rows: result.rows,
      });
    }

    const series = parsePriceSeries(String(inputs.csvData ?? ""));
    const result = runBacktest(
      series,
      String(inputs.strategy ?? "sma_crossover") as StrategyType,
      {
        shortWindow: Number(inputs.shortWindow ?? 20),
        longWindow: Number(inputs.longWindow ?? 50),
        rsiPeriod: Number(inputs.rsiPeriod ?? 14),
        oversold: Number(inputs.oversold ?? 30),
        overbought: Number(inputs.overbought ?? 70),
      },
      Number(inputs.initialCapital ?? 10000)
    );

    return NextResponse.json({
      status: "delivered",
      service: serviceId,
      priceColumn: series.priceColumn,
      result,
    });
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
