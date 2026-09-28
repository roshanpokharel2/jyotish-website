-- 0011_storage_buckets.sql
-- Phase 1, Checkpoint F of docs/IMPLEMENTATION-PLAN.md
--
-- Found in dev before this migration:
--   * `chat-attachments` and `vastu-files` did not exist, although schema.sql has
--     policies for them and the browser uploads to both -- every upload failed.
--   * `jyotish-documents` had no size or file-type limit: any signed-in user could
--     store any file of any size under their own folder.
--   * chat-attachments still let the browser upload straight into a conversation,
--     including a closed one, bypassing the server-only attachment rule of 0010.
--   * Every staff role (support, finance too) could read practitioners' credential
--     documents; only reviewers need them.
--   * A Vastu upload only checked the first folder, so files could be filed under a
--     project id that is not the uploader's.
--
-- After this migration (all three buckets private, 10 MB, JPEG / PNG / PDF only):
--   chat-attachments   read: active participants of {conversation_id}/...
--                      write: server only (service role), Checkpoint I
--   vastu-files        read: owner of {auth.uid()}/...
--                      write: {auth.uid()}/{own vastu project id}/{file}
--   jyotish-documents  read: owner, or a reviewer (moderator / admin / super_admin)
--                      write: {auth.uid()}/...
--   No bucket has a browser UPDATE or DELETE policy: nothing is overwritten or moved.
--
-- Size and type limits are enforced by the Storage API on upload, not by SQL.
-- Additive and re-runnable. Run after 0010_chat_rls.sql.

begin;

-- ---------------------------------------------------------------------------
-- 1. Buckets: private, with limits. Re-running resets them to these values.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('chat-attachments',  'chat-attachments',  false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('vastu-files',       'vastu-files',       false, 10485760, array['image/jpeg','image/png','application/pdf']),
  ('jyotish-documents', 'jyotish-documents', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2. chat-attachments: no browser uploads
-- ---------------------------------------------------------------------------
-- The read policy "participants can read their chat attachments" from schema.sql is
-- correct (it compares the object's first folder with the participant's conversation)
-- and stays.

drop policy if exists "secure chat attachments bucket" on storage.objects;

-- That read policy looks up chat_participants, whose policy calls
-- is_chat_participant(). 0010 kept the function from anon, so an anonymous request
-- touching either (a download attempt, a listing) failed with "permission denied"
-- instead of returning nothing. The function only reports the caller's own
-- membership, which is always false without a user, so anon may run it.
grant execute on function public.is_chat_participant(uuid) to anon;

-- ---------------------------------------------------------------------------
-- 3. vastu-files: the second folder must be one of your own projects
-- ---------------------------------------------------------------------------

drop policy if exists "customers can upload Vastu files" on storage.objects;
create policy "customers can upload Vastu files"
on storage.objects for insert with check (
  bucket_id = 'vastu-files'
  and auth.role() = 'authenticated'
  and split_part(name, '/', 1) = auth.uid()::text
  and exists (
    select 1 from public.vastu_projects p
      join public.customers c on c.id = p.customer_id
     where p.id::text = split_part(name, '/', 2)
       and c.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 4. jyotish-documents: reviewers read credentials, not all staff
-- ---------------------------------------------------------------------------

drop policy if exists "staff can read jyotish documents" on storage.objects;
drop policy if exists "reviewers can read jyotish documents" on storage.objects;
create policy "reviewers can read jyotish documents"
on storage.objects for select using (
  bucket_id = 'jyotish-documents'
  and public.has_role('moderator', 'admin', 'super_admin')
);

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0011_storage_buckets_test.sql -- it asserts and rolls back.
--
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets;
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' order by 1;
