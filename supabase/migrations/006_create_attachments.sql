-- Create attachments table (Future feature)
-- File attachments for messages
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 52428800),
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_attachments_message ON attachments(message_id);
CREATE INDEX idx_attachments_created ON attachments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
-- Users see attachments on accessible messages
CREATE POLICY "attachments_select" ON attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = attachments.message_id
        AND cm.user_id = auth.uid()
    )
  );

-- Users can attach to their own messages
CREATE POLICY "attachments_insert" ON attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = attachments.message_id
        AND m.sender_id = auth.uid()
    )
  );

-- Users can delete their own attachments
CREATE POLICY "attachments_delete" ON attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = attachments.message_id
        AND m.sender_id = auth.uid()
    )
  );
