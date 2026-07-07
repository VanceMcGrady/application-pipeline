-- Phase 6: automated Greenhouse ingestion.
-- ats_boards and postings are unscoped/shared (a job posting is the same
-- job posting for everyone); user_tracked_boards is the user-scoped join
-- that says which boards a given user wants pulled into their feed. Only
-- the service-role key (used by the ingestion job) writes to ats_boards and
-- postings — authenticated users get read-only access via RLS.

create table ats_boards (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  board_token text not null,
  company_name text not null,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source, board_token)
);

alter table ats_boards enable row level security;

create policy "select ats_boards" on ats_boards
  for select using (true);

grant select on ats_boards to authenticated;
-- RLS policies only decide which rows a role can see once it already has
-- table-level privilege; the service-role key still needs an explicit grant
-- even though it bypasses RLS, since bypassrls and GRANT are independent.
-- No RLS policy is added for service_role — it bypasses RLS entirely, which
-- is exactly the "genuinely unscoped operation" CLAUDE.md reserves it for.
grant select, insert, update on ats_boards to service_role;

create table postings (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  title text not null,
  raw_text text not null,
  source_url text,
  date_added timestamptz not null default now(),
  source text not null,
  external_id text not null,
  external_updated_at timestamptz not null,
  unique (source, external_id)
);

alter table postings enable row level security;

create policy "select postings" on postings
  for select using (true);

grant select on postings to authenticated;
grant select, insert, update on postings to service_role;

-- Denormalized user_id (rather than joining through ats_boards) so this
-- join table carries its own simple RLS policy, per CLAUDE.md's "every
-- table that holds anything user-specific carries a user_id" rule. Mirrors
-- achievement_skills' composite-primary-key, no-separate-id shape.
create table user_tracked_boards (
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references ats_boards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, board_id)
);

alter table user_tracked_boards enable row level security;

create policy "select own user_tracked_boards" on user_tracked_boards
  for select using (user_id = auth.uid());
create policy "insert own user_tracked_boards" on user_tracked_boards
  for insert with check (user_id = auth.uid());
create policy "delete own user_tracked_boards" on user_tracked_boards
  for delete using (user_id = auth.uid());

grant select, insert, delete on user_tracked_boards to authenticated;

create index user_tracked_boards_user_id_idx on user_tracked_boards(user_id);
