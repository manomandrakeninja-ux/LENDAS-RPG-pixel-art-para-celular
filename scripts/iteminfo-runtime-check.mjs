import { check, runInChrome } from './runtime-harness.mjs';

// Painel de informações do item: mochila, ferreiro, melhorias e mercado; fechar, voltar e celular.
const helpers = ({ evaluate, send, delay }) => {
  const rectOf = (selector) => evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    element.scrollIntoView({ block: 'center' });
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width, height: rect.height };
  })()`);
  const click = async (selector) => {
    await delay(250); // espera a animação de abertura dos painéis
    const rect = await rectOf(selector);
    if (!rect) throw new Error(`Elemento não encontrado: ${selector}`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await delay(150);
  };
  const tap = async (selector) => {
    await delay(250);
    const rect = await rectOf(selector);
    if (!rect) throw new Error(`Elemento não encontrado: ${selector}`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x, y: rect.y, id: 1 }] });
    await delay(50);
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await delay(250);
  };
  const panel = () => evaluate(`(() => {
    const root = document.getElementById('item-info');
    const card = root?.querySelector('.item-info__card')?.getBoundingClientRect();
    return {
      open: Boolean(root && !root.hidden),
      name: root?.querySelector('#item-info-name')?.textContent ?? '',
      need: root?.querySelector('[data-need-text]')?.textContent ?? null,
      backpack: Number(root?.querySelector('[data-count="backpack"]')?.textContent ?? NaN),
      storage: Number(root?.querySelector('[data-count="storage"]')?.textContent ?? NaN),
      total: Number(root?.querySelector('[data-count="total"]')?.textContent ?? NaN),
      sources: root?.querySelectorAll('.item-info__source').length ?? 0,
      hasMarket: Boolean(root?.querySelector('.item-info__list--market')),
      noSource: root?.textContent.includes('Fonte de obtenção ainda não disponível') ?? false,
      goButtons: [...(root?.querySelectorAll('button[data-info="go"]') ?? [])].map((button) => ({ text: button.textContent.trim(), disabled: button.disabled })),
      card: card ? { left: card.left, right: card.right, top: card.top, bottom: card.bottom } : null,
      viewport: { width: innerWidth, height: innerHeight }
    };
  })()`);
  return { rectOf, click, tap, panel };
};

const prepare = (scene) => {
  scene.campaign?.ui.closeDialogue();
  scene.enemyDirector.spawnTimer = 1e9;
  for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
  scene.player.body.reset(scene.camp.x, scene.camp.y + 50);
  for (const type of Object.keys(scene.inventory.items)) scene.inventory.items[type] = 0;
  for (const type of Object.keys(scene.camp.storage)) scene.camp.storage[type] = 0;
  scene.inventory.items.potion = 2;
  scene.inventory.items.iron = 3;
  scene.camp.storage.iron = 1;
  scene.inventory.items.wood = 4;
  scene.camp.levels.forge = 3;
  scene.camp.equipment.forgeLevel = 3;
  scene.camp.levels.market = 3;
  scene.market.setLevel?.(3);
  scene.economy.coins = 50;
  return true;
};

await runInChrome({ name: 'iteminfo', port: 9373, width: 1280, height: 800 }, async (context) => {
  const { inScene, evaluate, capture, freshStart, delay } = context;
  const { click, panel } = helpers(context);
  await freshStart();
  await inScene(prepare);

  // 1. Item da mochila.
  await inScene((scene) => { scene.backpackPanel.open(); return true; });
  await delay(150);
  await click('#backpack-grid [data-bag="info"][data-type="potion"]');
  const fromBag = await panel();
  await capture('iteminfo-mochila.png');
  check(fromBag.open && fromBag.name === 'Poção de Vida' && fromBag.backpack === 2 && fromBag.sources > 0,
    `Painel pela mochila: ${JSON.stringify(fromBag)}`);
  await click('#item-info .item-info__footer button');
  const afterBag = await inScene((scene) => ({ info: scene.itemInfo.isOpen, bag: scene.backpackPanel.isOpen }));
  check(!afterBag.info && afterBag.bag, `Fechar deve voltar para a mochila: ${JSON.stringify(afterBag)}`);
  await inScene((scene) => { scene.backpackPanel.close(); return true; });

  // 2. Material de uma receita do Ferreiro (Espada de Ferro pede ferro).
  const recipe = await inScene((scene) => {
    scene.buildingMenu.open('forge');
    scene.buildingMenu.tab = 'craft';
    scene.buildingMenu.render();
    const chip = [...document.querySelectorAll('#building-menu-content [data-item="iron"][data-need]')]
      .find((element) => element.closest('article')?.querySelector('h2')?.textContent.includes('Espada de Ferro'));
    chip?.setAttribute('data-test', 'forge-iron');
    return { need: Number(chip?.dataset.need), have: scene.camp.paymentSources ? null : null };
  });
  await click('[data-test="forge-iron"]');
  const fromForge = await panel();
  await capture('iteminfo-ferreiro.png');
  const expectedForge = `Você possui 4 de ${recipe.need} — ${recipe.need > 4 ? `faltam ${recipe.need - 4}` : 'suficiente!'}`;
  check(fromForge.open && fromForge.name === 'Ferro' && fromForge.need === expectedForge && fromForge.backpack === 3 && fromForge.storage === 1 && fromForge.total === 4,
    `Painel pelo Ferreiro: ${JSON.stringify({ fromForge, expectedForge })}`);
  check(fromForge.hasMarket, 'Ferro está no Mercado: o painel deve mostrar preço/estoque.');
  // ESC fecha só o painel; o menu do Ferreiro continua na mesma aba.
  await context.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await context.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await delay(150);
  const afterForge = await inScene((scene) => ({ info: scene.itemInfo.isOpen, menu: scene.buildingMenu.isOpen, building: scene.buildingMenu.building, tab: scene.buildingMenu.tab }));
  check(!afterForge.info && afterForge.menu && afterForge.building === 'forge' && afterForge.tab === 'craft',
    `ESC deve fechar só o painel: ${JSON.stringify(afterForge)}`);

  // 3. Material para evoluir uma construção (Casa).
  const upgrade = await inScene((scene) => {
    scene.buildingMenu.open('house');
    scene.buildingMenu.tab = 'upgrades';
    scene.buildingMenu.render();
    const cost = scene.camp.upgradeCostFor('house');
    const type = Object.keys(cost).find((key) => key !== 'coins');
    const have = (scene.inventory.items[type] ?? 0) + (scene.camp.storage[type] ?? 0);
    return { type, need: cost[type], have };
  });
  await click(`#building-menu-content [data-item="${upgrade.type}"][data-need="${upgrade.need}"]`);
  const fromUpgrade = await panel();
  await capture('iteminfo-melhoria.png');
  const missing = upgrade.need - upgrade.have;
  check(fromUpgrade.open && fromUpgrade.need === `Você possui ${upgrade.have} de ${upgrade.need} — ${missing > 0 ? `faltam ${missing}` : 'suficiente!'}`,
    `Painel pela melhoria: ${JSON.stringify({ fromUpgrade, upgrade })}`);
  await click('#item-info .panel-close');

  // 4. Mercado: abre o painel e NÃO compra nada.
  const before = await inScene((scene) => {
    scene.buildingMenu.open('market');
    scene.buildingMenu.tab = 'buy';
    scene.buildingMenu.render();
    return { coins: scene.economy.coins, items: { ...scene.inventory.items }, first: document.querySelector('#building-menu-content .item-chip')?.dataset.item };
  });
  await click('#building-menu-content .item-chip');
  const fromMarket = await panel();
  const after = await inScene((scene) => ({ coins: scene.economy.coins, items: { ...scene.inventory.items } }));
  check(fromMarket.open && fromMarket.hasMarket && after.coins === before.coins && JSON.stringify(after.items) === JSON.stringify(before.items),
    `Painel pelo Mercado não pode comprar: ${JSON.stringify({ fromMarket, before, after })}`);
  await capture('iteminfo-mercado.png');

  // 5. "Ir até a fonte": de dentro do painel do ferro, abrir o Mercado na aba Comprar e marcar a mina no mapa.
  await inScene((scene) => { scene.itemInfo.close(); scene.buildingMenu.close(); scene.itemInfo.open('iron', { need: 10 }); return true; });
  await delay(350);
  const goMarket = await evaluate(`(() => {
    const button = [...document.querySelectorAll('#item-info button[data-info="go"]')].find((entry) => entry.closest('li').textContent.includes('Mercado: Pacote de Ferro'));
    button?.setAttribute('data-test', 'go-market');
    return Boolean(button && !button.disabled);
  })()`);
  check(goMarket, 'Botão de ir ao Mercado deveria estar ativo no acampamento.');
  await click('[data-test="go-market"]');
  const nav = await inScene((scene) => ({ info: scene.itemInfo.isOpen, building: scene.buildingMenu.building, tab: scene.buildingMenu.tab }));
  check(!nav.info && nav.building === 'market' && nav.tab === 'buy', `Ir até o Mercado: ${JSON.stringify(nav)}`);
  await inScene((scene) => { scene.buildingMenu.close(); scene.itemInfo.open('iron'); return true; });
  await delay(350);
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('#item-info button[data-info="go"]')].find((entry) => entry.closest('li').textContent.includes('Mina'));
    button?.setAttribute('data-test', 'go-mine');
    return true;
  })()`);
  await click('[data-test="go-mine"]');
  const map = await inScene((scene) => ({ open: scene.worldMap.isOpen, target: scene.worldMap.target }));
  await capture('iteminfo-mapa.png');
  check(map.open && map.target?.label === 'Mina', `Ir até a Mina no mapa: ${JSON.stringify(map)}`);
  await inScene((scene) => { scene.worldMap.close(); return true; });

  // 6. Local de missão inativo não habilita o botão (Água → Poço Antigo).
  await inScene((scene) => { scene.itemInfo.open('water'); return true; });
  const water = await panel();
  check(water.open && water.goButtons.length > 0 && water.goButtons.every((button) => button.disabled || button.text.includes('Ver no mapa')),
    `Botões da água: ${JSON.stringify(water.goButtons)}`);

  // 7. Fechado, o painel não bloqueia o jogo.
  await inScene((scene) => { scene.itemInfo.close(); return true; });
  const free = await inScene(async (scene) => {
    const x = scene.player.x;
    const started = performance.now();
    await new Promise((resolve) => {
      const push = () => {
        scene.player.body.setVelocity(150, 0);
        if (performance.now() - started > 400) resolve();
        else requestAnimationFrame(push);
      };
      push();
    });
    return { moved: scene.player.x - x, open: scene.itemInfo.isOpen };
  });
  check(!free.open && free.moved > 10, `O jogador deve andar com o painel fechado: ${JSON.stringify(free)}`);
  return { fromBag, fromForge: { need: fromForge.need, total: fromForge.total }, fromUpgrade: fromUpgrade.need, nav, map };
});

// Celular: toque abre e fecha, e o painel cabe na tela.
await runInChrome({ name: 'iteminfo-mobile', port: 9374, width: 390, height: 844, mobile: true }, async (context) => {
  const { inScene, capture, freshStart, delay } = context;
  const { tap, panel } = helpers(context);
  await freshStart();
  await inScene(prepare);
  await inScene((scene) => { scene.backpackPanel.open(); return true; });
  await delay(150);
  await tap('#backpack-grid [data-bag="info"][data-type="iron"]');
  const opened = await panel();
  await capture('iteminfo-celular.png');
  check(opened.open && opened.name === 'Ferro' && opened.card.left >= 0 && opened.card.right <= opened.viewport.width + 1 && opened.card.bottom <= opened.viewport.height + 1,
    `Painel no celular: ${JSON.stringify(opened)}`);
  await tap('#item-info .item-info__footer button');
  const closed = await inScene((scene) => ({ info: scene.itemInfo.isOpen, bag: scene.backpackPanel.isOpen }));
  check(!closed.info && closed.bag, `Fechar pelo toque: ${JSON.stringify(closed)}`);
  return { opened: { name: opened.name, card: opened.card }, closed };
});
console.log('Painel de informações dos itens OK.');
