const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ts = require('typescript');

console.log('--- NEXUS.TALKS AVATAR SYSTEM VERIFICATION SUITE ---');

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`[PASS] ${description}`);
  } catch (err) {
    console.error(`[FAIL] ${description}:`, err.message);
  }
}

// Helper to load and evaluate TS files using local TypeScript compiler
function loadTs(relativePath) {
  const fullPath = path.resolve(__dirname, relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  
  const m = { exports: {} };
  const customRequire = (id) => {
    if (id.startsWith('.')) {
      const dir = path.dirname(fullPath);
      const targetTs = path.join(dir, id + '.ts');
      if (fs.existsSync(targetTs)) return loadTs(path.relative(__dirname, targetTs));
      const targetTsx = path.join(dir, id + '.tsx');
      if (fs.existsSync(targetTsx)) return loadTs(path.relative(__dirname, targetTsx));
    }
    return require(id);
  };
  
  const fn = new Function('require', 'module', 'exports', transpiled);
  fn(customRequire, m, m.exports);
  return m.exports;
}

// 1. Test token definitions
test('Tokens: LUXURY_PALETTES has 11 executive palettes', () => {
  const { LUXURY_PALETTES, AVATAR_SIZE_CLASSES } = loadTs('../lib/avatar/avatar-tokens.ts');
  assert.strictEqual(LUXURY_PALETTES.length, 11, 'Must have 11 palettes (0..10)');
  assert.strictEqual(LUXURY_PALETTES[0].name, 'Imperial Wine', 'Palette 0 must be Imperial Wine');
  assert.strictEqual(LUXURY_PALETTES[0].accent, '#E5B869', 'Palette 0 accent must be Royal Gold');
  assert.strictEqual(Object.keys(AVATAR_SIZE_CLASSES).length, 6, 'Must define 6 sizes (xs to 2xl)');
});

// 2. Test Creator Identity
test('Tokens: isCreatorIdentity strictly identifies Mr Aasif', () => {
  const { isCreatorIdentity } = loadTs('../lib/avatar/avatar-tokens.ts');
  assert.strictEqual(isCreatorIdentity('contact-aasif'), true);
  assert.strictEqual(isCreatorIdentity('Mr Aasif'), true);
  assert.strictEqual(isCreatorIdentity('mr. aasif'), true);
  assert.strictEqual(isCreatorIdentity('@the_aasif9'), true);
  assert.strictEqual(isCreatorIdentity('the_aasif9'), true);
  assert.strictEqual(isCreatorIdentity('creator'), true);
  assert.strictEqual(isCreatorIdentity('founder'), true);

  // Negative checks
  assert.strictEqual(isCreatorIdentity('contact-elena'), false);
  assert.strictEqual(isCreatorIdentity('Elena Rostova'), false);
  assert.strictEqual(isCreatorIdentity('marcus'), false);
  assert.strictEqual(isCreatorIdentity(''), false);
  assert.strictEqual(isCreatorIdentity(null), false);
  assert.strictEqual(isCreatorIdentity(undefined), false);
});

// 3. Test Deterministic Color Selection
test('Tokens: getAvatarIndex returns 0 exclusively for Creator and 1..10 for others', () => {
  const { getAvatarIndex } = loadTs('../lib/avatar/avatar-tokens.ts');
  // Creator must strictly get 0
  assert.strictEqual(getAvatarIndex('contact-aasif'), 0);
  assert.strictEqual(getAvatarIndex('Mr Aasif'), 0);
  assert.strictEqual(getAvatarIndex('the_aasif9'), 0);

  // Known contacts
  assert.strictEqual(getAvatarIndex('contact-elena'), 1);
  assert.strictEqual(getAvatarIndex('contact-marcus'), 2);
  assert.strictEqual(getAvatarIndex('contact-sophia'), 3);
  assert.strictEqual(getAvatarIndex('contact-julian'), 4);
  assert.strictEqual(getAvatarIndex('contact-amara'), 5);

  // Other users must never receive 0
  const randomSeeds = ['user_abc', 'random_id_99', 'john.doe', 'alice', 'bob', 'charlie'];
  for (const s of randomSeeds) {
    const idx = getAvatarIndex(s);
    assert(idx >= 1 && idx <= 10, `User ${s} got index ${idx}, which is outside 1..10`);
    assert.strictEqual(getAvatarIndex(s), idx, 'Index must be deterministic');
  }
});

// 4. Test Initials Extraction
test('Initials: Handles single names, multi-names, multilingual text and emojis', () => {
  const { getInitials } = loadTs('../lib/avatar/initials.ts');

  // Creator identity override
  assert.strictEqual(getInitials('Mr Aasif'), 'A');
  assert.strictEqual(getInitials('the_aasif9'), 'A');
  assert.strictEqual(getInitials(null, 'contact-aasif'), 'A');

  // Multi-word names
  assert.strictEqual(getInitials('Elena Rostova'), 'ER');
  assert.strictEqual(getInitials('Sophia Lin'), 'SL');
  assert.strictEqual(getInitials('Marcus Vance'), 'MV');
  assert.strictEqual(getInitials('Julian Thorne'), 'JT');
  assert.strictEqual(getInitials('Amara Okafor'), 'AO');
  assert.strictEqual(getInitials('Martin Luther King'), 'MK');

  // Single word names
  assert.strictEqual(getInitials('Sophia'), 'S');
  assert.strictEqual(getInitials('Alexander'), 'A');
  assert.strictEqual(getInitials('Elena'), 'E');

  // Handles with punctuation / delimiters
  assert.strictEqual(getInitials('@elena.rostova'), 'ER');
  assert.strictEqual(getInitials('elena_rostova'), 'ER');

  // Multilingual & Accents
  assert.strictEqual(getInitials('Élodie Laurent'), 'ÉL');
  assert.strictEqual(getInitials('José María'), 'JM');
  assert.strictEqual(getInitials('Алексей Смирнов'), 'АС');
  assert.strictEqual(getInitials('李伟'), '李伟');

  // Emojis and prefixes
  assert.strictEqual(getInitials('✨ Sarah Miller'), 'SM');
  assert.strictEqual(getInitials('🚀 Tech Lead'), 'TL');

  // Fallbacks
  assert.strictEqual(getInitials(null, null), 'N');
  assert.strictEqual(getInitials('', ''), 'N');
  assert.strictEqual(getInitials('   '), 'N');
  assert.strictEqual(getInitials('!@#$'), 'N');
});

// 5. Test NexusAvatar3D Component SVG Centering & Attributes
test('Component: nexus-avatar-3d preserves working centering and dominantBaseline', () => {
  const compPath = path.join(__dirname, '../components/user/nexus-avatar-3d.tsx');
  const compSource = fs.readFileSync(compPath, 'utf8');

  // Centering guarantees
  assert(compSource.includes("const textY = '40.5';"), 'Must preserve textY = 40.5');
  assert(compSource.includes('x="40"'), 'Must preserve x = 40');
  assert(compSource.includes('dominantBaseline="central"'), 'Must preserve dominantBaseline="central"');
  assert(!compSource.includes('alignmentBaseline'), 'Must NOT have alignmentBaseline');
  assert(compSource.includes('viewBox="0 0 80 80"'), 'Must preserve viewBox 0 0 80 80');
  assert(compSource.includes('showCreatorBadge'), 'Must preserve showCreatorBadge');
});

// 6. Test UserAvatar Component Fallback & Photo URL handling
test('Component: user-avatar preserves photo URL and delegates to NexusAvatar3D', () => {
  const avatarPath = path.join(__dirname, '../components/user/user-avatar.tsx');
  const avatarSource = fs.readFileSync(avatarPath, 'utf8');

  assert(avatarSource.includes('avatar_url && !imageError'), 'Must check avatar_url and imageError');
  assert(avatarSource.includes('<NexusAvatar3D'), 'Must fallback to NexusAvatar3D');
  assert(avatarSource.includes('showCreatorBadge'), 'Must forward showCreatorBadge');
});

console.log(`\nAvatar System Tests: ${passed}/${total} passed.`);
if (passed !== total) {
  process.exit(1);
}
