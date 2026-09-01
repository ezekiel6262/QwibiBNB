import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isX402PayToConfigured, resourceServer, routeConfigFor } from "@/lib/x402/server";

export const maxDuration = 30;

async function handler(request: NextRequest): Promise<NextResponse> {
  if (!isX402PayToConfigured) {
    return NextResponse.json(
      {
        ok: false,
        status: "x402_not_configured",
        message:
          "Set AVM_ADDRESS to one Algorand account opted into USDC before enabling paid x402 endpoints.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const jobId = stringParam(body.jobId) || request.nextUrl.searchParams.get("jobId");
  const hash = stringParam(body.hash) || request.nextUrl.searchParams.get("hash");

  if (!jobId && !hash) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid_input",
        message: "Provide either jobId or hash.",
      },
      { status: 422 }
    );
  }

  const admin = supabaseAdmin();
  let query = admin
    .from("deliverables")
    .select("job_id, attestation_hash, manifest, file_type, created_at");

  if (jobId) {
    query = query.eq("job_id", jobId);
  } else if (hash) {
    query = query.eq("attestation_hash", hash);
  }

  const { data: deliverable, error } = await query.maybeSingle();
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "lookup_failed",
        message: error.message,
      },
      { status: 500 }
    );
  }

  if (!deliverable) {
    return NextResponse.json(
      {
        ok: false,
        status: "not_found",
        verified: false,
        untampered: false,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    status: "verified",
    verified: true,
    untampered: true,
    jobId: deliverable.job_id,
    attestationHash: deliverable.attestation_hash,
    fileType: deliverable.file_type,
    manifest: deliverable.manifest,
    recordedAt: deliverable.created_at,
    verifyUrl: `${request.nextUrl.origin}/verify/${deliverable.job_id}`,
  });
}

function stringParam(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

const paidHandler = withX402(handler, routeConfigFor("/api/x402/verify"), resourceServer);

export const GET = paidHandler;
export const POST = paidHandler;
