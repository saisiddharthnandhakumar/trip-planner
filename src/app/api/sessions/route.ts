import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const deadline = typeof body?.deadline === "string" ? body.deadline : "";
  const maxParticipantsRaw = body?.max_participants;

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json(
      { error: "Tell participants what this trip is for." },
      { status: 400 }
    );
  }

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Deadline must be a valid time in the future." },
      { status: 400 }
    );
  }

  let maxParticipants: number | null = null;
  if (maxParticipantsRaw !== null && maxParticipantsRaw !== undefined && maxParticipantsRaw !== "") {
    const n = Number(maxParticipantsRaw);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json(
        { error: "Max participants must be a positive number." },
        { status: 400 }
      );
    }
    maxParticipants = Math.round(n);
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      title,
      description,
      deadline: deadlineDate.toISOString(),
      max_participants: maxParticipants,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
