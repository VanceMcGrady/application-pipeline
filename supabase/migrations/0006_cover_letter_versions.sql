-- Phase 2/3 (deferred): cover letters, mirroring resume_versions (0003).
-- A cover_letter_version's content is { greeting, body_paragraphs, closing }
-- -- only body_paragraphs cite ledger entries and go through the grounding
-- check (CLAUDE.md principles 1/2); greeting/closing are boilerplate with no
-- factual claims about the candidate, so they carry no citations.
-- User-scoped and RLS-enabled per principle 6, same pattern as 0003.

create table cover_letter_versions (
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

alter table cover_letter_versions enable row level security;

create policy "select own cover_letter_versions" on cover_letter_versions
  for select using (user_id = auth.uid());
create policy "insert own cover_letter_versions" on cover_letter_versions
  for insert with check (user_id = auth.uid());
create policy "delete own cover_letter_versions" on cover_letter_versions
  for delete using (user_id = auth.uid());

create index cover_letter_versions_user_id_idx on cover_letter_versions(user_id);
create index cover_letter_versions_posting_id_idx on cover_letter_versions(posting_id);

grant select, insert, delete on cover_letter_versions to authenticated;
