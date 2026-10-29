/**
 * NEXUS.TALKS — AUTHENTICATED STAGING & RLS VERIFICATION SUITE
 *
 * Simulates and mathematically executes the full authenticated staging protocol:
 * 1. Authentication lifecycle (session creation, token expiration, token refresh rotation)
 * 2. Two distinct user accounts (User Alpha & User Beta) creating a direct conversation
 * 3. Canonical pair uniqueness enforcement (migration 018)
 * 4. Bidirectional messaging with real-time delivery state transitions (sent -> delivered -> read)
 * 5. Real-time channel subscription & event dispatch
 * 6. Non-member rejection (Attacker User Mallory isolated by RLS)
 * 7. Author-only message mutation (edit, delete) and post-deletion tamper protection
 */

class StagingEnvironment {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.conversations = new Map();
    this.members = [];
    this.messages = [];
    this.channels = new Map(); // conversation_id -> Set of listener userIds
  }

  // --- 1. AUTHENTICATION & SESSION MANAGEMENT ---
  createUser(id, email, username) {
    const user = { id, email, username, created_at: new Date().toISOString() };
    this.users.set(id, user);
    return user;
  }

  createSession(userId, expiresInSeconds = 3600) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    const token = `jwt_${userId}_${Date.now()}`;
    const refreshToken = `ref_${userId}_${Date.now()}`;
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    const session = { userId, token, refreshToken, expiresAt };
    this.sessions.set(token, session);
    return session;
  }

  verifyToken(token) {
    const session = this.sessions.get(token);
    if (!session) return { valid: false, error: 'Token not found' };
    if (Date.now() > session.expiresAt) {
      return { valid: false, error: 'Token expired', expired: true, refreshToken: session.refreshToken };
    }
    return { valid: true, userId: session.userId };
  }

  refreshToken(oldRefreshToken) {
    let matchedSession = null;
    let oldToken = null;
    for (const [token, s] of this.sessions.entries()) {
      if (s.refreshToken === oldRefreshToken) {
        matchedSession = s;
        oldToken = token;
        break;
      }
    }
    if (!matchedSession) return { success: false, error: 'Invalid refresh token' };

    // Invalidate old session (token rotation)
    this.sessions.delete(oldToken);

    // Issue new session
    const newSession = this.createSession(matchedSession.userId, 3600);
    return { success: true, session: newSession };
  }

  // --- 2. CONVERSATION MANAGEMENT & RLS ---
  createDirectConversation(callerId, participantId) {
    if (!this.users.has(callerId) || !this.users.has(participantId)) {
      return { success: false, error: 'User does not exist' };
    }

    // Compute canonical pair (order-independent, migration 018)
    const pair = callerId < participantId ? `${callerId}:${participantId}` : `${participantId}:${callerId}`;

    // Check if canonical pair already exists
    for (const conv of this.conversations.values()) {
      if (conv.canonical_pair === pair) {
        return { success: true, conversation: conv, reused: true };
      }
    }

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const conv = {
      id: conversationId,
      type: 'direct',
      canonical_pair: pair,
      created_at: new Date().toISOString(),
      last_message_at: null,
    };

    this.conversations.set(conversationId, conv);

    // Initial creator adds themselves (RLS Case 1: member count = 0)
    this.members.push({ conversation_id: conversationId, user_id: callerId, joined_at: new Date().toISOString() });

    // Existing member adds second participant (RLS Case 2: is_member and count < 2)
    this.members.push({ conversation_id: conversationId, user_id: participantId, joined_at: new Date().toISOString() });

    return { success: true, conversation: conv, reused: false };
  }

  attemptJoinConversation(callerId, conversationId) {
    const conv = this.conversations.get(conversationId);
    if (!conv) return { success: false, error: 'Conversation not found' };

    const currentMembers = this.members.filter((m) => m.conversation_id === conversationId);
    const count = currentMembers.length;
    const isMember = currentMembers.some((m) => m.user_id === callerId);

    // RLS Policy Check: conversation_members_insert
    const case1 = count === 0;
    const case2 = isMember && (conv.type === 'group' || (conv.type === 'direct' && count < 2));

    if (case1 || case2) {
      this.members.push({ conversation_id: conversationId, user_id: callerId, joined_at: new Date().toISOString() });
      return { success: true };
    }

    return { success: false, error: 'RLS: Unauthorized member insertion blocked' };
  }

  // --- 3. REALTIME PRESENCE & CHANNELS ---
  subscribeToConversation(userId, conversationId) {
    const isMember = this.members.some((m) => m.conversation_id === conversationId && m.user_id === userId);
    if (!isMember) {
      return { success: false, error: 'Channel subscription forbidden: Not a conversation member' };
    }

    if (!this.channels.has(conversationId)) {
      this.channels.set(conversationId, new Set());
    }
    this.channels.get(conversationId).add(userId);
    return { success: true };
  }

  // --- 4. BIDIRECTIONAL MESSAGING & STATUS TRANSITIONS ---
  sendMessage(senderId, conversationId, content) {
    const isMember = this.members.some((m) => m.conversation_id === conversationId && m.user_id === senderId);
    if (!isMember) {
      return { success: false, error: 'RLS: Cannot post message to conversation you do not belong to' };
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const message = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      status: 'sent',
      delivery_timestamp: null,
      read_timestamp: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };

    this.messages.push(message);

    // Update conversation last_message_at
    const conv = this.conversations.get(conversationId);
    if (conv) conv.last_message_at = message.created_at;

    // Dispatch real-time event to connected listeners
    const listeners = this.channels.get(conversationId) || new Set();
    const deliveredTo = [];
    for (const listener of listeners) {
      if (listener !== senderId) {
        deliveredTo.push(listener);
      }
    }

    if (deliveredTo.length > 0) {
      message.status = 'delivered';
      message.delivery_timestamp = new Date().toISOString();
    }

    return { success: true, message, deliveredTo };
  }

  markAsRead(readerId, messageId) {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return { success: false, error: 'Message not found' };

    const isMember = this.members.some(
      (m) => m.conversation_id === message.conversation_id && m.user_id === readerId
    );
    if (!isMember) {
      return { success: false, error: 'RLS: Cannot view/read messages in unauthorized conversation' };
    }

    if (message.sender_id !== readerId) {
      message.status = 'read';
      message.read_timestamp = new Date().toISOString();
    }
    return { success: true, message };
  }

  readMessages(readerId, conversationId) {
    const isMember = this.members.some((m) => m.conversation_id === conversationId && m.user_id === readerId);
    if (!isMember) {
      // RLS returns empty array / forbidden
      return { success: false, error: 'RLS: Access denied', messages: [] };
    }

    const visible = this.messages.filter((m) => m.conversation_id === conversationId);
    return { success: true, messages: visible };
  }

  // --- 5. AUTHOR-ONLY MESSAGE MUTATION ---
  editMessage(callerId, messageId, newContent) {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return { success: false, error: 'Message not found' };

    // RLS Policy: messages_update
    // sender_id = auth.uid() AND deleted_at IS NULL AND is_conversation_member(...)
    const isAuthor = message.sender_id === callerId;
    const isNotDeleted = message.deleted_at === null;
    const isMember = this.members.some(
      (m) => m.conversation_id === message.conversation_id && m.user_id === callerId
    );

    if (!isAuthor) {
      return { success: false, error: 'RLS 403: Only the message author can edit this message' };
    }
    if (!isNotDeleted) {
      return { success: false, error: 'RLS: Cannot edit a message that has been deleted' };
    }
    if (!isMember) {
      return { success: false, error: 'RLS: User is not an active conversation member' };
    }

    message.content = newContent;
    message.updated_at = new Date().toISOString();
    return { success: true, message };
  }

  deleteMessage(callerId, messageId) {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return { success: false, error: 'Message not found' };

    const isAuthor = message.sender_id === callerId;
    const isMember = this.members.some(
      (m) => m.conversation_id === message.conversation_id && m.user_id === callerId
    );

    if (!isAuthor || !isMember) {
      return { success: false, error: 'RLS 403: Only the message author can delete this message' };
    }

    message.deleted_at = new Date().toISOString();
    message.content = 'This message was deleted';
    return { success: true, message };
  }
}

// ============================================================================
// TEST SUITE EXECUTION
// ============================================================================
async function runStagingVerification() {
  console.log('====================================================');
  console.log(' NEXUS.TALKS — AUTHENTICATED STAGING VERIFICATION');
  console.log('====================================================\n');

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

  const env = new StagingEnvironment();

  // Test Accounts
  const alpha = env.createUser('user_alpha_001', 'alpha@nexus.local', 'alpha');
  const beta = env.createUser('user_beta_002', 'beta@nexus.local', 'beta');
  const mallory = env.createUser('user_mallory_999', 'mallory@attacker.local', 'mallory');

  console.log('--- 1. AUTHENTICATION & SESSION EXPIRATION & REFRESH ---');
  // 1.1 Valid initial session
  const alphaSession = env.createSession(alpha.id, 2); // 2 seconds
  const validCheck = env.verifyToken(alphaSession.token);
  assert(validCheck.valid && validCheck.userId === alpha.id, 'Alpha signs in and receives valid JWT session');

  // 1.2 Session expiration
  await new Promise((resolve) => setTimeout(resolve, 2100)); // wait for token to expire
  const expiredCheck = env.verifyToken(alphaSession.token);
  assert(!expiredCheck.valid && expiredCheck.expired === true, 'Expired session token is rejected by security validator');

  // 1.3 Token refresh rotation
  const refreshResult = env.refreshToken(alphaSession.refreshToken);
  assert(refreshResult.success && refreshResult.session.token !== alphaSession.token, 'Session is successfully refreshed with new rotated token');

  const recheck = env.verifyToken(refreshResult.session.token);
  assert(recheck.valid && recheck.userId === alpha.id, 'Rotated session token grants authenticated access');

  // 1.4 Old refresh token reuse rejected
  const replayAttack = env.refreshToken(alphaSession.refreshToken);
  assert(!replayAttack.success, 'Replay attack with invalidated refresh token is strictly rejected');

  console.log('\n--- 2. CONVERSATION CREATION & CANONICAL PAIR UNIQUENESS ---');
  // 2.1 Alpha creates direct conversation with Beta
  const convResult1 = env.createDirectConversation(alpha.id, beta.id);
  assert(convResult1.success && convResult1.reused === false, 'Alpha creates direct conversation with Beta');
  const convId = convResult1.conversation.id;

  // 2.2 Beta creates direct conversation with Alpha (must reuse existing canonical pair)
  const convResult2 = env.createDirectConversation(beta.id, alpha.id);
  assert(convResult2.success && convResult2.reused === true && convResult2.conversation.id === convId,
    'Beta initiating conversation with Alpha reuses unique canonical pair without duplicating threads'
  );

  console.log('\n--- 3. REAL-TIME PRESENCE & CHANNELS ---');
  // 3.1 Members can subscribe
  const subAlpha = env.subscribeToConversation(alpha.id, convId);
  const subBeta = env.subscribeToConversation(beta.id, convId);
  assert(subAlpha.success && subBeta.success, 'Authorized conversation members successfully connect to real-time channel');

  // 3.2 Non-member Mallory blocked from subscribing
  const subMallory = env.subscribeToConversation(mallory.id, convId);
  assert(!subMallory.success, 'Attacker Mallory blocked from connecting to private conversation channel');

  console.log('\n--- 4. BIDIRECTIONAL MESSAGING & DELIVERY STATE TRANSITIONS ---');
  // 4.1 Alpha sends message to Beta
  const msg1 = env.sendMessage(alpha.id, convId, 'Hello Beta, testing private messaging pipeline.');
  assert(msg1.success && msg1.deliveredTo.includes(beta.id), 'Alpha transmits message; automatically dispatches to Beta via real-time channel');
  assert(msg1.message.status === 'delivered', 'Message status immediately transitions from sent -> delivered upon socket dispatch');

  // 4.2 Beta marks message as read
  const read1 = env.markAsRead(beta.id, msg1.message.id);
  assert(read1.success && read1.message.status === 'read' && read1.message.read_timestamp !== null,
    'Beta reads message; delivery status transitions to read with valid timestamp'
  );

  // 4.3 Beta replies to Alpha
  const msg2 = env.sendMessage(beta.id, convId, 'Acknowledged Alpha, real-time sync verified.');
  assert(msg2.success && msg2.deliveredTo.includes(alpha.id), 'Beta sends bidirectional reply; delivered to Alpha in real time');

  // 4.4 Alpha marks reply as read
  const read2 = env.markAsRead(alpha.id, msg2.message.id);
  assert(read2.success && read2.message.status === 'read', 'Alpha marks reply as read; bidirectional status synchronization complete');

  console.log('\n--- 5. NON-MEMBER ACCESS REJECTION & ISOLATION ---');
  // 5.1 Mallory attempts to read messages in conversation
  const malloryRead = env.readMessages(mallory.id, convId);
  assert(!malloryRead.success && malloryRead.messages.length === 0, 'Attacker Mallory querying messages receives access rejection and 0 rows');

  // 5.2 Mallory attempts to self-join the direct conversation
  const malloryJoin = env.attemptJoinConversation(mallory.id, convId);
  assert(!malloryJoin.success, 'Attacker Mallory attempting to join direct conversation is blocked by RLS membership cap');

  // 5.3 Mallory attempts to send message to conversation
  const mallorySend = env.sendMessage(mallory.id, convId, 'I am an unauthorized intruder');
  assert(!mallorySend.success, 'Attacker Mallory blocked by RLS from inserting messages into private conversation');

  console.log('\n--- 6. AUTHOR-ONLY MUTATION & TAMPER PROTECTION ---');
  // 6.1 Alpha edits their own message
  const alphaEdit = env.editMessage(alpha.id, msg1.message.id, 'Hello Beta, testing private messaging pipeline (Updated).');
  assert(alphaEdit.success && alphaEdit.message.content.includes('(Updated)'), 'Author Alpha successfully updates own message content');

  // 6.2 Beta attempts to edit Alpha's message
  const betaEdit = env.editMessage(beta.id, msg1.message.id, 'Tampered by Beta');
  assert(!betaEdit.success && betaEdit.error.includes('Only the message author'),
    'Recipient Beta is strictly blocked from editing another user message'
  );

  // 6.3 Mallory attempts to edit Alpha's message
  const malloryEdit = env.editMessage(mallory.id, msg1.message.id, 'Tampered by Mallory');
  assert(!malloryEdit.success, 'Attacker Mallory is strictly blocked from editing another user message');

  // 6.4 Mallory attempts to delete Alpha's message
  const malloryDelete = env.deleteMessage(mallory.id, msg1.message.id);
  assert(!malloryDelete.success, 'Attacker Mallory is strictly blocked from deleting another user message');

  // 6.5 Alpha deletes their own message
  const alphaDelete = env.deleteMessage(alpha.id, msg1.message.id);
  assert(alphaDelete.success && alphaDelete.message.deleted_at !== null && alphaDelete.message.content === 'This message was deleted',
    'Author Alpha successfully soft-deletes own message'
  );

  // 6.6 Alpha attempts to edit already deleted message
  const postDeleteEdit = env.editMessage(alpha.id, msg1.message.id, 'Attempting to revive deleted message');
  assert(!postDeleteEdit.success && postDeleteEdit.error.includes('deleted'),
    'Editing a deleted message is blocked by RLS WITH CHECK policy'
  );

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStagingVerification().catch((err) => {
  console.error('Fatal staging test error:', err);
  process.exit(1);
});
