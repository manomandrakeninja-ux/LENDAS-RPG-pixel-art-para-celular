import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Base comum dos testes de navegador: abre o Chrome headless no jogo (Vite em 127.0.0.1:5173),
// expõe evaluate/capture/reload e junta os erros do console.
const GAME_URL = 'http://127.0.0.1:5173/';
const root = path.resolve('.');
export const capturesDir = path.join(root, '.tmp', 'capturas');

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe')
];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function check(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runInChrome({ name, port, width = 960, height = 640, mobile = false }, body) {
  const chrome = chromeCandidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (!chrome) throw new Error('Chrome não encontrado para o teste de navegador.');
  const userDataDir = path.join(root, '.tmp', `${name}-chrome-profile`);
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.mkdirSync(capturesDir, { recursive: true });
  const browser = spawn(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`, GAME_URL
  ], { stdio: 'ignore' });

  let socket;
  const pending = new Map();
  const errors = [];
  let messageId = 0;
  try {
    let page;
    for (let attempt = 0; attempt < 60 && !page; attempt += 1) {
      try {
        const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        page = pages.find((entry) => entry.type === 'page' && entry.url.includes('127.0.0.1:5173'));
      } catch {
        // Chrome ainda está iniciando.
      }
      if (!page) await delay(250);
    }
    if (!page) throw new Error('Não foi possível conectar à página do jogo.');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        errors.push(`${message.params.entry.text}${message.params.entry.url ? ` (${message.params.entry.url})` : ''}`);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(message.params.args.map((argument) => argument.value ?? argument.description).join(' '));
      }
    });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++messageId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (response.exceptionDetails) {
        throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
      }
      return response.result.value;
    };
    /** Roda `fn(scene)` dentro da página; `fn` é serializada, então não pode usar variáveis de fora. */
    const inScene = (fn, ...args) => evaluate(`(async () => {
      const scene = window.__LENDAS__.scene.getScene('GameScene');
      return (${fn.toString()})(scene, ...${JSON.stringify(args)});
    })()`);
    const waitForScene = async () => {
      await evaluate(`new Promise((resolve, reject) => {
        const started = Date.now();
        const check = () => {
          const scene = window.__LENDAS__?.scene?.getScene('GameScene');
          if (scene?.camp?.defense && scene?.ui?.coinLabel && scene?.buildingMenu) return resolve(true);
          if (Date.now() - started > 15000) return reject(new Error('GameScene não iniciou.'));
          setTimeout(check, 100);
        };
        check();
      })`);
      await delay(400);
    };
    const capture = async (fileName) => {
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const target = path.join(capturesDir, fileName);
      fs.writeFileSync(target, Buffer.from(screenshot.data, 'base64'));
      return target;
    };
    const reload = async () => {
      await send('Page.reload', { ignoreCache: true });
      await delay(900);
      await waitForScene();
    };
    /** Começa de um save limpo. */
    const freshStart = async () => {
      await evaluate('localStorage.clear()');
      await reload();
    };

    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await waitForScene();
    const result = await body({ evaluate, inScene, capture, reload, freshStart, delay, send, errors });
    check(errors.length === 0, `Erros no console do jogo: ${JSON.stringify(errors)}`);
    console.log(JSON.stringify({ ...result, consoleErrors: errors.length }, null, 2));
    socket.close();
  } finally {
    browser.kill();
  }
}
