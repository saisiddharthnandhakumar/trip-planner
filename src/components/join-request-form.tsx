"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { JoinRequest } from "@/lib/types";
import { joinRequestStorageKey } from "@/lib/local-storage";

export function JoinRequestForm({
  sessionId,
  maxParticipants,
  onRequested,
}: {
  sessionId: string;
  maxParticipants: number;
  onRequested: (request: JoinRequest) => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not send your request.");
        return;
      }
      const request = json.joinRequest as JoinRequest;
      window.localStorage.setItem(joinRequestStorageKey(sessionId), request.id);
      toast.success("Request sent — the trip creator will get back to you.");
      onRequested(request);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border border-border bg-card p-5"
    >
      <div>
        <p className="font-medium">This trip is full</p>
        <p className="text-sm text-muted-foreground">
          {maxParticipants} people have already submitted. Send a request to
          join and the trip creator can add you.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="request-name">Your name</Label>
        <Input
          id="request-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="request-message">Message (optional)</Label>
        <Textarea
          id="request-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Why you'd like to join..."
          rows={2}
        />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? "Sending..." : "Request to join"}
      </Button>
    </form>
  );
}
