import type { DuneAdapter } from "./types";

// Small deterministic hash so different demo addresses don't render identical fixtures.
function seedFrom(tokenAddress: string): number {
  let seed = 0;
  for (let i = 0; i < tokenAddress.length; i++) {
    seed = (seed * 31 + tokenAddress.charCodeAt(i)) >>> 0;
  }
  return seed;
}

export const duneMock: DuneAdapter = {
  async getHolderDistribution(tokenAddress) {
    const seed = seedFrom(tokenAddress);
    const totalHolders = 4000 + (seed % 12000);
    const top10Pct = 38 + (seed % 25);
    return {
      totalHolders,
      top10Pct,
      cohorts: [
        { label: "Top 10 holders", pctOfSupply: top10Pct },
        { label: "Next 90 holders", pctOfSupply: Math.round((100 - top10Pct) * 0.4) },
        { label: "Remaining holders", pctOfSupply: Math.round((100 - top10Pct) * 0.6) },
      ],
    };
  },

  async getWhaleMovements(tokenAddress) {
    const seed = seedFrom(tokenAddress);
    const base = tokenAddress.replace(/^0x/i, "").slice(0, 6);
    return [
      {
        txHash: `0x${base}a1f9`,
        from: `0x${base}...c41e`,
        to: "0x88ab...9f21",
        amountUsd: 480000 + (seed % 900000),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      },
      {
        txHash: `0x${base}b2e0`,
        from: "0x3fca...11ab",
        to: `0x${base}...c41e`,
        amountUsd: 210000 + (seed % 400000),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
      },
    ];
  },

  async getProtocolMetrics(tokenAddress) {
    const seed = seedFrom(tokenAddress);
    return {
      tvlUsd: 12_000_000 + (seed % 40_000_000),
      dexVolume24hUsd: 800_000 + (seed % 3_000_000),
      revenue30dUsd: 90_000 + (seed % 500_000),
    };
  },
};
