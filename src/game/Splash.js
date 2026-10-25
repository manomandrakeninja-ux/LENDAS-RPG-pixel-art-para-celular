// Tela de início: a arte do LENDAS com barra de carregamento. Quando o jogo
// termina de carregar, pede um toque/tecla e some num degradê suave.
// Nos testes automáticos (Chrome headless) ou com ?splash=0 ela não aparece;
// ?splash=1 força a tela mesmo nos testes.

const MIN_VISIBLE_MS = 1400;

export function setupSplash() {
  const root = document.getElementById('splash');
  if (!root) return;
  const fill = document.getElementById('splash-fill');
  const status = document.getElementById('splash-status');
  const params = new URLSearchParams(window.location.search);
  const skip = params.get('splash') === '0' || (/HeadlessChrome/.test(navigator.userAgent) && params.get('splash') !== '1');
  const state = { active: !skip };
  window.__lendasSplash = state;
  if (skip) {
    root.remove();
    return;
  }

  const shownAt = performance.now();
  let scene = null;
  let ready = false;

  const setProgress = (value) => {
    fill.style.width = `${Math.round(10 + Math.min(1, Math.max(0, value)) * 90)}%`;
  };
  setProgress(0);

  const start = () => {
    if (!ready || !state.active) return;
    state.active = false;
    window.removeEventListener('keydown', start);
    root.removeEventListener('pointerdown', start);
    root.classList.add('splash--leaving');
    if (scene) {
      scene.scene.resume();
      scene.cameras.main.fadeIn(1100, 8, 10, 14);
      scene.audio?.unlock?.();
    }
    window.setTimeout(() => root.remove(), 1300);
  };

  window.addEventListener('lendas:progress', (event) => setProgress(event.detail));
  window.addEventListener('lendas:ready', (event) => {
    if (ready) return;
    scene = event.detail;
    setProgress(1);
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt));
    window.setTimeout(() => {
      ready = true;
      root.classList.add('splash--ready');
      const touch = window.matchMedia('(pointer: coarse)').matches;
      status.textContent = touch ? 'TOQUE PARA COMEÇAR' : 'CLIQUE OU APERTE QUALQUER TECLA';
      window.addEventListener('keydown', start);
      root.addEventListener('pointerdown', start);
    }, wait);
  });
}
