-- Migration 013: Case-Insensitive Unique Index and Format Check for Profiles Username
-- NEXUS.TALKS — Phase 5: Private Username Discovery

-- 1. Create unique case-insensitive index on lower(username) to prevent collisions
--    like 'alex' vs 'Alex'.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_lower_username 
  ON public.profiles (lower(username));

-- 2. Add format check constraint for username:
--    Restricts usernames to alphanumeric characters, underscores, hyphens, and periods (3 to 30 chars).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'username_format_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT username_format_check
      CHECK (username ~ '^[a-zA-Z0-9_.-]+$');
  END IF;
END $$;
