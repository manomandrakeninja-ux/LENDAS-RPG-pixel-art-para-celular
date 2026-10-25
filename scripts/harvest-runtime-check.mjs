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

const port = 9333;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'harvest-chrome-profile');
const screenshotPath = path.join(capturesDir, 'harvest-runtime-check.png');
const galleryPath = path.join(capturesDir, 'harvest-structures-preview.png');
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
      errors.push(message.params.exceptionDetails.text);
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
        if (scene?.harvestStructures) return resolve(true);
        if (Date.now() - started > 12000) return reject(new Error('GameScene não iniciou.'));
        setTimeout(check, 100);
      };
      check();
    })`);
    await delay(250);
  };
  const pressE = async (wait = 320) => {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'e', code: 'KeyE', windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69
    });
    await delay(wait);
  };
  const pickIsolated = async (type) => {
    const result = await evaluate(`(() => {
      const scene = window.__LENDAS__.scene.getScene('GameScene');
      const all = scene.harvestStructures.state.structures;
      const candidates = scene.harvestStructures.state.byType(${JSON.stringify(type)});
      const structure = candidates.find((candidate) => candidate.available);
      if (!structure) return null;
      for (const entry of all) {
        scene.harvestStructures.setNodeVisibility(entry);
        if (entry !== structure) entry.node?.setVisible(false);
      }
      for (const resource of scene.world.resources) resource.node.setVisible(false);
      scene.player.body.reset(structure.x, structure.y);
      scene.world.revealAround(structure.x, structure.y);
      return { id: structure.id, x: structure.x, y: structure.y };
    })()`);
    if (!result) throw new Error(`Não foi possível preparar uma estrutura isolada do tipo ${type}.`);
    await delay(180);
    return result;
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await waitForScene();

  const initial = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const manager = scene.harvestStructures;
    return {
      dayCount: scene.dayNight.dayCount,
      counts: manager.counts,
      nodes: manager.state.structures.filter((structure) => structure.node?.active).length,
      textures: Object.keys(manager.state.structures.reduce((result, structure) => {
        result[structure.type] = true;
        return result;
      }, {})).every((type) => scene.textures.exists('harvest-structure-' + type)),
      visibleMushrooms: manager.state.byType('mushroom').filter((structure) => structure.node?.visible).length
    };
  })()`);
  if (initial.counts.tree !== 32 || initial.counts.rock !== 22 || initial.counts.herbBush !== 26 ||
      initial.counts.mushroom !== 16 || initial.counts.chest !== 8) {
    throw new Error(`Contagem de estruturas incorreta: ${JSON.stringify(initial.counts)}`);
  }
  if (!initial.textures || initial.nodes !== Object.values(initial.counts).reduce((sum, count) => sum + count, 0) ||
      initial.visibleMushrooms !== 0 || initial.counts.oreVein < 24 || initial.counts.mineMarker !== 1) {
    throw new Error(`Estruturas não foram inicializadas corretamente: ${JSON.stringify(initial)}`);
  }

  const treeTarget = await pickIsolated('tree');
  const treeBefore = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      wood: scene.inventory.items.wood,
      hint: scene.ui.hint.text,
      action: scene.ui.worldAction.textContent
    };
  })()`);
  if (!treeBefore.hint.includes('Árvore') || !treeBefore.action.includes('ÁRVORE')) {
    throw new Error(`Contexto de estrutura não apareceu: ${JSON.stringify(treeBefore)}`);
  }
  await pressE();
  const treeAfter = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(treeTarget.id)});
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      wood: scene.inventory.items.wood,
      available: structure.available,
      readyDay: structure.readyDay,
      nodeExists: Boolean(structure.node),
      saved: save.harvestStructures.find((entry) => entry.id === structure.id)
    };
  })()`);
  const treeAmount = treeAfter.wood - treeBefore.wood;
  if (treeAmount < 2 || treeAmount > 4 || treeAfter.available || treeAfter.readyDay !== 3 ||
      treeAfter.nodeExists || !treeAfter.saved || treeAfter.saved.available !== false) {
    throw new Error(`Coleta/renascimento/save da árvore incorreto: ${JSON.stringify(treeAfter)}`);
  }

  await send('Page.reload', { ignoreCache: true });
  await delay(800);
  await waitForScene();
  const treeReloaded = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.byType('tree').find((entry) => entry.id === ${JSON.stringify(treeTarget.id)});
    return {
      available: structure.available,
      readyDay: structure.readyDay,
      wood: scene.inventory.items.wood
    };
  })()`);
  if (treeReloaded.available || treeReloaded.readyDay !== 3 || treeReloaded.wood !== treeAfter.wood) {
    throw new Error(`Estado da árvore não persistiu após recarregar: ${JSON.stringify(treeReloaded)}`);
  }

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.dayCount = 3;
    scene.harvestStructures.handleDayChange(3);
  })()`);
  const treeRegenerated = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(treeTarget.id)});
    return { available: structure.available, nodeExists: Boolean(structure.node) };
  })()`);
  if (!treeRegenerated.available || !treeRegenerated.nodeExists) {
    throw new Error(`Árvore não renasceu após dois dias: ${JSON.stringify(treeRegenerated)}`);
  }

  const rockTarget = await pickIsolated('rock');
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.inventory.items.stone += 3;
    scene.inventory.items.wood += 2;
    const crafted = scene.camp.craft('stonePickaxe', scene.inventory);
    if (!crafted.ok) throw new Error(crafted.message);
  })()`);
  const rockBefore = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.stone`);
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(rockTarget.id)});
    scene.actionHeld = true;
    scene.collectHarvestStructure(structure);
  })()`);
  await delay(4500);
  await evaluate(`window.__LENDAS__.scene.getScene('GameScene').actionHeld = false`);
  const rockAfter = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(rockTarget.id)});
    return {
      stone: scene.inventory.items.stone,
      available: structure.available,
      readyDay: structure.readyDay,
      pickaxe: scene.camp.pickaxeTier,
      message: scene.ui.message.text,
      nearest: scene.harvestStructures.nearest(scene.player.x, scene.player.y)?.id ?? null
    };
  })()`);
  if (rockAfter.stone - rockBefore < 2 || rockAfter.stone - rockBefore > 3 || rockAfter.available || rockAfter.readyDay !== 6) {
    throw new Error(`Coleta da rocha incorreta: ${JSON.stringify(rockAfter)}`);
  }

  const bushTarget = await pickIsolated('herbBush');
  const bushBefore = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.herbs`);
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(bushTarget.id)});
    scene.collectHarvestStructure(structure);
  })()`);
  await delay(350);
  const bushAfter = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(bushTarget.id)});
    return { herbs: scene.inventory.items.herbs, available: structure.available, readyDay: structure.readyDay };
  })()`);
  if (bushAfter.herbs - bushBefore < 1 || bushAfter.herbs - bushBefore > 2 || bushAfter.available || bushAfter.readyDay !== 4) {
    throw new Error(`Coleta do arbusto incorreta: ${JSON.stringify(bushAfter)}`);
  }

  const mushroomTarget = await pickIsolated('mushroom');
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.cycleTime = 240;
  })()`);
  await delay(250);
  const nightVisibility = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(mushroomTarget.id)});
    return { visible: structure.node?.visible === true, phase: scene.timeState.phase };
  })()`);
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.cycleTime = 0;
  })()`);
  await delay(250);
  const morningVisibility = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(mushroomTarget.id)});
    return { visible: structure.node?.visible === true, phase: scene.timeState.phase };
  })()`);
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.cycleTime = 240;
  })()`);
  await delay(250);
  const restoredVisibility = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(mushroomTarget.id)});
    return { visible: structure.node?.visible === true, phase: scene.timeState.phase };
  })()`);
  const mushroomVisibility = {
    nightVisible: nightVisibility.visible,
    morningVisible: morningVisibility.visible,
    restoredVisible: restoredVisibility.visible
  };
  if (!mushroomVisibility.nightVisible || mushroomVisibility.morningVisible || !mushroomVisibility.restoredVisible) {
    throw new Error(`Cogumelos não respeitaram o ciclo noturno: ${JSON.stringify(mushroomVisibility)}`);
  }
  const mushroomBefore = await evaluate(`window.__LENDAS__.scene.getScene('GameScene').inventory.items.food`);
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(mushroomTarget.id)});
    scene.collectHarvestStructure(structure);
  })()`);
  await delay(350);
  const mushroomAfter = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(mushroomTarget.id)});
    return { food: scene.inventory.items.food, available: structure.available, readyDay: structure.readyDay };
  })()`);
  if (mushroomAfter.food - mushroomBefore < 1 || mushroomAfter.food - mushroomBefore > 3 || mushroomAfter.available) {
    throw new Error(`Coleta do cogumelo incorreta: ${JSON.stringify(mushroomAfter)}`);
  }

  const chestTarget = await pickIsolated('chest');
  const chestBefore = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(chestTarget.id)});
    return { total: scene.inventory.total, items: { ...scene.inventory.items }, loot: { ...structure.loot } };
  })()`);
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(chestTarget.id)});
    scene.collectHarvestStructure(structure);
  })()`);
  await delay(350);
  const chestAfter = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const structure = scene.harvestStructures.state.structures.find((entry) => entry.id === ${JSON.stringify(chestTarget.id)});
    scene.harvestStructures.handleDayChange(20);
    return {
      total: scene.inventory.total,
      items: { ...scene.inventory.items },
      available: structure.available,
      collected: structure.collected,
      readyDay: structure.readyDay
    };
  })()`);
  const chestGained = Object.entries(chestBefore.loot).every(([type, amount]) =>
    chestAfter.items[type] - chestBefore.items[type] === amount
  );
  if (!chestGained || chestAfter.available || !chestAfter.collected || chestAfter.readyDay !== null) {
    throw new Error(`Baú coletado incorretamente ou renasceu: ${JSON.stringify({ chestBefore, chestAfter })}`);
  }

  const previewTarget = await pickIsolated('tree');
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.cycleTime = 0;
    scene.player.body.reset(${previewTarget.x}, ${previewTarget.y});
    scene.world.revealAround(${previewTarget.x}, ${previewTarget.y});
  })()`);
  await delay(300);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const entries = [
      ['tree', 'ÁRVORE', '2–4 madeira • 2 dias'],
      ['rock', 'ROCHA', '2–3 pedra • 3 dias'],
      ['herbBush', 'ARBUSTO', '1–2 ervas • 1 dia'],
      ['mushroom', 'COGUMELO', '1–3 comida • só à noite'],
      ['chest', 'BAÚ', 'loot único • não renasce']
    ];
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 640;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;width:960px;height:640px;';
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.fillStyle = '#17211d';
    context.fillRect(0, 0, 960, 640);
    context.fillStyle = '#f0e8d4';
    context.font = 'bold 22px monospace';
    context.fillText('ESTRUTURAS DE COLETA', 30, 42);
    context.font = '13px monospace';
    context.fillStyle = '#aebbb3';
    context.fillText('Interação com E • animação de coleta • regeneração por ciclo de dias', 30, 68);
    entries.forEach(([type, label, info], index) => {
      const x = 24 + index * 184;
      const y = 104;
      context.fillStyle = '#213029';
      context.fillRect(x, y, 170, 430);
      context.strokeStyle = '#3f5848';
      context.strokeRect(x + 0.5, y + 0.5, 169, 429);
      const source = scene.textures.get('harvest-structure-' + type).getSourceImage();
      context.imageSmoothingEnabled = false;
      context.drawImage(source, 0, 0, 32, 32, x + 37, y + 72, 96, 96);
      context.fillStyle = '#f0e8d4';
      context.font = 'bold 13px monospace';
      context.fillText(label, x + 12, y + 32);
      context.fillStyle = '#aebbb3';
      context.font = '10px monospace';
      const lines = info.split(' • ');
      lines.forEach((line, lineIndex) => context.fillText(line, x + 12, y + 225 + lineIndex * 18));
      context.fillStyle = '#e2b64d';
      context.fillText('E', x + 77, y + 365);
    });
    document.body.appendChild(canvas);
    return true;
  })()`);
  await delay(100);
  const gallery = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(galleryPath, Buffer.from(gallery.data, 'base64'));

  if (errors.length > 0) throw new Error(`Erros no console do jogo: ${JSON.stringify(errors)}`);

  console.log(JSON.stringify({
    initial,
    tree: { amount: treeAmount, readyDay: treeAfter.readyDay, persisted: !treeReloaded.available },
    rock: { amount: rockAfter.stone - rockBefore, readyDay: rockAfter.readyDay },
    herbBush: { amount: bushAfter.herbs - bushBefore, readyDay: bushAfter.readyDay },
    mushroom: {
      amount: mushroomAfter.food - mushroomBefore,
      nightVisible: mushroomVisibility.nightVisible,
      morningVisible: mushroomVisibility.morningVisible
    },
    chest: { loot: chestBefore.loot, collected: chestAfter.collected, regenerated: chestAfter.available },
    consoleErrors: errors.length,
    screenshotPath,
    galleryPath
  }, null, 2));

  socket.close();
} finally {
  browser.kill();
}
