-- 0012_schema_migrations_test.sql
-- Self-asserting check for database/migrations/0012_schema_migrations.sql.
-- Asserts and ROLLS BACK. Success: "0012_schema_migrations: all assertions passed".

begin;

do $$
declare
  n       int;
  blocked boolean;
begin
  -- 1. 0012 recorded itself; nothing is invented for 0001-0011.
  if not exists (select 1 from public.schema_migrations where version = '0012') then
    raise exception 'FAIL: 0012 is not recorded';
  end if;
  select count(*) into n from public.schema_migrations where version < '0012';
  if n <> 0 then raise exception 'FAIL: % row(s) recorded for pre-tracking migrations', n; end if;

  -- 2. A second application fails, as a migration's own insert would.
  blocked := false;
  begin insert into public.schema_migrations (version, name) values ('0012', 'schema_migrations');
  exception when unique_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: 0012 could be recorded twice'; end if;

  -- 3. Versions are four digits.
  blocked := false;
  begin insert into public.schema_migrations (version, name) values ('12', 'x');
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'FAIL: a malformed version was accepted'; end if;

  -- 4. No API role can read or write it.
  set local role authenticated;
  blocked := false;
  begin perform 1 from public.schema_migrations;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: authenticated can read schema_migrations'; end if;
  blocked := false;
  begin insert into public.schema_migrations (version, name) values ('9999', 'forged');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: authenticated can write schema_migrations'; end if;
  reset role;
  set local role anon;
  blocked := false;
  begin perform 1 from public.schema_migrations;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'FAIL: anon can read schema_migrations'; end if;
  reset role;

  raise notice '0012_schema_migrations: all assertions passed';
end $$;

rollback;
