"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Join requests</CardTitle>
        {pending.length > 0 && <Badge>{pending.length} pending</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
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
            <span className="flex items-center gap-1 text-muted-foreground">
              {r.status === "approved" ? (
                <Check className="size-3.5" />
              ) : (
                <X className="size-3.5" />
              )}
              {r.status}
            </span>
          </li>
        ))}
      </ul>
      </CardContent>
    </Card>
  );
}
