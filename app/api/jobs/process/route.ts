import { NextRequest, NextResponse } from "next/server";
import { runJobStages } from "@/lib/pipeline/orchestrator";
import { getService } from "@/lib/pipeline/registry";
import { jobsSecret, loadJob, scheduleJobProcessing } from "@/lib/pipeline/background";

// Internal only: runs the long stages for a job created elsewhere. Gets the full
// duration budget to itself, which is the whole point of splitting it out.
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const secret = jobsSecret();
  if (!secret || req.headers.get("x-jobs-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { job_id: jobId, retry = false } = (await req.json().catch(() => ({}))) as {
    job_id?: string;
    retry?: boolean;
  };
  if (!jobId) {
    return NextResponse.json({ error: "job_id required" }, { status: 400 });
  }

  const job = await loadJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  if (job.status === "delivered") {
    return NextResponse.json({ jobId, status: job.status, skipped: true });
  }

  // A failed job is only re-run when this call is the one automatic retry; otherwise a
  // stray dispatch would restart work the buyer has already been told failed.
  if (job.status === "failed" && !retry) {
    return NextResponse.json({ jobId, status: job.status, skipped: true });
  }

  try {
    const result = await runJobStages(getService(job.service), job);
    return NextResponse.json({
      jobId,
      status: "delivered",
      attestationHash: result.deliverable.attestationHash,
    });
  } catch (err) {
    // runJobStages already recorded the failure on the job row.
    const message = err instanceof Error ? err.message : "pipeline failed";
    console.error(`job ${jobId} failed${retry ? " (retry)" : ""}`, err);

    // The buyer has already paid, so give the job exactly one more attempt in a fresh
    // invocation with its own duration budget. The retry flag lives in the request rather
    // than the database, which is what bounds this to a single extra run: the retry itself
    // dispatches nothing further.
    if (!retry) {
      scheduleJobProcessing(jobId, req.nextUrl.origin, true);
      return NextResponse.json(
        { jobId, status: "failed", error: message, retrying: true },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobId, status: "failed", error: message }, { status: 500 });
  }
}
