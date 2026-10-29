-- Create reports table (Future feature)
-- Content and user reporting system
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')) DEFAULT 'pending' NOT NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Add constraints
ALTER TABLE reports 
  ADD CONSTRAINT report_target CHECK (
    reported_user_id IS NOT NULL OR reported_message_id IS NOT NULL
  );

ALTER TABLE reports 
  ADD CONSTRAINT reason_length CHECK (char_length(reason) >= 10 AND char_length(reason) <= 1000);

-- Create indexes
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_created ON reports(created_at DESC);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id) WHERE reported_user_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
-- Users see only their own reports
CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Users can create reports
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid() AND status = 'pending');

-- No UPDATE or DELETE policies - admin only via service role
