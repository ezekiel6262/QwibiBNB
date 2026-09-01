import type { MarketSnapshot } from "@/lib/adapters/coingecko/types";
import type { StockQuote } from "@/lib/adapters/stockquote/types";

export type AssetRow = {
  symbol: string;
  assetClass: "crypto" | "equity";
  priceUsd: number;
  change24hPct: number;
  volumeUsd: number;
  marketCapUsd?: number;
};

export function cryptoToRow(s: MarketSnapshot): AssetRow {
  return {
    symbol: s.symbol,
    assetClass: "crypto",
    priceUsd: s.priceUsd,
    change24hPct: s.change24hPct,
    volumeUsd: s.volume24hUsd,
    marketCapUsd: s.marketCapUsd,
  };
}

export function equityToRow(q: StockQuote): AssetRow {
  return {
    symbol: q.ticker,
    assetClass: "equity",
    priceUsd: q.priceUsd,
    change24hPct: q.change24hPct,
    volumeUsd: q.priceUsd * q.volumeShares,
  };
}

export function computeCrossAssetSummary(rows: AssetRow[]): {
  topGainer: AssetRow | null;
  topLoser: AssetRow | null;
  avgCryptoChangePct: number;
  avgEquityChangePct: number;
  dispersionPct: number;
} {
  const crypto = rows.filter((r) => r.assetClass === "crypto");
  const equity = rows.filter((r) => r.assetClass === "equity");

  const sorted = [...rows].sort((a, b) => b.change24hPct - a.change24hPct);
  const topGainer = sorted[0] ?? null;
  const topLoser = sorted[sorted.length - 1] ?? null;

  const avg = (list: AssetRow[]) =>
    list.length === 0 ? 0 : list.reduce((sum, r) => sum + r.change24hPct, 0) / list.length;

  const avgCryptoChangePct = avg(crypto);
  const avgEquityChangePct = avg(equity);
  const dispersionPct = Math.abs(avgCryptoChangePct - avgEquityChangePct);

  return { topGainer, topLoser, avgCryptoChangePct, avgEquityChangePct, dispersionPct };
}

export function describeFigures(rows: AssetRow[]): string {
  const summary = computeCrossAssetSummary(rows);
  const parts: string[] = [];
  if (summary.topGainer) {
    parts.push(
      `${summary.topGainer.symbol} (${summary.topGainer.assetClass}) led with ${summary.topGainer.change24hPct.toFixed(2)}% over 24h.`
    );
  }
  if (summary.topLoser && summary.topLoser.symbol !== summary.topGainer?.symbol) {
    parts.push(
      `${summary.topLoser.symbol} (${summary.topLoser.assetClass}) lagged at ${summary.topLoser.change24hPct.toFixed(2)}%.`
    );
  }
  parts.push(
    `Average 24h move: crypto ${summary.avgCryptoChangePct.toFixed(2)}%, equities ${summary.avgEquityChangePct.toFixed(2)}%, ` +
      `a dispersion of ${summary.dispersionPct.toFixed(2)} percentage points between the two baskets.`
  );
  return parts.join(" ");
}
