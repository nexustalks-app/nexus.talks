-- Create conversation_members table
-- Junction table linking users to conversations
CREATE TABLE IF NOT EXISTS conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0 CHECK (unread_count >= 0),
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Create indexes
CREATE INDEX idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX idx_conversation_members_conversation ON conversation_members(conversation_id);
CREATE INDEX idx_conversation_members_unread ON conversation_members(user_id, unread_count) 
  WHERE unread_count > 0;
CREATE INDEX idx_conversation_members_user_conversation ON conversation_members(user_id, conversation_id);

-- Enable Row Level Security
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_members
-- NOTE: We use the is_conversation_member() SECURITY DEFINER function instead
-- of a direct subquery on conversation_members to avoid infinite RLS recursion
-- (PostgreSQL error 42P17). See migration 009 for the function definition.

-- Users see their own memberships + co-members in their conversations
CREATE POLICY "conversation_members_select" ON conversation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
  );

-- Users can add themselves or be added by existing members
CREATE POLICY "conversation_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
  );

-- Users can only update their own membership
CREATE POLICY "conversation_members_update" ON conversation_members
  FOR UPDATE USING (user_id = auth.uid());

-- Users can leave conversations
CREATE POLICY "conversation_members_delete" ON conversation_members
  FOR DELETE USING (user_id = auth.uid());
