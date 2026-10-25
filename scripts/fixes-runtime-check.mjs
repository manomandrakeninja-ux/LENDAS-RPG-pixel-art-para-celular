import { check, runInChrome } from './runtime-harness.mjs';

// Correções de 25/10: cliques não atravessam menus, pausa automática, receitas, baú de monstro e menu compacto.
await runInChrome({ name: 'fixes', port: 9387, width: 1280, height: 800 }, async ({ evaluate, inScene, send, capture, freshStart, delay }) => {
  const clickAt = async (x, y) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await delay(200);
  };
  await freshStart();
  await inScene((scene) => {
    scene.campaign?.ui.closeDialogue();
    scene.enemyDirector.spawnTimer = 1e9;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.player.body.reset(scene.camp.x, scene.camp.y + 40);
    scene.cameras.main.centerOn(scene.camp.x, scene.camp.y);
    return true;
  });
  await delay(300);

  // 1. Clicar em vários pontos dentro do menu da Fazenda não abre outro prédio por trás.
  await inScene((scene) => { scene.buildingMenu.open('farm'); return true; });
  await delay(350);
  const box = await evaluate(`(() => {
    const r = document.querySelector('.building-menu__window').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, viewport: innerWidth, viewportHeight: innerHeight };
  })()`);
  for (const [fx, fy] of [[0.2, 0.5], [0.5, 0.5], [0.8, 0.6], [0.5, 0.85], [0.3, 0.3]]) {
    await clickAt(box.left + box.width * fx, box.top + box.height * fy);
  }
  const afterClicks = await inScene((scene) => ({ building: scene.buildingMenu.building, open: scene.buildingMenu.isOpen }));
  check(afterClicks.open && afterClicks.building === 'farm', `Clique atravessou o menu: ${JSON.stringify(afterClicks)}`);
  // Menu menor que a tela.
  check(box.width <= box.viewport * 0.9 && box.height <= box.viewportHeight * 0.86, `Menu grande demais: ${JSON.stringify(box)}`);
  await capture('menu-compacto.png');

  // 2. Pausa automática: com o menu aberto o relógio e a física param.
  const paused = await inScene(async (scene) => {
    const before = scene.dayNight.cycleTime;
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { before, after: scene.dayNight.cycleTime, physicsPaused: scene.physics.world.isPaused };
  });
  check(paused.before === paused.after && paused.physicsPaused, `Menu aberto não pausou: ${JSON.stringify(paused)}`);
  const running = await inScene(async (scene) => {
    scene.buildingMenu.close();
    const before = scene.dayNight.cycleTime;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { advanced: scene.dayNight.cycleTime > before, physicsPaused: scene.physics.world.isPaused };
  });
  check(running.advanced && !running.physicsPaused, `Fechar o menu não despausou: ${JSON.stringify(running)}`);
  // Conversa com o vigia e tela de missão concluída também pausam (e a tela fica até CONTINUAR).
  const dialogPause = await inScene(async (scene) => {
    scene.campaign.ui.dialogue('vigia', 'Teste de pausa.', [{ label: 'OK', action: () => {} }]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const dialog = scene.physics.world.isPaused;
    scene.campaign.ui.closeDialogue();
    scene.campaign.ui.showReward({ number: 1, title: 'Teste' }, { coins: 1 });
    await new Promise((resolve) => setTimeout(resolve, 6500));
    const rewardStill = !scene.campaign.ui.reward.hidden;
    const reward = scene.physics.world.isPaused;
    scene.campaign.ui.closeReward();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { dialog, rewardStill, reward, resumed: !scene.physics.world.isPaused };
  });
  check(dialogPause.dialog && dialogPause.reward && dialogPause.rewardStill && dialogPause.resumed, `Pausa em conversa/missão: ${JSON.stringify(dialogPause)}`);

  // 3. Receitas: aba nos prédios e criação de verdade.
  const recipe = await inScene((scene) => {
    scene.inventory.items.fish = 1;
    scene.inventory.items.wood = 3;
    const food = scene.inventory.items.food;
    const result = scene.buildingMenuAction('craft-item', 'roastFish');
    const tabs = ['campfire', 'house', 'forge', 'farm'].map((key) => scene.buildingMenu.tabsFor(key).some((tab) => tab.id === 'recipes'));
    return { ok: result.ok, message: result.message, food: scene.inventory.items.food - food, fish: scene.inventory.items.fish, tabs };
  });
  check(recipe.ok && recipe.food === 3 && recipe.fish === 0 && recipe.tabs.every(Boolean), `Receita: ${JSON.stringify(recipe)}`);

  // 4. Monstro elite deixa um baú com itens e moedas.
  const chest = await inScene((scene) => {
    let tries = 0;
    while (scene.enemies.length === 0 && tries < 60) { scene.enemyDirector.spawnOne(scene.timeState); tries += 1; }
    const Enemy = scene.enemies[0].constructor;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    const elite = new Enemy(scene, scene.player.x + 30, scene.player.y, 'skeleton', { elite: true });
    scene.enemyDirector.enemies.push(elite);
    const before = scene.deathBackpacks.backpacks.length;
    scene.damageEnemy(elite, 99999);
    const dropped = scene.deathBackpacks.backpacks.filter((entry) => entry.kind === 'chest');
    const box = dropped.at(-1);
    const coins = scene.economy.coins;
    const total = scene.inventory.total;
    scene.player.body.reset(box.x, box.y);
    scene.interact();
    return {
      dropped: scene.deathBackpacks.backpacks.length - before >= 0 && dropped.length === 1,
      items: Object.keys(box.items ?? {}).length,
      gainedCoins: scene.economy.coins - coins,
      gainedItems: scene.inventory.total - total,
      remaining: scene.deathBackpacks.backpacks.filter((entry) => entry.kind === 'chest').length,
      message: scene.ui.message.text
    };
  });
  check(chest.dropped && chest.gainedCoins >= 10 && chest.gainedItems > 0 && chest.remaining === 0 && chest.message.includes('Baú'),
    `Baú do monstro: ${JSON.stringify(chest)}`);
  return { afterClicks, box, paused, running, dialogPause, recipe, chest };
});
console.log('Correções OK.');
