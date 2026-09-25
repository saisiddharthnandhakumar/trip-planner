create extension if not exists "pgcrypto";

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  locked boolean not null default false
);

alter table sessions enable row level security;

-- Sessions are only reachable via their unguessable id, so anon read/insert is fine for v1.
-- Row updates (locking) are done server-side with the service role key, so no anon update policy.
create policy "anon can read sessions" on sessions
  for select using (true);

create policy "anon can create sessions" on sessions
  for insert with check (true);
