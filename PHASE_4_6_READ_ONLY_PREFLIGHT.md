# NEXUS.TALKS — PHASE 4.6: READ-ONLY STAGING PREFLIGHT (Revised per Phase 4.7)
## Non-Destructive Catalog Inspection, Schema State Diagnostic Toolkit & Manual Release Gate

**Target Project:** `nkwenqntxbqzrmdztflo` (`nkwenqntxbqzrmdztflo.supabase.co`)  
**Database Engine:** PostgreSQL 15+ (Supabase Managed Staging Database)  
**Execution Context:** Supabase Dashboard SQL Editor  
**Execution Clearance:** READ-ONLY QUERIES ONLY — Zero DDL, Zero DML, Zero Data Mutation  
**Revision:** Phase 4.7 corrections applied — see `PHASE_4_7_PREFLIGHT_CORRECTIONS.md` for change log  

> [!IMPORTANT]
> This document does not authorize migration execution. Running these preflight queries is a prerequisite step. A separate, explicit administrator decision is required before any DDL is applied.

---

## 1. ENVIRONMENT VERIFICATION

### 1.1 Project Identity — Manual Dashboard Confirmation Required

`current_database()` and `inet_server_addr()` return database-level metadata only. They do **not** prove that the Supabase Dashboard is connected to the correct project tenant. A server may host multiple projects under the same host address.

**Required manual steps before running any query:**
1. Open the Supabase Dashboard.
2. Check the project name displayed in the top-left corner.
3. Navigate to **Project Settings → General** and confirm the Reference ID is exactly `nkwenqntxbqzrmdztflo`.
4. Cross-reference the API URL shown under **Project Settings → API** against `https://nkwenqntxbqzrmdztflo.supabase.co`.

If any of those identifiers do not match, **STOP**.

The following SQL can be run as a secondary consistency check — it does not replace the visual Dashboard confirmation:

```sql
-- Secondary SQL identity hint (does not substitute for Dashboard project ref confirmation)
SELECT current_database(), current_user, version();
```

---

### 1.2 Backup & Recovery — Available Options Vary by Plan

> [!WARNING]
> Not every Supabase plan supports manually triggered point-in-time snapshots. The Free and Pro tiers differ in their backup retention windows and restore mechanisms. Do not assume a recent automated backup exists. Verify the actual options available to this staging project before proceeding.

**Steps to verify recovery posture:**
1. Navigate to **Database → Backups** in the Supabase Dashboard.
2. Identify which backup mode is active:
   - **Daily Automated Backups:** Visible as dated entries in the Backups list. Note the timestamp of the most recent entry.
   - **Point-in-Time Recovery (PITR):** Only available on higher Supabase tiers. If shown, confirm the recovery window covers at least the current date.
3. If no recent backup exists and no PITR window is active, you must export the database manually before proceeding (`pg_dump` or Supabase database export via the Dashboard).

**Backup Confirmation Checklist:**

| Item | How to Verify | Required Before DDL? | Confirmed? |
| :--- | :--- | :--- | :---: |
| Project Reference ID is `nkwenqntxbqzrmdztflo` | Dashboard → Project Settings → General | **YES** | [ ] |
| Recovery option is available (daily backup or PITR) | Dashboard → Database → Backups | **YES** | [ ] |
| Most recent backup timestamp is recorded | Note the timestamp from Backups list | **YES** | [ ] |
| Backup type confirmed (automated daily / PITR) | Backups page | **YES** | [ ] |

**STOP if:** No recovery option is available, or no backup exists and an export cannot be performed. Do not proceed without an established restore point.

---

## 2. EXPECTED COMPLETE SCHEMA STATE PER MIGRATION

This section defines the complete ground truth for each migration, derived from reading the actual migration SQL files. Use this as the reference when interpreting query results.

---

### Migration 016 — Expected Complete State
**Source:** [`016_add_conversation_pins.sql`](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/supabase/migrations/016_add_conversation_pins.sql)

| Object Type | Name | Table | Expected Value |
| :--- | :--- | :--- | :--- |
| Column | `is_pinned` | `conversation_members` | `boolean`, NOT NULL, default `false` |
| Column | `pinned_at` | `conversation_members` | `timestamp with time zone`, nullable, default `null` |
| Index | `idx_conversation_members_pinned` | `conversation_members` | Partial non-unique index on `(user_id, is_pinned, pinned_at DESC)` where `is_pinned = true` |
| Column comment | `is_pinned` | `conversation_members` | Present (optional to verify) |
| Column comment | `pinned_at` | `conversation_members` | Present (optional to verify) |

**Migration 016 is COMPLETE** when: both columns exist with correct types and defaults, **and** the partial index exists with the correct predicate and column order.

**Migration 016 is NOT APPLIED** when: neither column exists, and the index does not exist.

**Migration 016 is PARTIAL/INCONSISTENT** when: any subset of the above exists without the rest. STOP and do not re-run.

---

### Migration 017 — Expected Complete State
**Source:** [`017_harden_conversation_and_members_rls.sql`](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/supabase/migrations/017_harden_conversation_and_members_rls.sql)

| Object Type | Name | Expected Value |
| :--- | :--- | :--- |
| Function | `public.conversation_member_count(uuid)` | Returns `integer`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public` |
| Function | `public.get_conversation_type(uuid)` | Returns `text`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public` |
| Exec permission | `conversation_member_count` | Granted to `postgres`, `authenticated`, `service_role`; revoked from `PUBLIC` |
| Exec permission | `get_conversation_type` | Granted to `postgres`, `authenticated`, `service_role`; revoked from `PUBLIC` |
| Exec permission | `is_conversation_member` | Granted to `postgres`, `authenticated`, `service_role`; revoked from `PUBLIC` |
| RLS policy | `conversation_members_insert` | `FOR INSERT WITH CHECK` requiring either: (a) `user_id = auth.uid() AND conversation_member_count(...) = 0`, or (b) `is_conversation_member(...) AND (type='group' OR (type='direct' AND count<2))` |
| RLS policy | `conversations_insert` | `FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() IS NOT NULL)` |
| RLS policy | `profiles_select` | `FOR SELECT USING (auth.role() = 'authenticated')` |
| RLS policy | `messages_update` | `FOR UPDATE USING (sender_id = auth.uid() AND deleted_at IS NULL AND is_conversation_member(...))` **and** `WITH CHECK (sender_id = auth.uid() AND is_conversation_member(...))` |

**Note:** Migration 017 also modifies the execute grants on `is_conversation_member`, which was first created in Migration 009. The existence of `is_conversation_member` is a prerequisite for 017; the existence of `conversation_member_count` and `get_conversation_type` **together with the four hardened policies** is what indicates 017 is complete.

**Migration 017 is COMPLETE** when: both helper functions exist with correct security attributes, execute grants are restricted, **and** all four hardened policies match exactly.

**Migration 017 is NOT APPLIED** when: `conversation_member_count` and `get_conversation_type` are both absent, **and** the four policies match their pre-017 baseline definitions.

**Migration 017 is PARTIAL/INCONSISTENT** when: functions exist but policies do not match either baseline, or only one function exists, or grants are inconsistent. STOP.

**Migration 017 is UNKNOWN** when: `is_conversation_member` is absent entirely. STOP — Migration 009 may have regressed.

---

### Migration 018 — Expected Complete State
**Source:** [`018_enforce_direct_conversation_uniqueness.sql`](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/supabase/migrations/018_enforce_direct_conversation_uniqueness.sql)

| Object Type | Name | Table/Schema | Expected Value |
| :--- | :--- | :--- | :--- |
| Column | `canonical_pair` | `conversations` | `text`, nullable, no default |
| Function | `public.generate_canonical_pair(uuid, uuid)` | `public` | Returns `text`, `LANGUAGE sql`, `IMMUTABLE`, not security definer |
| DML backfill | `canonical_pair` values | `conversations` | Populated for the most-recent-activity direct conversation per pair where `count(members) = 2` |
| Unique index | `idx_conversations_direct_canonical_pair` | `conversations` | `UNIQUE`, partial: `WHERE canonical_pair IS NOT NULL` |
| Trigger function | `public.handle_direct_conversation_canonical_pair()` | `public` | Returns `trigger`, `LANGUAGE plpgsql`, `SECURITY DEFINER`, no explicit `search_path` pin |
| Trigger | `trg_direct_conversation_canonical_pair` | **`conversation_members`** | `AFTER INSERT OR UPDATE`, `FOR EACH ROW` |

**Critical:** The trigger is on `conversation_members`, not on `conversations`. This is intentional — the trigger fires when the second member is added, at which point it calculates and writes `canonical_pair` back to `conversations`.

**Note on `generate_canonical_pair`:** This function does **not** use `SECURITY DEFINER` and does not have `SET search_path`. It is an `IMMUTABLE` pure SQL function. `handle_direct_conversation_canonical_pair` does use `SECURITY DEFINER` but has **no explicit `search_path`** in migration 018. These are the correct expected values — do not treat missing `search_path` on the trigger function as a defect.

**Migration 018 is COMPLETE** when: column exists, both functions exist with correct attributes, the unique partial index exists, the trigger exists on `conversation_members`, and backfill has populated `canonical_pair` on applicable rows.

**Migration 018 is NOT APPLIED** when: column `canonical_pair` is absent, and neither function nor trigger exists.

**Migration 018 is PARTIAL/INCONSISTENT** when: any subset of the above exists. STOP.

---

## 3. READ-ONLY DIAGNOSTIC QUERIES

Each query is self-contained and independently executable. Do not batch them into a single execution block — run each separately and record its output before proceeding to the next.

---

### Query A — Migration Tracking Table Discovery (Safe Version)

> [!NOTE]
> Supabase projects using the CLI may record applied migration versions in `supabase_migrations.schema_migrations`. Many projects — including those using the Dashboard SQL Editor directly — do not use CLI-managed tracking at all. The absence of tracking records **does not indicate a migration was not applied**. Physical schema evidence from Queries B–J is the authoritative source.

```sql
-- QUERY A: Check whether a migration tracking table exists.
-- This query is safe — it queries information_schema only and never references
-- any table that may not exist.
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name = 'schema_migrations'
  AND table_schema IN ('public', 'supabase_migrations', 'auth');
```

**Interpretation:**
- `0 rows` → No migration tracking table is present. Migration state must be determined entirely from physical schema evidence (Queries B–J below).
- `1 row with table_schema = 'supabase_migrations'` → Supabase CLI tracking is active. Query A-2 below can be run to inspect logged versions. A logged version does not guarantee the migration succeeded; always confirm with physical evidence.
- `1 row with table_schema = 'public'` → A custom migration table exists. Inspect its columns before querying it.

```sql
-- QUERY A-2: Only run this if Query A confirmed supabase_migrations.schema_migrations exists.
-- Do NOT run if Query A returned 0 rows — it will error.
SELECT version, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY inserted_at DESC
LIMIT 30;
```

**Interpretation of A-2:**
- Compare returned version strings against the local filenames `016_add_conversation_pins.sql`, `017_harden_conversation_and_members_rls.sql`, `018_enforce_direct_conversation_uniqueness.sql`.
- Supabase CLI records the full filename prefix as the version (e.g., `20231001120000` or `016`). Format depends on project setup.
- A version appearing here indicates the CLI ran the file; it **does not guarantee success** or current schema correctness.
- Always validate against physical evidence regardless of tracking output.

---

### Query B — Migration 016: Column Presence on `conversation_members`

```sql
-- QUERY B: Check for columns added by Migration 016.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversation_members'
  AND column_name IN ('is_pinned', 'pinned_at')
ORDER BY column_name;
```

**Expected results:**

| column_name | data_type | is_nullable | column_default |
| :--- | :--- | :--- | :--- |
| `is_pinned` | `boolean` | `NO` | `false` |
| `pinned_at` | `timestamp with time zone` | `YES` | `null` |

- `0 rows` → Migration 016 NOT APPLIED.
- `2 rows matching expected` → Migration 016 columns are present. Confirm index with Query C.
- `1 row only` → **STOP — PARTIAL/INCONSISTENT state.**
- `2 rows with wrong types or defaults` → **STOP — INCONSISTENT state.**

---

### Query C — Migration 016: Index Presence and Definition

```sql
-- QUERY C: Verify partial index created by Migration 016.
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'conversation_members'
  AND indexname = 'idx_conversation_members_pinned';
```

**Expected result (1 row):**
```
indexdef: CREATE INDEX idx_conversation_members_pinned ON public.conversation_members
          USING btree (user_id, is_pinned, pinned_at DESC) WHERE (is_pinned = true)
```

- `0 rows` → Index not present. If columns from Query B exist → **STOP — PARTIAL/INCONSISTENT.**
- `1 row matching expected` → Index is present and correct.
- `1 row with different definition` → **STOP — INCONSISTENT (e.g., missing partial WHERE clause or wrong column order).**

**016 COMPLETE** when: Query B returns 2 matching rows **and** Query C returns the expected index definition.  
**016 NOT APPLIED** when: Query B returns 0 rows **and** Query C returns 0 rows.  
**016 PARTIAL/INCONSISTENT** → any other combination. **STOP.**

---

### Query D — Migration 017: Prerequisite Function from Migration 009

```sql
-- QUERY D: Verify is_conversation_member exists (prerequisite from Migration 009).
-- This function must exist before 017 was or can be applied.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.proconfig AS configuration_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'is_conversation_member';
```

**Expected result (1 row):**
- `function_name`: `is_conversation_member`
- `arguments`: `p_conversation_id uuid, p_user_id uuid`
- `return_type`: `boolean`
- `is_security_definer`: `true`
- `configuration_settings`: `{search_path=public}`

- `0 rows` → **STOP — CRITICAL. Migration 009 is absent or was rolled back. The application's core security is broken. Do not proceed with any migration.**
- `1 row matching expected` → Prerequisite satisfied.

---

### Query E — Migration 017: Helper Function Presence and Attributes

```sql
-- QUERY E: Check for functions created by Migration 017.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.proconfig AS configuration_settings,
  p.prolang::regtype AS language_oid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('conversation_member_count', 'get_conversation_type')
ORDER BY p.proname;
```

**Expected results (2 rows when 017 is applied):**

| function_name | arguments | return_type | is_security_definer | configuration_settings |
| :--- | :--- | :--- | :--- | :--- |
| `conversation_member_count` | `p_conversation_id uuid` | `integer` | `true` | `{search_path=public}` |
| `get_conversation_type` | `p_conversation_id uuid` | `text` | `true` | `{search_path=public}` |

- `0 rows` → Both functions absent. 017 may not be applied — confirm with Query F (policies).
- `2 rows matching expected` → Functions present. Continue to Queries F and G to verify policies and grants.
- `1 row` → **STOP — PARTIAL/INCONSISTENT.**
- `2 rows with wrong attributes (no SECURITY DEFINER, wrong search_path)` → **STOP — INCONSISTENT.**

---

### Query F — Migration 017: Execute Permission Audit

```sql
-- QUERY F: Verify execute grants on the three functions affected by Migration 017.
-- Uses pg_proc and pg_namespace to avoid joining on routines view which may include
-- only SQL-standard functions and can miss PL/pgSQL entries in some configurations.
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  (aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner)))).grantee::regrole::text AS grantee,
  (aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner)))).privilege_type AS privilege
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('conversation_member_count', 'get_conversation_type', 'is_conversation_member')
ORDER BY p.proname, grantee;
```

**Expected results after 017 is applied:**
- `PUBLIC` (represented as empty string `""` or `=`) must **NOT** appear.
- `anon` must **NOT** appear.
- Valid grantees are: `postgres`, `authenticated`, `service_role` (and possibly `supabase_admin`).

**Before 017 (pre-017 baseline for `is_conversation_member`):** `PUBLIC` may appear as grantee.

- `PUBLIC` or `anon` appears for `conversation_member_count` or `get_conversation_type` → **STOP — these functions should not exist yet if 017 is not applied. If they exist with PUBLIC access, 017 was partially applied. PARTIAL/INCONSISTENT.**
- `PUBLIC` appears for `is_conversation_member` → 017 not applied (grants not yet restricted).
- `PUBLIC` absent for all three → grants are consistent with 017 applied. Cross-reference with Query G.

---

### Query G — Migration 017: RLS Policy Definitions

```sql
-- QUERY G: Inspect exact RLS policy expressions for the four policies modified by 017.
SELECT
  tablename,
  policyname,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'conversation_members' AND policyname = 'conversation_members_insert')
    OR (tablename = 'conversations'        AND policyname = 'conversations_insert')
    OR (tablename = 'profiles'             AND policyname = 'profiles_select')
    OR (tablename = 'messages'             AND policyname = 'messages_update')
  )
ORDER BY tablename, policyname;
```

**Expected results and classification:**

**`conversation_members_insert` — Pre-017 baseline:**
```
with_check: ((user_id = auth.uid()) OR is_conversation_member(conversation_id, auth.uid()))
```
**`conversation_members_insert` — Post-017 hardened:**
```
with_check: (((user_id = auth.uid()) AND (conversation_member_count(conversation_id) = 0))
  OR (is_conversation_member(conversation_id, auth.uid())
      AND ((get_conversation_type(conversation_id) = 'group'::text)
           OR ((get_conversation_type(conversation_id) = 'direct'::text)
               AND (conversation_member_count(conversation_id) < 2)))))
```

**`conversations_insert` — Pre-017:** `using_expression: null`, `with_check: true`  
**`conversations_insert` — Post-017:** `with_check: ((auth.role() = 'authenticated'::text) AND (auth.uid() IS NOT NULL))`

**`profiles_select` — Pre-017:** `using_expression: true`  
**`profiles_select` — Post-017:** `using_expression: (auth.role() = 'authenticated'::text)`

**`messages_update` — Pre-017:** `using_expression: (sender_id = auth.uid())`, `with_check: null`  
**`messages_update` — Post-017:** `using_expression: ((sender_id = auth.uid()) AND (deleted_at IS NULL) AND is_conversation_member(conversation_id, auth.uid()))`, `with_check: ((sender_id = auth.uid()) AND is_conversation_member(conversation_id, auth.uid()))`

**Classification decision:**
- All 4 match Post-017 → **017 COMPLETE.**
- All 4 match Pre-017 → **017 NOT APPLIED.** (Also confirm functions absent via Query E.)
- Any mismatch with either baseline → **STOP — UNKNOWN/CUSTOM policy state.**
- Fewer than 4 policies returned → **STOP — a policy is missing entirely.**

> [!NOTE]
> PostgreSQL normalizes stored policy expressions: type casts like `::text`, boolean `true` as literal, and function call parentheses may differ slightly from source SQL. Match on semantic equivalence, not character-for-character identity.

---

### Query H — Migration 018: Column, Function, and Trigger Presence

```sql
-- QUERY H: Check for all objects created by Migration 018.
-- Run as a single block; results returned across 3 sections.

-- Section H-1: column
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND column_name = 'canonical_pair';

-- Section H-2: functions
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer,
  p.provolatile AS volatility  -- 'i' = IMMUTABLE, 's' = STABLE, 'v' = VOLATILE
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('generate_canonical_pair', 'handle_direct_conversation_canonical_pair')
ORDER BY p.proname;

-- Section H-3: trigger
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_orientation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_direct_conversation_canonical_pair'
ORDER BY event_manipulation;
```

**Expected results when 018 is COMPLETE:**

*H-1:* 1 row: `canonical_pair`, `text`, `YES`

*H-2:* 2 rows:
| function_name | arguments | return_type | is_security_definer | volatility |
| :--- | :--- | :--- | :--- | :--- |
| `generate_canonical_pair` | `user_a uuid, user_b uuid` | `text` | `false` | `i` (IMMUTABLE) |
| `handle_direct_conversation_canonical_pair` | (none) | `trigger` | `true` | `v` (VOLATILE) |

*H-3:* 2 rows (one for INSERT, one for UPDATE), both with:
- `event_object_table` = **`conversation_members`** (NOT `conversations`)
- `action_timing` = `AFTER`
- `action_orientation` = `ROW`

**Classification:**
- H-1 returns 0 rows AND H-2 returns 0 rows AND H-3 returns 0 rows → **018 NOT APPLIED.**
- H-1 returns 1 row AND H-2 returns 2 rows AND H-3 returns 2 rows → **018 COMPLETE.**
- H-3 returns rows where `event_object_table = 'conversations'` → **STOP — trigger bound to wrong table.**
- Any other partial combination → **STOP — PARTIAL/INCONSISTENT.**

---

### Query I — Migration 018: Unique Index Presence and Definition

```sql
-- QUERY I: Verify the unique partial index created by Migration 018.
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND indexname = 'idx_conversations_direct_canonical_pair';
```

**Expected result (1 row):**
```
indexdef: CREATE UNIQUE INDEX idx_conversations_direct_canonical_pair
          ON public.conversations USING btree (canonical_pair) WHERE (canonical_pair IS NOT NULL)
```

- `0 rows` → Index absent. If column exists from Query H-1 → **STOP — PARTIAL/INCONSISTENT.**
- `1 row matching expected (UNIQUE, correct WHERE clause)` → Index present and correct.
- `1 row but NOT unique, or missing WHERE predicate` → **STOP — INCONSISTENT. A non-unique index on canonical_pair will not enforce deduplication.**

---

### Query J — Data Integrity: Anomalous Direct Conversations

> [!NOTE]
> These two queries inspect application data, not schema structure. They inform a required review decision before executing Migration 018. They do not modify data.

```sql
-- QUERY J-1: Direct conversations where member count is not exactly 2.
-- Migration 018 backfill skips these rows (HAVING count = 2 filter).
-- They will retain canonical_pair = NULL regardless of migration state.
SELECT
  c.id AS conversation_id,
  c.created_at,
  c.last_message_at,
  COUNT(cm.user_id) AS member_count
FROM conversations c
LEFT JOIN conversation_members cm ON cm.conversation_id = c.id
WHERE c.type = 'direct'
GROUP BY c.id, c.created_at, c.last_message_at
HAVING COUNT(cm.user_id) <> 2
ORDER BY member_count, c.created_at;
```

```sql
-- QUERY J-2: Direct conversation pairs where more than one conversation exists
-- between the same two users (each with exactly 2 members).
-- Migration 018 assigns canonical_pair only to rank_order = 1 (most recent activity).
WITH pairs AS (
  SELECT
    c.id AS conversation_id,
    c.created_at,
    c.last_message_at,
    MIN(cm.user_id)::text || ':' || MAX(cm.user_id)::text AS computed_pair
  FROM conversations c
  JOIN conversation_members cm ON cm.conversation_id = c.id
  WHERE c.type = 'direct'
  GROUP BY c.id, c.created_at, c.last_message_at
  HAVING COUNT(cm.user_id) = 2
)
SELECT
  computed_pair,
  COUNT(*) AS total_conversations,
  array_agg(conversation_id ORDER BY last_message_at DESC NULLS LAST, created_at DESC) AS conversation_ids_newest_first
FROM pairs
GROUP BY computed_pair
HAVING COUNT(*) > 1
ORDER BY total_conversations DESC;
```

**Interpretation and required decisions:**

*J-1 — Anomalous member counts:*
- `0 rows` → No anomalous direct conversations. No action required.
- Rows returned with `member_count = 0` → Fully empty ghost conversations. Safe to note; 018 ignores them.
- Rows returned with `member_count = 1` → Orphaned one-sided conversations (e.g., from the 23505 race condition described in Phase 4.5). 018 ignores them during backfill; they remain with `canonical_pair = NULL`.
- Rows returned with `member_count > 2` → Corrupted `direct` conversations with more than 2 members. **Each must receive an explicit administrator decision: convert to `group`, archive, or leave as-is before running 018.**

*J-2 — Duplicate pairs:*
- `0 rows` → No duplicates. 018 backfill is a no-op for deduplication.
- Rows returned → The first `conversation_id` in each `conversation_ids_newest_first` array will be assigned the canonical pair key. All others retain `canonical_pair = NULL` and remain in the database as dormant threads.
  - **Required decision:** Document which IDs will survive as primary. Confirm that split message history is acceptable. History consolidation is **disabled by default** and must not be performed automatically.

---

## 4. SQL EDITOR CHECKS VS. AUTHENTICATED APPLICATION TESTING

### What the SQL Editor Can Verify

The Supabase Dashboard SQL Editor executes as the `postgres` superuser role. This role **bypasses Row Level Security** entirely.

| Capability | Verifiable in SQL Editor |
| :--- | :--- |
| Column existence, type, default, nullability | Yes |
| Index presence, definition, uniqueness, partial predicate | Yes |
| Function presence, return type, language, security definer flag, search_path config | Yes |
| Execute grant recipients per function | Yes (Query F) |
| RLS policy expression text (USING / WITH CHECK) | Yes (Query G) |
| Trigger existence, target table, event type, timing | Yes (Query H-3) |
| Data counts, anomalous membership states, duplicate pairs | Yes |

### What Requires Authenticated Application/API Testing

| Capability | Why SQL Editor Cannot Verify It |
| :--- | :--- |
| Whether an unauthenticated HTTP request is actually blocked by `profiles_select` | SQL Editor bypasses RLS; only a real `anon`-key HTTP request tests enforcement |
| Whether an authenticated user can self-join an existing conversation | Requires HTTP POST with valid JWT simulating a second user |
| Whether the direct conversation cap (≤ 2 members) is enforced at runtime | Requires authenticated API calls, not catalog inspection |
| Race condition handling (23505 conflict code) in API route | Requires concurrent HTTP requests |
| UI pin state persistence across page reload | Requires browser session test |
| Realtime broadcast delivery for message edits and reactions | Requires live WebSocket client |

> [!IMPORTANT]
> RLS policy text in `pg_policies` confirms what the rule says. It does not prove the rule is enforced for real requests. Post-migration testing must include at least one authenticated API round-trip per modified policy.

---

## 5. EXPLICIT STOP CONDITIONS

Stop execution immediately and do not proceed to DDL if **any** of the following are true:

| # | Condition | Trigger Query | Rationale |
| :--- | :--- | :--- | :--- |
| S-1 | Supabase Dashboard project ref does not match `nkwenqntxbqzrmdztflo` | Manual check | Wrong environment; DDL will affect unintended project |
| S-2 | No recovery option confirmed available | Backup checklist | No restore point; data loss is permanent if migration fails |
| S-3 | `is_conversation_member` function is absent (Query D returns 0 rows) | Query D | Migration 009 missing; application security is broken |
| S-4 | Migration 016 is PARTIAL — only one of `is_pinned`/`pinned_at` exists, or columns exist without the index | Queries B + C | Interrupted prior execution; re-running may duplicate or conflict |
| S-5 | Migration 017 is PARTIAL — functions exist but policies do not match either pre-017 or post-017 baseline | Queries E + G | Undefined custom state; DDL may silently overwrite intended config |
| S-6 | Migration 017 is PARTIAL — only one of `conversation_member_count`/`get_conversation_type` exists | Query E | Interrupted prior execution |
| S-7 | Migration 018 is PARTIAL — `canonical_pair` column exists but trigger or index does not | Queries H + I | Constraint enforcement is incomplete; data may already be inconsistent |
| S-8 | Trigger `trg_direct_conversation_canonical_pair` exists on `conversations` instead of `conversation_members` | Query H-3 | Trigger on wrong table; canonical pair will never be set on member insertion |
| S-9 | Query G returns a policy expression that matches neither the pre-017 nor post-017 known baseline | Query G | Custom policy has been applied manually; migration would overwrite it |
| S-10 | J-2 returns duplicate pairs AND `canonical_pair` already exists on `conversations` | Queries I + J-2 | Possible that a partial 018 was already applied; re-running unique index creation will fail with 23505 |
| S-11 | Query J-1 returns direct conversations with `member_count > 2` | Query J-1 | Must receive explicit administrator decision before 018 backfill |

---

## 6. MANUAL PREFLIGHT CHECKLIST — SUPABASE SQL EDITOR

Copy and execute each check separately. Record the actual output beside each item. Only mark PASS when output matches the expected value exactly.

```
================================================================================
NEXUS.TALKS — PHASE 4.6 STAGING PREFLIGHT RUNBOOK
Target project ref: nkwenqntxbqzrmdztflo
Executor: ___________________________  Date: ___________  Time: ___________
================================================================================

ENVIRONMENT & BACKUP
────────────────────
[ ] ENV-1: Manual dashboard check
    Action: Dashboard → Project Settings → General → Reference ID
    Expected: nkwenqntxbqzrmdztflo
    Result: ___________________________
    Decision: PASS / STOP

[ ] ENV-2: Recovery posture confirmed
    Action: Dashboard → Database → Backups → note most recent entry
    Expected: At least one backup/PITR entry exists and is recent
    Backup type (daily / PITR): ___________________________
    Most recent timestamp: ___________________________
    Decision: PASS / STOP (no recovery option available)

[ ] ENV-3: SQL identity hint
    Query: SELECT current_database(), current_user, version();
    Result: ___________________________
    Note: This is a secondary hint only. ENV-1 is the authoritative check.

────────────────────────────────────────────────────────────────────────────────
PREREQUISITES
─────────────
[ ] PRE-1: is_conversation_member function exists (Migration 009)
    Query: Query D
    Expected: 1 row, is_security_definer = true, search_path = public
    Actual row count: ___  Attributes match: Y/N
    Decision: PASS / STOP (function absent — do not proceed)

────────────────────────────────────────────────────────────────────────────────
MIGRATION 016 — CONVERSATION PINS
───────────────────────────────────
[ ] 016-A: Column presence
    Query: Query B
    Expected: 2 rows (is_pinned boolean default false, pinned_at timestamptz nullable)
    Actual row count: ___
    Columns and types correct: Y/N
    Decision:
      0 rows → NOT APPLIED (ready for Step 1)
      2 rows correct → COMPLETE (skip Step 1)
      1 row or wrong types → STOP (partial/inconsistent)

[ ] 016-B: Index presence and definition
    Query: Query C
    Expected: 1 row with UNIQUE=false, partial WHERE (is_pinned = true), 3 columns
    Actual: ___________________________
    Decision:
      0 rows AND 016-A was COMPLETE → STOP (partial)
      0 rows AND 016-A was NOT APPLIED → NOT APPLIED (consistent)
      1 row correct → COMPLETE
      1 row incorrect → STOP (inconsistent)

    016 STATUS: [ ] NOT APPLIED  [ ] COMPLETE  [ ] STOP — PARTIAL/INCONSISTENT

────────────────────────────────────────────────────────────────────────────────
MIGRATION 017 — RLS HARDENING
──────────────────────────────
[ ] 017-A: Helper functions present and correct
    Query: Query E
    Expected: 2 rows with correct types, SECURITY DEFINER = true, search_path = public
    Actual row count: ___  Attributes match: Y/N
    Decision:
      0 rows → possibly NOT APPLIED (confirm with 017-B)
      2 rows correct → functions applied (confirm policies with 017-B)
      1 row or wrong attrs → STOP

[ ] 017-B: RLS policies match known baseline
    Query: Query G (all 4 policies)
    Expected: 4 rows returned
    Actual row count: ___
    All 4 match Post-017 hardened: Y/N
    All 4 match Pre-017 baseline: Y/N
    Decision:
      4 rows all Post-017 → COMPLETE
      4 rows all Pre-017 AND 017-A was 0 rows → NOT APPLIED
      Any mismatch / unknown expression → STOP
      Fewer than 4 rows returned → STOP (missing policy)

[ ] 017-C: Execute grants restricted
    Query: Query F
    Expected: No PUBLIC or anon grantee for conversation_member_count or get_conversation_type
    PUBLIC present: Y/N  anon present: Y/N
    Decision:
      No PUBLIC/anon → consistent with 017 applied
      PUBLIC present for is_conversation_member only → consistent with pre-017
      PUBLIC present for new functions → STOP (functions exist but grants not restricted)

    017 STATUS: [ ] NOT APPLIED  [ ] COMPLETE  [ ] STOP — PARTIAL/INCONSISTENT/UNKNOWN

────────────────────────────────────────────────────────────────────────────────
MIGRATION 018 — DIRECT CONVERSATION UNIQUENESS
───────────────────────────────────────────────
[ ] 018-A: Objects present (column, functions, trigger)
    Query: Query H (all three sections)
    H-1 column row count: ___  Type = text, nullable: Y/N
    H-2 function row count: ___  generate_canonical_pair IMMUTABLE: Y/N
                                 handle_direct... SECURITY DEFINER: Y/N
    H-3 trigger row count: ___  event_object_table = conversation_members: Y/N
                                action_timing = AFTER: Y/N

[ ] 018-B: Unique partial index correct
    Query: Query I
    Expected: 1 row, UNIQUE, WHERE canonical_pair IS NOT NULL
    Actual: ___________________________
    Decision:
      0 rows AND 018-A objects absent → NOT APPLIED
      1 row correct → index present
      1 row not unique or missing WHERE → STOP
      0 rows AND 018-A H-1 returns column → STOP (partial)

    018 STATUS: [ ] NOT APPLIED  [ ] COMPLETE  [ ] STOP — PARTIAL/INCONSISTENT

────────────────────────────────────────────────────────────────────────────────
DATA INTEGRITY REVIEW
──────────────────────
[ ] DATA-1: Anomalous direct conversation memberships
    Query: Query J-1
    Rows returned: ___
    member_count = 0 count: ___  member_count = 1 count: ___  member_count > 2 count: ___
    Decision:
      0 rows → PASS
      count = 0 or 1 only → REVIEW (document IDs; migration 018 skips them safely)
      count > 2 found → STOP (explicit administrator decision required per conversation)

[ ] DATA-2: Duplicate direct conversation pairs
    Query: Query J-2
    Rows returned: ___
    Decision:
      0 rows → PASS (no duplicates; 018 backfill is straightforward)
      Rows returned → REVIEW
        Document each pair and its ordered_conversation_ids.
        Confirm administrator accepts split message history as-is.
        History consolidation is DISABLED — do not re-parent messages automatically.
        Decision recorded: ___________________________

================================================================================
PREFLIGHT SUMMARY
─────────────────
ENV checks:  PASS / STOP
PRE checks:  PASS / STOP
016 status:  NOT APPLIED / COMPLETE / STOP
017 status:  NOT APPLIED / COMPLETE / STOP
018 status:  NOT APPLIED / COMPLETE / STOP
DATA checks: PASS / REVIEW / STOP

OVERALL DECISION:
  [ ] ALL PASS or COMPLETE + no STOP conditions
      → Proceed to STAGING_MIGRATION_EXECUTION_PLAN.md for applicable steps only.
  [ ] ANY STOP condition triggered
      → DO NOT EXECUTE DDL. Resolve the flagged condition first.
  [ ] Any migration is COMPLETE
      → Skip that migration's DDL step in the execution plan.
================================================================================
```
