-- Migration 014: Enable Supabase Realtime for message_reactions
--
-- Ensures postgres_changes replication includes message_reactions
-- so connected conversation participants receive real-time updates.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  END IF;
END $$;
