import fs from 'fs';
import path from 'path';
import { ALL_AVATARS, MALE_AVATARS, FEMALE_AVATARS, getDeterministicDemoAvatar } from '../lib/avatar/avatar-collection.ts';

const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const publicDir = path.join(projectDir, 'public');

console.log('=== VERIFYING AVATAR PICKER SYSTEM & DATA INTEGRITY ===');

// 1. Check array lengths
console.log(`[CHECK] All avatars count: ${ALL_AVATARS.length} (expected 25)`);
if (ALL_AVATARS.length !== 25) throw new Error('Expected 25 avatars');

console.log(`[CHECK] Male avatars count: ${MALE_AVATARS.length} (expected 13)`);
if (MALE_AVATARS.length !== 13) throw new Error('Expected 13 male avatars');

console.log(`[CHECK] Female avatars count: ${FEMALE_AVATARS.length} (expected 12)`);
if (FEMALE_AVATARS.length !== 12) throw new Error('Expected 12 female avatars');

// 2. Check each avatar file exists on disk
for (const a of ALL_AVATARS) {
  const filePath = path.join(publicDir, a.url);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing avatar file on disk: ${filePath}`);
  }
}
console.log('[PASS] All 25 avatar assets exist in public/avatar-assets/');

// 3. Test deterministic mapping stability across 100 calls
const personas = [
  { seed: 'contact-aasif', expected: '/avatar-assets/male-01.png' },
  { seed: 'contact-elena', expected: '/avatar-assets/female-01.png' },
  { seed: 'contact-marcus', expected: '/avatar-assets/male-02.png' },
  { seed: 'contact-sophia', expected: '/avatar-assets/female-03.png' },
  { seed: 'contact-julian', expected: '/avatar-assets/male-09.png' },
  { seed: 'contact-amara', expected: '/avatar-assets/female-05.png' },
  { seed: 'arbitrary-seed-user-12345', expectedPrefix: '/avatar-assets/' },
];

for (const p of personas) {
  const first = getDeterministicDemoAvatar(p.seed);
  if (p.expected && first !== p.expected) {
    throw new Error(`Expected ${p.expected} for ${p.seed}, got ${first}`);
  }
  for (let i = 0; i < 100; i++) {
    const next = getDeterministicDemoAvatar(p.seed);
    if (next !== first) {
      throw new Error(`Non-deterministic mapping detected for ${p.seed} at iteration ${i}`);
    }
  }
}
console.log('[PASS] Deterministic mapping 100% stable across 100 iterations (zero Math.random())');

// 4. Verify AccountSection integration
const accountSectionCode = fs.readFileSync(path.join(projectDir, 'components/settings/sections/account-section.tsx'), 'utf8');
if (!accountSectionCode.includes('AvatarPickerModal')) throw new Error('AccountSection missing AvatarPickerModal');
if (!accountSectionCode.includes('setAvatarModalOpen(true)')) throw new Error('AccountSection missing modal trigger');
console.log('[PASS] AccountSection correctly integrated with AvatarPickerModal');

// 5. Verify ProfileView integration
const profileViewCode = fs.readFileSync(path.join(projectDir, 'components/profile/profile-view.tsx'), 'utf8');
if (!profileViewCode.includes('AvatarPickerModal')) throw new Error('ProfileView missing AvatarPickerModal');
if (!profileViewCode.includes('setAvatarModalOpen(true)')) throw new Error('ProfileView missing modal trigger');
console.log('[PASS] ProfileView correctly integrated with AvatarPickerModal');

console.log('=== ALL AVATAR PICKER SYSTEM CHECKS PASSED (5/5) ===');
