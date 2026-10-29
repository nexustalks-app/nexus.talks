import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const publicDir = path.join(projectDir, 'public');

const shots = [
  {
    name: 'demo-desktop-light-v2.png',
    url: 'http://localhost:3000/demo',
    width: 1440,
    height: 900,
  },
  {
    name: 'demo-mobile-light-v2.png',
    url: 'http://localhost:3000/demo',
    width: 390,
    height: 844,
  },
];

for (const shot of shots) {
  const outPath = path.join(publicDir, shot.name);
  console.log(`Capturing ${shot.name}...`);
  try {
    execFileSync(edgePath, [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${shot.width},${shot.height}`,
      '--hide-scrollbars',
      `--screenshot=${outPath}`,
      '--virtual-time-budget=3000',
      shot.url,
    ], { timeout: 30000 });
    console.log(`Saved ${shot.name} (${fs.statSync(outPath).size} bytes)`);
  } catch (err) {
    console.error(`Error capturing ${shot.name}:`, err.message);
  }
}
