-- 0022_ledger_delete_links_test.sql
-- Self-asserting check for database/migrations/0022_ledger_delete_links.sql.
-- Reproduces the failure 0022 fixes: deleting an account with money history
-- must succeed, and its ledger rows must survive with their links intact.
-- Creates throwaway users, asserts, and ROLLS BACK.
-- Success: "0022_ledger_delete_links: all assertions passed".

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','22222222-0000-0000-0000-00000000000a','authenticated','authenticated','ledgerdel-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','22222222-0000-0000-0000-00000000000d','authenticated','authenticated','ledgerdel-jyotish@example.test','', now(), now());

insert into public.customers (id, user_id, full_name) values
  ('22222222-cccc-0000-0000-00000000000a', '22222222-0000-0000-0000-00000000000a', 'Ledger Delete Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('22222222-aaaa-0000-0000-00000000000d', '22222222-0000-0000-0000-00000000000d', 'Ledger Delete Jyotish', 'active');

do $$
declare
  cust    constant uuid := '22222222-cccc-0000-0000-00000000000a';
  user_c  constant uuid := '22222222-0000-0000-0000-00000000000a';
  user_j  constant uuid := '22222222-0000-0000-0000-00000000000d';
  jyotish constant uuid := '22222222-aaaa-0000-0000-00000000000d';
  row     public.ledger_entries;
  n        int;
begin
  -- A paid booking's triple, linked to real rows.
  insert into public.ledger_entries (booking_id, payment_id, astrologer_id, entry_type, amount, direction)
  values
    ('22222222-bbbb-0000-0000-000000000001', '22222222-1111-0000-0000-000000000001', jyotish, 'platform_gross', 2000, 'credit'),
    ('22222222-bbbb-0000-0000-000000000001', '22222222-1111-0000-0000-000000000001', jyotish, 'platform_commission', 300, 'credit'),
    ('22222222-bbbb-0000-0000-000000000001', '22222222-1111-0000-0000-000000000001', jyotish, 'jyotish_payable', 1700, 'credit');

  -- The links are plain uuids now, not foreign keys.
  if exists (select 1 from pg_constraint where conrelid = 'public.ledger_entries'::regclass
             and contype = 'f' and conname in (
               'ledger_entries_booking_id_fkey', 'ledger_entries_payment_id_fkey',
               'ledger_entries_astrologer_id_fkey')) then
    raise exception 'FAIL: ledger_entries still has link foreign keys';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.ledger_entries'::regclass
                 and contype = 'f' and conname = 'ledger_entries_reversal_of_entry_id_fkey') then
    raise exception 'FAIL: the reversal link lost its foreign key';
  end if;

  -- Deleting both accounts succeeds...
  delete from auth.users where id = user_c;
  delete from auth.users where id = user_j;

  -- ...and the money facts survive with their links, not nulled.
  select count(*) into n from public.ledger_entries
   where astrologer_id = jyotish and booking_id = '22222222-bbbb-0000-0000-000000000001'
     and payment_id = '22222222-1111-0000-0000-000000000001';
  if n <> 3 then raise exception 'FAIL: % of 3 ledger rows survived', n; end if;

  -- The trigger still refuses real rewrites.
  begin update public.ledger_entries set amount = 1 where astrologer_id = jyotish;
    raise exception 'FAIL: a ledger row was updated';
  exception when others then
    if sqlerrm <> 'ledger_entries is append-only: update is not permitted' then
      raise exception 'FAIL: wrong refusal: %', sqlerrm;
    end if;
  end;

  if not exists (select 1 from public.schema_migrations where version = '0022') then
    raise exception 'FAIL: 0022 is not recorded';
  end if;

  raise notice '0022_ledger_delete_links: all assertions passed';
end $$;

rollback;
