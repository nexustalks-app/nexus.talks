import fs from 'fs';
import path from 'path';

// Load .env.local without exposing secrets
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Fatal: Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Extract hostname/ref for identification
const parsedUrl = new URL(supabaseUrl);
const projectRef = parsedUrl.hostname.split('.')[0];

console.log('====================================================');
console.log(' NEXUS.TALKS — REMOTE STAGING DATABASE AUDIT (READ-ONLY)');
console.log('====================================================\n');
console.log(`Target Host: ${parsedUrl.hostname}`);
console.log(`Target Project Reference: ${projectRef}`);

async function apiGet(endpoint) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  });
  return { status: res.status, statusText: res.statusText, data: await res.json().catch(() => null) };
}

async function runAudit() {
  console.log('\n--- 1. MIGRATION 016 VERIFICATION (Conversation Pins) ---');
  const cmPinsCheck = await apiGet('conversation_members?select=is_pinned,pinned_at&limit=1');
  console.log(`conversation_members?select=is_pinned,pinned_at: Status ${cmPinsCheck.status} (${cmPinsCheck.statusText})`);
  if (cmPinsCheck.status === 400 && cmPinsCheck.data?.message?.includes('does not exist')) {
    console.log('  -> Column is_pinned does not exist. Migration 016 is NOT applied.');
  } else if (cmPinsCheck.status === 200) {
    console.log('  -> Columns is_pinned, pinned_at exist. Migration 016 is APPLIED.');
  }

  console.log('\n--- 2. MIGRATION 017 VERIFICATION (Helper Functions & RLS) ---');
  // Check if RPC functions are callable
  const rpc1 = await fetch(`${supabaseUrl}/rest/v1/rpc/conversation_member_count`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_conversation_id: '00000000-0000-0000-0000-000000000000' }),
  });
  console.log(`rpc/conversation_member_count Status: ${rpc1.status} (${rpc1.statusText})`);

  const rpc2 = await fetch(`${supabaseUrl}/rest/v1/rpc/get_conversation_type`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_conversation_id: '00000000-0000-0000-0000-000000000000' }),
  });
  console.log(`rpc/get_conversation_type Status: ${rpc2.status} (${rpc2.statusText})`);

  console.log('\n--- 3. MIGRATION 018 VERIFICATION (Canonical Pair & Existing Direct Conversations) ---');
  const convPairCheck = await apiGet('conversations?select=canonical_pair&limit=1');
  console.log(`conversations?select=canonical_pair: Status ${convPairCheck.status} (${convPairCheck.statusText})`);

  // Inspect existing conversations and conversation_members
  const convs = await apiGet('conversations?select=id,type,created_at,last_message_at');
  console.log(`Total conversations accessible: Status ${convs.status}, count: ${Array.isArray(convs.data) ? convs.data.length : 'N/A'}`);
  
  if (Array.isArray(convs.data)) {
    console.log('Conversation records:', JSON.stringify(convs.data, null, 2));
  }

  const members = await apiGet('conversation_members?select=conversation_id,user_id,joined_at');
  console.log(`Total conversation_members accessible: Status ${members.status}, count: ${Array.isArray(members.data) ? members.data.length : 'N/A'}`);
  
  if (Array.isArray(members.data) && Array.isArray(convs.data)) {
    // Check if duplicate pairs exist
    const pairMap = new Map();
    const convMemberMap = new Map();
    members.data.forEach(m => {
      if (!convMemberMap.has(m.conversation_id)) convMemberMap.set(m.conversation_id, []);
      convMemberMap.get(m.conversation_id).push(m.user_id);
    });

    for (const [cId, uIds] of convMemberMap.entries()) {
      const conv = convs.data.find(c => c.id === cId);
      if (conv && conv.type === 'direct' && uIds.length === 2) {
        const sorted = [...uIds].sort();
        const pairKey = `${sorted[0]}:${sorted[1]}`;
        if (!pairMap.has(pairKey)) pairMap.set(pairKey, []);
        pairMap.get(pairKey).push(conv);
      }
    }

    console.log(`Direct 2-member pairs found: ${pairMap.size}`);
    let duplicatesFound = false;
    for (const [pairKey, cList] of pairMap.entries()) {
      if (cList.length > 1) {
        duplicatesFound = true;
        console.log(`  [DUPLICATE DETECTED] Pair ${pairKey} has ${cList.length} conversations:`);
        cList.forEach(c => console.log(`    - conv_id: ${c.id}, last_msg: ${c.last_message_at}, created: ${c.created_at}`));
      } else {
        console.log(`  [UNIQUE] Pair ${pairKey} has 1 conversation: conv_id ${cList[0].id}`);
      }
    }

    if (!duplicatesFound) {
      console.log('No duplicate direct conversations found in accessible records.');
    }
  }
}

runAudit().catch(console.error);
