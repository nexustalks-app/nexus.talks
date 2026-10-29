-- Enable Supabase Realtime for the messages table.
--
-- By default Supabase only replicates tables that have been explicitly added
-- to the supabase_realtime publication.  Without this, postgres_changes
-- subscriptions on the messages table receive no events even though the
-- client connects successfully and shows SUBSCRIBED status.
--
-- This is safe: RLS policies on messages already restrict which rows each
-- authenticated user can read.  The realtime system honours those policies
-- when the client subscribes with { event: 'postgres_changes' }.

ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Also add conversation_members so the conversation list can react to
-- unread-count changes and new conversations appearing live.
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
