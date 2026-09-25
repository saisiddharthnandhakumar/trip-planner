# Supabase setup

1. Create a project at https://supabase.com if you don't have one yet.
2. Open the SQL Editor in your Supabase project and run the three files in
   `migrations/` in order (`0001_sessions.sql`, `0002_submissions.sql`,
   `0003_results.sql`). If you have the Supabase CLI linked to this project,
   `supabase db push` works too.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — same page, "service_role" secret. The app
     has no auth, so every read/write goes through server-side API routes
     using this key; it's never sent to the browser.
   - `GEMINI_API_KEY` — from https://aistudio.google.com/apikey.
