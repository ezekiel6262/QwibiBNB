import { intake, setStatus, setFailed } from "./stages/intake";
import { plan } from "./stages/plan";
import { fetchStage } from "./stages/fetch";
import { compute } from "./stages/compute";
import { compose } from "./stages/compose";
import { attest } from "./stages/attest";
import { deliver } from "./stages/deliver";
import type { DeliverableRecord, JobRecord, ServiceModule } from "./types";

/**
 * Create the job row and return immediately. Fast (one insert) so a caller that
 * must answer within a short timeout - notably the x402 endpoints, whose payment
 * relay gives up long before a full pipeline run finishes - can respond with a
 * jobId and let `runJobStages` do the work in a separate invocation.
 */
export async function createJob(service: ServiceModule, rawInputs: unknown): Promise<JobRecord> {
  return intake(service, rawInputs);
}

/**
 * Run every stage after intake. Safe to call from a background invocation; marks
 * the job failed and rethrows on error, exactly as the inline path does.
 */
export async function runJobStages(
  service: ServiceModule,
  job: JobRecord
): Promise<{ jobId: string; deliverable: DeliverableRecord }> {
  try {
    await setStatus(job.id, "planning");
    const planResult = await plan(job);

    await setStatus(job.id, "fetching");
    const { research, onchain, rawTransactions } = await fetchStage(
      service.usesOnchainData ? planResult : { ...planResult, onchainTasks: [] }
    );

    await setStatus(job.id, "computing");
    const { computed, transactions, walletSummary } = await compute({
      rawTransactions,
      userAddresses: planResult.walletAddresses,
    });

    await setStatus(job.id, "composing");
    const composed = await compose(service, {
      job,
      plan: planResult,
      research,
      computed,
      onchain,
      transactions,
      walletSummary,
    });

    await setStatus(job.id, "attesting");
    const attestation = attest(composed.file.buffer, {
      jobId: job.id,
      sources: Array.from(new Set(research.map((r) => r.source))),
    });

    const deliverable = await deliver({
      jobId: job.id,
      file: composed.file,
      attestation,
      walletStatement:
        walletSummary && planResult.walletAddresses.length > 0
          ? { addresses: planResult.walletAddresses, summary: walletSummary }
          : undefined,
    });

    return { jobId: job.id, deliverable };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown pipeline error";
    await setFailed(job.id, message);
    throw err;
  }
}

/**
 * Inline run: intake plus every stage, awaited end to end. Still used by the
 * internal /api/jobs route, where the caller controls its own timeout.
 */
export async function runJob(
  service: ServiceModule,
  rawInputs: unknown
): Promise<{ jobId: string; deliverable: DeliverableRecord }> {
  const job = await createJob(service, rawInputs);
  return runJobStages(service, job);
}
