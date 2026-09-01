import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402-avm/next";
import { getService } from "@/lib/pipeline/registry";
import { runServiceForX402 } from "./run-service";
import { isX402PayToConfigured, resourceServer, routeConfigFor } from "./server";

type Resolved = { serviceId: string; inputs: Record<string, unknown> };
type PaidExecutor = (resolved: Resolved, origin: string) => Promise<NextResponse> | NextResponse;

/**
 * Wrap a service handler with x402.
 *
 * Important for GoPlausible/Bazaar validation:
 * - Unpaid requests MUST return HTTP 402 with a standard PAYMENT-REQUIRED challenge
 *   (never 400 validation errors, never 405 on GET probes).
 * - Business-input validation runs only AFTER payment is verified, so bad free
 *   probes cannot short-circuit the 402 challenge.
 */
export function createValidatedX402Route(
  resolve: (body: Record<string, unknown>) => Resolved,
  execute?: PaidExecutor
) {
  async function handler(request: NextRequest): Promise<NextResponse> {
    // withX402 challenges an unpaid GET with 402 before this handler ever runs, so any
    // request reaching here - GET or POST - has already been paid for. GET used to be
    // special-cased to a flat 200 "ready" message. That is a real charge-for-nothing
    // bug, not a display quirk: confirmed live by reproducing the exact trigger (an
    // onchainos CLI call with a missing --body file falls back to sending GET) - the
    // paid request settled a real charge, returned the "ready" message, and
    // never reached resolve()/validateInputs()/execute, so no job was ever created and
    // nothing was ever delivered. A 405 was tried in between and also wrong: it broke
    // callers that pay
    // via GET expecting a real response.
    //
    // The fix is to stop treating GET as special at all. Route it through the exact
    // same validation as POST: no body (or a body missing required fields) fails with
    // 422 and no settlement, exactly like an underspecified POST already does.
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    let resolved: Resolved;
    try {
      resolved = resolve(body);
      getService(resolved.serviceId).validateInputs(resolved.inputs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid input";

      // withX402 only settles responses below 400. Invalid business parameters must
      // never charge the buyer, so return a clear, retryable validation response.
      return NextResponse.json(
        {
          ok: false,
          status: "invalid_input",
          message,
          hint: "Correct the parameters named above, then retry the paid request.",
        },
        { status: 422 }
      );
    }
    const { serviceId, inputs } = resolved;
    if (!execute) return runServiceForX402(serviceId, inputs, request.nextUrl.origin);

    // Unlike resolve/validateInputs above, a synchronous execute (e.g. Forecasting's
    // inline compute) can throw for reasons schema validation can't catch - a value
    // that parses fine but is business-invalid, like "need 20+ rows for a backtest".
    // Uncaught, that crashes the function: an empty 500 with no JSON body. Confirmed
    // harmless to the buyer's wallet (no response means the SDK never settles), but
    // it's a bad experience - they get nothing telling them what to fix. Catch it here
    // and answer the same way the pre-payment validator does.
    try {
      return await execute({ serviceId, inputs }, request.nextUrl.origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : "service could not process this input";
      return NextResponse.json(
        {
          ok: false,
          status: "invalid_input",
          message,
          hint: "Correct the parameters named above, then retry the paid request.",
        },
        { status: 422 }
      );
    }
  }

  // Payment middleware first: unpaid → 402; paid → handler above.
  //
  // One withX402 per path, built on first use and reused after. That keeps each route's
  // price, description, and Bazaar metadata isolated while reusing the same resource server.
  // Building per request instead of per path would re-run facilitator init every time.
  const perPath = new Map<string, (req: NextRequest) => Promise<NextResponse>>();

  function paidHandlerFor(pathname: string) {
    let paid = perPath.get(pathname);
    if (!paid) {
      paid = withChallengeBody(withX402(handler, routeConfigFor(pathname), resourceServer));
      perPath.set(pathname, paid);
    }
    return paid;
  }

  const route = async (request: NextRequest): Promise<NextResponse> => {
    const startedAt = Date.now();
    const requestId = request.headers.get("x-vercel-id");
    const context = {
      route: request.nextUrl.pathname,
      method: request.method,
      requestId,
      queryKeys: Array.from(request.nextUrl.searchParams.keys()),
      contentType: request.headers.get("content-type"),
      contentLength: request.headers.get("content-length"),
      hasPaymentSignature: Boolean(
        request.headers.get("payment-signature") || request.headers.get("x-payment")
      ),
    };

    console.log(JSON.stringify({ level: "info", message: "x402 request started", ...context }));
    try {
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

      const response = await paidHandlerFor(request.nextUrl.pathname)(request);
      console.log(
        JSON.stringify({
          level: "info",
          message: "x402 request completed",
          ...context,
          status: response.status,
          durationMs: Date.now() - startedAt,
        })
      );
      return response;
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "x402 request failed",
          ...context,
          error: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - startedAt,
        })
      );
      throw error;
    }
  };

  return {
    GET: route,
    POST: route,
  };
}

/**
 * Mirror the payment challenge into the 402 response body.
 *
 * The SDK returns the challenge only in the base64 PAYMENT-REQUIRED header and leaves the
 * body as `{}`. Clients that read the header work fine, but some listing validators read
 * the challenge from the body. Decoding it into the body satisfies both shapes.
 */
function withChallengeBody(
  wrapped: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const response = await wrapped(request);
    if (response.status !== 402) return response;

    const header =
      response.headers.get("Payment-Required") ?? response.headers.get("payment-required");
    if (!header) return response;

    try {
      const challenge = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "application/json");
      // Length changes with the new body; a stale value truncates the response.
      headers.delete("content-length");
      return new NextResponse(JSON.stringify(challenge), { status: 402, headers });
    } catch {
      // A challenge we cannot decode is still a valid 402 - never turn it into an error.
      return response;
    }
  };
}
