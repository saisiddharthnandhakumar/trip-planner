# Trip Planner

One link, one deadline, one AI-scored shortlist — so a group can pick a trip
destination without another 200 messages.

## Stack

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Supabase (Postgres,
no auth — sessions are only reachable via their link), Gemini for scoring.

## Setup

```bash
npm install
```

Then follow [supabase/README.md](supabase/README.md) to create the schema
and fill in `.env.local` (copy `.env.local.example`).

```bash
npm run dev
```

## How it works

1. **Create** a trip at `/create` — title + deadline, get a `/trip/[id]` link.
2. **Submit** — anyone with the link fills in budget, dates, destination
   type, and dealbreakers. Editable until the deadline (tracked per-browser
   via localStorage, since there's no auth).
3. **Lock** — once the deadline passes, the page calls the lock API, which
   flips `sessions.locked`, sends every submission to Gemini in one prompt,
   and caches the result in `results`. It only ever calls Gemini once per
   session.
4. **Results** — option cards with a per-person fit score (1-5) and reason,
   read from the cached `results` row on every subsequent visit.

## Deploy

Push to Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
and `GEMINI_API_KEY` as environment variables (same names as `.env.local`).
