import { supabaseAdmin } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-user";
import type { Json } from "@/lib/supabase/database.types";
import type { JobRecord, ServiceModule } from "@/lib/pipeline/types";

export async function intake(
  service: ServiceModule,
  rawInputs: unknown
): Promise<JobRecord> {
  const validated = service.validateInputs(rawInputs);

  const { data, error } = await supabaseAdmin()
    .from("jobs")
    .insert({
      user_id: DEMO_USER_ID,
      service: service.id,
      status: "queued",
      prompt: validated.prompt,
      inputs: validated as Json,
    })
    .select()
    .single();

  if (error) throw new Error(`intake: failed to create job - ${error.message}`);

  return {
    id: data.id,
    userId: data.user_id,
    service: data.service,
    status: data.status,
    prompt: data.prompt,
    inputs: data.inputs as Record<string, unknown>,
    plan: null,
    error: null,
  };
}

export async function setStatus(jobId: string, status: JobRecord["status"]) {
  const { error } = await supabaseAdmin().from("jobs").update({ status }).eq("id", jobId);
  if (error) throw new Error(`setStatus(${status}): ${error.message}`);
}

export async function setFailed(jobId: string, message: string) {
  const { error } = await supabaseAdmin()
    .from("jobs")
    .update({ status: "failed", error: message })
    .eq("id", jobId);
  if (error) throw new Error(`setFailed: ${error.message}`);
}
