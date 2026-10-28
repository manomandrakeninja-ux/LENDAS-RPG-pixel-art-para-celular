// Zoom da câmera do mundo: 4 níveis escolhidos nos Ajustes ("Zoom da câmera").
// O valor sai da altura da tela (o herói tem ~64 px) em passos de 0,25, para o pixel art
// continuar nítido. No celular em pé o padrão deixa o herói com ~7,5% da altura da tela.

export const ZOOM_LEVELS = Object.freeze(['near', 'normal', 'far', 'farthest']);
export const ZOOM_LABELS = Object.freeze({ near: 'Perto', normal: 'Normal', far: 'Longe', farthest: 'Muito longe' });

const HERO_HEIGHT = 64;
// Fração da altura da tela que o herói ocupa em cada nível.
const PORTRAIT_PHONE = Object.freeze({ near: 0.112, normal: 0.075, far: 0.06, farthest: 0.045 });
const WIDE = Object.freeze({ near: 0.16, normal: 0.14, far: 0.105, farthest: 0.08 });

export function isPortraitPhone(width, height) {
  return height > width && width <= 600;
}

export function zoomFor(level, width, height) {
  const fractions = isPortraitPhone(width, height) ? PORTRAIT_PHONE : WIDE;
  const index = Math.max(0, ZOOM_LEVELS.indexOf(level));
  let previous = Infinity;
  let zoom = 1;
  for (let i = 0; i <= index; i += 1) {
    const raw = (fractions[ZOOM_LEVELS[i]] * height) / HERO_HEIGHT;
    zoom = Math.max(0.5, Math.round(raw * 4) / 4);
    zoom = Math.min(zoom, previous === Infinity ? zoom : Math.max(0.5, previous - 0.25));
    previous = zoom;
  }
  return zoom;
}

/** Metade da diagonal da área visível, em px do mundo (para nascer/sumir inimigos fora da tela). */
export function viewReach(width, height, zoom) {
  return Math.hypot(width, height) / 2 / zoom;
}

/**
 * Retângulo de tela cheia com scrollFactor 0 na câmera principal: a câmera aplica o zoom em volta do
 * centro, então a posição e o tamanho são compensados para cobrir a tela inteira em qualquer zoom.
 */
export function fitScreenRect(rect, camera, width, height) {
  const zoom = camera.zoom || 1;
  rect.setPosition(width / 2 * (1 - 1 / zoom), height / 2 * (1 - 1 / zoom)).setSize(width / zoom, height / zoom);
}
