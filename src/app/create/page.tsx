"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreateTripRosterForm } from "@/components/create-trip-roster-form";
import { SubmissionForm } from "@/components/submission-form";
import { adminStorageKey } from "@/lib/local-storage";
import type { Session } from "@/lib/types";

export default function CreateTripPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <CreateTripRosterForm
          onCreated={(createdSession) => {
            window.localStorage.setItem(adminStorageKey(createdSession.id), "true");
            setSession(createdSession);
          }}
        />
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Add your own preferences
          </h1>
          <p className="text-sm text-muted-foreground">
            One last step — submit your own answers before the trip page goes live.
          </p>
        </div>
        <SubmissionForm
          sessionId={session.id}
          existingSubmissions={[]}
          onSaved={() => router.push(`/trip/${session.id}`)}
        />
      </div>
    </main>
  );
}
