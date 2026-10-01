-- 0039_review_guard.sql
-- Step 20, Checkpoint A4 of docs/IMPLEMENTATION-PLAN.md
--
-- 0030 calls a review immutable, but "review staff can hide reviews" is a row-level
-- UPDATE policy, and RLS cannot restrict columns: a moderator could rewrite a review's
-- rating or private feedback, or move it to another practitioner, and the public
-- average would follow. Reproduced in dev before this migration. Nothing recorded who
-- hid a review either.
--
-- For callers with a JWT only `status` may change. Every status change is audited
-- (review.status_changed). Same trigger pattern as 0008 and 0037.
--
-- Additive and re-runnable. Run after 0038_admin_guards.sql.

begin;

create or replace function public.guard_review_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.id, new.booking_id, new.customer_id, new.astrologer_id, new.rating, new.private_feedback, new.created_at)
         is distinct from
         (old.id, old.booking_id, old.customer_id, old.astrologer_id, old.rating, old.private_feedback, old.created_at) then
    raise exception 'FORBIDDEN: only a review''s visibility can be changed' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    insert into public.audit_log (actor_user_id, actor_role, action, entity_type, entity_id,
                                  previous_state, new_state)
    values (auth.uid(), (select role from public.users where id = auth.uid()),
            'review.status_changed', 'review', new.id,
            jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reviews_update on public.reviews;
create trigger trg_reviews_update
before update on public.reviews
for each row execute function public.guard_review_update();

insert into public.schema_migrations (version, name) values ('0039', 'review_guard');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- node scripts/db.mjs database/tests/0039_review_guard_test.sql
