-- Phase 3 (deferred): human review for cover letters, mirroring
-- resume_versions_approval (0005). Approval is the only update a
-- cover_letter_version row ever receives, and only the /cover-letter-
-- versions/:id/approve route writes it -- content stays immutable, an
-- edit creates a new version (CLAUDE.md: "Treat rows as immutable once
-- approved").

create policy "approve own cover_letter_versions" on cover_letter_versions
  for update using (user_id = auth.uid() and approved_at is null)
  with check (user_id = auth.uid());

grant update (approved_at) on cover_letter_versions to authenticated;
