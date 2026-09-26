-- 0017_practitioner_directory.sql
-- Step 7 follow-up (before Step 8) of docs/IMPLEMENTATION-PLAN.md.
--
-- RLS grants rows, not columns. The policy "authenticated users can read active
-- astrologers" let every signed-in user read the whole row of every active
-- practitioner: verification_documents, rejection_reason, reviewed_by, user_id and the
-- rest. The browser only needs a directory (who can I book or chat with), so:
--
--   * the policy is dropped -- a practitioner still reads their own row, staff read all;
--   * active_practitioners() returns the public profile columns of active practitioners,
--     for signed-in users (visitors could not read practitioners before either). The
--     caller's own row is left out: nobody books or chats with themselves.
--
-- Nothing else depended on the policy: every other policy that looks at `astrologers`
-- matches the caller's own row (user_id = auth.uid()), which "astrologers can view own
-- profile" still returns.
--
-- Run after 0016_booking_subject.sql.

begin;

drop policy if exists "authenticated users can read active astrologers" on public.astrologers;

create or replace function public.active_practitioners()
returns table (id uuid, name text, photo_url text, biography text, qualification text,
               experience_years integer, specialization text, languages text[], consultation_fee numeric)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.name, a.photo_url, a.biography, a.qualification,
         a.experience_years, a.specialization, a.languages, a.consultation_fee
    from public.astrologers a
   where a.status = 'active' and a.user_id is distinct from auth.uid()
   order by a.name;
$$;

revoke all on function public.active_practitioners() from public, anon, authenticated;
grant execute on function public.active_practitioners() to authenticated;

insert into public.schema_migrations (version, name) values ('0017', 'practitioner_directory');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0017_practitioner_directory_test.sql (asserts and rolls back).
