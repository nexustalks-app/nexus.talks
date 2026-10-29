-- Migration 015: Create Echoes Table with Strict User Privacy and RLS
--
-- Nexus Echoes allows users to save and revisit meaningful messages and moments
-- with private personal notes.
-- 
-- PRIVACY GUARANTEE:
-- Personal notes and echo records are strictly private to the user who created them.
-- They are never visible to other conversation members or publicly exposed.

-- 1. Create echoes table
CREATE TABLE IF NOT EXISTS echoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- 2. Constraints
ALTER TABLE echoes
  DROP CONSTRAINT IF EXISTS echoes_note_length;
ALTER TABLE echoes
  ADD CONSTRAINT echoes_note_length CHECK (note IS NULL OR char_length(note) <= 2000);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_echoes_user_created ON echoes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_echoes_message ON echoes(message_id);

-- 4. Enable Row Level Security
ALTER TABLE echoes ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies

-- SELECT: A user can ONLY view their own echoes and personal notes
DROP POLICY IF EXISTS "echoes_select_owner_only" ON echoes;
CREATE POLICY "echoes_select_owner_only" ON echoes
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- INSERT: A user can only echo messages from conversations they are a verified member of
DROP POLICY IF EXISTS "echoes_insert_authorized_member" ON echoes;
CREATE POLICY "echoes_insert_authorized_member" ON echoes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = echoes.message_id
        AND cm.user_id = auth.uid()
    )
  );

-- UPDATE: A user can only edit their own echo notes
DROP POLICY IF EXISTS "echoes_update_owner_only" ON echoes;
CREATE POLICY "echoes_update_owner_only" ON echoes
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- DELETE: A user can only remove (unsave) their own echoes
DROP POLICY IF EXISTS "echoes_delete_owner_only" ON echoes;
CREATE POLICY "echoes_delete_owner_only" ON echoes
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- 6. Enable Realtime updates (if publication exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'echoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE echoes;
  END IF;
END $$;
