import { supabaseAdmin } from "@/lib/supabase/server";
import type { DeliverableFile, DeliverableRecord, WalletStatementSummary } from "@/lib/pipeline/types";
import type { Json } from "@/lib/supabase/database.types";
import type { AttestationResult } from "./attest";

export async function deliver(args: {
  jobId: string;
  file: DeliverableFile;
  attestation: AttestationResult;
  walletStatement?: { addresses: string[]; summary: WalletStatementSummary };
}): Promise<DeliverableRecord> {
  const admin = supabaseAdmin();
  const filePath = `${args.jobId}/deliverable.${args.file.extension}`;

  const upload = await admin.storage
    .from("deliverables")
    .upload(filePath, args.file.buffer, { contentType: args.file.contentType, upsert: true });
  if (upload.error) throw new Error(`deliver: upload failed - ${upload.error.message}`);

  const { data, error } = await admin
    .from("deliverables")
    .insert({
      job_id: args.jobId,
      file_path: filePath,
      file_type: args.file.extension,
      attestation_hash: args.attestation.hash,
      manifest: args.attestation.manifest,
    })
    .select()
    .single();
  if (error) throw new Error(`deliver: failed to record deliverable - ${error.message}`);

  if (args.walletStatement) {
    const { error: statementError } = await admin.from("wallet_statements").insert({
      job_id: args.jobId,
      addresses: args.walletStatement.addresses,
      summary: args.walletStatement.summary as unknown as Json,
    });
    if (statementError) {
      throw new Error(`deliver: failed to record wallet statement - ${statementError.message}`);
    }
  }

  const { error: jobError } = await admin
    .from("jobs")
    .update({ status: "delivered", completed_at: new Date().toISOString() })
    .eq("id", args.jobId);
  if (jobError) throw new Error(`deliver: failed to close job - ${jobError.message}`);

  return {
    id: data.id,
    jobId: data.job_id,
    filePath: data.file_path,
    fileType: data.file_type,
    attestationHash: data.attestation_hash!,
    manifest: data.manifest as Record<string, unknown>,
  };
}
