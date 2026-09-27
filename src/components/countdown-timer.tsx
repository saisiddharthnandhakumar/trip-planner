"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
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
      <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm font-medium text-muted-foreground">
        <Lock className="size-3.5" />
        Submissions are locked
      </div>
    );
  }

  if (msRemaining === null) {
    return <div className="h-8 w-40 animate-pulse rounded-full bg-muted" />;
  }

  const { days, hours, minutes, seconds } = getParts(msRemaining);
  const urgent = msRemaining <= 60 * 60 * 1000;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5">
      <div
        className={cn(
          "flex items-baseline gap-1.5 font-mono tabular-nums",
          urgent
            ? "animate-pulse text-lg font-semibold motion-reduce:animate-none sm:text-xl"
            : "text-sm font-medium sm:text-base"
        )}
      >
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
      </div>
      <span className="text-xs text-muted-foreground">until deadline</span>
    </div>
  );
}
