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

  // 1. Tilemap do mundo inteiro e Vale intacto (tamanho lido do próprio módulo: não depende do mapa).
  const base = await inScene(async (scene) => {
    const { OVERWORLD } = await import('/src/data/worldRegions.js');
    return {
      width: scene.physics.world.bounds.width,
      height: scene.physics.world.bounds.height,
      expected: OVERWORLD,
      ground: scene.regionWorld.groundLayer.layer.data.length,
      valleyTile: scene.regionWorld.groundLayer.getTileAt(30, 22)?.index,
      region: scene.regionWorld.currentRegion()
    };
  });
  check(base.width === base.expected.width && base.height > base.expected.height && base.valleyTile >= 1 && base.region === 'vale', `Mundo base: ${JSON.stringify(base)}`);
  await capture('mundo-vale.png');

  // 2. Cada região: objetos aparecem perto do jogador e monstros da região nascem.
  // Coordenadas descobertas dinamicamente (regionAt numa grade) — não dependen do tamanho do mapa.
  const places = await inScene(async () => {
    const { regionAt, OVERWORLD } = await import('/src/data/worldRegions.js');
    const want = ['gelo', 'areia', 'antiga', 'brejo', 'esmeralda', 'brasa'];
    const found = {};
    for (let y = 240; y < OVERWORLD.height - 240 && want.some((r) => !found[r]); y += 200) {
      for (let x = 240; x < OVERWORLD.width - 240; x += 200) {
        const r = regionAt(x, y);
        if (want.includes(r) && !found[r]) found[r] = [x, y];
      }
    }
    return found;
  });
  check(Object.keys(places).length === 6, `Regiões não encontradas no mapa: ${JSON.stringify(places)}`);
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
    // Ilhas (esmeralda/brasa) contam como região visitada, mas não entram no conjunto "discovered" (só por barco) — o save (#8) valida as descobertas.
    check(info.region === key && info.props > 10 && info.kinds.length > 0, `Região ${key}: ${JSON.stringify(info)}`);
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

  // 4. Barco: do primeiro porto para a Ilha Esmeralda (paga a passagem = BOAT_FARE).
  const boat = await inScene(async (scene) => {
    const { DOCKS, BOAT_FARE } = await import('/src/data/worldRegions.js');
    const dockFeature = scene.regionWorld.features.find((feature) => feature.type === 'dock');
    scene.economy.addCoins(100);
    const before = scene.economy.coins;
    scene.regionWorld.openBoat(dockFeature.dock); // abre o diálogo do barqueiro direto
    await new Promise((resolve) => setTimeout(resolve, 300));
    const dialog = scene.campaign.ui.dialog;
    const buttons = [...dialog.querySelectorAll('button[data-dialog]')];
    const labels = buttons.map((button) => button.textContent);
    const index = labels.findIndex((label) => /ESMERALDA/i.test(label));
    const target = index >= 0 ? buttons[index] : buttons.find((button) => !/SAIR/i.test(button.textContent));
    target.click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { labels, fare: BOAT_FARE, region: scene.regionWorld.currentRegion(), paid: before - scene.economy.coins };
  });
  await capture('mundo-barco.png');
  check(boat.region === 'esmeralda' && boat.paid === boat.fare, `Barco: ${JSON.stringify(boat)}`);

  // 5. Caverna: entrar, andar de baixo com chefe, derrotar, abrir o baú e sair (id lido do mapa servido).
  const cave = await inScene(async (scene) => {
    const rw = scene.regionWorld;
    const entrance = rw.features.find((feature) => feature.type === 'cave' && !feature.cave.tower);
    const caveId = entrance.cave.id;
    scene.player.body.reset(entrance.x, entrance.y + 10);
    await new Promise((resolve) => setTimeout(resolve, 300));
    rw.enterCave(caveId, 0); // mesma chamada que o interact faz ao entrar na caverna
    await new Promise((resolve) => setTimeout(resolve, 900));
    const first = { underground: rw.underground?.floor, enemies: scene.enemies.filter((enemy) => enemy.isCaveEnemy).length, wall: rw.walkable(scene.player.x, scene.player.y) };
    rw.enterCave(caveId, 1);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const boss = scene.enemies.find((enemy) => enemy.isRegionBoss);
    const bar = !document.getElementById('region-boss').hidden;
    if (boss) scene.damageEnemy(boss, boss.maxHealth + 10);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const chest = rw.features.find((feature) => feature.type === 'chest' && feature.cave?.id === caveId) ?? rw.features.find((feature) => feature.type === 'chest');
    if (chest) rw.openBossChest(chest);
    return { caveId, first, boss: boss?.kind, bar, chest: Boolean(chest), opened: rw.chests.has(caveId), bossDay: rw.bosses[caveId] };
  });
  await capture('mundo-caverna.png');
  check(cave.first.underground === 0 && cave.first.enemies > 0 && cave.first.wall && Boolean(cave.boss) && cave.bar && cave.opened && cave.bossDay >= 1,
    `Caverna: ${JSON.stringify(cave)}`);

  const out = await inScene(async (scene) => {
    scene.ui.showMessage('');
    scene.regionWorld.leaveCave();
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { underground: scene.regionWorld.underground, region: scene.regionWorld.currentRegion(), caveEnemies: scene.enemies.filter((enemy) => enemy.isCaveEnemy).length };
  });
  check(out.underground === null && out.region !== 'caverna' && out.caveEnemies === 0, `Saída da caverna: ${JSON.stringify(out)}`);

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
    discovered: [...scene.regionWorld.discovered], chests: [...scene.regionWorld.chests], kills: Object.keys(scene.bestiary.kills).length
  }));
  check(saved.discovered.length >= 5 && saved.chests.includes(cave.caveId) && saved.kills >= 1, `Save do mundo: ${JSON.stringify(saved)}`);
});
