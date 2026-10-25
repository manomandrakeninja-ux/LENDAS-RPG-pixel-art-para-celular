import { check, runInChrome } from './runtime-harness.mjs';

// Menus dos prédios (LENDAS, 10 níveis): cada ação é feita clicando nos botões do painel, no celular.
const click = (selector) => `(() => {
  const button = document.querySelector('${selector}');
  if (!button) throw new Error('Botão ausente: ${selector}');
  if (button.disabled) throw new Error('Botão desabilitado: ${selector}');
  button.click();
})()`;

await runInChrome({ name: 'system2', port: 9354, width: 390, height: 844, mobile: true }, async ({ evaluate, inScene, capture, freshStart }) => {
  await freshStart();
  await inScene((scene) => {
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9;
    scene.player.body.reset(scene.camp.x, scene.camp.y + 85);
    for (const type of Object.keys(scene.camp.storage)) scene.camp.storage[type] = 0;
  });

  // Painel em tela cheia no celular.
  const panel = await inScene((scene) => {
    scene.openBuilding('farm');
    const rect = document.getElementById('building-menu').getBoundingClientRect();
    return { width: rect.width, height: rect.height, viewport: [innerWidth, innerHeight] };
  });
  check(panel.width >= panel.viewport[0] - 2 && panel.height >= panel.viewport[1] - 2, `Painel não está em tela cheia: ${JSON.stringify(panel)}`);

  // Fazenda: plantar com semente do armazém e colher.
  await inScene((scene) => {
    scene.camp.storage.seeds = 3;
    scene.buildingMenu.refresh();
  });
  await evaluate(click('[data-action="plant"][data-arg="0"][data-arg2="wheat"]'));
  const planted = await inScene((scene) => ({ crop: scene.farm.plots[0].crop, seeds: scene.camp.storage.seeds }));
  check(planted.crop === 'wheat' && planted.seeds === 2, `Plantio: ${JSON.stringify(planted)}`);
  await inScene((scene) => {
    scene.farm.plots[0].readyAt = Date.now() - 1;
    scene.buildingMenu.refresh();
  });
  await evaluate(click('[data-action="harvest"][data-arg="0"]'));
  const harvested = await inScene((scene) => ({ crop: scene.farm.plots[0].crop, food: scene.inventory.items.food }));
  check(harvested.crop === null && harvested.food >= 2, `Colheita: ${JSON.stringify(harvested)}`);

  // Fazenda nível 2: cercado com galinhas.
  const farm2 = await inScene((scene) => {
    scene.camp.storage.wood = 8;
    scene.camp.storage.stone = 4;
    scene.camp.storage.seeds = 4;
    scene.buildingMenu.tab = 'upgrades';
    scene.buildingMenu.refresh();
    document.querySelector('[data-action="upgrade"][data-arg="farm"]').click();
    scene.farm.animals.egg.readyAt = Date.now() - 1;
    scene.buildingMenu.tab = 'animals';
    scene.buildingMenu.refresh();
    return { level: scene.camp.levels.farm, plots: scene.farm.plotCount, tabs: [...document.querySelectorAll('[data-tab]')].map((tab) => tab.dataset.tab) };
  });
  check(farm2.level === 2 && farm2.plots === 4 && farm2.tabs.includes('animals'), `Fazenda nível 2: ${JSON.stringify(farm2)}`);
  await evaluate(click('[data-action="collect-animal"][data-arg="egg"]'));
  const eggs = await inScene((scene) => scene.inventory.items.egg);
  check(eggs === 2, `Ovos das 2 galinhas: ${eggs}`);
  await capture('menus-farm.png');

  // Ferreiro: Espada Simples (2 ferro) e reparo no nível 4.
  await inScene((scene) => {
    scene.buildingMenu.close();
    scene.camp.storage.iron = 2;
    scene.openBuilding('forge');
  });
  await evaluate(click('[data-action="craft"][data-arg="simpleSword"]'));
  const sword = await inScene((scene) => ({ has: scene.camp.equipment.has('simpleSword'), attack: scene.player.attack, iron: scene.camp.storage.iron }));
  check(sword.has && sword.attack === 17 && sword.iron === 0, `Espada simples: ${JSON.stringify(sword)}`);
  await inScene((scene) => {
    scene.camp.levels.forge = 4;
    scene.camp.equipment.forgeLevel = 4;
    scene.camp.equipment.items.simpleSword.durability = 0;
    scene.player.recalculateEquipment(scene.camp.equipment);
    scene.camp.storage.iron = 5;
    scene.buildingMenu.tab = 'gear';
    scene.buildingMenu.refresh();
  });
  const broken = await inScene((scene) => scene.player.attack);
  await evaluate(click('[data-action="repair-item"][data-arg="simpleSword"]'));
  const repaired = await inScene((scene) => ({ durability: scene.camp.equipment.items.simpleSword.durability, attack: scene.player.attack }));
  check(broken === 14 && repaired.durability === 120 && repaired.attack === 17, `Reparo: quebrada ${broken}, ${JSON.stringify(repaired)}`);

  // Casa: guardar/retirar, descansar (50%) e dormir só no nível 2.
  await inScene((scene) => {
    scene.buildingMenu.close();
    scene.inventory.items.wood = 4;
    scene.openBuilding('house');
  });
  await evaluate(click('[data-action="deposit"][data-arg="wood"]'));
  await evaluate(click('[data-action="withdraw"][data-arg="wood"]'));
  const storage = await inScene((scene) => ({ carried: scene.inventory.items.wood, stored: scene.camp.storage.wood, label: scene.camp.storageLabel }));
  check(storage.carried === 4 && storage.label.endsWith('/20 slots'), `Armazém: ${JSON.stringify(storage)}`);
  await inScene((scene) => {
    scene.player.health = 20;
    scene.buildingMenu.tab = 'rest';
    scene.buildingMenu.refresh();
  });
  await evaluate(click('[data-action="rest"]'));
  const rest = await inScene((scene) => ({
    health: scene.player.health,
    resting: Boolean(scene.restState),
    sleepDisabled: document.querySelector('[data-action="sleep"]').disabled
  }));
  check(rest.health === 70 && rest.resting && rest.sleepDisabled, `Descanso nível 1: ${JSON.stringify(rest)}`);
  const sleep = await inScene((scene) => {
    scene.restTimer?.remove(false);
    scene.restTimer = null;
    scene.restState = null;
    scene.camp.levels.house = 2;
    scene.buildingMenu.refresh();
    const before = scene.dayNight.dayCount;
    document.querySelector('[data-action="sleep"]').click();
    return { before, after: scene.dayNight.dayCount };
  });
  check(sleep.after === sleep.before + 1, `Dormir no nível 2: ${JSON.stringify(sleep)}`);

  // Mercado: compra com moedas; venda só a partir do nível 2.
  const market1 = await inScene((scene) => {
    scene.buildingMenu.close();
    scene.economy.coins = 20;
    scene.openBuilding('market');
    return { tabs: [...document.querySelectorAll('[data-tab]')].map((tab) => tab.dataset.tab) };
  });
  check(!market1.tabs.includes('sell'), 'Venda não deveria existir no Mercado nível 1.');
  await evaluate(click('[data-action="buy"][data-arg="seeds"]'));
  const bought = await inScene((scene) => ({ coins: scene.economy.coins, seeds: scene.inventory.items.seeds }));
  check(bought.coins === 15 && bought.seeds === 1, `Compra: ${JSON.stringify(bought)}`);
  await inScene((scene) => {
    scene.camp.levels.market = 2;
    scene.market.setLevel(2);
    scene.buildingMenu.tab = 'sell';
    scene.buildingMenu.refresh();
  });
  await evaluate(click('[data-action="sell"][data-arg="wood"]'));
  const sold = await inScene((scene) => ({ coins: scene.economy.coins, wood: scene.inventory.items.wood }));
  check(sold.coins === 16 && sold.wood === 3, `Venda: ${JSON.stringify(sold)}`);

  // Fogueira nível 3: cozinhar 2 comidas em 1 poção.
  await inScene((scene) => {
    scene.buildingMenu.close();
    scene.camp.levels.campfire = 3;
    scene.inventory.items.food = 2;
    scene.inventory.items.egg = 0;
    scene.openBuilding('campfire');
  });
  await evaluate(click('[data-action="cook"]'));
  const cooked = await inScene((scene) => ({ food: scene.inventory.items.food, potion: scene.inventory.items.potion }));
  check(cooked.food === 0 && cooked.potion === 1, `Cozinhar: ${JSON.stringify(cooked)}`);

  // Muralha: reparo custa 5 madeiras a cada 10% perdido.
  await inScene((scene) => {
    scene.buildingMenu.close();
    scene.camp.storage.wood = 40;
    scene.camp.storage.stone = 10;
    scene.upgradeBuilding('wall');
    scene.camp.defense.wallHp = 150;
    scene.openBuilding('wall');
  });
  await evaluate(click('[data-action="repair-wall"]'));
  const wall = await inScene((scene) => ({ hp: scene.camp.defense.wallHp, wood: scene.camp.storage.wood + scene.inventory.items.wood }));
  check(wall.hp === 200, `Reparo da muralha: ${JSON.stringify(wall)}`);
  await capture('menus-wall.png');

  // Tudo persiste.
  const persisted = await inScene((scene) => {
    scene.buildingMenu.close();
    scene.save();
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    return {
      farm: save.camp.levels.farm,
      sword: Boolean(save.camp.crafted.items.simpleSword),
      house: save.camp.levels.house,
      wall: save.camp.levels.wall
    };
  });
  check(persisted.farm === 2 && persisted.sword && persisted.house === 2 && persisted.wall === 1, `Save: ${JSON.stringify(persisted)}`);
  return { panel, planted, harvested, farm2, eggs, sword, repaired, storage, rest, sleep, bought, sold, cooked, wall, persisted };
});
