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

const port = 9337;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'system3-chrome-profile');
const screenshotPath = path.join(capturesDir, 'system3-runtime-check.png');
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
        if (scene?.inventory && scene?.ui?.quickButtons) return resolve(true);
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
    const button = document.getElementById('store-all-action');
    const rect = button.getBoundingClientRect();
    const worldRect = document.getElementById('world-action').getBoundingClientRect();
    return {
      maxSlots: scene.inventory.maxSlots,
      totalCapacity: scene.inventory.totalCapacity,
      // Os 12 espaços aparecem no painel da mochila (botão no HUD ou tecla B).
      ...(() => {
        scene.toggleBackpack();
        const slots = document.querySelectorAll('#backpack-grid .bag-slot');
        const filled = document.querySelectorAll('#backpack-grid .bag-slot:not(.bag-slot--empty)');
        const result = { visualSlots: slots.length, resourceCounts: slots.length, occupiedIcons: filled.length };
        scene.backpackPanel.close();
        return result;
      })(),
      slotRight: Math.max(...scene.ui.quickButtons.map((button) => button.x + button.size)),
      mapLeft: scene.ui.mapX - scene.ui.metrics.mapSize / 2,
      storeButton: {
        hidden: button.hidden,
        disabled: button.disabled,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        worldLeft: worldRect.left
      },
      viewport: { width: innerWidth, height: innerHeight },
      storageCapacity: scene.camp.storageCapacity
    };
  })()`);
  if (initial.maxSlots !== 12 || initial.totalCapacity !== 12000 || initial.visualSlots !== 12 ||
      initial.resourceCounts !== 12 || initial.occupiedIcons !== 0) {
    throw new Error(`Mochila inicial incorreta: ${JSON.stringify(initial)}`);
  }
  if (initial.slotRight >= initial.mapLeft) {
    throw new Error(`Grade da mochila está coberta pelo minimapa: ${JSON.stringify(initial)}`);
  }
  if (initial.storeButton.hidden || initial.storeButton.height < 48 ||
      initial.storeButton.right >= initial.storeButton.worldLeft) {
    throw new Error(`Botão rápido indisponível ou sobreposto: ${JSON.stringify(initial.storeButton)}`);
  }
  if (initial.storageCapacity < initial.totalCapacity) {
    throw new Error(`Armazém não comporta a mochila completa: ${JSON.stringify(initial)}`);
  }

  const fillResult = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const types = Object.keys(scene.inventory.items);
    for (const type of types.slice(0, 11)) scene.inventory.add(type, 2);
    return {
      used: scene.inventory.usedSlots,
      full: scene.inventory.isFull
    };
  })()`);
  await delay(120);
  const fullResult = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const types = Object.keys(scene.inventory.items);
    const accepted = scene.inventory.add(types[11], 2);
    for (const type of types.slice(0, 12)) scene.inventory.add(type, scene.inventory.freeUnitsFor(type));
    return {
      accepted,
      used: scene.inventory.usedSlots,
      full: scene.inventory.isFull,
      thirteenthAccepted: scene.inventory.add(types[12], 1),
      thirteenthAmount: scene.inventory.items[types[12]]
    };
  })()`);
  await delay(180);
  const visualResult = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      message: scene.ui.message.text,
      ...(() => {
        scene.backpackPanel.open();
        const filled = [...document.querySelectorAll('#backpack-grid .bag-slot:not(.bag-slot--empty)')];
        const result = {
          visibleIcons: filled.filter((slot) => slot.querySelector('img')).length,
          visibleCounts: filled.filter((slot) => slot.querySelector('.bag-slot__count')?.textContent.length > 0).length,
          slotTypes: filled.map((slot) => slot.title),
          counts: filled.map((slot) => slot.querySelector('.bag-slot__count')?.textContent),
          label: document.getElementById('backpack-summary').textContent,
          hudCount: scene.ui.quickButtons[0].count.text
        };
        scene.backpackPanel.close();
        return result;
      })()
    };
  })()`);
  if (fillResult.used !== 11 || !acceptedValue(fullResult.accepted) || fullResult.used !== 12 ||
      fullResult.thirteenthAccepted || fullResult.thirteenthAmount !== 0) {
    throw new Error(`Limite de 12 slots não foi aplicado: ${JSON.stringify({ fillResult, fullResult })}`);
  }
  if (visualResult.message !== 'Mochila cheia! Volte ao acampamento') {
    throw new Error(`Mensagem de mochila cheia incorreta: ${JSON.stringify(visualResult)}`);
  }
  if (visualResult.visibleIcons !== 12 || visualResult.visibleCounts !== 12 ||
      visualResult.slotTypes.some((type) => !type)) {
    throw new Error(`Grade visual de 12 slots incorreta: ${JSON.stringify(visualResult)}`);
  }
  await capture();

  const storedResult = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const before = scene.inventory.total;
    document.getElementById('store-all-action').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const stored = Object.values(scene.camp.storage).reduce((sum, amount) => sum + amount, 0);
    return {
      before,
      after: scene.inventory.total,
      used: scene.inventory.usedSlots,
      stored,
      buttonText: document.getElementById('store-all-action').textContent,
      buttonDisabled: document.getElementById('store-all-action').disabled
    };
  })()`);
  if (storedResult.before <= 0 || storedResult.after !== 0 || storedResult.used !== 0 ||
      storedResult.stored < storedResult.before || !storedResult.buttonDisabled) {
    throw new Error(`Guardar tudo não esvaziou a mochila: ${JSON.stringify(storedResult)}`);
  }

  const reentryResult = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.player.body.reset(700, 500);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const awayHidden = document.getElementById('store-all-action').hidden;
    scene.player.body.reset(1440, 1165);
    await new Promise((resolve) => setTimeout(resolve, 220));
    return {
      awayHidden,
      nearHidden: document.getElementById('store-all-action').hidden,
      available: scene.storeAllAvailable
    };
  })()`);
  if (!reentryResult.awayHidden || reentryResult.nearHidden || !reentryResult.available) {
    throw new Error(`Botão não apareceu ao entrar novamente no acampamento: ${JSON.stringify(reentryResult)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.inventory.items.wood = 5;
    scene.inventory.items.stone = 3;
    scene.save();
  })()`);
  await send('Page.reload', { ignoreCache: true });
  await delay(900);
  await waitForScene();
  const persisted = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      maxSlots: scene.inventory.maxSlots,
      totalCapacity: scene.inventory.totalCapacity,
      wood: scene.inventory.items.wood,
      stone: scene.inventory.items.stone,
      saveVersion: save.version,
      capacityVersion: save.inventory.capacityVersion,
      savedSlots: save.inventory.maxSlots
    };
  })()`);
  if (persisted.maxSlots !== 12 || persisted.totalCapacity !== 12000 || persisted.wood !== 5 ||
      persisted.stone !== 3 || persisted.saveVersion !== 2 || persisted.capacityVersion !== 3 ||
      persisted.savedSlots !== 12) {
    throw new Error(`Persistência da mochila falhou: ${JSON.stringify(persisted)}`);
  }

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    fillResult,
    fullResult,
    visualResult,
    storedResult,
    reentryResult,
    persisted,
    consoleErrors: errors.length,
    screenshotPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}

function acceptedValue(value) {
  return value === true;
}
