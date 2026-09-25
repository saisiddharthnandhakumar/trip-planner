"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DESTINATION_TYPES, type DateRange, type Submission } from "@/lib/types";
import { cn } from "@/lib/utils";
import { submissionStorageKey } from "@/lib/local-storage";

const emptyRange: DateRange = { start: "", end: "" };

const LABELS: Record<string, string> = {
  beach: "Beach",
  mountain: "Mountain",
  city: "City",
  nature: "Nature",
  adventure: "Adventure",
  relaxation: "Relaxation",
};

export function SubmissionForm({
  sessionId,
  existingSubmissions,
  onSaved,
  approvedJoinRequestId,
}: {
  sessionId: string;
  existingSubmissions: Submission[];
  onSaved: (saved: Submission) => void;
  approvedJoinRequestId?: string;
}) {
  const router = useRouter();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [dateRanges, setDateRanges] = useState<DateRange[]>([{ ...emptyRange }]);
  const [types, setTypes] = useState<string[]>([]);
  const [dealbreakers, setDealbreakers] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    const storedId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(submissionStorageKey(sessionId))
        : null;
    if (!storedId) return;
    const existing = existingSubmissions.find((s) => s.id === storedId);
    if (existing) {
      // Hydrating form state from localStorage + fetched submissions, a one-time sync from external state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubmissionId(existing.id);
      setName(existing.name);
      setBudgetMin(String(existing.budget_min));
      setBudgetMax(String(existing.budget_max));
      setDateRanges(
        existing.date_ranges.length ? existing.date_ranges : [{ ...emptyRange }]
      );
      setTypes(existing.destination_types);
      setDealbreakers(existing.dealbreakers);
      setEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, existingSubmissions.length]);

  function toggleType(type: string) {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function updateRange(index: number, field: keyof DateRange, value: string) {
    setDateRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  function addRange() {
    setDateRanges((prev) => [...prev, { ...emptyRange }]);
  }

  function removeRange(index: number) {
    setDateRanges((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId ?? undefined,
          join_request_id: submissionId ? undefined : approvedJoinRequestId,
          name,
          budget_min: Number(budgetMin),
          budget_max: Number(budgetMax),
          date_ranges: dateRanges.filter((r) => r.start && r.end),
          destination_types: types,
          dealbreakers,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Something went wrong.");
        return;
      }
      const saved = json.submission as Submission;
      setSubmissionId(saved.id);
      window.localStorage.setItem(submissionStorageKey(sessionId), saved.id);
      setEditing(false);
      toast.success(submissionId ? "Updated your submission." : "Submission saved!");
      onSaved(saved);
      router.refresh();
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing && submissionId) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">You&apos;re in, {name}.</p>
            <p className="text-sm text-muted-foreground">
              You can edit your answers any time before the deadline.
            </p>
          </div>
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border bg-card p-5">
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Riya"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="budget-min">Budget min ($)</Label>
          <Input
            id="budget-min"
            type="number"
            min={0}
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget-max">Budget max ($)</Label>
          <Input
            id="budget-max"
            type="number"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Available dates</Label>
        {dateRanges.map((range, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              type="date"
              value={range.start}
              onChange={(e) => updateRange(i, "start", e.target.value)}
              required
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={range.end}
              onChange={(e) => updateRange(i, "end", e.target.value)}
              required
            />
            {dateRanges.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRange(i)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRange}>
          + Add another date range
        </Button>
      </div>

      <div className="space-y-3">
        <Label>Destination type (pick all that apply)</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DESTINATION_TYPES.map((type) => (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                types.includes(type)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              )}
            >
              <Checkbox
                checked={types.includes(type)}
                onCheckedChange={() => toggleType(type)}
              />
              {LABELS[type] ?? type}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dealbreakers">Dealbreakers</Label>
        <Textarea
          id="dealbreakers"
          value={dealbreakers}
          onChange={(e) => setDealbreakers(e.target.value)}
          placeholder="No overnight buses, nothing over 6 hours of travel, etc."
          rows={3}
        />
      </div>

      <Separator />

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving..." : submissionId ? "Save changes" : "Submit"}
      </Button>
    </form>
  );
}
