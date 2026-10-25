import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe')
];
const chrome = chromeCandidates.find((candidate) => candidate && fs.existsSync(candidate));
if (!chrome) throw new Error('Chrome não encontrado para o smoke test.');

const port = 9338;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'map-chrome-profile');
const screenshotPath = path.join(capturesDir, 'map-runtime-check.png');
fs.rmSync(userDataDir, { recursive: true, force: true });
fs.mkdirSync(userDataDir, { recursive: true });
fs.mkdirSync(capturesDir, { recursive: true });

const browser = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=390,844',
  'http://127.0.0.1:5173/'
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
const pending = new Map();
const errors = [];
let messageId = 0;

try {
  let page;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await response.json();
      page = pages.find((entry) => entry.type === 'page' && entry.url.includes('127.0.0.1:5173'));
      if (page) break;
    } catch {
      // Chrome ainda está initializing.
    }
    await delay(250);
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
    const response = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result.value;
  };
  const waitForScene = async () => {
    await evaluate(`new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const scene = window.__LENDAS__?.scene?.getScene('GameScene');
        if (scene?.inventory && scene?.worldMap && scene?.ui?.backpackSlots) return resolve(true);
        if (Date.now() - started > 12000) return reject(new Error('GameScene não iniciou.'));
        setTimeout(check, 100);
      };
      check();
    })`);
    await delay(350);
  };
  const capture = async () => {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await waitForScene();

  const initial = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const root = document.getElementById('world-map');
    return {
      mapHidden: root.hidden,
      worldFogOverlay: Boolean(scene.world.fogOverlay),
      worldFogTexture: scene.textures.exists('world-exploration-fog'),
      revealedCells: scene.world.getRevealedCells().length,
      canvasWidth: document.getElementById('world-map-canvas').width,
      canvasHeight: document.getElementById('world-map-canvas').height
    };
  })()`);
  if (!initial.mapHidden || initial.worldFogOverlay || initial.worldFogTexture || initial.revealedCells <= 0 ||
      initial.canvasWidth !== 960 || initial.canvasHeight !== 720) {
    throw new Error(`Estado inicial do mapa incorreto: ${JSON.stringify(initial)}`);
  }

  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'm', code: 'KeyM', keyCode: 77, which: 77, bubbles: true
  }))`);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', {
    key: 'm', code: 'KeyM', keyCode: 77, which: 77, bubbles: true
  }))`);
  await delay(180);
  const opened = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const root = document.getElementById('world-map');
    const canvas = document.getElementById('world-map-canvas');
    const close = document.getElementById('world-map-close');
    const rect = canvas.getBoundingClientRect();
    const closeRect = close.getBoundingClientRect();
    const chest = scene.harvestStructures.state.structures.find((structure) => structure.type === 'chest');
    if (chest) chest.discovered = true;
    if (scene.enemies[0]) scene.enemies[0].isElite = true;
    scene.worldMap.render();
    return {
      isOpen: scene.worldMap.isOpen,
      rootHidden: root.hidden,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
      closeHeight: closeRect.height,
      counts: { ...scene.worldMap.lastMarkerCounts }
    };
  })()`);
  if (!opened.isOpen || opened.rootHidden || opened.canvasWidth <= 0 || opened.canvasHeight <= 0 ||
      opened.closeHeight < 48 || opened.counts.camp !== 1 || opened.counts.player !== 1 ||
      opened.counts.chests < 1 || opened.counts.strongEnemies < 1) {
    throw new Error(`Mapa fullscreen ou marcadores incorretos: ${JSON.stringify(opened)}`);
  }
  await capture();

  const closed = await evaluate(`(() => {
    document.getElementById('world-map-close').click();
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      isOpen: scene.worldMap.isOpen,
      rootHidden: document.getElementById('world-map').hidden
    };
  })()`);
  if (closed.isOpen || !closed.rootHidden) {
    throw new Error(`Botão fechar do mapa falhou: ${JSON.stringify(closed)}`);
  }

  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'm', code: 'KeyM', keyCode: 77, which: 77, bubbles: true
  }))`);
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', {
    key: 'm', code: 'KeyM', keyCode: 77, which: 77, bubbles: true
  }))`);
  await delay(100);
  const reopened = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').worldMap.isOpen`);
  if (!reopened) throw new Error('Tecla M não reabriu o mapa.');

  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true
  }))`);
  await delay(100);
  const escaped = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').worldMap.isOpen`);
  if (escaped) throw new Error('ESC não fechou o mapa.');

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    opened,
    closed,
    reopened,
    escaped,
    consoleErrors: errors.length,
    screenshotPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}
