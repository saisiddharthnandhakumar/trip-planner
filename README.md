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

1. **Create** a trip at `/create` — title, a description of the occasion
   (shown to everyone, and fed into Gemini's reasoning), a deadline, and an
   optional max participant count. The creator's browser is remembered as
   the trip admin via localStorage.
2. **Submit** — anyone with the link fills in budget, dates, destination
   type, and dealbreakers. Editable until the deadline (tracked per-browser
   via localStorage, since there's no auth). Everyone with the link can copy
   and re-share it.
3. **Request to join** — once the trip hits its max participant count,
   anyone new opening the link gets a lightweight "request to join" form
   (name + message) instead of the full submission form. Only the admin's
   browser sees the pending requests and can approve or deny them; an
   approved request lets that one person submit past the cap.
4. **Lock** — once the deadline passes, the page calls the lock API, which
   flips `sessions.locked`, sends every submission (plus the trip
   description) to Gemini in one prompt, and caches the result in `results`.
   It only ever calls Gemini once per session.
5. **Results** — option cards with a per-person fit score (1-5) and reason,
   read from the cached `results` row on every subsequent visit.

## Deploy

Push to Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
and `GEMINI_API_KEY` as environment variables (same names as `.env.local`).
