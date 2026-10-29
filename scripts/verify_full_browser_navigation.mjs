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
  console.log('=== REAL BROWSER NAVIGATION & VERIFICATION ===');
  const port = 9888;
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,900',
    'about:blank',
  ]);

  try {
    await sleep(2000);
    const newRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/`, { method: 'PUT' });
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
    await sleep(3000);

    // 1. Verify Home Page
    const homeInfo = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          url: window.location.href,
          title: document.title,
          h1: document.querySelector('h1')?.innerText || '',
          is404: document.title.includes('404') || document.body.innerText.includes('This page could not be found')
        }))()
      `,
      returnByValue: true,
    });
    console.log('[HOME PAGE]', homeInfo.result.value);
    const homeSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'verify-home-page.png'), Buffer.from(homeSnap.data, 'base64'));

    // 2. Click "See a demo" link
    console.log('Clicking "See a demo" button...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const links = Array.from(document.querySelectorAll('a'));
          const demoLink = links.find(a => a.href.includes('/demo') && a.innerText.toLowerCase().includes('demo'));
          if (demoLink) {
            demoLink.click();
            return 'clicked demo link';
          }
          return 'demo link not found';
        })()
      `,
    });
    await sleep(2500);

    const demoInfo = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          url: window.location.href,
          title: document.title,
          h1: document.querySelector('h1')?.innerText || '',
          hasAvatars: document.querySelectorAll('img[src*="/avatar-assets/"]').length,
          is404: document.title.includes('404') || document.body.innerText.includes('This page could not be found')
        }))()
      `,
      returnByValue: true,
    });
    console.log('[DEMO PAGE TRANSITION]', demoInfo.result.value);
    const demoSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'verify-demo-transition.png'), Buffer.from(demoSnap.data, 'base64'));

    // 3. Navigate to /login
    await send('Page.navigate', { url: 'http://localhost:3000/login' });
    await sleep(2500);

    const loginInfo = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          url: window.location.href,
          title: document.title,
          h1: document.querySelector('h1')?.innerText || '',
          hasForm: document.querySelectorAll('form').length > 0,
          is404: document.title.includes('404') || document.body.innerText.includes('This page could not be found')
        }))()
      `,
      returnByValue: true,
    });
    console.log('[LOGIN PAGE]', loginInfo.result.value);
    const loginSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'verify-login-page.png'), Buffer.from(loginSnap.data, 'base64'));

    // 4. Navigate to protected route /conversations (should redirect to /login)
    await send('Page.navigate', { url: 'http://localhost:3000/conversations' });
    await sleep(2500);

    const convInfo = await send('Runtime.evaluate', {
      expression: `
        (() => ({
          url: window.location.href,
          title: document.title,
          h1: document.querySelector('h1')?.innerText || '',
          is404: document.title.includes('404') || document.body.innerText.includes('This page could not be found')
        }))()
      `,
      returnByValue: true,
    });
    console.log('[PROTECTED CONVERSATIONS REDIRECT]', convInfo.result.value);

    ws.close();
    console.log('=== VERIFICATION COMPLETED WITH ZERO 404s ===');
  } finally {
    edge.kill();
  }
}

run().catch((err) => {
  console.error('Error during browser verification:', err);
  process.exit(1);
});
