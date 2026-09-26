-- database/dev/reset.sql -- DEVELOPMENT ONLY. Destroys all app data.
--
-- Empties everything the repo creates so schema.sql + migrations can be verified as a
-- fresh install:
--
--   node scripts/db.mjs database/dev/reset.sql
--   node scripts/db.mjs database/schema.sql database/migrations/0001_baseline_fixes.sql ... (all, in order)
--   node scripts/db.mjs database/dev/relink_users.sql
--   node scripts/db.mjs database/tests/*.sql
--
-- Keeps: the public schema itself (its Supabase default privileges cannot be recreated
-- by `postgres`), auth.users (logins), everything Supabase owns, and
-- public.rls_auto_enable() -- it backs Supabase's `ensure_rls` event trigger, a project
-- setting rather than a repo object; dropping it cascades to the trigger.
-- Storage file bytes of deleted objects stay in the storage backend (orphaned).

begin;

do $$
declare r record;
begin
  -- ponytail: size heuristic as a last fence behind db.mjs's development guard;
  -- raise the limit if dev ever holds more test logins.
  if (select count(*) from auth.users) > 25 then
    raise exception 'REFUSED: % auth users -- this does not look like a development project',
      (select count(*) from auth.users);
  end if;

  drop trigger if exists on_auth_user_created on auth.users;

  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;

  for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v','m') loop
    execute format('drop view if exists public.%I cascade', r.relname);
  end loop;
  for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r','p') loop
    execute format('drop table if exists public.%I cascade', r.relname);
  end loop;
  for r in select p.oid::regprocedure as fn from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.proname <> 'rls_auto_enable' loop
    execute format('drop function if exists %s cascade', r.fn);
  end loop;
  for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'S' loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;
end $$;

-- Direct deletes from storage tables need this switch (storage.protect_delete).
set local storage.allow_delete_query = 'true';
delete from storage.objects where bucket_id in ('chat-attachments', 'vastu-files', 'jyotish-documents');
delete from storage.buckets where id in ('chat-attachments', 'vastu-files', 'jyotish-documents');

do $$
begin
  if exists (select 1 from pg_class where relnamespace = 'public'::regnamespace)
     or exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname <> 'rls_auto_enable') then
    raise exception 'reset incomplete: objects remain in public';
  end if;
  raise notice 'reset: public is empty; storage policies and buckets removed; % auth user(s) kept',
    (select count(*) from auth.users);
end $$;

commit;
