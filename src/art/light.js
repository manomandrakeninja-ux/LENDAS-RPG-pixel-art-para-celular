// Luz local e rastro do golpe (Fase 20E): só matemática e cores, sem Phaser,
// para LightingSystem/Effects e para os testes.
/** Degraus da luz em volta de cada fonte e do halo quente. */
export const LEVELS = 12;
export const GLOW_LEVELS = 8;

// Rampas de halo (do centro para fora), todas na paleta-mestre.
export const HALO = {
  fire: ['#ffeb57', '#ffc825', '#ffa214', '#ed7614', '#e07438', '#c64524', '#8e251d', '#571c27'],
  lamp: ['#ffc825', '#ffa214', '#ed7614', '#e07438', '#c64524', '#8e251d', '#571c27'],
  forge: ['#ffc825', '#ffa214', '#ff5000', '#e07438', '#c64524', '#8e251d', '#571c27'],
  lava: ['#ffa214', '#ff5000', '#c64524', '#8e251d', '#571c27'],
  crystal: ['#94fdff', '#00cdf9', '#0098dc', '#0069aa', '#00396d'],
  ice: ['#ffffff', '#d5e8ef', '#9cc8e6', '#657392', '#424c6e'],
  shroom: ['#d3fc7e', '#99e65f', '#5ac54f', '#33984b', '#1e6f50'],
  torch: ['#ffeb57', '#ffc825', '#ffa214', '#e07438', '#c64524', '#8e251d']
};
export const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const HALO_RGB = Object.fromEntries(Object.entries(HALO).map(([key, ramp]) => [key, ramp.map(hexRgb)]));
// Força do halo e se a fonte tremula.
export const KIND = {
  fire: { glow: 0.56, flicker: 0.07 },
  torch: { glow: 0.5, flicker: 0.07 },
  lamp: { glow: 0.52, flicker: 0.05 },
  forge: { glow: 0.5, flicker: 0.05 },
  lava: { glow: 0.38, flicker: 0.04 },
  crystal: { glow: 0.34, flicker: 0.02 },
  ice: { glow: 0.3, flicker: 0.02 },
  shroom: { glow: 0.32, flicker: 0.03 }
};

// Transição suave (0 no centro da luz, 1 no fim do degradê).
const smoothstep = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

/** Degrau de luz (0..1) a `distance` de uma fonte com núcleo `radius` e borda `falloff`. */
export function lightBand(distance, radius, falloff, levels = LEVELS) {
  // Núcleo claro pequeno (40 % do raio) e o resto em degraus até o fim da borda.
  const core = radius * 0.4;
  if (distance <= core) return 1;
  const raw = 1 - smoothstep((distance - core) / (radius - core + falloff));
  return raw <= 0 ? 0 : Math.ceil(raw * levels) / levels;
}

// Rastro do golpe (Fase 20E): meia-lua em pixel art, como o "ATAQUE" da referência.
// 4 quadros de 56 x 56 (o arco cresce de -90° a +90° e depois afina), em 3 tons + borda.
export const ARC_SIZE = 56;
export const ARC_FRAMES = 4;
export const ARC_TONES = {
  normal: ['#ffffff', '#c7cfdd', '#92a1b9', '#657392'],
  finisher: ['#ffffff', '#ffeb57', '#ffa214', '#c64524']
};

/** Pixel do arco: tom (0 = fio claro ... 3 = borda) ou -1 fora. */
export function swingArcTone(x, y, frame) {
  const R = 25;
  const dx = x + 0.5 - ARC_SIZE / 2;
  const dy = y + 0.5 - ARC_SIZE / 2;
  const outer = Math.hypot(dx, dy);
  // Círculo de dentro deslocado para trás: a lua é grossa no meio e fina nas pontas.
  const inner = Math.hypot(dx + 12, dy);
  if (outer > R || inner < R) return -1;
  const angle = Math.atan2(dy, dx);
  const sweep = [-0.3, 0.6, 1.85, 1.85][frame];
  if (angle > sweep || angle < -1.85) return -1;
  const depth = R - outer;
  // Último quadro: só o fio de fora, se desfazendo do começo do arco para a frente.
  if (frame === 3 && (depth > 3.2 || angle < -0.6)) return -1;
  if (frame === 2 && angle < -1.2 && depth > 2.2) return -1;
  if (depth < 1.2) return 0;
  if (depth < 2.8) return 1;
  if (inner - R > 1.2) return 2;
  return 3;
}

