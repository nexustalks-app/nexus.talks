import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function testRoute(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      redirect: 'manual', // do not follow redirects automatically so we can inspect 307/302
      ...options,
    });
    return {
      path,
      status: res.status,
      location: res.headers.get('location'),
      contentType: res.headers.get('content-type'),
    };
  } catch (err) {
    return { path, status: 0, error: err.message };
  }
}

async function run() {
  console.log('=== NEXUS.TALKS ROUTE INTEGRITY & ACCESS AUDIT ===\n');

  const publicRoutes = [
    '/',
    '/demo',
    '/login',
    '/signup',
    '/forgot-password',
    '/update-password',
    '/api/healthcheck',
  ];

  console.log('--- 1. PUBLIC ROUTES (Expected: 200 OK) ---');
  for (const r of publicRoutes) {
    const res = await testRoute(r);
    const pass = res.status === 200;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${r.padEnd(25)} Status: ${res.status}`);
  }

  const protectedPages = [
    '/conversations',
    '/settings',
    '/profile',
    '/pulse',
    '/echoes',
    '/groups',
    '/communities',
    '/people',
  ];

  console.log('\n--- 2. PROTECTED PAGES WITHOUT COOKIES (Expected: 307 Redirect to /login) ---');
  for (const r of protectedPages) {
    const res = await testRoute(r);
    const pass = res.status === 307 && res.location && res.location.includes('/login');
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${r.padEnd(25)} Status: ${res.status} -> Location: ${res.location}`);
  }

  const protectedApis = [
    { method: 'POST', path: '/api/conversations', body: JSON.stringify({ participant_id: 'some-id' }) },
    { method: 'PATCH', path: '/api/messages/123e4567-e89b-12d3-a456-426614174000', body: JSON.stringify({ content: 'test' }) },
    { method: 'DELETE', path: '/api/messages/123e4567-e89b-12d3-a456-426614174000' },
    { method: 'POST', path: '/api/reactions', body: JSON.stringify({ messageId: '123e4567-e89b-12d3-a456-426614174000', emoji: '❤️' }) },
    { method: 'GET', path: '/api/users/search?q=test' },
    { method: 'GET', path: '/api/echoes' },
    { method: 'GET', path: '/api/pulse' },
  ];

  console.log('\n--- 3. PROTECTED API ROUTES WITHOUT COOKIES (Expected: 401 Unauthorized) ---');
  for (const api of protectedApis) {
    const res = await testRoute(api.path, {
      method: api.method,
      headers: { 'Content-Type': 'application/json' },
      body: api.body,
    });
    const pass = res.status === 401;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${api.method.padEnd(6)} ${api.path.padEnd(45)} Status: ${res.status}`);
  }

  const nonExistentRoutes = [
    '/unknown-route-12345',
    '/conversations/non-existent-conv-id',
  ];

  console.log('\n--- 4. NOT FOUND / UNKNOWN ROUTES ---');
  for (const r of nonExistentRoutes) {
    const res = await testRoute(r);
    console.log(`  [INFO] ${r.padEnd(35)} Status: ${res.status} -> Location: ${res.location || 'none'}`);
  }
}

run().catch(console.error);
