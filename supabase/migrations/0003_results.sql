create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  generated_at timestamptz not null default now(),
  options jsonb not null
);

alter table results enable row level security;

-- Results are written once by the server (service role, via the lock route)
-- right after scoring, and read by anyone with the session link afterward.
create policy "anon can read results" on results
  for select using (true);
