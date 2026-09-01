import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-user";
import { getService } from "@/lib/pipeline/registry";
import { computeNextRun, isScheduleInterval } from "@/lib/pipeline/schedules";
import type { Json } from "@/lib/supabase/database.types";
import { requireOperator } from "@/lib/operator";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("schedules")
    .select("*")
    .eq("user_id", DEMO_USER_ID)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data });
}

export async function POST(req: NextRequest) {
  const denied = requireOperator(req);
  if (denied) return denied;

  const body = await req.json();
  const { service: serviceId, config, interval } = body;

  if (typeof serviceId !== "string") {
    return NextResponse.json({ error: "missing service id" }, { status: 400 });
  }
  if (typeof interval !== "string" || !isScheduleInterval(interval)) {
    return NextResponse.json({ error: "interval must be 'daily' or 'weekly'" }, { status: 400 });
  }

  try {
    const service = getService(serviceId);
    service.validateInputs(config);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid schedule config";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("schedules")
    .insert({
      user_id: DEMO_USER_ID,
      service: serviceId,
      config: (config ?? {}) as Json,
      cron: interval,
      next_run: computeNextRun(interval).toISOString(),
      active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data });
}
