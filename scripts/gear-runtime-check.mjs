import { check, runInChrome } from './runtime-harness.mjs';

// Pacote A: equipamento em 8 espaços, conjuntos, drops com raridade, loja do Ferreiro,
// Bênção da Fogueira, Amuleto de Proteção e poções em 3 forças.
await runInChrome({ name: 'gear', port: 9393, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(300);

  // 1. Loja do Ferreiro: comprar o conjunto de couro e vestir; ATQ/DEF sobem.
  const shop = await inScene(async (scene) => {
    scene.economy.addCoins(2000);
    const before = { defense: scene.player.defense, coins: scene.economy.coins };
    for (const id of ['couro-helmet', 'couro-chest', 'couro-legs', 'couro-boots', 'wardAmulet']) scene.buyGear(id);
    for (const item of [...scene.gear.loose]) scene.equipGear(item.uid);
    return {
      before, defense: scene.player.defense, maxHealth: scene.player.maxHealth, coins: scene.economy.coins,
      sets: scene.gear.activeSets(), protectedOnDeath: scene.gear.protectedOnDeath
    };
  });
  check(shop.defense > shop.before.defense && shop.sets.includes('couro') && shop.protectedOnDeath && shop.coins < shop.before.coins,
    `Loja e conjunto: ${JSON.stringify(shop)}`);

  // 2. Painel de equipamento (tecla V) abre, pausa o jogo e mostra os 8 espaços.
  const panel = await inScene(async (scene) => {
    scene.equipmentPanel.open();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const root = document.querySelector('.equipment, .equipment-panel, [class*="equipment"]');
    return { open: scene.equipmentPanel.isOpen, paused: scene.isUiPaused(), visible: Boolean(root && root.offsetWidth > 0) };
  });
  await capture('equipamento-painel.png');
  check(panel.open && panel.paused && panel.visible, `Painel: ${JSON.stringify(panel)}`);

  // 3. Drop de chefe: duas peças, uma lendária; arma vestida troca a espada da Forja.
  const drop = await inScene(async (scene) => {
    scene.equipmentPanel.close();
    scene.progression.level = 150;
    const fake = { x: 5600, y: 4500, isElite: false, isRegionBoss: true, kind: 'dragon' };
    const before = scene.gear.bag.length;
    const random = Math.random;
    Math.random = () => 0.1;
    scene.dropGear(fake);
    Math.random = random;
    const legendary = scene.gear.bag.find((item) => item.rarity === 'legendary');
    if (legendary) scene.equipGear(legendary.uid);
    return {
      gained: scene.gear.bag.length - before, legendary: legendary?.id, forgeWeapon: scene.camp.equipment.equipped.weapon,
      attack: scene.player.attack, texture: scene.player.weapon.texture.key
    };
  });
  check(drop.gained === 2 && drop.legendary === 'dragonClaw' && drop.forgeWeapon === null && drop.texture === 'gear-sword-dragon',
    `Drop do chefe: ${JSON.stringify(drop)}`);

  // 4. Morte: bênção protege primeiro, depois o amuleto se quebra; sem proteção perde parte da mochila.
  const death = await inScene(async (scene) => {
    scene.economy.addCoins(10000);
    scene.buyBlessing();
    const blessed = scene.gear.blessed;
    scene.inventory.add('wood', 10);
    scene.respawn();
    const afterBlessing = { wood: scene.inventory.items.wood ?? 0, blessed: scene.gear.blessed, amulet: Boolean(scene.gear.equippedItem('amulet')) };
    scene.respawn();
    const afterAmulet = { wood: scene.inventory.items.wood ?? 0, amulet: Boolean(scene.gear.equippedItem('amulet')) };
    return { blessed, afterBlessing, afterAmulet };
  });
  check(death.blessed && death.afterBlessing.wood === 10 && !death.afterBlessing.blessed && death.afterBlessing.amulet &&
    death.afterAmulet.wood === 10 && !death.afterAmulet.amulet, `Proteção na morte: ${JSON.stringify(death)}`);

  // 5. Poções: a tecla 1 usa a menor que basta; a Grande pede nível 15.
  const potions = await inScene(async (scene) => {
    scene.inventory.add('potion', 1);
    scene.inventory.add('potionGreat', 1);
    scene.player.health = scene.player.maxHealth - 30;
    scene.lastPotionAt = -Infinity;
    scene.useHotkey('1');
    const usedSmall = (scene.inventory.items.potion ?? 0) === 0;
    scene.player.health = 10;
    scene.lastPotionAt = -Infinity;
    scene.useHotkey('1');
    return { usedSmall, usedGreat: (scene.inventory.items.potionGreat ?? 0) === 0, full: scene.player.health === scene.player.maxHealth };
  });
  check(potions.usedSmall && potions.usedGreat && potions.full, `Poções: ${JSON.stringify(potions)}`);

  // 6. Loja no Ferreiro e Bênção na Fogueira aparecem nos menus.
  const menus = await inScene(async (scene) => {
    scene.openBuilding('forge');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const tabs = [...document.querySelectorAll('#building-menu button')].map((button) => button.textContent.trim());
    const shopTab = [...document.querySelectorAll('#building-menu button')].find((button) => /loja/i.test(button.textContent));
    shopTab?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const shopHtml = document.getElementById('building-menu-content')?.textContent ?? '';
    return { hasShop: Boolean(shopTab), listsLeather: shopHtml.includes('Couro'), tabs: tabs.slice(0, 12) };
  });
  await capture('equipamento-loja.png');
  check(menus.hasShop && menus.listsLeather, `Loja do Ferreiro: ${JSON.stringify(menus)}`);
  const campfire = await inScene(async (scene) => {
    scene.buildingMenu.close();
    scene.openBuilding('campfire');
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { blessing: (document.getElementById('building-menu-content')?.textContent ?? '').includes('Bênção') };
  });
  await capture('equipamento-bencao.png');
  check(campfire.blessing, `Bênção na Fogueira: ${JSON.stringify(campfire)}`);

  // 6b. Aprimorar e joias no Ferreiro (aba Aprimorar), com ferro e moedas.
  const enh = await inScene(async (scene) => {
    scene.buildingMenu.close();
    scene.economy.addCoins(20000);
    scene.inventory.items.iron = (scene.inventory.items.iron ?? 0) + 50;
    const item = scene.gear.find(scene.gear.equipped.weapon);
    const before = scene.player.attack;
    scene.openBuilding('forge');
    await new Promise((resolve) => setTimeout(resolve, 250));
    [...document.querySelectorAll('#building-menu button')].find((button) => /^aprimorar$/i.test(button.textContent.trim()))?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const card = document.querySelector(`[data-enhance-uid="${item.uid}"] [data-action="enhance-gear"]`);
    card?.click();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const upgraded = item.upgrade;
    const afterPlus = scene.player.attack;
    scene.gear.addJewel('fire');
    const sockets = item.sockets.length;
    scene.socketGear(item.uid, 'fire');
    const afterJewel = scene.player.attack;
    scene.save();
    return { hasCard: Boolean(card), upgraded, before, afterPlus, afterJewel, sockets, jewel: item.sockets[0] };
  });
  await capture('equipamento-aprimorar.png');
  check(enh.hasCard && enh.upgraded === 1 && enh.afterPlus > enh.before && enh.afterJewel > enh.afterPlus && enh.jewel === 'fire',
    `Aprimorar e joias: ${JSON.stringify(enh)}`);

  // 7. Tudo salvo.
  await inScene((scene) => { scene.buildingMenu.close(); scene.save(); return true; });
  await reload();
  const saved = await inScene((scene) => ({ weapon: scene.gear.equippedItem('weapon')?.id, sets: scene.gear.activeSets(), bag: scene.gear.bag.length, upgrade: scene.gear.equippedItem('weapon')?.upgrade, jewel: scene.gear.equippedItem('weapon')?.sockets?.[0] }));
  check(saved.weapon === 'dragonClaw' && saved.sets.includes('couro') && saved.upgrade === 1 && saved.jewel === 'fire', `Save do equipamento: ${JSON.stringify(saved)}`);
});
