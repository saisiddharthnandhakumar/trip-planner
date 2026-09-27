import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { scoreDestinations } from "@/lib/gemini";
import type { Submission } from "@/lib/types";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, deadline, locked, description, max_participants")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  // Already scored — return the cached result, never call Gemini twice.
  const { data: existingResult } = await supabase
    .from("results")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existingResult) {
    return NextResponse.json({ result: existingResult });
  }

  const { data: submissions, error: submissionsError } = await supabase
    .from("submissions")
    .select("*")
    .eq("session_id", sessionId);

  if (submissionsError) {
    return NextResponse.json({ error: submissionsError.message }, { status: 500 });
  }

  const { data: invitees, error: inviteesError } = await supabase
    .from("invitees")
    .select("id")
    .eq("session_id", sessionId);

  if (inviteesError) {
    return NextResponse.json({ error: inviteesError.message }, { status: 500 });
  }

  // The roster is "complete" — and we don't need to wait for the deadline —
  // when every invited person has submitted, or (for open-link trips with no
  // fixed invite list) the participant cap has been reached.
  const respondedInviteeIds = new Set(
    (submissions ?? []).map((s) => s.invitee_id).filter((id): id is string => Boolean(id))
  );
  const rosterComplete =
    invitees && invitees.length > 0
      ? invitees.every((inv) => respondedInviteeIds.has(inv.id))
      : session.max_participants !== null &&
        (submissions?.length ?? 0) >= session.max_participants;

  if (!rosterComplete && new Date(session.deadline).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "The deadline hasn't passed yet." },
      { status: 409 }
    );
  }

  if (!session.locked) {
    await supabase.from("sessions").update({ locked: true }).eq("id", sessionId);
  }

  if (!submissions || submissions.length === 0) {
    return NextResponse.json(
      { error: "No submissions were collected before the deadline." },
      { status: 422 }
    );
  }

  try {
    const options = await scoreDestinations(
      submissions as Submission[],
      session.description ?? ""
    );

    const { data: result, error: resultError } = await supabase
      .from("results")
      .insert({ session_id: sessionId, options })
      .select()
      .single();

    if (resultError) {
      // Someone else's concurrent request may have written it first.
      const { data: raceResult } = await supabase
        .from("results")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (raceResult) {
        return NextResponse.json({ result: raceResult });
      }
      return NextResponse.json({ error: resultError.message }, { status: 500 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Scoring failed. Please contact the coordinator.",
      },
      { status: 502 }
    );
  }
}
