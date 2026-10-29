import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const PROJECT_DIR = 'C:/Users/raist/Downloads/nexus mess/aasif-messenger';
const AVATAR_DIR = path.join(PROJECT_DIR, 'public', 'avatar-assets');

const ALL_KEYS = [
  'male-01', 'male-02', 'male-03', 'male-04', 'male-05',
  'male-06', 'male-07', 'male-08', 'male-09', 'male-10',
  'male-11', 'male-12', 'male-13',
  'female-01', 'female-02', 'female-03', 'female-04', 'female-05',
  'female-06', 'female-07', 'female-08', 'female-09', 'female-10',
  'female-11', 'female-12',
];

const PRE_EXISTING_15 = [
  'male-01', 'male-02', 'male-03', 'male-04', 'male-05',
  'male-06', 'male-07', 'male-08', 'male-09', 'male-10',
  'female-01', 'female-02', 'female-03', 'female-04', 'female-05',
];

const NEWLY_GENERATED_10 = [
  'male-11', 'male-12', 'male-13',
  'female-06', 'female-07', 'female-08', 'female-09', 'female-10',
  'female-11', 'female-12',
];

async function run() {
  console.log('=== VERIFYING FULL 25-AVATAR COLLECTION ===\n');
  let validCount = 0;

  for (const key of ALL_KEYS) {
    const filename = `${key}.png`;
    const filePath = path.join(AVATAR_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] Missing file: ${filename}`);
      continue;
    }

    const stat = fs.statSync(filePath);
    const meta = await sharp(filePath).metadata();
    const hash = crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex');

    const isOriginal = PRE_EXISTING_15.includes(key);
    const category = isOriginal ? 'ORIGINAL (15)' : 'NEWLY CREATED (10)';

    if (meta.width === 512 && meta.height === 512 && meta.format === 'png') {
      console.log(`[PASS] ${filename.padEnd(14)} ${meta.width}x${meta.height} (${Math.round(stat.size / 1024)} KB) [${category}] md5:${hash.substring(0, 8)}`);
      validCount++;
    } else {
      console.error(`[FAIL] ${filename}: Invalid format or dimensions ${meta.width}x${meta.height} (${meta.format})`);
    }
  }

  // Check contact sheet
  const previewPath = path.join(AVATAR_DIR, 'avatar-preview.png');
  if (fs.existsSync(previewPath)) {
    const pMeta = await sharp(previewPath).metadata();
    const pStat = fs.statSync(previewPath);
    console.log(`\n[PASS] avatar-preview.png ${pMeta.width}x${pMeta.height} (${Math.round(pStat.size / 1024)} KB)`);
  } else {
    console.error('\n[FAIL] avatar-preview.png missing');
  }

  console.log(`\nTotal Valid Avatars: ${validCount} / 25`);
}

run().catch(console.error);
