create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  budget_min integer not null,
  budget_max integer not null,
  date_ranges jsonb not null default '[]'::jsonb,
  destination_types text[] not null default '{}',
  dealbreakers text not null default '',
  submitted_at timestamptz not null default now()
);

create index if not exists submissions_session_id_idx on submissions(session_id);

alter table submissions enable row level security;

-- Anon can read/insert/update submissions; the API routes are responsible for
-- rejecting writes once a session is locked or past its deadline (v1 has no
-- auth, so this is app-level enforcement rather than RLS-level).
create policy "anon can read submissions" on submissions
  for select using (true);

create policy "anon can create submissions" on submissions
  for insert with check (true);

create policy "anon can update submissions" on submissions
  for update using (true) with check (true);
