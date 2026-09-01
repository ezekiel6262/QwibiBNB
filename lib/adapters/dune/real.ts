import type { HolderDistribution, ProtocolMetrics, WhaleMovement } from "@/lib/pipeline/types";
import type { DuneAdapter } from "./types";

const DUNE_API = "https://api.dune.com/api/v1";

/**
 * Dune has no single canonical endpoint for "holder distribution" or "whale movements" -
 * those are custom SQL queries you write on dune.com. This calls the execute + poll +
 * results flow against query IDs you configure (DUNE_QUERY_ID_HOLDERS etc.), and expects
 * each query's result rows to already be shaped like the return type below. Mock mode
 * (default) needs none of this - see mock.ts.
 */
async function runQuery(queryId: string, params: Record<string, string>): Promise<Record<string, unknown>[]> {
  const headers = {
    "x-dune-api-key": process.env.DUNE_API_KEY!,
    "content-type": "application/json",
  };

  const exec = await fetch(`${DUNE_API}/query/${queryId}/execute`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query_parameters: params }),
  });
  if (!exec.ok) throw new Error(`dune: failed to start query ${queryId} (${exec.status})`);
  const { execution_id: executionId } = await exec.json();

  let completed = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const statusRes = await fetch(`${DUNE_API}/execution/${executionId}/status`, { headers });
    const { state } = await statusRes.json();
    if (state === "QUERY_STATE_COMPLETED") {
      completed = true;
      break;
    }
    if (state === "QUERY_STATE_FAILED") throw new Error(`dune: query ${queryId} failed`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (!completed) {
    throw new Error(`dune: query ${queryId} did not complete within 90s (execution ${executionId})`);
  }

  const resultsRes = await fetch(`${DUNE_API}/execution/${executionId}/results`, { headers });
  const results = await resultsRes.json();
  return results.result?.rows ?? [];
}

function requireQueryId(envVar: string): string {
  const id = process.env[envVar];
  if (!id) throw new Error(`dune: ${envVar} is not set - create the query on dune.com and set its id`);
  return id;
}

export const duneReal: DuneAdapter = {
  async getHolderDistribution(tokenAddress): Promise<HolderDistribution> {
    const rows = await runQuery(requireQueryId("DUNE_QUERY_ID_HOLDERS"), {
      token_address: tokenAddress,
    });
    const summary = rows[0] as { total_holders?: number; top10_pct?: number } | undefined;
    return {
      totalHolders: Number(summary?.total_holders ?? 0),
      top10Pct: Number(summary?.top10_pct ?? 0),
      cohorts: rows.map((r) => ({
        label: String(r.cohort ?? "Unlabeled"),
        pctOfSupply: Number(r.pct_of_supply ?? 0),
      })),
    };
  },

  async getWhaleMovements(tokenAddress): Promise<WhaleMovement[]> {
    const rows = await runQuery(requireQueryId("DUNE_QUERY_ID_WHALES"), {
      token_address: tokenAddress,
    });
    return rows.map((r) => ({
      txHash: String(r.tx_hash ?? ""),
      from: String(r.from_address ?? ""),
      to: String(r.to_address ?? ""),
      amountUsd: Number(r.amount_usd ?? 0),
      timestamp: String(r.block_time ?? new Date().toISOString()),
    }));
  },

  async getProtocolMetrics(tokenAddress): Promise<ProtocolMetrics> {
    const rows = await runQuery(requireQueryId("DUNE_QUERY_ID_PROTOCOL"), {
      token_address: tokenAddress,
    });
    const row = rows[0] as
      | { tvl_usd?: number; dex_volume_24h_usd?: number; revenue_30d_usd?: number }
      | undefined;
    return {
      tvlUsd: Number(row?.tvl_usd ?? 0),
      dexVolume24hUsd: Number(row?.dex_volume_24h_usd ?? 0),
      revenue30dUsd: Number(row?.revenue_30d_usd ?? 0),
    };
  },
};
