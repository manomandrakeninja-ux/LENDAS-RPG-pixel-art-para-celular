import { check, runInChrome } from './runtime-harness.mjs';

// Campanha "As Cinzas do Primeiro Mundo": primeiras missões jogadas pelos caminhos reais do jogo.
await runInChrome({ name: 'campaign', port: 9358, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  await inScene((scene) => {
    scene.enemyDirector.spawnTimer = 1e9;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    // O "início limpo" regrava o save ao sair da página; a abertura é mostrada de novo aqui.
    scene.campaign.state.introShown = false;
  });
  await delay(500);

  // 1. Diálogo de abertura com o vigia; aceitar pela própria caixa de diálogo.
  const intro = await inScene((scene) => {
    // Primeiro a abertura do capítulo 1; ao continuar, Bram puxa conversa.
    scene.campaign.ui.closeChapter();
    const dialog = scene.campaign.ui.dialog;
    const visible = !dialog.hidden;
    dialog.querySelector('button[data-dialog="0"]')?.click();
    return { visible, state: scene.campaign.state.stateOf('m001'), vigia: scene.campaign.npcs.has('vigia'), tracker: scene.campaign.ui.tracker.textContent };
  });
  check(intro.visible && intro.state === 'active' && intro.vigia, `Abertura: ${JSON.stringify(intro)}`);
  await capture('campaign-intro.png');

  // 2. Missão 1: coletar madeira cortando árvores com E (caminho real de coleta).
  const wood = await inScene(async (scene) => {
    const trees = scene.harvestStructures.state.structures.filter((entry) => entry.type === 'tree' && entry.available);
    const xpBefore = scene.progression.xp + scene.progression.level * 1000;
    for (const tree of trees) {
      if (scene.campaign.state.stateOf('m001') !== 'active') break;
      scene.player.body.reset(tree.x + 14, tree.y + 6);
      scene.interact();
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    return {
      state: scene.campaign.state.stateOf('m001'),
      next: scene.campaign.state.stateOf('m002'),
      rewardShown: !scene.campaign.ui.reward.hidden,
      xpGained: scene.progression.xp + scene.progression.level * 1000 - xpBefore
    };
  });
  check(wood.state === 'done' && wood.next === 'available' && wood.rewardShown && wood.xpGained > 0, `Missão 1: ${JSON.stringify(wood)}`);
  await capture('campaign-recompensa.png');

  // 3. Missão 2 aceita pelo Diário; cogumelos na clareira de missão.
  const mushrooms = await inScene(async (scene) => {
    while (scene.progression.hasPendingChoice) scene.chooseLevelUp('health');
    scene.campaign.ui.reward.hidden = true;
    // A missão 2 é oferecida na hora, num diálogo com ACEITAR.
    const offered = !scene.campaign.ui.dialog.hidden && scene.campaign.ui.dialog.textContent.includes('O Preço da Fome');
    scene.campaign.ui.closeDialogue();
    scene.toggleJournal();
    const accept = scene.campaign.ui.journal.querySelector('[data-q-accept="m002"]');
    accept?.click();
    scene.campaign.ui.toggleJournal(false);
    scene.campaign.syncWorld();
    scene.campaign.ui.refreshTracker();
    const route = scene.campaign.ui.tracker.textContent;
    const site = scene.campaign.sites.get('cogumelos');
    if (!offered || !route.includes('Clareira de Cogumelos')) return { site: Boolean(site), offered, route };
    if (!site) return { site: false, state: scene.campaign.state.stateOf('m002') };
    for (let index = 0; index < 3; index += 1) {
      scene.player.body.reset(site.def.x + 10, site.def.y + 8);
      scene.interact();
      await new Promise((resolve) => setTimeout(resolve, 520));
    }
    return { site: true, state: scene.campaign.state.stateOf('m002'), iron: scene.inventory.items.iron + scene.camp.storage.iron };
  });
  check(mushrooms.site && mushrooms.state === 'done' && mushrooms.iron >= 2, `Missão 2: ${JSON.stringify(mushrooms)}`);

  // 4. Missão 3: forjar a espada no Ferreiro e derrotar os ratos do depósito.
  const rats = await inScene(async (scene) => {
    // A diária "Coletar recursos" (10 itens) paga XP; como a madeira/cogumelos rendem quantidades aleatórias,
    // às vezes o herói sobe de nível aqui e a escolha de nível PAUSA o jogo (o local não gera os ratos).
    // O jogador escolheria; o teste escolhe também.
    while (scene.progression.hasPendingChoice) scene.chooseLevelUp('health');
    scene.campaign.ui.reward.hidden = true;
    scene.campaign.accept('m003');
    // A conversa ao aceitar pausa o jogo até o jogador fechar.
    scene.campaign.ui.closeDialogue();
    const crafted = scene.buildingMenuAction('craft', 'simpleSword');
    while (scene.progression.hasPendingChoice) scene.chooseLevelUp('health');
    const site = scene.campaign.sites.get('deposito');
    scene.player.body.reset(site.def.x, site.def.y + 120);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const spawned = site.spawned.length;
    const names = site.spawned.map((enemy) => enemy.name);
    for (const enemy of [...site.spawned]) scene.damageEnemy(enemy, 99999);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { crafted: crafted.ok, spawned, names, state: scene.campaign.state.stateOf('m003'), next: scene.campaign.state.stateOf('m004') };
  });
  check(rats.crafted && rats.spawned === 2 && rats.names.every((name) => name === 'Rato Gigante'), `Ratos: ${JSON.stringify(rats)}`);
  check(rats.state === 'done' && rats.next === 'available', `Missão 3: ${JSON.stringify(rats)}`);

  // 5. Salvar e recarregar: o progresso continua.
  await inScene((scene) => scene.save());
  await reload();
  const persisted = await inScene((scene) => ({
    m001: scene.campaign.state.stateOf('m001'),
    m003: scene.campaign.state.stateOf('m003'),
    m004: scene.campaign.state.stateOf('m004'),
    rewarded: scene.campaign.state.entry('m003').rewarded,
    completed: scene.campaign.state.completedCount
  }));
  check(persisted.m003 === 'done' && persisted.m004 === 'available' && persisted.rewarded && persisted.completed === 3,
    `Persistência: ${JSON.stringify(persisted)}`);

  // 6. Diário: três abas e falar com o vigia (aceitar pelo diálogo do NPC).
  const journal = await inScene(async (scene) => {
    scene.enemyDirector.spawnTimer = 1e9;
    const ui = scene.campaign.ui;
    ui.toggleJournal(true);
    const tabs = [];
    for (const tab of ['campaign', 'daily', 'records']) {
      ui.journal.querySelector(`[data-q-tab="${tab}"]`).click();
      tabs.push({ tab, html: ui.journal.textContent.length });
    }
    ui.toggleJournal(false);
    const vigia = scene.campaign.npcs.get('vigia');
    scene.player.body.reset(vigia.x + 10, vigia.y + 6);
    // Subir de nível pausa o jogo: escolhe o bônus antes de conversar.
    while (scene.progression.hasPendingChoice) scene.chooseLevelUp('health');
    scene.interact();
    const dialogText = ui.dialog.textContent;
    ui.dialog.querySelector('button[data-dialog="0"]')?.click();
    return { tabs, dialogText: dialogText.slice(0, 80), m004: scene.campaign.state.stateOf('m004') };
  });
  check(journal.tabs.every((entry) => entry.html > 50), `Diário: ${JSON.stringify(journal)}`);
  check(journal.m004 === 'active' && journal.dialogText.includes('Pegadas'), `Conversa com o vigia: ${JSON.stringify(journal)}`);

  await inScene((scene) => { scene.campaign.ui.toggleJournal(true); });
  await delay(300);
  const shot = await capture('campaign-diario.png');
  await inScene((scene) => { scene.campaign.ui.toggleJournal(false); scene.player.body.reset(scene.camp.x - 60, scene.camp.y + 150); });
  await delay(300);
  await capture('campaign-acampamento.png');

  // ---------- Missões avançadas: pula a campanha até a missão n e aceita ----------
  const jump = (number) => inScene((scene, target) => {
    const state = scene.campaign.state;
    for (const [id, entry] of Object.entries(state.missions)) {
      const n = Number(id.slice(1));
      entry.state = n < target ? 'done' : 'locked';
      entry.rewarded = n < target;
      entry.progress = entry.progress.map(() => 0);
    }
    state.refreshAvailability();
    scene.campaign.ui.reward.hidden = true;
    scene.campaign.ui.closeChapter();
    scene.campaign.ui.closeDialogue();
    scene.campaign.accept(`m${String(target).padStart(3, '0')}`);
    scene.campaign.ui.reward.hidden = true;
    scene.player.health = scene.player.maxHealth;
    scene.progression.pendingLevels = [];
    scene.progression.pendingPerks = [];
    scene.levelUpOverlay.hide();
    return state.stateOf(`m${String(target).padStart(3, '0')}`);
  }, number);

  // Missão 5 (entrega): a água do poço só é consumida ao entregar pelo Diário.
  await jump(5);
  const water = await inScene(async (scene) => {
    const site = scene.campaign.sites.get('poco');
    for (let index = 0; index < 5; index += 1) {
      scene.player.body.reset(site.def.x + 8, site.def.y + 8);
      scene.interact();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const before = scene.inventory.items.water;
    scene.campaign.ui.toggleJournal(true);
    scene.campaign.ui.tab = 'campaign';
    scene.campaign.ui.selected = 'm005';
    scene.campaign.ui.renderJournal();
    scene.campaign.ui.journal.querySelector('[data-q-turnin="m005"]')?.click();
    scene.campaign.ui.toggleJournal(false);
    return { before, after: scene.inventory.items.water, state: scene.campaign.state.stateOf('m005') };
  });
  check(water.before === 5 && water.after === 0 && water.state === 'done', `Entrega de água: ${JSON.stringify(water)}`);

  // Missão 10: chefe Lobo Cinzento surge no covil.
  await jump(10);
  const boss = await inScene(async (scene) => {
    const site = scene.campaign.sites.get('covil');
    scene.player.body.reset(site.def.x, site.def.y + 160);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const enemy = site.spawned[0];
    const info = enemy ? { name: enemy.name, boss: enemy.isQuestBoss, health: enemy.maxHealth, bar: scene.campaign.nearestBoss() === enemy } : null;
    if (enemy) scene.damageEnemy(enemy, 999999);
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { info, state: scene.campaign.state.stateOf('m010'), daily: scene.campaign.state.daily.list.length };
  });
  check(boss.info?.name === 'Lobo Cinzento' && boss.info.boss && boss.info.health > 200 && boss.info.bar, `Chefe: ${JSON.stringify(boss)}`);
  check(boss.state === 'done' && boss.daily === 3, `Chefe derrotado e diárias: ${JSON.stringify(boss)}`);

  // Missão 30: saqueadores atacam à noite e entram no acampamento.
  await jump(30);
  const assault = await inScene(async (scene) => {
    scene.timeState = { ...scene.timeState, isNight: true };
    scene.campaign.update(16);
    const site = scene.campaign.sites.get('saqueadores');
    const raiders = site?.spawned ?? [];
    const result = { count: raiders.length, ignoresSafe: raiders.every((enemy) => enemy.ignoresSafeZone) };
    for (const enemy of [...raiders]) scene.damageEnemy(enemy, 999999);
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { ...result, state: scene.campaign.state.stateOf('m030') };
  });
  check(assault.count === 6 && assault.ignoresSafe && assault.state === 'done', `Saqueadores: ${JSON.stringify(assault)}`);

  // Missão 38: pilares na ordem errada reiniciam; na certa, concluem.
  await jump(38);
  const puzzle = await inScene(async (scene) => {
    const use = (id) => {
      const site = scene.campaign.sites.get(id);
      scene.player.body.reset(site.def.x, site.def.y + 6);
      scene.interact();
    };
    use('pilar-terra-2');
    const afterWrong = scene.campaign.state.sites['puzzle-pilares-terra']?.lit ?? 0;
    for (const id of ['pilar-terra-1', 'pilar-terra-2', 'pilar-terra-3']) use(id);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { afterWrong, state: scene.campaign.state.stateOf('m038') };
  });
  check(puzzle.afterWrong === 0 && puzzle.state === 'done', `Puzzle: ${JSON.stringify(puzzle)}`);

  // Região perigosa: o frio do norte fere sem roupas quentes, mas nunca mata.
  const hazard = await inScene(async (scene) => {
    scene.campaign.state.flags.warmClothes = false;
    scene.player.body.reset(1500, 330);
    scene.player.health = scene.player.maxHealth;
    for (let index = 0; index < 60; index += 1) scene.campaign.updateRegion(500);
    const cold = scene.player.health;
    scene.campaign.state.flags.warmClothes = true;
    scene.player.health = scene.player.maxHealth;
    for (let index = 0; index < 10; index += 1) scene.campaign.updateRegion(500);
    return { cold, max: scene.player.maxHealth, warm: scene.player.health, region: scene.campaign.regionKey };
  });
  check(hazard.region === 'norte' && hazard.cold < hazard.max && hazard.cold >= Math.ceil(hazard.max * 0.15) && hazard.warm === hazard.max,
    `Perigo do norte: ${JSON.stringify(hazard)}`);

  // Missão 6: os dois baús da missão aparecem no mapa e contam como "abrir baú".
  await jump(6);
  const chests = await inScene(async (scene) => {
    scene.campaign.syncWorld();
    const active = [...scene.campaign.activeSiteIds()];
    const opened = [];
    for (const id of ['bau-estrada', 'bau-ruina']) {
      const site = scene.campaign.sites.get(id);
      if (!site) continue;
      scene.player.body.reset(site.def.x, site.def.y + 6);
      scene.interact();
      await new Promise((resolve) => setTimeout(resolve, 450));
      opened.push(id);
    }
    const entry = scene.campaign.state.entry('m006');
    return { active, opened, chestProgress: entry.progress[0], state: entry.state };
  });
  check(chests.active.includes('bau-estrada') && chests.active.includes('bau-ruina') && chests.opened.length === 2 && chests.chestProgress >= 2,
    `Baús da missão 6: ${JSON.stringify(chests)}`);

  // Missão 95: escolha final pelo altar.
  await jump(95);
  const choice = await inScene((scene) => {
    const site = scene.campaign.sites.get('altar-escolha');
    scene.player.body.reset(site.def.x, site.def.y + 6);
    scene.interact();
    // Primeiro fala Aurelian (OUVIR A ESCOLHA); depois vêm as opções.
    const aurelian = scene.campaign.ui.dialog.querySelector('h3')?.textContent;
    scene.campaign.ui.dialog.querySelector('button[data-dialog="0"]').click();
    scene.campaign.ui.dialog.querySelector('button[data-dialog="0"]').click();
    return { aurelian, choice: scene.campaign.state.choice, state: scene.campaign.state.stateOf('m095') };
  });
  check(choice.choice === 'restore' && choice.state === 'done', `Escolha: ${JSON.stringify(choice)}`);

  // Missões 96–98: fases do Golem de Fogo e defesa do núcleo.
  await jump(96);
  const golem = await inScene(async (scene) => {
    // O Golem de Fogo é o golem de lava do mapa; com a missão 95 concluída ele está liberado.
    const site = scene.campaign.sites.get('nucleo');
    scene.player.body.reset(site.def.x, site.def.y + 200);
    scene.player.invulnerable = 1e9;
    await new Promise((resolve) => setTimeout(resolve, 500));
    scene.campaign.ui.closeChapter();
    scene.campaign.ui.closeDialogue();
    scene.updateGolemLock();
    const enemy = scene.boss;
    if (!enemy || enemy.dead || enemy.locked) return { spawned: false, dead: enemy?.dead, locked: enemy?.locked };
    scene.damageEnemy(enemy, Math.ceil(enemy.maxHealth * 0.55));
    await new Promise((resolve) => setTimeout(resolve, 400));
    const phase = { m096: scene.campaign.state.stateOf('m096'), m097: scene.campaign.state.stateOf('m097'), enraged: Boolean(enemy.enraged), alive: enemy.active };
    scene.damageEnemy(enemy, 999999);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const defendSite = scene.campaign.sites.get('estabilizar');
    scene.player.body.reset(defendSite.def.x, defendSite.def.y + 20);
    scene.player.invulnerable = 1e9;
    for (let index = 0; index < 50; index += 1) scene.campaign.updateSites(1000);
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      spawned: true,
      name: enemy.name,
      phase,
      m097: scene.campaign.state.stateOf('m097'),
      m098: scene.campaign.state.stateOf('m098'),
      m099: scene.campaign.state.stateOf('m099')
    };
  });
  check(golem.spawned && golem.name === 'Golem de Fogo', `Golem: ${JSON.stringify(golem)}`);
  check(golem.phase.m096 === 'done' && golem.phase.m097 === 'active' && golem.phase.enraged && golem.phase.alive, `Fase 1 do Golem: ${JSON.stringify(golem)}`);
  check(golem.m097 === 'done' && golem.m098 === 'done' && golem.m099 === 'active', `Fase 2 e defesa: ${JSON.stringify(golem)}`);
  await capture('campaign-golem.png');

  // Virada de dia: diárias renovam e um evento aleatório pode surgir.
  const day = await inScene((scene) => {
    const before = scene.campaign.state.daily.day;
    scene.campaign.onDayAdvance(before + 1);
    return { before, after: scene.campaign.state.daily.day, list: scene.campaign.state.daily.list.length };
  });
  check(day.after === day.before + 1 && day.list >= 3, `Diárias do dia: ${JSON.stringify(day)}`);

  return { intro, wood, mushrooms, rats, persisted, journal, water, boss, assault, puzzle, hazard, choice, golem, day, shot };
});
