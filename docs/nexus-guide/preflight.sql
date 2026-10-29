-- Nexus Guide pre-flight queries (read-only)
-- Run in the Supabase SQL editor and save the output before proceeding.
-- Source: NEXUS_GUIDE_SPEC.md Appendix B

-- B1 policies on the core tables
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles','conversations','conversation_members','messages')
order by tablename, policyname;

-- B2 triggers (public + auth)
select event_object_schema, event_object_table, trigger_name, action_timing,
       event_manipulation, action_statement
from information_schema.triggers
where event_object_schema in ('public','auth')
order by 1,2,3;

-- B3 functions in public
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by 1;

-- B4 realtime publication
select * from pg_publication_tables where pubname = 'supabase_realtime';

-- B5 RLS flags and owners (expect relforcerowsecurity = false)
select c.relname, c.relrowsecurity, c.relforcerowsecurity,
       pg_get_userbyid(c.relowner) as owner
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles','conversations','conversation_members','messages');

-- B6 role attributes (expect postgres bypassrls = true)
select rolname, rolbypassrls from pg_roles
where rolname in ('postgres','authenticated','anon','service_role');

-- B7 pg_cron present? (if true, then list jobs: select jobid, schedule, command from cron.job;)
select to_regclass('cron.job') is not null as pg_cron_installed;

-- B8 name collisions and lookalikes
select id, username, display_name from public.profiles
where username ilike '%nexus%' or username ilike '%guide%'
   or display_name ilike '%nexus%' or display_name ilike '%guide%';

-- B9 new object names must be free (expect all nulls and no rows)
select to_regclass('public.system_accounts'),
       to_regclass('public.guide_conversations'),
       to_regclass('public.guide_replies');
select proname from pg_proc
where proname in ('ensure_my_guide_conversation','claim_guide_turn','finish_guide_turn');
