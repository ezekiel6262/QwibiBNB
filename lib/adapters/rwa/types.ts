export type RwaAssetClass = "treasury" | "commodity" | "real_estate";

export type RwaRedemption = {
  date: string;
  amountUsd: number;
};

export type RwaMetrics = {
  protocolName: string;
  assetClass: RwaAssetClass;
  totalValueLockedUsd: number;
  yieldApyPct: number;
  backingRatioPct: number;
  holderCount: number;
  redemptions: RwaRedemption[];
  dataSource: "live" | "mock";
};

export type RwaAdapter = {
  getRwaMetrics(protocolAddress: string, assetClass: RwaAssetClass): Promise<RwaMetrics>;
};
