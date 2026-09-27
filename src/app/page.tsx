import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { INDIA_DESTINATIONS } from "@/lib/india-destinations";

const HERO_IMAGES = INDIA_DESTINATIONS.map((d) => ({
  src: d.image,
  alt: d.name,
}));

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
    body: "The moment everyone's answered — or the deadline hits, whichever comes first — we score a few destinations against everyone's answers and rank them.",
  },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center overflow-hidden">
      <ImageStreamHero
        images={HERO_IMAGES}
        className="h-[540px] w-full sm:h-[560px]"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,var(--background)_15%,transparent_60%)]"
        />
        <div className="relative z-10 mx-auto flex h-full max-w-lg flex-col items-center justify-center px-4 text-center sm:px-6">
          <h1 className="font-heading text-balance text-4xl leading-[1.1] font-medium sm:text-6xl">
            Stop re-opening the group chat.
          </h1>
          <p className="mt-5 max-w-sm text-balance leading-relaxed text-muted-foreground">
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
        </div>
      </ImageStreamHero>

      <div className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-6 text-left sm:flex-row sm:gap-0">
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
