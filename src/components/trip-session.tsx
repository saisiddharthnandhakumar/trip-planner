"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CountdownTimer } from "@/components/countdown-timer";
import { SubmissionForm } from "@/components/submission-form";
import { SubmissionStatusList } from "@/components/submission-status-list";
import { ResultsView } from "@/components/results-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session, Submission, Result } from "@/lib/types";

export function TripSession({
  session,
  initialSubmissions,
  initialResult,
}: {
  session: Session;
  initialSubmissions: Submission[];
  initialResult: Result | null;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [locked, setLocked] = useState(session.locked);
  const [result, setResult] = useState(initialResult);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const lockRequested = useRef(false);

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

  useEffect(() => {
    if (locked) return;
    const interval = setInterval(refreshSubmissions, 6000);
    return () => clearInterval(interval);
  }, [locked, refreshSubmissions]);

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
        <CountdownTimer
          deadline={session.deadline}
          locked={locked}
          onExpire={triggerLock}
        />
      </div>

      {!locked && (
        <>
          <SubmissionStatusList submissions={submissions} />
          <SubmissionForm
            sessionId={session.id}
            existingSubmissions={submissions}
            onSaved={refreshSubmissions}
          />
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
