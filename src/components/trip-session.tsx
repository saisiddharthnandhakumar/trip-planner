"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CountdownTimer } from "@/components/countdown-timer";
import { SubmissionForm } from "@/components/submission-form";
import { SubmissionStatusList } from "@/components/submission-status-list";
import { JoinRequestForm } from "@/components/join-request-form";
import { AdminRequestsPanel } from "@/components/admin-requests-panel";
import { ResultsView } from "@/components/results-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session, Submission, Result, JoinRequest } from "@/lib/types";
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
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [joinRequests, setJoinRequests] = useState(initialJoinRequests);
  const [locked, setLocked] = useState(session.locked);
  const [result, setResult] = useState(initialResult);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mySubmissionId, setMySubmissionId] = useState<string | null>(null);
  const [myJoinRequestId, setMyJoinRequestId] = useState<string | null>(null);
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

  useEffect(() => {
    if (locked) return;
    const interval = setInterval(() => {
      refreshSubmissions();
      refreshJoinRequests();
    }, 6000);
    return () => clearInterval(interval);
  }, [locked, refreshSubmissions, refreshJoinRequests]);

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

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied — share it with the group.");
  }

  const hasOwnSubmission = submissions.some((s) => s.id === mySubmissionId);
  const isFull =
    session.max_participants !== null &&
    submissions.length >= session.max_participants &&
    !hasOwnSubmission;
  const myJoinRequest = joinRequests.find((r) => r.id === myJoinRequestId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Trip Planner</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {session.title}
            </h1>
          </div>
          <Button variant="outline" onClick={copyLink}>
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

          {!isFull ? (
            <SubmissionForm
              sessionId={session.id}
              existingSubmissions={submissions}
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
                myJoinRequest?.status === "approved" ? myJoinRequest.id : undefined
              }
            />
          ) : myJoinRequest ? (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
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
              </div>
            </div>
          ) : (
            <JoinRequestForm
              sessionId={session.id}
              maxParticipants={session.max_participants as number}
              onRequested={(request) => {
                setMyJoinRequestId(request.id);
                setJoinRequests((prev) => [...prev, request]);
              }}
            />
          )}
        </>
      )}

      {locked && !result && !scoreError && (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <p className="font-medium">Scoring destinations against everyone&apos;s answers…</p>
          <p className="text-sm text-muted-foreground">
            This takes a few seconds and only happens once.
          </p>
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      )}

      {locked && scoreError && (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-medium text-destructive">Scoring failed</p>
          <p className="text-sm text-muted-foreground">{scoreError}</p>
          <Button
            variant="outline"
            onClick={() => {
              lockRequested.current = false;
              setScoreError(null);
              triggerLock();
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {result && <ResultsView options={result.options} />}
    </div>
  );
}
