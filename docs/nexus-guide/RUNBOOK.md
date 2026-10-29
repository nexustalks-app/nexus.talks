# Nexus Guide — Operations Runbook

> Source of truth: `NEXUS_GUIDE_SPEC.md` v1.0. This runbook only summarises the owner-facing steps. If any conflict exists between this file and the spec, the spec wins.

---

## Section 1 — Bot Identity and Secrets (spec §6)

1. Run the pre-flight checks (`docs/nexus-guide/preflight.sql`) and save the output. Resolve any username or display-name collision first (see "Lookalike names" in spec §9).

2. **Supabase Dashboard → Authentication → Users → Add user.**
   - Email: `nexus_guide@<domain>` — use a domain **you control** (or a non-routable address if the dashboard accepts one) so nobody else can receive a password-reset email for the bot.
   - Password: a long random password (≥ 40 chars, from a password manager).
   - Check **Auto Confirm User**.
   - The email local part becomes the profile username (`nexus_guide`, or `nexus_guide_official` if taken).

3. Do **not** ban the account — Option B needs it to sign in.

4. Store the credentials **only** in Vercel (Production scope, marked Sensitive):
   - `GUIDE_BOT_EMAIL`
   - `GUIDE_BOT_PASSWORD`
   - **Never** commit them, and never send them to Claude or Kiro.

5. **Password rotation:** change the password in Supabase and Vercel, then redeploy. Cached bot sessions expire within about an hour.

---

## Section 2 — Environment Variables (spec §7.1)

None are `NEXT_PUBLIC_`. All are set in Vercel per-environment.

| Variable | Purpose | Notes |
|---|---|---|
| `GUIDE_ROLLOUT` | `off` (default), `allowlist`, or `all` | Preview and Development always use `off`. Local dev against production must also use `off` unless deliberately testing. |
| `GUIDE_ALLOWLIST` | Comma-separated user UUIDs | Used only when rollout is `allowlist`. |
| `GUIDE_BOT_EMAIL` | Bot sign-in email | Sensitive — never commit. |
| `GUIDE_BOT_PASSWORD` | Bot sign-in password | Sensitive — never commit. |
| `GUIDE_LLM_PROVIDER` | Adapter key (`stub` plus any provider added in Stage 7) | Set to `stub` for Stages 3–5. |
| `GUIDE_LLM_MODEL` | Model identifier | Set at provider selection (Stage 7). |
| `GUIDE_LLM_API_KEY` | Provider API key | Sensitive — never commit. |
| `GUIDE_LLM_BASE_URL` | Optional base URL override | Optional. |
| `GUIDE_GLOBAL_DAILY_CAP` | Global reply cap per 24 h | Optional; default 5000. |

---

## Section 3 — Pre-flight (Phase 0) [OWNER]

Run `docs/nexus-guide/preflight.sql` in the Supabase SQL editor and save the full output.

Expected outcomes:
- `relforcerowsecurity = false` on the four core tables (profiles, conversations, conversation_members, messages).
- `postgres` has `rolbypassrls = true`.
- B9: all three `to_regclass()` values are `NULL` and no function names match — confirms no object name clashes.
- B8: no existing username or display name containing "nexus" or "guide".
- B7: note whether `pg_cron` is installed; if so, review jobs for anything touching `profiles`.

Dashboard checks:
- Auth → **CAPTCHA protection for password sign-in is OFF** (required for Option B bot sign-in).
- Auth → **"Single session per user" is OFF** (or unavailable on your plan).
- Note the email confirmation setting for reference.

Backup:
- If your Supabase plan provides point-in-time recovery, confirm a recent restore point exists.
- Otherwise export `profiles`, `conversations`, `conversation_members`, and `messages` as CSV from the table editor. (The migration modifies none of them; this is belt-and-braces.)

---

## Section 4 — Rollout Phases (spec §11)

### Phase 0 — Pre-flight [OWNER]
See Section 3 above.

### Phase 1 (P1) — Migration [OWNER after Kiro writes 011]
1. Kiro writes `supabase/migrations/011_nexus_guide.sql` (Stage 2).
2. Owner reviews the SQL carefully.
3. Owner runs it in the Supabase SQL editor.
4. Run `docs/nexus-guide/verify.sql` — V1, V2, and V3 must pass.
5. Confirm the existing app still works with the **old code** (nothing references the new objects yet).

### Phase 2 (P2) — Deploy dormant [OWNER after Stage 4 code is merged]
1. Deploy with `GUIDE_ROLLOUT=off` on all scopes.
2. Confirm: `npm run typecheck`, `npm run lint`, `npm run build` all pass.
3. Run the regression smoke test (spec §12.1): sign-in/out; open an existing 1:1; send and receive in two browsers; unread badge appears and clears; People search and start-chat; list order after a new message; details panel toggle; profile page.
4. Gate: app behaves identically to before; zero Guide-related DB calls.

### Phase 3a (P3a) — Allowlist test with stub [OWNER]
1. In the Supabase SQL editor: `UPDATE system_accounts SET enabled = true WHERE kind = 'nexus_guide';`
2. Set Vercel env (Production): `GUIDE_ROLLOUT=allowlist`, `GUIDE_ALLOWLIST=<uuid1>,<uuid2>` (two of your own accounts), `GUIDE_LLM_PROVIDER=stub`. Redeploy.
3. Run test matrix §12.2 (provisioning, stub reply, realtime, unread, isolation).
4. Run V4 — expect zero duplicate rows.
5. **Warm-instance check:** send at least 5 messages in a row, confirm the logs show **one** `bot_signin` event, not five.
6. Exercise rollback Level 1 (set `enabled = false`) and Level 2 (`GUIDE_ROLLOUT=off`) once each, then restore.

### Phase 3b (P3b) — Real provider [OWNER]
1. Set Vercel env: `GUIDE_LLM_PROVIDER=<provider>`, `GUIDE_LLM_MODEL=<model>`, `GUIDE_LLM_API_KEY=<key>`. Redeploy.
2. Run test matrix §12.3 (real replies, limits, failure paths, plain-text output).
3. Confirm replies are plain text under 1,200 chars (no asterisks, no markdown).

### Phase 4 (P4) — Allowlist soak [OWNER]
- Expand `GUIDE_ALLOWLIST` to a few trusted users.
- Monitor with V5 for 2–3 days.
- Review provider dashboard for spend and latency.
- **Recommended before P5:** approve and complete tickets S1 (stale unread count) and S2 (oldest-50 message ordering).
- Gate: failure rate, latency, and spend are acceptable.

### Phase 5 (P5) — Public rollout [OWNER]
Preconditions (all required):
- S1 and S2 gates verified.
- Phase 4 soak is clean.
- `GUIDE_LLM_PROVIDER` is **not** `stub`.
- A hard monthly spend cap is active in the provider dashboard.

Action: set `GUIDE_ROLLOUT=all` and redeploy. Monitor closely for the first week.

---

## Section 5 — Rollback Levels (spec §11.4)

### Level 1 — Pause (instant, no deploy)
```sql
UPDATE system_accounts SET enabled = false WHERE kind = 'nexus_guide';
```
- The Guide stays visible and pinned.
- All reply requests return `guide_unavailable`.
- No new provisioning for new users.
- **Reversible:** set `enabled = true` to resume.

### Level 2 — Dormant (requires redeploy)
Set `GUIDE_ROLLOUT=off` in Vercel and redeploy.
- The app stops making any Guide-related DB calls.
- Existing Guide conversations remain as ordinary chats (no badge, unpinned, no replies).
- **Reversible:** restore `GUIDE_ROLLOUT` and redeploy.

### Level 3 — Full removal (irreversible)
Run in this order:
1. Ensure `GUIDE_ROLLOUT=off` is deployed (Level 2 is in effect).
2. Revert the Guide code changes and redeploy.
3. Run `docs/nexus-guide/rollback.sql` in the Supabase SQL editor.
4. Delete the bot user in Dashboard → Authentication → Users. (The `RESTRICT` FK on `system_accounts` is gone after step 3, so this is safe.)
5. Remove the Vercel env vars (`GUIDE_BOT_EMAIL`, `GUIDE_BOT_PASSWORD`, `GUIDE_LLM_*`, `GUIDE_ROLLOUT`, `GUIDE_ALLOWLIST`, `GUIDE_GLOBAL_DAILY_CAP`).
6. Remove the avatar asset (`public/nexus-guide.svg`).

---

## Section 6 — Owner Inputs Still Required (spec §16)

| # | Input | When needed |
|---|---|---|
| 1 | LLM provider and model | Before Phase 3b |
| 2 | Provider retention/privacy option reviewed and set | Before Phase 3b |
| 3 | Hard monthly spend cap set in the provider dashboard | Before Phase 3b |
| 4 | Vercel plan confirmed to allow 30 s function duration | Before Stage 3 deploy |
| 5 | Bot email domain (a mailbox you control) | Before P1 |
| 6 | Allowlist user UUIDs for P3a and P4 | Before Phase 3a |
| 7 | Avatar artwork approval (`public/nexus-guide.svg`) | Before Stage 4 |
| 8 | Support contact line for knowledge text (optional) | Before Stage 3 |
| 9 | Review and run `011_nexus_guide.sql` | Stage 2 gate |
| 10 | Approve or defer S1 and S2 | Recommended before P5 |
