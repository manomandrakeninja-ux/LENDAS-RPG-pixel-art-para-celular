import { check, runInChrome } from './runtime-harness.mjs';

// Mundo grande: regiões novas, monstros de cada região, mar que bloqueia, barco,
// cavernas com andares e chefe, bestiário e mapa.
await runInChrome({ name: 'world', port: 9391, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  const closeAll = (scene) => {
    scene.campaign.ui.closeChapter();
    scene.campaign.ui.closeDialogue();
    scene.campaign.ui.closeReward?.();
    scene.bestiaryPanel?.close();
    scene.worldMap?.close?.();
  };
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(400);

  // 1. Tilemap do mundo inteiro e Vale intacto.
  const base = await inScene((scene) => ({
    width: scene.physics.world.bounds.width,
    height: scene.physics.world.bounds.height,
    ground: scene.regionWorld.groundLayer.layer.data.length,
    valleyTile: scene.regionWorld.groundLayer.getTileAt(30, 22)?.index,
    region: scene.regionWorld.currentRegion()
  }));
  check(base.width === 7200 && base.height > 5376 && base.valleyTile >= 1 && base.valleyTile <= 64 && base.region === 'vale', `Mundo base: ${JSON.stringify(base)}`);
  await capture('mundo-vale.png');

  // 2. Cada região: objetos aparecem perto do jogador e monstros da região nascem.
  const places = {
    gelo: [3900, 1300], areia: [6000, 1200], antiga: [3900, 2900], brejo: [1300, 2800], esmeralda: [1900, 4500], brasa: [5000, 4500]
  };
  for (const [key, [x, y]] of Object.entries(places)) {
    const info = await inScene(async (scene, [px, py]) => {
      const closeAll = () => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); };
      closeAll();
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.player.body.reset(px, py);
      scene.player.invulnerable = 999999;
      scene.cameras.main.centerOn(px, py);
      await new Promise((resolve) => setTimeout(resolve, 600));
      for (let index = 0; index < 6; index += 1) scene.enemyDirector.spawnOne(scene.timeState);
      await new Promise((resolve) => setTimeout(resolve, 900));
      const props = [...scene.regionWorld.chunks.values()].filter((chunk) => chunk.active).reduce((sum, chunk) => sum + chunk.objects.length, 0);
      return { region: scene.regionWorld.currentRegion(), props, kinds: [...new Set(scene.enemies.map((enemy) => enemy.kind))], discovered: scene.regionWorld.discovered.has(scene.regionWorld.currentRegion()) };
    }, [x, y]);
    await capture(`mundo-${key}.png`);
    check(info.region === key && info.props > 10 && info.kinds.length > 0 && info.discovered, `Região ${key}: ${JSON.stringify(info)}`);
  }

  // 3. O mar bloqueia: andar para o sul a partir da praia não entra na água.
  const sea = await inScene(async (scene) => {
    const { dockPosition, DOCKS } = await import('/src/data/worldRegions.js');
    const dock = dockPosition(DOCKS[0]);
    scene.player.body.reset(dock.x + 200, dock.y - 40);
    for (let step = 0; step < 30; step += 1) {
      scene.player.body.setVelocity(0, 160);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return { terrain: scene.regionWorld.terrainAtPoint(scene.player.x, scene.player.y), y: scene.player.y };
  });
  check(sea.terrain !== 8, `Jogador entrou no mar: ${JSON.stringify(sea)}`);

  // 4. Barco: do Porto do Brejo para a Ilha Esmeralda (paga a passagem).
  const boat = await inScene(async (scene) => {
    const { dockPosition, DOCKS } = await import('/src/data/worldRegions.js');
    const dock = dockPosition(DOCKS[0]);
    scene.economy.addCoins(100);
    const before = scene.economy.coins;
    scene.player.body.reset(dock.x - 12, dock.y);
    await new Promise((resolve) => setTimeout(resolve, 300));
    scene.interact();
    const dialog = scene.campaign.ui.dialog;
    const labels = [...dialog.querySelectorAll('button')].map((button) => button.textContent);
    const index = labels.findIndex((label) => label.includes('ESMERALDA'));
    dialog.querySelector(`button[data-dialog="${index}"]`).click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { labels, region: scene.regionWorld.currentRegion(), paid: before - scene.economy.coins };
  });
  await capture('mundo-barco.png');
  check(boat.region === 'esmeralda' && boat.paid === 15, `Barco: ${JSON.stringify(boat)}`);

  // 5. Caverna: entrar, andar de baixo com chefe, derrotar, abrir o baú e sair.
  const cave = await inScene(async (scene) => {
    const rw = scene.regionWorld;
    const entrance = rw.features.find((feature) => feature.type === 'cave' && feature.cave.id === 'toca-orc');
    scene.player.body.reset(entrance.x, entrance.y + 10);
    await new Promise((resolve) => setTimeout(resolve, 300));
    scene.interact();
    await new Promise((resolve) => setTimeout(resolve, 900));
    const first = { underground: rw.underground?.floor, enemies: scene.enemies.filter((enemy) => enemy.isCaveEnemy).length, wall: rw.walkable(scene.player.x, scene.player.y) };
    rw.enterCave('toca-orc', 1);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const boss = scene.enemies.find((enemy) => enemy.isRegionBoss);
    const bar = !document.getElementById('region-boss').hidden;
    if (boss) scene.damageEnemy(boss, boss.maxHealth + 10);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const chest = rw.features.find((feature) => feature.type === 'chest');
    if (chest) {
      scene.player.body.reset(chest.x, chest.y + 10);
      await new Promise((resolve) => setTimeout(resolve, 200));
      scene.interact();
    }
    return { first, boss: boss?.kind, bar, chest: Boolean(chest), opened: rw.chests.has('toca-orc'), bossDay: rw.bosses['toca-orc'] };
  });
  await capture('mundo-caverna.png');
  check(cave.first.underground === 0 && cave.first.enemies > 0 && cave.first.wall && cave.boss === 'orcChief' && cave.bar && cave.opened && cave.bossDay >= 1,
    `Caverna: ${JSON.stringify(cave)}`);

  const out = await inScene(async (scene) => {
    scene.ui.showMessage('');
    scene.regionWorld.leaveCave();
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { underground: scene.regionWorld.underground, region: scene.regionWorld.currentRegion(), caveEnemies: scene.enemies.filter((enemy) => enemy.isCaveEnemy).length };
  });
  check(out.underground === null && out.region === 'antiga' && out.caveEnemies === 0, `Saída da caverna: ${JSON.stringify(out)}`);

  // 6. Bestiário registra abates e abre com K.
  const bestiary = await inScene(async (scene) => {
    scene.bestiaryPanel.open();
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { known: scene.bestiary.progress.known, total: scene.bestiary.progress.total, cards: document.querySelectorAll('.bestiary__card').length, paused: scene.isUiPaused() };
  });
  await capture('mundo-bestiario.png');
  check(bestiary.known >= 1 && bestiary.total >= 34 && bestiary.cards === bestiary.total && bestiary.paused, `Bestiário: ${JSON.stringify(bestiary)}`);

  // 7. Mapa grande mostra o mundo todo.
  await inScene(async (scene) => {
    scene.bestiaryPanel.close();
    scene.worldMap.open();
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  });
  await capture('mundo-mapa.png');

  // 8. Tudo fica salvo.
  await inScene((scene) => { scene.worldMap.close(); scene.save(); return true; });
  await reload();
  const saved = await inScene((scene) => ({
    discovered: [...scene.regionWorld.discovered], chests: [...scene.regionWorld.chests], kills: scene.bestiary.kills.orcChief ?? 0
  }));
  check(saved.discovered.length >= 7 && saved.chests.includes('toca-orc') && saved.kills >= 1, `Save do mundo: ${JSON.stringify(saved)}`);
});
