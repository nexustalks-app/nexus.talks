import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const publicDir = path.join(projectDir, 'public');
const artifactsDir = 'C:\\Users\\raist\\.gemini\\antigravity\\brain\\42312ffb-ffd2-4f9d-a7d0-9f4640ac3e28\\screenshots';

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('=== CDP DEMO VISUAL REFINEMENT VERIFICATION ===');
  const port = 9557;
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

    // 1. Audit Light Mode Computed Styles
    console.log('\n--- AUDITING LIGHT MODE STYLES ---');
    const lightAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const results = {};
          // Story strip
          const storyBtns = Array.from(document.querySelectorAll('section[aria-label*="Nexus Moments"] button'));
          if (storyBtns.length > 0) {
            const firstStory = storyBtns[0];
            const ringEl = firstStory.querySelector('.relative.rounded-full');
            const nameEl = firstStory.querySelector('span');
            results.storyRingPadding = ringEl ? window.getComputedStyle(ringEl).padding : 'N/A';
            results.storyNameWeight = nameEl ? window.getComputedStyle(nameEl).fontWeight : 'N/A';
            results.storyNameColor = nameEl ? window.getComputedStyle(nameEl).color : 'N/A';
          }
          // Contact list rows
          const rows = Array.from(document.querySelectorAll('[data-contact-id]'));
          if (rows.length > 0) {
            const firstRow = rows[0];
            const nameSpan = firstRow.querySelector('.min-w-0 span');
            results.contactNameWeight = nameSpan ? window.getComputedStyle(nameSpan).fontWeight : 'N/A';
            results.contactNameColor = nameSpan ? window.getComputedStyle(nameSpan).color : 'N/A';
          }
          // Header contact name
          const headerH2 = document.querySelector('header h2');
          results.headerNameWeight = headerH2 ? window.getComputedStyle(headerH2).fontWeight : 'N/A';
          results.headerNameColor = headerH2 ? window.getComputedStyle(headerH2).color : 'N/A';
          return results;
        })()
      `,
      returnByValue: true,
    });
    console.log('Light Mode Audit:', JSON.stringify(lightAudit.result.value, null, 2));

    // Save Light Desktop Screenshot
    const lightDesktopSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-refinement-light-desktop.png'), Buffer.from(lightDesktopSnap.data, 'base64'));
    fs.writeFileSync(path.join(artifactsDir, 'demo-refinement-light-desktop.png'), Buffer.from(lightDesktopSnap.data, 'base64'));
    console.log('[SAVED] demo-refinement-light-desktop.png');

    // 2. Switch to Dark Mode (midnight-wine)
    console.log('\n--- SWITCHING TO DARK MODE ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'midnight-wine');
          localStorage.setItem('nexus_theme', 'midnight-wine');
          return document.documentElement.className;
        })()
      `,
    });
    await sleep(1000);

    // Audit Dark Mode Computed Styles
    const darkAudit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const results = {};
          // Story strip
          const storyBtns = Array.from(document.querySelectorAll('section[aria-label*="Nexus Moments"] button'));
          if (storyBtns.length > 0) {
            const firstStory = storyBtns[0];
            const ringEl = firstStory.querySelector('.relative.rounded-full');
            const nameEl = firstStory.querySelector('span');
            results.storyRingPadding = ringEl ? window.getComputedStyle(ringEl).padding : 'N/A';
            results.storyNameWeight = nameEl ? window.getComputedStyle(nameEl).fontWeight : 'N/A';
            results.storyNameColor = nameEl ? window.getComputedStyle(nameEl).color : 'N/A';
          }
          // Contact list rows
          const rows = Array.from(document.querySelectorAll('[data-contact-id]'));
          if (rows.length > 0) {
            const firstRow = rows[0];
            const nameSpan = firstRow.querySelector('.min-w-0 span');
            results.contactNameWeight = nameSpan ? window.getComputedStyle(nameSpan).fontWeight : 'N/A';
            results.contactNameColor = nameSpan ? window.getComputedStyle(nameSpan).color : 'N/A';
          }
          // Header contact name
          const headerH2 = document.querySelector('header h2');
          results.headerNameWeight = headerH2 ? window.getComputedStyle(headerH2).fontWeight : 'N/A';
          results.headerNameColor = headerH2 ? window.getComputedStyle(headerH2).color : 'N/A';
          return results;
        })()
      `,
      returnByValue: true,
    });
    console.log('Dark Mode Audit:', JSON.stringify(darkAudit.result.value, null, 2));

    // Save Dark Desktop Screenshot
    const darkDesktopSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-refinement-dark-desktop.png'), Buffer.from(darkDesktopSnap.data, 'base64'));
    fs.writeFileSync(path.join(artifactsDir, 'demo-refinement-dark-desktop.png'), Buffer.from(darkDesktopSnap.data, 'base64'));
    console.log('[SAVED] demo-refinement-dark-desktop.png');

    // 3. Open Elena's Story in Status Viewer
    console.log('\n--- OPENING STORY VIEWER IN DARK MODE ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const elenaBtn = Array.from(document.querySelectorAll('button[aria-label*="Elena"]'))[0];
          if (elenaBtn) {
            elenaBtn.click();
            return 'clicked elena story';
          }
          return 'elena story button not found';
        })()
      `,
    });
    await sleep(1500);

    const darkStorySnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-refinement-dark-story.png'), Buffer.from(darkStorySnap.data, 'base64'));
    fs.writeFileSync(path.join(artifactsDir, 'demo-refinement-dark-story.png'), Buffer.from(darkStorySnap.data, 'base64'));
    console.log('[SAVED] demo-refinement-dark-story.png');

    // Close Story Viewer
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close story viewer"]');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(1000);

    // 4. Open Elena's Living Profile
    console.log('\n--- OPENING LIVING PROFILE IN DARK MODE ---');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const headerBtn = document.querySelector('header button[aria-label*="Elena"]');
          if (headerBtn) {
            headerBtn.click();
            return 'clicked header';
          }
          return 'header button not found';
        })()
      `,
    });
    await sleep(1500);

    const darkProfileSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-refinement-dark-profile.png'), Buffer.from(darkProfileSnap.data, 'base64'));
    fs.writeFileSync(path.join(artifactsDir, 'demo-refinement-dark-profile.png'), Buffer.from(darkProfileSnap.data, 'base64'));
    console.log('[SAVED] demo-refinement-dark-profile.png');

    // Close Living Profile modal
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close living profile"]');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(800);

    // 5. Mobile Viewport (390x844)
    console.log('\n--- TESTING MOBILE VIEWPORT (390x844) ---');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1500);

    const mobileSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(publicDir, 'demo-refinement-mobile.png'), Buffer.from(mobileSnap.data, 'base64'));
    fs.writeFileSync(path.join(artifactsDir, 'demo-refinement-mobile.png'), Buffer.from(mobileSnap.data, 'base64'));
    console.log('[SAVED] demo-refinement-mobile.png');

    console.log('\n=== ALL SCREENSHOTS CAPTURED & AUDIT FINISHED SUCCESSFULLY ===');
    ws.close();
  } finally {
    edge.kill();
  }
}

run().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
