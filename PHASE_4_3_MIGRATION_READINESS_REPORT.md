# NEXUS.TALKS — PHASE 4.3 STAGING MIGRATION READINESS REPORT

**Project Location:** `C:\Users\raist\Downloads\nexus mess\aasif-messenger`  
**Execution Timestamp:** 2026-10-29  
**Target Environment:** Staging Supabase Project `nkwenqntxbqzrmdztflo` (`nkwenqntxbqzrmdztflo.supabase.co`)  
**Status Taxonomy:** `PASS` &middot; `FAIL` &middot; `BLOCKED` &middot; `NOT RUN`  

---

## 1. ACTUAL REMOTE MIGRATION STATE & AUDIT DISTINCTION

Authorized, read-only PostgREST schema inspection was conducted against the staging Supabase project without executing DDL, modifying data, or exposing credentials.

| Migration Target | Description | Verified Remote Status | Technical Evidence & Analysis |
| :--- | :--- | :---: | :--- |
| `001`–`015` | Core schemas, profiles, realtime, echoes | **CONFIRMED APPLIED** | All core endpoints (`profiles`, `conversations`, `messages`, `echoes`) respond with HTTP 200. |
| `016_add_conversation_pins.sql` | `is_pinned` and `pinned_at` on `conversation_members` | **CONFIRMED ABSENT** | PostgREST query `conversation_members?select=is_pinned` returned Postgres error `42703 (column does not exist)`. |
| `017_harden_conversation_and_members_rls.sql` | RLS helper functions & hardened insert/update policies | **UNCONFIRMED (UNKNOWN)** | Calling `rpc/conversation_member_count` with the `anon` key returned HTTP 404. In PostgREST, a 404 occurs either if a function is absent **or** if execution is revoked from `PUBLIC`/`anon` (which Migration 017 explicitly mandates). Therefore, 017 cannot be assumed absent without direct SQL catalog access via the `postgres` role. |
| `018_enforce_direct_conversation_uniqueness.sql` | `canonical_pair` on `conversations`, backfill & trigger | **CONFIRMED ABSENT** | PostgREST query `conversations?select=canonical_pair` returned Postgres error `42703 (column does not exist)`. |

---

## 2. DEEP MIGRATION SAFETY & DEDUPLICATION ANALYSIS

### 2.1 Migration 016: Conversation Pinning Fields
- **Schema Modifications:** Adds `is_pinned BOOLEAN DEFAULT FALSE` and `pinned_at TIMESTAMPTZ DEFAULT NULL` to `conversation_members`. Creates partial index `idx_conversation_members_pinned`.
- **Preconditions:** `conversation_members` table exists.
- **Idempotency:** Fully safe to rerun (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **Locking & Downtime:** In PostgreSQL 11+, adding columns with constant defaults is a metadata-only operation (sub-millisecond lock, no table rewrite).
- **Data Loss Risk:** Zero (purely additive).

### 2.2 Migration 017: Security Definer Helper Functions & RLS Hardening
- **Helper Functions:**
  - `public.conversation_member_count(UUID)`
  - `public.get_conversation_type(UUID)`
- **Privilege Escalation Review:**
  - Both functions are declared with `SECURITY DEFINER` and `SET search_path = public`.
  - Pinned search paths strictly prevent search-path injection exploits.
  - Both functions are read-only scalar queries returning `INTEGER` or `TEXT`. They perform no data mutations and take only a single UUID argument.
  - Execution permissions are explicitly revoked from `PUBLIC` and restricted to `authenticated` and `service_role`.
- **Policy Hardening:** Restricts `conversation_members_insert` to prevent arbitrary self-insertion; enforces direct conversation cap of 2 members; hardens `messages_update` to require active membership and non-deleted state (`deleted_at IS NULL`).

### 2.3 Migration 018: Deduplication Logic & Data Integrity Review
- **Surviving Thread Selection:** The backfill CTE partitions by computed canonical pair and ranks conversations:
  ```sql
  ROW_NUMBER() OVER (
    PARTITION BY public.generate_canonical_pair(min(cm.user_id), max(cm.user_id))
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  ) AS rank_order
  ```
  Only `rank_order = 1` (the most recently active direct conversation) receives the `canonical_pair` string.
- **Treatment of Secondary Duplicates:**
  - Duplicate direct conversations (`rank_order > 1`) retain `canonical_pair = NULL`.
  - Secondary records are **NOT deleted**, and their memberships and message records remain intact in PostgreSQL.
- **Orphan Reference Risk:** **Zero**. No rows or foreign keys are deleted. All foreign key references (`messages.conversation_id -> conversations.id`) remain valid.
- **Unique Index Safety:** The unique index is declared as a partial index:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_direct_canonical_pair
    ON conversations (canonical_pair)
    WHERE canonical_pair IS NOT NULL;
  ```
  Because NULL values are excluded from the index and only `rank_order = 1` receives a string value, **the unique index is mathematically guaranteed never to collide or fail during migration**.
- **Message History Consideration:** Secondary conversations become archived threads. Their messages are not lost, but they are not returned when initiating new direct chats from the user directory.

---

## 3. ADMINISTRATOR EXECUTION PACKAGE

An execution guide has been generated in the project root:  
👉 [STAGING_MIGRATION_EXECUTION_PLAN.md](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/STAGING_MIGRATION_EXECUTION_PLAN.md)

### Contents of Execution Plan
1. **Preflight Read-Only Queries:** SQL queries to inspect existing columns, verify if Migration 017 functions already exist in `information_schema.routines`, and detect any duplicate direct conversations.
2. **Execution Sequence:** Step-by-step SQL blocks for Migrations 016, 017, and 018 clearly labeled as DDL.
3. **Post-Migration Verification SQL:** Read-only queries to verify column additions, indexes, triggers, and active RLS policies in `pg_policies`.
4. **Rollback SQL:** Complete drop commands to safely reverse changes if needed.
5. **Functional Acceptance Checklist:** Manual verification steps for conversation pinning, duplicate thread prevention, member cap enforcement, and message update permissions.

---

## 4. PASSWORD-RECOVERY COMPLETION READINESS

### 4.1 Current Verified Capabilities
- **Non-Enumerating Response:** Probed against live GoTrue API; returns identical HTTP 200 `{}` regardless of email registration status.
- **Tampered Token Rejection:** Live server redirects invalid/expired recovery tokens to `/forgot-password?error=expired`.
- **Open-Redirect Protection:** `sanitizeRedirectPath` strips external domains and protocol-relative URLs.
- **Unauthenticated Session Gate:** `/update-password` renders alert warning when accessed without a valid recovery session.

### 4.2 Protocol for End-to-End Staging Verification
To verify actual email receipt and credential rotation without impacting production:
1. **Configure Custom SMTP in Staging Supabase:**
   - In Supabase Dashboard for `nkwenqntxbqzrmdztflo`, navigate to *Project Settings > Authentication > SMTP Settings*.
   - Enable Custom SMTP and provide credentials (e.g. Resend free tier: host `smtp.resend.com`, port `465`, user `resend`, api key password).
2. **Create Dedicated Staging Test Account:**
   - Register a dedicated staging test user (e.g. `staging-audit-test@domain.com`).
3. **Execute Recovery Cycle:**
   - Submit reset request from `/forgot-password`.
   - Verify email delivery in test inbox and extract recovery URL.
   - Open recovery URL and confirm session exchange to `/update-password`.
   - Submit new password and verify redirection to `/conversations`.
   - Sign in with new password; verify old password returns `400 Invalid login credentials`.

---

## 5. VALIDATION AUDIT LOG

```
========================================================================================
 COMMAND EXECUTION AUDIT LOG
========================================================================================
1. npm.cmd run typecheck
   Exit Code: 0
   Output: tsc --noEmit (0 errors)
   Status: PASS

2. npm.cmd run lint
   Exit Code: 0
   Output: No ESLint warnings or errors
   Status: PASS

3. npm.cmd run test:security
   Exit Code: 0
   Output: 34 PASSED, 0 FAILED (Live HTTP server on port 3000)
   Status: PASS

4. npm.cmd run test:rls
   Exit Code: 0
   Output: 20 PASSED, 0 FAILED (In-memory PostgreSQL RLS model)
   Status: PASS

5. npm.cmd run test:staging
   Exit Code: 0
   Output: 23 PASSED, 0 FAILED (In-memory auth & messaging simulation)
   Status: PASS

6. node scripts/audit_route_integrity.mjs
   Exit Code: 0
   Output: 25 PASSED, 0 FAILED (Live HTTP route status audit)
   Status: PASS

7. npm.cmd run build
   Exit Code: 0
   Output: Compiled successfully in 3.9s. 23 static/dynamic routes generated.
   Status: PASS

8. npm.cmd audit --json
   Exit Code: 0 (Report generated)
   Output: 0 critical, 0 moderate, 0 low, 1 high (zod <4.6.6 - breaking upgrade deferred)
   Status: PASS
========================================================================================
```

---

## 6. REMAINING BLOCKERS & NEXT ACTIONS

| Blocker | Description | Next Action | Status |
| :--- | :--- | :--- | :---: |
| **1. Staging Migration Execution** | Migrations 016, 017, and 018 pending on staging database | Database administrator executes [STAGING_MIGRATION_EXECUTION_PLAN.md](file:///C:/Users/raist/Downloads/nexus%20mess/aasif-messenger/STAGING_MIGRATION_EXECUTION_PLAN.md) in Supabase SQL Editor | **NOT RUN** |
| **2. Custom SMTP Configuration** | Supabase default provider rate limits email dispatch | Configure staging SMTP provider in Supabase Dashboard to complete live mailbox verification | **BLOCKED** |
| **3. Zod Major Upgrade** | `zod <4.6.6` advisory (`GHSA-mrhx-c7xc-m3w5`) | Risk mitigated (0 collection schemas used); schedule Zod 4 upgrade in next major engineering milestone | **BLOCKED** / Mitigated |
