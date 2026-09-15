-- Phase 5: minimal feed of manually pasted-in job postings.
-- Postings are user-scoped and RLS-enabled per CLAUDE.md principle 6, same
-- pattern as the ledger tables in 0001.

create table postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  title text not null,
  raw_text text not null,
  source_url text,
  date_added timestamptz not null default now()
);

alter table postings enable row level security;

create policy "select own postings" on postings
  for select using (user_id = auth.uid());
create policy "insert own postings" on postings
  for insert with check (user_id = auth.uid());
create policy "delete own postings" on postings
  for delete using (user_id = auth.uid());

create index postings_user_id_idx on postings(user_id);

grant select, insert, delete on postings to authenticated;
