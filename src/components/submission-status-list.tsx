import { Badge } from "@/components/ui/badge";
import type { Submission } from "@/lib/types";

export function SubmissionStatusList({
  submissions,
  maxParticipants,
}: {
  submissions: Submission[];
  maxParticipants: number | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Who&apos;s in</h2>
        <Badge variant="secondary">
          {maxParticipants !== null
            ? `${submissions.length} / ${maxParticipants} submitted`
            : `${submissions.length} submitted`}
        </Badge>
      </div>
      {submissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No one has submitted yet — be the first.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {submissions.map((s) => (
            <li key={s.id}>
              <Badge variant="outline" className="font-normal">
                {s.name}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
