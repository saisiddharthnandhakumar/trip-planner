alter table sessions
  add column if not exists description text not null default '',
  add column if not exists max_participants integer;

create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists join_requests_session_id_idx on join_requests(session_id);

alter table join_requests enable row level security;

create policy "anon can read join requests" on join_requests
  for select using (true);

create policy "anon can create join requests" on join_requests
  for insert with check (true);

alter table submissions
  add column if not exists join_request_id uuid references join_requests(id);

create unique index if not exists submissions_join_request_id_key
  on submissions(join_request_id)
  where join_request_id is not null;
