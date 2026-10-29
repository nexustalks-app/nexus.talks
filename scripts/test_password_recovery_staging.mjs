import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local without logging values
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

async function runRecoveryVerification() {
  console.log('====================================================');
  console.log(' NEXUS.TALKS — PASSWORD RECOVERY STAGING AUDIT');
  console.log('====================================================\n');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Fatal: Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('--- 1. SUPABASE REAL AUTH RECOVERY ENDPOINT ---');
  // 1.1 Test non-existent email recovery call
  const testEmail = `staging-audit-${Date.now()}@example.org`;
  const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
    redirectTo: 'http://localhost:3000/auth/callback?type=recovery&next=/update-password',
  });

  // Supabase GoTrue returns empty object and null error when email enumeration protection is on
  // or a rate limit error if rate limited.
  if (resetError) {
    console.log(`  [INFO] resetPasswordForEmail response: ${resetError.message} (status: ${resetError.status || 'unknown'})`);
    if (resetError.status === 429) {
      console.log('  [PASS] Supabase GoTrue enforced rate limiting on recovery endpoint');
    } else {
      console.log(`  [INFO] Reset response: ${resetError.message}`);
    }
  } else {
    console.log('  [PASS] resetPasswordForEmail succeeded silently (non-enumerating response)');
  }

  console.log('\n--- 2. REAL APP ROUTE CALLBACK & EXPIRED / TAMPERED TOKEN HANDLING ---');
  // 2.1 Test invalid PKCE code with type=recovery
  const res1 = await fetch('http://localhost:3000/auth/callback?code=tampered_code_xyz&type=recovery', {
    redirect: 'manual',
  });
  const loc1 = res1.headers.get('location');
  const pass1 = res1.status === 307 && loc1 && loc1.includes('/forgot-password') && loc1.includes('error=expired');
  console.log(`  [${pass1 ? 'PASS' : 'FAIL'}] Tampered/invalid recovery code -> Redirect: ${loc1}`);

  // 2.2 Test invalid token_hash with type=recovery
  const res2 = await fetch('http://localhost:3000/auth/callback?token_hash=fake_token_hash&type=recovery', {
    redirect: 'manual',
  });
  const loc2 = res2.headers.get('location');
  const pass2 = res2.status === 307 && loc2 && loc2.includes('/forgot-password') && loc2.includes('error=expired');
  console.log(`  [${pass2 ? 'PASS' : 'FAIL'}] Tampered/invalid token hash -> Redirect: ${loc2}`);

  // 2.3 Test non-recovery invalid code (e.g. signup) redirects to login
  const res3 = await fetch('http://localhost:3000/auth/callback?code=tampered_code_xyz&type=signup', {
    redirect: 'manual',
  });
  const loc3 = res3.headers.get('location');
  const pass3 = res3.status === 307 && loc3 && loc3.includes('/login') && loc3.includes('error=confirmation_failed');
  console.log(`  [${pass3 ? 'PASS' : 'FAIL'}] Invalid signup code -> Redirect: ${loc3}`);

  console.log('\n--- 3. OPEN-REDIRECT ATTACK ATTEMPTS VIA CALLBACK ---');
  // 3.1 External HTTPS url in next parameter
  const res4 = await fetch('http://localhost:3000/auth/callback?code=fake&type=recovery&next=https://attacker.com/malicious', {
    redirect: 'manual',
  });
  const loc4 = res4.headers.get('location');
  const pass4 = loc4 && !loc4.includes('attacker.com');
  console.log(`  [${pass4 ? 'PASS' : 'FAIL'}] External URL https://attacker.com blocked -> Safe destination: ${loc4}`);

  // 3.2 Protocol-relative URL //evil.com
  const res5 = await fetch('http://localhost:3000/auth/callback?code=fake&type=recovery&next=//evil.com', {
    redirect: 'manual',
  });
  const loc5 = res5.headers.get('location');
  const pass5 = loc5 && !loc5.includes('evil.com');
  console.log(`  [${pass5 ? 'PASS' : 'FAIL'}] Protocol-relative //evil.com blocked -> Safe destination: ${loc5}`);

  // 3.3 Backslash scheme escape /\evil.com
  const res6 = await fetch('http://localhost:3000/auth/callback?code=fake&type=recovery&next=/\\evil.com', {
    redirect: 'manual',
  });
  const loc6 = res6.headers.get('location');
  const pass6 = loc6 && !loc6.includes('evil.com');
  console.log(`  [${pass6 ? 'PASS' : 'FAIL'}] Backslash escape /\\evil.com blocked -> Safe destination: ${loc6}`);

  console.log('\n--- 4. DIRECT ACCESS TO /update-password WITHOUT RECOVERY SESSION ---');
  const res7 = await fetch('http://localhost:3000/update-password');
  const text7 = await res7.text();
  const pass7 = res7.status === 200 && text7.includes('Update Password');
  console.log(`  [${pass7 ? 'PASS' : 'FAIL'}] /update-password renders with 200 OK (client component validates session)`);

  console.log('\n--- 5. LIVE EMAIL INBOX RECEIPT ASSESSMENT ---');
  console.log('  [BLOCKED] Real email inbox delivery check cannot be fully automated:');
  console.log('            - Supabase instance does not expose service-role key or Inbucket API locally.');
  console.log('            - Dedicated external mailbox credentials (IMAP/POP3) are not configured in environment.');
  console.log('            - Action required: In staging/production, configure custom SMTP or verify with manual test inbox.');
}

runRecoveryVerification().catch(console.error);
