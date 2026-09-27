import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { DESTINATION_TYPES } from "@/lib/types";

type Params = { params: Promise<{ sessionId: string }> };

function validateBody(body: unknown) {
  const b = body as Record<string, unknown> | null;
  const name = typeof b?.name === "string" ? b.name.trim() : "";
  const budgetMin = Number(b?.budget_min);
  const budgetMax = Number(b?.budget_max);
  const dateRanges = Array.isArray(b?.date_ranges) ? b.date_ranges : [];
  const destinationTypes = Array.isArray(b?.destination_types)
    ? b.destination_types.filter((t) => DESTINATION_TYPES.includes(t))
    : [];
  const dealbreakers = typeof b?.dealbreakers === "string" ? b.dealbreakers : "";
  const submissionId =
    typeof b?.submission_id === "string" ? b.submission_id : undefined;
  const joinRequestId =
    typeof b?.join_request_id === "string" ? b.join_request_id : undefined;
  const inviteeId =
    typeof b?.invitee_id === "string" ? b.invitee_id : undefined;

  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(budgetMin) || !Number.isFinite(budgetMax) || budgetMin < 0) {
    return { error: "Budget range is invalid." };
  }
  if (budgetMax < budgetMin) {
    return { error: "Budget max must be at least budget min." };
  }
  if (destinationTypes.length === 0) {
    return { error: "Pick at least one destination type." };
  }
  for (const range of dateRanges) {
    if (
      typeof range !== "object" ||
      range === null ||
      typeof (range as { start?: unknown }).start !== "string" ||
      typeof (range as { end?: unknown }).end !== "string"
    ) {
      return { error: "Date ranges are invalid." };
    }
  }
  if (dateRanges.length === 0) {
    return { error: "Add at least one available date range." };
  }

  return {
    submissionId,
    joinRequestId,
    inviteeId,
    values: {
      name,
      budget_min: Math.round(budgetMin),
      budget_max: Math.round(budgetMax),
      date_ranges: dateRanges,
      destination_types: destinationTypes,
      dealbreakers,
    },
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("session_id", sessionId)
    .order("submitted_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data });
}

export async function POST(request: Request, { params }: Params) {
  const { sessionId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = validateBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, deadline, locked, max_participants")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.locked || new Date(session.deadline).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Submissions are locked — the deadline has passed." },
      { status: 409 }
    );
  }

  if (parsed.submissionId) {
    const { data, error } = await supabase
      .from("submissions")
      .update(parsed.values)
      .eq("id", parsed.submissionId)
      .eq("session_id", sessionId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Could not find that submission to update." },
        { status: 404 }
      );
    }
    return NextResponse.json({ submission: data });
  }

  if (parsed.joinRequestId && parsed.inviteeId) {
    return NextResponse.json(
      { error: "A submission can't be linked to both an invite and a join request." },
      { status: 400 }
    );
  }

  let validatedInviteeId: string | null = null;
  if (parsed.inviteeId) {
    const { data: invitee, error: inviteeError } = await supabase
      .from("invitees")
      .select("id, session_id")
      .eq("id", parsed.inviteeId)
      .single();

    if (inviteeError || !invitee || invitee.session_id !== sessionId) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }

    const { data: existingUse } = await supabase
      .from("submissions")
      .select("id")
      .eq("invitee_id", parsed.inviteeId)
      .maybeSingle();

    if (existingUse) {
      return NextResponse.json(
        { error: "This invite link has already been used to submit." },
        { status: 409 }
      );
    }

    validatedInviteeId = parsed.inviteeId;
  }

  // Roster capacity is scoped to invitee-linked submissions only, so the
  // admin's own submission (no invitee_id) and an invitee's own submission
  // never trip this gate — only a stranger via the shared link can hit it.
  if (!validatedInviteeId && session.max_participants !== null) {
    const { count, error: countError } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .not("invitee_id", "is", null);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const atCapacity = (count ?? 0) >= session.max_participants;

    if (atCapacity) {
      if (!parsed.joinRequestId) {
        return NextResponse.json(
          {
            error:
              "This trip is full. Send a request to join instead of submitting directly.",
          },
          { status: 409 }
        );
      }

      const { data: joinRequest, error: joinRequestError } = await supabase
        .from("join_requests")
        .select("id, session_id, status")
        .eq("id", parsed.joinRequestId)
        .single();

      if (
        joinRequestError ||
        !joinRequest ||
        joinRequest.session_id !== sessionId ||
        joinRequest.status !== "approved"
      ) {
        return NextResponse.json(
          { error: "Your join request hasn't been approved yet." },
          { status: 403 }
        );
      }

      const { data: existingJoinRequestUse } = await supabase
        .from("submissions")
        .select("id")
        .eq("join_request_id", parsed.joinRequestId)
        .maybeSingle();

      if (existingJoinRequestUse) {
        return NextResponse.json(
          { error: "This join request has already been used." },
          { status: 409 }
        );
      }
    }
  }

  const { data, error } = await supabase
    .from("submissions")
    .insert({
      ...parsed.values,
      session_id: sessionId,
      join_request_id: parsed.joinRequestId ?? null,
      invitee_id: validatedInviteeId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submission: data }, { status: 201 });
}
