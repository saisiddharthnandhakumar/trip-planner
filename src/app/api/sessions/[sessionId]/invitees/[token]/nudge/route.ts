import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ sessionId: string; token: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { sessionId, token } = await params;
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("invitees")
    .update({ last_nudged_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("token", token)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Invite not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ invitee: data });
}
