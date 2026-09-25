import { notFound } from "next/navigation";
import { getSupabaseServiceClient } from "@/lib/supabase";
import { TripSession } from "@/components/trip-session";
import type { JoinRequest, Result, Session, Submission } from "@/lib/types";

export default async function TripPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single<Session>();

  if (!session) {
    notFound();
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("session_id", sessionId)
    .order("submitted_at", { ascending: true })
    .returns<Submission[]>();

  const { data: result } = await supabase
    .from("results")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle<Result>();

  const { data: joinRequests } = await supabase
    .from("join_requests")
    .select("*")
    .eq("session_id", sessionId)
    .order("requested_at", { ascending: true })
    .returns<JoinRequest[]>();

  return (
    <main className="flex-1">
      <TripSession
        session={session}
        initialSubmissions={submissions ?? []}
        initialResult={result ?? null}
        initialJoinRequests={joinRequests ?? []}
      />
    </main>
  );
}
