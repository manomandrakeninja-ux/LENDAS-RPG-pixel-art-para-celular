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
  'A tocha ilumina a noite ao seu redor; cristais e braseiros também brilham no escuro.',
  'Fora de combate você se cura devagar: 6 s sem levar dano e a vida volta aos poucos.',
  'No gelo, à noite, pode cair uma nevasca: você anda 20% mais lento por 20 s.',
  'Baús escondidos reabastecem com moedas a cada 3 dias — volte sempre.',
  'Depois da chuva às vezes aparece um arco-íris 🌈 no céu.',
  'No calor do deserto, sua stamina demora mais para voltar — gerencie a esquiva.',
  'No vale, de dia, às vezes um coelhinho 🐇 cruza seu caminho e vira comida.',
  'Borboletas 🦋 na floresta e no vale podem te dar um tiquinho de XP.',
  'Perto da água, na praia, um peixe 🐟 pode saltar e virar comida.',
  'A cada 7 dias a lua cheia 🌕 abençoa a noite com XP extra.',
  'De dia, o vento às vezes carrega uma folhinha 🍃 com um pouco de XP.',
  'Em dias de sol aberto ☀️ o calor rende um tiquinho de XP.',
  'Em noites limpas ⭐ podem cair estrelas cadentes com moeditas.',
  'No brejo, um sapo 🐸 pode te beijar e devolver um pouco de vida.',
  'À noite no deserto, um escorpião dourado 🦂 pode deixar moeditas para trás.',
  'Na beira do mar, a onda 🌊 às vezes molha seus pés e dá um pouco de XP.',
  'À noite na floresta, cogumelos mágicos 🍄 podem brilhar com XP.',
  'No gelo, à noite, a aurora boreal ❄️ pode presentear com moedas.',
  'Na selva, de dia, flores exóticas 🌺 podem dar um pouco de XP.',
  'Nas terras antigas, à noite, um fantasma 👻 pode sussurrar XP.',
  'A chuva 🌧️ no vale, de dia, pode curar um pouco das suas feridas.',
  'À noite no brejo, o coro dos sapos 🐸 rende um pouco de XP.',
  'De dia com neve 🌨️ no gelo, a nevasca pode dar um pouco de XP.',
  'À noite na selva, os vaga-lumes 🦋 podem deixar moeditas.',
  'De dia nas cinzas, uma brasa viva 🔥 pode pular em você com XP.',
  'O vento 🍃 forte no vale, de dia, às vezes traz um pouco de XP.',
  'Chuva à noite 🌙 pode ser morna e curar um tiquinho.',
  'De dia na praia, conchas brilhantes 🐚 podem dar moeditas.',
  'À noite nas cinzas, um espírito 👺 pode oferecer XP.',
  'Na ilha Esmeralda, à noite, cristais 💎 pulsam com bastante XP.',
  'No gelo, de dia, um bloco de gelo brilhante 🧊 pode dar um pouco de XP.',
  'À noite no deserto, um cacto florido 🌵 pode dar um pouco de XP.',
  'De dia no brejo, um lírio d\'água dourado 🪷 pode dar moeditas.',
  'Na ilha de Brasa, à noite, uma erupção distante 🌋 rende bastante XP.',
  'Nas terras antigas, de dia e sol aberto 🏛️, as ruínas podem dar XP.',
  'De dia na praia, um caranguejo dourado 🦀 pode deixar moeditas.',
  'À noite no vale, uma coruja 🦉 pode aparecer com um pouco de XP.',
  'Na ilha Esmeralda, de dia, uma orquídea rara 🌿 pode dar XP.',
  'À noite de céu limpo no vale, uma estrela cadente 🌠 pode dar moeditas.',
  'De dia e sol no brejo, uma abelha dourada 🐝 pode dar um pouco de XP.',
  'À noite na selva, um sapo dourado 🐸 pode render bastante XP.',
  'De dia na neve, um lobo das neves 🐺 pode render um pouco de XP.',
  'À noite na praia, uma concha rara 🐚 pode brilhar com XP.',
  'Na chuva da floresta, um cogumelo raro 🍄 pode brotar com XP.',
  'À noite nas terras antigas, um eco de herói 👻 pode render bastante XP.',
  'De dia na selva, uma borboleta dourada 🦋 pode dar um pouco de XP.',
  'À noite de céu limpo na floresta, um cogumelo lunar 🍄 pode brilhar com XP.',
  'De dia no sol do deserto, um cacto em flor 🌵 pode dar um pouco de XP.'
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
