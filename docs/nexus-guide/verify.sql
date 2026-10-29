-- Nexus Guide verification queries
-- Run in the Supabase SQL editor after migration 011 and at each gate.
-- Source: NEXUS_GUIDE_SPEC.md Appendix C

-- V1 bot profile and registry
select s.kind, s.enabled, p.id, p.username, p.display_name, p.avatar_url, p.status
from public.system_accounts s join public.profiles p on p.id = s.user_id;

-- V2 RLS on the new tables (expect relrowsecurity = true)
select relname, relrowsecurity from pg_class
where relname in ('system_accounts','guide_conversations','guide_replies');

-- V3 function execute privileges (expect authenticated and the owner only; never anon/PUBLIC)
select routine_name, grantee from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('ensure_my_guide_conversation','claim_guide_turn','finish_guide_turn')
order by 1,2;

-- V4 duplicates and shape (expect zero rows from the first query; members = 2 and welcome = 1)
select user_id, count(*) from public.guide_conversations group by 1 having count(*) > 1;
select g.user_id,
       (select count(*) from public.conversation_members m where m.conversation_id = g.conversation_id) as members,
       (select count(*) from public.messages x where x.conversation_id = g.conversation_id) as messages
from public.guide_conversations g;

-- V5 monitoring (last 24 h)
select status, error_code, count(*) from public.guide_replies
where created_at > now() - interval '24 hours' group by 1,2 order by 3 desc;
