import { computeSma, computeRsi } from "./indicators";
import type { PriceSeries } from "./price-data";

export type StrategyType = "sma_crossover" | "rsi_threshold" | "buy_and_hold";

export type StrategyParams = {
  shortWindow: number;
  longWindow: number;
  rsiPeriod: number;
  oversold: number;
  overbought: number;
};

export type Trade = {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
};

export type EquityPoint = { date: string; equity: number };

export type BacktestResult = {
  strategyLabel: string;
  ruleDescription: string;
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  buyHoldReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
  numTrades: number;
  equityCurve: EquityPoint[];
  trades: Trade[];
  overfittingCaveats: string;
};

function computeSignals(
  strategy: StrategyType,
  prices: number[],
  params: StrategyParams
): { buy: boolean[]; sell: boolean[]; description: string } {
  const n = prices.length;
  const buy = new Array(n).fill(false);
  const sell = new Array(n).fill(false);

  if (strategy === "buy_and_hold") {
    buy[0] = true;
    return { buy, sell, description: "Buy on day one, hold through the end of the period." };
  }

  if (strategy === "sma_crossover") {
    const shortSma = computeSma(prices, params.shortWindow);
    const longSma = computeSma(prices, params.longWindow);
    for (let i = 1; i < n; i++) {
      const s = shortSma[i];
      const l = longSma[i];
      const sPrev = shortSma[i - 1];
      const lPrev = longSma[i - 1];
      if (s === null || l === null || sPrev === null || lPrev === null) continue;
      if (sPrev <= lPrev && s > l) buy[i] = true;
      if (sPrev >= lPrev && s < l) sell[i] = true;
    }
    return {
      buy,
      sell,
      description:
        `Buy when the ${params.shortWindow}-period SMA crosses above the ${params.longWindow}-period ` +
        `SMA (golden cross); sell when it crosses back below (death cross).`,
    };
  }

  const rsi = computeRsi(prices, params.rsiPeriod);
  for (let i = 1; i < n; i++) {
    const r = rsi[i];
    const rPrev = rsi[i - 1];
    if (r === null || rPrev === null) continue;
    if (rPrev >= params.oversold && r < params.oversold) buy[i] = true;
    if (rPrev <= params.overbought && r > params.overbought) sell[i] = true;
  }
  return {
    buy,
    sell,
    description:
      `Buy when the ${params.rsiPeriod}-period RSI drops below ${params.oversold} (oversold); ` +
      `sell when it rises above ${params.overbought} (overbought).`,
  };
}

function annualizedSharpe(returns: number[], periodsPerYear: number): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(periodsPerYear);
}

const STRATEGY_LABELS: Record<StrategyType, string> = {
  sma_crossover: "SMA crossover",
  rsi_threshold: "RSI threshold",
  buy_and_hold: "Buy and hold",
};

export function runBacktest(
  series: PriceSeries,
  strategy: StrategyType,
  params: StrategyParams,
  initialCapital: number
): BacktestResult {
  const { buy, sell, description } = computeSignals(strategy, series.prices, params);
  const n = series.prices.length;

  let cash = initialCapital;
  let shares = 0;
  let positioned = false;
  let entryDate = "";
  let entryPrice = 0;

  const equityCurve: EquityPoint[] = [];
  const trades: Trade[] = [];

  for (let i = 0; i < n; i++) {
    const price = series.prices[i];
    const date = series.dates[i];

    if (!positioned && buy[i]) {
      shares = cash / price;
      cash = 0;
      positioned = true;
      entryDate = date;
      entryPrice = price;
    } else if (positioned && sell[i]) {
      cash = shares * price;
      const pnlPct = ((price - entryPrice) / entryPrice) * 100;
      trades.push({ entryDate, exitDate: date, entryPrice, exitPrice: price, pnlPct });
      shares = 0;
      positioned = false;
    }

    equityCurve.push({ date, equity: Math.round((cash + shares * price) * 100) / 100 });
  }

  if (positioned) {
    const lastPrice = series.prices[n - 1];
    const lastDate = series.dates[n - 1];
    const pnlPct = ((lastPrice - entryPrice) / entryPrice) * 100;
    trades.push({
      entryDate,
      exitDate: `${lastDate} (open, mark-to-market)`,
      entryPrice,
      exitPrice: lastPrice,
      pnlPct,
    });
  }

  const finalEquity = equityCurve[equityCurve.length - 1].equity;
  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
  const buyHoldReturnPct = ((series.prices[n - 1] - series.prices[0]) / series.prices[0]) * 100;

  let peak = equityCurve[0].equity;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const drawdown = ((point.equity - peak) / peak) * 100;
    if (drawdown < maxDrawdownPct) maxDrawdownPct = drawdown;
  }

  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    dailyReturns.push(prev === 0 ? 0 : (equityCurve[i].equity - prev) / prev);
  }
  const sharpeRatio = annualizedSharpe(dailyReturns, series.periodsPerYear);

  const winningTrades = trades.filter((t) => t.pnlPct > 0).length;
  const winRatePct = trades.length === 0 ? 0 : (winningTrades / trades.length) * 100;

  return {
    strategyLabel: STRATEGY_LABELS[strategy],
    ruleDescription: description,
    initialCapital,
    finalEquity,
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    buyHoldReturnPct: Math.round(buyHoldReturnPct * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    winRatePct: Math.round(winRatePct * 100) / 100,
    numTrades: trades.length,
    equityCurve,
    trades,
    overfittingCaveats:
      "This is a single in-sample run over the pasted price history with fixed, user-chosen " +
      "parameters (not optimized or validated on a separate out-of-sample period) - a " +
      "materially different parameter choice can produce a materially different result on " +
      "the same data. No transaction costs, slippage, or spread are modeled. Past performance " +
      "on this window does not indicate future results.",
  };
}
