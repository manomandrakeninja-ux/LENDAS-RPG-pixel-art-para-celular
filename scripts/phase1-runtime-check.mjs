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

const port = 9331;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'phase1-chrome-profile');
const screenshotPath = path.join(capturesDir, 'phase1-runtime-check.png');
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
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await evaluate(`new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const game = window.__LENDAS__;
      const scene = game?.scene?.getScene('GameScene');
      if (scene?.dayNight && scene?.enemyDirector) return resolve(true);
      if (Date.now() - started > 10000) return reject(new Error('GameScene não iniciou.'));
      setTimeout(check, 100);
    };
    check();
  })`);

  await delay(300);

  const initial = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      phase: scene.timeState.phase,
      dayCount: scene.timeState.dayCount,
      enemies: scene.enemies.length,
      enemyTypes: scene.enemies.map((enemy) => enemy.kind),
      nightResources: scene.world.nightResources.length,
      visibleNightResources: scene.world.nightResources.filter((entry) => entry.node.visible).length,
      // A mochila virou um botão no HUD; os 12 espaços ficam no painel da mochila.
      resourceSlots: scene.ui.quickButtons.length,
      backpackSlots: scene.inventory.maxSlots,
      backpackTotalCapacity: scene.inventory.totalCapacity,
      safeRadius: 300,
      lighting: {
        camera: {
          scrollX: scene.cameras.main.scrollX,
          scrollY: scene.cameras.main.scrollY,
          zoom: scene.cameras.main.zoom,
          width: scene.cameras.main.width,
          height: scene.cameras.main.height
        },
        player: { x: scene.player.x, y: scene.player.y },
        worldView: { ...scene.cameras.main.worldView },
        topLeft: scene.cameras.main.getWorldPoint(0, 0),
        bottomRight: scene.cameras.main.getWorldPoint(scene.cameras.main.width, scene.cameras.main.height),
        camp: scene.camp.getLightSources().map((light) => ({ x: light.x, y: light.y, radius: light.radius }))
      }
    };
  })()`);
  if (initial.phase !== 'day') throw new Error(`Fase inicial inesperada: ${initial.phase}`);
  if (initial.enemies < 1) throw new Error('Nenhum inimigo inicial foi criado.');
  if (initial.nightResources !== 18) throw new Error(`Recursos noturnos inesperados: ${initial.nightResources}`);
  if (initial.visibleNightResources !== 0) throw new Error('Recursos noturnos ficaram visíveis durante o dia.');
  if (initial.resourceSlots !== 4 || initial.backpackSlots !== 12 || initial.backpackTotalCapacity !== 144) {
    throw new Error(`HUD/mochila não recebeu 12 slots reais: ${JSON.stringify(initial)}`);
  }

  const minimap = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.player.body.reset(600, 400);
    await new Promise((resolve) => setTimeout(resolve, 260));
    // Minimapa local: jogador no centro; longe do acampamento aparece a seta para ele.
    scene.ui.renderMinimap();
    const context = scene.ui.minimapTexture.getContext();
    const size = scene.ui.minimapSize;
    const center = context.getImageData(Math.floor(size / 2), Math.floor(size / 2), 1, 1).data;
    const result = {
      stats: scene.ui.minimapStats,
      centerColor: [...center],
      imageVisible: scene.ui.minimapImage.visible,
      revealedCells: scene.world.getRevealedCells().length,
      fogUpdated: scene.ui.mapRenderer.lastRevealed > 0,
      fog: {
        tileCount: scene.children.list.filter((child) => child.frame?.name === 'fog-dither').length,
        overlayCount: scene.children.list.filter((child) => child === scene.world.fogOverlay).length,
        overlayPresent: Boolean(scene.world.fogOverlay),
        texturePresent: scene.textures.exists('world-exploration-fog'),
        revealPoints: scene.world.revealedPoints.length
      }
    };
    scene.player.body.reset(1440, 1165);
    scene.cameras.main.centerOn(1440, 1165);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return result;
  })()`);
  if (!minimap.stats.rendered || !minimap.imageVisible || minimap.revealedCells < 1 || !minimap.fogUpdated) {
    throw new Error(`Minimapa sem desenho ou exploração: ${JSON.stringify(minimap)}`);
  }
  // Seta do jogador (amarela) no centro e seta para o acampamento, que está longe.
  if (minimap.centerColor[0] < 200 || minimap.centerColor[1] < 180 || !minimap.stats.kinds.includes('camp-arrow')) {
    throw new Error(`Minimapa sem o jogador no centro ou sem a seta do acampamento: ${JSON.stringify(minimap)}`);
  }
  const fog = minimap.fog;
  if (fog.tileCount !== 0 || fog.overlayCount !== 0 || fog.overlayPresent || fog.texturePresent) {
    throw new Error(`Névoa de exploração não deveria existir no mundo: ${JSON.stringify(fog)}`);
  }
  if (fog.revealPoints < 1) {
    throw new Error(`Exploração não registrou pontos para o mapa: ${JSON.stringify(fog)}`);
  }

  const warning = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.cycleTime = 210;
    const state = scene.updateDayNight(0);
    return { active: state.warningActive, seconds: state.secondsUntilNight, phase: state.phase };
  })()`);
  if (!warning.active || warning.seconds !== 30) throw new Error(`Aviso noturno incorreto: ${JSON.stringify(warning)}`);

  const nightSpawn = await evaluate(`(async () => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.dayNight.cycleTime = 240;
    const state = scene.updateDayNight(0);
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    for (let index = 0; index < 20; index += 1) scene.enemyDirector.spawnOne(state);
    scene.cameras.main.centerOn(scene.player.x, scene.player.y);
    await new Promise((resolve) => setTimeout(resolve, 60));
    scene.lighting.update(1000, state, scene.player);
    const camera = scene.cameras.main;
    const scaleX = scene.lighting.width / camera.width;
    const scaleY = scene.lighting.height / camera.height;
    const sources = [
      { kind: 'player', x: scene.player.x, y: scene.player.y },
      ...scene.camp.getLightSources().map((light) => ({ kind: 'camp', ...light }))
    ];
    const sourcePixels = sources.map((light) => {
      const x = Math.round((light.x - camera.worldView.x) * camera.zoom * scaleX);
      const y = Math.round((light.y - camera.worldView.y) * camera.zoom * scaleY);
      return {
        kind: light.kind,
        x,
        y,
        alpha: scene.lighting.context.getImageData(x, y, 1, 1).data[3]
      };
    });
    const visualLights = scene.children.list.filter((child) =>
      child.texture?.key === 'buildings' &&
      (child.frame?.name === 'lamp' || child.frame?.name?.startsWith('campfire-'))
    );
    const enemyVisualModule = await import('/src/game/EnemyVisual.js');
    const profileCanvas = (textureKey, size) => {
      const texture = scene.textures.get(textureKey);
      const data = texture.getContext().getImageData(0, 0, size, size).data;
      let opaquePixels = 0;
      let goldPixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] > 0) opaquePixels += 1;
        if (data[index] === 226 && data[index + 1] === 182 && data[index + 2] === 77 && data[index + 3] > 0) {
          goldPixels += 1;
        }
      }
      return {
        opaquePixels,
        goldPixels,
        hasFrame0: texture.has('frame-0'),
        hasFrame1: texture.has('frame-1'),
        width: texture.width,
        height: texture.height
      };
    };
    const speciesVisuals = Object.fromEntries(
      ['slime', 'wolf', 'boar', 'skeleton', 'ghost', 'spider', 'werewolf'].map((kind) => {
        const normal = enemyVisualModule.resolveEnemyVisual(scene, kind, false);
        const elite = enemyVisualModule.resolveEnemyVisual(scene, kind, true);
        return [kind, {
          normal: { ...profileCanvas(normal.texture, 32), animationExists: scene.anims.exists(normal.animation) },
          elite: { ...profileCanvas(elite.texture, 40), animationExists: scene.anims.exists(elite.animation) }
        }];
      })
    );
    return {
      phase: state.phase,
      count: scene.enemies.length,
      types: [...new Set(scene.enemies.map((enemy) => enemy.kind))],
      periods: [...new Set(scene.enemies.map((enemy) => enemy.definition.period))],
      enemyVisuals: {
        externalAtlasExists: scene.textures.exists('enemies'),
        externalCreatureSheetExists: scene.textures.exists('creatures'),
        speciesVisuals,
        codeCanvasEnemies: scene.enemies.filter((enemy) =>
          enemy.usingPlaceholder && enemy.sprite.texture.key.startsWith('enemy-canvas-')
        ).length,
        externalTextureEnemies: scene.enemies.filter((enemy) =>
          ['enemies', 'creatures'].includes(enemy.sprite.texture.key)
        ).length,
        totalEnemies: scene.enemies.length
      },
      lighting: {
        sourcePixels,
        farPixelAlpha: scene.lighting.context.getImageData(4, 4, 1, 1).data[3],
        visualLightCount: visualLights.length,
        campSources: scene.camp.getLightSources().map((light) => ({
          x: light.x,
          y: light.y,
          hasVisualObject: Boolean(light.object),
          matchesVisualObject: light.object?.x === light.x && light.object?.y === light.y
        }))
      }
    };
  })()`);
  if (nightSpawn.phase !== 'night' || nightSpawn.count < 1) throw new Error('Spawn noturno não criou inimigos.');
  if (nightSpawn.periods.some((period) => period !== 'night')) throw new Error('Inimigo diurno apareceu à noite.');
  const enemyVisuals = nightSpawn.enemyVisuals;
  if (enemyVisuals.externalAtlasExists || enemyVisuals.externalCreatureSheetExists) {
    throw new Error(`Arte externa de inimigos ainda está carregada: ${JSON.stringify(enemyVisuals)}`);
  }
  if (Object.values(enemyVisuals.speciesVisuals).some((visuals) =>
    !visuals.normal.hasFrame0 || !visuals.normal.hasFrame1 || !visuals.normal.animationExists ||
    !visuals.elite.hasFrame0 || !visuals.elite.hasFrame1 || !visuals.elite.animationExists ||
    visuals.normal.opaquePixels < 30 || visuals.elite.opaquePixels < 40 ||
    // O elite é marcado só pelo anel no chão: a moldura dourada foi removida.
    visuals.elite.goldPixels > 0
  )) {
    throw new Error(`Silhuetas canvas incompletas: ${JSON.stringify(enemyVisuals.speciesVisuals)}`);
  }
  if (enemyVisuals.codeCanvasEnemies !== enemyVisuals.totalEnemies || enemyVisuals.externalTextureEnemies !== 0) {
    throw new Error(`Inimigos ainda usam textura externa: ${JSON.stringify(enemyVisuals)}`);
  }
  if (nightSpawn.lighting.sourcePixels.some((light) => light.alpha !== 0)) {
    throw new Error(`Há uma luz deslocada do objeto visual: ${JSON.stringify(nightSpawn.lighting.sourcePixels)}`);
  }
  if (nightSpawn.lighting.farPixelAlpha <= 0 || nightSpawn.lighting.visualLightCount < 3) {
    throw new Error(`Máscara de luz não coincide com os objetos do acampamento: ${JSON.stringify(nightSpawn.lighting)}`);
  }
  // Fogueira + 2 postes + janelas dos prédios (e portão/torres quando construídos).
  if (nightSpawn.lighting.campSources.length < 7 || nightSpawn.lighting.campSources.some((light) =>
    !light.hasVisualObject || !light.matchesVisualObject
  )) {
    throw new Error(`Luzes do acampamento não estão vinculadas aos sprites: ${JSON.stringify(nightSpawn.lighting.campSources)}`);
  }

  const sleep = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    const before = scene.dayNight.dayCount;
    // Pular a noite exige Casa nível 2 (LENDAS, Sistema 1).
    scene.camp.levels.house = 2;
    scene.sleepAtCamp();
    return {
      before,
      after: scene.dayNight.dayCount,
      phase: scene.dayNight.getState().phase,
      nightEnemies: scene.enemies.filter((enemy) => enemy.definition.period === 'night').length,
      visibleNightResources: scene.world.nightResources.filter((entry) => entry.node.visible).length
    };
  })()`);
  if (sleep.after !== sleep.before + 1 || sleep.phase !== 'day') throw new Error(`Sono não avançou o dia: ${JSON.stringify(sleep)}`);
  if (sleep.nightEnemies !== 0 || sleep.visibleNightResources !== 0) throw new Error('Sono não removeu o estado noturno.');

  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.inventory.items.wood = 10;
    scene.inventory.items.food = 5;
    // Até o nível 5 a proteção de novato guarda a mochila; o teste da perda vale a partir do 6.
    scene.progression.level = Math.max(scene.progression.level, 6);
    scene.player.health = 1;
    scene.player.invulnerable = 0;
    scene.player.damage(999, { x: scene.player.x + 20, y: scene.player.y });
    return true;
  })()`);
  await delay(350);
  const death = await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return {
      backpacks: scene.deathBackpacks.backpacks.length,
      wood: scene.inventory.items.wood,
      food: scene.inventory.items.food,
      health: scene.player.health,
      x: scene.player.x,
      y: scene.player.y,
      atCamp: Math.hypot(scene.player.x - 1440, scene.player.y - 1165) < 5
    };
  })()`);
  if (death.backpacks !== 1 || death.wood !== 6 || death.food !== 3) {
    throw new Error(`Mochila de morte incorreta: ${JSON.stringify(death)}`);
  }
  if (death.health !== 100 || !death.atCamp) throw new Error(`Respawn incorreto: ${JSON.stringify(death)}`);

  const persisted = await evaluate(`(() => {
    const raw = localStorage.getItem('lendas-save-v2');
    return raw ? JSON.parse(raw) : null;
  })()`);
  if (!persisted || persisted.version !== 2) throw new Error('Save v2 não foi persistido.');

  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));

  if (errors.length > 0) throw new Error(`Erros de console: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ initial, minimap, warning, nightSpawn, sleep, death, saveVersion: persisted.version, screenshotPath }, null, 2));
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  browser.kill();
  await delay(200);
  fs.rmSync(userDataDir, { recursive: true, force: true });
}
