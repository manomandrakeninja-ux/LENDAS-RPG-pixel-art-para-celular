import { check, runInChrome } from './runtime-harness.mjs';

// História (abertura dos capítulos, registros, Bram na missão 9, escolha da missão 95)
// e moradores dos prédios (chegam nos níveis 4 e 8, andam no acampamento, falam e lutam).
await runInChrome({ name: 'story', port: 9389, width: 1280, height: 800 }, async ({ evaluate, inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  // O save automático ao recarregar pode marcar a abertura como vista: força um jogo novo de verdade.
  await inScene((scene) => { scene.campaign.ui.closeDialogue(); scene.campaign.state.introShown = false; return true; });
  await delay(800);

  // 1. Jogo novo: abertura do capítulo 1 com ilustração; o jogo fica pausado; depois vem Bram.
  const opening = await evaluate(`(() => {
    const card = document.querySelector('.quest-chapter');
    const img = card?.querySelector('img');
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { visible: Boolean(card && !card.hidden), title: card?.querySelector('h2')?.textContent, image: img?.naturalWidth ?? 0, paused: scene.isUiPaused() };
  })()`);
  await capture('historia-capitulo-1.png');
  check(opening.visible && opening.title === 'O Viajante sem Memória' && opening.image === 400 && opening.paused, `Abertura: ${JSON.stringify(opening)}`);
  await evaluate(`document.querySelector('.quest-chapter button').click()`);
  await delay(200);
  const bram = await inScene((scene) => ({ dialog: !scene.campaign.ui.dialog.hidden, text: scene.campaign.ui.dialog.textContent }));
  check(bram.dialog && bram.text.includes('Bram'), `Conversa inicial: ${JSON.stringify(bram)}`);

  // 2. Registros: concluir a missão 1 libera "O despertar" e "Eldoria".
  const lore = await inScene((scene) => {
    const campaign = scene.campaign;
    campaign.ui.closeDialogue();
    campaign.accept('m001');
    campaign.onGathered({ wood: 5 });
    campaign.turnIn('m001');
    campaign.ui.closeReward();
    campaign.ui.closeDialogue();
    const m9 = campaign.state.constructor && window.__LENDAS__ ? null : null;
    return { lore: [...campaign.state.lore], state: campaign.state.stateOf('m001') };
  });
  check(lore.state === 'done' && lore.lore.includes('despertar') && lore.lore.includes('eldoria'), `Registros: ${JSON.stringify(lore)}`);

  // 3. Bram reage ao fragmento na missão 9; falas mudam por capítulo.
  const bramStory = await evaluate(`(async () => {
    const { MISSIONS_BY_ID } = await import('/src/data/campaign.js');
    const scene = window.__LENDAS__.scene.getScene('GameScene');
    return { outro: MISSIONS_BY_ID.m009.outro, lore: MISSIONS_BY_ID.m009.storyLore, lines: scene.campaign.storyLines('vigia') };
  })()`);
  check(bramStory.outro.includes('Bram fica pálido') && bramStory.lore.includes('fragmento') && bramStory.lines.some((line) => line.includes('camisa')),
    `Bram e o fragmento: ${JSON.stringify(bramStory)}`);

  // 4. Escolha da missão 95 fica salva.
  await inScene((scene) => { scene.campaign.makeChoice('destroy'); scene.campaign.ui.toast('ok'); scene.save(); return true; });
  await reload();
  const choice = await inScene((scene) => ({ choice: scene.campaign.state.choice }));
  check(choice.choice === 'destroy', `Escolha não ficou salva: ${JSON.stringify(choice)}`);

  // 4b. Aurelian: Eco do Rei aparece depois da missão 50 e mostra a memória ilustrada.
  const echo = await inScene(async (scene) => {
    const campaign = scene.campaign;
    const state = campaign.state;
    campaign.ui.closeChapter();
    campaign.ui.closeDialogue();
    for (const [id, entry] of Object.entries(state.missions)) {
      const n = Number(id.slice(1));
      entry.state = n <= 80 ? 'done' : 'locked';
      entry.rewarded = n <= 80;
    }
    state.refreshAvailability();
    campaign.syncWorld();
    const site = campaign.sites.get('eco-coroa');
    if (!site) return { site: false };
    scene.player.body.reset(site.def.x, site.def.y + 6);
    await new Promise((resolve) => setTimeout(resolve, 200));
    campaign.useSite('eco-coroa');
    await new Promise((resolve) => setTimeout(resolve, 300));
    const card = document.querySelector('.quest-chapter');
    const image = card.querySelector('img');
    const shown = { visible: !card.hidden, title: card.querySelector('h2').textContent, image: image.naturalWidth, src: image.getAttribute('src') };
    campaign.ui.closeChapter();
    const speaker = campaign.ui.dialog.querySelector('h3')?.textContent;
    campaign.ui.closeDialogue();
    campaign.syncWorld();
    return { site: true, shown, speaker, lore: state.lore.includes('ecoCoroa'), gone: !campaign.sites.has('eco-coroa') };
  });
  check(echo.site && echo.shown.visible && echo.shown.image === 400 && echo.shown.src.includes('aurelian') && echo.speaker === 'Aurelian, o Último Rei' && echo.lore && echo.gone,
    `Eco do Rei: ${JSON.stringify(echo)}`);
  await capture('historia-eco-do-rei.png');

  // 4c. Laço: Kael quer conversar depois da missão 40; a resposta gentil fortalece o laço.
  const bond = await inScene((scene) => {
    const campaign = scene.campaign;
    campaign.talkToNpc('cacador');
    const text = campaign.ui.dialog.textContent;
    campaign.ui.dialog.querySelector('button[data-dialog="0"]').click();
    const reply = campaign.ui.dialog.textContent;
    campaign.ui.closeDialogue();
    return { asked: text.includes('Kael'), flag: campaign.state.flags.bond_cacador, reply: reply.slice(0, 60) };
  });
  check(bond.asked && bond.flag === true, `Laço com Kael: ${JSON.stringify(bond)}`);

  // 4d. Missão 95: sem tudo descoberto, duas opções; com tudo, aparece "Libertar o Coração".
  const secret = await inScene((scene) => {
    const campaign = scene.campaign;
    const labels = () => [...campaign.ui.dialog.querySelectorAll('button')].map((button) => button.textContent);
    campaign.showGolemChoice();
    const before = labels();
    campaign.ui.closeDialogue();
    for (const key of ['ecoCoroa', 'ecoGelo', 'ecoForja', 'ordens', 'rota', 'eclipse', 'documentos']) campaign.state.addLore(key);
    for (const npc of ['cacador', 'curandeira', 'mercador', 'capitao', 'ferreiro', 'vigia']) campaign.state.flags[`bond_${npc}`] = true;
    campaign.showGolemChoice();
    const after = labels();
    campaign.ui.dialog.querySelector('button[data-dialog="0"]').click();
    return { before, after, choice: campaign.state.choice };
  });
  check(!secret.before.includes('LIBERTAR O CORAÇÃO') && secret.after.includes('LIBERTAR O CORAÇÃO') && secret.choice === 'free',
    `Final secreto: ${JSON.stringify(secret)}`);

  // 4e. Final secreto: cena "libertar" e as palavras finais de Aurelian.
  const ending = await inScene(async (scene) => {
    const campaign = scene.campaign;
    campaign.ui.closeDialogue();
    campaign.showEnding();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const card = document.querySelector('.quest-chapter');
    const result = { title: card.querySelector('h2').textContent, image: card.querySelector('img').naturalWidth, src: card.querySelector('img').getAttribute('src') };
    campaign.ui.closeChapter();
    result.words = campaign.ui.dialog.textContent.includes('Fui eu');
    campaign.ui.closeDialogue();
    result.lore = campaign.state.lore.includes('finalLibertar');
    scene.save();
    return result;
  });
  await capture('historia-final-secreto.png');
  check(ending.title === 'O CORAÇÃO LIVRE' && ending.image === 400 && ending.src.includes('libertar') && ending.words && ending.lore, `Final secreto: ${JSON.stringify(ending)}`);

  // 5. Moradores: nível 4 traz o homem, nível 8 a mulher.
  const villagers = await inScene(async (scene) => {
    scene.campaign.ui.closeChapter();
    scene.campaign.ui.closeDialogue();
    scene.campaign.ui.closeReward();
    scene.enemyDirector.spawnTimer = 1e9;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.player.body.reset(scene.camp.x, scene.camp.y + 60);
    scene.camp.levels.forge = 4;
    scene.villagers.sync();
    const afterFour = scene.villagers.snapshot().map((entry) => entry.id);
    scene.camp.levels.forge = 8;
    scene.camp.levels.house = 8;
    scene.villagers.sync();
    const afterEight = scene.villagers.snapshot().map((entry) => entry.id);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const radius = scene.villagers.wanderRadius + 20;
    const inside = scene.villagers.snapshot().every((entry) => Math.hypot(entry.x - scene.camp.x, (entry.y - scene.camp.y) / 0.85) <= radius + 10);
    // Balão de fala.
    const borin = scene.villagers.villagers.get('borin');
    borin.talkMs = 0;
    scene.player.body.reset(borin.container.x + 20, borin.container.y);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const talking = borin.bubble.visible && borin.def.lines.includes(borin.bubble.text);
    return { afterFour, afterEight, inside, talking };
  });
  await capture('moradores.png');
  check(villagers.afterFour.includes('borin') && !villagers.afterFour.includes('hilda'), `Nível 4: ${JSON.stringify(villagers)}`);
  check(['borin', 'hilda', 'marta', 'pipo'].every((id) => villagers.afterEight.includes(id)), `Nível 8: ${JSON.stringify(villagers)}`);
  check(villagers.inside && villagers.talking, `Andar no acampamento e falar: ${JSON.stringify(villagers)}`);

  // 6. Na invasão eles atacam os monstros (10 de dano), e o jogador não consegue atacá-los.
  const fight = await inScene(async (scene) => {
    let tries = 0;
    while (scene.enemies.length === 0 && tries < 60) { scene.enemyDirector.spawnOne(scene.timeState); tries += 1; }
    const Enemy = scene.enemies[0].constructor;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    const borin = scene.villagers.villagers.get('borin');
    const monster = new Enemy(scene, borin.container.x + 30, borin.container.y, 'skeleton', {});
    monster.update = () => {};
    monster.isQuestEnemy = true; // evita o despawn por fase do dia/distância
    monster.maxHealth = monster.health = 500;
    scene.enemyDirector.enemies.push(monster);
    scene.player.body.reset(scene.camp.x - 200, scene.camp.y + 150);
    await new Promise((resolve) => setTimeout(resolve, 3500));
    const targets = scene.nearestEnemy(9999);
    return {
      damaged: 500 - monster.health,
      playerTargetsVillager: [...scene.villagers.villagers.values()].some((villager) => villager.container === targets),
      villagerHealth: borin.health,
      paused: scene.isUiPaused(),
      inList: scene.enemies.includes(monster),
      threat: Boolean(scene.villagers.nearestThreat(borin)),
      dist: Math.round(Math.hypot(monster.x - borin.container.x, monster.y - borin.container.y)),
      panels: { dialog: !scene.campaign.ui.dialog.hidden, reward: !scene.campaign.ui.reward.hidden, chapter: !scene.campaign.ui.chapterCard.hidden, level: scene.progression.hasPendingChoice }
    };
  });
  check(fight.damaged >= 10 && fight.damaged % 10 === 0 && !fight.playerTargetsVillager, `Luta dos moradores: ${JSON.stringify(fight)}`);
  return { opening, lore, bramStory: bramStory.outro, choice, echo, bond, secret, ending, villagers, fight };
});
console.log('História e moradores OK.');
