import { check, runInChrome } from './runtime-harness.mjs';

// Sistema 2: ataques ao acampamento a cada 10 dias.
await runInChrome({ name: 'raid', port: 9352 }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();

  // Dia 10: aviso e contagem de 30 s.
  const warning = await inScene((scene) => {
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.dayNight.dayCount = 10;
    scene.player.body.reset(scene.camp.x, scene.camp.y + 85);
    for (const type of Object.keys(scene.camp.storage)) scene.camp.storage[type] = 500;
    scene.economy.coins = 5000;
    // Muralha nível 3 (pedra, espinhos 5) e sem torre: com as 4 torres do nível 1
    // os invasores morreriam antes de chegar à muralha, e aqui o alvo é a muralha.
    for (let index = 0; index < 3; index += 1) scene.upgradeBuilding('wall');
    scene.economy.coins = 100;
    const started = scene.raid.checkDay(10);
    return {
      started,
      remaining: scene.raid.warning?.remainingMs,
      banner: document.getElementById('epic-banner-title').textContent,
      status: scene.raid.statusText,
      sleepBlocked: scene.canSleepNow()
    };
  });
  check(warning.started && warning.remaining === 30000, `Aviso não começou: ${JSON.stringify(warning)}`);
  check(warning.banner === 'ATAQUE IMINENTE! Prepare o acampamento!', `Faixa do aviso: ${warning.banner}`);
  check(String(warning.sleepBlocked).includes('ataque'), 'Dormir deveria ficar bloqueado no aviso.');
  await capture('raid-warning.png');

  // O ataque começa ao fim do aviso, com save de segurança.
  const started = await inScene(async (scene) => {
    scene.raid.warning.remainingMs = 300;
    await new Promise((resolve) => setTimeout(resolve, 700));
    for (let index = 0; index < 5 && scene.raid.waves.length > 0; index += 1) {
      scene.raid.waveTimer = 0;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    const raiders = scene.enemies.filter((enemy) => enemy.isRaider);
    const kinds = {};
    for (const enemy of raiders) kinds[enemy.kind] = (kinds[enemy.kind] ?? 0) + 1;
    return {
      active: scene.raid.active,
      kinds,
      snapshot: localStorage.getItem('lendas-save-v2-pre-raid') !== null,
      outside: raiders.every((enemy) => Math.hypot(enemy.x - scene.camp.x, enemy.y - scene.camp.y) > 400)
    };
  });
  check(started.active && started.snapshot, `Ataque não começou: ${JSON.stringify(started)}`);
  check(started.kinds.slime === 10 && started.kinds.wolf === 5, `Onda do dia 10 errada: ${JSON.stringify(started.kinds)}`);
  check(started.outside, 'Os invasores deveriam surgir fora da muralha.');

  // Eles atacam a muralha; os espinhos devolvem dano. Espera até 25 s: o tempo
  // até chegar varia com o ponto onde cada invasor aparece.
  for (let waited = 0; waited < 25000; waited += 1000) {
    await delay(1000);
    const hit = await inScene((scene) => scene.camp.defense.wallHp < scene.camp.defense.wallMaxHp);
    if (hit && waited >= 3000) break;
  }
  const atWall = await inScene((scene) => {
    const raiders = scene.enemies.filter((enemy) => enemy.isRaider);
    return {
      wallHp: scene.camp.defense.wallHp,
      wallMax: scene.camp.defense.wallMaxHp,
      damagedRaiders: raiders.filter((enemy) => enemy.health < enemy.maxHealth).length,
      alive: raiders.length,
      buildingsIntact: Object.values(scene.camp.durability).every((value) => value === 100)
    };
  });
  check(atWall.wallHp < atWall.wallMax, `A muralha não foi atacada: ${JSON.stringify(atWall)}`);
  check(atWall.damagedRaiders > 0 || atWall.alive < 15, `Espinhos/torre não feriram ninguém: ${JSON.stringify(atWall)}`);
  check(atWall.buildingsIntact, 'Com a muralha de pé os prédios não deveriam ser atingidos.');
  await capture('raid-wall.png');

  // Morrer no ataque: volta à fogueira com 30% de vida, sem perder a mochila.
  const death = await inScene((scene) => {
    scene.inventory.items.wood = 10;
    scene.player.health = 0;
    scene.respawn();
    return {
      health: scene.player.health,
      max: scene.player.maxHealth,
      wood: scene.inventory.items.wood,
      atCamp: Math.hypot(scene.player.x - scene.camp.x, scene.player.y - scene.camp.y) < 120
    };
  });
  check(death.health === Math.round(death.max * 0.3) && death.wood === 10 && death.atCamp, `Morte no ataque: ${JSON.stringify(death)}`);

  // Vitória: moedas e XP dobrado.
  const victory = await inScene(async (scene) => {
    const coinsBefore = scene.economy.coins;
    const levelBefore = scene.progression.level;
    const xpBefore = scene.progression.xp;
    for (const enemy of scene.enemies.filter((candidate) => candidate.isRaider)) scene.damageEnemy(enemy, 99999);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      active: scene.raid.active,
      lastRaidDay: scene.raid.lastRaidDay,
      coinsGained: scene.economy.coins - coinsBefore,
      leveled: scene.progression.level > levelBefore || scene.progression.xp > xpBefore,
      banner: document.getElementById('epic-banner-title').textContent,
      text: document.getElementById('epic-banner-text').textContent
    };
  });
  check(!victory.active && victory.lastRaidDay === 10, `Vitória não registrada: ${JSON.stringify(victory)}`);
  check(victory.coinsGained >= 60 && victory.leveled && victory.banner === 'ATAQUE REPELIDO!', `Recompensa: ${JSON.stringify(victory)}`);
  await capture('raid-victory.png');

  // Dia 20 sem muralha: prédios levam 2% por golpe e o reparo custa 5 madeiras.
  const buildings = await inScene(async (scene) => {
    scene.levelUpOverlay.hide();
    scene.progression.pendingLevels = [];
    scene.progression.pendingPerks = [];
    scene.camp.defense.wallHp = 0;
    scene.camp.defense.refreshWallDamage();
    scene.dayNight.dayCount = 20;
    scene.raid.checkDay(20);
    scene.raid.warning.remainingMs = 100;
    await new Promise((resolve) => setTimeout(resolve, 400));
    scene.raid.waves = [];
    const forge = scene.camp.buildings.forge.sprite;
    const { Enemy } = await import('/src/game/Enemies.js');
    const raider = new Enemy(scene, forge.x + 10, forge.y + 6, 'skeleton');
    raider.isRaider = true;
    scene.enemies.push(raider);
    scene.hudCamera.ignore(raider);
    scene.player.body.reset(scene.camp.x + 600, scene.camp.y);
    await new Promise((resolve) => setTimeout(resolve, 2600));
    const damaged = scene.camp.durability.forge;
    const woodBefore = scene.camp.storage.wood + scene.inventory.items.wood;
    scene.damageEnemy(raider, 99999);
    const repair = scene.buildingMenuAction('repair', 'forge');
    return {
      damaged,
      afterRepair: scene.camp.durability.forge,
      woodSpent: woodBefore - (scene.camp.storage.wood + scene.inventory.items.wood),
      repairMessage: repair.message,
      efficiencyWhenDamaged: damaged < 100 && damaged > 0 ? 0.5 : null
    };
  });
  // 2% por golpe e golpes mais lentos contra estruturas: em 2,6 s cai pouco.
  check(buildings.damaged < 100 && buildings.damaged >= 94 && buildings.damaged % 2 === 0,
    `Prédio deveria perder 2% por golpe: ${JSON.stringify(buildings)}`);
  check(buildings.afterRepair === 100 && buildings.woodSpent === 5, `Reparo: ${JSON.stringify(buildings)}`);

  // Derrota: todos os prédios destruídos → fim de jogo e recomeço do último save.
  const defeat = await inScene(async (scene) => {
    scene.raid.active = false;
    scene.raid.lastRaidDay = 10;
    scene.dayNight.dayCount = 20;
    scene.raid.checkDay(20);
    scene.raid.warning.remainingMs = 100;
    await new Promise((resolve) => setTimeout(resolve, 400));
    for (const key of Object.keys(scene.camp.durability)) scene.camp.durability[key] = 0;
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      gameOver: scene.gameOver,
      visible: !document.getElementById('game-over').hidden,
      text: document.getElementById('game-over-text').textContent
    };
  });
  check(defeat.gameOver && defeat.visible, `Fim de jogo não apareceu: ${JSON.stringify(defeat)}`);
  await capture('raid-game-over.png');

  await inScene(() => document.getElementById('game-over-restart').click());
  await delay(1500);
  const restarted = await inScene((scene) => ({
    gameOver: scene.gameOver,
    hidden: document.getElementById('game-over').hidden,
    day: scene.dayNight.dayCount,
    durability: { ...scene.camp.durability },
    warning: Boolean(scene.raid.warning)
  }));
  check(!restarted.gameOver && restarted.hidden && restarted.day === 20, `Recomeço falhou: ${JSON.stringify(restarted)}`);
  check(Object.values(restarted.durability).every((value) => value === 100), 'O recomeço deveria voltar com os prédios inteiros.');
  check(restarted.warning, 'O ataque do dia 20 deveria recomeçar.');
  return { warning, started, atWall, death, victory, buildings, defeat, restarted };
});
