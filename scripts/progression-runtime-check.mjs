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

const port = 9339;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'progression-chrome-profile');
const screenshotPath = path.join(capturesDir, 'progression-runtime-check.png');
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
        if (scene?.progression && scene?.levelUpOverlay && scene?.ui?.xpFill) return resolve(true);
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
      level: scene.progression.level,
      xp: scene.progression.xp,
      maxHealth: scene.player.maxHealth,
      attack: scene.player.attack,
      defense: scene.player.defense,
      xpLabel: scene.ui.xpLabel.text,
      xpBarWidth: scene.ui.xpFill.width,
      enemyXp: scene.enemies.map((enemy) => enemy.definition.xp),
      levelPanelHidden: document.getElementById('level-up-panel').hidden
    };
  })()`);
  if (initial.level !== 1 || initial.xp !== 0 || initial.maxHealth !== 100 ||
      initial.attack !== 12 || initial.defense !== 0 || !initial.xpLabel.includes('NÍVEL 1') ||
      !initial.levelPanelHidden) {
    throw new Error(`Progressão inicial incorreta: ${JSON.stringify(initial)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.experiencePickups.spawn(scene.player.x, scene.player.y, 10);
  })()`);
  await delay(250);
  const picked = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { xp: scene.progression.xp, level: scene.progression.level };
  })()`);
  if (picked.xp !== 10 || picked.level !== 1) {
    throw new Error(`XP não foi coletado do drop: ${JSON.stringify(picked)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.experiencePickups.spawn(scene.player.x, scene.player.y, 90);
  })()`);
  await delay(300);
  const levelUp = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const panel = document.getElementById('level-up-panel');
    const attack = document.getElementById('level-up-attack').getBoundingClientRect();
    const defense = document.getElementById('level-up-defense').getBoundingClientRect();
    const health = document.getElementById('level-up-health').getBoundingClientRect();
    return {
      level: scene.progression.level,
      xp: scene.progression.xp,
      maxHealth: scene.player.maxHealth,
      attack: scene.player.attack,
      defense: scene.player.defense,
      pending: scene.progression.hasPendingChoice,
      panelHidden: panel.hidden,
      title: document.getElementById('level-up-title').textContent,
      attackHeight: attack.height,
      defenseHeight: defense.height,
      healthHeight: health.height,
      buttons: [...document.querySelectorAll('#level-up-attributes button')].map((button) => button.textContent.trim()),
      clock: scene.dayNight.cycleTime
    };
  })()`);
  if (levelUp.level !== 2 || levelUp.xp !== 0 || levelUp.maxHealth !== 100 ||
      levelUp.attack !== 12 || levelUp.defense !== 0 || !levelUp.pending ||
      levelUp.panelHidden || levelUp.title !== 'NÍVEL 2' ||
      levelUp.attackHeight < 48 || levelUp.defenseHeight < 48 || levelUp.healthHeight < 48 ||
      levelUp.buttons.join('|') !== '+15 VIDA MÁXIMA|+3 ATAQUE|+2 DEFESA') {
    throw new Error(`Subida de nível ou escolha ficou incorreta: ${JSON.stringify(levelUp)}`);
  }
  await capture();

  // O jogo fica pausado enquanto a escolha está aberta: o relógio não anda.
  await delay(600);
  const pausedClock = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').dayNight.cycleTime`);
  if (pausedClock !== levelUp.clock) {
    throw new Error(`O relógio andou com a escolha de nível aberta: ${levelUp.clock} -> ${pausedClock}`);
  }

  const choseAttack = await evaluate(`(async () => {
    document.getElementById('level-up-attack').click();
    await new Promise((resolve) => setTimeout(resolve, 120));
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      attack: scene.player.attack,
      defense: scene.player.defense,
      pending: scene.progression.hasPendingChoice,
      panelHidden: document.getElementById('level-up-panel').hidden
    };
  })()`);
  if (choseAttack.attack !== 15 || choseAttack.defense !== 0 || choseAttack.pending || !choseAttack.panelHidden) {
    throw new Error(`Escolha de ataque falhou: ${JSON.stringify(choseAttack)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.experiencePickups.spawn(scene.player.x, scene.player.y, 200);
  })()`);
  await delay(300);
  await evaluate(`document.getElementById('level-up-defense').click()`);
  await delay(120);
  const choseDefense = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      level: scene.progression.level,
      attack: scene.player.attack,
      defense: scene.player.defense,
      maxHealth: scene.player.maxHealth
    };
  })()`);
  if (choseDefense.level !== 3 || choseDefense.attack !== 15 || choseDefense.defense !== 2 || choseDefense.maxHealth !== 100) {
    throw new Error(`Escolha de defesa falhou: ${JSON.stringify(choseDefense)}`);
  }

  // Nível 4 (300 XP): escolhe +15 de vida máxima.
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.experiencePickups.spawn(scene.player.x, scene.player.y, 300);
  })()`);
  await delay(300);
  await evaluate(`document.getElementById('level-up-health').click()`);
  await delay(120);
  const choseHealth = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { level: scene.progression.level, maxHealth: scene.player.maxHealth };
  })()`);
  if (choseHealth.level !== 4 || choseHealth.maxHealth !== 115) {
    throw new Error(`Escolha de vida falhou: ${JSON.stringify(choseHealth)}`);
  }

  // Elite vale o dobro de XP.
  const eliteXp = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const { Enemy } = await import('/src/game/Enemies.js');
    const wolf = new Enemy(scene, scene.player.x + 300, scene.player.y, 'wolf', { elite: true });
    scene.enemies.push(wolf);
    const before = scene.experiencePickups.pickups.length;
    scene.defeatEnemy(wolf);
    const pickup = scene.experiencePickups.pickups[before];
    return pickup?.amount ?? null;
  })()`);
  if (eliteXp !== 40) throw new Error(`Lobo elite deveria dar 40 XP: ${eliteXp}`);

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.progression.xp = 17;
    scene.save();
  })()`);
  await send('Page.reload', { ignoreCache: true });
  await delay(900);
  await waitForScene();
  const persisted = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      level: scene.progression.level,
      xp: scene.progression.xp,
      attack: scene.player.attack,
      defense: scene.player.defense,
      maxHealth: scene.player.maxHealth,
      savedLevel: save.progression.level,
      savedAttackPoints: save.progression.attackPoints,
      savedDefensePoints: save.progression.defensePoints,
      saveVersion: save.version
    };
  })()`);
  if (persisted.level !== 4 || persisted.xp !== 17 || persisted.attack !== 15 ||
      persisted.defense !== 2 || persisted.maxHealth !== 115 || persisted.savedLevel !== 4 ||
      persisted.savedAttackPoints !== 1 || persisted.savedDefensePoints !== 1 || persisted.saveVersion !== 2) {
    throw new Error(`Persistência da progressão falhou: ${JSON.stringify(persisted)}`);
  }

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    picked,
    levelUp,
    choseAttack,
    choseDefense,
    persisted,
    consoleErrors: errors.length,
    screenshotPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}
