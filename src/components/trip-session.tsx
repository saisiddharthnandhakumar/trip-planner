"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Link as LinkIcon, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { CountdownTimer } from "@/components/countdown-timer";
import { SubmissionForm } from "@/components/submission-form";
import { SubmissionStatusList } from "@/components/submission-status-list";
import { JoinRequestForm } from "@/components/join-request-form";
import { AdminRequestsPanel } from "@/components/admin-requests-panel";
import { WaitingOnPanel } from "@/components/waiting-on-panel";
import { ResultsView } from "@/components/results-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session, Submission, Result, JoinRequest, Invitee } from "@/lib/types";
import {
  adminStorageKey,
  joinRequestStorageKey,
  submissionStorageKey,
} from "@/lib/local-storage";

export function TripSession({
  session,
  initialSubmissions,
  initialResult,
  initialJoinRequests,
}: {
  session: Session;
  initialSubmissions: Submission[];
  initialResult: Result | null;
  initialJoinRequests: JoinRequest[];
}) {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [joinRequests, setJoinRequests] = useState(initialJoinRequests);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [locked, setLocked] = useState(session.locked);
  const [result, setResult] = useState(initialResult);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mySubmissionId, setMySubmissionId] = useState<string | null>(null);
  const [myJoinRequestId, setMyJoinRequestId] = useState<string | null>(null);
  const [resolvedInvitee, setResolvedInvitee] = useState<Invitee | null>(null);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "resolving" | "error">(
    inviteToken ? "resolving" : "idle"
  );
  const lockRequested = useRef(false);

  useEffect(() => {
    // One-time hydration from localStorage — there's no auth, so this is how
    // this browser recognizes itself as the creator / an existing submitter
    // / a pending requester.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAdmin(window.localStorage.getItem(adminStorageKey(session.id)) === "true");
    setMySubmissionId(window.localStorage.getItem(submissionStorageKey(session.id)));
    setMyJoinRequestId(window.localStorage.getItem(joinRequestStorageKey(session.id)));
  }, [session.id]);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${session.id}/invitees/${inviteToken}`);
        if (cancelled) return;
        if (!res.ok) {
          setInviteStatus("error");
          return;
        }
        const json = await res.json();
        setResolvedInvitee(json.invitee);
        if (json.submission) {
          setMySubmissionId(json.submission.id);
          window.localStorage.setItem(submissionStorageKey(session.id), json.submission.id);
          setSubmissions((prev) =>
            prev.some((s) => s.id === json.submission.id) ? prev : [...prev, json.submission]
          );
        }
        setInviteStatus("idle");
      } catch {
        if (!cancelled) setInviteStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.id, inviteToken]);

  const refreshSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}/submissions`);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.submissions)) setSubmissions(json.submissions);
    } catch {
      // best-effort polling, ignore transient failures
    }
  }, [session.id]);

  const refreshJoinRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${session.id}/join-requests`);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.joinRequests)) setJoinRequests(json.joinRequests);
    } catch {
      // best-effort polling, ignore transient failures
    }
  }, [session.id]);

  const refreshInvitees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}/invitees`);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.invitees)) setInvitees(json.invitees);
    } catch {
      // best-effort polling, ignore transient failures
    }
  }, [session.id, isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshInvitees();
  }, [refreshInvitees]);

  useEffect(() => {
    if (locked) return;
    const interval = setInterval(() => {
      refreshSubmissions();
      refreshJoinRequests();
      refreshInvitees();
    }, 6000);
    return () => clearInterval(interval);
  }, [locked, refreshSubmissions, refreshJoinRequests, refreshInvitees]);

  const triggerLock = useCallback(async () => {
    if (lockRequested.current || result) return;
    lockRequested.current = true;
    setLocked(true);
    setScoring(true);
    setScoreError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/lock`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setScoreError(json.error ?? "Scoring failed.");
        lockRequested.current = false;
        return;
      }
      setResult(json.result);
    } catch {
      setScoreError("Network error while scoring. Try refreshing the page.");
      lockRequested.current = false;
    } finally {
      setScoring(false);
    }
  }, [session.id, result]);

  useEffect(() => {
    if (locked && !result && !scoring && !scoreError) {
      // Kicks off the one-time server-side scoring call once the deadline passes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      triggerLock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const attemptEarlyLock = useCallback(async () => {
    if (lockRequested.current || locked || result) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}/lock`, {
        method: "POST",
      });
      // A 409 just means the roster isn't complete yet — that's expected
      // most of the time, so stay quiet and let the deadline handle it.
      if (!res.ok) return;
      const json = await res.json();
      lockRequested.current = true;
      setLocked(true);
      setResult(json.result);
    } catch {
      // Best-effort probe; the deadline is still the fallback trigger.
    }
  }, [session.id, locked, result]);

  useEffect(() => {
    // Whenever the submission count changes, check whether everyone invited
    // has now responded (or the participant cap is filled) so the group
    // doesn't have to wait out the rest of the deadline to see results.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    attemptEarlyLock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions.length]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied — share it with the group.");
  }

  const hasOwnSubmission = submissions.some((s) => s.id === mySubmissionId);
  const inviteeLinkedCount = submissions.filter((s) => s.invitee_id).length;
  const isFull =
    session.max_participants !== null &&
    inviteeLinkedCount >= session.max_participants &&
    !hasOwnSubmission;
  const myJoinRequest = joinRequests.find((r) => r.id === myJoinRequestId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-heading text-2xl font-medium sm:text-3xl">
            {session.title}
          </h1>
          <Button variant="ghost" onClick={copyLink}>
            <LinkIcon className="size-4" />
            Copy link
          </Button>
        </div>
        {session.description && (
          <p className="text-sm text-muted-foreground">{session.description}</p>
        )}
        {!locked && (
          <p className="text-xs text-muted-foreground">
            Share this link with everyone you want on the trip — anyone who
            has it can submit their preferences.
          </p>
        )}
        <CountdownTimer
          deadline={session.deadline}
          locked={locked}
          onExpire={triggerLock}
        />
      </div>

      {inviteStatus === "resolving" && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          Resolving your invite…
        </p>
      )}
      {inviteStatus === "error" && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          That invite link isn&apos;t valid, but you can still submit below.
        </p>
      )}

      {!locked && (
        <>
          <SubmissionStatusList
            submissions={submissions}
            maxParticipants={session.max_participants}
          />

          {isAdmin && (
            <AdminRequestsPanel
              sessionId={session.id}
              joinRequests={joinRequests}
              onDecided={(updated) =>
                setJoinRequests((prev) =>
                  prev.map((r) => (r.id === updated.id ? updated : r))
                )
              }
            />
          )}

          {isAdmin && (
            <WaitingOnPanel
              sessionId={session.id}
              sessionTitle={session.title}
              deadline={session.deadline}
              invitees={invitees}
              submissions={submissions}
              onNudged={(updated) =>
                setInvitees((prev) =>
                  prev.map((i) => (i.id === updated.id ? updated : i))
                )
              }
            />
          )}

          {!isFull ? (
            <SubmissionForm
              sessionId={session.id}
              existingSubmissions={submissions}
              inviteeId={resolvedInvitee?.id}
              prefillName={resolvedInvitee?.name ?? undefined}
              onSaved={(saved) => {
                setMySubmissionId(saved.id);
                setSubmissions((prev) =>
                  prev.some((s) => s.id === saved.id)
                    ? prev.map((s) => (s.id === saved.id ? saved : s))
                    : [...prev, saved]
                );
                refreshSubmissions();
              }}
              approvedJoinRequestId={
                !resolvedInvitee && myJoinRequest?.status === "approved"
                  ? myJoinRequest.id
                  : undefined
              }
            />
          ) : myJoinRequest ? (
            <Card>
              <CardContent className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {myJoinRequest.status === "pending" &&
                      "Your request to join is pending approval."}
                    {myJoinRequest.status === "denied" &&
                      "Your request to join was declined."}
                  </p>
                  {myJoinRequest.status === "pending" && (
                    <p className="text-sm text-muted-foreground">
                      The trip creator will approve or deny it before the
                      deadline.
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    myJoinRequest.status === "denied" ? "outline" : "secondary"
                  }
                >
                  {myJoinRequest.status}
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <JoinRequestForm
              sessionId={session.id}
              onRequested={(request) => {
                setMyJoinRequestId(request.id);
                setJoinRequests((prev) => [...prev, request]);
              }}
            />
          )}
        </>
      )}

      {locked && !result && !scoreError && (
        <Card>
          <CardContent className="space-y-4 text-center">
            <p className="font-medium">Scoring destinations against everyone&apos;s answers…</p>
            <p className="text-sm text-muted-foreground">
              This takes a few seconds and only happens once.
            </p>
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {locked && scoreError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Scoring failed</AlertTitle>
          <AlertDescription>
            <p>{scoreError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => {
                lockRequested.current = false;
                setScoreError(null);
                triggerLock();
              }}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {result && <ResultsView options={result.options} />}
    </div>
  );
}
