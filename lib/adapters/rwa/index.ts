import { resolveMode } from "@/lib/adapters/mode";
import { rwaMock } from "./mock";
import { rwaReal } from "./real";
import type { RwaAdapter } from "./types";

export type { RwaAdapter, RwaAssetClass, RwaMetrics, RwaRedemption } from "./types";

/**
 * Real mode matches known tokenized RWA protocols by address against DeFiLlama's public
 * RWA-category list (TVL, APY - no key required) plus Moralis holder counts (EVM chains).
 * Backing ratio and redemption flows have no generic public source and are always reported
 * as unavailable (0 / []), never fabricated. An address DeFiLlama doesn't track falls back to
 * the mock generator for that one request, clearly labeled via `dataSource`, rather than
 * failing the job outright - see lib/adapters/rwa/real.ts.
 */
const mode = resolveMode(["MORALIS_API_KEY"]);

export const rwa: RwaAdapter = mode === "real" ? rwaReal : rwaMock;
