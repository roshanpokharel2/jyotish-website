-- database/dev/relink_users.sql -- DEVELOPMENT ONLY. Run after reset.sql + rebuild.
--
-- handle_new_user() only fires for NEW auth users, so logins that survived the reset
-- have no public.users row. This gives each one back as a plain customer. Restore
-- staff roles by hand (no JWT here, so the role guard allows it and audits it):
--
--   update public.users set role = 'super_admin' where email = '...';

insert into public.users (id, email, role)
select id, email, 'customer' from auth.users
on conflict (id) do nothing;
