import { dune } from "@/lib/adapters/dune";
import { google } from "@/lib/adapters/google";
import { moralis } from "@/lib/adapters/moralis";
import type { OnchainData, PlanResult, RawTransaction, ResearchSnippet } from "@/lib/pipeline/types";

export async function fetchStage(planResult: PlanResult): Promise<{
  research: ResearchSnippet[];
  onchain: OnchainData;
  rawTransactions: RawTransaction[];
}> {
  const researchBatches = await Promise.all(
    planResult.researchQueries.slice(0, 2).map((query) => google.research(query))
  );
  const research = researchBatches.flat();

  const onchain: OnchainData = {};
  for (const task of planResult.onchainTasks) {
    try {
      if (task.kind === "holders") {
        onchain.holders = await dune.getHolderDistribution(task.tokenAddress);
      } else if (task.kind === "whales") {
        onchain.whales = await dune.getWhaleMovements(task.tokenAddress);
      } else if (task.kind === "protocol") {
        onchain.protocol = await dune.getProtocolMetrics(task.tokenAddress);
      }
    } catch (err) {
      // A single failing Dune query (bad address, transient outage) shouldn't sink an
      // otherwise-successful, already-paid job - report degraded rather than fail it.
      const message = err instanceof Error ? err.message : "unknown error";
      console.error(`fetchStage: onchain task ${task.kind} failed, continuing without it - ${message}`);
    }
  }

  const txBatches = await Promise.all(
    planResult.walletAddresses.map((address) =>
      moralis.getTransactions(
        address,
        planResult.walletAddresses.filter((a) => a !== address)
      )
    )
  );
  const rawTransactions = txBatches.flat();

  return { research, onchain, rawTransactions };
}
