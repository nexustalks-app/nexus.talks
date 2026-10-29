import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const BRAIN_DIR = 'C:/Users/raist/.gemini/antigravity/brain/42312ffb-ffd2-4f9d-a7d0-9f4640ac3e28';
const PROJECT_DIR = 'C:/Users/raist/Downloads/nexus mess/aasif-messenger';
const TARGET_DIR_PUBLIC = path.join(PROJECT_DIR, 'public', 'avatar-assets');
const TARGET_DIR_ROOT = path.join(PROJECT_DIR, 'avatar-assets');
const TARGET_DIR_ARTIFACT = path.join(BRAIN_DIR, 'avatar-assets');

fs.mkdirSync(TARGET_DIR_PUBLIC, { recursive: true });
fs.mkdirSync(TARGET_DIR_ROOT, { recursive: true });
fs.mkdirSync(TARGET_DIR_ARTIFACT, { recursive: true });

// Canonical list of all 25 avatars
export const ALL_25_AVATAR_KEYS = [
  'male-01', 'male-02', 'male-03', 'male-04', 'male-05',
  'male-06', 'male-07', 'male-08', 'male-09', 'male-10',
  'male-11', 'male-12', 'male-13',
  'female-01', 'female-02', 'female-03', 'female-04', 'female-05',
  'female-06', 'female-07', 'female-08', 'female-09', 'female-10',
  'female-11', 'female-12',
];

export async function buildContactSheet() {
  console.log('=== VERIFYING AVATAR ASSETS & COMPILING CONTACT SHEET ===\n');

  const existingPngs = [];
  const missingKeys = [];

  for (const key of ALL_25_AVATAR_KEYS) {
    const filename = `${key}.png`;
    const fullPath = path.join(TARGET_DIR_PUBLIC, filename);

    if (fs.existsSync(fullPath)) {
      const meta = await sharp(fullPath).metadata();
      if (meta.width === 512 && meta.height === 512 && meta.format === 'png') {
        existingPngs.push({ key, filename, path: fullPath, meta });
      } else {
        console.warn(`! Invalid dimensions for ${filename}: ${meta.width}x${meta.height}`);
      }
    } else {
      missingKeys.push(key);
    }
  }

  console.log(`Verified valid 512x512 PNG avatars: ${existingPngs.length} / 25`);
  if (missingKeys.length > 0) {
    console.log(`Missing avatars (${missingKeys.length}): ${missingKeys.join(', ')}`);
  }

  if (existingPngs.length === 25) {
    console.log('\nAll 25 avatars present! Generating 5x5 avatar-preview.png (2560x2560)...');
    const cols = 5;
    const rows = 5;
    const tileSize = 512;
    const composites = [];

    for (let i = 0; i < 25; i++) {
      const item = existingPngs[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      composites.push({
        input: item.path,
        left: col * tileSize,
        top: row * tileSize,
      });
    }

    const previewPublic = path.join(TARGET_DIR_PUBLIC, 'avatar-preview.png');
    const previewRoot = path.join(TARGET_DIR_ROOT, 'avatar-preview.png');
    const previewArtifact = path.join(TARGET_DIR_ARTIFACT, 'avatar-preview.png');
    const previewDirect = path.join(BRAIN_DIR, 'avatar-preview.png');

    await sharp({
      create: {
        width: cols * tileSize,
        height: rows * tileSize,
        channels: 4,
        background: { r: 245, g: 242, b: 242, alpha: 1 },
      },
    })
      .composite(composites)
      .png({ compressionLevel: 8 })
      .toFile(previewPublic);

    fs.copyFileSync(previewPublic, previewRoot);
    fs.copyFileSync(previewPublic, previewArtifact);
    fs.copyFileSync(previewPublic, previewDirect);

    const meta = await sharp(previewPublic).metadata();
    console.log(`✓ avatar-preview.png generated: ${meta.width}x${meta.height}`);
  } else if (existingPngs.length >= 15) {
    console.log(`\nCompiling interim preview for ${existingPngs.length} avatars (avatar-preview-${existingPngs.length}.png)...`);
    const cols = 5;
    const rows = Math.ceil(existingPngs.length / cols);
    const tileSize = 512;
    const composites = [];

    for (let i = 0; i < existingPngs.length; i++) {
      const item = existingPngs[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      composites.push({
        input: item.path,
        left: col * tileSize,
        top: row * tileSize,
      });
    }

    const previewName = `avatar-preview-${existingPngs.length}.png`;
    const previewPublic = path.join(TARGET_DIR_PUBLIC, previewName);
    const previewArtifact = path.join(TARGET_DIR_ARTIFACT, previewName);
    const previewDirect = path.join(BRAIN_DIR, previewName);

    await sharp({
      create: {
        width: cols * tileSize,
        height: rows * tileSize,
        channels: 4,
        background: { r: 245, g: 242, b: 242, alpha: 1 },
      },
    })
      .composite(composites)
      .png({ compressionLevel: 8 })
      .toFile(previewPublic);

    fs.copyFileSync(previewPublic, previewArtifact);
    fs.copyFileSync(previewPublic, previewDirect);

    const meta = await sharp(previewPublic).metadata();
    console.log(`✓ ${previewName} generated: ${meta.width}x${meta.height}`);
  }

  return { verifiedCount: existingPngs.length, missingKeys };
}

buildContactSheet().catch(console.error);
