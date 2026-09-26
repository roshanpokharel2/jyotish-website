-- 0020_ledger_test.sql
-- Self-asserting check for database/migrations/0020_ledger.sql.
-- Browser attempts run as `authenticated` with a JWT; inserts run without a JWT,
-- as the server's service role does. Creates throwaway users, asserts, and ROLLS
-- BACK. Success: "0020_ledger: all assertions passed".
--
-- The fail-before case is §2: on 0019 there is no ledger table, so nothing is
-- append-only; on 0020 an update or delete raises, for every role.

begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','20202020-0000-0000-0000-00000000000a','authenticated','authenticated','ledgertest-customer@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','20202020-0000-0000-0000-00000000000f','authenticated','authenticated','ledgertest-finance@example.test','', now(), now()),
  ('00000000-0000-0000-0000-000000000000','20202020-0000-0000-0000-00000000000d','authenticated','authenticated','ledgertest-jyotish@example.test','', now(), now());

-- No JWT is set, so auth.uid() is null and the role guard lets this through.
update public.users set role = 'finance' where id = '20202020-0000-0000-0000-00000000000f';

insert into public.customers (id, user_id, full_name) values
  ('20202020-cccc-0000-0000-00000000000a', '20202020-0000-0000-0000-00000000000a', 'Ledger Customer');

insert into public.astrologers (id, user_id, name, status) values
  ('20202020-aaaa-0000-0000-00000000000d', '20202020-0000-0000-0000-00000000000d', 'Ledger Jyotish', 'active');

do $$
declare
  user_c   constant uuid := '20202020-0000-0000-0000-00000000000a';
  user_f   constant uuid := '20202020-0000-0000-0000-00000000000f';
  jyotish  constant uuid := '20202020-aaaa-0000-0000-00000000000d';
  gross_id uuid;
  pay_id   uuid;
  msg      text;
  blocked  boolean;
  n        int;
  bal      public.jyotish_balances;
begin
  -- 1. Only the known entry types, and money is positive (reversals flip the
  --    direction, never the sign).
  blocked := false;
  begin
    insert into public.ledger_entries (astrologer_id, entry_type, amount, direction)
    values (jyotish, 'windfall', 100, 'credit');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: an unknown entry type was accepted'; end if;
  blocked := false;
  begin
    insert into public.ledger_entries (astrologer_id, entry_type, amount, direction)
    values (jyotish, 'jyotish_payable', 0, 'credit');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a zero amount was accepted'; end if;

  -- 2. Append-only: no update or delete, for any role -- including the service
  --    role, which bypasses RLS but not the trigger.
  insert into public.ledger_entries (astrologer_id, entry_type, amount, currency, direction, commission_percent)
  values (jyotish, 'platform_gross', 2000, 'NPR', 'credit', 15)
  returning id into gross_id;
  begin update public.ledger_entries set amount = 1 where id = gross_id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'ledger_entries is append-only: update is not permitted' then
    raise exception 'FAIL: a ledger row was updated: %', msg;
  end if;
  begin delete from public.ledger_entries where id = gross_id; msg := 'accepted';
  exception when others then msg := sqlerrm; end;
  if msg <> 'ledger_entries is append-only: delete is not permitted' then
    raise exception 'FAIL: a ledger row was deleted: %', msg;
  end if;

  -- 3. The browser writes nothing: no INSERT/UPDATE/DELETE policy exists.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ledger_entries'
             and cmd in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'FAIL: ledger_entries has a browser write policy';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  blocked := false;
  begin
    insert into public.ledger_entries (astrologer_id, entry_type, amount, direction)
    values (jyotish, 'platform_gross', 2000, 'credit');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: a customer wrote a ledger row'; end if;
  update public.ledger_entries set amount = 1 where id = gross_id;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a customer rewrote a ledger row'; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 4. The approval triple lands in the balances: NPR 2,000 at 15% -> payable
  --    1,700, paid 0. (9b writes these rows through approve_payment; here the
  --    shape they must have is asserted.)
  insert into public.ledger_entries (astrologer_id, entry_type, amount, currency, direction, commission_percent)
  values (jyotish, 'platform_commission', 300, 'NPR', 'credit', 15);
  insert into public.ledger_entries (astrologer_id, entry_type, amount, currency, direction, commission_percent)
  values (jyotish, 'jyotish_payable', 1700, 'NPR', 'credit', 15)
  returning id into pay_id;
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.earned <> 1700 or bal.paid <> 0 or bal.payable <> 1700 then
    raise exception 'FAIL: balances are not earned 1700 / paid 0 / payable 1700: %', row_to_json(bal);
  end if;

  -- 5. A reversal counts toward whatever it reverses: refunding the payable
  --    takes earned (and payable) back to zero without touching the original.
  insert into public.ledger_entries (astrologer_id, entry_type, amount, currency, direction, reversal_of_entry_id)
  values (jyotish, 'refund_reversal', 1700, 'NPR', 'debit', pay_id);
  select * into bal from public.jyotish_balances where astrologer_id = jyotish;
  if bal.earned <> 0 or bal.payable <> 0 then
    raise exception 'FAIL: the reversal did not zero the balance: %', row_to_json(bal);
  end if;
  if (select amount from public.ledger_entries where id = pay_id) <> 1700 then
    raise exception 'FAIL: the reversal rewrote its original';
  end if;

  -- 6. Finance reads the rows; customers read none of them. Scoped to the
  --    fixture practitioner: other throwaway runs leave orphaned rows behind
  --    (history outlives deleted accounts, by design).
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_f, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ledger_entries where astrologer_id = jyotish;
  if n <> 4 then raise exception 'FAIL: finance reads % of 4 rows', n; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', user_c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.ledger_entries where astrologer_id = jyotish;
  if n <> 0 then raise exception 'FAIL: a customer reads % ledger rows', n; end if;
  reset role;
  perform set_config('request.jwt.claims', '', true);

  -- 7. Recorded.
  if not exists (select 1 from public.schema_migrations where version = '0020') then
    raise exception 'FAIL: 0020 is not recorded';
  end if;

  raise notice '0020_ledger: all assertions passed';
end $$;

rollback;
