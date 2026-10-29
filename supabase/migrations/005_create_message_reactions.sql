-- Create message_reactions table (Future feature)
-- Emoji reactions to messages
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Add constraints
ALTER TABLE message_reactions 
  ADD CONSTRAINT emoji_length CHECK (char_length(emoji) >= 1 AND char_length(emoji) <= 10);

-- Create indexes
CREATE INDEX idx_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_reactions_user ON message_reactions(user_id);

-- Enable Row Level Security
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions
-- Users see reactions on messages they can see
CREATE POLICY "reactions_select" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

-- Users can add reactions to accessible messages
CREATE POLICY "reactions_insert" ON message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cm.user_id = auth.uid()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "reactions_delete" ON message_reactions
  FOR DELETE USING (user_id = auth.uid());
