// Tela de início: a arte do LENDAS com barra de carregamento. Quando o jogo
// termina de carregar, pede um toque/tecla e some num degradê suave.
// Nos testes automáticos (Chrome headless) ou com ?splash=0 ela não aparece;
// ?splash=1 força a tela mesmo nos testes.

const MIN_VISIBLE_MS = 1400;

// Dicas exibidas no splash enquanto carrega (uma a cada 4 s).
const TIPS = [
  'M: mapa do mundo — Shift+clique marca um waypoint com seta verde na tela.',
  'Estradas de terra batida dejan 30% mais rápidas; o lodo deixa 38% mais lento.',
  'Placas de estrada (🪧) dizem para onde fica o destino e a quantos metros.',
  'Viajantes nas estradas dão 1 presente por dia; depois vendem poções e comida.',
  'Nos vilarejos dá para conversar, comprar na lojinha e dormir na cama até amanhecer.',
  'Baús escondidos no mundo dão moedas e às vezes equipamento — reabastecem em 3 dias.',
  'Z com a barra de Fúria cheia: FUS RO DAH! empurra e causa dano em área.',
  'Y volta ao acampamento de graça (60 s de cooldown, fora de combate).',
  'R pega tudo que estiver perto de uma vez. N dorme na fogueira ou na cama de um vilarejo.',
  'Regiões com nível muito acima do seu são perigosas (⚠️) — e têm recompensas melhores.',
  'Ilhas só se alcançam de barco: viaje entre portos (tarifa de 15 moedas).',
  'Na mochila (B) dá para fixar itens com ★ para deixá-los sempre no topo.',
  '? (Shift+/) abre a lista completa de teclas. P esconde a HUD para tirar foto.',
  'A tocha ilumina a noite ao seu redor; cristais e braseiros também brilham no escuro.'
];

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

  // Dica rotativa no splash.
  const tip = document.getElementById('splash-tip');
  if (tip) {
    let tipIndex = Math.floor(Math.random() * TIPS.length);
    tip.textContent = `💡 ${TIPS[tipIndex]}`;
    const tipTimer = window.setInterval(() => {
      if (!state.active) { window.clearInterval(tipTimer); return; }
      tipIndex = (tipIndex + 1) % TIPS.length;
      tip.textContent = `💡 ${TIPS[tipIndex]}`;
    }, 4000);
  }

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
