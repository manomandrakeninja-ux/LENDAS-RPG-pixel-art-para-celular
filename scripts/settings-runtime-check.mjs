import { check, runInChrome } from './runtime-harness.mjs';

// Engrenagem: interface computador/celular, som, volume, tremor da tela e recomeçar do zero.
await runInChrome({ name: 'settings', port: 9379, width: 1280, height: 800 }, async ({ evaluate, inScene, send, capture, freshStart, delay }) => {
  const click = async (selector) => {
    await delay(250);
    const rect = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      element.scrollIntoView({ block: 'center' });
      const r = element.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (!rect) throw new Error(`Elemento não encontrado: ${selector}`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await delay(200);
  };
  const waitScene = () => evaluate(`new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      const scene = window.__LENDAS__?.scene?.getScene('GameScene');
      if (scene?.ui?.coinLabel && scene?.settingsPanel) return resolve(true);
      if (Date.now() - started > 15000) return reject(new Error('Jogo não voltou depois de recarregar.'));
      setTimeout(tick, 100);
    };
    tick();
  })`);

  await freshStart();
  await evaluate("localStorage.removeItem('lendas-configuracoes')");

  // Engrenagem ao lado do minimapa e o painel abre.
  const gear = await inScene((scene) => {
    const r = document.getElementById('settings-button').getBoundingClientRect();
    const canvas = scene.game.canvas.getBoundingClientRect();
    return { right: r.right, top: r.top, minimapLeft: canvas.left + scene.ui.mapX - scene.ui.metrics.mapSize / 2 };
  });
  check(gear.right <= gear.minimapLeft + 1 && gear.top < 40, `Engrenagem fora do lugar: ${JSON.stringify(gear)}`);
  await click('#settings-button');
  check(await inScene((scene) => scene.settingsPanel.isOpen), 'Painel de configurações não abriu.');
  await capture('configuracoes.png');

  // Interface: celular liga os controles de toque; computador desliga.
  await click('[data-settings="interface"][data-value="mobile"]');
  const mobile = await inScene((scene) => ({ touch: scene.touch.enabled, body: document.body.classList.contains('is-touch') }));
  check(mobile.touch && mobile.body, `Modo celular não ligou: ${JSON.stringify(mobile)}`);
  await click('[data-settings="interface"][data-value="pc"]');
  const pc = await inScene((scene) => ({ touch: scene.touch.enabled, body: document.body.classList.contains('is-touch'), controls: document.getElementById('touch-controls').hidden }));
  check(!pc.touch && !pc.body && pc.controls, `Modo computador não voltou: ${JSON.stringify(pc)}`);

  // Som, volume e tremor.
  await click('[data-settings="volume"][data-value="-10"]');
  await click('[data-settings="sound"][data-value="false"]');
  await click('[data-settings="shake"][data-value="false"]');
  const audio = await inScene((scene) => {
    scene.cameras.main.shake(200, 0.01);
    return { volume: scene.audio.volume, muted: scene.audio.muted, shaking: scene.cameras.main.shakeEffect.isRunning };
  });
  check(Math.abs(audio.volume - 0.6) < 0.001 && audio.muted && !audio.shaking, `Som/tremor: ${JSON.stringify(audio)}`);

  // As escolhas continuam depois de recarregar.
  await inScene((scene) => { scene.settingsPanel.close(); scene.save(); return true; });
  await send('Page.reload', { ignoreCache: true });
  await delay(900);
  await waitScene();
  const kept = await inScene((scene) => ({ ...scene.settingsPanel.settings, touch: scene.touch.enabled, muted: scene.audio.muted }));
  check(kept.interface === 'pc' && !kept.touch && kept.sound === false && kept.muted && kept.volume === 60 && kept.shake === false,
    `Configurações não ficaram salvas: ${JSON.stringify(kept)}`);

  // Recomeçar do zero: pede confirmação, apaga o progresso e mantém as configurações.
  await inScene((scene) => {
    scene.economy.coins = 777;
    scene.camp.levels.house = 6;
    scene.save();
    return true;
  });
  await click('#settings-button');
  await click('[data-settings="restart"]');
  const asked = await evaluate(`Boolean(document.querySelector('[data-settings="restart-confirm"]'))`);
  check(asked, 'Recomeçar deveria pedir confirmação.');
  await click('[data-settings="restart-cancel"]');
  check(await inScene((scene) => scene.economy.coins === 777), 'Cancelar não pode apagar nada.');
  await click('[data-settings="restart"]');
  await click('[data-settings="restart-confirm"]');
  await delay(1200);
  await waitScene();
  await delay(400);
  const fresh = await inScene((scene) => ({
    coins: scene.economy.coins,
    house: scene.camp.levels.house,
    settings: scene.settingsPanel.settings.interface
  }));
  check(fresh.coins !== 777 && fresh.house !== 6 && fresh.settings === 'pc', `Recomeçar não zerou o jogo: ${JSON.stringify(fresh)}`);
  await evaluate("localStorage.removeItem('lendas-configuracoes')");
  return { gear, mobile, pc, audio, kept, fresh };
});
console.log('Configurações OK.');
