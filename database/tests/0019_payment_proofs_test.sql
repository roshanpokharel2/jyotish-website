-- 0019_payment_proofs_test.sql
-- Self-asserting check for database/migrations/0019_payment_proofs.sql.
-- Asserts and ROLLS BACK. Success: "0019_payment_proofs: all assertions passed".
--
-- The fail-before case is §1: on 0018 the bucket does not exist, so the select
-- finds nothing; on 0019 it is private with the same limits as the other
-- customer-facing buckets.

begin;

do $$
declare
  b storage.buckets;
  n int;
begin
  -- 1. The bucket exists, private, 10 MB, JPEG / PNG / PDF only.
  select * into b from storage.buckets where id = 'payment-proofs';
  if not found or b.public or b.file_size_limit <> 10485760
     or b.allowed_mime_types <> array['image/jpeg','image/png','application/pdf'] then
    raise exception 'FAIL: payment-proofs bucket is missing or misconfigured: %',
      row_to_json(b);
  end if;

  -- 2. No storage policy touches it: the browser can neither store nor fetch
  --    proofs directly. Writes and signed URLs go through the server (service
  --    role), which bypasses RLS entirely.
  select count(*) into n from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and (qual like '%payment-proofs%' or with_check like '%payment-proofs%');
  if n <> 0 then raise exception 'FAIL: % storage policies reach payment-proofs', n; end if;

  -- 3. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0019') then
    raise exception 'FAIL: 0019 is not recorded';
  end if;

  raise notice '0019_payment_proofs: all assertions passed';
end $$;

rollback;
