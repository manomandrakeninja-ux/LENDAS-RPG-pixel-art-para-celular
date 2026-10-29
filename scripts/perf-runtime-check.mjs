import fs from 'node:fs';
import path from 'node:path';
import { capturesDir, check, runInChrome } from './runtime-harness.mjs';

// Medição de desempenho (390x844, CPU reduzida via CDP) em 4 cenas.
// Uso: PERF_MODE=high|balanced|light PERF_THROTTLE=4 PERF_TAG=antes node scripts/perf-runtime-check.mjs
// (PERF_PROFILE=1 imprime os maiores custos do perfil de CPU.) Grava .tmp/capturas/desempenho/<tag>-<modo>-<x>x.json
const mode = process.env.PERF_MODE ?? 'high';
const throttle = Number(process.env.PERF_THROTTLE ?? 4);
const tag = process.env.PERF_TAG ?? 'medida';
const profile = process.env.PERF_PROFILE === '1';
const seconds = Number(process.env.PERF_SECONDS ?? 6);
const outDir = path.join(capturesDir, 'desempenho');
fs.mkdirSync(outDir, { recursive: true });

await runInChrome({ name: 'perf', port: 9411 + Math.floor(Math.random() * 80), width: 390, height: 844, mobile: true }, async ({ evaluate, inScene, send, freshStart, reload, delay, capture }) => {
  await freshStart();
  await evaluate(`localStorage.setItem('lendas-configuracoes', JSON.stringify({ graphics: '${mode}', graphicsChosen: true }))`);
  await reload();
  const sampleScript = `new Promise((resolve) => {
    const frames = [];
    let last = performance.now();
    const start = last;
    const tick = (now) => {
      frames.push(now - last);
      last = now;
      if (now - start < ${seconds * 1000}) requestAnimationFrame(tick);
      else resolve(frames);
    };
    requestAnimationFrame(tick);
  })`;
  const scenes = {
    'acampamento-noite': (scene) => {
      scene.worldMap?.close?.();
      scene.dayNight.dayCount = 1; scene.dayNight.cycleTime = 240; scene.updateDayNight(0);
      scene.player.setPosition(scene.camp.x, scene.camp.y + 80);
    },
    'vale-dia-monstros': (scene) => {
      scene.worldMap?.close?.();
      scene.dayNight.dayCount = 1; scene.dayNight.cycleTime = 40; scene.updateDayNight(0);
      scene.player.setPosition(1900, 1500);
      scene.__spawnPack?.();
    },
    'combate-chuva': (scene) => {
      scene.worldMap?.close?.();
      scene.dayNight.dayCount = 5; scene.dayNight.cycleTime = 40; scene.updateDayNight(0);
      scene.player.setPosition(1900, 1500);
      scene.__spawnPack?.();
      scene.__fight = setInterval(() => { scene.player.health = scene.player.maxHealth; scene.attackNearby(); scene.player.attackCooldown = 0; }, 350);
    },
    'mapa-aberto': (scene) => {
      clearInterval(scene.__fight);
      scene.dayNight.dayCount = 1; scene.dayNight.cycleTime = 40; scene.updateDayNight(0);
      scene.worldMap.open();
    }
  };
  await evaluate(`(() => {
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    scene.__spawnPack = () => {
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      const state = scene.dayNight.getState();
      const made = [];
      for (let i = 0; i < 120 && made.length < 24; i += 1) {
        const before = scene.enemies.length;
        scene.enemyDirector.spawnOne(state);
        if (scene.enemies.length > before) made.push(scene.enemies[scene.enemies.length - 1]);
      }
      made.forEach((enemy, i) => {
        const a = (i / made.length) * Math.PI * 2;
        const r = 70 + (i % 4) * 35;
        enemy.setPosition(scene.player.x + Math.cos(a) * r, scene.player.y + Math.sin(a) * r);
      });
    };
  })()`);
  await send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const results = {};
  for (const [name, setup] of Object.entries(scenes)) {
    await inScene(setup);
    await delay(2500);
    if (profile) await send('Profiler.enable'), await send('Profiler.start');
    const frames = await evaluate(sampleScript);
    let top = null;
    if (profile) {
      const { profile: prof } = await send('Profiler.stop');
      const self = new Map();
      const byId = new Map(prof.nodes.map((n) => [n.id, n]));
      const dt = prof.timeDeltas;
      prof.samples.forEach((id, i) => {
        const n = byId.get(id);
        const key = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber}`;
        self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0));
      });
      const total = [...self.values()].reduce((a, b) => a + b, 0);
      top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${(v / total * 100).toFixed(1)}% ${k}`);
    }
    const sorted = [...frames].slice(5).sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const stats = await inScene((scene) => ({
      objects: scene.children.list.length,
      enemies: scene.enemies.length,
      canvas: `${scene.game.canvas.width}x${scene.game.canvas.height}`
    }));
    results[name] = {
      fps: Number((1000 / (sum / sorted.length)).toFixed(1)),
      p95ms: Number(sorted[Math.floor(sorted.length * 0.95)].toFixed(1)),
      ...stats,
      ...(top ? { top } : {})
    };
    await capture(`desempenho/${tag}-${mode}-${name}.png`);
  }
  fs.writeFileSync(path.join(outDir, `${tag}-${mode}-${throttle}x.json`), JSON.stringify(results, null, 2));
  check(Object.keys(results).length === 4, 'faltou cena');
  return { mode, throttle, tag, results };
});
