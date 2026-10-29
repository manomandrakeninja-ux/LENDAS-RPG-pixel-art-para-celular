import { runInChrome } from './runtime-harness.mjs';

// Capturas determinísticas do modo Alto (jogo parado, sem inimigos) para comparar antes/depois da otimização.
// Uso: QUALITY_TAG=antes|depois node scripts/perf-quality-capture.mjs
const tag = process.env.QUALITY_TAG ?? 'depois';
await runInChrome({ name: 'quality', port: 9431, width: 390, height: 844, mobile: true }, async ({ evaluate, inScene, freshStart, reload, delay, capture }) => {
  await freshStart();
  await evaluate(`localStorage.setItem('lendas-configuracoes', JSON.stringify({ graphics: 'high', graphicsChosen: true }))`);
  await reload();
  const scenes = {
    'acampamento-noite': { day: 1, time: 240, x: 0, y: 80 },
    'acampamento-entardecer': { day: 1, time: 190, x: 0, y: 80 },
    'vale-dia': { day: 1, time: 40, x: 460, y: 420 },
    'vale-chuva': { day: 5, time: 40, x: 460, y: 420 }
  };
  for (const [name, config] of Object.entries(scenes)) {
    await inScene((scene, c) => {
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.worldMap?.close?.();
      scene.dayNight.dayCount = c.day; scene.dayNight.cycleTime = c.time;
      scene.player.setPosition(scene.camp.x + c.x, scene.camp.y + c.y);
      scene.cameras.main.centerOn(scene.player.x, scene.player.y);
    }, config);
    await delay(1500);
    await inScene((scene) => { scene.enemies.forEach((e) => scene.enemyDirector.remove(e)); scene.lighting.clock = 5000; scene.lighting.draw(scene.dayNight.getState().lightLevel, scene.player); scene.game.loop.sleep(); });
    await delay(300);
    await capture(`desempenho/qualidade-${tag}-${name}.png`);
    await inScene((scene) => scene.game.loop.wake());
  }
  return { tag };
});
