import { check, runInChrome } from './runtime-harness.mjs';

// Sistema 1: 7 prédios com 10 níveis, Muralha, Torre de Vigia, Fogueira com menu e conclusão do acampamento.
await runInChrome({ name: 'buildings', port: 9351 }, async ({ inScene, capture, reload, freshStart, delay }) => {
  await freshStart();

  const initial = await inScene((scene) => ({
    levels: { ...scene.camp.levels },
    wallPosts: scene.camp.defense.posts.length,
    towers: scene.camp.defense.towers.length,
    protectRadius: scene.camp.protectRadius,
    plots: scene.farm.plotCount,
    offers: scene.market.offers.map((offer) => offer.id).sort(),
    storage: scene.camp.storageLabel
  }));
  check(JSON.stringify(initial.levels) === JSON.stringify({ campfire: 1, farm: 1, forge: 1, house: 1, market: 1, wall: 0, tower: 0 }),
    `Níveis iniciais errados: ${JSON.stringify(initial.levels)}`);
  check(initial.wallPosts === 0 && initial.towers === 0, 'Muralha e Torre deveriam começar sem construir.');
  check(initial.plots === 2, `Fazenda nível 1 deveria ter 2 canteiros: ${initial.plots}`);
  check(initial.offers.join() === 'healthPotion,seeds,torch,wood', `Mercado nível 1: ${initial.offers}`);

  // Visão geral (tecla C) lista os 7 prédios.
  const overview = await inScene((scene) => {
    scene.player.body.reset(scene.camp.x, scene.camp.y + 85);
    scene.toggleCampMenu();
    return {
      open: scene.ui.campOpen,
      cards: document.querySelectorAll('#building-menu-content .building-menu__card').length,
      buildButtons: document.querySelectorAll('[data-action="upgrade"]').length
    };
  });
  check(overview.open && overview.cards === 8, `Visão geral deveria ter 7 prédios + dormir: ${JSON.stringify(overview)}`);

  // Constrói a Muralha clicando no botão, pagando com o armazém e moedas.
  await inScene((scene) => {
    for (const type of Object.keys(scene.camp.storage)) scene.camp.storage[type] = 0;
    scene.camp.storage.wood = 30;
    scene.camp.storage.stone = 10;
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="upgrade"][data-arg="wall"]').click();
  });
  const wall = await inScene((scene) => ({
    level: scene.camp.levels.wall,
    hp: scene.camp.defense.wallHp,
    posts: scene.camp.defense.posts.length,
    wood: scene.camp.storage.wood,
    stone: scene.camp.storage.stone
  }));
  check(wall.level === 1 && wall.hp === 200 && wall.posts > 50, `Muralha não foi construída: ${JSON.stringify(wall)}`);
  check(wall.wood === 10 && wall.stone === 4, `Custo da muralha não saiu do armazém: ${JSON.stringify(wall)}`);
  await capture('buildings-overview.png');

  // Fogueira tem menu próprio.
  const fireMenu = await inScene((scene) => {
    scene.buildingMenu.close();
    scene.openBuilding('campfire');
    return { title: document.getElementById('building-menu-title').textContent, tabs: [...document.querySelectorAll('[data-tab]')].map((tab) => tab.textContent.trim()) };
  });
  check(fireMenu.title === 'Fogueira' && fireMenu.tabs.includes('Níveis'), `Menu da Fogueira: ${JSON.stringify(fireMenu)}`);

  // Torre nível 1 atira sozinha em um inimigo dentro do alcance.
  const towerHit = await inScene(async (scene) => {
    scene.buildingMenu.close();
    scene.camp.storage.wood = 50;
    scene.camp.storage.stone = 50;
    scene.upgradeBuilding('tower');
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    const tower = scene.camp.defense.towers[0];
    const { Enemy } = await import('/src/game/Enemies.js');
    const target = new Enemy(scene, tower.x - 120, tower.y + 40, 'slime');
    target.stun(8000);
    scene.enemies.push(target);
    scene.hudCamera.ignore(target);
    scene.__towerTarget = target;
    return { level: scene.camp.levels.tower, towers: scene.camp.defense.towers.length, expected: scene.camp.defense.towerStat('towers'), health: target.health };
  });
  // O número de torres vem de buildings.json (hoje 4 já no nível 1).
  check(towerHit.level === 1 && towerHit.towers === towerHit.expected && towerHit.towers >= 1, `Torre não foi construída: ${JSON.stringify(towerHit)}`);
  await delay(3800);
  const afterArrow = await inScene((scene) => ({ health: scene.__towerTarget.health, active: scene.__towerTarget.active }));
  check(!afterArrow.active || afterArrow.health < towerHit.health, `A torre não atirou: ${JSON.stringify(afterArrow)}`);

  // Leva todos os prédios ao nível 10: mensagem épica e masmorra no mapa.
  const complete = await inScene((scene) => {
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    for (const type of Object.keys(scene.camp.storage)) scene.camp.storage[type] = 5000;
    scene.economy.coins = 100000;
    const order = ['campfire', 'farm', 'forge', 'house', 'market', 'wall', 'tower'];
    const failures = [];
    for (const key of order) {
      while (scene.camp.levels[key] < 10) {
        const result = scene.upgradeBuilding(key);
        if (!result.ok) {
          failures.push(`${key}: ${result.message}`);
          break;
        }
      }
    }
    return {
      failures,
      levels: { ...scene.camp.levels },
      banner: !document.getElementById('epic-banner').hidden,
      bannerText: document.getElementById('epic-banner-text').textContent,
      dungeon: scene.camp.dungeonRevealed,
      dungeonSprite: Boolean(scene.dungeonMarker),
      plots: scene.farm.plotCount,
      offers: scene.market.offers.length,
      storageSlots: scene.camp.storageSlots,
      wallHp: scene.camp.defense.wallHp,
      towers: scene.camp.defense.towers.length,
      fireRadius: scene.camp.protectRadius,
      fireResistance: scene.player.fireResistance
    };
  });
  check(complete.failures.length === 0, `Falhas ao melhorar: ${complete.failures.join(' | ')}`);
  check(Object.values(complete.levels).every((level) => level === 10), `Nem todos chegaram ao 10: ${JSON.stringify(complete.levels)}`);
  check(complete.banner && complete.bannerText === 'O acampamento está completo! O Dragão foi localizado. Prepare-se.',
    `Mensagem épica ausente: ${complete.bannerText}`);
  check(complete.dungeon && complete.dungeonSprite, 'A masmorra não foi marcada.');
  check(complete.plots === 8 && complete.storageSlots === null && complete.wallHp === 20000 && complete.towers === 4,
    `Efeitos do nível 10 errados: ${JSON.stringify(complete)}`);
  check(complete.fireRadius === 340 && complete.fireResistance >= 0.6, `Fogueira lendária: ${JSON.stringify(complete)}`);

  await inScene((scene) => {
    scene.player.body.reset(scene.camp.x, scene.camp.y + 200);
    scene.cameras.main.setZoom(1);
  });
  await delay(600);
  await capture('buildings-camp-level10.png');
  const mapState = await inScene((scene) => {
    scene.cameras.main.setZoom(2);
    scene.worldMap.open();
    scene.worldMap.render();
    return scene.worldMap.isOpen;
  });
  check(mapState, 'O mapa não abriu.');
  await delay(300);
  await capture('buildings-map-dungeon.png');

  // Tudo persiste depois de recarregar.
  await inScene((scene) => {
    scene.worldMap.close();
    scene.save();
  });
  await reload();
  const persisted = await inScene((scene) => ({
    levels: { ...scene.camp.levels },
    dungeon: scene.camp.dungeonRevealed,
    wallHp: scene.camp.defense.wallHp,
    savedVersion: JSON.parse(localStorage.getItem('lendas-save-v2')).camp.buildingLevelsVersion
  }));
  check(Object.values(persisted.levels).every((level) => level === 10) && persisted.dungeon && persisted.wallHp === 20000 && persisted.savedVersion === 3,
    `Persistência falhou: ${JSON.stringify(persisted)}`);
  return { initial, wall, towerHit, afterArrow, complete, persisted };
});
