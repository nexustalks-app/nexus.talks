-- Fix: infinite recursion in conversation_members RLS policies
--
-- The conversation_members SELECT and INSERT policies had self-referencing
-- EXISTS subqueries (querying conversation_members from within a policy on
-- conversation_members), causing PostgreSQL error 42P17 "infinite recursion
-- detected in policy".
--
-- Fix: create a SECURITY DEFINER function that checks membership without
-- triggering RLS, then rewrite the policies to use it.

-- 1. Create helper function that checks if a user is a member of a conversation.
--    SECURITY DEFINER means it runs with the function owner's privileges,
--    bypassing RLS on conversation_members. This is safe because the function
--    only returns a boolean — it doesn't expose any data.
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
  );
END;
$$;

-- 2. Drop the recursive policies on conversation_members
DROP POLICY IF EXISTS "conversation_members_select" ON conversation_members;
DROP POLICY IF EXISTS "conversation_members_insert" ON conversation_members;

-- 3. Recreate SELECT policy using the helper function (no self-reference)
CREATE POLICY "conversation_members_select" ON conversation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
  );

-- 4. Recreate INSERT policy using the helper function (no self-reference)
CREATE POLICY "conversation_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR public.is_conversation_member(conversation_id, auth.uid())
  );

-- 5. Update conversations SELECT policy to also use the helper function
--    (it was querying conversation_members directly, which triggered the
--    recursive policy)
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (
    public.is_conversation_member(id, auth.uid())
  );

-- 6. Update conversations UPDATE policy similarly
DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (
    public.is_conversation_member(id, auth.uid())
  );
