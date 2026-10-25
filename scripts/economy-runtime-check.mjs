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

const port = 9340;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'economy-chrome-profile');
const screenshotPath = path.join(capturesDir, 'economy-runtime-check.png');
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
        if (scene?.economy && scene?.coinPickups && scene?.ui?.coinLabel) return resolve(true);
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
    return {
      coins: scene.economy.coins,
      coinLabel: scene.ui.coinLabel.text,
      coinIconVisible: scene.ui.coinIcon.visible
    };
  })()`);
  if (initial.coins !== 0 || initial.coinLabel !== '0 MOEDAS' || !initial.coinIconVisible) {
    throw new Error(`HUD de moedas incorreto: ${JSON.stringify(initial)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.coinPickups.spawn(scene.player.x, scene.player.y, 7);
  })()`);
  await delay(260);
  const picked = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { coins: scene.economy.coins, coinLabel: scene.ui.coinLabel.text };
  })()`);
  if (picked.coins !== 7 || picked.coinLabel !== '7 MOEDAS') {
    throw new Error(`Drop de moedas não foi coletado: ${JSON.stringify(picked)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.economy.coins = 10;
    // Vender exige Mercado nível 2.
    scene.camp.levels.market = 2;
    scene.market.setLevel(2);
    scene.market.offers = [{ id: 'seeds', quantity: 2 }];
    scene.inventory.items.seeds = 0;
    scene.openBuilding('market');
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="buy"][data-arg="seeds"]')?.click();
  })()`);
  await delay(120);
  const bought = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      coins: scene.economy.coins,
      seeds: scene.inventory.items.seeds,
      stock: scene.market.offers[0].quantity
    };
  })()`);
  if (bought.coins !== 5 || bought.seeds !== 1 || bought.stock !== 1) {
    throw new Error(`Compra com moedas falhou: ${JSON.stringify(bought)}`);
  }
  await capture();

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="sell"]')?.click();
    scene.inventory.items.wood = 2;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="sell"][data-arg="wood"]')?.click();
  })()`);
  const sold = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { coins: scene.economy.coins, wood: scene.inventory.items.wood };
  })()`);
  if (sold.coins !== 6 || sold.wood !== 1) {
    throw new Error(`Venda por moedas falhou: ${JSON.stringify(sold)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.economy.coins = 0;
    scene.buildingMenuAction('buy', 'seeds');
  })()`);
  const insufficient = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      coins: scene.economy.coins,
      seeds: scene.inventory.items.seeds,
      stock: scene.market.offers[0].quantity,
      message: scene.lastBuildingMessage
    };
  })()`);
  if (insufficient.coins !== 0 || insufficient.seeds !== 1 || insufficient.stock !== 1 ||
      !insufficient.message.includes('Moedas insuficientes')) {
    throw new Error(`Compra sem moedas não foi bloqueada: ${JSON.stringify(insufficient)}`);
  }

  // Elite: 10–20 moedas; noturno: 3–8; baú: 10–30, que caem no chão.
  const drops = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const { Enemy } = await import('/src/game/Enemies.js');
    const sample = (type, options) => {
      const enemy = new Enemy(scene, scene.player.x + 400, scene.player.y, type, options);
      scene.enemies.push(enemy);
      const before = scene.coinPickups.pickups.length;
      scene.defeatEnemy(enemy);
      return scene.coinPickups.pickups[before]?.amount ?? null;
    };
    const elite = Array.from({ length: 6 }, () => sample('wolf', { elite: true }));
    const night = Array.from({ length: 6 }, () => sample('skeleton', { isNight: true }));
    scene.coinPickups.clear();
    const chest = scene.harvestStructures.state.structures.find((entry) => entry.type === 'chest' && entry.available);
    for (const type of Object.keys(scene.inventory.items)) scene.inventory.items[type] = 0;
    scene.player.body.reset(chest.x + 18, chest.y + 6);
    const coinsBefore = scene.economy.coins;
    scene.collectHarvestStructure(chest);
    const chestPickup = scene.coinPickups.pickups[0]?.amount ?? null;
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { elite, night, chestPickup, chestCollected: scene.economy.coins - coinsBefore, message: scene.ui.message.text };
  })()`);
  if (!drops.elite.every((value) => value >= 10 && value <= 20) || !drops.night.every((value) => value >= 3 && value <= 8)) {
    throw new Error(`Faixas de moedas erradas: ${JSON.stringify(drops)}`);
  }
  if (!(drops.chestPickup >= 10 && drops.chestPickup <= 30) || drops.chestCollected !== drops.chestPickup || !drops.message.includes('moedas')) {
    throw new Error(`Moedas do baú: ${JSON.stringify(drops)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.economy.coins = 8;
    scene.save();
  })()`);
  await send('Page.reload', { ignoreCache: true });
  await delay(900);
  await waitForScene();
  const persisted = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      coins: scene.economy.coins,
      coinLabel: scene.ui.coinLabel.text,
      savedCoins: save.economy.coins,
      saveVersion: save.version
    };
  })()`);
  if (persisted.coins !== 8 || persisted.coinLabel !== '8 MOEDAS' ||
      persisted.savedCoins !== 8 || persisted.saveVersion !== 2) {
    throw new Error(`Persistência das moedas falhou: ${JSON.stringify(persisted)}`);
  }

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    picked,
    bought,
    sold,
    insufficient,
    drops,
    persisted,
    consoleErrors: errors.length,
    screenshotPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}
