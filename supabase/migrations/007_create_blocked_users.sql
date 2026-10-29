-- Create blocked_users table
-- User blocking relationships
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Add constraints
ALTER TABLE blocked_users 
  ADD CONSTRAINT no_self_block CHECK (blocker_id != blocked_id);

-- Create indexes
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users
-- Users see who they blocked and who blocked them
CREATE POLICY "blocked_users_select" ON blocked_users
  FOR SELECT USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

-- Users can block others
CREATE POLICY "blocked_users_insert" ON blocked_users
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

-- Users can unblock
CREATE POLICY "blocked_users_delete" ON blocked_users
  FOR DELETE USING (blocker_id = auth.uid());
