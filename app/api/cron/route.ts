import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getService } from "@/lib/pipeline/registry";
import { runJob } from "@/lib/pipeline/orchestrator";
import { computeNextRun, isScheduleInterval } from "@/lib/pipeline/schedules";

export const dynamic = "force-dynamic";

/**
 * Target for Vercel Cron (see vercel.json). Vercel signs requests it triggers with
 * `Authorization: Bearer $CRON_SECRET` - enforced here whenever CRON_SECRET is set, so an
 * unauthenticated caller can't force-run every user's scheduled jobs on demand.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = supabaseAdmin();
  const { data: due, error } = await admin
    .from("schedules")
    .select("*")
    .eq("active", true)
    .lte("next_run", new Date().toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { scheduleId: string; status: "ok" | "error"; jobId?: string; error?: string }[] = [];

  for (const schedule of due ?? []) {
    const interval = isScheduleInterval(schedule.cron) ? schedule.cron : "daily";
    try {
      const service = getService(schedule.service);
      const { jobId } = await runJob(service, schedule.config);
      results.push({ scheduleId: schedule.id, status: "ok", jobId });
    } catch (err) {
      results.push({
        scheduleId: schedule.id,
        status: "error",
        error: err instanceof Error ? err.message : "unknown error",
      });
    }
    await admin
      .from("schedules")
      .update({ next_run: computeNextRun(interval).toISOString() })
      .eq("id", schedule.id);
  }

  return NextResponse.json({ processed: results.length, results });
}
