import { runInChrome, check } from './runtime-harness.mjs';

// Fase 6: invasões nas regiões, XP em dobro, torres, refazer talentos e personagem feminino.
await runInChrome({ name: 'content', port: 9392, width: 1100, height: 700 }, async ({ evaluate, inScene, capture, freshStart, delay }) => {
  await freshStart();

  // 25. Personagem feminino: troca em Ajustes, sprite novo e animações iguais.
  await inScene((scene) => { scene.settingsPanel.open(); return true; });
  await evaluate(`document.querySelector('[data-settings="gender"][data-value="female"]').click()`);
  const hero = await inScene((scene) => ({
    gender: scene.heroGender,
    texture: scene.player.sprite.texture.key,
    walkDown: scene.anims.exists('player-female-walk-down'),
    walkUp: scene.anims.exists('player-female-walk-up'),
    idleLeft: scene.anims.exists('player-female-idle-left'),
    anim: scene.player.sprite.anims.currentAnim?.key,
    saved: JSON.parse(localStorage.getItem('lendas-save-v2') ?? '{}').hero
  }));
  check(hero.gender === 'female' && hero.texture === 'player-female' && hero.walkDown && hero.walkUp && hero.idleLeft, `Heroína: ${JSON.stringify(hero)}`);
  check(hero.saved?.gender === 'female' && /^player-female-idle/.test(hero.anim), `Heroína não salvou ou sem animação: ${JSON.stringify(hero)}`);
  await inScene((scene) => { scene.settingsPanel.close(); return true; });
  await capture('content-heroina.png');
  await inScene((scene) => { scene.setHeroGender('male'); return true; });

  // 12. XP em dobro: evento no dia 7 e bônus de novato da Fogueira.
  const xp = await inScene((scene) => {
    scene.timeState.dayCount = 3;
    const base = scene.progression.xp;
    scene.grantExperience(10, false);
    const normal = scene.progression.xp - base;
    const claim = scene.claimXpBonus();
    const again = scene.claimXpBonus();
    const before = scene.progression.xp;
    scene.grantExperience(10, false);
    const doubled = scene.progression.xp - before;
    scene.xpBoost.remainingMs = 0;
    scene.timeState.dayCount = 7;
    scene.effectsPanel.refresh();
    const event = [...scene.effectsPanel.root.querySelectorAll('button')].map((button) => button.dataset.effect);
    const eventBefore = scene.progression.xp;
    scene.grantExperience(10, false);
    return { normal, doubled, claim: claim.ok, again: again.ok, event, eventGain: scene.progression.xp - eventBefore };
  });
  check(xp.normal === 10 && xp.doubled === 20 && xp.claim && !xp.again, `Bônus de novato: ${JSON.stringify(xp)}`);
  check(xp.event.includes('xp-event') && xp.eventGain === 20, `Evento XP em dobro: ${JSON.stringify(xp)}`);
  await inScene((scene) => { scene.timeState.dayCount = 1; return true; });

  // 19. Refazer talentos na Fogueira.
  const respec = await inScene((scene) => {
    const p = scene.progression;
    p.level = 12;
    p.attackPoints = 5;
    p.healthPoints = 4;
    p.defensePoints = 3;
    p.perks = ['vampirism'];
    p.pendingLevels = [];
    p.pendingPerks = [];
    scene.economy.coins = 100;
    const cost = p.respecCost;
    const poor = scene.respecTalents();
    scene.economy.coins = 5000;
    const ok = scene.respecTalents();
    return {
      cost, poor: poor.ok, ok: ok.ok, coins: scene.economy.coins, pending: p.pendingLevels.length, perks: p.perks.length,
      pendingPerks: p.pendingPerks.length, overlay: !scene.levelUpOverlay.root?.hidden || scene.progression.hasPendingChoice
    };
  });
  check(respec.cost === 600 && !respec.poor && respec.ok && respec.coins === 4400 && respec.pending === 12 && respec.perks === 0 && respec.pendingPerks === 2, `Refazer talentos: ${JSON.stringify(respec)}`);
  const menu = await inScene((scene) => {
    scene.progression.pendingLevels = [];
    scene.progression.pendingPerks = [];
    scene.buildingMenu.open('campfire');
    const text = scene.buildingMenu.root?.textContent ?? document.body.textContent;
    scene.buildingMenu.close();
    return { respec: /Refazer talentos/.test(text), xp: /XP em dobro/.test(text) };
  });
  check(menu.respec && menu.xp, `Cartões da Fogueira: ${JSON.stringify(menu)}`);

  // 10. Invasões nas regiões.
  const invasion = await inScene((scene) => {
    scene.progression.level = 20;
    scene.invasion.state.active = null;
    scene.invasion.state.nextDay = 1;
    const started = scene.invasion.checkDay(5);
    const region = scene.invasion.active?.region;
    const center = scene.invasion.center;
    scene.player.body.reset(center.x, center.y);
    scene.invasion.waveTimer = 0;
    return { started: Boolean(started), region, center };
  });
  check(invasion.started && invasion.region, `Invasão não começou: ${JSON.stringify(invasion)}`);
  const waves = [];
  for (let wave = 0; wave < 3; wave += 1) {
    await delay(300);
    const info = await inScene((scene) => {
      scene.invasion.update(16);
      const invaders = scene.invasion.invaders;
      return {
        count: invaders.length, leaders: invaders.filter((e) => e.isInvasionLeader).length,
        auras: invaders.filter((e) => e.eliteAura).length, wave: scene.invasion.active.wave,
        leaderGold: invaders.filter((e) => e.isInvasionLeader && e.auraColor === 0xffd56b).length,
        orange: invaders.filter((e) => !e.isInvasionLeader && e.auraColor === 0xff8a2a).length
      };
    });
    waves.push(info);
    // Mapa e minimapa marcam os invasores.
    if (wave === 0) {
      await inScene((scene) => { const first = scene.invasion.invaders[0]; first.body.reset(scene.player.x + 120, scene.player.y); scene.ui.renderMinimap(); scene.worldMap.open(); scene.worldMap.render(); return true; });
      const marks = await inScene((scene) => ({ kinds: scene.ui.minimapStats.kinds, map: scene.worldMap.lastMarkerCounts }));
      check(marks.kinds.includes('invader') && marks.kinds.includes('invasion') && marks.map.invasion >= 2, `Marcas da invasão: ${JSON.stringify(marks)}`);
      await capture('content-invasao.png');
      await inScene((scene) => { scene.worldMap.close(); return true; });
    }
    // Derrota a onda (o líder só vem na última) e dá o dinheiro dobrado.
    const result = await inScene((scene) => {
      const coinsBefore = scene.economy.coins;
      let gear = 0;
      const original = scene.gear.add.bind(scene.gear);
      scene.gear.add = (...args) => { gear += 1; return original(...args); };
      for (const enemy of scene.invasion.invaders) scene.defeatEnemy(enemy);
      scene.gear.add = original;
      scene.invasion.waveTimer = 0;
      return { gear, left: scene.invasion.invaders.length, coinsBefore };
    });
    waves[waves.length - 1].gearDrops = result.gear;
    check(result.left === 0, 'Invasores deveriam ter morrido.');
  }
  check(waves[0].count === 4 && waves[1].count === 6 && waves[2].count === 8, `Tamanho das ondas: ${JSON.stringify(waves)}`);
  check(waves[0].leaders === 0 && waves[2].leaders === 1 && waves[2].leaderGold === 1 && waves[0].orange === 4, `Líder e auras: ${JSON.stringify(waves)}`);
  check(waves[2].gearDrops >= 1, `O líder sempre deixa uma peça: ${JSON.stringify(waves)}`);
  await delay(200);
  const finished = await inScene((scene) => {
    scene.invasion.update(16);
    return { active: scene.invasion.active, completed: scene.invasion.state.completed, saved: JSON.parse(JSON.stringify(scene.invasion.serialize())) };
  });
  check(finished.active === null && finished.completed === 1, `Invasão deveria terminar: ${JSON.stringify(finished)}`);

  // 15. Torres: entrada no mapa, andares mais fortes, baú no topo.
  const tower = await inScene((scene) => {
    scene.settingsPanel.close();
    const features = scene.regionWorld.features.filter((feature) => feature.type === 'cave' && feature.cave.tower);
    scene.worldMap.open();
    const card = scene.worldMap.showRegionAt(4500, 3100);
    const text = scene.worldMap.card.textContent;
    scene.worldMap.close();
    return { towers: features.length, names: features.map((f) => f.cave.name), card: card?.towers, text };
  });
  check(tower.towers === 6 && tower.card?.includes('Torre do Carvalho') && /Torre/.test(tower.text), `Torres no mapa: ${JSON.stringify(tower)}`);
  const levels = [];
  for (let floor = 0; floor < 3; floor += 1) {
    await inScene((scene, floorIndex) => {
      scene.regionWorld.enterCave('torre-antiga', floorIndex);
      return true;
    }, floor);
    await delay(1400);
    levels.push(await inScene((scene) => {
      const list = scene.regionWorld.caveEnemies.filter((enemy) => enemy.active);
      return { count: list.length, min: Math.min(...list.map((e) => e.level)), max: Math.max(...list.map((e) => e.level)), under: scene.regionWorld.underground?.floor };
    }));
  }
  check(levels.every((entry) => entry.count > 0) && levels[1].max >= levels[0].max && levels[2].max > levels[0].max, `Andares mais fortes: ${JSON.stringify(levels)}`);
  const chest = await inScene((scene) => {
    const feature = scene.regionWorld.features.find((entry) => entry.type === 'chest' && entry.cave.id === 'torre-antiga');
    if (!feature) return { found: false };
    const coins = scene.economy.coins;
    const gearBefore = scene.gear.loose.length;
    scene.regionWorld.openBossChest(feature);
    return { found: true, gear: scene.gear.loose.length - gearBefore, coins: scene.economy.coins - coins, opened: feature.opened, saved: scene.regionWorld.serialize().chests };
  });
  check(chest.found && chest.gear >= 1 && chest.coins > 0 && chest.opened && chest.saved.includes('torre-antiga'), `Baú do topo: ${JSON.stringify(chest)}`);
  await capture('content-torre.png');
  await inScene((scene) => { scene.regionWorld.leaveCave(true); return true; });

  // Save: invasão, XP e personagem entram no save e carregam de volta.
  const saved = await inScene((scene) => {
    scene.save();
    const data = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return { invasion: Boolean(data.invasion), xp: Boolean(data.xpBoost), hero: data.hero };
  });
  check(saved.invasion && saved.xp && saved.hero?.gender === 'male', `Save: ${JSON.stringify(saved)}`);
  return { waves: waves.map((wave) => wave.count), levels };
});
console.log('Conteúdo OK.');
