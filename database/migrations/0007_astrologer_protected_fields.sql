-- 0007_astrologer_protected_fields.sql
-- Phase 1, Checkpoint B of docs/IMPLEMENTATION-PLAN.md
--
-- guard_astrologer_status() (0005, redefined in 0006) protected only `status`.
-- Reproduced in dev before this migration:
--   * an applicant raised their own consultation_fee after applying (1000 -> 99999)
--   * an applicant stamped reviewed_by / reviewed_at and back-dated applied_at on
--     their own row, and inserted a forged rejection_reason
--   * a moderator approved their OWN application (reviewers were trusted on every row)
--
-- Rules after this migration, for any caller with a JWT:
--   * Reviewing is for someone else's row. On your own row you are a non-reviewer,
--     whatever your role. Only the service role (no JWT) is exempt.
--   * A non-reviewer insert lands in pending_review with every review field cleared.
--     The applicant's proposed consultation_fee is accepted on insert (the reviewer
--     sees it before approving); after that only a reviewer may change it.
--     See docs/ARCHITECTURE-DECISIONS.md AD-13: pricing moves to services in Step 7.
--   * A non-reviewer update may not touch id, user_id, consultant_id, consultation_fee,
--     applied_at, reviewed_by, reviewed_at, rejection_reason, created_at or status.
--   * verification_documents is the applicant's evidence, so they may edit it only
--     while pending_review -- not swap it after approval.
--
-- Additive and re-runnable. Run after 0006_users_hardening.sql.
-- Supersedes guard_astrologer_status() from 0005/0006; re-run 0007 after either.

begin;

create or replace function public.guard_astrologer_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_reviewer boolean := public.has_role('moderator','admin','super_admin')
                         and new.user_id is distinct from auth.uid();
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not is_reviewer then
      new.status := 'pending_review';
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.rejection_reason := null;
      new.consultant_id := null;
      new.applied_at := now();
    end if;
    new.is_active := (new.status = 'active');
    return new;
  end if;

  if auth.uid() is not null and not is_reviewer then
    if new.status is distinct from old.status then
      raise exception 'FORBIDDEN: only staff can change a practitioner''s status, and never their own'
        using errcode = '42501';
    end if;
    if (new.id, new.user_id, new.consultant_id, new.consultation_fee, new.applied_at,
        new.reviewed_by, new.reviewed_at, new.rejection_reason, new.created_at)
       is distinct from
       (old.id, old.user_id, old.consultant_id, old.consultation_fee, old.applied_at,
        old.reviewed_by, old.reviewed_at, old.rejection_reason, old.created_at) then
      raise exception 'FORBIDDEN: fee and review fields are set by staff'
        using errcode = '42501';
    end if;
    if new.verification_documents is distinct from old.verification_documents
       and old.status <> 'pending_review' then
      raise exception 'FORBIDDEN: documents can only be changed while the application is in review'
        using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status then
    new.reviewed_by := coalesce(auth.uid(), new.reviewed_by);
    new.reviewed_at := now();

    insert into public.audit_log (
      actor_user_id, actor_role, action, entity_type, entity_id,
      previous_state, new_state, reason
    )
    values (
      auth.uid(),
      (select role from public.users where id = auth.uid()),
      'jyotish.status_changed', 'astrologer', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      new.rejection_reason
    );
  end if;

  new.is_active := (new.status = 'active');
  return new;
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0007_astrologer_protected_fields_test.sql
