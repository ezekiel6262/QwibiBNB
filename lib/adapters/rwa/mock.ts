import type { RwaAdapter, RwaAssetClass, RwaRedemption } from "./types";

function seedFrom(address: string): number {
  let seed = 0;
  for (let i = 0; i < address.length; i++) seed = (seed * 31 + address.charCodeAt(i)) >>> 0;
  return seed;
}

const ASSET_CLASS_RANGES: Record<
  RwaAssetClass,
  { apy: [number, number]; backing: [number, number]; tvl: [number, number] }
> = {
  treasury: { apy: [4.2, 5.6], backing: [99.5, 102], tvl: [20_000_000, 800_000_000] },
  commodity: { apy: [0.8, 2.6], backing: [97, 101], tvl: [5_000_000, 300_000_000] },
  real_estate: { apy: [6.1, 9.4], backing: [88, 100], tvl: [2_000_000, 150_000_000] },
};

const PROTOCOL_NAME_PREFIXES: Record<RwaAssetClass, string[]> = {
  treasury: ["TBill Vault", "Treasury Note Fund", "ShortDuration Yield"],
  commodity: ["Bullion Reserve", "Commodity Basket", "Metals Vault"],
  real_estate: ["Property Yield Pool", "REIT Bridge", "Rental Income Fund"],
};

function inRange(seed: number, [lo, hi]: [number, number], salt: number): number {
  const pct = ((seed * (salt + 1)) % 1000) / 1000;
  return Math.round((lo + pct * (hi - lo)) * 100) / 100;
}

export const rwaMock: RwaAdapter = {
  async getRwaMetrics(protocolAddress, assetClass) {
    const seed = seedFrom(protocolAddress + assetClass);
    const ranges = ASSET_CLASS_RANGES[assetClass];
    const names = PROTOCOL_NAME_PREFIXES[assetClass];
    const protocolName = names[seed % names.length];

    const totalValueLockedUsd = Math.round(inRange(seed, ranges.tvl, 7));
    const yieldApyPct = inRange(seed, ranges.apy, 3);
    const backingRatioPct = inRange(seed, ranges.backing, 5);
    const holderCount = 200 + (seed % 12000);

    const redemptions: RwaRedemption[] = Array.from({ length: 5 }, (_, i) => {
      const daysAgo = (i + 1) * (3 + (seed % 4));
      const amountUsd = Math.round(
        (totalValueLockedUsd * (0.005 + ((seed * (i + 2)) % 100) / 4000)) * 100
      ) / 100;
      return {
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        amountUsd,
      };
    }).reverse();

    return {
      protocolName,
      assetClass,
      totalValueLockedUsd,
      yieldApyPct,
      backingRatioPct,
      holderCount,
      redemptions,
      dataSource: "mock",
    };
  },
};
