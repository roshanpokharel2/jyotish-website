-- 0041_rename_chart_service.sql
--
-- "Live Online Chart" named the artifact (a chart), not the session. It reads
-- like a downloadable report and breaks the pattern of its siblings, "Live Call"
-- and "Live Question & Answer", so customers could expect a chart file rather
-- than a live consultation. The session is the astrologer reading/discussing
-- your birth chart live, so it is renamed "Live Chart Reading".
--
-- Display-name only: slugs (live-chart, live-online-chart) are referenced by
-- code and the booking flow, and are left untouched. Additive and re-runnable.

begin;

update public.services
   set name = 'Live Chart Reading'
 where slug = 'live-chart' and astrologer_id is null;

update public.consultation_types
   set name = 'Live Chart Reading'
 where slug = 'live-online-chart';

insert into public.schema_migrations (version, name) values ('0041', 'rename_chart_service');

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- select slug, name from public.services where slug = 'live-chart';
-- select slug, name from public.consultation_types where slug = 'live-online-chart';
