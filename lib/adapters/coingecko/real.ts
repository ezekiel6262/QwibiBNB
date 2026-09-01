import type { CoinGeckoAdapter } from "./types";

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  DOGE: "dogecoin",
  LINK: "chainlink",
  XRP: "ripple",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  WBTC: "wrapped-bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
};

function formatDate(timestampIso: string): string {
  const d = new Date(timestampIso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getUTCFullYear()}`;
}

export const coingeckoReal: CoinGeckoAdapter = {
  async getHistoricalPriceUsd(asset, timestampIso) {
    // Unmapped or unpricable assets return $0, never a fabricated placeholder price - a
    // real wallet (especially a high-profile one) routinely receives unsolicited spam or
    // vanity tokens with huge nominal amounts and no real market; treating those as $1/unit
    // would multiply into wildly wrong totals. $0 keeps the transaction visible in the
    // ledger while correctly contributing nothing to income/expense/balance figures.
    const coinId = COIN_IDS[asset.toUpperCase()];
    if (!coinId) return 0;

    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formatDate(timestampIso)}`,
      { headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY! } }
    );
    if (!res.ok) throw new Error(`coingecko: failed to fetch price for ${asset} (${res.status})`);
    const data = await res.json();
    return Number(data.market_data?.current_price?.usd ?? 0);
  },

  async getMarketSnapshot(symbol) {
    const key = symbol.toUpperCase();
    const coinId = COIN_IDS[key] ?? key.toLowerCase();

    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}`,
      { headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY! } }
    );
    if (!res.ok) throw new Error(`coingecko: failed to fetch market snapshot for ${symbol} (${res.status})`);
    const data = await res.json();
    const row = Array.isArray(data) ? data[0] : undefined;
    if (!row) throw new Error(`coingecko: no market data for ${symbol}`);

    return {
      symbol: key,
      priceUsd: Number(row.current_price ?? 0),
      change24hPct: Number(row.price_change_percentage_24h ?? 0),
      volume24hUsd: Number(row.total_volume ?? 0),
      marketCapUsd: Number(row.market_cap ?? 0),
    };
  },
};
