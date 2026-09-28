-- 0011_storage_buckets_test.sql
-- Self-asserting check for database/migrations/0011_storage_buckets.sql.
-- Customers C1/C2 (each with a conversation with practitioner A1 and a Vastu project),
-- a support user and a moderator. Object rows are written straight into
-- storage.objects as the `authenticated` role with a JWT -- the same RLS check the
-- Storage API applies. Size/type limits are enforced by the Storage API, so here only
-- their configuration is asserted. Creates throwaway rows, asserts, and ROLLS BACK.
-- Success: "0011_storage_buckets: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at) values
  ('00000000-0000-0000-0000-000000000000','11111111-0000-0000-0000-0000000000c1','authenticated','authenticated','storetest-c1@example.test','',now(),now()),
  ('00000000-0000-0000-0000-000000000000','11111111-0000-0000-0000-0000000000c2','authenticated','authenticated','storetest-c2@example.test','',now(),now()),
  ('00000000-0000-0000-0000-000000000000','11111111-0000-0000-0000-0000000000a1','authenticated','authenticated','storetest-a1@example.test','',now(),now()),
  ('00000000-0000-0000-0000-000000000000','11111111-0000-0000-0000-000000000051','authenticated','authenticated','storetest-s1@example.test','',now(),now()),
  ('00000000-0000-0000-0000-000000000000','11111111-0000-0000-0000-0000000000b1','authenticated','authenticated','storetest-m1@example.test','',now(),now());
update public.users set role = 'support'   where id = '11111111-0000-0000-0000-000000000051';
update public.users set role = 'moderator' where id = '11111111-0000-0000-0000-0000000000b1';
insert into public.customers (id, user_id, full_name) values
  ('11111111-0000-0000-0000-00000000cc01','11111111-0000-0000-0000-0000000000c1','C1'),
  ('11111111-0000-0000-0000-00000000cc02','11111111-0000-0000-0000-0000000000c2','C2');
insert into public.astrologers (id, user_id, name, status) values
  ('11111111-0000-0000-0000-00000000aa01','11111111-0000-0000-0000-0000000000a1','A1','active');
insert into public.chat_conversations (id, customer_id, astrologer_id) values
  ('11111111-0000-0000-0000-0000000c0001','11111111-0000-0000-0000-00000000cc01','11111111-0000-0000-0000-00000000aa01'),
  ('11111111-0000-0000-0000-0000000c0002','11111111-0000-0000-0000-00000000cc02','11111111-0000-0000-0000-00000000aa01');
insert into public.chat_participants (conversation_id, user_id, role) values
  ('11111111-0000-0000-0000-0000000c0001','11111111-0000-0000-0000-0000000000c1','customer'),
  ('11111111-0000-0000-0000-0000000c0001','11111111-0000-0000-0000-0000000000a1','astrologer'),
  ('11111111-0000-0000-0000-0000000c0002','11111111-0000-0000-0000-0000000000c2','customer'),
  ('11111111-0000-0000-0000-0000000c0002','11111111-0000-0000-0000-0000000000a1','astrologer');
insert into public.vastu_projects (id, customer_id, property_type, service_type) values
  ('11111111-0000-0000-0000-0000000e0001','11111111-0000-0000-0000-00000000cc01','house','free_hint'),
  ('11111111-0000-0000-0000-0000000e0002','11111111-0000-0000-0000-00000000cc02','house','free_hint');
-- Objects that already exist (written by the server / an earlier upload).
insert into storage.objects (bucket_id, name) values
  ('chat-attachments',  '11111111-0000-0000-0000-0000000c0001/a1-chart.pdf'),
  ('chat-attachments',  '11111111-0000-0000-0000-0000000c0002/c2-kundali.pdf'),
  ('vastu-files',       '11111111-0000-0000-0000-0000000000c2/11111111-0000-0000-0000-0000000e0002/c2-map.png'),
  ('jyotish-documents', '11111111-0000-0000-0000-0000000000a1/certificate.pdf');

do $$
declare
  c1 constant uuid := '11111111-0000-0000-0000-0000000000c1';
  c2 constant uuid := '11111111-0000-0000-0000-0000000000c2';
  a1 constant uuid := '11111111-0000-0000-0000-0000000000a1';
  s1 constant uuid := '11111111-0000-0000-0000-000000000051';
  m1 constant uuid := '11111111-0000-0000-0000-0000000000b1';
  conv1 constant text := '11111111-0000-0000-0000-0000000c0001';
  p1 constant text := '11111111-0000-0000-0000-0000000e0001';
  p2 constant text := '11111111-0000-0000-0000-0000000e0002';
  n       int;
  blocked boolean;
  b       record;
begin
  -- 1. All three buckets exist, private, 10 MB, JPEG/PNG/PDF.
  select count(*) into n from storage.buckets
   where id in ('chat-attachments','vastu-files','jyotish-documents')
     and public = false and file_size_limit = 10485760
     and allowed_mime_types @> array['image/jpeg','image/png','application/pdf']
     and allowed_mime_types <@ array['image/jpeg','image/png','application/pdf'];
  if n <> 3 then
    for b in select id, public, file_size_limit, allowed_mime_types from storage.buckets loop
      raise notice 'bucket %', b;
    end loop;
    raise exception 'FAIL: % of 3 buckets are private with the 10 MB / JPEG-PNG-PDF limits', n;
  end if;

  -- 2. No browser UPDATE or DELETE policy on any object.
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects' and cmd in ('UPDATE','DELETE','ALL');
  if n <> 0 then raise exception 'FAIL: % UPDATE/DELETE/ALL policies on storage.objects', n; end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c1, 'role', 'authenticated')::text, true);

  -- 3. chat-attachments: read only your conversation; no browser uploads at all.
  select count(*) into n from storage.objects where bucket_id = 'chat-attachments';
  if n <> 1 then raise exception 'FAIL: C1 sees % chat attachment(s), expected 1 (own conversation)', n; end if;
  blocked := false;
  begin insert into storage.objects (bucket_id, name) values ('chat-attachments', conv1 || '/upload.pdf');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: the browser uploaded into chat-attachments'; end if;

  -- 4. vastu-files: only {own uid}/{own project}/...
  insert into storage.objects (bucket_id, name) values ('vastu-files', c1 || '/' || p1 || '/map.png');
  blocked := false;
  begin insert into storage.objects (bucket_id, name) values ('vastu-files', c1 || '/' || p2 || '/map.png');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 filed an upload under C2''s project'; end if;
  blocked := false;
  begin insert into storage.objects (bucket_id, name) values ('vastu-files', c2 || '/' || p2 || '/map.png');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 uploaded into C2''s folder'; end if;
  blocked := false;
  begin insert into storage.objects (bucket_id, name) values ('vastu-files', c1 || '/map.png');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 uploaded outside a project folder'; end if;
  select count(*) into n from storage.objects where bucket_id = 'vastu-files';
  if n <> 1 then raise exception 'FAIL: C1 sees % Vastu file(s), expected only their own', n; end if;

  -- 5. Nothing is overwritten or moved.
  update storage.objects set name = c2 || '/' || p2 || '/moved.png' where bucket_id = 'vastu-files';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 moved/renamed % object(s)', n; end if;
  update storage.objects set metadata = '{"x":1}' where bucket_id = 'chat-attachments';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: C1 changed % chat object(s)', n; end if;

  -- 6. jyotish-documents: a customer can't read or plant credentials for someone else.
  select count(*) into n from storage.objects where bucket_id = 'jyotish-documents';
  if n <> 0 then raise exception 'FAIL: a customer reads practitioner documents'; end if;
  blocked := false;
  begin insert into storage.objects (bucket_id, name) values ('jyotish-documents', a1 || '/forged.pdf');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: C1 uploaded into the practitioner''s document folder'; end if;

  -- 7. The practitioner reads and uploads their own documents.
  perform set_config('request.jwt.claims', json_build_object('sub', a1, 'role', 'authenticated')::text, true);
  insert into storage.objects (bucket_id, name) values ('jyotish-documents', a1 || '/id-card.png');
  select count(*) into n from storage.objects where bucket_id = 'jyotish-documents';
  if n <> 2 then raise exception 'FAIL: the practitioner sees % of their 2 documents', n; end if;
  select count(*) into n from storage.objects where bucket_id = 'chat-attachments';
  if n <> 2 then raise exception 'FAIL: the practitioner sees % of 2 attachments in their conversations', n; end if;

  -- 8. Support staff do not read credentials; a moderator (reviewer) does.
  perform set_config('request.jwt.claims', json_build_object('sub', s1, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'jyotish-documents';
  if n <> 0 then raise exception 'FAIL: support staff read % practitioner document(s)', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', m1, 'role', 'authenticated')::text, true);
  select count(*) into n from storage.objects where bucket_id = 'jyotish-documents';
  if n <> 2 then raise exception 'FAIL: a moderator sees % of 2 practitioner documents', n; end if;
  select count(*) into n from storage.objects where bucket_id in ('chat-attachments','vastu-files');
  if n <> 0 then raise exception 'FAIL: a moderator reads % private chat/Vastu file(s)', n; end if;

  -- 9. Anonymous visitors see and upload nothing.
  reset role;
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  select count(*) into n from storage.objects;
  if n <> 0 then raise exception 'FAIL: anon sees % object(s)', n; end if;
  select count(*) into n from public.chat_participants;  -- used to raise "permission denied"
  if n <> 0 then raise exception 'FAIL: anon sees % chat participant(s)', n; end if;
  blocked := false;
  begin insert into storage.objects (bucket_id, name) values ('vastu-files', 'anon/x.png');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: anon uploaded a file'; end if;
  reset role;

  raise notice '0011_storage_buckets: all assertions passed';
end $$;

rollback;
