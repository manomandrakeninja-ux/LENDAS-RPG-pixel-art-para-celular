import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Smoke test dos controles de toque num celular simulado (844×390, toque real via DevTools)
// e do modo computador (controles escondidos, teclado funcionando).
// Requer `npm run dev` ativo em 127.0.0.1:5173.
const root = path.resolve('.');
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe')
];
const chrome = chromeCandidates.find((candidate) => candidate && fs.existsSync(candidate));
if (!chrome) throw new Error('Chrome não encontrado para o smoke test.');

const port = 9351;
const capturesDir = path.join(root, '.tmp', 'capturas');
const userDataDir = path.join(root, '.tmp', 'touch-chrome-profile');
fs.rmSync(userDataDir, { recursive: true, force: true });
fs.mkdirSync(userDataDir, { recursive: true });
fs.mkdirSync(capturesDir, { recursive: true });

const browser = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  '--window-size=960,640',
  'about:blank'
], { stdio: 'ignore' });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
const pending = new Map();
const errors = [];
let messageId = 0;

try {
  let page;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      page = (await response.json()).find((entry) => entry.type === 'page');
      if (page) break;
    } catch {
      // Chrome ainda está iniciando.
    }
    await delay(250);
  }
  if (!page) throw new Error('Não foi possível conectar ao Chrome.');

  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      errors.push(message.params.args.map((argument) => argument.value ?? argument.description).join(' '));
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result.value;
  };
  const scene = `window.__LENDAS__.scene.getScene('GameScene')`;
  const waitForGame = () => evaluate(`new Promise((resolve, reject) => {
    const started = Date.now();
    const check = () => {
      const s = window.__LENDAS__?.scene?.getScene('GameScene');
      if (s?.player && s?.touch) return resolve(true);
      if (Date.now() - started > 15000) return reject(new Error('GameScene não iniciou.'));
      setTimeout(check, 100);
    };
    check();
  })`);
  const rectOf = (selector) => evaluate(`(() => {
    const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  })()`);
  const touch = (type, points) => send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 }))
  });
  const check = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  await send('Runtime.enable');
  await send('Page.enable');

  // ---------- Celular simulado ----------
  await send('Emulation.setDeviceMetricsOverride', {
    width: 844, height: 390, deviceScaleFactor: 2, mobile: true,
    screenOrientation: { type: 'landscapePrimary', angle: 90 }
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/?toque=1' });
  await delay(800);
  await waitForGame();
  await evaluate('localStorage.clear()');
  await send('Page.reload', { ignoreCache: true });
  await delay(800);
  await waitForGame();
  await delay(600);

  const mobileState = await evaluate(`(() => ({
    touchClass: document.body.classList.contains('is-touch'),
    controlsVisible: !document.getElementById('touch-controls').hidden,
    enabled: ${scene}.touch.enabled,
    hintVisible: ${scene}.ui.hint.visible
  }))()`);
  check(mobileState.touchClass && mobileState.controlsVisible && mobileState.enabled,
    `Controles de toque não apareceram: ${JSON.stringify(mobileState)}`);

  // 1. Joystick: arrastar para a direita move o personagem para a direita.
  await evaluate(`(() => { const s = ${scene}; s.player.body.reset(1440, 1300); })()`);
  const zone = await rectOf('#touch-stick-zone');
  const startX = zone.x - zone.w / 4;
  const startY = zone.y + zone.h / 4;
  const before = await evaluate(`${scene}.player.x`);
  await touch('touchStart', [[startX, startY, 1]]);
  await delay(50);
  await touch('touchMove', [[startX + 60, startY, 1]]);
  await delay(700);
  const moving = await evaluate(`(() => { const s = ${scene}; return { x: s.player.x, vector: s.touch.vector }; })()`);
  check(moving.vector.x > 0.9, `Joystick não gerou direção: ${JSON.stringify(moving)}`);
  check(moving.x - before > 40, `Personagem não andou com o joystick: ${before} → ${moving.x}`);

  // 2. Dois dedos: com o joystick segurado, tocar em ESQUIVA também funciona.
  await evaluate(`(() => { const s = ${scene}; s.player.stamina = 100; s.player.dodgeCooldown = 0; })()`);
  const dodgeButton = await rectOf('[data-touch="dodge"]');
  await touch('touchStart', [[startX + 60, startY, 1], [dodgeButton.x, dodgeButton.y, 2]]);
  await delay(80);
  const dodge = await evaluate(`(() => { const s = ${scene}; return { timer: s.player.dodgeTimer, stamina: s.player.stamina }; })()`);
  await touch('touchEnd', [[startX + 60, startY, 1]]);
  check(dodge.stamina < 100, `Esquiva por toque não aconteceu: ${JSON.stringify(dodge)}`);

  // 3. Soltar o joystick para o personagem.
  await touch('touchEnd', []);
  await delay(150);
  const stopped = await evaluate(`(() => { const s = ${scene}; return { vector: s.touch.vector, vx: s.player.body.velocity.x }; })()`);
  check(stopped.vector.x === 0 && stopped.vector.y === 0, `Joystick não voltou ao centro: ${JSON.stringify(stopped)}`);

  // 4. Botão de ação (atacar/coletar) responde ao toque exatamente uma vez.
  await delay(500);
  await evaluate(`(() => { const s = ${scene};
    s.__actionCount = 0;
    const original = s.performContextAction.bind(s);
    s.performContextAction = (...args) => { s.__actionCount += 1; return original(...args); };
  })()`);
  const action = await rectOf('#world-action');
  await touch('touchStart', [[action.x, action.y, 3]]);
  await delay(60);
  await touch('touchEnd', []);
  await delay(300);
  const attacked = await evaluate(`${scene}.__actionCount`);
  check(attacked === 1, `Botão de ação rodou ${attacked} vez(es) com um toque (esperado: 1).`);

  // 5. ESPECIAL e MAPA.
  await evaluate(`(() => { const s = ${scene}; s.player.specialCooldown = 0; s.player.stamina = 100; })()`);
  const special = await rectOf('[data-touch="special"]');
  await touch('touchStart', [[special.x, special.y, 4]]);
  await delay(60);
  await touch('touchEnd', []);
  const specialCooldown = await evaluate(`${scene}.player.specialCooldown`);
  check(specialCooldown > 0, 'Botão ESPECIAL não usou o golpe especial.');

  const mapButton = await rectOf('[data-touch="map"]');
  await touch('touchStart', [[mapButton.x, mapButton.y, 5]]);
  await delay(60);
  await touch('touchEnd', []);
  await delay(150);
  const mapState = await evaluate(`(() => ({
    open: ${scene}.worldMap.isOpen,
    controlsHidden: document.getElementById('touch-controls').classList.contains('is-hidden')
  }))()`);
  check(mapState.open && mapState.controlsHidden, `Mapa não abriu pelo toque: ${JSON.stringify(mapState)}`);
  await evaluate(`document.getElementById('world-map-close').click()`);
  await delay(200);

  // 6. No acampamento aparece o botão ACAMP., que abre a visão geral; o FECHAR do painel fecha.
  await evaluate(`(() => { const s = ${scene}; s.player.body.reset(1440, 1165); })()`);
  await delay(300);
  const campVisible = await evaluate(`!document.getElementById('touch-camp').hidden`);
  check(campVisible, 'Botão ACAMP. não apareceu perto da fogueira.');
  const campButton = await rectOf('#touch-camp');
  await touch('touchStart', [[campButton.x, campButton.y, 6]]);
  await delay(60);
  await touch('touchEnd', []);
  await delay(150);
  check(await evaluate(`${scene}.ui.campOpen`), 'ACAMP. não abriu o menu do acampamento.');
  const closeButton = await rectOf('#building-menu-close');
  await touch('touchStart', [[closeButton.x, closeButton.y, 7]]);
  await delay(60);
  await touch('touchEnd', []);
  await delay(150);
  check(!(await evaluate(`${scene}.ui.campOpen`)), 'FECHAR não fechou o menu do acampamento.');

  await evaluate(`(() => { const s = ${scene}; s.player.body.reset(1440, 1300); })()`);
  await delay(500);
  const mobileShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(capturesDir, 'touch-runtime-celular.png'), Buffer.from(mobileShot.data, 'base64'));

  // ---------- Computador ----------
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Emulation.clearDeviceMetricsOverride');
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 640, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await delay(800);
  await waitForGame();
  await delay(500);
  const desktop = await evaluate(`(() => ({
    touchClass: document.body.classList.contains('is-touch'),
    controlsHidden: document.getElementById('touch-controls').hidden,
    hint: ${scene}.ui.hint.text
  }))()`);
  check(!desktop.touchClass && desktop.controlsHidden, `Controles de toque apareceram no computador: ${JSON.stringify(desktop)}`);
  check(/^(WASD|C|E|J) /.test(desktop.hint), `Dica de teclado sumiu no computador: ${desktop.hint}`);

  await evaluate(`(() => { const s = ${scene}; s.player.body.reset(1440, 1300); })()`);
  const keyBefore = await evaluate(`${scene}.player.x`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
  await delay(600);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
  const keyAfter = await evaluate(`${scene}.player.x`);
  check(keyAfter - keyBefore > 40, `Tecla D não moveu o personagem: ${keyBefore} → ${keyAfter}`);
  const desktopShot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(capturesDir, 'touch-runtime-computador.png'), Buffer.from(desktopShot.data, 'base64'));

  if (errors.length > 0) throw new Error(`Erros no console:\n${errors.join('\n')}`);
  console.log(JSON.stringify({
    joystick: { moved: Math.round(moving.x - before), vector: moving.vector },
    dodgeStamina: Math.round(dodge.stamina),
    actionButtonRuns: attacked,
    specialCooldown,
    map: mapState,
    desktop: { keyboardMoved: Math.round(keyAfter - keyBefore), touchHidden: desktop.controlsHidden },
    capturas: '.tmp/capturas/touch-runtime-*.png'
  }, null, 2));
  console.log('Controles de toque OK.');
} finally {
  socket?.close();
  browser.kill();
}
