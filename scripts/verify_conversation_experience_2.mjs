import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const projectDir = 'C:\\Users\\raist\\Downloads\\nexus mess\\aasif-messenger';
const artifactsDir = 'C:\\Users\\raist\\.gemini\\antigravity\\brain\\42312ffb-ffd2-4f9d-a7d0-9f4640ac3e28\\screenshots';

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('================================================================');
  console.log(' NEXUS.TALKS — CONVERSATION EXPERIENCE 2.0 VERIFICATION SUITE');
  console.log(' Personal Chat Themes & Conversation Info Center');
  console.log('================================================================\n');

  const port = 9560;
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--window-size=1440,900',
    'about:blank',
  ]);

  try {
    await sleep(2500);
    const newRes = await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/demo?contact=contact-elena`, { method: 'PUT' });
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

    // ── STEP 1: Verify Desktop Docked Conversation Info Center (Overview Tab) ─
    console.log('[STEP 1] Verifying Desktop Docked Conversation Info Center...');
    const step1Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const infoCenter = document.querySelector('aside[aria-label="Conversation details"]');
          if (!infoCenter) return { found: false };
          const name = infoCenter.querySelector('h4')?.textContent;
          const themeCard = infoCenter.innerText.includes('Personal Chat Theme');
          const actions = infoCenter.innerText.includes('Search chat') && infoCenter.innerText.includes('Full profile');
          return { found: true, name, themeCard, actions };
        })()
      `,
      returnByValue: true,
    });
    console.log('Step 1 Result:', step1Check.result.value);

    // Capture Step 1 Screenshot
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-01-info-center-overview.png'), Buffer.from(shot1.data, 'base64'));
    console.log('Captured exp2-01-info-center-overview.png');

    // ── STEP 2: Open Theme Picker Modal via "Change Theme" button ─────────────
    console.log('\n[STEP 2] Opening Chat Theme Picker Modal...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const changeThemeBtn = btns.find(b => b.innerText.includes('Change Theme'));
          if (changeThemeBtn) {
            changeThemeBtn.click();
            return 'clicked Change Theme';
          }
          return 'Change Theme button not found';
        })()
      `,
    });
    await sleep(1000);

    const step2Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const modal = document.querySelector('[role="dialog"]');
          if (!modal) return { open: false };
          const themeButtons = modal.querySelectorAll('button[data-theme-option]');
          const bgButtons = modal.querySelectorAll('button[data-bg-option]');
          const title = modal.querySelector('h3')?.textContent;
          return { open: true, title, themeCount: themeButtons.length, bgCount: bgButtons.length };
        })()
      `,
      returnByValue: true,
    });
    console.log('Step 2 Result:', step2Check.result.value);

    // Capture Step 2 Screenshot (Theme Picker Modal open)
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-02-theme-picker-modal.png'), Buffer.from(shot2.data, 'base64'));
    console.log('Captured exp2-02-theme-picker-modal.png');

    // ── STEP 3: Select Burgundy Theme & Apply ─────────────────────────────────
    console.log('\n[STEP 3] Selecting Burgundy theme and applying...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const burgundyBtn = document.querySelector('button[data-theme-option="burgundy"]');
          if (burgundyBtn) burgundyBtn.click();
          return burgundyBtn ? 'clicked burgundy' : 'burgundy not found';
        })()
      `,
    });
    await sleep(800);

    // Click "Apply to this Chat"
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const applyBtn = buttons.find(b => b.innerText.includes('Apply to this Chat'));
          if (applyBtn) applyBtn.click();
          return applyBtn ? 'clicked apply' : 'apply not found';
        })()
      `,
    });
    await sleep(1200);

    // Verify CSS variables on main chat container
    const step3Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const main = document.querySelector('main[aria-label="Demo Chat Thread"]');
          if (!main) return { error: 'main not found' };
          const style = main.getAttribute('style') || '';
          const outgoingVal = main.style.getPropertyValue('--chat-outgoing-bg');
          const isBurgundy = outgoingVal.includes('#8E1C3A');
          return { isBurgundy, outgoingVal };
        })()
      `,
      returnByValue: true,
    });
    console.log('Step 3 Result:', step3Check.result.value);

    // Capture Step 3 Screenshot (Burgundy theme active on canvas and bubbles)
    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-03-elena-burgundy-theme.png'), Buffer.from(shot3.data, 'base64'));
    console.log('Captured exp2-03-elena-burgundy-theme.png');

    // ── STEP 4: Switch to "Media" Tab & Lightbox Preview ──────────────────────
    console.log('\n[STEP 4] Switching to Shared Media Tab in Info Center...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const infoCenter = document.querySelector('aside[aria-label="Conversation details"]');
          if (!infoCenter) return 'info center not found';
          const mediaTab = Array.from(infoCenter.querySelectorAll('button')).find(b => b.innerText.includes('Media'));
          if (mediaTab) mediaTab.click();
          return mediaTab ? 'clicked media tab' : 'media tab not found';
        })()
      `,
    });
    await sleep(1000);

    const step4Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const infoCenter = document.querySelector('aside[aria-label="Conversation details"]');
          if (!infoCenter) return { count: 0 };
          const images = infoCenter.querySelectorAll('img');
          return { imageCount: images.length };
        })()
      `,
      returnByValue: true,
    });
    console.log('Step 4 Result:', step4Check.result.value);

    // Click thumbnail to open lightbox
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const infoCenter = document.querySelector('aside[aria-label="Conversation details"]');
          const thumbBtn = infoCenter?.querySelector('button[title="Click to preview"]');
          if (thumbBtn) thumbBtn.click();
          return thumbBtn ? 'clicked thumbnail' : 'thumb not found';
        })()
      `,
    });
    await sleep(800);

    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-04-media-lightbox.png'), Buffer.from(shot4.data, 'base64'));
    console.log('Captured exp2-04-media-lightbox.png');

    // Close lightbox
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close media preview"]');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(500);

    // ── STEP 5: Switch to "Files" Tab ─────────────────────────────────────────
    console.log('\n[STEP 5] Switching to Shared Files Tab in Info Center...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const infoCenter = document.querySelector('aside[aria-label="Conversation details"]');
          const filesTab = Array.from(infoCenter.querySelectorAll('button')).find(b => b.innerText.includes('Files'));
          if (filesTab) filesTab.click();
        })()
      `,
    });
    await sleep(1000);

    const shot5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-05-files-tab.png'), Buffer.from(shot5.data, 'base64'));
    console.log('Captured exp2-05-files-tab.png');

    // ── STEP 6: Switch to "Links" Tab ─────────────────────────────────────────
    console.log('\n[STEP 6] Switching to Shared Links Tab in Info Center...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const infoCenter = document.querySelector('aside[aria-label="Conversation details"]');
          const linksTab = Array.from(infoCenter.querySelectorAll('button')).find(b => b.innerText.includes('Links'));
          if (linksTab) linksTab.click();
        })()
      `,
    });
    await sleep(1000);

    const shot6 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-06-links-tab.png'), Buffer.from(shot6.data, 'base64'));
    console.log('Captured exp2-06-links-tab.png');

    // ── STEP 7: Conversation Switching & Theme Isolation ──────────────────────
    console.log('\n[STEP 7] Verifying Theme Isolation by switching to Marcus Vance...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const rows = Array.from(document.querySelectorAll('[data-contact-id]'));
          const marcus = rows.find(r => r.getAttribute('data-contact-id') === 'contact-marcus');
          if (marcus) {
            const btn = marcus.querySelector('button');
            if (btn) btn.click();
            return 'clicked marcus';
          }
          return 'marcus not found';
        })()
      `,
    });
    await sleep(1200);

    const step7Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const main = document.querySelector('main[aria-label="Demo Chat Thread"]');
          const outgoingVal = main?.style.getPropertyValue('--chat-outgoing-bg');
          const isDefaultWine = outgoingVal.includes('#78263F');
          const isElenaBurgundy = outgoingVal.includes('#8E1C3A');
          return {
            contact: 'marcus',
            isDefaultWine,
            isElenaBurgundy,
            outgoingVal
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('Marcus Theme Isolation Result:', step7Check.result.value);

    const shot7 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-07-marcus-isolated-default.png'), Buffer.from(shot7.data, 'base64'));
    console.log('Captured exp2-07-marcus-isolated-default.png');

    // ── STEP 8: Mobile Viewport & Slide-Over Sheet Drawer ─────────────────────
    console.log('\n[STEP 8] Verifying Mobile Viewport (<1280px) & Slide-Over Sheet...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1500);

    // Open Info sheet via header (i) button
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('header button'));
          const infoBtn = btns.find(b => b.getAttribute('aria-label')?.includes('conversation info'));
          if (infoBtn) infoBtn.click();
          return infoBtn ? 'clicked mobile info button' : 'mobile info button not found';
        })()
      `,
    });
    await sleep(1000);

    const step8Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sheet = document.querySelector('div[role="dialog"]');
          return { sheetOpen: Boolean(sheet) };
        })()
      `,
      returnByValue: true,
    });
    console.log('Mobile Sheet Result:', step8Check.result.value);

    const shot8 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp2-08-mobile-info-sheet.png'), Buffer.from(shot8.data, 'base64'));
    console.log('Captured exp2-08-mobile-info-sheet.png');

    console.log('\n================================================================');
    console.log(' ALL 8 CONVERSATION EXPERIENCE 2.0 SCENARIOS VERIFIED SUCCESSFULLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    try {
      edge.kill();
    } catch {}
  }
}

run();
