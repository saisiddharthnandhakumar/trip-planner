import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("invitees")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invitees: data });
}
