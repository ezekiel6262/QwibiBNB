import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { DEMO_USER_ID } from "@/lib/demo-user";
import { requireOperator } from "@/lib/operator";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = requireOperator(req);
  if (denied) return denied;

  const { error } = await supabaseAdmin()
    .from("schedules")
    .delete()
    .eq("id", params.id)
    .eq("user_id", DEMO_USER_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
