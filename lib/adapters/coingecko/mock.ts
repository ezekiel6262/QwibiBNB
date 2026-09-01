import type { CoinGeckoAdapter, MarketSnapshot } from "./types";

const FIXTURE_PRICES: Record<string, number> = {
  ETH: 3200,
  WBTC: 64500,
  USDC: 1,
  USDT: 1,
};

const FIXTURE_SNAPSHOTS: Record<string, Omit<MarketSnapshot, "symbol">> = {
  BTC: { priceUsd: 64500, change24hPct: 1.8, volume24hUsd: 28_400_000_000, marketCapUsd: 1_270_000_000_000 },
  ETH: { priceUsd: 3200, change24hPct: -0.6, volume24hUsd: 12_100_000_000, marketCapUsd: 384_600_000_000 },
  SOL: { priceUsd: 148.2, change24hPct: 4.3, volume24hUsd: 3_200_000_000, marketCapUsd: 69_400_000_000 },
  ADA: { priceUsd: 0.44, change24hPct: -1.2, volume24hUsd: 410_000_000, marketCapUsd: 15_600_000_000 },
  DOGE: { priceUsd: 0.121, change24hPct: 2.9, volume24hUsd: 780_000_000, marketCapUsd: 17_800_000_000 },
  LINK: { priceUsd: 13.6, change24hPct: -2.1, volume24hUsd: 390_000_000, marketCapUsd: 8_500_000_000 },
  XRP: { priceUsd: 0.58, change24hPct: 0.4, volume24hUsd: 1_100_000_000, marketCapUsd: 32_900_000_000 },
  BNB: { priceUsd: 585, change24hPct: 1.1, volume24hUsd: 1_400_000_000, marketCapUsd: 85_300_000_000 },
  AVAX: { priceUsd: 27.4, change24hPct: -3.4, volume24hUsd: 320_000_000, marketCapUsd: 11_000_000_000 },
  DOT: { priceUsd: 4.9, change24hPct: -0.9, volume24hUsd: 145_000_000, marketCapUsd: 7_100_000_000 },
  WBTC: { priceUsd: 64500, change24hPct: 1.8, volume24hUsd: 210_000_000, marketCapUsd: 9_800_000_000 },
  USDC: { priceUsd: 1, change24hPct: 0.0, volume24hUsd: 4_800_000_000, marketCapUsd: 33_900_000_000 },
  USDT: { priceUsd: 1, change24hPct: 0.0, volume24hUsd: 41_200_000_000, marketCapUsd: 112_400_000_000 },
};

export const coingeckoMock: CoinGeckoAdapter = {
  async getHistoricalPriceUsd(asset) {
    return FIXTURE_PRICES[asset.toUpperCase()] ?? 0;
  },

  async getMarketSnapshot(symbol) {
    const key = symbol.toUpperCase();
    const fixture = FIXTURE_SNAPSHOTS[key];
    if (!fixture) {
      const seed = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return {
        symbol: key,
        priceUsd: 1 + (seed % 500) / 10,
        change24hPct: ((seed % 21) - 10) / 2,
        volume24hUsd: 5_000_000 + (seed % 50) * 1_000_000,
        marketCapUsd: 100_000_000 + (seed % 90) * 10_000_000,
      };
    }
    return { symbol: key, ...fixture };
  },
};
