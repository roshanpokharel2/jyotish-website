-- 0019_payment_proofs.sql
-- Step 8, Checkpoint 8b of docs/IMPLEMENTATION-PLAN.md -- where the customer's
-- payment screenshot lives.
--
-- A private `payment-proofs` bucket, same limits as the other customer-facing
-- buckets (10 MB, JPEG / PNG / PDF only). There are deliberately NO storage
-- policies on it: the browser never touches these files directly. The upload
-- endpoint (a Next.js route, service role) writes them, and staff review reads
-- them through signed URLs from that same server layer -- so a customer can
-- never read another customer's proof, and no policy has to restate that.
--
-- Files land at {user_id}/{payment_id}/{random}.{ext}, matching what
-- submit_payment_proof() (0018) records on the payment.
--
-- Run after 0018_payment_rules.sql.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into public.schema_migrations (version, name) values ('0019', 'payment_proofs');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- Run database/tests/0019_payment_proofs_test.sql -- it asserts and rolls back.
--
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets
--    where id = 'payment-proofs';
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and (qual like '%payment-proofs%' or with_check like '%payment-proofs%');
