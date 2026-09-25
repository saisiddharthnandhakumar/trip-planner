"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { adminStorageKey } from "@/lib/local-storage";

function defaultDeadline() {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  // format for datetime-local input: yyyy-MM-ddTHH:mm
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function CreateTripPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [maxParticipants, setMaxParticipants] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          deadline: new Date(deadline).toISOString(),
          max_participants: maxParticipants || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not create the trip.");
        return;
      }
      window.localStorage.setItem(adminStorageKey(json.session.id), "true");
      router.push(`/trip/${json.session.id}`);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create a trip</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set a title, context, and a hard deadline for submissions.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
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
                Shown to everyone who opens the link, so they know the
                occasion and rough timing before they fill anything in.
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
                Once this passes, submissions lock permanently and scoring
                runs automatically.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-participants">Max participants (optional)</Label>
              <Input
                id="max-participants"
                type="number"
                min={1}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Leave blank for no limit"
              />
              <p className="text-xs text-muted-foreground">
                Once this many people have submitted, anyone else opening the
                link can only send a request to join, which you can approve
                or deny.
              </p>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Creating..." : "Create trip & get link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
