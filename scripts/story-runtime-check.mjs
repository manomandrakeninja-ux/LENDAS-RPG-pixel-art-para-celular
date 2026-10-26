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
  check(opening.visible && opening.title === 'O Viajante sem Memória' && opening.image === 240 && opening.paused, `Abertura: ${JSON.stringify(opening)}`);
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
  return { opening, lore, bramStory: bramStory.outro, choice, villagers, fight };
});
console.log('História e moradores OK.');
