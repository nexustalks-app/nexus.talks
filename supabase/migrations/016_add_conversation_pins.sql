-- Migration 016: Add is_pinned and pinned_at to conversation_members table
-- Enables per-user conversation pinning in Nexus.talks
--
-- Note: Pinning is per-user, so it belongs on the conversation_members junction table.
-- Existing RLS policies on conversation_members allow users to update their own membership
-- (WHERE user_id = auth.uid()), so no additional RLS policy is required.

ALTER TABLE conversation_members 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT NULL;

-- Index for rapid retrieval and sorting of pinned conversations per user
CREATE INDEX IF NOT EXISTS idx_conversation_members_pinned 
ON conversation_members(user_id, is_pinned, pinned_at DESC) 
WHERE is_pinned = TRUE;

-- Add comment explaining column usage
COMMENT ON COLUMN conversation_members.is_pinned IS 'Whether the user has pinned this conversation to the top of their inbox';
COMMENT ON COLUMN conversation_members.pinned_at IS 'Timestamp when the conversation was pinned, used for ordering multiple pinned chats';
