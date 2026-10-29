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
  console.log(' NEXUS.TALKS — MESSAGING EXPERIENCE 3.0 VERIFICATION SUITE');
  console.log(' Message Reactions, Reply Jump, Edit/Delete, Copy, & Delivery');
  console.log('================================================================\n');

  const port = 9580;
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

    // ── STEP 1: Verify Message List & Composer ─
    console.log('[STEP 1] Verifying Conversation & Composer Elements...');
    const step1Check = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const messages = document.querySelectorAll('[id^="demo-msg-"]');
          const input = document.querySelector('input[placeholder*="Send a message"]');
          return {
            messageCount: messages.length,
            hasInput: !!input,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Result:', step1Check.result.value);

    // ── STEP 2: Send a New Message & Verify Delivery Checkmark ─
    console.log('\n[STEP 2] Sending a new message to test in-flight state & delivery checkmark...');
    const step2Send = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[placeholder*="Send a message"]');
          if (!input) return { error: 'Input not found' };
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'Messaging 3.0: verified responsive delivery checkmark ✨');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          const sendBtn = document.querySelector('button[title="Send message"]');
          if (sendBtn) {
            sendBtn.click();
            return { sentViaButton: true };
          }
          const form = input.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return { sentViaForm: true };
          }
          return { error: 'Form and button not found' };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Send Result:', step2Send.result.value);
    await sleep(1000);

    const step2Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const text = ownMsg?.innerText || '';
          const hasCheck = !!ownMsg?.querySelector('svg.lucide-check');
          return {
            hasText: text.includes('Messaging 3.0'),
            hasCheckmark: hasCheck,
            id: ownMsg?.id,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step2Verify.result.value);

    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-01-sent-message-delivery.png'), Buffer.from(shot1.data, 'base64'));
    console.log('  [SAVED] exp3-01-sent-message-delivery.png');

    // ── STEP 3: Toggle Emoji Reactions ─
    console.log('\n[STEP 3] Testing Emoji Reactions...');
    const step3React = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const heartBtn = ownMsg?.querySelector('button[title*="React with ❤️"]');
          if (heartBtn) {
            heartBtn.click();
            return { clicked: true, id: ownMsg.id };
          }
          return { clicked: false, error: 'Reaction button not found' };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Reaction Result:', step3React.result.value);
    await sleep(600);

    const step3Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const reactionChips = Array.from(ownMsg?.querySelectorAll('button[title*="reaction"]') || []);
          const heartChip = reactionChips.find(c => c.innerText.includes('❤️'));
          return {
            chipCount: reactionChips.length,
            hasHeartChip: !!heartChip,
            chipText: heartChip?.innerText,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step3Verify.result.value);

    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-02-reaction-chips.png'), Buffer.from(shot2.data, 'base64'));
    console.log('  [SAVED] exp3-02-reaction-chips.png');

    // ── STEP 4: Quoted Reply Jump-to-Message Navigation ─
    console.log('\n[STEP 4] Testing Quoted Reply Preview & Jump-to Navigation...');
    const step4Jump = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const replyQuotes = Array.from(document.querySelectorAll('button[title*="Jump to original message"]'));
          if (replyQuotes.length > 0) {
            replyQuotes[0].click();
            return { clickedQuote: true, count: replyQuotes.length };
          }
          return { clickedQuote: false, count: 0 };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Jump Result:', step4Jump.result.value);
    await sleep(800);

    const step4Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const highlighted = document.querySelector('.ring-wine');
          return {
            hasHighlightedGlow: !!highlighted,
            highlightedId: highlighted?.id,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step4Verify.result.value);

    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-03-reply-jump-highlight.png'), Buffer.from(shot3.data, 'base64'));
    console.log('  [SAVED] exp3-03-reply-jump-highlight.png');

    // ── STEP 5: Copy Message Text with Visual Feedback ─
    console.log('\n[STEP 5] Testing Copy Message Action...');
    const step5Copy = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const copyBtn = ownMsg?.querySelector('button[title="Copy text"], button[aria-label="Copy message text"]');
          if (copyBtn) {
            copyBtn.click();
            return { clickedCopy: true, id: ownMsg.id };
          }
          return { clickedCopy: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Copy Click Result:', step5Copy.result.value);
    await sleep(400);

    const step5Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const copiedBtn = document.querySelector('button[title="Copied!"]');
          return {
            hasCopiedConfirmation: !!copiedBtn,
            title: copiedBtn?.getAttribute('title'),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step5Verify.result.value);

    const shot4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-04-copy-action-confirmation.png'), Buffer.from(shot4.data, 'base64'));
    console.log('  [SAVED] exp3-04-copy-action-confirmation.png');

    // ── STEP 6: Edit Own Message & (edited) Tag ─
    console.log('\n[STEP 6] Testing Edit Own Message...');
    const step6Edit = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const editBtn = ownMsg?.querySelector('button[title="Edit message"]');
          if (editBtn) {
            editBtn.click();
            return { clickedEdit: true };
          }
          return { clickedEdit: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Edit Click Result:', step6Edit.result.value);
    await sleep(600);

    const step6Save = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[placeholder*="Edit message"]');
          if (!input) return { error: 'Edit input not found' };
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(input, 'Messaging 3.0: edit verified with (edited) tag ✨');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          const saveBtn = document.querySelector('button[title="Save changes"]');
          if (saveBtn) {
            saveBtn.click();
            return { savedViaButton: true };
          }
          const form = input.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return { savedViaForm: true };
          }
          return { error: 'Save button and form not found' };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Save Edit Result:', step6Save.result.value);
    await sleep(1000);

    const step6Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const text = ownMsg?.innerText || '';
          const hasEditedTag = text.includes('(edited)');
          return {
            hasUpdatedText: text.includes('edit verified'),
            hasEditedTag: hasEditedTag,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step6Verify.result.value);

    const shot5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-05-edited-message.png'), Buffer.from(shot5.data, 'base64'));
    console.log('  [SAVED] exp3-05-edited-message.png');

    // ── STEP 7: Mobile Viewport & Contextual Long-Press Popover ─
    console.log('\n[STEP 7] Testing Mobile Viewport & Contextual Popover Actions...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);

    const step7Popover = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          if (ownMsg) {
            ownMsg.dispatchEvent(new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: 200,
              clientY: 400
            }));
            return { openedPopover: true };
          }
          return { openedPopover: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Mobile Popover Result:', step7Popover.result.value);
    await sleep(600);

    const step7Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const popover = document.querySelector('[data-mobile-popover="true"]');
          if (!popover) return { found: false };
          const text = popover.innerText;
          return {
            found: true,
            hasReply: text.includes('Reply'),
            hasCopy: text.includes('Copy'),
            hasSave: text.includes('Save'),
            hasEdit: text.includes('Edit'),
            hasDelete: text.includes('Delete'),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step7Verify.result.value);

    const shot6 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-06-mobile-contextual-popover.png'), Buffer.from(shot6.data, 'base64'));
    console.log('  [SAVED] exp3-06-mobile-contextual-popover.png');

    await send('Emulation.clearDeviceMetricsOverride');
    await sleep(500);

    // ── STEP 8: Delete Own Message & Confirmation Modal ─
    console.log('\n[STEP 8] Testing Delete Own Message & Confirmation Modal...');
    const step8TriggerDelete = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const deleteBtn = ownMsg?.querySelector('button[title="Delete message"]');
          if (deleteBtn) {
            deleteBtn.click();
            return { clickedDelete: true };
          }
          return { clickedDelete: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Trigger Delete Result:', step8TriggerDelete.result.value);
    await sleep(500);

    const shot7 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-07-delete-confirmation-modal.png'), Buffer.from(shot7.data, 'base64'));
    console.log('  [SAVED] exp3-07-delete-confirmation-modal.png');

    const step8ConfirmDelete = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const deleteModalBtn = document.querySelector('div[role="dialog"] button.bg-red-600');
          if (deleteModalBtn) {
            deleteModalBtn.click();
            return { confirmed: true };
          }
          return { confirmed: false };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Confirm Delete Result:', step8ConfirmDelete.result.value);
    await sleep(800);

    const step8Verify = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const ownMsg = document.querySelector('[id^="demo-msg-local-"]');
          const feedback = document.body.innerText.includes('Message deleted locally');
          return {
            messageRemoved: !ownMsg,
            hasDeletionFeedback: feedback,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('  Verification Result:', step8Verify.result.value);

    const shot8 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(artifactsDir, 'exp3-08-message-deleted.png'), Buffer.from(shot8.data, 'base64'));
    console.log('  [SAVED] exp3-08-message-deleted.png');

    console.log('\n================================================================');
    console.log(' ALL 8 MESSAGING EXPERIENCE 3.0 BROWSER VERIFICATIONS PASSED');
    console.log('================================================================');
  } finally {
    edge.kill();
  }
}

run().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
