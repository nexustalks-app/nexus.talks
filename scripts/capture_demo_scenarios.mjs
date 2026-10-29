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
  console.log('=== CDP DEMO VISUAL VERIFICATION & SCREENSHOTS ===');
  const port = 9555;
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
    await sleep(3500);

    // 1. Select Elena Rostova
    console.log('Selecting Elena Rostova...');
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
          return 'not found';
        })()
      `,
    });
    await sleep(1500);

    const chatSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-elena-active-chat.png'), Buffer.from(chatSnap.data, 'base64'));
    console.log('[SAVED] demo-elena-active-chat.png');

    // 2. Click on Elena's Story in Status Strip
    console.log('Clicking on Elena Rostova story in status strip...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button[aria-label*="Elena"]'));
          if (btns.length > 0) {
            btns[0].click();
            return 'clicked story button';
          }
          return 'story button not found';
        })()
      `,
    });
    await sleep(1500);

    const storySnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-status-viewer-avatar.png'), Buffer.from(storySnap.data, 'base64'));
    console.log('[SAVED] demo-status-viewer-avatar.png');

    // Close story
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close stories"]');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(1000);

    // 3. Switch to Dark Mode (Midnight Wine)
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

    const darkSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-dark-wine-avatars.png'), Buffer.from(darkSnap.data, 'base64'));
    console.log('[SAVED] demo-dark-wine-avatars.png');

    ws.close();
    console.log('=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  } finally {
    edge.kill();
  }
}

run().catch((err) => {
  console.error('Error during CDP screenshots:', err);
  process.exit(1);
});
