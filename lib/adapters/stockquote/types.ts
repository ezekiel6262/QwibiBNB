export type StockQuote = {
  ticker: string;
  priceUsd: number;
  change24hPct: number;
  volumeShares: number;
};

export type StockQuoteAdapter = {
  getQuote(ticker: string): Promise<StockQuote>;
};
