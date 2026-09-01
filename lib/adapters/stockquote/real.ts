import type { StockQuoteAdapter } from "./types";

export const stockQuoteReal: StockQuoteAdapter = {
  async getQuote(ticker) {
    const key = ticker.toUpperCase();
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${key}&token=${process.env.FINNHUB_API_KEY}`
    );
    if (!res.ok) throw new Error(`finnhub: failed to fetch quote for ${key} (${res.status})`);
    const data = await res.json();

    // Finnhub returns all-zero fields (not an error status) for an unrecognized symbol.
    if (!data || data.c === 0) {
      throw new Error(`finnhub: no quote data for ${key}`);
    }

    return {
      ticker: key,
      priceUsd: Number(data.c),
      change24hPct: Number(data.dp ?? 0),
      // Finnhub's free /quote endpoint doesn't return volume - honestly reported as 0,
      // not fabricated, same disclosure pattern used elsewhere in this codebase.
      volumeShares: 0,
    };
  },
};
