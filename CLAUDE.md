# CLAUDE.md

Guidance for Claude Code (and future me) when working in this repo.

## What this project is

A tool that curates job postings, tailors a resume and cover letter to a
posting a user chooses to pursue, and keeps a full record of every
application and what came of it. The user reviews and approves everything
before it goes out — nothing in this system submits an application on its
own.

**This is a multi-user platform from day one**, even though the MVP will
likely only have me as a user initially. Every table that holds anything
user-specific carries a `user_id` from the first migration onward — do not
build a single-user version and retrofit multi-tenancy later. Retrofitting
row-level ownership onto a schema that didn't have it is a much bigger job
than including it from the start, and it's very easy to accidentally build
things (a global "the" resume, a global ledger) that quietly assume one user
and become a rewrite once a second user shows up.

This repo starts as the MVP: a single application with one database, built
to prove out the tailoring + grounding + record-keeping loop end to end, with
proper user isolation baked in. The longer-term design breaks this into
several services (ingestion, matching, feed, tailoring, records, analytics)
— see "Future architecture" below — but don't build toward that until the
MVP loop is working and there's a real reason to split something out.

## Non-negotiable principles

These override convenience or "the model suggested it" every time:

1. **Nothing gets written to a resume or cover letter unless it traces back
   to an entry in that user's experience ledger.** Generation is constrained
   selection and rephrasing of ledger entries, never free-form writing.
   Every generated bullet must cite the ledger entry ID(s) it came from, and
   a generation request must never be able to read another user's ledger.
2. **A grounding/verification pass runs on every generated draft** before
   it's shown for approval, checking that no number, technology, or claim
   appears that isn't present in the cited ledger entry. Flag, don't
   silently fix.
3. **No automated submission.** The system's job ends at producing an
   approved, rendered document. The user submits it themselves on the
   actual site.
4. **No automated scraping of individual people's profiles** (e.g.
   LinkedIn). Contact info comes from postings themselves, company-published
   team pages, manual entry, or a legitimate enrichment API's own
   integration — never a scraper against a site whose ToS prohibits it.
5. **Every application is recorded immutably**, linked to the exact resume
   version, cover letter version, and posting used, before status updates
   are attached to it later.
6. **Every query that touches user-owned data is scoped by `user_id`.** No
   endpoint, background job, or generation call reads or writes another
   user's ledger, postings notes, applications, or documents. Treat this as
   a security boundary, not a convenience filter — enforce it at the data
   access layer, not just in application logic that could be bypassed.

## Current phase: MVP

Build order (not the same as runtime order — build the middle first):

- [ ] **Phase 0 — Users & auth.** Basic user accounts and session handling,
      even if login is simple to start. Every other table added from here on
      references `user_id`. This used to be an afterthought in early
      drafts of this plan — it isn't anymore, since new users need to be
      addable without a schema rework.
- [ ] **Phase 1 — Experience ledger.** Structured entries for roles,
      achievements (with metrics + confidence level), skills, education, all
      scoped to a user. See `experience_ledger.md` for the schema this is
      based on.
- [ ] **Phase 2 — Tailoring + grounding.** Given a pasted job description and
      a user's ledger, generate a draft resume/cover letter that cites
      ledger entry IDs, then verify every claim against those entries.
- [ ] **Phase 3 — Human review + rendering.** A diff view (ledger entry vs.
      generated bullet) to approve or edit, then export the approved version
      to PDF/docx.
- [ ] **Phase 4 — Records.** Log every application per user: posting
      reference, resume version, cover letter version, submitted date.
      Status is a manual field (applied / interview / rejected / offer) for
      now.
- [ ] **Phase 5 — Minimal feed.** A plain per-user list of pasted-in
      postings, sorted by date, each with a button that kicks off tailoring.
      No ranking, no preferences, no notifications yet.

Deliberately out of scope for MVP — don't build these yet:
- Automated crawling or ingestion of job boards, including official ATS Job
  Board APIs (e.g. Greenhouse's). An earlier draft of this plan pulled
  Greenhouse ingestion forward as a "Phase 6" amendment; that direction was
  reversed — postings are pasted in manually by the user for the
  foreseeable future, and there is no ingestion job, `ats_boards` catalog,
  or board-tracking selection in the current schema. Revisit automated
  sourcing only if manual paste-in turns out to be too limiting, and treat
  it as a fresh scoping decision rather than resurrecting the old plan.
- Embedding-based ranking/matching
- Hiring manager / recruiter contact layer
- Analytics on outcomes (needs a real sample of applications first, per user
  or in aggregate)
- Any workflow orchestrator — a status column on the application row is
  sufficient at this scale
- Roles/permissions beyond "a user manages their own data" (e.g. teams,
  shared accounts, admin dashboards) — build ownership correctly first,
  add richer permission models only once there's a real need

## Tech stack

- **Frontend** — Next.js (App Router, TypeScript), Tailwind, deployed on
  Vercel. Owns the ledger UI, the Phase 3 diff/approval view, and the feed.
  Never calls Claude directly — all generation goes through the backend.
- **Backend** — Node.js (Express, TypeScript), hosted on Render. Owns all
  LLM calls, the grounding-check function, and document rendering. (Started
  as Python/FastAPI; rewritten to Node/Express for the same reason auth
  switched to password-based — not a technical-merit call, just what's
  useful to have working in this repo at the time.)
- **Database / Auth / Storage** — Supabase.
  - Postgres with **Row-Level Security** on every user-scoped table
    (`user_id = auth.uid()`, referencing `auth.users(id)` directly — no
    separate `profiles` table unless/until we need app-specific user
    fields). This is the primary mechanism satisfying principle 6 —
    cross-user access is blocked at the database itself, not just by app
    code remembering a `WHERE user_id = ...` clause.
  - **Supabase Auth**, email/password sign-in. (Phase 0 originally used
    magic-link/passwordless sign-in, but switched to password auth after
    running into magic-link delivery issues; no public sign-up page or
    forgot-password flow yet since there's a single user for now — reset
    via the Supabase dashboard in the meantime.) Frontend authenticates via
    the Supabase JS client (`@supabase/ssr` for Next.js App Router session
    handling) and forwards the resulting JWT as a Bearer token to the
    backend.
  - **Data access pattern**: the backend talks to user-scoped tables via
    the Supabase client (`@supabase/supabase-js`), forwarding the request's
    user JWT on each call so Postgres's RLS evaluates `auth.uid()` and
    enforces the boundary itself — the backend is never in a position to
    accidentally query across users. The service-role key (which bypasses
    RLS) is reserved for genuinely unscoped operations only (e.g. writing to
    the shared `postings` table), never for per-user reads/writes.
  - **Migrations**: plain SQL files in `supabase/migrations/`, applied via
    the Supabase CLI (`supabase db push`) and testable locally against
    `supabase start` before hitting the real project. Schema, RLS policies,
    and auth all live together in Supabase, so no separate ORM/migration
    tool (e.g. Prisma) is needed unless a future backend-only table
    genuinely falls outside RLS.
  - **Supabase Storage** for rendered PDF/docx files, one private path per
    user.
- **LLM** — Anthropic Claude API, called only from the backend. The
  generation call takes cited ledger entries as explicit input and returns
  text + citations (per the working conventions below). The grounding check
  (principle 2) is a separate, deterministic/programmatic function — not an
  LLM call — so it stays unit-testable against known-bad generations; an LLM
  pass can be added as a supplement later but isn't the primary check.
- **Rendering** — an HTML/CSS → PDF renderer (e.g. Playwright/Puppeteer) and
  the `docx` npm package (→ `.docx`), both server-side in the backend, from
  the same templated content. (Not yet built — Phase 3 — so pick the
  specific libraries when that phase starts; this just fixes the approach.)
- **Repo layout** — monorepo: `frontend/` (Next.js), `backend/`
  (Express/TypeScript), plus this CLAUDE.md at the root.
- **Testing** — Vitest + supertest in the backend (including the cross-user
  isolation test called for below, run against a local `supabase start`
  instance with RLS enabled); Vitest/Playwright on the frontend as needed.

## Data model (MVP)

Single database. Rough shape — adjust field types to whatever the chosen
stack expects, but keep the relationships and `user_id` scoping as-is.

**users** — handled by Supabase's built-in `auth.users` (id, email,
created_at, etc.) via email/password auth; no separate `public.users` or
`profiles` table for now. All other tables' `user_id` FKs reference
`auth.users(id)` directly.

**roles** — `id`, `user_id` (FK → users), `company`, `title`, `start_date`,
`end_date`, `location`, `one_line_summary`

**achievements** — `id`, `user_id` (FK), `role_id` (FK → roles), `title`,
`description`, `metrics` (JSON array of `{value, unit, label, confidence}`),
`skills_tags` (array), `scope_tags` (array), `verification_note`,
`sensitivity` (`public` / `interview-only` / `confidential-general-only`),
`status` (`active` / `retired`), `last_reviewed`

**skills** — `id`, `user_id` (FK), `name`, `category`, `first_used`,
`last_used`

**achievement_skills** — join table, `achievement_id`, `skill_id`

**education** — `id`, `user_id` (FK), `institution`, `credential`,
`completed`, `notes`

**postings** — `id`, `user_id` (FK), `company`, `title`, `raw_text`,
`source_url`, `date_added`. Pasted in manually by the user, so unlike the
ledger tables this is naturally per-user data, not a shared catalog — scoped
by `user_id` with RLS like everything else.

**resume_versions** / **cover_letter_versions** — `id`, `user_id` (FK),
`posting_id` (FK), `content`, `cited_achievement_ids` (array),
`verification_status` (`pending` / `passed` / `flagged`),
`verification_notes`, `approved_at`, `created_at`. Treat rows as immutable
once approved — a new edit is a new version, not an update.

**applications** — `id`, `user_id` (FK), `posting_id` (FK),
`resume_version_id` (FK), `cover_letter_version_id` (FK), `submitted_at`,
`status`, `status_history` (JSON array of `{status, timestamp, note}`)

## Future architecture (post-MVP, for reference — not to build yet)

Six logical services once this outgrows a single app:

1. **Ingestion & matching** — source connectors, normalization, entity
   resolution/enrichment, ranking (shared across users where postings
   overlap, but ranked per user against that user's ledger and preferences)
2. **Curated feed** — feed, preferences, notifications, per user
3. **Tailoring** — generation, grounding verification, document rendering,
   per user
4. **Records** — application ledger, outcome tracking, per user
5. **Analytics** — correlates outcomes against what was actually sent, able
   to run per-user or in aggregate once there are enough users to make
   aggregate patterns meaningful
6. **Experience ledger** — stays its own service even after everything else
   splits up, since it's the shared source of truth every other service
   depends on, now serving many users' ledgers rather than one

Extract a service only when something concrete forces it (scaling need,
deploy cadence, a genuinely separate failure mode) — not preemptively.

## Working conventions

- Build phase by phase, with the user participating in each phase rather
  than having it built end-to-end unattended — don't jump ahead to later
  phases or start implementation without the user engaging on that phase
  first.
- Prefer boring, explicit code over clever abstractions.
- Any function that calls an LLM to generate resume/cover letter content
  must take the cited ledger entries as an explicit input and return
  citations alongside the generated text — never generate freeform text with
  no traceable source, and never pass a broader context than the requesting
  user's own ledger.
- Write the verification/grounding check as its own testable function, not
  buried inside the generation call, so it can be unit tested against known-
  bad generations (invented metrics, invented tools) independent of the LLM.
- Migrations should be additive and reversible — the ledger and application
  records tables in particular should never lose historical rows.
- Write a data-access test early that asserts a query for user A's ledger
  cannot return user B's rows, and keep it in the suite as the schema grows.