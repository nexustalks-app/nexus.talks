# NEXUS.TALKS — PHASE 4.7: PREFLIGHT CORRECTIONS
## Itemised Defect Log, Corrections Applied, and Final Readiness Verdict

**Review Date:** 2026-10-29  
**Document Revised:** `PHASE_4_6_READ_ONLY_PREFLIGHT.md`  
**Sources Inspected:** `016_add_conversation_pins.sql`, `017_harden_conversation_and_members_rls.sql`, `018_enforce_direct_conversation_uniqueness.sql`, `PHASE_4_6_READ_ONLY_PREFLIGHT.md`, `STAGING_MIGRATION_EXECUTION_PLAN.md`

---

## 1. CORRECTIONS — MIGRATION TRACKING (Requirement 1)

### Defect 1.1 — Query 1 Referenced a Table That May Not Exist

**Original problem:**
```sql
SELECT version, inserted_at 
FROM supabase_migrations.schema_migrations 
WHERE version IN ('016', '017', '018', '20261029016', '20261029017', '20261029018')
```
This query fails with `relation "supabase_migrations.schema_migrations" does not exist` if the Supabase CLI has never been used on this project, which is the default state for many projects using the Dashboard SQL Editor directly. The query was not safe to run unconditionally.

**Correction applied:**
- Query A now first checks `information_schema.tables` to determine whether `schema_migrations` exists.
- Query A-2 is explicitly marked "only run if Query A confirms the table exists."
- Both queries are independently executable.

### Defect 1.2 — Assumed Version Format

**Original problem:** The query hard-coded version strings `'016'`, `'20261029016'`, etc. Supabase CLI records versions using the exact filename prefix, which varies by project initialisation style. Assuming specific formats produces false negatives.

**Correction applied:** Query A-2 now fetches the 30 most recent versions sorted by `inserted_at DESC` without a WHERE filter on specific version values. The administrator compares filenames against the returned list manually.

### Defect 1.3 — Conflated Absent Tracking With Not-Applied Migration

**Original problem:** The interpretation said "Zero rows returned → Not Applied." But zero rows in the tracking table may simply mean the project has never used CLI-tracked migrations. It does not prove the migration SQL was not applied.

**Correction applied:** The interpretation now states: "Absence of tracking records is not evidence of an unapplied migration. Physical schema evidence (column, index, function, trigger, policy queries) is the authoritative source." Tracking queries are demoted to informational supplementary checks.

---

## 2. CORRECTIONS — COMPLETE MIGRATION STATE DETECTION (Requirement 2)

### Defect 2.1 — Migration 017 Inferred From Single Function

**Original problem:** Check 4 in the checklist read:
```
Run: SELECT routine_name FROM information_schema.routines 
     WHERE routine_schema = 'public' AND routine_name = 'conversation_member_count';
Outcomes:
  - 0 rows → NOT APPLIED
```
A single function's presence or absence is not sufficient to classify migration 017. The migration also modifies four RLS policies and execute grants. A state where the function exists but policies are unchanged is PARTIAL/INCONSISTENT, not NOT APPLIED or COMPLETE.

**Correction applied:**
- Query E checks both `conversation_member_count` and `get_conversation_type` together with security definer and search_path attributes.
- Query F verifies execute grants independently.
- Query G verifies all four RLS policy expressions independently.
- Classification now requires agreement across Queries E, F, and G before labelling migration 017 COMPLETE or NOT APPLIED.

### Defect 2.2 — Migration 018 Inferred From Column Alone

**Original problem:** Check 5 read:
```
Run: SELECT column_name FROM information_schema.columns 
     WHERE table_name = 'conversations' AND column_name = 'canonical_pair';
Outcomes:
  - 0 rows → NOT APPLIED
```
Migration 018 has six distinct schema effects: the column, two functions (`generate_canonical_pair`, `handle_direct_conversation_canonical_pair`), one DML backfill, one unique partial index, and one trigger. Inferring the migration's status from the column alone misses five of the six.

**Correction applied:**
- Query H is split into three sections: H-1 (column), H-2 (both functions with attributes), H-3 (trigger with target table and event type).
- Query I verifies the unique partial index separately.
- The classification table now requires all six effects to agree before labelling 018 COMPLETE.

### Defect 2.3 — Missing Classification for PARTIAL/INCONSISTENT

**Original problem:** The checklist only offered two outcomes for most checks: "Not Applied (proceed)" or "Already Applied (skip)." There was no decision branch for partial state, which is the highest-risk condition.

**Correction applied:** All classification decisions now include an explicit PARTIAL/INCONSISTENT branch that triggers STOP. The document states explicitly: "Never advise blindly re-running a migration in a partial state."

### Defect 2.4 — Missing Classification for UNKNOWN State

**Original problem:** If `is_conversation_member` (the Migration 009 prerequisite) was absent, the document mentioned it as an error but did not classify 017 as UNKNOWN or propagate the STOP correctly.

**Correction applied:** Migration 017 classification now includes an UNKNOWN state when `is_conversation_member` is absent, with an explicit STOP and statement that no further migration work should proceed.

---

## 3. CORRECTIONS — BACKUP AND RECOVERY (Requirement 3)

### Defect 3.1 — Assumed All Plans Support Manual Snapshots

**Original problem:** The checklist included:
```
| Manual Point-in-Time Backup | Run manual export / snapshot or trigger backup | Snapshot completed and downloadable |
```
Supabase Free tier does not support PITR. Supabase Pro tier supports daily automated backups but not arbitrary manual snapshots. Stating "Run manual export / snapshot or trigger backup" as a universal step is incorrect.

**Correction applied:**
- Section 1.2 now explains that backup options vary by plan tier.
- The checklist requires the administrator to identify which recovery mode is active (daily automated backup or PITR window) rather than assuming both exist.
- A fallback (`pg_dump` or Dashboard database export) is noted for projects without PITR.
- The backup requirement is: "an established restore point exists, whatever form that takes for this project's plan."

### Defect 3.2 — Required Only "24-Hour" Window Without Verification

**Original problem:** The original document stated "Recent backup exists within last 24h" as the expected status without explaining how to verify or what to do if the backup is older or absent.

**Correction applied:** The updated checklist records the backup timestamp explicitly and requires the administrator to document both the backup type and timestamp in the runbook before marking the step passed.

---

## 4. CORRECTIONS — ENVIRONMENT VERIFICATION (Requirement 4)

### Defect 4.1 — Relied on `inet_server_addr()` as Project Proof

**Original problem:** Check 1 stated:
```
Run: SELECT current_database(), inet_server_addr();
Decision: [PASS: Staging Confirmed] / [STOP: Wrong Project]
```
In a managed Supabase environment, multiple tenant projects share the same physical PostgreSQL host. `inet_server_addr()` returns a host IP, not a project identifier. Two different projects on the same Supabase region would return identical values.

**Correction applied:**
- Section 1.1 now states explicitly: "`current_database()` and `inet_server_addr()` do not prove project identity."
- The authoritative verification method is the Supabase Dashboard UI: **Project Settings → General → Reference ID** must show `nkwenqntxbqzrmdztflo`.
- The SQL query (`SELECT current_database(), current_user, version()`) is retained as a secondary hint only, clearly labelled as such.

---

## 5. CORRECTIONS — DATA INTEGRITY QUERIES (Requirement 5)

### Defect 5.1 — Query 9 Used `MIN:MAX` Rather Than Matching Migration 018's CTE Logic

**Original problem:** Query 9 used:
```sql
WHEN min(cm.user_id) < max(cm.user_id) THEN min(cm.user_id)::text || ':' || max(cm.user_id)::text
ELSE max(cm.user_id)::text || ':' || min(cm.user_id)::text
```
Migration 018's backfill calls `public.generate_canonical_pair(min(cm.user_id), max(cm.user_id))`, which internally checks `WHEN user_a < user_b`. The preflight query replicates the same logic without calling the function, which is correct — but only after the function is created (it does not exist pre-018). The query is safe to run before migration because it inlines the logic. This was correct but undocumented.

**Correction applied:** Query J-2 now includes a comment explaining that it inlines the canonical pair logic rather than calling `generate_canonical_pair` because the function does not exist until migration 018 is applied.

### Defect 5.2 — Anomalous Row Actions Were Too Permissive

**Original problem:** For Query 8 (anomalous memberships), the interpretation read: "If count > 0, administrator must review whether they are test data to delete or corrupted threads to convert to `group`." This implied deletion or conversion were valid actions the administrator could take immediately.

**Correction applied:** The interpretation now requires a documented review decision for each anomalous row. No automatic deletion, conversion, or cleanup is permitted from within the preflight document. Message re-parenting is explicitly disabled.

### Defect 5.3 — Duplicate Pair Review Was Insufficiently Cautious

**Original problem:** "REVIEW: Safe to proceed, but note IDs" implied that discovering duplicate pairs was acceptable without a required explicit administrator decision.

**Correction applied:** Query J-2 now produces a required decision record field. The administrator must explicitly document which conversation ID will survive as primary and confirm that split message history is acceptable before migration 018 can proceed. No auto-merge.

---

## 6. CORRECTIONS — FUNCTION PERMISSIONS AND RLS (Requirement 6)

### Defect 6.1 — `information_schema.routine_privileges` May Underreport Grantees

**Original problem:** Query 5 joined `information_schema.routine_privileges` with `pg_proc`. `information_schema.routine_privileges` reports grantees visible under the current user's permissions and may not show `PUBLIC` grants, which are stored in `pg_proc.proacl` as `null` (meaning default public access) rather than as an explicit grantee entry.

**Correction applied:** Query F now uses `pg_proc.proacl` directly via `aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner)))`, which correctly handles both explicit ACL entries and the null-means-public default. This reliably surfaces whether `PUBLIC` execute is present.

### Defect 6.2 — `handle_direct_conversation_canonical_pair` Expected `search_path`

**Original problem:** The original interpretation listed `proconfig = {search_path=public}` as expected for `handle_direct_conversation_canonical_pair`. Inspecting the actual migration file shows that `handle_direct_conversation_canonical_pair` does **not** include `SET search_path = public` — only `conversation_member_count` and `get_conversation_type` do (both created in migration 017). Treating a missing `search_path` on the trigger function as a defect would cause a false STOP.

**Correction applied:** The expected attributes table in Section 2 (Migration 018 expected state) and Query H interpretation now correctly states:
- `generate_canonical_pair`: no `SECURITY DEFINER`, no `search_path`, `IMMUTABLE`
- `handle_direct_conversation_canonical_pair`: `SECURITY DEFINER = true`, `search_path` not set (proconfig will be null or empty — this is correct per migration 018)

### Defect 6.3 — SQL Editor Bypasses RLS Not Adequately Highlighted

**Original problem:** The distinction between catalog inspection and runtime enforcement was present but understated. A reader could reasonably conclude that matching policy text in `pg_policies` proves the policy works.

**Correction applied:** Section 4 (SQL Editor vs. API Testing) now leads with an explicit statement: "The SQL Editor executes as the `postgres` superuser role, which bypasses Row Level Security entirely." The boundary between what catalog inspection proves and what only an authenticated API request can prove is made explicit for each policy type.

---

## 7. CORRECTIONS — READ-ONLY INTEGRITY (Requirement 7)

### Defect 7.1 — Queries Were Not All Independently Executable

**Original problem:** Query 1 was structured as two blocks — the first a safe catalog check, the second directly referencing `supabase_migrations.schema_migrations` — with only a `DO` block comment separating them. Running the second block unconditionally causes a runtime error if the table does not exist.

**Correction applied:** Query A and Query A-2 are now separate, independently labelled blocks. Query A-2 is clearly gated on "Only run if Query A confirmed the table exists."

### Defect 7.2 — `DO $$` Block Used to Check Table Existence

**Original problem:** The original Query 1 used a `DO $$` anonymous code block (`RAISE NOTICE`) to indicate the table was found. This is DDL-adjacent syntax and produces output only in the server log, not the SQL Editor result grid. It is not a useful read-only check for an administrator reading query output.

**Correction applied:** The `DO` block is removed entirely. Query A is a plain `SELECT` against `information_schema.tables` with a clear row-count interpretation.

---

## 8. SUMMARY OF ALL CHANGES TO `PHASE_4_6_READ_ONLY_PREFLIGHT.md`

| Section | Change Type | Description |
| :--- | :--- | :--- |
| Section 1.1 | Rewritten | Dashboard manual confirmation is primary; SQL is secondary hint only |
| Section 1.2 | Rewritten | Backup options vary by plan; PITR not universal; checklist requires type identification |
| Section 2 | New | Complete expected schema state table per migration, sourced from actual SQL files |
| Query A | Corrected | Safe catalog check; A-2 is conditional and gated |
| Query A-2 | New | Fetches recent versions without assuming format; administrator compares to filenames |
| Query E | New | Replaces single-function check; verifies both 017 functions with full attributes |
| Query F | Corrected | Uses `pg_proc.proacl` via `aclexplode` instead of `information_schema.routine_privileges` |
| Query G | Corrected | Full 4-policy comparison with explicit pre-017 and post-017 expressions |
| Query H | New | Three-section query for all Migration 018 objects (column, functions, trigger) |
| Query I | New | Separate unique partial index verification |
| Query J-1/J-2 | Corrected | J-2 notes inline canonical pair logic; required decision record added |
| Section 4 | Expanded | Explicit statement that SQL Editor bypasses RLS |
| Section 5 | Expanded | 11 STOP conditions vs. 7 previously; PARTIAL/INCONSISTENT everywhere |
| Section 6 | Fully rewritten | Each check has PASS/STOP/REVIEW branch; status summary box; recording fields |

---

## 9. VERDICT

All seven mandatory correction requirements have been addressed in the updated `PHASE_4_6_READ_ONLY_PREFLIGHT.md`. No diagnostic query executes remote DDL or DML. No database results are fabricated. No credentials or keys are included.

```
================================================================================
VERDICT: PREFLIGHT DOCUMENTATION READY FOR MANUAL REVIEW
================================================================================
Migration tracking queries: CORRECTED (safe, conditional, no assumed versions)
016 state detection:        CORRECTED (both columns + index required for COMPLETE)
017 state detection:        CORRECTED (both functions + grants + 4 policies required)
018 state detection:        CORRECTED (column + 2 functions + index + trigger required)
Backup/recovery:            CORRECTED (plan-aware, no universal snapshot assumption)
Environment verification:   CORRECTED (Dashboard ref is primary; SQL is hint only)
Data integrity:             CORRECTED (documented decisions required; no auto-action)
Function permission query:  CORRECTED (pg_proc.proacl via aclexplode)
handle_direct search_path:  CORRECTED (not expected per migration 018 SQL)
Read-only integrity:        CORRECTED (all queries independently executable)
================================================================================
```
