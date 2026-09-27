import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const STEPS = [
  {
    number: "01",
    title: "Set a deadline",
    body: "Create a trip, set a hard deadline, and send the link to everyone who's coming.",
  },
  {
    number: "02",
    title: "Everyone submits once",
    body: "Budget, dates, vibe, dealbreakers — each person fills it in once, and can edit until the deadline.",
  },
  {
    number: "03",
    title: "Get your shortlist",
    body: "The second the deadline hits, we score a few destinations against everyone's answers and rank them.",
  },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--primary)_0%,transparent_60%)] opacity-[0.06]"
      />
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop re-opening the group chat.
        </h1>
        <p className="mt-4 text-balance text-muted-foreground">
          Set a deadline, everyone submits their budget and dates once, and
          you get a short, ranked list of places that actually work for the
          group.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/create" className={buttonVariants({ size: "lg" })}>
            Create a trip
          </Link>
          <p className="text-xs text-muted-foreground">
            No login. Just a link you send to the group.
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-6 text-left sm:flex-row sm:gap-0">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex sm:flex-1">
              {i > 0 && (
                <Separator
                  orientation="vertical"
                  className="mr-6 hidden sm:block"
                />
              )}
              {i > 0 && <div className="mb-6 border-t border-border sm:hidden" />}
              <div>
                <p className="font-mono text-2xl text-primary">{step.number}</p>
                <p className="mt-2 text-sm font-semibold tracking-tight">
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
