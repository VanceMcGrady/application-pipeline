-- Phase 2: tailoring + grounding.
-- A resume_version is a generated draft: a set of bullets, each citing the
-- achievement id(s) it was selected/rephrased from (CLAUDE.md principle 1),
-- plus the result of the deterministic grounding check (principle 2).
-- User-scoped and RLS-enabled per principle 6, same pattern as 0001/0002.

create table resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  posting_id uuid not null references postings(id) on delete cascade,
  content jsonb not null,
  cited_achievement_ids uuid[] not null default '{}',
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'passed', 'flagged')),
  verification_notes text[] not null default '{}',
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table resume_versions enable row level security;

create policy "select own resume_versions" on resume_versions
  for select using (user_id = auth.uid());
create policy "insert own resume_versions" on resume_versions
  for insert with check (user_id = auth.uid());
create policy "delete own resume_versions" on resume_versions
  for delete using (user_id = auth.uid());

create index resume_versions_user_id_idx on resume_versions(user_id);
create index resume_versions_posting_id_idx on resume_versions(posting_id);

grant select, insert, delete on resume_versions to authenticated;
