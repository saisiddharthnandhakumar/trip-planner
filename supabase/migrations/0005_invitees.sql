create table if not exists invitees (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  phone_number text not null,
  name text,
  token text not null,
  last_nudged_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invitees_session_id_idx on invitees(session_id);
create unique index if not exists invitees_token_key on invitees(token);

alter table invitees enable row level security;

create policy "anon can read invitees" on invitees
  for select using (true);

create policy "anon can create invitees" on invitees
  for insert with check (true);

create policy "anon can update invitees" on invitees
  for update using (true) with check (true);

alter table submissions
  add column if not exists invitee_id uuid references invitees(id);

create unique index if not exists submissions_invitee_id_key
  on submissions(invitee_id)
  where invitee_id is not null;

alter table submissions
  add constraint submissions_invitee_xor_join_request
  check (not (invitee_id is not null and join_request_id is not null));
