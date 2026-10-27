import { runInChrome, check } from './runtime-harness.mjs';

// Fase 5: cartão da região, painel de efeitos, redemoinho, proteção de novato, teclas e joystick.
await runInChrome({ name: 'comfort', port: 9391, width: 1100, height: 700 }, async ({ evaluate, inScene, send, capture, freshStart, delay }) => {
  await freshStart();

  // 9. Mapa como guia.
  const card = await inScene((scene) => {
    scene.worldMap.open();
    const found = scene.worldMap.showRegionAt(4300, 2900);
    return { name: found?.name, levels: found?.levels, hidden: scene.worldMap.card.hidden, text: scene.worldMap.card.textContent };
  });
  check(card.name === 'Floresta Antiga' && !card.hidden && card.text.includes('Toca dos Orcs') && card.text.includes('Goblin'), `Cartão: ${JSON.stringify(card)}`);
  // Clique de verdade no canvas do mapa.
  const point = await evaluate(`(() => { const r = document.getElementById('world-map-canvas').getBoundingClientRect(); return { x: r.left + r.width * 0.2, y: r.top + r.height * 0.2 }; })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await delay(150);
  check(await inScene((scene) => !scene.worldMap.card.hidden && /Nível/.test(scene.worldMap.card.textContent)), 'Clicar no mapa não abriu o cartão.');
  await capture('comfort-mapa.png');
  await inScene((scene) => { scene.worldMap.close(); return true; });

  // 11. Painel de efeitos.
  await inScene((scene) => {
    scene.buffs.apply('elixir');
    scene.gear.blessed = true;
    scene.effectsPanel.refresh();
    return true;
  });
  const effects = await inScene((scene) => ({
    icons: scene.effectsPanel.root.querySelectorAll('button').length,
    hidden: scene.effectsPanel.root.hidden,
    status: scene.ui.statusText(0)
  }));
  check(effects.icons === 2 && !effects.hidden && !/ELIXIR/.test(effects.status), `Painel de efeitos: ${JSON.stringify(effects)}`);
  await evaluate(`document.querySelector('#effects-panel button').click()`);
  const tip = await evaluate(`({ hidden: document.getElementById('effects-tip').hidden, text: document.getElementById('effects-tip').textContent })`);
  check(!tip.hidden && /Elixir/.test(tip.text), `Dica do efeito: ${JSON.stringify(tip)}`);
  await capture('comfort-efeitos.png');

  // 14. Redemoinho de spawn.
  const swirl = await inScene((scene) => {
    const before = scene.enemies.length;
    const graphic = scene.enemyDirector.addEnemyWithSwirl('rat', scene.player.x + 300, scene.player.y + 300, {});
    return { before, immediate: scene.enemies.length, returned: graphic };
  });
  check(swirl.immediate === swirl.before && swirl.returned === null, `O monstro não deveria nascer na hora: ${JSON.stringify(swirl)}`);
  await delay(900);
  check(await inScene((scene) => scene.enemies.length >= 1), 'O monstro deveria nascer depois do redemoinho.');

  // 20. Proteção de novato.
  const newbie = await inScene((scene) => {
    scene.progression.level = 3;
    scene.inventory.items.wood = 10;
    scene.respawn();
    return { wood: scene.inventory.items.wood, level: scene.progression.level };
  });
  check(newbie.wood === 10, `Novato perdeu itens: ${JSON.stringify(newbie)}`);

  // 24. Controles: joystick e teclas.
  await inScene((scene) => { scene.settingsPanel.open(); return true; });
  await evaluate(`document.querySelector('[data-settings="stickSide"][data-value="right"]').click()`);
  await evaluate(`document.querySelector('[data-settings="stickSize"][data-value="large"]').click()`);
  const stored = await evaluate(`JSON.parse(localStorage.getItem('lendas-configuracoes'))`);
  check(stored.stickSide === 'right' && stored.stickSize === 'large', `Joystick não salvou: ${JSON.stringify(stored)}`);
  await evaluate(`document.querySelector('[data-settings="key"][data-value="attack"]').click()`);
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90 });
  await delay(150);
  const keys = await inScene((scene) => ({ attack: scene.keybinds.attack, saved: JSON.parse(localStorage.getItem('lendas-teclas')) }));
  check(keys.attack === 'KeyZ' && keys.saved.attack === 'KeyZ', `Tecla não trocou: ${JSON.stringify(keys)}`);
  await capture('comfort-ajustes.png');
  await evaluate(`document.querySelector('[data-settings="keys-reset"]').click()`);
  check(await inScene((scene) => scene.keybinds.attack === 'KeyJ'), 'Restaurar teclas falhou.');

  // Menos de 2 ações na tecla: ataque pela tecla J continua chamando attackNearby.
  const attacked = await inScene((scene) => {
    scene.settingsPanel.close();
    let calls = 0;
    const original = scene.attackNearby.bind(scene);
    scene.attackNearby = () => { calls += 1; };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', key: 'j', keyCode: 74, which: 74 }));
    scene.attackNearby = original;
    return calls;
  });
  check(attacked === 1, `Tecla J deveria atacar uma vez (${attacked}).`);
  return { card: card.name, effects: effects.icons };
});
console.log('Conforto OK.');
