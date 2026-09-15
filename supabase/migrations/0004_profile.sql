-- Phase 3: human review + rendering.
-- A rendered resume needs a name/contact header, which auth.users doesn't
-- carry. One row per user (PK = user_id, no separate id) -- the first
-- app-specific user field this project has needed, per the "no profiles
-- table until we need app-specific fields" note in CLAUDE.md.

create table profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  location text,
  updated_at timestamptz not null default now()
);

alter table profile enable row level security;

create policy "select own profile" on profile
  for select using (user_id = auth.uid());
create policy "insert own profile" on profile
  for insert with check (user_id = auth.uid());
create policy "update own profile" on profile
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on profile to authenticated;
