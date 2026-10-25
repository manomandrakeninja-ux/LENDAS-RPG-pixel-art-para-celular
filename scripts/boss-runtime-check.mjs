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

const port = 9341;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'boss-chrome-profile');
const screenshotPath = path.join(capturesDir, 'boss-runtime-check.png');
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
  const waitForScene = async (requireBoss = true) => {
    const requiresBoss = requireBoss ? 'true' : 'false';
    await evaluate(`new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const scene = window.__LENDAS__?.scene?.getScene('GameScene');
        if (scene?.ui?.bossHealthFill && (!${requiresBoss} || scene?.boss)) return resolve(true);
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
    const boss = scene.boss;
    const distance = Math.hypot(boss.x - scene.camp.x, boss.y - scene.camp.y);
    scene.enemies.forEach((enemy) => { enemy.isElite = false; });
    scene.worldMap.open();
    scene.worldMap.close();
    return {
      exists: Boolean(boss),
      health: boss.health,
      maxHealth: boss.maxHealth,
      damage: boss.damage,
      distance,
      patterns: [...boss.patternHistory],
      barHidden: document.getElementById('boss-health').hidden,
      mapStrongEnemies: scene.worldMap.lastMarkerCounts.strongEnemies
    };
  })()`);
  if (!initial.exists || initial.health !== 500 || initial.maxHealth !== 500 || initial.damage !== 30 ||
      initial.distance <= 800 || !initial.barHidden || initial.mapStrongEnemies !== 1) {
    throw new Error(`Estado inicial do chefe incorreto: ${JSON.stringify(initial)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    // Conversas e painéis da campanha pausam o jogo: fecha antes de testar o chefe.
    scene.campaign?.ui.closeDialogue();
    if (scene.campaign) scene.campaign.ui.reward.hidden = true;
    const boss = scene.boss;
    boss.patternCooldown = 999999;
    scene.player.body.reset(boss.x + 90, boss.y);
    scene.player.invulnerable = 999999;
    scene.cameras.main.centerOn(boss.x, boss.y);
  })()`);
  await delay(250);
  const near = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      barHidden: document.getElementById('boss-health').hidden,
      barText: document.getElementById('boss-health-values').textContent,
      barWidth: document.getElementById('boss-health-fill').style.width
    };
  })()`);
  if (near.barHidden || near.barText !== '500 / 500' || near.barWidth !== '100%') {
    throw new Error(`Barra de vida do chefe não apareceu: ${JSON.stringify(near)}`);
  }
  await capture();

  const patterns = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const boss = scene.boss;
    const result = {};
    boss.startPattern('charge');
    result.chargeStarted = boss.pattern === 'charge';
    await new Promise((resolve) => setTimeout(resolve, 740));
    result.chargeExecuted = boss.effectsCreated.includes('charge');
    boss.endPattern();

    boss.startPattern('slam');
    result.slamStarted = boss.pattern === 'slam';
    await new Promise((resolve) => setTimeout(resolve, 840));
    result.slamExecuted = boss.effectsCreated.includes('slam');
    boss.endPattern();

    boss.startPattern('volley');
    result.volleyStarted = boss.pattern === 'volley';
    await new Promise((resolve) => setTimeout(resolve, 540));
    result.volleyExecuted = boss.effectsCreated.includes('volley');
    result.projectiles = boss.projectiles.length;
    result.history = [...boss.patternHistory];
    return result;
  })()`);
  if (!patterns.chargeStarted || !patterns.chargeExecuted || !patterns.slamStarted || !patterns.slamExecuted ||
      !patterns.volleyStarted || !patterns.volleyExecuted || patterns.projectiles !== 3 ||
      patterns.history.filter((pattern) => pattern === 'charge').length !== 1 ||
      patterns.history.filter((pattern) => pattern === 'slam').length !== 1 ||
      patterns.history.filter((pattern) => pattern === 'volley').length !== 1) {
    throw new Error(`Padrões do chefe não foram executados: ${JSON.stringify(patterns)}`);
  }

  const damaged = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.boss.hit(100);
    scene.ui.updateBossHealth(scene.boss, scene.player);
    return {
      health: scene.boss.health,
      text: document.getElementById('boss-health-values').textContent
    };
  })()`);
  if (damaged.health !== 400 || damaged.text !== '400 / 500') {
    throw new Error(`Dano no chefe não foi aplicado: ${JSON.stringify(damaged)}`);
  }

  const defeated = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const boss = scene.boss;
    boss.hit(500);
    scene.defeatBoss(boss);
    scene.player.body.reset(boss.x, boss.y);
    await new Promise((resolve) => setTimeout(resolve, 300));
    scene.openBuilding('forge');
    scene.buildingMenu.refresh();
    return {
      dead: boss.dead,
      rareItem: scene.inventory.items.titanCore,
      coins: scene.economy.coins,
      recipeUnlocked: scene.camp.equipment.isRecipeUnlocked('titanBlade'),
      forgeHasRecipe: document.getElementById('building-menu-content').textContent.includes('Lâmina do Titã'),
      barHidden: document.getElementById('boss-health').hidden
    };
  })()`);
  if (!defeated.dead || defeated.rareItem !== 1 || defeated.coins !== 50 ||
      !defeated.recipeUnlocked || !defeated.forgeHasRecipe || !defeated.barHidden) {
    throw new Error(`Drop ou receita do chefe falhou: ${JSON.stringify(defeated)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.buildingMenu.close();
    scene.save();
  })()`);
  await send('Page.reload', { ignoreCache: true });
  await delay(900);
  await waitForScene(false);
  const persisted = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      bossAbsent: scene.boss === null,
      bossDefeated: save.boss.defeated,
      rareItem: scene.inventory.items.titanCore,
      coins: scene.economy.coins,
      recipeUnlocked: scene.camp.equipment.isRecipeUnlocked('titanBlade'),
      saveVersion: save.version
    };
  })()`);
  if (!persisted.bossAbsent || !persisted.bossDefeated || persisted.rareItem !== 1 ||
      persisted.coins !== 50 || !persisted.recipeUnlocked || persisted.saveVersion !== 2) {
    throw new Error(`Persistência do chefe falhou: ${JSON.stringify(persisted)}`);
  }

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    near,
    patterns,
    damaged,
    defeated,
    persisted,
    consoleErrors: errors.length,
    screenshotPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}
