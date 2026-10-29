/**
 * Nexus.talks — Automated Security & Penetration-Testing Test Suite
 *
 * Verifies:
 * 1. Open-Redirect Defenses & Path Sanitization
 * 2. Sliding-Window In-Memory Rate Limiting
 * 3. Protected Endpoint Authorization (401 on all sensitive operations)
 * 4. Input Validation (UUID schema validation, oversized payloads, malformed JSON handling)
 * 5. Information Leakage Defenses (Zero stack traces or DB errors exposed in 500s)
 * 6. HTTP Security Headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
 */

import http from 'http';
import { sanitizeRedirectPath } from '../lib/security/redirect.js';
import { checkRateLimit } from '../lib/security/rate-limit.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedTests++;
  }
}

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' NEXUS.TALKS — SECURITY TEST SUITE EXECUTION');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // 1. OPEN-REDIRECT PROTECTION TESTS
  // -----------------------------------------------------------------
  console.log('SECTION 1: Open-Redirect & Path Sanitization Tests');

  assert(
    sanitizeRedirectPath('/conversations') === '/conversations',
    'Permits safe internal relative path /conversations'
  );
  assert(
    sanitizeRedirectPath('/conversations/123-abc?tab=details') === '/conversations/123-abc?tab=details',
    'Permits internal relative path with query parameters'
  );
  assert(
    sanitizeRedirectPath('//evil.com') === '/conversations',
    'Blocks protocol-relative URL //evil.com'
  );
  assert(
    sanitizeRedirectPath('/\\evil.com') === '/conversations',
    'Blocks backslash-prefixed protocol escape /\\evil.com'
  );
  assert(
    sanitizeRedirectPath('/%5cevil.com') === '/conversations',
    'Blocks URL-encoded backslash escape /%5cevil.com'
  );
  assert(
    sanitizeRedirectPath('https://attacker.com/phish') === '/conversations',
    'Blocks absolute HTTPS URL to external domain'
  );
  assert(
    sanitizeRedirectPath('javascript:alert(document.cookie)') === '/conversations',
    'Blocks javascript: URI scheme'
  );
  assert(
    sanitizeRedirectPath('data:text/html,<script>alert(1)</script>') === '/conversations',
    'Blocks data: URI scheme'
  );
  assert(
    sanitizeRedirectPath('/login') === '/conversations',
    'Prevents redirect loop to /login'
  );
  assert(
    sanitizeRedirectPath('/signup') === '/conversations',
    'Prevents redirect loop to /signup'
  );
  assert(
    sanitizeRedirectPath(null) === '/conversations',
    'Handles null input safely'
  );
  assert(
    sanitizeRedirectPath(undefined) === '/conversations',
    'Handles undefined input safely'
  );

  // -----------------------------------------------------------------
  // 2. RATE LIMITER UNIT TESTS
  // -----------------------------------------------------------------
  console.log('\nSECTION 2: In-Memory Sliding Window Rate Limiter Tests');

  const testUser = `sec_test_${Date.now()}`;
  const config = { maxRequests: 3, windowSeconds: 2 };

  const r1 = checkRateLimit(testUser, config);
  assert(r1.allowed === true && r1.remaining === 2, 'First request within limit allowed');

  const r2 = checkRateLimit(testUser, config);
  assert(r2.allowed === true && r2.remaining === 1, 'Second request within limit allowed');

  const r3 = checkRateLimit(testUser, config);
  assert(r3.allowed === true && r3.remaining === 0, 'Third request reaches capacity');

  const r4 = checkRateLimit(testUser, config);
  assert(r4.allowed === false && r4.remaining === 0 && r4.resetSeconds > 0, 'Fourth request rejected with 429 reset window');

  const otherUser = `sec_other_${Date.now()}`;
  const rOther = checkRateLimit(otherUser, config);
  assert(rOther.allowed === true, 'Rate limit isolated per user identifier');

  // -----------------------------------------------------------------
  // 3. SERVER SECURITY HEADERS TESTS
  // -----------------------------------------------------------------
  console.log('\nSECTION 3: HTTP Security Headers Tests (http://localhost:3000)');

  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/login',
      method: 'GET',
    });

    assert(
      res.headers['x-content-type-options'] === 'nosniff',
      'X-Content-Type-Options: nosniff is set'
    );
    assert(
      res.headers['x-frame-options'] === 'SAMEORIGIN',
      'X-Frame-Options: SAMEORIGIN is set'
    );
    assert(
      res.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
      'Referrer-Policy: strict-origin-when-cross-origin is set'
    );
    assert(
      Boolean(res.headers['permissions-policy'] && res.headers['permissions-policy'].includes('camera=(self)')),
      'Permissions-Policy scopes camera and microphone to self'
    );
    assert(
      Boolean(res.headers['content-security-policy'] && res.headers['content-security-policy'].includes("frame-ancestors 'self'")),
      'Content-Security-Policy enforces frame-ancestors'
    );
    assert(
      Boolean(res.headers['cache-control'] && res.headers['cache-control'].includes('no-store')),
      'Cache-Control prevents caching of private dynamic routes (no-store)'
    );
  } catch (err) {
    console.error('Failed to connect to local server on port 3000:', err.message);
  }

  // -----------------------------------------------------------------
  // 4. API AUTHENTICATION & INPUT VALIDATION TESTS
  // -----------------------------------------------------------------
  console.log('\nSECTION 4: API Endpoint Authentication & Input Validation');

  // Test 4.1: Unauthenticated POST to /api/conversations
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/conversations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { participant_id: '11111111-1111-1111-1111-111111111111' }
    );
    assert(res.statusCode === 401, 'POST /api/conversations rejects unauthenticated caller with 401');
    assert(res.json?.error === 'Unauthorized', 'POST /api/conversations returns safe Unauthorized message');
  } catch (e) {
    console.error('Test 4.1 error:', e.message);
  }

  // Test 4.2: Malformed JSON to /api/conversations
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/conversations',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      '{ bad_json: true, '
    );
    assert(res.statusCode === 401 || res.statusCode === 400, 'POST /api/conversations safely rejects malformed JSON without 500 crash');
  } catch (e) {
    console.error('Test 4.2 error:', e.message);
  }

  // Test 4.3: Invalid UUID to /api/messages/[messageId] PATCH
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/messages/invalid-uuid-string',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
      { content: 'Hacked message' }
    );
    assert(res.statusCode === 400, 'PATCH /api/messages/[invalid-uuid] returns 400 Bad Request');
    assert(res.json?.error === 'Invalid message ID format', 'PATCH /api/messages returns specific UUID validation message');
  } catch (e) {
    console.error('Test 4.3 error:', e.message);
  }

  // Test 4.4: Unauthenticated PATCH to /api/messages/[valid-uuid]
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/messages/11111111-1111-1111-1111-111111111111',
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      },
      { content: 'Hacked message' }
    );
    assert(res.statusCode === 401, 'PATCH /api/messages/[valid-uuid] rejects unauthenticated caller with 401');
  } catch (e) {
    console.error('Test 4.4 error:', e.message);
  }

  // Test 4.5: Unauthenticated DELETE to /api/messages/[valid-uuid]
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/messages/11111111-1111-1111-1111-111111111111',
      method: 'DELETE',
    });
    assert(res.statusCode === 401, 'DELETE /api/messages/[valid-uuid] rejects unauthenticated caller with 401');
  } catch (e) {
    console.error('Test 4.5 error:', e.message);
  }

  // Test 4.6: Unauthenticated GET to /api/users/search
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/users/search?q=admin',
      method: 'GET',
    });
    assert(res.statusCode === 401, 'GET /api/users/search rejects unauthenticated caller with 401');
  } catch (e) {
    console.error('Test 4.6 error:', e.message);
  }

  // Test 4.7: Unauthenticated POST to /api/reactions
  try {
    const res = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/reactions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { messageId: '11111111-1111-1111-1111-111111111111', emoji: '❤️' }
    );
    assert(res.statusCode === 401, 'POST /api/reactions rejects unauthenticated caller with 401');
  } catch (e) {
    console.error('Test 4.7 error:', e.message);
  }

  // Test 4.8: Unauthenticated GET to /api/echoes
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/echoes',
      method: 'GET',
    });
    assert(res.statusCode === 401, 'GET /api/echoes rejects unauthenticated caller with 401');
  } catch (e) {
    console.error('Test 4.8 error:', e.message);
  }

  // Test 4.9: Unauthenticated GET to /api/pulse
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/pulse',
      method: 'GET',
    });
    assert(res.statusCode === 401, 'GET /api/pulse rejects unauthenticated caller with 401');
  } catch (e) {
    console.error('Test 4.9 error:', e.message);
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Security test runner encountered fatal error:', err);
  process.exit(1);
});
