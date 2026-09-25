import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DestinationOption } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your options</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {options.map((option, i) => (
          <Card key={option.destination + i} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-xl">{option.destination}</CardTitle>
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
                    <p className="mt-1 text-sm text-muted-foreground">
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
