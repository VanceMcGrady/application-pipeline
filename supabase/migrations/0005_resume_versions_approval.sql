-- Phase 3: human review. A resume_version's content is immutable (an edit
-- creates a new version, per CLAUDE.md's "Treat rows as immutable once
-- approved -- a new edit is a new version, not an update"), but approval
-- itself is an update: the row transitions from not-approved to approved
-- by setting approved_at. Nothing about content is ever mutated by it --
-- enforced by the /resume-versions/:id/approve route only ever writing
-- that one column.

create policy "approve own resume_versions" on resume_versions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant update on resume_versions to authenticated;
