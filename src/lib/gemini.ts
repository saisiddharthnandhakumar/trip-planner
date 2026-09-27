import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod";
import type { DestinationOption, Submission } from "@/lib/types";

const fitLevelSchema = z.enum(["yes", "partial", "no"]);

const fitSchema = z.object({
  name: z.string(),
  score: z.number().min(1).max(5),
  reason: z.string(),
  budgetFit: fitLevelSchema,
  datesFit: fitLevelSchema,
  typeFit: fitLevelSchema,
});

const optionSchema = z.object({
  destination: z.string(),
  summary: z.string(),
  fits: z.array(fitSchema),
});

const responseSchema = z.object({
  options: z.array(optionSchema).min(2).max(3),
});

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    options: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          destination: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          fits: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                score: { type: SchemaType.NUMBER },
                reason: { type: SchemaType.STRING },
                budgetFit: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["yes", "partial", "no"],
                },
                datesFit: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["yes", "partial", "no"],
                },
                typeFit: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["yes", "partial", "no"],
                },
              },
              required: [
                "name",
                "score",
                "reason",
                "budgetFit",
                "datesFit",
                "typeFit",
              ],
            },
          },
        },
        required: ["destination", "summary", "fits"],
      },
    },
  },
  required: ["options"],
};

function buildPrompt(submissions: Submission[], tripDescription: string): string {
  const people = submissions
    .map((s) => {
      const dates = s.date_ranges
        .map((r) => `${r.start} to ${r.end}`)
        .join("; ") || "no dates given";
      const types = s.destination_types.join(", ") || "no preference given";
      return [
        `- Name: ${s.name}`,
        `  Budget: $${s.budget_min}-$${s.budget_max}`,
        `  Available dates: ${dates}`,
        `  Destination types wanted: ${types}`,
        `  Dealbreakers: ${s.dealbreakers || "none"}`,
      ].join("\n");
    })
    .join("\n");

  const context = tripDescription
    ? `The trip's occasion and context, set by the organizer: "${tripDescription}". Weigh this alongside everyone's individual preferences below.\n\n`
    : "";

  return `You are helping a group of ${submissions.length} friends pick a trip destination.

${context}Here is every participant's locked preferences:

${people}

Reason jointly over all of them together — not pairwise matching, not a fixed
scoring formula. Look for overlap (shared available dates, a destination type
more than one person wants) and conflict (one person's dealbreaker ruling out
what others want). Propose 2 to 3 destination options, and every option must
be a real place in India — do not propose anywhere outside India, regardless
of what destination types or vibes people asked for (map "beach" to an Indian
coast, "mountain" to somewhere like the Himalayas or Western Ghats, and so
on). For every option, you must include a fit entry for every single person
listed above — no one may be omitted. Destinations may come from your own
general knowledge of real places in India; you do not have live pricing or
availability data, so keep destinations realistic but do not claim specific
prices or availability.

For every person's fit entry, be explicit and transparent about *why* they
got that score, so anyone reading it can tell at a glance whether it's a
budget match, a calendar/date-availability match, or a destination-type
match:
- budgetFit: "yes" if the option's realistic cost sits inside their stated
  budget range, "partial" if it's borderline or only affordable with
  compromises, "no" if it's clearly outside their range.
- datesFit: "yes" if the option's timing overlaps their available date
  ranges, "partial" if it overlaps only part of the group's shared window,
  "no" if it conflicts with their stated availability.
- typeFit: "yes" if the option matches one of their wanted destination
  types, "partial" if it's an adjacent/compromise vibe, "no" if it doesn't
  match any of their wanted types.
- reason: one line in plain language naming the specific factor(s) driving
  the score (e.g. "Fits your $X-Y budget and June dates, but it's a city
  trip, not the beach you wanted").

Score honestly — do not inflate a score to make an option look like a
consensus pick when it isn't one. If every realistic option leaves someone at
a 1 or 2, still propose your best 2-3 options, but say so plainly in that
option's summary (name who it doesn't work for and why) rather than hiding
the mismatch.

Return only the destination options as structured data — no extra commentary.`;
}

export async function scoreDestinations(
  submissions: Submission[],
  tripDescription: string
): Promise<DestinationOption[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.8-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const prompt = buildPrompt(submissions, tripDescription);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = responseSchema.parse(JSON.parse(text));
      return parsed.options;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Gemini scoring failed after retry: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
