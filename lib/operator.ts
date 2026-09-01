import { NextRequest, NextResponse } from "next/server";

/**
 * Operator-only gate for the routes that run the pipeline outside x402.
 *
 * /api/jobs and /api/schedules execute exactly the work the x402 endpoints charge for.
 * Left open, they hand the paid services away to anyone who knows the path - directly in
 * the first case, and on a recurring billed schedule in the second.
 *
 * This deliberately does NOT reuse the jobs secret. That falls back to the Supabase
 * service-role key, and the browser console has to send this one, so it must be a
 * dedicated credential whose only power is running jobs.
 */
export function requireOperator(req: NextRequest): NextResponse | null {
  // Mock mode does no billable work and calls no paid upstreams - leave local dev usable.
  if (process.env.MOCK_MODE === "true") return null;

  const key = process.env.OPERATOR_KEY;
  if (!key) {
    // Fail closed: an unset key must not mean "open to everyone".
    return NextResponse.json(
      { error: "OPERATOR_KEY is not configured on this deployment" },
      { status: 503 }
    );
  }

  if (req.headers.get("x-operator-key") !== key) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
