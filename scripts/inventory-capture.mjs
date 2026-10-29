import fs from 'node:fs';
import path from 'node:path';
import { check, runInChrome, capturesDir } from './runtime-harness.mjs';

// Pilhas (mochila 1000 / depósito 9999) e venda em quantidade no mercado, no celular.
fs.mkdirSync(path.join(capturesDir, 'inventario'), { recursive: true });
const click = (selector) => `(() => {
  const button = document.querySelector('${selector}');
  if (!button) throw new Error('Botão ausente: ${selector}');
  if (button.disabled) throw new Error('Botão desabilitado: ${selector}');
  button.click();
})()`;

await runInChrome({ name: 'inventory', port: 9391, width: 390, height: 844, mobile: true }, async ({ evaluate, inScene, capture, freshStart }) => {
  await freshStart();
  await inScene((scene) => {
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9;
    scene.player.body.reset(scene.camp.x, scene.camp.y + 85);
    scene.inventory.items.wood = 1250;
    scene.inventory.items.stone = 999;
    scene.inventory.items.herbs = 40;
    scene.inventory.items.iron = 12;
    scene.economy.coins = 100;
    scene.camp.storage.wood = 9999;
    scene.camp.storage.stone = 12345;
    scene.backpackPanel.open();
  });
  const bag = await inScene((scene) => ({
    slots: scene.inventory.usedSlots,
    counts: [...document.querySelectorAll('#backpack-grid .bag-slot__count')].map((el) => el.textContent)
  }));
  check(bag.slots === 5 && bag.counts.includes('1000') && bag.counts.includes('250'), `Mochila: ${JSON.stringify(bag)}`);
  await capture('inventario/mochila.png');
  await inScene((scene) => { scene.backpackPanel.close(); scene.openBuilding('house'); scene.buildingMenu.tab = 'storage'; scene.buildingMenu.refresh(); });
  await capture('inventario/deposito.png');

  // Depósito: guardar tudo / retirar tudo.
  await evaluate(click('[data-action="deposit"][data-arg="herbs"][data-arg2="all"]'));
  const stored = await inScene((scene) => ({ bag: scene.inventory.items.herbs, camp: scene.camp.storage.herbs }));
  check(stored.bag === 0 && stored.camp === 40, `Guardar tudo: ${JSON.stringify(stored)}`);

  // Mercado: venda em quantidade.
  await inScene((scene) => {
    scene.camp.levels.market = 3;
    scene.market.setLevel(3);
    scene.openBuilding('market');
    scene.buildingMenu.tab = 'sell';
    scene.buildingMenu.refresh();
  });
  await evaluate(click('[data-action="sell-pick"][data-arg="wood"]'));
  await evaluate(click('[data-action="sell-step"][data-arg="10"]'));
  await evaluate(click('[data-action="sell-step"][data-arg="1"]'));
  const picked = await inScene(() => document.querySelector('[data-action="sell-one"]').textContent);
  check(/VENDER 12 .*\+12/.test(picked), `Total antes de confirmar: ${picked}`);
  // Controle deslizante.
  await inScene(() => {
    const range = document.querySelector('[data-sell-range]');
    range.value = '100';
    range.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const slid = await inScene(() => document.querySelector('[data-action="sell-one"]').textContent);
  check(/VENDER 100 .*\+100/.test(slid), `Controle deslizante: ${slid}`);
  await capture('inventario/mercado.png');
  await evaluate(click('[data-action="sell-one"]'));
  const sold = await inScene((scene) => ({ wood: scene.inventory.items.wood, coins: scene.economy.coins }));
  check(sold.wood === 1150 && sold.coins === 200, `Venda de 100: ${JSON.stringify(sold)}`);

  // Recursos comuns pedem confirmação.
  await evaluate(click('[data-action="sell-common"]'));
  const mid = await inScene((scene) => scene.inventory.items.wood);
  check(mid === 1150, 'Vender comuns não pode vender antes de confirmar.');
  await capture('inventario/mercado-confirmar.png');
  await evaluate(click('[data-action="sell-common"]'));
  const common = await inScene((scene) => ({ wood: scene.inventory.items.wood, stone: scene.inventory.items.stone, iron: scene.inventory.items.iron }));
  check(common.wood === 0 && common.stone === 0 && common.iron === 12, `Comuns: ${JSON.stringify(common)}`);

  // Item de missão em entrega não se vende.
  await inScene((scene) => { scene.protectedSellTypes = () => new Set(['iron']); scene.buildingMenu.refresh(); });
  const locked = await inScene(() => document.querySelector('[data-action="sell-pick"][data-arg="iron"]').disabled);
  check(locked === true, 'Item protegido deveria vir bloqueado.');
  return { bag, stored, picked, slid, sold, common };
});
