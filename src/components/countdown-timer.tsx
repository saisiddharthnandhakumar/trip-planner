"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function getParts(msRemaining: number) {
  const clamped = Math.max(0, msRemaining);
  const totalSeconds = Math.floor(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({
  deadline,
  locked,
  onExpire,
}: {
  deadline: string;
  locked: boolean;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Set the initial tick only after mount to avoid a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const deadlineMs = new Date(deadline).getTime();
  const msRemaining = now === null ? null : deadlineMs - now;
  const expired = msRemaining !== null && msRemaining <= 0;

  useEffect(() => {
    if (expired && !locked) {
      onExpire?.();
    }
  }, [expired, locked, onExpire]);

  if (locked || expired) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground" />
        Submissions are locked
      </div>
    );
  }

  if (msRemaining === null) {
    return (
      <div className="h-[52px] w-full max-w-xs animate-pulse rounded-lg bg-muted" />
    );
  }

  const { days, hours, minutes, seconds } = getParts(msRemaining);
  const urgent = msRemaining <= 60 * 60 * 1000;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
        urgent
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          : "border-border bg-card"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          urgent ? "animate-pulse bg-amber-500" : "bg-emerald-500"
        )}
      />
      <div className="flex items-baseline gap-1.5 font-mono text-sm tabular-nums sm:text-base">
        {days > 0 && (
          <span>
            <strong className="font-semibold">{days}</strong>d
          </span>
        )}
        <span>
          <strong className="font-semibold">{pad(hours)}</strong>h
        </span>
        <span>
          <strong className="font-semibold">{pad(minutes)}</strong>m
        </span>
        <span>
          <strong className="font-semibold">{pad(seconds)}</strong>s
        </span>
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          until deadline
        </span>
      </div>
    </div>
  );
}
