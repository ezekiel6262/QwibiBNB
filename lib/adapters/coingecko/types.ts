export type MarketSnapshot = {
  symbol: string;
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  marketCapUsd: number;
};

export type CoinGeckoAdapter = {
  getHistoricalPriceUsd(asset: string, timestampIso: string): Promise<number>;
  getMarketSnapshot(symbol: string): Promise<MarketSnapshot>;
};
