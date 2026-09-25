import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-medium text-primary">Trip Planner</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          One link. One deadline. One decision.
        </h1>
        <p className="mt-4 text-balance text-muted-foreground">
          Stop restarting the group chat. Set a deadline, let everyone submit
          their budget, dates, and preferences, and get an AI-ranked
          shortlist scored against every person in the group.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/create" className={buttonVariants({ size: "lg" })}>
            Create a trip
          </Link>
        </div>
        <ol className="mt-12 grid gap-4 text-left sm:grid-cols-3">
          <li className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">1. Set a deadline</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a session and share the link with the group.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">2. Everyone submits</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Budget, dates, destination type, dealbreakers — editable until
              the deadline.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">3. Get a shortlist</p>
            <p className="mt-1 text-sm text-muted-foreground">
              AI scores 2-3 destinations against every person, automatically.
            </p>
          </li>
        </ol>
      </div>
    </main>
  );
}
