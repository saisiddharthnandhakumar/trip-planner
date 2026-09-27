import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import type { InviteeInput } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const deadline = typeof body?.deadline === "string" ? body.deadline : "";
  const maxParticipantsRaw = body?.max_participants;
  const invitees = Array.isArray(body?.invitees) ? (body.invitees as unknown[]) : [];

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

  const maxParticipants = Number(maxParticipantsRaw);
  if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
    return NextResponse.json(
      { error: "Enter how many friends are expected to join (at least 1)." },
      { status: 400 }
    );
  }

  const normalizedInvitees: InviteeInput[] = invitees.map((inv) => {
    const record = inv as Record<string, unknown>;
    return {
      phone_number:
        typeof record?.phone_number === "string" ? record.phone_number.trim() : "",
      name:
        typeof record?.name === "string" && record.name.trim()
          ? record.name.trim()
          : null,
    };
  });

  if (normalizedInvitees.length !== Math.round(maxParticipants)) {
    return NextResponse.json(
      { error: "The number of phone numbers must match the number of friends expected." },
      { status: 400 }
    );
  }

  if (normalizedInvitees.some((inv) => !inv.phone_number)) {
    return NextResponse.json(
      { error: "Every friend needs a phone number." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      title,
      description,
      deadline: deadlineDate.toISOString(),
      max_participants: Math.round(maxParticipants),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inviteeRows = normalizedInvitees.map((inv) => ({
    session_id: session.id,
    phone_number: inv.phone_number,
    name: inv.name,
    token: randomBytes(24).toString("base64url"),
  }));

  const { data: insertedInvitees, error: inviteesError } = await supabase
    .from("invitees")
    .insert(inviteeRows)
    .select();

  if (inviteesError) {
    // Compensating rollback — there's no multi-table transaction available here.
    await supabase.from("sessions").delete().eq("id", session.id);
    return NextResponse.json({ error: inviteesError.message }, { status: 500 });
  }

  return NextResponse.json(
    { session, invitees: insertedInvitees },
    { status: 201 }
  );
}
