import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { STALE_MS, scheduleJobProcessing } from "@/lib/pipeline/background";

// Public polling endpoint - deliberately ungated so a buyer who has already paid
// can follow their job without presenting payment again.
export const maxDuration = 30;

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const jobId = params.id;
  const admin = supabaseAdmin();

  const { data: job } = await admin
    .from("jobs")
    .select("id, status, error, service, created_at, completed_at")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;
  const done = job.status === "delivered";

  // The dispatch to /api/jobs/process is fire-and-forget and can be dropped by the
  // runtime, so use the buyer's poll to rescue a job that never got picked up.
  //
  // Only "queued" qualifies. Any later status means a processor did start, and
  // re-dispatching then would run a second pipeline concurrently with the first -
  // created_at never changes, so every poll would relaunch it forever.
  if (job.status === "queued" && Date.now() - new Date(job.created_at).getTime() > STALE_MS) {
    scheduleJobProcessing(jobId, origin);
  }

  if (!done) {
    return NextResponse.json({
      jobId,
      status: job.status,
      error: job.error,
      service: job.service,
      reportUrl: `${origin}/report/${jobId}`,
    });
  }

  const { data: deliverable } = await admin
    .from("deliverables")
    .select("file_path, file_type, attestation_hash")
    .eq("job_id", jobId)
    .maybeSingle();

  let downloadUrl: string | null = null;
  if (deliverable?.file_path) {
    const { data: signed } = await admin.storage
      .from("deliverables")
      .createSignedUrl(deliverable.file_path, 3600);
    downloadUrl = signed?.signedUrl ?? null;
  }

  return NextResponse.json({
    jobId,
    status: job.status,
    error: null,
    service: job.service,
    completedAt: job.completed_at,
    fileType: deliverable?.file_type ?? null,
    attestationHash: deliverable?.attestation_hash ?? null,
    downloadUrl,
    reportUrl: `${origin}/report/${jobId}`,
    verifyUrl: `${origin}/verify/${jobId}`,
  });
}
