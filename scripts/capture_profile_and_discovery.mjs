import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const publicDir = path.join(projectDir, 'public');
const artifactsDir = 'C:\\Users\\raist\\.gemini\\antigravity\\brain\\42312ffb-ffd2-4f9d-a7d0-9f4640ac3e28\\screenshots';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const port = 9561;
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
    const ws = new WebSocket(tabData.webSocketDebuggerUrl);

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
    await new Promise((r) => (ws.onopen = r));

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

    // Switch to dark mode
    await send('Runtime.evaluate', {
      expression: `
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'midnight-wine');
        localStorage.setItem('nexus_theme', 'midnight-wine');
      `,
    });
    await sleep(600);

    // Switch directly to Discovery tab in Dark Mode
    console.log('Switching to Discovery Tab...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'midnight-wine');
          const discBtn = document.querySelector('button[title="Explore Nexus Discovery"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Nexus Discovery'));
          if (discBtn) {
            discBtn.click();
            return 'clicked discovery button';
          }
          return 'discovery button not found';
        })()
      `,
    });
    await sleep(2000);

    const discoverySnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-refinement-dark-discovery.png'), Buffer.from(discoverySnap.data, 'base64'));
    fs.writeFileSync(path.join(artifactsDir, 'demo-refinement-dark-discovery.png'), Buffer.from(discoverySnap.data, 'base64'));
    console.log('[SAVED] demo-refinement-dark-discovery.png');

    ws.close();
  } finally {
    edge.kill();
  }
}

main().catch(console.error);
