import { NextRequest, NextResponse } from "next/server";
import { runJob } from "@/lib/pipeline/orchestrator";
import { getService } from "@/lib/pipeline/registry";
import { requireOperator } from "@/lib/operator";

export async function POST(req: NextRequest) {
  const denied = requireOperator(req);
  if (denied) return denied;

  const body = await req.json();
  const { service: serviceId, ...inputs } = body;

  if (typeof serviceId !== "string") {
    return NextResponse.json({ error: "missing service id" }, { status: 400 });
  }

  try {
    const service = getService(serviceId);
    const result = await runJob(service, inputs);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
