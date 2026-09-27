import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TriangleAlert } from "lucide-react";
import type { DestinationOption, Fit, FitLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * An option only counts as a real consensus pick if nobody in the group is
 * left at a 1 or 2 — otherwise it's a compromise imposed on whoever scored
 * lowest, not something "everyone" agreed to.
 */
const NO_CONSENSUS_THRESHOLD = 3;

function worstFit(option: DestinationOption): number {
  if (option.fits.length === 0) return 0;
  return Math.min(...option.fits.map((f) => f.score));
}

const FIT_LEVEL_LABEL: Record<FitLevel, string> = {
  yes: "match",
  partial: "partial",
  no: "no match",
};

const FIT_LEVEL_VARIANT: Record<FitLevel, "secondary" | "outline" | "destructive"> = {
  yes: "secondary",
  partial: "outline",
  no: "destructive",
};

function FitFactors({ fit }: { fit: Fit }) {
  const factors: [string, FitLevel][] = [
    ["Budget", fit.budgetFit],
    ["Dates", fit.datesFit],
    ["Vibe", fit.typeFit],
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {factors.map(([label, level]) => (
        <Badge key={label} variant={FIT_LEVEL_VARIANT[level]}>
          {label}: {FIT_LEVEL_LABEL[level]}
        </Badge>
      ))}
    </div>
  );
}

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${score} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-2 rounded-full",
            i < score ? "bg-primary" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

export function ResultsView({ options }: { options: DestinationOption[] }) {
  const noConsensus =
    options.length > 0 &&
    Math.max(...options.map(worstFit)) < NO_CONSENSUS_THRESHOLD;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">Your options</h2>

      {noConsensus && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>No option is a strong fit for everyone</AlertTitle>
          <AlertDescription>
            Every option below leaves at least one person unhappy — read
            through the low scores below to see who and why. Rather than
            picking the least-bad compromise, consider: reopening submissions
            with looser constraints, asking whoever scored lowest if their
            dealbreaker actually holds, or splitting into two smaller trips
            that each fit their group better.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {options.map((option, i) => (
          <Card key={option.destination + i} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">
                {option.destination}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{option.summary}</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {option.fits.map((fit) => (
                  <li key={fit.name} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{fit.name}</span>
                      <ScoreDots score={fit.score} />
                    </div>
                    <div className="mt-2">
                      <FitFactors fit={fit} />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {fit.reason}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
