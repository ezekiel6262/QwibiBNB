import { createHash } from "crypto";
import type { Json } from "@/lib/supabase/database.types";

export type AttestationResult = {
  hash: string;
  manifest: Json;
};

/**
 * Off-chain attestation only: SHA-256 the rendered deliverable and record a manifest
 * (sources, timestamp, job id) alongside it in storage. No blockchain, no smart contract,
 * no chain submission of any kind - see BRIEF.md. Verification is a lookup against this
 * manifest via /verify/[hash], not a chain explorer.
 */
export function attest(content: string | Buffer, meta: { jobId: string; sources: string[] }): AttestationResult {
  const hash = createHash("sha256").update(content).digest("hex");
  const manifest = {
    jobId: meta.jobId,
    sources: meta.sources,
    hash,
    timestamp: new Date().toISOString(),
  };
  return { hash, manifest };
}
