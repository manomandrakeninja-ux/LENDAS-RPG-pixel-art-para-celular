import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Smoke test da esquiva, consumíveis, combo, talentos e preços de venda no jogo real.
// Requer `npm run dev` ativo em 127.0.0.1:5173.
const root = path.resolve('.');
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe')
];
const chrome = chromeCandidates.find((candidate) => candidate && fs.existsSync(candidate));
if (!chrome) throw new Error('Chrome não encontrado para o smoke test.');

const port = 9347;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'gameplay-chrome-profile');
const screenshotPath = path.join(capturesDir, 'gameplay-runtime-check.png');
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
  '--window-size=960,640',
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
      // Chrome ainda está iniciando.
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
  const pressKey = async (key, code, keyCode) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
    await delay(60);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
  };
  const scene = `window.__LENDAS__.scene.getScene('GameScene')`;

  await send('Runtime.enable');
  await send('Page.enable');
  await evaluate(`new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const s = window.__LENDAS__?.scene?.getScene('GameScene');
      if (s?.player && s?.levelUpOverlay) return resolve(true);
      if (Date.now() - started > 12000) return reject(new Error('GameScene não iniciou.'));
      setTimeout(check, 100);
    };
    check();
  })`);
  await delay(400);
  await evaluate(`localStorage.clear()`);
  await send('Page.reload', { ignoreCache: true });
  await delay(1200);
  await evaluate(`new Promise((resolve) => { const c = () => ${scene}?.player ? resolve() : setTimeout(c, 100); c(); })`);
  await delay(400);
  await send('Runtime.evaluate', { expression: 'window.focus()' });

  // 1. Esquiva: deve deslocar bem mais que um único frame (~7px antes da correção).
  // Parado, o personagem mira na direção do ponteiro; por isso medimos a distância, não o sentido.
  await evaluate(`(() => { const s = ${scene};
    s.player.body.reset(1440, 1240); s.player.stamina = 100; s.player.dodgeCooldown = 0; })()`);
  await pressKey(' ', 'Space', 32);
  await delay(350);
  const dodge = await evaluate(`(() => { const s = ${scene};
    return { moved: Math.round(Math.hypot(s.player.x - 1440, s.player.y - 1240)), stamina: Math.round(s.player.stamina) }; })()`);
  if (dodge.moved < 40) throw new Error(`Esquiva curta demais: ${JSON.stringify(dodge)}`);

  // 2. Poção pela tecla 1 e comida pela tecla 2.
  await evaluate(`(() => { const s = ${scene}; s.inventory.add('potion', 1); s.inventory.add('food', 2); s.player.health = 30; })()`);
  await pressKey('1', 'Digit1', 49);
  await delay(150);
  await pressKey('2', 'Digit2', 50);
  await delay(150);
  const consumables = await evaluate(`(() => { const s = ${scene}; return {
    health: s.player.health, potion: s.inventory.items.potion, food: s.inventory.items.food
  }; })()`);
  if (consumables.health !== 30 + 50 + 12 || consumables.potion !== 0 || consumables.food !== 1) {
    throw new Error(`Consumíveis falharam: ${JSON.stringify(consumables)}`);
  }

  // 3. Toque no botão COMER da barra rápida também consome.
  const tapped = await evaluate(`(() => {
    const s = ${scene};
    s.player.health = 50;
    s.ui.update(s.player, s.inventory, s.progression, s.economy, s.camp, {
      isNight: false, label: '', dayCount: 1, phase: 'day', warningActive: false, secondsUntilNight: 0
    }, null, null, null, null, true, s.enemies, s.world, false);
    const button = s.ui.quickButtons.find((entry) => entry.id === 'eat');
    const rect = s.game.canvas.getBoundingClientRect();
    const bx = button.x + 10, by = button.y + 10;
    return { x: rect.left + bx * rect.width / s.scale.width, y: rect.top + by * rect.height / s.scale.height };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: tapped.x, y: tapped.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tapped.x, y: tapped.y, button: 'left', clickCount: 1 });
  await delay(150);
  const afterTap = await evaluate(`(() => { const s = ${scene}; return { health: s.player.health, food: s.inventory.items.food }; })()`);
  if (afterTap.health !== 62 || afterTap.food !== 0) throw new Error(`Toque no slot falhou: ${JSON.stringify(afterTap)}`);

  // 4. Combo: o terceiro golpe encadeado é o golpe final com dano 1,5x.
  const combo = await evaluate(`(async () => {
    const s = ${scene};
    const enemy = s.enemies.find((entry) => !entry.isBoss);
    if (!enemy) return { error: 'sem inimigos' };
    enemy.health = enemy.maxHealth = 9999;
    s.player.body.reset(enemy.x - 20, enemy.y);
    const damages = [];
    for (let i = 0; i < 3; i += 1) {
      const before = enemy.health;
      s.player.attackCooldown = 0;
      enemy.body.reset(s.player.x + 20, s.player.y);
      s.attackNearby();
      damages.push(before - enemy.health);
      await new Promise((r) => setTimeout(r, 120));
    }
    return { damages, step: s.comboStep, attack: s.player.attack };
  })()`);
  if (combo.error || combo.damages[0] !== combo.attack || combo.damages[2] !== Math.round(combo.attack * 1.5)) {
    throw new Error(`Combo falhou: ${JSON.stringify(combo)}`);
  }

  // 5. Talento no nível 5: atributo primeiro, depois três opções de talento.
  await evaluate(`(() => { const s = ${scene}; s.player.body.reset(1440, 1165); s.collectExperience(100 + 200 + 300 + 400); })()`);
  await delay(150);
  for (let i = 0; i < 4; i += 1) {
    await evaluate(`document.getElementById('level-up-attack').click()`);
    await delay(80);
  }
  const perkPanel = await evaluate(`(() => ({
    hidden: document.getElementById('level-up-panel').hidden,
    title: document.getElementById('level-up-title').textContent,
    buttons: [...document.querySelectorAll('#level-up-perks [data-perk]')].map((b) => b.dataset.perk),
    attributesHidden: document.getElementById('level-up-attributes').hidden
  }))()`);
  if (perkPanel.hidden || perkPanel.buttons.length !== 3 || !perkPanel.attributesHidden) {
    throw new Error(`Painel de talentos incorreto: ${JSON.stringify(perkPanel)}`);
  }
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  await evaluate(`document.querySelector('#level-up-perks [data-perk]').click()`);
  await delay(120);
  const perk = await evaluate(`(() => { const s = ${scene}; const save = JSON.parse(localStorage.getItem('lendas-save-v2')); return {
    perks: s.progression.perks, pending: s.progression.hasPendingChoice,
    panelHidden: document.getElementById('level-up-panel').hidden, savedPerks: save.progression.perks
  }; })()`);
  if (perk.perks.length !== 1 || perk.pending || !perk.panelHidden || perk.savedPerks.length !== 1) {
    throw new Error(`Escolha de talento falhou: ${JSON.stringify(perk)}`);
  }

  // 6. Venda com preço por item.
  const sale = await evaluate(`(() => { const s = ${scene};
    s.camp.levels.market = 2; s.market.setLevel(2); s.inventory.add('gold', 1); const before = s.economy.coins;
    const result = s.buildingMenuAction('sell', 'gold');
    return { ok: result.ok, gained: s.economy.coins - before, message: result.message };
  })()`);
  if (!sale.ok || sale.gained !== 6) throw new Error(`Venda de ouro falhou: ${JSON.stringify(sale)}`);

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);
  console.log(JSON.stringify({ dodge, consumables, afterTap, combo, perkPanel, perk, sale, consoleErrors: 0, screenshotPath }, null, 2));
  socket.close();
} finally {
  browser.kill();
}
