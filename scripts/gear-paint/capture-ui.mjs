// G-armas: capturas do inventário (painel de equipamento) e da loja do Ferreiro no jogo.
// Uso (com o Vite em 127.0.0.1:5173): node scripts/gear-paint/capture-ui.mjs [tag]
import { runInChrome } from '../runtime-harness.mjs';

const tag = process.argv[2] ?? 'depois';
await runInChrome({ name: 'garmas-ui', port: 9441, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, evaluate }) => {
  await freshStart();
  await evaluate(`import('/src/equipment.css')`).catch(() => null);
  await inScene(async (scene) => {
    scene.campaign?.ui?.closeChapter?.(); scene.campaign?.ui?.closeDialogue?.();
    try { scene.progression.level = 150; } catch { /* só leitura */ }
    const items = [['glacial-helmet', 'rare'], ['orcAxe', 'uncommon'], ['couro-chest', 'common'], ['dragonClaw', 'legendary'], ['wardAmulet', 'common'],
      ['bosque-legs', 'uncommon'], ['frostSpear', 'rare'], ['pharaohStaff', 'legendary'], ['titanico-weapon-b', 'rare'], ['faraonico-helmet', 'uncommon'],
      ['vulcanico-shield', 'rare'], ['abissal-weapon-b', 'rare'], ['throwSpear2', 'common'], ['demoniaco-weapon-a', 'uncommon'], ['celestial-chest', 'rare'],
      ['corsario-helmet', 'common'], ['malha-weapon-b', 'common'], ['kingRing', 'legendary'], ['runico-weapon-b', 'uncommon'], ['coral-boots', 'common'],
      ['mithril-amulet', 'rare'], ['ferro-weapon-b', 'common'], ['giantClub', 'legendary'], ['pirateSabre', 'uncommon']];
    for (const [id, rar] of items) scene.gear.add(id, rar);
    for (const id of ['couro-chest', 'wardAmulet', 'frostSpear', 'glacial-helmet', 'bosque-legs', 'coral-boots', 'vulcanico-shield', 'kingRing']) {
      const it = scene.gear.loose.find((i) => i.id === id);
      if (it) scene.equipGear(it.uid);
    }
    scene.equipmentPanel.open();
    document.querySelector('.equipment__item[data-uid]')?.click();
    await new Promise((r) => setTimeout(r, 400));
    return true;
  });
  await capture(`armas/inventario-${tag}.png`);
  await inScene(async (scene) => {
    scene.equipmentPanel.close?.();
    scene.openBuilding('forge');
    await new Promise((r) => setTimeout(r, 300));
    [...document.querySelectorAll('#building-menu button')].find((b) => /loja/i.test(b.textContent))?.click();
    await new Promise((r) => setTimeout(r, 400));
    return true;
  });
  await capture(`armas/loja-${tag}.png`);
});
