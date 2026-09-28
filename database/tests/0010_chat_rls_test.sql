-- 0010_chat_rls_test.sql
-- Self-asserting check for database/migrations/0010_chat_rls.sql.
-- Two conversations with the same practitioner (A1): C1 is only in conv1, C2 only in
-- conv2. Every attempt runs as the `authenticated` role with a JWT, the way the
-- browser does. Creates throwaway rows, asserts, and ROLLS BACK.
-- Success: "0010_chat_rls: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000','10101010-0000-0000-0000-0000000000c1','authenticated','authenticated','chattest-c1@example.test','',now(),now()),
  ('00000000-0000-0000-0000-000000000000','10101010-0000-0000-0000-0000000000c2','authenticated','authenticated','chattest-c2@example.test','',now(),now()),
  ('00000000-0000-0000-0000-000000000000','10101010-0000-0000-0000-0000000000a1','authenticated','authenticated','chattest-a1@example.test','',now(),now());
insert into public.customers (id, user_id, full_name) values
  ('10101010-0000-0000-0000-00000000cc01','10101010-0000-0000-0000-0000000000c1','C1'),
  ('10101010-0000-0000-0000-00000000cc02','10101010-0000-0000-0000-0000000000c2','C2');
insert into public.astrologers (id, user_id, name, status) values
  ('10101010-0000-0000-0000-00000000aa01','10101010-0000-0000-0000-0000000000a1','A1','active');
insert into public.chat_conversations (id, customer_id, astrologer_id) values
  ('10101010-0000-0000-0000-0000000c0001','10101010-0000-0000-0000-00000000cc01','10101010-0000-0000-0000-00000000aa01'),
  ('10101010-0000-0000-0000-0000000c0002','10101010-0000-0000-0000-00000000cc02','10101010-0000-0000-0000-00000000aa01');
insert into public.chat_participants (conversation_id, user_id, role) values
  ('10101010-0000-0000-0000-0000000c0001','10101010-0000-0000-0000-0000000000c1','customer'),
  ('10101010-0000-0000-0000-0000000c0001','10101010-0000-0000-0000-0000000000a1','astrologer'),
  ('10101010-0000-0000-0000-0000000c0002','10101010-0000-0000-0000-0000000000c2','customer'),
  ('10101010-0000-0000-0000-0000000c0002','10101010-0000-0000-0000-0000000000a1','astrologer');
insert into public.chat_messages (id, conversation_id, sender_id, body) values
  ('10101010-0000-0000-0000-00000000f001','10101010-0000-0000-0000-0000000c0001','10101010-0000-0000-0000-0000000000a1','to C1 from A1'),
  ('10101010-0000-0000-0000-00000000f002','10101010-0000-0000-0000-0000000c0002','10101010-0000-0000-0000-0000000000c2','PRIVATE: C2 birth details');
insert into public.message_attachments (message_id, file_name, storage_path) values
  ('10101010-0000-0000-0000-00000000f002','kundali.pdf','10101010-0000-0000-0000-0000000c0002/kundali.pdf');

do $$
declare
  c1    constant uuid := '10101010-0000-0000-0000-0000000000c1';
  a1    constant uuid := '10101010-0000-0000-0000-0000000000a1';
  conv1 constant uuid := '10101010-0000-0000-0000-0000000c0001';
  conv2 constant uuid := '10101010-0000-0000-0000-0000000c0002';
  a1_msg constant uuid := '10101010-0000-0000-0000-00000000f001';
  c2_msg constant uuid := '10101010-0000-0000-0000-00000000f002';
  n       int;
  blocked boolean;
  posted  record;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);

  -- 1. Reads are per conversation.
  select count(*) into n from public.chat_messages where conversation_id = conv2;
  if n <> 0 then raise exception 'FAIL: C1 read % message(s) in conv2', n; end if;
  select count(*) into n from public.chat_messages where conversation_id = conv1;
  if n <> 1 then raise exception 'FAIL: C1 cannot read their own conversation (% rows)', n; end if;
  select count(*) into n from public.chat_conversations where id = conv2;
  if n <> 0 then raise exception 'FAIL: C1 can see conv2 itself'; end if;

  -- 2. No posting into someone else's conversation.
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body) values (conv2, c1, 'intrusion');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted into conv2'; end if;

  -- 3. No impersonation.
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body) values (conv1, a1, 'forged');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted as the practitioner'; end if;

  -- 4. Nobody edits, moves or deletes messages -- their own or anyone else's.
  update public.chat_messages set body = 'edited' where id in (a1_msg, c2_msg);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 edited % message(s)', n; end if;
  update public.chat_messages set conversation_id = conv1 where id = c2_msg;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 moved a message between conversations'; end if;
  delete from public.chat_messages where id in (a1_msg, c2_msg);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 deleted % message(s)', n; end if;

  -- 5. A valid post works; the database sets timestamps and delivery state.
  insert into public.chat_messages (conversation_id, sender_id, body, created_at, status, read_at)
  values (conv1, c1, 'Namaste', '2000-01-01', 'read', '2000-01-01')
  returning * into posted;
  if posted.created_at < now() - interval '1 minute' or posted.status <> 'sent' or posted.read_at is not null then
    raise exception 'FAIL: the client chose created_at/status/read_at (% / % / %)',
      posted.created_at, posted.status, posted.read_at;
  end if;
  update public.chat_messages set body = 'edited' where id = posted.id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 edited their own message'; end if;

  -- 6. Only non-empty text up to 4000 characters, and never file/system messages.
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body, message_type) values (conv1, c1, 'x', 'system');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted a system message'; end if;
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body, message_type) values (conv1, c1, 'x', 'file');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted a file message directly'; end if;
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body) values (conv1, c1, '   ');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted an empty message'; end if;
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body) values (conv1, c1, repeat('x', 4001));
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted a 4001-character message'; end if;

  -- 7. Participants: see your co-participant, not other conversations; cannot join one.
  select count(*) into n from public.chat_participants where conversation_id = conv1;
  if n <> 2 then raise exception 'FAIL: C1 sees % participant(s) in conv1, expected 2', n; end if;
  select count(*) into n from public.chat_participants where conversation_id = conv2;
  if n <> 0 then raise exception 'FAIL: C1 sees participants of conv2'; end if;
  blocked := false;
  begin insert into public.chat_participants (conversation_id, user_id, role) values (conv2, c1, 'customer');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 joined conv2'; end if;

  -- 8. Attachments: invisible outside the conversation; no browser-created rows.
  select count(*) into n from public.message_attachments where message_id = c2_msg;
  if n <> 0 then raise exception 'FAIL: C1 sees an attachment in conv2'; end if;
  blocked := false;
  begin insert into public.message_attachments (message_id, file_name, storage_path) values (a1_msg, 'x.pdf', 'x');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 attached a file to the practitioner''s message'; end if;

  -- 9. Conversations stay unwritable from the browser.
  update public.chat_conversations set status = 'archived' where id in (conv1, conv2);
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 updated % conversation(s)', n; end if;

  -- 10. The practitioner in both conversations reads both (legitimate access).
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.chat_messages where conversation_id in (conv1, conv2);
  if n <> 3 then raise exception 'FAIL: the practitioner sees % messages, expected 3', n; end if;
  select count(*) into n from public.message_attachments where message_id = c2_msg;
  if n <> 1 then raise exception 'FAIL: the practitioner cannot see the conv2 attachment'; end if;

  -- 11. The posted message bumped conv1.
  reset role;
  if (select last_message_at from public.chat_conversations where id = conv1) is distinct from posted.created_at then
    raise exception 'FAIL: posting did not bump last_message_at';
  end if;

  -- 12. A closed conversation refuses new messages.
  update public.chat_conversations set status = 'closed', is_active = false where id = conv1;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  blocked := false;
  begin insert into public.chat_messages (conversation_id, sender_id, body) values (conv1, c1, 'late');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 posted into a closed conversation'; end if;

  -- 13. A removed participant loses read access.
  reset role;
  update public.chat_participants set is_active = false where conversation_id = conv1 and user_id = c1;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.chat_messages where conversation_id = conv1;
  if n <> 0 then raise exception 'FAIL: a removed participant still reads the conversation'; end if;
  reset role;

  -- 14. One open general conversation per customer/practitioner pair.
  update public.chat_conversations set status = 'active', is_active = true where id = conv1;
  blocked := false;
  begin
    insert into public.chat_conversations (customer_id, astrologer_id)
    values ('10101010-0000-0000-0000-00000000cc01','10101010-0000-0000-0000-00000000aa01');
  exception when unique_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a duplicate open conversation was created'; end if;

  raise notice '0010_chat_rls: all assertions passed';
end $$;

rollback;
