import { NextResponse } from "next/server";
import { createJob } from "@/lib/pipeline/orchestrator";
import { getService } from "@/lib/pipeline/registry";
import { scheduleJobProcessing } from "@/lib/pipeline/background";

/**
 * Accept a paid x402 request and answer immediately with a jobId.
 *
 * A synchronous alternative was tried to give single-round-trip buyer runtimes
 * the deliverable directly. Measured cost: this pipeline runs a plan() call and
 * a compose-stage writeSection call in sequence, ~70s end to end for
 * market-intelligence. Many agent runtimes abandon HTTP calls before that even
 * though payment settlement and file generation may complete. Queue the job,
 * respond quickly, and let the buyer poll statusUrl for the finished file.
 *
 * Forecasting is the exception (app/api/x402/forecasting/route.ts): it has its
 * own synchronous `execute` override, because it does no LLM call and reliably
 * answers in a second or two - fast enough that the relay never abandons it.
 * It stays synchronous so the paid replay itself is the delivery.
 */
export async function runServiceForX402(
  serviceId: string,
  inputs: Record<string, unknown>,
  origin: string
): Promise<NextResponse> {
  try {
    const service = getService(serviceId);
    const job = await createJob(service, inputs);

    scheduleJobProcessing(job.id, origin);

    return NextResponse.json({
      jobId: job.id,
      status: "queued",
      statusUrl: `${origin}/api/jobs/${job.id}`,
      reportUrl: `${origin}/report/${job.id}`,
      verifyUrl: `${origin}/verify/${job.id}`,
      message:
        "Job accepted and running. Poll statusUrl until status is 'delivered' for the signed download link and attestation hash.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed to queue job";
    // A non-success response prevents withX402 from settling the payment.
    return NextResponse.json({ status: "failed", error: message }, { status: 500 });
  }
}
