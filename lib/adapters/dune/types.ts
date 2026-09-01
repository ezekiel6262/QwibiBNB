import type { HolderDistribution, ProtocolMetrics, WhaleMovement } from "@/lib/pipeline/types";

export type DuneAdapter = {
  getHolderDistribution(tokenAddress: string): Promise<HolderDistribution>;
  getWhaleMovements(tokenAddress: string): Promise<WhaleMovement[]>;
  getProtocolMetrics(tokenAddress: string): Promise<ProtocolMetrics>;
};
