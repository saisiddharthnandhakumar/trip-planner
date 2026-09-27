import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Submission } from "@/lib/types";

export function SubmissionStatusList({
  submissions,
  maxParticipants,
}: {
  submissions: Submission[];
  maxParticipants: number | null;
}) {
  const inviteeLinkedCount = submissions.filter((s) => s.invitee_id).length;

  return (
    <div className="border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight">
          <Users className="size-4 text-muted-foreground" aria-hidden />
          Who&apos;s in
        </h2>
        <span className="text-sm text-muted-foreground">
          {maxParticipants !== null
            ? `${inviteeLinkedCount} / ${maxParticipants} submitted`
            : `${submissions.length} submitted`}
        </span>
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
