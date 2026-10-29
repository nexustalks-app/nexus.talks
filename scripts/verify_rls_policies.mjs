/**
 * Automated RLS Authorization & Membership Logic Test Suite
 *
 * Simulates and mathematically models PostgreSQL Row Level Security policies
 * from migration 017 and prior migrations to verify:
 * - Legitimate conversation creation and participant additions
 * - Defense against unauthorized self-joining (Attack Vector A)
 * - Defense against third-party member injection (Attack Vector B)
 * - Direct conversation cap enforcement (<= 2 members)
 * - Group conversation member expansion by authorized members
 * - Private message read and update authorization
 * - Profile directory anonymous scraper protection
 */

class MockDatabase {
  constructor() {
    this.conversations = new Map();
    this.conversation_members = [];
    this.messages = [];
    this.profiles = [];
  }

  // Helper functions matching Migration 017
  conversation_member_count(conversation_id) {
    return this.conversation_members.filter((m) => m.conversation_id === conversation_id).length;
  }

  get_conversation_type(conversation_id) {
    const conv = this.conversations.get(conversation_id);
    return conv ? conv.type : null;
  }

  is_conversation_member(conversation_id, user_id) {
    return this.conversation_members.some(
      (m) => m.conversation_id === conversation_id && m.user_id === user_id
    );
  }

  // Policy: conversations_insert
  insert_conversation(auth, conv) {
    const passed = auth.role === 'authenticated' && Boolean(auth.uid);
    if (!passed) {
      return { success: false, error: 'RLS: conversations_insert policy violation' };
    }
    this.conversations.set(conv.id, conv);
    return { success: true };
  }

  // Policy: conversation_members_insert (Migration 017)
  insert_conversation_member(auth, member) {
    const conv = this.conversations.get(member.conversation_id);
    if (!conv) {
      return { success: false, error: 'Foreign key violation: conversation does not exist' };
    }

    const count = this.conversation_member_count(member.conversation_id);
    const convType = this.get_conversation_type(member.conversation_id);
    const isMember = this.is_conversation_member(member.conversation_id, auth.uid);

    // Case 1: Initial creator adding themselves (count = 0)
    const case1 = member.user_id === auth.uid && count === 0;

    // Case 2: Existing member adding participant (direct <= 2, group unlimited)
    const case2 = isMember && (
      convType === 'group' ||
      (convType === 'direct' && count < 2)
    );

    if (case1 || case2) {
      this.conversation_members.push(member);
      return { success: true };
    }

    return { success: false, error: 'RLS: conversation_members_insert policy violation' };
  }

  // Policy: messages_select
  select_messages(auth, conversation_id) {
    const canSelect = this.is_conversation_member(conversation_id, auth.uid);
    if (!canSelect) {
      return { success: false, error: 'RLS: messages_select policy violation (empty set)' };
    }
    return {
      success: true,
      data: this.messages.filter((m) => m.conversation_id === conversation_id),
    };
  }

  // Policy: messages_update (Migration 017)
  update_message(auth, messageId, updates) {
    const msg = this.messages.find((m) => m.id === messageId);
    if (!msg) {
      return { success: false, error: 'Message not found' };
    }

    // USING clause check
    const usingPassed = (
      msg.sender_id === auth.uid &&
      msg.deleted_at === null &&
      this.is_conversation_member(msg.conversation_id, auth.uid)
    );

    if (!usingPassed) {
      return { success: false, error: 'RLS: messages_update USING policy violation' };
    }

    // New row state
    const newRow = { ...msg, ...updates };

    // WITH CHECK clause check
    const withCheckPassed = (
      newRow.sender_id === auth.uid &&
      newRow.conversation_id === msg.conversation_id &&
      this.is_conversation_member(newRow.conversation_id, auth.uid)
    );

    if (!withCheckPassed) {
      return { success: false, error: 'RLS: messages_update WITH CHECK policy violation' };
    }

    Object.assign(msg, updates);
    return { success: true, data: msg };
  }

  // Policy: profiles_select (Migration 017)
  select_profiles(auth) {
    if (auth.role !== 'authenticated') {
      return { success: false, error: 'RLS: profiles_select policy violation' };
    }
    return { success: true, data: this.profiles };
  }
}

// -----------------------------------------------------------------------------
// Test Runner
// -----------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failed++;
  }
}

function runTests() {
  console.log('====================================================');
  console.log(' DATABASE ROW LEVEL SECURITY (RLS) VERIFICATION');
  console.log('====================================================\n');

  const db = new MockDatabase();

  const userA = { uid: 'user-a-1111', role: 'authenticated' };
  const userB = { uid: 'user-b-2222', role: 'authenticated' };
  const userC = { uid: 'user-c-3333', role: 'authenticated' }; // Attacker
  const userD = { uid: 'user-d-4444', role: 'authenticated' };
  const anonymous = { uid: null, role: 'anon' };

  // 1. Unauthenticated conversation creation
  console.log('TEST GROUP 1: Conversation Creation Authorization');
  const anonConvRes = db.insert_conversation(anonymous, { id: 'conv-anon', type: 'direct' });
  assert(!anonConvRes.success, 'Anonymous caller cannot create conversation');

  const userAConvRes = db.insert_conversation(userA, { id: 'conv-direct-1', type: 'direct' });
  assert(userAConvRes.success, 'Authenticated user can create direct conversation');

  // 2. Initial Creator self-joining new conversation
  console.log('\nTEST GROUP 2: Conversation Membership Creation');
  const userASelfJoin = db.insert_conversation_member(userA, {
    conversation_id: 'conv-direct-1',
    user_id: userA.uid,
  });
  assert(userASelfJoin.success, 'Creator (User A) adds self to initial conversation (count=0)');
  assert(db.conversation_member_count('conv-direct-1') === 1, 'Member count is now 1');

  // 3. Creator adds participant to direct conversation
  const userAAddsB = db.insert_conversation_member(userA, {
    conversation_id: 'conv-direct-1',
    user_id: userB.uid,
  });
  assert(userAAddsB.success, 'Creator (User A) adds participant (User B) to direct conversation');
  assert(db.conversation_member_count('conv-direct-1') === 2, 'Member count is now 2');

  // 4. Attack: User A tries to add a 3rd member to a direct 1:1 conversation
  console.log('\nTEST GROUP 3: Direct Conversation Cap & Attack Defenses');
  const userAAddsThird = db.insert_conversation_member(userA, {
    conversation_id: 'conv-direct-1',
    user_id: userC.uid,
  });
  assert(!userAAddsThird.success, 'Direct conversation caps membership at 2; adding 3rd member blocked');

  // 5. Attack: Attacker (User C) tries to self-join User A and B\'s private conversation
  const attackerSelfJoin = db.insert_conversation_member(userC, {
    conversation_id: 'conv-direct-1',
    user_id: userC.uid,
  });
  assert(!attackerSelfJoin.success, 'Non-member (Attacker User C) cannot self-join existing private conversation');

  // 6. Attack: Attacker (User C) tries to add User D to User A and B\'s private conversation
  const attackerAddsVictim = db.insert_conversation_member(userC, {
    conversation_id: 'conv-direct-1',
    user_id: userD.uid,
  });
  assert(!attackerAddsVictim.success, 'Non-member cannot add arbitrary third parties to private conversation');

  // 7. Group Conversation Permissions
  console.log('\nTEST GROUP 4: Group Conversation Membership Expansion');
  db.insert_conversation(userA, { id: 'conv-group-1', type: 'group' });
  db.insert_conversation_member(userA, { conversation_id: 'conv-group-1', user_id: userA.uid });
  const groupAddB = db.insert_conversation_member(userA, { conversation_id: 'conv-group-1', user_id: userB.uid });
  const groupAddC = db.insert_conversation_member(userA, { conversation_id: 'conv-group-1', user_id: userC.uid });
  assert(groupAddB.success && groupAddC.success, 'Authorized member can add multiple participants to group');

  const groupAddDbyB = db.insert_conversation_member(userB, { conversation_id: 'conv-group-1', user_id: userD.uid });
  assert(groupAddDbyB.success, 'Member (User B) can add participant to group conversation');

  const attackerJoinGroup = db.insert_conversation_member({ uid: 'user-e-5555', role: 'authenticated' }, {
    conversation_id: 'conv-group-1',
    user_id: 'user-e-5555',
  });
  assert(!attackerJoinGroup.success, 'Unauthorized user cannot self-join group conversation');

  // 8. Message Privacy & Read Authorization
  console.log('\nTEST GROUP 5: Message Read Confidentiality');
  db.messages.push({
    id: 'msg-1',
    conversation_id: 'conv-direct-1',
    sender_id: userA.uid,
    content: 'Top secret 1-on-1 message',
    deleted_at: null,
  });

  const memberRead = db.select_messages(userB, 'conv-direct-1');
  assert(memberRead.success && memberRead.data.length === 1, 'Member (User B) can read messages in conversation');

  const nonMemberRead = db.select_messages(userC, 'conv-direct-1');
  assert(!nonMemberRead.success, 'Non-member (User C) is blocked from reading private messages');

  // 9. Message Modification & Tampering Authorization
  console.log('\nTEST GROUP 6: Message Update & Tampering Defenses');
  const authorEdit = db.update_message(userA, 'msg-1', { content: 'Edited message' });
  assert(authorEdit.success, 'Author can edit their own active message');

  const nonAuthorEdit = db.update_message(userB, 'msg-1', { content: 'Forged message' });
  assert(!nonAuthorEdit.success, 'Non-author cannot edit another user\'s message');

  db.messages.push({
    id: 'msg-deleted',
    conversation_id: 'conv-direct-1',
    sender_id: userA.uid,
    content: 'Deleted content',
    deleted_at: new Date().toISOString(),
  });
  const editDeleted = db.update_message(userA, 'msg-deleted', { content: 'Revive deleted message' });
  assert(!editDeleted.success, 'Cannot update a message that is marked deleted');

  const hijackConversation = db.update_message(userA, 'msg-1', { conversation_id: 'conv-group-1' });
  assert(!hijackConversation.success, 'Cannot reassign message to a different conversation');

  // 10. Profile Directory Access
  console.log('\nTEST GROUP 7: Profile Directory & Public Scraper Protections');
  db.profiles.push({ id: userA.uid, username: 'user_a', display_name: 'Alice' });

  const anonProfiles = db.select_profiles(anonymous);
  assert(!anonProfiles.success, 'Anonymous caller cannot query profiles directory');

  const authProfiles = db.select_profiles(userB);
  assert(authProfiles.success && authProfiles.data.length === 1, 'Authenticated user can access profiles directory');

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
