import { check, runInChrome } from './runtime-harness.mjs';

// Fase 18: jogar níveis altos (30, 60, 100, 150): tecla T, ícones de conjuntos, aprimorar, mascote, arena e renascimento.
await runInChrome({ name: 'highlevel', port: 9398, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, delay, send }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(300);
  const out = {};
  for (const level of [30, 60, 100, 150]) {
    out[`n${level}`] = await inScene(async (scene, lv) => {
      scene.progression.level = lv;
      const keys = Object.keys((await import('/src/data/gear.js')).GEAR_SETS);
      const key = keys.filter((k) => true)[Math.min(keys.length - 1, Math.floor(lv / 150 * keys.length) - 1 + (lv === 150 ? 1 : 0))] ?? keys[0];
      for (const slot of ['helmet', 'chest', 'legs', 'boots']) {
        const item = scene.gear.add(`${key}-${slot}`, 'rare');
        if (item) scene.gear.equip(item.uid, 150);
      }
      scene.player.recalculateEquipment(scene.camp.equipment);
      return { key, hp: scene.player.maxHealth, atk: scene.player.attack, def: scene.player.defense };
    }, level);
    await delay(300);
    await capture(`nivel-${level}.png`);
  }
  // (a) tecla T de verdade
  const press = async (type) => send('Input.dispatchKeyEvent', { type, key: 't', code: 'KeyT', windowsVirtualKeyCode: 84, nativeVirtualKeyCode: 84 });
  await press('rawKeyDown'); await press('keyUp'); await delay(400);
  out.tOpen = await inScene((scene) => scene.achievements.isOpen);
  await capture('tecla-t-conquistas.png');
  await press('rawKeyDown'); await press('keyUp'); await delay(300);
  out.tClose = await inScene((scene) => !scene.achievements.isOpen);
  // (b) painel de equipamento com ícones
  out.panel = await inScene(async (scene) => {
    scene.equipmentPanel.open();
    await new Promise((r) => setTimeout(r, 400));
    const imgs = [...document.querySelectorAll('[class*="equipment"] img, [class*="equipment"] canvas')];
    const broken = imgs.filter((i) => i.tagName === 'IMG' && (!i.complete || i.naturalWidth === 0)).length;
    return { icons: imgs.length, broken };
  });
  await capture('conjuntos-icones.png');
  // (c) aprimorar, mascote, arena, renascer
  out.rest = await inScene(async (scene) => {
    scene.equipmentPanel.close();
    
    scene.economy.addCoins(500000);
    const item = scene.gear.find(scene.gear.equipped.chest);
    const uid = item?.uid ?? item;
    let enh = null;
    for (let i = 0; i < 6; i += 1) { scene.inventory.items.iron = (scene.inventory.items.iron ?? 0) + 100; enh = scene.enhanceGear(uid); }
    scene.companions.state.owned.push('fairy');
    const pet = scene.companions.action('summon', 'fairy');
    scene.arenaAction('start');
    const arena = scene.arena.active && scene.arena.bosses.length;
    scene.arenaAction('leave');
    const re = scene.rebirthHero();
    return { enh: enh && { ok: enh.ok, msg: enh.message }, pet: pet?.ok, arena, re: re.ok, level: scene.progression.level, n: scene.progression.rebirths };
  });
  await capture('nivel150-renascido.png');
  check(out.tOpen && out.tClose, `Tecla T: ${JSON.stringify(out)}`);
  check(out.panel.broken === 0, `Ícones: ${JSON.stringify(out.panel)}`);
  check(out.rest.arena && out.rest.re && out.rest.level === 1, `Resto: ${JSON.stringify(out.rest)}`);
  return out;
});
