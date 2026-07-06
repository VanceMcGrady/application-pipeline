-- Phase 1: experience ledger (roles, achievements, skills, education)
-- Every table is user-scoped and RLS-enabled per CLAUDE.md principle 6:
-- the database itself enforces user_id = auth.uid(), not just app code.

create table roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  title text not null,
  start_date date not null,
  end_date date,
  location text,
  one_line_summary text,
  created_at timestamptz not null default now()
);

alter table roles enable row level security;

create policy "select own roles" on roles
  for select using (user_id = auth.uid());
create policy "insert own roles" on roles
  for insert with check (user_id = auth.uid());
create policy "update own roles" on roles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own roles" on roles
  for delete using (user_id = auth.uid());

create table skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  first_used date,
  last_used date,
  created_at timestamptz not null default now()
);

alter table skills enable row level security;

create policy "select own skills" on skills
  for select using (user_id = auth.uid());
create policy "insert own skills" on skills
  for insert with check (user_id = auth.uid());
create policy "update own skills" on skills
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own skills" on skills
  for delete using (user_id = auth.uid());

create table achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  title text not null,
  description text not null,
  metrics jsonb not null default '[]'::jsonb,
  scope_tags text[] not null default '{}',
  verification_note text,
  sensitivity text not null default 'public'
    check (sensitivity in ('public', 'interview-only', 'confidential-general-only')),
  status text not null default 'active'
    check (status in ('active', 'retired')),
  last_reviewed date,
  created_at timestamptz not null default now()
);

alter table achievements enable row level security;

create policy "select own achievements" on achievements
  for select using (user_id = auth.uid());
create policy "insert own achievements" on achievements
  for insert with check (user_id = auth.uid());
create policy "update own achievements" on achievements
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own achievements" on achievements
  for delete using (user_id = auth.uid());

-- Denormalized user_id (rather than joining through achievements/skills)
-- so this join table can carry its own simple RLS policy, per CLAUDE.md's
-- "every table that holds anything user-specific carries a user_id" rule.
create table achievement_skills (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references achievements(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  primary key (achievement_id, skill_id)
);

alter table achievement_skills enable row level security;

create policy "select own achievement_skills" on achievement_skills
  for select using (user_id = auth.uid());
create policy "insert own achievement_skills" on achievement_skills
  for insert with check (user_id = auth.uid());
create policy "delete own achievement_skills" on achievement_skills
  for delete using (user_id = auth.uid());

create table education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution text not null,
  credential text not null,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table education enable row level security;

create policy "select own education" on education
  for select using (user_id = auth.uid());
create policy "insert own education" on education
  for insert with check (user_id = auth.uid());
create policy "update own education" on education
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own education" on education
  for delete using (user_id = auth.uid());

create index roles_user_id_idx on roles(user_id);
create index achievements_user_id_idx on achievements(user_id);
create index achievements_role_id_idx on achievements(role_id);
create index skills_user_id_idx on skills(user_id);
create index achievement_skills_user_id_idx on achievement_skills(user_id);
create index education_user_id_idx on education(user_id);

-- RLS policies only decide which rows are visible once a query is already
-- allowed to touch the table at all — Postgres still requires the
-- table-level privilege grant below, or every query 403s before RLS is
-- ever evaluated.
grant select, insert, update, delete on roles to authenticated;
grant select, insert, update, delete on skills to authenticated;
grant select, insert, update, delete on achievements to authenticated;
grant select, insert, delete on achievement_skills to authenticated;
grant select, insert, update, delete on education to authenticated;
