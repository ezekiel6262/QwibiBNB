import { anthropic } from "@/lib/adapters/anthropic";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { JobRecord, PlanResult } from "@/lib/pipeline/types";

export async function plan(job: JobRecord): Promise<PlanResult> {
  const result = await anthropic.planReport({
    service: job.service,
    prompt: job.prompt ?? "",
    audience: (job.inputs.audience as string) ?? undefined,
    length: (job.inputs.length as string) ?? undefined,
    inputs: job.inputs,
  });

  const { error } = await supabaseAdmin()
    .from("jobs")
    .update({ plan: result })
    .eq("id", job.id);
  if (error) throw new Error(`plan: failed to persist plan - ${error.message}`);

  return result;
}
