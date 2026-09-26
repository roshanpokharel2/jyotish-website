-- 0031_knowledge_test.sql
-- Self-asserting check for database/migrations/0031_knowledge.sql.
-- Browser attempts run as `anon` or `authenticated` with a JWT; the status
-- functions run without a JWT, as the server's service role does. Creates
-- throwaway users, asserts, and ROLLS BACK.
-- Success: "0031_knowledge: all assertions passed".
--
-- The fail-before case is §1: on 0030 anyone writes anything anywhere; on 0031
-- customers write nothing, authors draft only, and status moves by function.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','31313131-0000-0000-0000-00000000000a','authenticated','authenticated','knowtest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','31313131-0000-0000-0000-00000000000d','authenticated','authenticated','knowtest-jyotish@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','31313131-0000-0000-0000-00000000000e','authenticated','authenticated','knowtest-moderator@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets these through.
update public.users set role = 'jyotish' where id = '31313131-0000-0000-0000-00000000000d';
update public.users set role = 'moderator' where id = '31313131-0000-0000-0000-00000000000e';

do $$
declare
  user_c constant uuid := '31313131-0000-0000-0000-00000000000a';
  user_j constant uuid := '31313131-0000-0000-0000-00000000000d';
  user_m constant uuid := '31313131-0000-0000-0000-00000000000e';
  item   public.knowledge_items;
  item2  public.knowledge_items;
  msg    text;
  blocked boolean;
  n      int;
begin
  -- 1. Customers author nothing; authorship is the caller, never the request.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.knowledge_items (author_id, content_type, title, body)
    values (user_c, 'article', 'My lore', 'Once upon a time...');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer authored knowledge'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  begin
    insert into public.knowledge_items (author_id, content_type, title, body, status, language)
    values (user_c, 'article', 'Shani Sade Sati', 'Saturn...', 'published', 'en');
    msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_KNOWLEDGE_STATUS' then raise exception 'FAIL: forced status: %', msg; end if;
  insert into public.knowledge_items (author_id, content_type, title, body, language)
  values (user_c, 'article', 'Shani Sade Sati', 'Saturn...', 'en')
  returning * into item;
  if item.author_id <> user_j or item.status <> 'draft' then
    raise exception 'FAIL: authorship/status not forced: %', row_to_json(item);
  end if;
  -- Own draft words are editable; status is not promotable directly.
  update public.knowledge_items set body = 'Saturn, revised.' where id = item.id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: author could not edit own draft'; end if;
  begin update public.knowledge_items set status = 'published' where id = item.id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'INVALID_KNOWLEDGE_STATUS' then raise exception 'FAIL: self-published: %', msg; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 2. Submit, then moderation with its audit row.
  item := public.submit_knowledge(item.id, user_j);
  if item.status <> 'pending_review' then raise exception 'FAIL: not submitted'; end if;
  begin perform public.moderate_knowledge(item.id, user_j, 'published'); msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'FORBIDDEN' then raise exception 'FAIL: author moderated: %', msg; end if;
  item := public.moderate_knowledge(item.id, user_m, 'published');
  if item.status <> 'published' then raise exception 'FAIL: not published'; end if;
  select count(*) into n from public.audit_log
   where entity_id = item.id and action = 'knowledge.published' and actor_user_id = user_m
     and previous_state = jsonb_build_object('status', 'pending_review');
  if n <> 1 then raise exception 'FAIL: moderation audit missing'; end if;
  -- Published words are frozen even for their author.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  update public.knowledge_items set body = 'Edited after publish' where id = item.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: published words were editable'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  item := public.moderate_knowledge(item.id, user_m, 'archived');
  if item.status <> 'archived' then raise exception 'FAIL: not archived'; end if;

  -- 3. Rejection returns for rework, then publishes on resubmit.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  insert into public.knowledge_items (content_type, title, body)
  values ('faq', 'What is Sade Sati?', 'Seven and a half years...') returning * into item2;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  item2 := public.submit_knowledge(item2.id, user_j);
  item2 := public.moderate_knowledge(item2.id, user_m, 'rejected');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  update public.knowledge_items set body = 'Seven and a half years, revised.' where id = item2.id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: rejected work not reworkable'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);
  item2 := public.submit_knowledge(item2.id, user_j);
  item2 := public.moderate_knowledge(item2.id, user_m, 'published');

  -- 4. Published public items read as a visitor; drafts read as nobody but
  --    author and staff.
  set local role anon;
  select count(*) into n from public.knowledge_items where status = 'published' and visibility = 'public';
  if n <> 1 then raise exception 'FAIL: visitors see % of 1 public item', n; end if;
  reset role;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.knowledge_items;
  if n <> 1 then raise exception 'FAIL: a customer sees % of 1 public item', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_j, 'role', 'authenticated')::text, true);
  select count(*) into n from public.knowledge_items;
  if n <> 2 then raise exception 'FAIL: the author sees % of their 2 rows', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 5. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0031') then
    raise exception 'FAIL: 0031 is not recorded';
  end if;

  raise notice '0031_knowledge: all assertions passed';
end $$;

rollback;
