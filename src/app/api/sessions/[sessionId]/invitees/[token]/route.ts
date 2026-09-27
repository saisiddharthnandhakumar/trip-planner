import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ sessionId: string; token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { sessionId, token } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: invitee, error } = await supabase
    .from("invitees")
    .select("*")
    .eq("session_id", sessionId)
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!invitee) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select("*")
    .eq("invitee_id", invitee.id)
    .maybeSingle();

  return NextResponse.json({ invitee, submission: submission ?? null });
}
