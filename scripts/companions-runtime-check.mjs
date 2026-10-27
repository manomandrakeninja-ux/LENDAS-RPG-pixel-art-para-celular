import { check, runInChrome } from './runtime-harness.mjs';

// Fase 13: mascotes (compra, ajuda, ovo), montaria (nível 20, +35%, desmonta com dano) e save.
await runInChrome({ name: 'companions', port: 9395, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(300);

  // 1. Cartão na Fogueira + compra do Filhote de Lobo.
  const shop = await inScene(async (scene) => {
    scene.economy.coins = 5000;
    scene.openBuilding('campfire');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const hasCard = Boolean(document.querySelector('[data-companions]'));
    document.querySelector('button[data-action="pet-buy"][data-arg="wolfpup"]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const owned = scene.companions.state.has('wolfpup');
    scene.buildingMenu.close();
    return { hasCard, owned, active: scene.companions.state.active, sprite: Boolean(scene.companions.petSprite), coins: scene.economy.coins };
  });
  await capture('mascote-comprado.png');
  check(shop.hasCard && shop.owned && shop.active === 'wolfpup' && shop.sprite && shop.coins === 4500, `Compra: ${JSON.stringify(shop)}`);

  // 2. O mascote segue o herói e ataca.
  const help = await inScene(async (scene) => {
    scene.player.setPosition(scene.player.x + 400, scene.player.y);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const sprite = scene.companions.petSprite;
    const near = Math.hypot(sprite.x - scene.player.x, sprite.y - scene.player.y) < 80;
    const rat = scene.enemyDirector.addEnemy('rat', scene.companions.px + 40, scene.companions.py, {});
    rat.health = 99999;
    rat.maxHealth = 99999;
    rat.isQuestEnemy = true;
    const before = rat.health;
    for (let i = 0; i < 12 && rat.health >= before; i += 1) await new Promise((resolve) => setTimeout(resolve, 500));
    const hit = rat.health < before;
    scene.damageEnemy(rat, 999999);
    return { near, hit };
  });
  check(help.near && help.hit, `Segue e ataca: ${JSON.stringify(help)}`);

  // 3. Ovo e fada que cura.
  const egg = await inScene((scene) => {
    scene.companions.state.eggs = 1;
    const hatch = scene.companions.action('hatch');
    scene.companions.state.owned.push('fairy');
    scene.companions.action('summon', 'fairy');
    scene.player.health = Math.max(1, scene.player.maxHealth - 40);
    return { hatch: hatch.ok, pet: scene.companions.state.active, eggs: scene.companions.state.eggs };
  });
  const healed = await inScene((scene) => {
    const before = scene.player.health;
    scene.companions.healTimer = 5990;
    scene.companions.runAbility(50, scene.player);
    return { h: scene.player.health - before, m: 0 };
  });
  check(egg.hatch && egg.pet === "fairy" && egg.eggs === 0 && healed.h > 0, `Ovo e cura: ${JSON.stringify(egg)} curou=${JSON.stringify(healed)}`);

  // 4. Montaria: bloqueada no nível 19, liberada no 20, +35% e desmonta ao levar dano.
  const mount = await inScene((scene) => {
    scene.progression.level = 19;
    const locked = !scene.companions.action('mount').ok;
    scene.progression.level = 20;
    const ok = scene.companions.action('mount').ok;
    const speed = scene.companions.speed;
    const sprite = Boolean(scene.companions.mountSprite);
    scene.player.invulnerable = 0;
    scene.player.damage(1);
    return { locked, ok, speed, sprite, dismounted: !scene.companions.state.mounted && !scene.companions.mountSprite };
  });
  check(mount.locked && mount.ok && mount.speed === 1.35 && mount.sprite && mount.dismounted, `Montaria: ${JSON.stringify(mount)}`);

  // 5. Save e recarga.
  await inScene((scene) => { scene.companions.action('mount'); scene.save(); return true; });
  await reload();
  const saved = await inScene((scene) => ({ ...scene.companions.serialize(), sprite: Boolean(scene.companions.mountSprite) }));
  check(saved.owned.includes('wolfpup') && saved.owned.includes('fairy') && saved.active === 'fairy' && saved.mounted && saved.sprite, `Save: ${JSON.stringify(saved)}`);
});
