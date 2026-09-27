"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Session, Invitee } from "@/lib/types";

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type Row = { phone: string; name: string };

export function CreateTripRosterForm({
  onCreated,
}: {
  onCreated: (session: Session, invitees: Invitee[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [friendCount, setFriendCount] = useState("1");
  const [rows, setRows] = useState<Row[]>([{ phone: "", name: "" }]);
  const [rowAnnouncement, setRowAnnouncement] = useState("");
  const [saving, setSaving] = useState(false);
  const lastRowRef = useRef<HTMLInputElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const focusNextRowRef = useRef(false);

  useEffect(() => {
    const count = Math.max(0, Math.round(Number(friendCount) || 0));
    setRows((prev) => {
      if (count === prev.length) return prev;
      if (count > prev.length) {
        focusNextRowRef.current = true;
        setRowAnnouncement(`${count} friends now — added a row.`);
        return [...prev, ...Array.from({ length: count - prev.length }, () => ({ phone: "", name: "" }))];
      }
      // Shrinking: only drop empty trailing rows, never silently discard filled ones.
      const removable = [...prev];
      let removed = 0;
      while (removable.length > count && removed < prev.length - count) {
        const last = removable[removable.length - 1];
        if (last.phone.trim() || last.name.trim()) break;
        removable.pop();
        removed++;
      }
      if (removable.length !== prev.length) {
        setRowAnnouncement(`${removable.length} friend rows remaining.`);
      }
      return removable;
    });
  }, [friendCount]);

  useEffect(() => {
    if (focusNextRowRef.current) {
      focusNextRowRef.current = false;
      lastRowRef.current?.focus();
    }
  }, [rows.length]);

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setFriendCount((c) => String(Math.max(1, (Math.round(Number(c) || 0) || 1) - 1)));
    setRowAnnouncement(`Removed friend ${index + 1}.`);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rows.some((r) => !r.phone.trim())) {
      toast.error("Every friend needs a phone number.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          deadline: new Date(deadline).toISOString(),
          max_participants: rows.length,
          invitees: rows.map((r) => ({
            phone_number: r.phone.trim(),
            name: r.name.trim() || null,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not create the trip.");
        return;
      }
      onCreated(json.session, json.invitees);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Create a trip</CardTitle>
        <p className="text-sm text-muted-foreground">
          Set a title, context, a deadline, and who you&apos;re inviting.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Trip title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Where should we go this year?"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">What&apos;s this trip for?</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Winter trip for New Year's — looking to get away somewhere cold for 4-5 days."
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Shown to everyone who opens the link, so they know the occasion
              and rough timing before they fill anything in.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Submission deadline</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Once this passes, submissions lock permanently and scoring runs
              automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="friend-count">Friends expected to join</Label>
            <Input
              id="friend-count"
              type="number"
              min={1}
              value={friendCount}
              onChange={(e) => setFriendCount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Not counting yourself — you&apos;ll add your own preferences next.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Their phone numbers</Label>
            <div aria-live="polite" className="sr-only">
              {rowAnnouncement}
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    ref={i === rows.length - 1 ? lastRowRef : undefined}
                    type="tel"
                    value={row.phone}
                    onChange={(e) => updateRow(i, "phone", e.target.value)}
                    placeholder="+1 555 123 4567"
                    aria-label={`Friend ${i + 1} phone number`}
                    className="flex-1"
                    required
                  />
                  <Input
                    value={row.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                    placeholder="Name (optional)"
                    aria-label={`Friend ${i + 1} name`}
                    className="flex-1"
                  />
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove friend ${i + 1}`}
                      onClick={() => removeRow(i)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Include the country code, e.g. +1 555 123 4567.
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Creating..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
