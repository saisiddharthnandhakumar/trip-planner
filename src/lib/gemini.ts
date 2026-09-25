import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { z } from "zod";
import type { DestinationOption, Submission } from "@/lib/types";

const fitSchema = z.object({
  name: z.string(),
  score: z.number().min(1).max(5),
  reason: z.string(),
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
              },
              required: ["name", "score", "reason"],
            },
          },
        },
        required: ["destination", "summary", "fits"],
      },
    },
  },
  required: ["options"],
};

function buildPrompt(submissions: Submission[]): string {
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

  return `You are helping a group of ${submissions.length} friends pick a trip destination.

Here is every participant's locked preferences:

${people}

Reason jointly over all of them together — not pairwise matching, not a fixed
scoring formula. Look for overlap (shared available dates, a destination type
more than one person wants) and conflict (one person's dealbreaker ruling out
what others want). Propose 2 to 3 destination options. For every option, you
must include a fit entry for every single person listed above — no one may be
omitted. Each fit needs a score from 1 to 5 and a one-line reason grounded in
that person's actual stated preferences. Destinations may come from your own
general knowledge of real places; you do not have live pricing or
availability data, so keep destinations realistic but do not claim specific
prices or availability.

Return only the destination options as structured data — no extra commentary.`;
}

export async function scoreDestinations(
  submissions: Submission[]
): Promise<DestinationOption[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const prompt = buildPrompt(submissions);

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
