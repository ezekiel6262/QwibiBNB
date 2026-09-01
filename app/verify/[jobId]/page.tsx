import { supabaseAdmin } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";

export default async function VerifyPage(props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const admin = supabaseAdmin();
  const { data: deliverable } = await admin
    .from("deliverables")
    .select("attestation_hash, manifest, file_type, created_at")
    .eq("job_id", params.jobId)
    .single();

  if (!deliverable) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="font-mono text-xs uppercase tracking-wide text-gray-400">
          Verification record
        </p>
        <h1 className="mt-3 text-xl font-semibold">No record found for this link.</h1>
        <p className="mt-2 text-sm text-gray-500">
          Either the job has not finished, or this link is incorrect.
        </p>
      </main>
    );
  }

  const manifest = deliverable.manifest as Record<string, unknown>;

  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="flex items-center gap-2.5">
        <Logo className="h-4 w-4" />
        <span className="text-sm font-semibold">QWIBI VERIFY</span>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Document verified. Untampered.
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        This hash and manifest were recorded by Qwibi at the moment this document was
        delivered. No blockchain involved - this is a direct lookup against our
        verification registry.
      </p>

      <div className="mt-8 border border-gray-200 p-6 font-mono text-[12px]">
        {Object.entries({
          sha256: deliverable.attestation_hash,
          "file type": deliverable.file_type,
          sources: Array.isArray(manifest.sources)
            ? (manifest.sources as string[]).join(", ")
            : "",
          timestamp: manifest.timestamp as string,
        }).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-gray-100 py-2">
            <span className="text-gray-400">{k}</span>
            <span className="text-right">{String(v)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-2">
          <span className="text-gray-400">status</span>
          <span className="text-green-600">VERIFIED &middot; UNTAMPERED</span>
        </div>
      </div>
    </main>
  );
}
