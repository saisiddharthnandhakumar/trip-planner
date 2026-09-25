import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("session_id", sessionId)
    .order("requested_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ joinRequests: data });
}

export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, locked, deadline")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.locked || new Date(session.deadline).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "This trip is locked — it's too late to request to join." },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("join_requests")
    .insert({ session_id: sessionId, name, message })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ joinRequest: data }, { status: 201 });
}
