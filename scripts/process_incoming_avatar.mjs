import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const BRAIN_DIR = 'C:/Users/raist/.gemini/antigravity/brain/42312ffb-ffd2-4f9d-a7d0-9f4640ac3e28';
const PROJECT_DIR = 'C:/Users/raist/Downloads/nexus mess/aasif-messenger';

export async function processAvatar(key, srcPath) {
  const filename = `${key}.png`;
  const targets = [
    path.join(PROJECT_DIR, 'public', 'avatar-assets', filename),
    path.join(PROJECT_DIR, 'avatar-assets', filename),
    path.join(BRAIN_DIR, 'avatar-assets', filename),
  ];

  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    await sharp(srcPath)
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(t);
    const meta = await sharp(t).metadata();
    console.log(`✓ Saved ${key} to ${t}: ${meta.width}x${meta.height} (${meta.format})`);
  }
}

const [,, key, srcPath] = process.argv;
if (key && srcPath) {
  processAvatar(key, srcPath).catch(console.error);
}
