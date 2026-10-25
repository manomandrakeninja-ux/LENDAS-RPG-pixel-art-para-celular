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

const port = 9335;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'system2-chrome-profile');
const screenshotPath = path.join(capturesDir, 'system2-runtime-check.png');
const farmScreenshotPath = path.join(capturesDir, 'system2-farm-panel.png');
const marketScreenshotPath = path.join(capturesDir, 'system2-market-panel.png');
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
    if (message.method === 'Runtime.consoleAPICalled' && message.params.consoleAPICalled === 'error') {
      errors.push(message.params.args.map((argument) => argument.value ?? argument.description).join(' '));
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
        if (scene?.buildingMenu && scene?.farm && scene?.market) return resolve(true);
        if (Date.now() - started > 12000) return reject(new Error('GameScene não iniciou.'));
        setTimeout(check, 100);
      };
      check();
    })`);
    await delay(300);
  };
  const pressE = async (wait = 350) => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69
    });
    await delay(wait);
  };
  const capture = async (targetPath) => {
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(targetPath, Buffer.from(screenshot.data, 'base64'));
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
    const mine = scene.harvestStructures.state.byType('mineMarker')[0];
    return {
      buildings: Object.keys(scene.camp.buildings),
      levels: { ...scene.camp.levels },
      farmPlots: scene.farm.plotCount,
      marketOffers: scene.market.offers.length,
      resourceSlots: scene.ui.resourceCounts.length,
      backpackSlots: scene.inventory.maxSlots,
      ironIcon: scene.textures.exists('resource-code-iron'),
      mine: { x: mine.x, y: mine.y },
      mineEnemies: scene.enemies.filter((enemy) => Math.hypot(enemy.x - mine.x, enemy.y - mine.y) < 240).length,
      oreVeins: scene.harvestStructures.state.byType('oreVein').length,
      viewport: { width: innerWidth, height: innerHeight }
    };
  })()`);
  if (JSON.stringify(initial.buildings) !== JSON.stringify(['forge', 'farm', 'house', 'market'])) {
    throw new Error(`Prédios incorretos: ${JSON.stringify(initial.buildings)}`);
  }
  if (initial.farmPlots !== 4 || initial.marketOffers !== 6 || initial.resourceSlots !== 12 ||
      initial.backpackSlots !== 12 || !initial.ironIcon) {
    throw new Error(`Estado inicial do Sistema 2 incorreto: ${JSON.stringify(initial)}`);
  }
  if (initial.mineEnemies < 3 || initial.oreVeins < 24) {
    throw new Error(`Mina não recebeu veios ou inimigos fortes: ${JSON.stringify(initial)}`);
  }

  const farmClick = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const sprite = scene.camp.buildings.farm.sprite;
    const view = scene.cameras.main.worldView;
    const zoom = scene.cameras.main.zoom;
    return {
      x: (sprite.x - view.x) * zoom,
      y: (sprite.y - view.y) * zoom
    };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: farmClick.x, y: farmClick.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: farmClick.x, y: farmClick.y, button: 'left', clickCount: 1 });
  await delay(250);
  const panelMetrics = await evaluate(`(() => {
    const panel = document.getElementById('building-menu');
    const buttons = [...panel.querySelectorAll('button')];
    const rect = panel.getBoundingClientRect();
    return {
      hidden: panel.hidden,
      building: panel.dataset.building,
      width: rect.width,
      height: rect.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      minButtonHeight: Math.min(...buttons.map((button) => button.getBoundingClientRect().height)),
      tabs: panel.querySelectorAll('[data-tab]').length
    };
  })()`);
  if (panelMetrics.hidden || panelMetrics.building !== 'farm' ||
      Math.abs(panelMetrics.width - panelMetrics.viewportWidth) > 2 ||
      Math.abs(panelMetrics.height - panelMetrics.viewportHeight) > 2 ||
      panelMetrics.minButtonHeight < 44 || panelMetrics.tabs !== 3) {
    throw new Error(`Painel mobile não está em tela cheia: ${JSON.stringify(panelMetrics)}`);
  }
  await capture(farmScreenshotPath);

  const farmPlant = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.inventory.items.seeds = 3;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="plant"][data-arg2="wheat"]')?.click();
    return { crop: scene.farm.plots[0].crop, seeds: scene.inventory.items.seeds };
  })()`);
  if (farmPlant.crop !== 'wheat' || farmPlant.seeds !== 2) {
    throw new Error(`Plantio não foi executado pelo painel: ${JSON.stringify(farmPlant)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.farm.plots[0].readyAt = Date.now() - 1;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="harvest"][data-arg="0"]')?.click();
  })()`);
  const farmHarvest = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { food: scene.inventory.items.food, crop: scene.farm.plots[0].crop };
  })()`);
  if (farmHarvest.food < 2 || farmHarvest.crop !== null) {
    throw new Error(`Colheita manual incorreta: ${JSON.stringify(farmHarvest)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="animals"]')?.click();
    scene.farm.animals.egg.readyAt = Date.now() - 1;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="collect-animal"][data-arg="egg"]')?.click();
  })()`);
  const animalResult = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.egg`);
  if (animalResult !== 1) throw new Error(`Produto animal não foi coletado: ${animalResult}`);

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="upgrades"]')?.click();
    Object.assign(scene.inventory.items, { wood: 30, stone: 20, seeds: 20, herbs: 20, iron: 10, coal: 5, gold: 3 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="upgrade"][data-arg="farm"]')?.click();
  })()`);
  const farmLevel2 = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { level: scene.camp.levels.farm, plots: scene.farm.plotCount };
  })()`);
  if (farmLevel2.level !== 2 || farmLevel2.plots !== 6) {
    throw new Error(`Upgrade da fazenda não ampliou os canteiros: ${JSON.stringify(farmLevel2)}`);
  }
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    Object.assign(scene.inventory.items, { wood: 30, stone: 20, seeds: 20, herbs: 20 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="upgrade"][data-arg="farm"]')?.click();
  })()`);
  const farmLevel3 = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { level: scene.camp.levels.farm, plots: scene.farm.plotCount };
  })()`);
  if (farmLevel3.level !== 3 || farmLevel3.plots !== 8) {
    throw new Error(`Upgrade final da fazenda falhou: ${JSON.stringify(farmLevel3)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.farm.plant(1, 'herb', Date.now() - 1000);
    const before = scene.camp.storage.herbs;
    scene.farm.plots[1].readyAt = Date.now() - 1;
  })()`);
  await delay(300);
  const autoHarvest = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { stored: scene.camp.storage.herbs, crop: scene.farm.plots[1].crop };
  })()`);
  if (autoHarvest.stored < 2 || autoHarvest.crop !== null) {
    throw new Error(`Colheita automática não occurred: ${JSON.stringify(autoHarvest)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.openBuilding('forge');
    Object.assign(scene.inventory.items, { stone: 10, wood: 10, iron: 10, coal: 5, gold: 3, moonherb: 5 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="craft"][data-arg="stonePickaxe"]')?.click();
    document.querySelector('[data-action="craft"][data-arg="ironSword"]')?.click();
  })()`);
  const forgeLevel1 = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      pickaxe: scene.camp.pickaxeTier,
      attack: scene.player.attack,
      baseAttack: scene.player.baseAttack,
      crafted: { ...scene.camp.equipment.crafted }
    };
  })()`);
  if (forgeLevel1.pickaxe !== 'stone' || forgeLevel1.attack !== forgeLevel1.baseAttack + 5 || !forgeLevel1.crafted.ironSword) {
    throw new Error(`Criação na ferraria falhou: ${JSON.stringify(forgeLevel1)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="upgrades"]')?.click();
    Object.assign(scene.inventory.items, { wood: 20, stone: 20, iron: 10, coal: 5, gold: 3 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="upgrade"][data-arg="forge"]')?.click();
  })()`);
  const forgeLevel2 = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').camp.levels.forge`);
  if (forgeLevel2 !== 2) throw new Error(`Ferraria não chegou ao nível 2: ${forgeLevel2}`);

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="craft"]')?.click();
    Object.assign(scene.inventory.items, { iron: 20, coal: 8, wood: 10, gold: 3, moonherb: 6 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="craft"][data-arg="steelSword"]')?.click();
  })()`);
  const steelCrafted = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').camp.equipment.has('steelSword')`);
  if (!steelCrafted) throw new Error('Espada de aço não foi desbloqueada no nível 2.');

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="upgrades"]')?.click();
    Object.assign(scene.inventory.items, { wood: 30, stone: 20, iron: 20, coal: 8, gold: 5 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="upgrade"][data-arg="forge"]')?.click();
    document.querySelector('[data-tab="craft"]')?.click();
    Object.assign(scene.inventory.items, { gold: 5, moonherb: 6, iron: 10 });
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="craft"][data-arg="sharpnessEnchantment"]')?.click();
  })()`);
  const enchantment = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { level: scene.camp.levels.forge, bonus: scene.camp.equipment.getBonuses().attack, attack: scene.player.attack, baseAttack: scene.player.baseAttack };
  })()`);
  if (enchantment.level !== 3 || enchantment.bonus !== 16 || enchantment.attack !== enchantment.baseAttack + 16) {
    throw new Error(`Encantamento simples não foi aplicado: ${JSON.stringify(enchantment)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.openBuilding('house');
    scene.inventory.items.wood = 4;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="deposit"][data-arg="wood"]')?.click();
  })()`);
  const stored = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { stored: scene.camp.storage.wood, carried: scene.inventory.items.wood };
  })()`);
  if (stored.stored !== 1 || stored.carried !== 3) throw new Error(`Armazém não.moveu o item: ${JSON.stringify(stored)}`);

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="rest"]')?.click();
    document.querySelector('[data-action="rest"]')?.click();
  })()`);
  const restStarted = await evaluate(`Boolean(window.__LENDAS__.scene.getScene('GameScene').restState)`);
  if (!restStarted) throw new Error('Descanso de 30 segundos não iniciou.');
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.restTimer?.remove(false);
    scene.restTimer = null;
    scene.restState = null;
  })()`);

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.openBuilding('market');
    scene.market.offers = [{ id: 'seeds', quantity: 2 }];
    scene.inventory.items.seeds = 0;
    scene.economy.coins = 10;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="buy"][data-arg="seeds"]')?.click();
  })()`);
  const marketBuy = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { seeds: scene.inventory.items.seeds, coins: scene.economy.coins, stock: scene.market.offers[0].quantity };
  })()`);
  if (marketBuy.seeds !== 1 || marketBuy.coins !== 7 || marketBuy.stock !== 1) {
    throw new Error(`Compra no mercado falhou: ${JSON.stringify(marketBuy)}`);
  }
  await capture(marketScreenshotPath);

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    document.querySelector('[data-tab="sell"]')?.click();
    scene.inventory.items.wood = 2;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="sell"][data-arg="wood"]')?.click();
  })()`);
  const marketSell = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').economy.coins`);
  if (marketSell !== 8) throw new Error(`Venda no mercado falhou: ${marketSell}`);

  const sleepResult = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const before = scene.dayNight.dayCount;
    scene.openBuilding('house');
    document.querySelector('[data-tab="rest"]')?.click();
    document.querySelector('#building-menu [data-action="sleep"]')?.click();
    return {
      before,
      after: scene.dayNight.dayCount,
      cycleTime: scene.dayNight.cycleTime,
      offers: scene.market.offers.length,
      savedDay: JSON.parse(localStorage.getItem('lendas-save-v2')).time.dayCount
    };
  })()`);
  if (sleepResult.after !== sleepResult.before + 1 || sleepResult.cycleTime !== 0 ||
      sleepResult.offers !== 6 || sleepResult.savedDay !== sleepResult.after) {
    throw new Error(`Dormir até o próximo dia falhou: ${JSON.stringify(sleepResult)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.buildingMenu.close();
    scene.camp.equipment.crafted.stonePickaxe = false;
    scene.camp.equipment.crafted.ironPickaxe = false;
    const all = scene.harvestStructures.state.structures;
    const rock = scene.harvestStructures.state.byType('rock').find((entry) => entry.available);
    const ore = scene.harvestStructures.state.byType('oreVein').find((entry) =>
      entry.available && Math.hypot(entry.x - rock.x, entry.y - rock.y) > 120);
    window.__system2RockId = rock.id;
    window.__system2OreId = ore.id;
    window.__system2RockAvailability = all.map((entry) => [entry.id, entry.available]);
    for (const entry of all) {
      if (entry.id !== rock.id && entry.id !== ore.id) entry.available = false;
      entry.node?.setVisible(entry.id === rock.id || entry.id === ore.id);
    }
    for (const resource of scene.world.resources) resource.node.setVisible(false);
    scene.player.body.reset(rock.x, rock.y);
    scene.world.revealAround(rock.x, rock.y);
  })()`);
  await delay(220);
  await pressE(450);
  const lockedRock = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const rock = scene.harvestStructures.state.byType('rock').find((entry) => entry.available);
    return { available: rock.available, message: scene.ui.message.text };
  })()`);
  if (!lockedRock.available || !lockedRock.message.includes('picareta')) {
    throw new Error(`Rocha não foi bloqueada sem picareta: ${JSON.stringify(lockedRock)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    Object.assign(scene.inventory.items, { stone: 10, wood: 10 });
    const result = scene.camp.craft('stonePickaxe', scene.inventory);
    if (!result.ok) throw new Error(result.message);
    const rock = scene.harvestStructures.state.structures.find((entry) => entry.id === window.__system2RockId);
    scene.player.body.reset(rock.x, rock.y);
    scene.world.revealAround(rock.x, rock.y);
  })()`);
  await delay(220);
  const stoneBefore = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.stone`);
  await pressE(2500);
  const stoneAfter = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.stone`);
  if (stoneAfter - stoneBefore < 2 || stoneAfter - stoneBefore > 3) {
    throw new Error(`Mineração com picareta de pedra falhou: ${stoneBefore} -> ${stoneAfter}`);
  }

  const oreTarget = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const ore = scene.harvestStructures.state.structures.find((entry) => entry.id === window.__system2OreId);
    scene.player.body.reset(ore.x, ore.y);
    scene.world.revealAround(ore.x, ore.y);
    return { id: ore.id };
  })()`);
  await delay(220);
  const ironBefore = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.iron`);
  await pressE(2500);
  const oreResult = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const ore = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(oreTarget.id)});
    return { iron: scene.inventory.items.iron, available: ore.available, readyDay: ore.readyDay };
  })()`);
  if (oreResult.iron - ironBefore < 2 || oreResult.iron - ironBefore > 4 || oreResult.available || oreResult.readyDay < 5) {
    throw new Error(`Coleta de veio de ferro falhou: ${JSON.stringify(oreResult)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const availability = new Map(window.__system2RockAvailability || []);
    for (const entry of scene.harvestStructures.state.structures) {
      entry.available = availability.get(entry.id) ?? entry.available;
      if (entry.id === window.__system2RockId) entry.available = false;
      if (entry.id === ${JSON.stringify(oreTarget.id)}) entry.available = false;
      scene.harvestStructures.setNodeVisibility(entry);
    }
    for (const resource of scene.world.resources) resource.node.setVisible(true);
    scene.inventory.items.iron += 10;
    const result = scene.camp.craft('ironPickaxe', scene.inventory);
    if (!result.ok) throw new Error(result.message);
    const ore = scene.harvestStructures.state.byType('oreVein').find((entry) => entry.available);
    window.__system2IronOreId = ore.id;
    scene.collectHarvestStructure(ore);
  })()`);
  const ironFastBefore = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.iron`);
  await delay(1700);
  const ironFastResult = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const ore = scene.harvestStructures.state.structures.find((entry) => entry.id === window.__system2IronOreId);
    return { iron: scene.inventory.items.iron, available: ore.available };
  })()`);
  if (ironFastResult.iron - ironFastBefore < 3 || ironFastResult.iron - ironFastBefore > 5 || ironFastResult.available) {
    throw new Error(`Picareta de ferro não rendeu mais: ${JSON.stringify(ironFastResult)}`);
  }
  await evaluate(`window.__LENDAS__.scene.getScene('GameScene').save()`);
  await send('Page.reload', { ignoreCache: true });
  await delay(900);
  await waitForScene();
  const persisted = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      forge: scene.camp.levels.forge,
      farm: scene.camp.levels.farm,
      pickaxe: scene.camp.pickaxeTier,
      sword: scene.camp.equipment.has('ironSword'),
      enchantment: scene.camp.equipment.has('sharpnessEnchantment'),
      attack: scene.player.attack,
      stored: scene.camp.storage.wood,
      savedCrafted: save.camp.crafted.ironSword === true,
      savedMarket: save.market.offers.length > 0
    };
  })()`);
  if (persisted.forge !== 3 || persisted.farm !== 3 || persisted.pickaxe !== 'iron' ||
      !persisted.sword || !persisted.enchantment || !persisted.savedCrafted || !persisted.savedMarket) {
    throw new Error(`Persistência do Sistema 2 falhou: ${JSON.stringify(persisted)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const mine = scene.harvestStructures.state.byType('mineMarker')[0];
    scene.player.body.reset(mine.x + 130, mine.y + 110);
    scene.world.revealAround(mine.x, mine.y);
  })()`);
  await delay(350);
  await capture(screenshotPath);

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    panelMetrics,
    farm: { plant: farmPlant.crop, harvestFood: farmHarvest.food, animal: animalResult, level2: farmLevel2, level3: farmLevel3, autoHarvest },
    forge: forgeLevel1,
    enchantment,
    storage: stored,
    market: { buy: marketBuy, sellFood: marketSell, sleep: sleepResult },
    mining: { lockedRock, stone: stoneAfter - stoneBefore, ore: oreResult, ironPickaxe: ironFastResult },
    persisted,
    consoleErrors: errors.length,
    screenshotPath,
    farmScreenshotPath,
    marketScreenshotPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}
