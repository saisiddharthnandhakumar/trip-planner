import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ sessionId: string; requestId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { sessionId, requestId } = await params;
  const body = await request.json().catch(() => null);
  const decision = body?.decision;

  if (decision !== "approved" && decision !== "denied") {
    return NextResponse.json(
      { error: "Decision must be 'approved' or 'denied'." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("join_requests")
    .update({ status: decision, decided_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("session_id", sessionId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "That request is no longer pending." },
      { status: 409 }
    );
  }

  return NextResponse.json({ joinRequest: data });
}
