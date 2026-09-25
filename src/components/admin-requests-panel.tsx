"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { JoinRequest } from "@/lib/types";

export function AdminRequestsPanel({
  sessionId,
  joinRequests,
  onDecided,
}: {
  sessionId: string;
  joinRequests: JoinRequest[];
  onDecided: (request: JoinRequest) => void;
}) {
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const pending = joinRequests.filter((r) => r.status === "pending");
  const decided = joinRequests.filter((r) => r.status !== "pending");

  async function decide(requestId: string, decision: "approved" | "denied") {
    setDecidingId(requestId);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/join-requests/${requestId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not update that request.");
        return;
      }
      toast.success(
        decision === "approved" ? "Request approved." : "Request denied."
      );
      onDecided(json.joinRequest as JoinRequest);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setDecidingId(null);
    }
  }

  if (joinRequests.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Join requests</h2>
        {pending.length > 0 && <Badge>{pending.length} pending</Badge>}
      </div>
      {pending.length === 0 && decided.length === 0 && (
        <p className="text-sm text-muted-foreground">No requests yet.</p>
      )}
      <ul className="space-y-3">
        {pending.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{r.name}</p>
              {r.message && (
                <p className="text-sm text-muted-foreground">{r.message}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={decidingId === r.id}
                onClick={() => decide(r.id, "approved")}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={decidingId === r.id}
                onClick={() => decide(r.id, "denied")}
              >
                Deny
              </Button>
            </div>
          </li>
        ))}
        {decided.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between border-t border-border pt-3 text-sm first:border-t-0 first:pt-0"
          >
            <span>{r.name}</span>
            <Badge variant={r.status === "approved" ? "secondary" : "outline"}>
              {r.status}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
