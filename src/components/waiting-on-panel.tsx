"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { Invitee, Submission } from "@/lib/types";

export function WaitingOnPanel({
  sessionId,
  sessionTitle,
  deadline,
  invitees,
  submissions,
  onNudged,
}: {
  sessionId: string;
  sessionTitle: string;
  deadline: string;
  invitees: Invitee[];
  submissions: Submission[];
  onNudged: (invitee: Invitee) => void;
}) {
  const [nudgingId, setNudgingId] = useState<string | null>(null);

  if (invitees.length === 0) return null;

  const respondedIds = new Set(
    submissions.filter((s) => s.invitee_id).map((s) => s.invitee_id)
  );
  const waiting = invitees
    .filter((inv) => !respondedIds.has(inv.id))
    .sort((a, b) => {
      if (!a.last_nudged_at && !b.last_nudged_at) {
        return a.created_at.localeCompare(b.created_at);
      }
      if (!a.last_nudged_at) return -1;
      if (!b.last_nudged_at) return 1;
      return a.last_nudged_at.localeCompare(b.last_nudged_at);
    });

  async function handleNudge(invitee: Invitee) {
    const isFirstTouch = !invitee.last_nudged_at;
    const link = `${window.location.origin}/trip/${sessionId}?invite=${invitee.token}`;
    const deadlineStr = format(new Date(deadline), "EEE, MMM d 'at' h:mm a");
    const greeting = invitee.name ? ` ${invitee.name}` : "";
    const message = isFirstTouch
      ? `Hey${greeting}! You're invited to help plan "${sessionTitle}". Add your travel preferences before ${deadlineStr}: ${link}`
      : `Hey${greeting} — friendly reminder to add your preferences for "${sessionTitle}" before ${deadlineStr}: ${link}`;
    const phoneDigits = invitee.phone_number.replace(/\D/g, "");

    window.open(
      `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );

    setNudgingId(invitee.id);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/invitees/${invitee.token}/nudge`,
        { method: "POST" }
      );
      if (!res.ok) {
        toast.error("Opened WhatsApp, but couldn't record the nudge.");
        return;
      }
      const json = await res.json();
      onNudged(json.invitee as Invitee);
    } catch {
      toast.error("Opened WhatsApp, but couldn't record the nudge.");
    } finally {
      setNudgingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waiting on</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
      {waiting.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone has responded.</p>
      ) : (
        <ul className="space-y-3">
          {waiting.map((invitee) => (
            <li
              key={invitee.id}
              className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{invitee.name || invitee.phone_number}</p>
                <p className="text-sm text-muted-foreground">
                  {invitee.last_nudged_at
                    ? `Last nudged ${format(new Date(invitee.last_nudged_at), "MMM d, h:mm a")}`
                    : "Not contacted yet"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={nudgingId === invitee.id}
                onClick={() => handleNudge(invitee)}
              >
                {invitee.last_nudged_at ? "Send reminder" : "Send invite"}
                <span className="sr-only"> (opens WhatsApp in a new tab)</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      </CardContent>
    </Card>
  );
}
