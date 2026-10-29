import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const publicDir = path.join(projectDir, 'public');

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== VERIFYING AVATAR INTEGRATION IN DEMO MODE ===');
  const port = 9444;
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,900',
    'about:blank',
  ]);

  try {
    await sleep(2000);
    const newRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/demo`, { method: 'PUT' });
    const tabData = await newRes.json();
    const wsUrl = tabData.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);
    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    function send(method, params = {}) {
      const reqId = id++;
      return new Promise((resolve, reject) => {
        callbacks.set(reqId, { resolve, reject });
        ws.send(JSON.stringify({ id: reqId, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Waiting for Next.js to render /demo...');
    await sleep(4000);

    // Evaluate all rendered avatar images
    const evalResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const imgs = Array.from(document.querySelectorAll('img[src*="/avatar-assets/"]'));
          return imgs.map(img => ({
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            visible: img.offsetParent !== null
          }));
        })()
      `,
      returnByValue: true,
    });

    const avatarImgs = evalResult.result.value || [];
    console.log('Found', avatarImgs.length, 'rendered 3D avatar images on /demo:');
    avatarImgs.forEach((img, idx) => {
      console.log(`  [${idx + 1}] src="${img.src}" alt="${img.alt}" (${img.width}x${img.height}) visible=${img.visible}`);
    });

    // Check key personas
    const expectedPersonas = [
      { name: 'Mr Aasif', expectedSrc: '/avatar-assets/male-01.png' },
      { name: 'Elena Rostova', expectedSrc: '/avatar-assets/female-01.png' },
      { name: 'Marcus Vance', expectedSrc: '/avatar-assets/male-02.png' },
      { name: 'Sophia Lin', expectedSrc: '/avatar-assets/female-03.png' },
      { name: 'Julian Thorne', expectedSrc: '/avatar-assets/male-09.png' },
      { name: 'Amara Okafor', expectedSrc: '/avatar-assets/female-05.png' },
    ];

    let allFound = true;
    for (const persona of expectedPersonas) {
      const match = avatarImgs.find(img => img.src === persona.expectedSrc);
      if (match) {
        console.log(`[PASS] ${persona.name} correctly rendered -> ${persona.expectedSrc}`);
      } else {
        console.error(`[FAIL] ${persona.name} NOT found with src ${persona.expectedSrc}`);
        allFound = false;
      }
    }

    // Capture screenshot of demo showcase with 3D avatars
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    const snapPath = path.join(publicDir, 'demo-avatar-showcase.png');
    fs.writeFileSync(snapPath, Buffer.from(snap.data, 'base64'));
    console.log('[SAVED] Screenshot written to:', snapPath);

    ws.close();
    if (!allFound) {
      process.exit(1);
    }
  } finally {
    edge.kill();
  }
}

run().catch((err) => {
  console.error('Error during avatar integration verification:', err);
  process.exit(1);
});
