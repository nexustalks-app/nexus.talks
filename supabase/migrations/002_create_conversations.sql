-- Create conversations table
-- Container for all messages (direct or group)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('direct', 'group')) DEFAULT 'direct' NOT NULL,
  name TEXT,
  avatar_url TEXT,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE conversations 
  ADD CONSTRAINT group_must_have_name CHECK (
    (type = 'direct' AND name IS NULL) OR (type = 'group' AND name IS NOT NULL)
  );

-- Create indexes
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_created ON conversations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- NOTE: Uses is_conversation_member() to avoid RLS recursion on conversation_members.
-- See migration 009 for the function definition.
-- Users see only conversations they're members of
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    public.is_conversation_member(id, auth.uid())
  );

-- Anyone can create conversations (validated server-side)
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (true);

-- Members can update (for last_message tracking)
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    public.is_conversation_member(id, auth.uid())
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS on_conversation_updated ON conversations;
CREATE TRIGGER on_conversation_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
