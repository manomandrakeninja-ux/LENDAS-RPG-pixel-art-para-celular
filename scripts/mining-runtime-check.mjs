import { check, runInChrome } from './runtime-harness.mjs';

// Sistema 3: mineração e ferro.
await runInChrome({ name: 'mining', port: 9353 }, async ({ inScene, capture, freshStart }) => {
  await freshStart();

  const mine = await inScene((scene) => {
    const structures = scene.harvestStructures.state.structures;
    const marker = scene.harvestStructures.state.byType('mineMarker')[0];
    const inMine = (type) => structures.filter((entry) => entry.type === type && entry.id.startsWith('mine-')).length;
    const guards = scene.enemies.filter((enemy) => enemy.isMineGuard);
    const openVeins = structures.filter((entry) => entry.type === 'oreVein' && !entry.id.startsWith('mine-'));
    const distances = openVeins.map((entry) => Math.hypot(entry.x - scene.camp.x, entry.y - scene.camp.y));
    return {
      iron: inMine('oreVein'),
      coal: inMine('coalVein'),
      gold: inMine('goldVein'),
      guards: guards.length,
      guardsElite: guards.every((enemy) => enemy.isElite && enemy.name.startsWith('Guarda-mina')),
      guardsAtEntrance: guards.every((enemy) => Math.hypot(enemy.x - marker.x, enemy.y - marker.y) < 130),
      worldVeins: openVeins.length,
      minDistance: Math.round(Math.min(...distances)),
      maxDistance: Math.round(Math.max(...distances)),
      minimapMine: scene.ui.mapMarkers.commandBuffer.length > 0
    };
  });
  check(mine.iron >= 6 && mine.iron <= 10 && mine.coal >= 2 && mine.coal <= 3 && mine.gold === 1, `Mina: ${JSON.stringify(mine)}`);
  check(mine.guards >= 1 && mine.guardsElite && mine.guardsAtEntrance, `Guardas-mina: ${JSON.stringify(mine)}`);
  check(mine.minDistance >= 600 && mine.maxDistance <= 1300, `Veios fora da faixa média/longa: ${JSON.stringify(mine)}`);
  check(mine.minimapMine, 'A mina não aparece no minimapa.');

  // Sem picareta: mensagem exata da especificação.
  const noPickaxe = await inScene((scene) => {
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9;
    scene.enemyDirector.mineTimer = 1e9;
    const vein = scene.harvestStructures.state.structures.find((entry) => entry.type === 'oreVein' && !entry.id.startsWith('mine-'));
    scene.__vein = vein;
    scene.player.body.reset(vein.x + 20, vein.y + 10);
    scene.interact();
    return { message: scene.ui.message.text, iron: scene.inventory.items.iron };
  });
  check(noPickaxe.message === 'Você precisa de uma picareta para minerar isso.', `Mensagem: ${noPickaxe.message}`);

  // Picareta básica (3 pedra, 2 madeira) no ferreiro nível 1.
  const basic = await inScene(async (scene) => {
    scene.camp.storage.stone = 3;
    scene.camp.storage.wood = 2;
    const crafted = scene.buildingMenuAction('craft', 'stonePickaxe');
    const vein = scene.__vein;
    scene.player.body.reset(vein.x + 20, vein.y + 10);
    const started = performance.now();
    scene.interact();
    while (scene.inventory.items.iron === 0 && performance.now() - started < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return {
      crafted: crafted.ok,
      tier: scene.camp.pickaxeTier,
      ms: Math.round(performance.now() - started),
      iron: scene.inventory.items.iron,
      veinAvailable: vein.available,
      hudIron: scene.ui.oreCounters[0].label.text
    };
  });
  check(basic.crafted && basic.tier === 'stone', `Picareta básica: ${JSON.stringify(basic)}`);
  check(basic.iron >= 2 && basic.iron <= 4 && !basic.veinAvailable, `Mineração básica: ${JSON.stringify(basic)}`);
  check(basic.ms >= 2000, `Picareta básica rápida demais: ${basic.ms}ms`);

  // Picareta de ferro (5 ferro, 1 carvão): 2x mais rápida e +1 por veio.
  const iron = await inScene(async (scene) => {
    scene.camp.levels.forge = 5;
    scene.camp.equipment.forgeLevel = 5;
    scene.camp.storage.iron = 5;
    scene.camp.storage.coal = 1;
    scene.inventory.items.iron = 0;
    const crafted = scene.buildingMenuAction('craft', 'ironPickaxe');
    const vein = scene.harvestStructures.state.structures.find((entry) => entry.type === 'oreVein' && entry.available && entry !== scene.__vein);
    scene.random = Math.random;
    scene.player.body.reset(vein.x + 20, vein.y + 10);
    const before = scene.inventory.items.iron;
    const started = performance.now();
    scene.interact();
    while (scene.inventory.items.iron === before && performance.now() - started < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return { crafted: crafted.ok, tier: scene.camp.pickaxeTier, ms: Math.round(performance.now() - started), gained: scene.inventory.items.iron - before };
  });
  check(iron.crafted && iron.tier === 'iron', `Picareta de ferro: ${JSON.stringify(iron)}`);
  check(iron.ms < 1600 && iron.gained >= 3 && iron.gained <= 5, `Picareta de ferro não é 2x/+1: ${JSON.stringify(iron)}`);

  // Veio renasce em 4 dias de jogo.
  const regrow = await inScene((scene) => {
    const vein = scene.__vein;
    const day = scene.dayNight.dayCount;
    scene.harvestStructures.handleDayChange(day + 3);
    const after3 = vein.available;
    scene.harvestStructures.handleDayChange(day + 4);
    return { after3, after4: vein.available };
  });
  check(!regrow.after3 && regrow.after4, `Regeneração em 4 dias: ${JSON.stringify(regrow)}`);
  await capture('mining-hud.png');
  return { mine, noPickaxe, basic, iron, regrow };
});
