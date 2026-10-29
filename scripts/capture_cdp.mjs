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
  const port = 9333;
  console.log('Launching Edge on port', port);
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,900',
    'about:blank',
  ]);

  try {
    await sleep(2000);
    const verRes = await fetch(`http://127.0.0.1:${port}/json/version`);
    const verData = await verRes.json();
    console.log('Edge version data:', verData.Browser);

    const newRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/demo`, { method: 'PUT' });
    const tabData = await newRes.json();
    const wsUrl = tabData.webSocketDebuggerUrl;

    console.log('Connecting to tab CDP:', wsUrl);
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

    console.log('Waiting for page load...');
    await sleep(3000);

    // 1. Click on Elena Rostova to view active conversation with messages
    console.log('Selecting Elena Rostova contact...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('[data-contact-id]'));
          const elena = rows.find(r => r.getAttribute('data-contact-id') === 'contact-elena');
          if (elena) {
            const btn = elena.querySelector('button');
            if (btn) btn.click();
            return 'clicked elena';
          }
          return 'elena not found';
        })()
      `,
    });

    await sleep(1500);

    // Capture desktop active chat
    console.log('Capturing demo-desktop-active-chat.png...');
    const chatSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-desktop-active-chat.png'), Buffer.from(chatSnap.data, 'base64'));
    console.log('Saved demo-desktop-active-chat.png');

    // 2. Switch to Dark Mode (Midnight Wine)
    console.log('Toggling to dark mode...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'midnight-wine');
        })()
      `,
    });

    await sleep(1000);

    console.log('Capturing demo-desktop-dark.png...');
    const darkSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-desktop-dark.png'), Buffer.from(darkSnap.data, 'base64'));
    console.log('Saved demo-desktop-dark.png');

    // 3. Switch back to light, resize to mobile, and click Elena to see mobile chat view
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        })()
      `,
    });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await sleep(1000);

    console.log('Capturing demo-mobile-chat.png...');
    const mobileChatSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-mobile-chat.png'), Buffer.from(mobileChatSnap.data, 'base64'));
    console.log('Saved demo-mobile-chat.png');

    ws.close();
  } finally {
    edge.kill();
  }
}

run().catch((err) => {
  console.error('CDP script failed:', err);
  process.exit(1);
});
