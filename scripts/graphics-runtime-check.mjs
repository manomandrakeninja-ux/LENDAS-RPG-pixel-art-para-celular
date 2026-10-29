import { check, runInChrome } from './runtime-harness.mjs';

// Ajustes > Gráficos: 3 modos, limite de 30 fps, contador de fps e detecção automática na primeira execução.
await runInChrome({ name: 'graphics', port: 9391, width: 390, height: 844, mobile: true }, async ({ evaluate, inScene, send, capture, freshStart, reload, delay }) => {
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
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x, y: rect.y, button: 'left', clickCount: 1 });
    await delay(300);
  };
  const state = () => inScene((scene) => ({
    mode: scene.graphicsMode,
    renderScale: scene.gfx.renderScale,
    simpleLight: scene.lighting.simple,
    lightInterval: scene.lighting.interval,
    canvasWidth: scene.game.canvas.width,
    cssWidth: Math.round(scene.game.canvas.getBoundingClientRect().width),
    shadowsSimple: Boolean(scene.shadows.simple),
    limited: scene.game.loop.hasFpsLimit,
    saved: JSON.parse(localStorage.getItem('lendas-configuracoes') ?? '{}')
  }));

  // Primeira execução: sem escolha salva, o jogo mede o aparelho e registra o modo sugerido (uma vez só).
  await freshStart();
  await evaluate("localStorage.removeItem('lendas-configuracoes')");
  await reload();
  await delay(8500);
  const detected = await state();
  check(detected.saved.graphicsChosen === true && ['high', 'balanced', 'light'].includes(detected.saved.graphics), `Detecção não registrou o modo: ${JSON.stringify(detected.saved)}`);

  await inScene((scene) => scene.settingsPanel.open());
  const first = await state();
  check(first.canvasWidth === first.cssWidth || first.renderScale < 1, `Tamanho do canvas incoerente: ${JSON.stringify(first)}`);

  // Leve: resolução reduzida, luz simples, sombras simples.
  await click('[data-settings="graphics"][data-value="light"]');
  const light = await state();
  check(light.mode === 'light' && light.simpleLight && light.shadowsSimple, `Modo Leve não aplicou: ${JSON.stringify(light)}`);
  check(light.canvasWidth < light.cssWidth * 0.8 && light.canvasWidth > light.cssWidth * 0.7, `Resolução interna do Leve fora de 75%: ${JSON.stringify(light)}`);
  check(light.saved.graphics === 'light' && light.saved.graphicsChosen === true, 'Modo Leve não foi salvo.');
  await inScene((scene) => { scene.dayNight.cycleTime = 240; scene.updateDayNight(0); scene.settingsPanel.close(); });
  await delay(600);
  await capture('graphics-leve-noite.png');

  // Equilibrado: resolução cheia, luz completa.
  await inScene((scene) => scene.settingsPanel.open());
  await click('[data-settings="graphics"][data-value="balanced"]');
  const balanced = await state();
  check(balanced.mode === 'balanced' && !balanced.simpleLight && balanced.canvasWidth === balanced.cssWidth, `Modo Equilibrado errado: ${JSON.stringify(balanced)}`);

  // Alto: tudo como antes.
  await click('[data-settings="graphics"][data-value="high"]');
  const high = await state();
  check(high.mode === 'high' && !high.simpleLight && high.lightInterval === 90 && !high.shadowsSimple && high.canvasWidth === high.cssWidth, `Modo Alto errado: ${JSON.stringify(high)}`);

  // Limite de 30 fps e contador.
  await click('[data-settings="fpsCap30"][data-value="true"]');
  check((await state()).limited === true, 'Limite de 30 fps não ligou.');
  await click('[data-settings="fpsCounter"][data-value="true"]');
  await inScene((scene) => scene.settingsPanel.close());
  await delay(1500);
  const counter = await evaluate(`(() => { const e = document.getElementById('fps-counter'); return { hidden: e.hidden, text: e.textContent }; })()`);
  check(!counter.hidden && /FPS/.test(counter.text), `Contador de fps não apareceu: ${JSON.stringify(counter)}`);
  await inScene((scene) => scene.settingsPanel.open());
  await click('[data-settings="fpsCap30"][data-value="false"]');
  check((await state()).limited === false, 'Limite de 30 fps não desligou.');

  // A escolha vale depois de recarregar.
  await click('[data-settings="graphics"][data-value="light"]');
  await reload();
  const after = await state();
  check(after.mode === 'light' && after.simpleLight, `Escolha não persistiu: ${JSON.stringify(after)}`);
  return { detected: detected.saved.graphics, light, balanced: balanced.mode, high: high.mode, counter };
});
