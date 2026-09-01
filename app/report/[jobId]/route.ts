import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
};

export async function GET(_req: NextRequest, props: { params: Promise<{ jobId: string }> }) {
  const params = await props.params;
  const admin = supabaseAdmin();

  const { data: deliverable, error } = await admin
    .from("deliverables")
    .select("file_path, file_type")
    .eq("job_id", params.jobId)
    .single();

  if (error || !deliverable) {
    return NextResponse.json({ error: "deliverable not found" }, { status: 404 });
  }

  const download = await admin.storage.from("deliverables").download(deliverable.file_path);
  if (download.error) {
    return NextResponse.json({ error: download.error.message }, { status: 500 });
  }

  const bytes = await download.data.arrayBuffer();
  const contentType = CONTENT_TYPES[deliverable.file_type] ?? "application/octet-stream";
  return new NextResponse(bytes, {
    headers: {
      "content-type": contentType,
      "content-disposition": `inline; filename="qwibi-${params.jobId}.${deliverable.file_type}"`,
    },
  });
}
