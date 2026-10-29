import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const artifactDir = 'C:\\Users\\raist\\.gemini\\antigravity\\brain\\42312ffb-ffd2-4f9d-a7d0-9f4640ac3e28\\screenshots';

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  const port = 9335;
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
    console.log('Edge browser connected:', verData.Browser);

    const pages = [
      {
        url: 'http://localhost:3000/login',
        name: 'staging-01-login-with-forgot-password-link.png',
      },
      {
        url: 'http://localhost:3000/forgot-password',
        name: 'staging-02-forgot-password-screen.png',
      },
      {
        url: 'http://localhost:3000/update-password',
        name: 'staging-03-update-password-invalid-session.png',
      },
    ];

    for (const page of pages) {
      console.log(`Navigating to ${page.url}...`);
      const newRes = await fetch(`http://127.0.0.1:${port}/json/new?${page.url}`, { method: 'PUT' });
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

      const send = (method, params = {}) =>
        new Promise((resolve, reject) => {
          const msgId = id++;
          callbacks.set(msgId, { resolve, reject });
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });

      await send('Page.enable');
      await send('DOM.enable');
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 2,
        mobile: false,
      });

      await sleep(1500);

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const buf = Buffer.from(shot.data, 'base64');

      const outPath = path.join(artifactDir, page.name);
      fs.writeFileSync(outPath, buf);
      console.log(`Saved screenshot: ${outPath}`);

      ws.close();
      await fetch(`http://127.0.0.1:${port}/json/close/${tabData.id}`);
    }
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    edge.kill();
  }
}

run();
