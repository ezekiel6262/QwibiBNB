import { waitUntil } from "@vercel/functions";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { JobRecord, PlanResult } from "./types";

/**
 * Shared secret for the internal processor route. Falls back to the service-role
 * key so an existing deployment keeps working without adding config; set
 * JOBS_SECRET to rotate it independently.
 */
export function jobsSecret(): string {
  return process.env.JOBS_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

/** A job older than this with a non-terminal status is dead, not still running. */
export const STALE_MS = 180_000;

export async function loadJob(jobId: string): Promise<JobRecord | null> {
  const { data } = await supabaseAdmin()
    .from("jobs")
    .select("id, user_id, service, status, prompt, inputs, plan, error")
    .eq("id", jobId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    service: data.service,
    status: data.status,
    prompt: data.prompt,
    inputs: data.inputs as Record<string, unknown>,
    plan: data.plan as PlanResult | null,
    error: data.error,
  };
}

/**
 * Hand the job to /api/jobs/process without blocking the current response.
 *
 * waitUntil keeps this invocation alive just long enough to dispatch the fetch;
 * the processor then runs as its own invocation with its own duration budget.
 * Fire-and-forget without waitUntil gets dropped once the response is sent.
 */
export function scheduleJobProcessing(jobId: string, origin: string, retry = false): void {
  waitUntil(
    fetch(`${origin}/api/jobs/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-jobs-secret": jobsSecret(),
      },
      body: JSON.stringify({ job_id: jobId, retry }),
    }).catch((err) => console.error(`failed to dispatch job ${jobId}`, err))
  );
}
