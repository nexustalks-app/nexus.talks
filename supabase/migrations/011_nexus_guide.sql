-- ============================================================
-- Migration 011: Nexus Guide
-- Spec version: NEXUS_GUIDE_SPEC.md v1.0
-- ADDITIVE ONLY.  No existing table, policy, trigger, function
-- or publication is altered by this migration.
-- ============================================================
-- OWNER ACTION REQUIRED BEFORE RUNNING:
--   1. Create the bot user in Supabase Dashboard
--      Authentication -> Users -> Add user
--      (Auto Confirm User checked, long random password)
--   2. Replace the placeholder email below with the exact email
--      you used.  The migration will fail loudly if the user does
--      not exist, is not confirmed, or has no profile.
-- ============================================================

begin;

-- ─── Configuration constant ─────────────────────────────────
-- Set this to the exact email address of the bot account you
-- created in the Dashboard.  It is used ONLY in the preconditions
-- block and the profile finalisation; it is never stored in any
-- table or logged.
do $$
declare
  v_bot_email  constant text := 'nexus.talks.guide@gmail.com';  -- <-- edit before running

  v_bot_id          uuid;
  v_profile_exists  boolean;
begin
  -- ── Preconditions (fail loudly, change nothing) ──────────

  -- PC-1: the bot auth.users row must exist and be confirmed
  select id into v_bot_id
  from auth.users
  where email = v_bot_email
    and email_confirmed_at is not null
  limit 1;

  if v_bot_id is null then
    raise exception
      'PREFLIGHT FAILED: no confirmed auth.users row for email "%". '
      'Create the bot user in the Dashboard (Auto Confirm User) before running this migration.',
      v_bot_email;
  end if;

  -- PC-2: the bot profile must exist (handle_new_user trigger creates it on signup)
  select exists(
    select 1 from public.profiles where id = v_bot_id
  ) into v_profile_exists;

  if not v_profile_exists then
    raise exception
      'PREFLIGHT FAILED: auth.users row exists for "%" (id = %) '
      'but no matching public.profiles row.  The signup trigger may not have fired.  '
      'Check and create the profile manually before retrying.',
      v_bot_email, v_bot_id;
  end if;

  -- PC-3: new tables must not exist with a different shape
  if to_regclass('public.system_accounts') is not null then
    raise exception
      'PREFLIGHT FAILED: public.system_accounts already exists.  '
      'This migration is not safe to run again without the rollback script.';
  end if;

  if to_regclass('public.guide_conversations') is not null then
    raise exception
      'PREFLIGHT FAILED: public.guide_conversations already exists.';
  end if;

  if to_regclass('public.guide_replies') is not null then
    raise exception
      'PREFLIGHT FAILED: public.guide_replies already exists.';
  end if;

  -- PC-4: new functions must not exist
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'ensure_my_guide_conversation',
        'claim_guide_turn',
        'finish_guide_turn'
      )
  ) then
    raise exception
      'PREFLIGHT FAILED: one or more Guide functions already exist in public.  '
      'This migration is not safe to run again without the rollback script.';
  end if;

  -- All preconditions passed.  Pass the bot id to later statements via a
  -- session-local temporary table (dropped at end of transaction).
  create temporary table _nx_boot (bot_id uuid) on commit drop;
  insert into _nx_boot values (v_bot_id);
end;
$$;

-- ─── Finalise the bot profile ────────────────────────────────
-- Keyed on the email-matched user id from _nx_boot, never on the
-- username alone.
update public.profiles
set
  display_name = 'Nexus Guide',
  bio          = 'Official AI assistant for Nexus.talks.',
  avatar_url   = '/nexus-guide.svg',
  status       = 'online',
  updated_at   = now()
where id = (select bot_id from _nx_boot);

-- ─── Table: public.system_accounts ──────────────────────────
create table public.system_accounts (
  kind        text        primary key check (kind in ('nexus_guide')),
  user_id     uuid        not null unique
                          references public.profiles(id)
                          on delete restrict,   -- prevents accidental bot deletion
  enabled     boolean     not null default false,
  created_at  timestamptz not null default now()
);

alter table public.system_accounts enable row level security;

-- authenticated users may SELECT (needed by server-side checks)
create policy "system_accounts_select" on public.system_accounts
  for select
  to authenticated
  using (true);

-- no insert/update/delete policies: only SECURITY DEFINER functions and
-- the owner (Dashboard / superuser) may write
revoke all on public.system_accounts from anon;
revoke insert, update, delete on public.system_accounts from authenticated;

-- ─── Table: public.guide_conversations ──────────────────────
create table public.guide_conversations (
  user_id         uuid        primary key
                              references public.profiles(id)
                              on delete cascade,
  conversation_id uuid        not null unique
                              references public.conversations(id)
                              on delete cascade,
  created_at      timestamptz not null default now()
);

alter table public.guide_conversations enable row level security;

create policy "guide_conversations_select" on public.guide_conversations
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.guide_conversations from anon;
revoke insert, update, delete on public.guide_conversations from authenticated;

-- ─── Table: public.guide_replies (turn ledger) ───────────────
-- No FK on user_message_id: a user deleting their own message must not
-- break the idempotency key in the ledger.
create table public.guide_replies (
  user_message_id  uuid        primary key,
  user_id          uuid        not null
                               references public.profiles(id)
                               on delete cascade,
  conversation_id  uuid        not null,
  status           text        not null
                               check (status in ('processing','completed','failed','skipped')),
  attempts         int         not null default 1,
  reply_message_id uuid,
  error_code       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_guide_replies_user_created
  on public.guide_replies (user_id, created_at desc);

create index idx_guide_replies_created
  on public.guide_replies (created_at desc);

alter table public.guide_replies enable row level security;

-- No policies: only SECURITY DEFINER functions touch this table
revoke all on public.guide_replies from anon;
revoke all on public.guide_replies from authenticated;

-- ─── Function: ensure_my_guide_conversation() ────────────────
-- Returns the caller's Guide conversation id, creating it on first call
-- when the bot is enabled.  Returns NULL if the bot is disabled or if
-- the caller IS the bot.
-- Welcome message is hard-coded: no caller-supplied text can ever forge
-- an "official" message.
create or replace function public.ensure_my_guide_conversation()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_bot_id   uuid;
  v_enabled  boolean;
  v_conv_id  uuid;
  -- Hard-coded welcome message (spec §5.4a and Appendix A.1).
  -- Never a parameter.
  v_welcome  constant text :=
    'Hi, I''m Nexus Guide, the official AI assistant for Nexus.talks. '
    'I can help you find people, start conversations, understand how messaging works, '
    'and fix common problems.' || chr(10) || chr(10) ||
    'Try asking: "How do I start a chat?" or "How do I find someone?"' || chr(10) || chr(10) ||
    'Messages in this chat are processed by an AI service to write replies, '
    'so please don''t share passwords or private information here.';
begin
  if v_uid is null then
    raise exception 'ensure_my_guide_conversation: caller is not authenticated';
  end if;

  -- Advisory lock per user prevents duplicate conversations from concurrent
  -- layout renders.
  perform pg_advisory_xact_lock(
    hashtext('nexus_guide:' || v_uid::text)
  );

  select user_id, enabled
  into v_bot_id, v_enabled
  from public.system_accounts
  where kind = 'nexus_guide';

  if v_bot_id is null then
    raise exception 'ensure_my_guide_conversation: system_accounts has no nexus_guide row';
  end if;

  -- The bot itself never receives a Guide conversation.
  if v_uid = v_bot_id then
    return null;
  end if;

  -- Mapping already exists: repair memberships and return.
  select conversation_id into v_conv_id
  from public.guide_conversations
  where user_id = v_uid;

  if v_conv_id is not null then
    insert into public.conversation_members (conversation_id, user_id)
    values (v_conv_id, v_uid)
    on conflict (conversation_id, user_id) do nothing;

    insert into public.conversation_members (conversation_id, user_id)
    values (v_conv_id, v_bot_id)
    on conflict (conversation_id, user_id) do nothing;

    return v_conv_id;
  end if;

  -- No conversation yet.  If the bot is disabled, return NULL; provisioning
  -- is deferred until the owner enables it.
  if not v_enabled then
    return null;
  end if;

  -- Create the Guide conversation.
  -- Order: conversation -> user member -> bot member -> mapping -> welcome message.
  -- Members must exist before the welcome INSERT so that on_message_created
  -- increments the user's unread_count to 1.

  insert into public.conversations (type, name)
  values ('direct', null)
  returning id into v_conv_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv_id, v_uid);

  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv_id, v_bot_id);

  insert into public.guide_conversations (user_id, conversation_id)
  values (v_uid, v_conv_id);

  -- Welcome message — text is hard-coded, never caller-supplied.
  insert into public.messages (conversation_id, sender_id, content, type)
  values (v_conv_id, v_bot_id, v_welcome, 'text');

  return v_conv_id;
end;
$$;

revoke all on function public.ensure_my_guide_conversation() from public, anon;
grant execute on function public.ensure_my_guide_conversation() to authenticated;

-- ─── Function: claim_guide_turn(p_conversation_id, p_message_id) ──
-- Validates the incoming turn and inserts / updates the ledger row.
-- Returns jsonb { "status": text, "retry_after_seconds"?: int }.
--
-- SECURITY: rate limits are HARD-CODED constants inside the function body.
-- The function takes NO limit parameters from the caller, so an authenticated
-- user calling this RPC directly cannot influence the limits.
--
-- Spec limits (D7): 6 questions/minute per user, 100/day per user,
-- 5000/day global (GUIDE_GLOBAL_DAILY_CAP default from spec §7.1).
create or replace function public.claim_guide_turn(
  p_conversation_id uuid,
  p_message_id      uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid            uuid    := auth.uid();
  v_enabled        boolean;
  v_attempts       int;
  v_status         text;
  v_updated_at     timestamptz;
  v_count          bigint;
  v_oldest_in_win  timestamptz;
  v_retry_after    int;

  -- Hard-coded rate limit constants (spec D7 and §7.1).
  -- These are NOT parameters; callers cannot override them.
  c_per_minute     constant int := 6;
  c_per_day        constant int := 100;
  c_global_per_day constant int := 5000;
begin
  if v_uid is null then
    raise exception 'claim_guide_turn: caller is not authenticated';
  end if;

  -- Per-user advisory lock: serialise concurrent calls from the same user.
  perform pg_advisory_xact_lock(
    hashtext('guide_turn:' || v_uid::text)
  );

  -- 1. Kill switch
  select enabled into v_enabled
  from public.system_accounts
  where kind = 'nexus_guide';

  if not coalesce(v_enabled, false) then
    return jsonb_build_object('status', 'disabled');
  end if;

  -- 2. Caller must own a mapping row for this conversation
  if not exists (
    select 1 from public.guide_conversations
    where user_id         = v_uid
      and conversation_id = p_conversation_id
  ) then
    return jsonb_build_object('status', 'forbidden');
  end if;

  -- 3. The message must belong to the caller, be text, and not be deleted
  if not exists (
    select 1 from public.messages
    where id              = p_message_id
      and conversation_id = p_conversation_id
      and sender_id       = v_uid
      and type            = 'text'
      and deleted_at      is null
  ) then
    return jsonb_build_object('status', 'invalid_message');
  end if;

  -- 4. Idempotency: existing ledger row
  select status, attempts, updated_at
  into v_status, v_attempts, v_updated_at
  from public.guide_replies
  where user_message_id = p_message_id;

  if found then
    if v_status in ('completed', 'skipped') then
      return jsonb_build_object('status', 'already_done');
    end if;

    if v_status = 'processing'
       and v_updated_at > now() - interval '120 seconds' then
      return jsonb_build_object('status', 'in_progress');
    end if;

    -- Stale processing or failed row: allow up to 3 attempts total.
    if v_attempts >= 3 then
      return jsonb_build_object('status', 'max_attempts');
    end if;

    -- Retry (does NOT count again against rate limits per spec §5.4b).
    update public.guide_replies
    set status     = 'processing',
        attempts   = attempts + 1,
        updated_at = now()
    where user_message_id = p_message_id;

    return jsonb_build_object('status', 'ok');
  end if;

  -- 5. New turn: rate limit checks (all statuses count per spec §5.4b)

  -- Per-minute check
  select count(*) into v_count
  from public.guide_replies
  where user_id    = v_uid
    and created_at > now() - interval '60 seconds';

  if v_count >= c_per_minute then
    -- retry_after = seconds until the oldest row in this 60-second window
    -- ages out of the window.
    select created_at into v_oldest_in_win
    from public.guide_replies
    where user_id    = v_uid
      and created_at > now() - interval '60 seconds'
    order by created_at asc
    limit 1;

    v_retry_after := greatest(
      1,
      60 - extract(epoch from (now() - v_oldest_in_win))::int
    );

    return jsonb_build_object(
      'status',               'rate_limited_minute',
      'retry_after_seconds',  v_retry_after
    );
  end if;

  -- Per-day check
  select count(*) into v_count
  from public.guide_replies
  where user_id    = v_uid
    and created_at > now() - interval '24 hours';

  if v_count >= c_per_day then
    return jsonb_build_object('status', 'rate_limited_day');
  end if;

  -- Global daily cap
  select count(*) into v_count
  from public.guide_replies
  where created_at > now() - interval '24 hours';

  if v_count >= c_global_per_day then
    return jsonb_build_object('status', 'service_busy');
  end if;

  -- 6. All checks passed — insert the ledger row
  insert into public.guide_replies (
    user_message_id, user_id, conversation_id, status, attempts
  ) values (
    p_message_id, v_uid, p_conversation_id, 'processing', 1
  );

  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.claim_guide_turn(uuid, uuid) from public, anon;
grant execute on function public.claim_guide_turn(uuid, uuid) to authenticated;

-- ─── Function: finish_guide_turn(...) ────────────────────────
-- Called by the route to mark the ledger row final.
-- Callers can only affect their own row (WHERE user_id = auth.uid()).
create or replace function public.finish_guide_turn(
  p_message_id       uuid,
  p_status           text,
  p_reply_message_id uuid    default null,
  p_error_code       text    default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'finish_guide_turn: caller is not authenticated';
  end if;

  if p_status not in ('completed', 'failed', 'skipped') then
    raise exception 'finish_guide_turn: invalid status "%"', p_status;
  end if;

  -- Only updates the row where the caller is the owner and the row is still
  -- in 'processing'.  No error if the row is not found; the route handles that.
  update public.guide_replies
  set
    status            = p_status,
    reply_message_id  = p_reply_message_id,
    error_code        = p_error_code,
    updated_at        = now()
  where user_message_id = p_message_id
    and user_id         = auth.uid()
    and status          = 'processing';
end;
$$;

revoke all on function public.finish_guide_turn(uuid, text, uuid, text) from public, anon;
grant execute on function public.finish_guide_turn(uuid, text, uuid, text) to authenticated;

-- ─── Seed system_accounts ────────────────────────────────────
-- enabled = false: the Guide is fully dormant until the owner explicitly
-- sets it to true (Phase 3a).
insert into public.system_accounts (kind, user_id, enabled)
values ('nexus_guide', (select bot_id from _nx_boot), false);

commit;

-- ============================================================
-- After running this migration, execute verify.sql (V1-V3)
-- and confirm the existing application still works normally
-- before proceeding to Stage 3.
-- ============================================================
