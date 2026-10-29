-- Create messages table
-- Core message content
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('text', 'image', 'file', 'system')) DEFAULT 'text' NOT NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE messages 
  ADD CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 5000);

ALTER TABLE messages 
  ADD CONSTRAINT no_self_reply CHECK (reply_to_id IS NULL OR reply_to_id != id);

-- Create indexes
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
-- Users see messages in their conversations
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're in
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() 
    AND
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- Users can edit their own messages
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "messages_delete" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation's last message info
  UPDATE conversations
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- Increment unread count for all members except sender
  UPDATE conversation_members
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();
