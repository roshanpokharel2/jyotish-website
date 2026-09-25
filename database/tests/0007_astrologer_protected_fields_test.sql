-- 0007_astrologer_protected_fields_test.sql
-- Self-asserting check for database/migrations/0007_astrologer_protected_fields.sql.
-- Every attempt runs as the `authenticated` role with a JWT, the way the browser does.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0007_astrologer_protected_fields: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','07070707-0000-0000-0000-00000000000e','authenticated','authenticated','fieldtest-applicant@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','07070707-0000-0000-0000-00000000000d','authenticated','authenticated','fieldtest-moderator@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','07070707-0000-0000-0000-00000000000f','authenticated','authenticated','fieldtest-super@example.test','', now(), now());

update public.users set role = 'moderator'   where id = '07070707-0000-0000-0000-00000000000d';
update public.users set role = 'super_admin' where id = '07070707-0000-0000-0000-00000000000f';

do $$
declare
  applicant_id constant uuid := '07070707-0000-0000-0000-00000000000e';
  moderator_id constant uuid := '07070707-0000-0000-0000-00000000000d';
  super_id     constant uuid := '07070707-0000-0000-0000-00000000000f';
  row_before record;
  row_after  record;
  blocked    boolean;
  n          int;
begin
  set local role authenticated;

  -- 1. An insert cannot pre-fill review fields; the proposed fee is kept.
  perform set_config('request.jwt.claims', json_build_object('sub', applicant_id, 'role', 'authenticated')::text, true);
  insert into public.astrologers (user_id, name, consultation_fee, status, reviewed_by, reviewed_at, rejection_reason, applied_at)
  values (applicant_id, 'Field Test', 1000, 'active', moderator_id, now(), 'forged', '2000-01-01');
  select * into row_before from public.astrologers where user_id = applicant_id;
  if row_before.status <> 'pending_review' or row_before.reviewed_by is not null
     or row_before.reviewed_at is not null or row_before.rejection_reason is not null
     or row_before.applied_at < now() - interval '1 minute' then
    raise exception 'FAIL: an application was inserted with forged review fields';
  end if;
  if row_before.consultation_fee <> 1000 then
    raise exception 'FAIL: the proposed fee was not kept on the application';
  end if;

  -- 2. Each protected column is refused on the applicant's own row.
  blocked := false;
  begin update public.astrologers set consultation_fee = 99999 where user_id = applicant_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: applicant changed their own fee'; end if;

  blocked := false;
  begin update public.astrologers set reviewed_by = moderator_id, reviewed_at = now() where user_id = applicant_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: applicant forged a reviewer stamp'; end if;

  blocked := false;
  begin update public.astrologers set rejection_reason = 'x' where user_id = applicant_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: applicant set a rejection reason'; end if;

  blocked := false;
  begin update public.astrologers set applied_at = '2000-01-01' where user_id = applicant_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: applicant back-dated their application'; end if;

  blocked := false;
  begin update public.astrologers set user_id = moderator_id where user_id = applicant_id;
  exception when insufficient_privilege or check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: applicant moved their row to another user'; end if;

  -- 3. Profile fields and, while in review, documents stay editable.
  update public.astrologers
     set biography = 'New bio', languages = array['English'],
         verification_documents = '{"id_card":"07070707-0000-0000-0000-00000000000e/id.pdf"}'
   where user_id = applicant_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: applicant could not edit their profile'; end if;

  -- 4. A moderator can approve someone else, and may set the fee on their row.
  perform set_config('request.jwt.claims', json_build_object('sub', moderator_id, 'role', 'authenticated')::text, true);
  update public.astrologers set consultation_fee = 1200, status = 'active' where user_id = applicant_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: moderator could not approve another user'; end if;

  -- 5. After approval the documents are frozen for the practitioner.
  perform set_config('request.jwt.claims', json_build_object('sub', applicant_id, 'role', 'authenticated')::text, true);
  blocked := false;
  begin update public.astrologers set verification_documents = '{}' where user_id = applicant_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: documents were swapped after approval'; end if;

  -- 6. A moderator's own application is forced into review...
  perform set_config('request.jwt.claims', json_build_object('sub', moderator_id, 'role', 'authenticated')::text, true);
  insert into public.astrologers (user_id, name, status) values (moderator_id, 'Moderator Practitioner', 'active');
  if (select status from public.astrologers where user_id = moderator_id) <> 'pending_review' then
    raise exception 'FAIL: a moderator''s own application skipped review';
  end if;

  -- 7. ...and they cannot approve it themselves.
  blocked := false;
  begin update public.astrologers set status = 'active' where user_id = moderator_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a moderator approved their own application'; end if;

  -- 8. Neither can a super_admin.
  perform set_config('request.jwt.claims', json_build_object('sub', super_id, 'role', 'authenticated')::text, true);
  insert into public.astrologers (user_id, name) values (super_id, 'Super Practitioner');
  blocked := false;
  begin update public.astrologers set status = 'active' where user_id = super_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a super_admin approved their own application'; end if;

  -- 9. A different reviewer can approve the moderator.
  update public.astrologers set status = 'active' where user_id = moderator_id;
  reset role;
  select * into row_after from public.astrologers where user_id = moderator_id;
  if row_after.status <> 'active' or row_after.reviewed_by <> super_id then
    raise exception 'FAIL: a second reviewer could not approve the moderator';
  end if;
  select * into row_after from public.astrologers where user_id = applicant_id;
  if row_after.consultation_fee <> 1200 or row_after.reviewed_by <> moderator_id then
    raise exception 'FAIL: the moderator''s approval or fee did not stick';
  end if;

  -- 10. The service role (SQL editor) is still exempt, e.g. to fix a row by hand.
  perform set_config('request.jwt.claims', null, true);
  update public.astrologers set consultation_fee = 1500, applied_at = '2020-01-01' where user_id = applicant_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: the service role could not edit protected fields'; end if;

  raise notice '0007_astrologer_protected_fields: all assertions passed';
end $$;

rollback;
