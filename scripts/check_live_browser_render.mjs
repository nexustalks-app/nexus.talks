import { spawn } from 'child_process';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkUrl(url) {
  const port = 9777;
  const edge = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--window-size=1280,800',
    'about:blank',
  ]);

  try {
    await sleep(2000);
    const newRes = await fetch(`http://127.0.0.1:${port}/json/new?${url}`, { method: 'PUT' });
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

    const doc = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return {
            url: window.location.href,
            title: document.title,
            h1: document.querySelector('h1')?.innerText || '',
            bodyText: document.body?.innerText?.slice(0, 300) || '',
            is404: document.title.includes('404') || document.body.innerText.includes('This page could not be found')
          };
        })()
      `,
      returnByValue: true,
    });

    console.log(url + ' Result:\n', JSON.stringify(doc.result.value, null, 2));
    ws.close();
  } finally {
    edge.kill();
  }
}

async function main() {
  await checkUrl('http://localhost:3000/');
  await checkUrl('http://localhost:3000/demo');
  await checkUrl('http://localhost:3000/login');
  await checkUrl('http://localhost:3000/conversations');
}

main().catch(console.error);
