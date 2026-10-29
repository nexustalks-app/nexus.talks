-- ============================================================================
-- Migration 012: Harden SECURITY DEFINER functions and pin search_path
--
-- Security hardening:
-- 1. Pin search_path = public on all SECURITY DEFINER trigger functions to
--    prevent search-path hijacking attacks.
-- 2. Fully qualify all schema references (public.profiles, public.conversations, etc.).
-- 3. Revoke unrestricted execution from PUBLIC and grant to appropriate roles.
-- ============================================================================

-- 1. Harden handle_new_user (auth.users trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Restrict execution: trigger runs with function owner privileges; PUBLIC does not need direct execution.
-- Defensive role check ensures migration succeeds on both Supabase production and vanilla PostgreSQL/CI.
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
  END IF;
END $$;

-- 2. Harden handle_new_message (messages trigger)
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update conversation's last message info
  UPDATE public.conversations
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  -- Increment unread count for all members except sender
  UPDATE public.conversation_members
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Authenticated users insert messages (which fires this trigger); service_role and postgres need execution.
-- Defensive role check ensures migration succeeds on both Supabase production and vanilla PostgreSQL/CI.
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.handle_new_message() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.handle_new_message() TO postgres;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_message() TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.handle_new_message() TO service_role;
  END IF;
END $$;

-- 3. Harden handle_updated_at helper
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
