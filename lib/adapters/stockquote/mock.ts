import type { StockQuoteAdapter, StockQuote } from "./types";

const FIXTURE_QUOTES: Record<string, Omit<StockQuote, "ticker">> = {
  AAPL: { priceUsd: 228.4, change24hPct: 0.6, volumeShares: 42_300_000 },
  MSFT: { priceUsd: 441.6, change24hPct: -0.3, volumeShares: 18_900_000 },
  GOOGL: { priceUsd: 176.2, change24hPct: 1.1, volumeShares: 21_400_000 },
  AMZN: { priceUsd: 189.9, change24hPct: -0.8, volumeShares: 33_100_000 },
  NVDA: { priceUsd: 128.3, change24hPct: 2.7, volumeShares: 210_500_000 },
  TSLA: { priceUsd: 246.1, change24hPct: -3.2, volumeShares: 88_700_000 },
  META: { priceUsd: 512.8, change24hPct: 0.9, volumeShares: 12_600_000 },
  SPY: { priceUsd: 552.3, change24hPct: 0.2, volumeShares: 61_200_000 },
  QQQ: { priceUsd: 471.7, change24hPct: 0.4, volumeShares: 39_800_000 },
};

function seedFrom(ticker: string): number {
  let seed = 0;
  for (let i = 0; i < ticker.length; i++) seed = (seed * 31 + ticker.charCodeAt(i)) >>> 0;
  return seed;
}

export const stockQuoteMock: StockQuoteAdapter = {
  async getQuote(ticker) {
    const key = ticker.toUpperCase();
    const fixture = FIXTURE_QUOTES[key];
    if (fixture) return { ticker: key, ...fixture };

    const seed = seedFrom(key);
    return {
      ticker: key,
      priceUsd: 10 + (seed % 4000) / 10,
      change24hPct: ((seed % 41) - 20) / 5,
      volumeShares: 500_000 + (seed % 20_000_000),
    };
  },
};
