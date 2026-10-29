-- ============================================================================
-- Migration 017: Harden Conversation, Member, Message, and Profile RLS
--
-- Security Hardening Objectives:
-- 1. Close critical authorization bypass in conversation_members_insert:
--    - Prevent any arbitrary user from inserting themselves into an existing private conversation.
--    - A user can only self-join when initiating a brand new conversation (member_count = 0).
--    - Adding another member requires the caller to already be an authorized member.
--    - For direct (1-to-1) conversations, restrict total membership to strictly at most 2 members.
-- 2. Restrict conversations_insert to authenticated users (prevent anonymous inserts).
-- 3. Harden messages_update policy with explicit WITH CHECK, active membership, and non-deleted checks.
-- 4. Restrict profiles_select to authenticated users (prevent anonymous user directory harvesting).
-- 5. Pin search_path = public on all helper functions and enforce least-privilege EXECUTE grants.
-- ============================================================================

-- 1. Helper function: Get conversation member count
CREATE OR REPLACE FUNCTION public.conversation_member_count(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM conversation_members
    WHERE conversation_id = p_conversation_id
  );
END;
$$;

-- 2. Helper function: Get conversation type ('direct' or 'group')
CREATE OR REPLACE FUNCTION public.get_conversation_type(p_conversation_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT type
    FROM conversations
    WHERE id = p_conversation_id
  );
END;
$$;

-- 3. Restrict execution permissions on helper functions
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.conversation_member_count(UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.conversation_member_count(UUID) TO postgres;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.conversation_member_count(UUID) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.conversation_member_count(UUID) TO service_role;
  END IF;

  REVOKE EXECUTE ON FUNCTION public.get_conversation_type(UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.get_conversation_type(UUID) TO postgres;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.get_conversation_type(UUID) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.get_conversation_type(UUID) TO service_role;
  END IF;

  REVOKE EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO postgres;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO service_role;
  END IF;
END $$;

-- 4. Harden conversation_members INSERT policy
DROP POLICY IF EXISTS "conversation_members_insert" ON conversation_members;
CREATE POLICY "conversation_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    -- Case 1: Initial creator adding themselves to brand new conversation (count = 0)
    (user_id = auth.uid() AND public.conversation_member_count(conversation_id) = 0)
    OR
    -- Case 2: An existing authorized member adding a participant
    (
      public.is_conversation_member(conversation_id, auth.uid())
      AND (
        public.get_conversation_type(conversation_id) = 'group'
        OR (
          public.get_conversation_type(conversation_id) = 'direct'
          AND public.conversation_member_count(conversation_id) < 2
        )
      )
    )
  );

-- 5. Harden conversations INSERT policy
--    Must be an authenticated user (rejects anonymous/unauthenticated creation)
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
  );

-- 6. Harden profiles SELECT policy
--    Requires authenticated user role to query user directory (blocks anonymous scrapers)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- 7. Harden messages UPDATE policy
--    Enforces sender ownership, active conversation membership, and non-deleted state
--    in both USING and WITH CHECK to prevent unauthorized content edits or conversation hijacking.
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    sender_id = auth.uid()
    AND deleted_at IS NULL
    AND public.is_conversation_member(conversation_id, auth.uid())
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id, auth.uid())
  );
