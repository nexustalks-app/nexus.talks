-- Nexus Guide Level 3 rollback (full removal)
-- Source: NEXUS_GUIDE_SPEC.md Appendix D
--
-- PRECONDITIONS before running this script:
--   1. GUIDE_ROLLOUT=off must already be deployed (Level 2 rollback is in effect).
--   2. The existing application code referencing Guide objects must be reverted first,
--      or the app will error after this script runs.
-- Order matters — do not reorder the steps.

begin;
-- 1. Remove all Guide conversations (cascades members, messages, mapping rows)
delete from public.conversations
where id in (select conversation_id from public.guide_conversations);
-- 2. Drop functions
drop function if exists public.finish_guide_turn(uuid, text, uuid, text);
drop function if exists public.claim_guide_turn(uuid, uuid, integer, integer, integer);
drop function if exists public.ensure_my_guide_conversation();
-- 3. Drop tables (ledger and mapping first, registry last)
drop table if exists public.guide_replies;
drop table if exists public.guide_conversations;
drop table if exists public.system_accounts;
commit;
-- 4. [OWNER] Delete the bot user in Dashboard -> Authentication -> Users.
-- 5. Remove Vercel env vars, the avatar asset, and revert the code.
