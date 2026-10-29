-- ============================================================================
-- Migration 018: Enforce Direct Conversation Uniqueness via Canonical Pair
-- Nexus.talks Conversation Integrity
--
-- PURPOSE:
-- Prevents duplicate 1-to-1 direct conversation threads between the same pair
-- of users (e.g. eliminating the duplicate 'Sun' and 'Oct 6' threads for 'metrd').
--
-- NON-DESTRUCTIVE:
-- This migration preserves all existing conversation records and messages.
-- If duplicate historical conversations exist, only the most recently active
-- record receives the unique canonical pair key. Secondary historical records
-- remain intact for audit/message archiving and will not collide with the index.
-- ============================================================================

-- Step 1: Add canonical_pair column to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS canonical_pair TEXT;

-- Step 2: Create a function to generate canonical pair string (order-independent)
CREATE OR REPLACE FUNCTION public.generate_canonical_pair(user_a UUID, user_b UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN user_a IS NULL OR user_b IS NULL THEN NULL
    WHEN user_a < user_b THEN user_a::text || ':' || user_b::text
    ELSE user_b::text || ':' || user_a::text
  END;
$$;

-- Step 3: Backfill canonical_pair for existing direct conversations.
-- If duplicates exist for the same pair, backfill only the one with the latest activity.
WITH direct_pairs AS (
  SELECT
    c.id AS conversation_id,
    public.generate_canonical_pair(
      min(cm.user_id),
      max(cm.user_id)
    ) AS computed_pair,
    c.last_message_at,
    c.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY public.generate_canonical_pair(min(cm.user_id), max(cm.user_id))
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    ) AS rank_order
  FROM conversations c
  JOIN conversation_members cm ON cm.conversation_id = c.id
  WHERE c.type = 'direct'
  GROUP BY c.id, c.last_message_at, c.created_at
  HAVING count(cm.user_id) = 2
)
UPDATE conversations conv
SET canonical_pair = dp.computed_pair
FROM direct_pairs dp
WHERE conv.id = dp.conversation_id
  AND dp.rank_order = 1;

-- Step 4: Create unique index on canonical_pair
-- Only applies to rows where canonical_pair IS NOT NULL (direct conversations).
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_direct_canonical_pair
  ON conversations (canonical_pair)
  WHERE canonical_pair IS NOT NULL;

-- Step 5: Trigger function to keep canonical_pair in sync upon adding members
CREATE OR REPLACE FUNCTION public.handle_direct_conversation_canonical_pair()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type TEXT;
  v_member_count INT;
  v_pair TEXT;
BEGIN
  -- Check conversation type
  SELECT type INTO v_type FROM conversations WHERE id = NEW.conversation_id;
  IF v_type = 'direct' THEN
    SELECT count(*),
           public.generate_canonical_pair(min(user_id), max(user_id))
    INTO v_member_count, v_pair
    FROM conversation_members
    WHERE conversation_id = NEW.conversation_id;

    IF v_member_count = 2 THEN
      UPDATE conversations
      SET canonical_pair = v_pair
      WHERE id = NEW.conversation_id
        AND (canonical_pair IS NULL OR canonical_pair <> v_pair);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_direct_conversation_canonical_pair ON conversation_members;
CREATE TRIGGER trg_direct_conversation_canonical_pair
  AFTER INSERT OR UPDATE ON conversation_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_direct_conversation_canonical_pair();
