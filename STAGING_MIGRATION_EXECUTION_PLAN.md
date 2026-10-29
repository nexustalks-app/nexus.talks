# NEXUS.TALKS — STAGING MIGRATION EXECUTION PLAN (016 &middot; 017 &middot; 018)

**Target Project:** `nkwenqntxbqzrmdztflo` (`nkwenqntxbqzrmdztflo.supabase.co`)  
**Database Engine:** PostgreSQL 15+ (Supabase Managed Staging Database)  
**Execution Audience:** Database Administrator / Supabase Project Owner  
**Review Status:** PHASE 4.5 AUDITED AND VERIFIED FOR MANUAL STAGING EXECUTION  
**Non-Negotiable Restriction:** READ-ONLY preflight checks must be reviewed before applying DDL. Never execute migrations on unconfirmed environments. Do NOT execute automated DDL.  

---

## 1. REMOTE SCHEMA STATUS & UNCERTAINTY MATRIX

| Migration Target | Description | Verified Status | Evidence & Basis of Determination | Uncertainty / Unknowns |
| :--- | :--- | :---: | :--- | :--- |
| `001`–`015` | Core tables, profiles, messages, echoes | **CONFIRMED APPLIED** | PostgREST endpoints return HTTP 200 on all tables. | None. Tables and columns are actively populated and queried. |
| `016_add_conversation_pins.sql` | `is_pinned` & `pinned_at` on `conversation_members` | **CONFIRMED ABSENT** | Query `conversation_members?select=is_pinned` returned Postgres error `42703 (column does not exist)`. | None. Confirmed absent by database engine error code. |
| `017_harden_conversation_and_members_rls.sql` | RLS helper functions & hardened policies | **UNCONFIRMED (UNKNOWN)** | Calling `rpc/conversation_member_count` with the `anon` key returned HTTP 404. In PostgREST, a 404 occurs either if a function is absent **or** if execution is revoked from `PUBLIC`/`anon` (which Migration 017 explicitly mandates). | Cannot be verified without direct `postgres` catalog access (`information_schema.routines`). Preflight Check 2 resolves this. |
| `018_enforce_direct_conversation_uniqueness.sql` | `canonical_pair` on `conversations`, backfill & trigger | **CONFIRMED ABSENT** | Query `conversations?select=canonical_pair` returned Postgres error `42703 (column does not exist)`. | None. Confirmed absent by database engine error code. |

---

## 2. PREFLIGHT READ-ONLY QUERIES & EXPLICIT STOP CONDITIONS

> [!IMPORTANT]
> Run these **read-only** queries in the Supabase Dashboard SQL Editor prior to executing any DDL. They inspect existing structures, routines, and direct conversation data without modifying state.

```sql
-- ============================================================================
-- PREFLIGHT CHECK 1: Inspect column existence on conversation_members & conversations
-- TYPE: READ-ONLY QUERY (NO DATA MODIFICATION)
-- ============================================================================
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'conversation_members' AND column_name IN ('is_pinned', 'pinned_at'))
    OR
    (table_name = 'conversations' AND column_name = 'canonical_pair')
  );

-- ============================================================================
-- PREFLIGHT CHECK 2: Determine actual existence of Migration 017 helper functions
-- TYPE: READ-ONLY QUERY (NO DATA MODIFICATION)
-- ============================================================================
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('conversation_member_count', 'get_conversation_type', 'is_conversation_member');

-- ============================================================================
-- PREFLIGHT CHECK 3: Detect direct conversations with anomalous member counts (!= 2)
-- TYPE: READ-ONLY QUERY (NO DATA MODIFICATION)
-- ============================================================================
SELECT 
  c.id AS conversation_id,
  c.created_at,
  count(cm.user_id) AS member_count
FROM conversations c
LEFT JOIN conversation_members cm ON cm.conversation_id = c.id
WHERE c.type = 'direct'
GROUP BY c.id, c.created_at
HAVING count(cm.user_id) != 2;

-- ============================================================================
-- PREFLIGHT CHECK 4: Detect duplicate direct conversation pairs (count = 2)
-- TYPE: READ-ONLY QUERY (NO DATA MODIFICATION)
-- ============================================================================
WITH direct_threads AS (
  SELECT
    c.id AS conversation_id,
    c.created_at,
    c.last_message_at,
    CASE 
      WHEN min(cm.user_id) < max(cm.user_id) THEN min(cm.user_id)::text || ':' || max(cm.user_id)::text
      ELSE max(cm.user_id)::text || ':' || min(cm.user_id)::text
    END AS computed_pair,
    count(cm.user_id) AS member_count
  FROM conversations c
  JOIN conversation_members cm ON cm.conversation_id = c.id
  WHERE c.type = 'direct'
  GROUP BY c.id, c.created_at, c.last_message_at
  HAVING count(cm.user_id) = 2
)
SELECT 
  computed_pair,
  count(conversation_id) AS duplicate_count,
  array_agg(conversation_id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) AS conversation_ids
FROM direct_threads
GROUP BY computed_pair
HAVING count(conversation_id) > 1;
```

### Explicit Stop Conditions

1. **Stop on Preflight Check 1 (Unexpected Existing Columns):**  
   If `is_pinned` or `pinned_at` already exist, or if `canonical_pair` already exists, **STOP**. Migration 016 or 018 may have already been partially or fully applied. Review existing index definitions before proceeding.
2. **Stop on Preflight Check 2 (Confirmed Routine Presence):**  
   If `conversation_member_count` and `get_conversation_type` appear in `information_schema.routines`, **STOP**. Migration 017 has already been applied remotely. Skip Step 2 to avoid dropping/recreating active policies unnecessarily.
3. **Stop on Preflight Check 3 (Anomalous Direct Memberships):**  
   If rows are returned with `member_count = 0`, `1`, or `> 2`: Note their `conversation_id`s. Migration 018 safely skips them (`canonical_pair` remains `NULL`), but if these records represent active user conversations, the administrator must inspect them to determine whether they should be converted to `group` conversations or cleaned up.
4. **Stop on Preflight Check 4 (Duplicate Threads Requiring Review):**  
   If duplicate pairs exist (`duplicate_count > 1`), review the returned `conversation_ids`. The first ID in each array is the primary surviving thread that will receive `canonical_pair`. Secondary IDs will retain `canonical_pair = NULL`. **Keep message re-parenting DISABLED by default.** Do not proceed if users expect historical messages from both threads to be automatically merged.
5. **Stop on Target Mismatch:**  
   Confirm the target database host is `nkwenqntxbqzrmdztflo.supabase.co`. If connected to production or any other database ref, **STOP IMMEDIATELY**.
6. **Stop on Missing Snapshot:**  
   Ensure a manual backup/snapshot of the staging database has been triggered in the Supabase Dashboard (`Database -> Backups`) prior to running Step 1.

---

## 3. MIGRATION SAFETY, INTEGRITY & CONCURRENCY ANALYSIS

### Migration 016: Conversation Pinning Fields
- **Exact Changes:** Adds `is_pinned BOOLEAN DEFAULT FALSE` and `pinned_at TIMESTAMPTZ DEFAULT NULL` to `conversation_members`. Creates partial index `idx_conversation_members_pinned`.
- **Preconditions:** `conversation_members` table exists.
- **Idempotency:** Safe to rerun (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **Locking & Downtime:** In PostgreSQL 11+, adding columns with constant defaults is a metadata-only operation (sub-millisecond lock, zero table rewrite).
- **Data Loss Risk on Rollback:** **HIGH**. Dropping `is_pinned` and `pinned_at` permanently destroys all user-pinned conversation state. To resolve indexing or performance issues without destroying user state, drop only the index (`idx_conversation_members_pinned`) as a forward-fix.

### Migration 017: RLS Hardening & Helper Functions
- **Exact Changes:**
  - Creates `public.conversation_member_count(UUID)` and `public.get_conversation_type(UUID)` with `SECURITY DEFINER` and `SET search_path = public`.
  - Tightens EXECUTE grants (`REVOKE FROM PUBLIC`, `GRANT TO authenticated, service_role`).
  - Tightens EXECUTE grants on existing `is_conversation_member(UUID, UUID)` (originally defined in Migration 009).
  - Replaces `conversation_members_insert` policy to restrict additions: creator can only add self when member count = 0; existing members can add participants (capped at 2 for direct, unlimited for group).
  - Hardens `conversations_insert`, `profiles_select`, and `messages_update` (enforces sender ownership, active membership, and `deleted_at IS NULL`).
- **Workflow Preservation:** Matches the exact sequence in [app/api/conversations/route.ts](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/app/api/conversations/route.ts): creates conversation -> adds self (count=0) -> adds participant (count=1 < 2).
- **Soft-Delete Compatibility:** `messages_update` uses `deleted_at IS NULL` in `USING` (evaluating the row before update) and omits it from `WITH CHECK` (evaluating the updated row). This allows [app/api/messages/[messageId]/route.ts](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/app/api/messages/[messageId]/route.ts) to set `deleted_at` while strictly preventing edits to already-deleted messages.
- **Privilege Escalation Review:** Helper functions perform zero write operations, take only a UUID, and return scalar values. `search_path = public` prevents schema injection.

### Migration 018: Direct Conversation Uniqueness, Concurrency & Deduplication
- **Exact Changes:**
  - Adds `canonical_pair TEXT` column to `conversations`.
  - Creates immutable function `public.generate_canonical_pair(UUID, UUID)`.
  - Backfills direct conversation records using a partitioned window query (`WHERE rank_order = 1`).
  - Creates partial unique index `idx_conversations_direct_canonical_pair` on `conversations(canonical_pair) WHERE canonical_pair IS NOT NULL`.
  - Creates trigger `trg_direct_conversation_canonical_pair` on `conversation_members` (fires `AFTER INSERT OR UPDATE ON conversation_members`).
- **Trigger Consistency Notice:**
  - The trigger `trg_direct_conversation_canonical_pair` is attached to table **`conversation_members`**, **NOT** `conversations`.
  - Why: Member additions occur on `conversation_members`. When the 2nd member is inserted into `conversation_members`, the trigger detects `count(*) = 2`, computes the canonical pair, and updates `conversations.canonical_pair`.
- **Deduplication Mechanics & Safety:**
  - **Surviving Selection:** When multiple direct conversations exist between User A and User B, the partitioned window CTE orders them by `c.last_message_at DESC NULLS LAST, c.created_at DESC`. The thread with the most recent activity receives `canonical_pair = 'user_a:user_b'`.
  - **Secondary Duplicates:** Secondary direct conversations retain `canonical_pair = NULL`. They are **NOT deleted**, and their memberships and message records remain intact in PostgreSQL.
  - **Unique Index Safety:** Because NULL values are excluded from the partial index (`WHERE canonical_pair IS NOT NULL`) and only `rank_order = 1` receives a string value, **the unique index is mathematically guaranteed never to collide during migration**.
- **Concurrency & Race Conditions in Direct Conversation Creation:**
  - In [app/api/conversations/route.ts](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/app/api/conversations/route.ts), direct conversations are created in 3 steps:
    1. Insert into `conversations` with `type = 'direct'` (`canonical_pair` is NULL).
    2. Insert User A into `conversation_members` (`member_count = 1`; trigger does nothing).
    3. Insert User B into `conversation_members` (`member_count = 2`; trigger computes `canonical_pair` and updates `conversations`).
  - **Race Condition Path:** If User A and User B concurrently attempt to start a chat with each other:
    - Thread 1 creates `conv_1`, inserts User A, then inserts User B. Trigger sets `conv_1.canonical_pair = 'A:B'` -> **SUCCESS**.
    - Thread 2 creates `conv_2`, inserts User B, then attempts to insert User A. The trigger fires on `conv_2` and attempts `UPDATE conversations SET canonical_pair = 'A:B' WHERE id = conv_2`.
    - **Conflict Outcome:** PostgreSQL aborts the update with unique constraint violation `23505: duplicate key value violates unique constraint "idx_conversations_direct_canonical_pair"`.
    - In `app/api/conversations/route.ts` line 166, `otherMemberError` receives error 23505 and currently returns HTTP 500.
    - **Resolution / Next Iteration Recommendation:** When `otherMemberError` encounters code `23505`, the API route can catch the conflict, clean up the orphaned `conv_2` row (`DELETE FROM conversations WHERE id = conversationId`), and perform a fallback lookup for the existing conversation where `canonical_pair = generate_canonical_pair(user.id, participantId)` to return the canonical thread seamlessly. In the current release, a client retry immediately succeeds because Step 5 finds Thread 1.

---

## 4. STEP-BY-STEP TRANSACTIONAL EXECUTION INSTRUCTIONS

Each migration step is isolated within its own explicit `BEGIN; ... COMMIT;` transaction block. If any error occurs inside a block, PostgreSQL automatically rolls back the entire block, leaving zero partial changes.

### Step 1: Execute Migration 016 (Transactional DDL)
```sql
BEGIN;

ALTER TABLE conversation_members 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_members_pinned 
ON conversation_members(user_id, is_pinned, pinned_at DESC) 
WHERE is_pinned = TRUE;

COMMENT ON COLUMN conversation_members.is_pinned IS 'Whether the user has pinned this conversation to the top of their inbox';
COMMENT ON COLUMN conversation_members.pinned_at IS 'Timestamp when the conversation was pinned, used for ordering multiple pinned chats';

COMMIT;
```

---

### Step 2: Execute Migration 017 (Transactional Functions & RLS Policies)
```sql
BEGIN;

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
    (user_id = auth.uid() AND public.conversation_member_count(conversation_id) = 0)
    OR
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
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
  );

-- 6. Harden profiles SELECT policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- 7. Harden messages UPDATE policy
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

COMMIT;
```

---

### Step 3: Execute Migration 018 (Transactional DDL, Backfill & Trigger)
```sql
BEGIN;

-- Step 1: Add canonical_pair column to conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS canonical_pair TEXT;

-- Step 2: Create immutable pair generation function
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

-- Step 3: Backfill canonical_pair for existing direct conversations (rank_order = 1 only)
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

-- Step 6: Create trigger on conversation_members table
DROP TRIGGER IF EXISTS trg_direct_conversation_canonical_pair ON conversation_members;
CREATE TRIGGER trg_direct_conversation_canonical_pair
  AFTER INSERT OR UPDATE ON conversation_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_direct_conversation_canonical_pair();

COMMIT;
```

---

## 5. POST-MIGRATION VERIFICATION SQL

Run these read-only queries to confirm all changes succeeded:

```sql
-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES (READ-ONLY)
-- ============================================================================

-- 1. Verify Migration 016 columns & index
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversation_members' AND column_name IN ('is_pinned', 'pinned_at');

SELECT indexname FROM pg_indexes 
WHERE tablename = 'conversation_members' AND indexname = 'idx_conversation_members_pinned';

-- 2. Verify Migration 017 functions & active policies
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name IN ('conversation_member_count', 'get_conversation_type');

SELECT policyname, tablename, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('conversation_members', 'conversations', 'profiles', 'messages')
ORDER BY tablename, policyname;

-- 3. Verify Migration 018 column, unique index, and trigger
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' AND column_name = 'canonical_pair';

SELECT indexname FROM pg_indexes 
WHERE tablename = 'conversations' AND indexname = 'idx_conversations_direct_canonical_pair';

SELECT trigger_name, event_manipulation, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'conversation_members' AND trigger_name = 'trg_direct_conversation_canonical_pair';
```

---

## 6. DUPLICATE MESSAGE HISTORY CONSOLIDATION (DISABLED BY DEFAULT)

> [!CAUTION]
> **MESSAGE RE-PARENTING IS DISABLED BY DEFAULT.**
> Migration 018 intentionally preserves secondary duplicate conversation threads and their messages.
>
> Moving messages between conversations modifies core foreign key relationships and affects dependent records:
> - **Self-Replies (`messages.reply_to_id`):** If a message quotes another message within the same conversation, moving both messages preserves reply integrity. However, moving messages without verifying parent message existence risks broken reply cards.
> - **Reactions (`message_reactions.message_id`):** Reactions reference `messages(id)` directly. RLS policies on reactions check membership in `messages.conversation_id`. If messages are re-parented into a conversation where a reacting user is not a member, reactions become inaccessible.
> - **Echoes (`echoes.message_id`):** Echoes reference `messages(id)` and enforce membership checks in `m.conversation_id`.
> - **Conversation Timestamps:** Moving messages does not automatically update `conversations.last_message_at` or `conversations.last_message_id` on the canonical conversation unless explicitly re-calculated.
> - **Unread Counters:** `conversation_members.unread_count` on the canonical thread will not reflect re-parented unread messages.
> - **Realtime Events:** Direct SQL `UPDATE messages` does not broadcast Realtime websocket insert events to active clients.

### Optional Consolidation Procedure (For Admin Manual Review Only)
If and only if an administrator wishes to unify split conversation histories after verifying that both participants belong to both threads:

```sql
-- OPTIONAL DRY RUN (DO NOT EXECUTE WITHOUT EXPLICIT ADMIN APPROVAL)
-- Step 1: Inspect messages that would move
SELECT m.id, m.conversation_id AS old_conv_id, m.sender_id, m.content, m.created_at
FROM messages m
WHERE m.conversation_id IN (
  -- Secondary duplicate IDs identified in Preflight Check 4
  '<SECONDARY_DUPLICATE_CONVERSATION_ID>'
);

-- Step 2: Transactional re-parenting with timestamp synchronization
/*
BEGIN;

-- Re-parent messages
UPDATE messages
SET conversation_id = '<PRIMARY_CANONICAL_CONVERSATION_ID>'
WHERE conversation_id = '<SECONDARY_DUPLICATE_CONVERSATION_ID>';

-- Synchronize canonical conversation last activity
UPDATE conversations c
SET 
  last_message_at = (SELECT max(created_at) FROM messages WHERE conversation_id = c.id),
  last_message_id = (SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1),
  updated_at = NOW()
WHERE c.id = '<PRIMARY_CANONICAL_CONVERSATION_ID>';

COMMIT;
*/
```

---

## 7. DEPENDENCY-SAFE ROLLBACK PROCEDURES

All rollback steps must be executed in the exact dependency order specified below.

### 7.1 Rollback Migration 018 (Safe — No Data Loss)
> [!NOTE]
> Trigger `trg_direct_conversation_canonical_pair` is on **`conversation_members`** and depends on function `handle_direct_conversation_canonical_pair()`. The trigger **MUST** be dropped before the function.

```sql
BEGIN;

-- Step A: Drop trigger from conversation_members before dropping function
DROP TRIGGER IF EXISTS trg_direct_conversation_canonical_pair ON conversation_members;
DROP FUNCTION IF EXISTS public.handle_direct_conversation_canonical_pair();

-- Step B: Drop unique index and helper function
DROP INDEX IF EXISTS idx_conversations_direct_canonical_pair;
DROP FUNCTION IF EXISTS public.generate_canonical_pair(UUID, UUID);

-- Step C: Drop column (Removes uniqueness enforcement; conversations & messages are untouched)
ALTER TABLE conversations DROP COLUMN IF EXISTS canonical_pair;

COMMIT;
```

---

### 7.2 Rollback Migration 017 (Dependency-Ordered & Policy-Preserving)
> [!WARNING]
> Policy `conversation_members_insert` depends on `conversation_member_count(UUID)` and `get_conversation_type(UUID)`. Attempting to drop the functions before replacing the policy will fail with PostgreSQL error: `cannot drop function ... because other objects depend on it`.
>
> You **MUST** restore the pre-017 policies to their exact historical definitions from Migrations 001, 002, 004, and 009 **before** dropping helper functions.
>
> Do **NOT** drop `is_conversation_member(UUID, UUID)`! It was created in Migration 009 and is required by foundational conversation and message RLS policies.

```sql
BEGIN;

-- Step A: Restore exact pre-017 policies FIRST

-- 1. Restore conversation_members_insert from Migration 009
DROP POLICY IF EXISTS "conversation_members_insert" ON conversation_members;
CREATE POLICY "conversation_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid())
  );

-- 2. Restore conversations_insert from Migration 002
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (true);

-- 3. Restore profiles_select from Migration 001
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

-- 4. Restore messages_update from Migration 004
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Step B: Drop the 017 helper functions safely
DROP FUNCTION IF EXISTS public.conversation_member_count(UUID);
DROP FUNCTION IF EXISTS public.get_conversation_type(UUID);

-- Step C: Restore public execute on is_conversation_member if needed
GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID, UUID) TO PUBLIC;

COMMIT;
```

---

### 7.3 Rollback Migration 016 (Data Loss Warning vs. Forward-Fix)
> [!CAUTION]
> If users have pinned conversations in the UI, executing `ALTER TABLE conversation_members DROP COLUMN is_pinned` **permanently purges all user pinning state**.
>
> If rollback is prompted by an indexing or query planner issue, apply **Forward-Fix A** (drop index only). Only apply **Full Rollback B** if the columns themselves must be removed before production data exists.

```sql
-- Forward-Fix A: Drop index only (Preserves user pins, removes index)
DROP INDEX IF EXISTS idx_conversation_members_pinned;

-- Full Rollback B: PERMANENTLY DESTROYS PIN DATA
BEGIN;
DROP INDEX IF EXISTS idx_conversation_members_pinned;
ALTER TABLE conversation_members 
  DROP COLUMN IF EXISTS is_pinned,
  DROP COLUMN IF EXISTS pinned_at;
COMMIT;
```

---

## 8. POST-MIGRATION FUNCTIONAL ACCEPTANCE CHECKLIST

- [ ] **Pins:** Pin a conversation from the conversation header or options menu; verify it moves to the top of the chat list and persists on page reload.
- [ ] **Conversation Uniqueness:** Open a conversation with a user, return to people search, and select the same user; verify it opens the existing thread without creating a duplicate.
- [ ] **Direct Conversation Cap:** Verify adding a 3rd member to a direct conversation is rejected by RLS.
- [ ] **Message Updates:** Verify author can edit their own message, but modifying a deleted message or another user's message returns 403 Forbidden.
- [ ] **Profile Privacy:** Verify querying profiles without authentication returns 401 Unauthorized.
