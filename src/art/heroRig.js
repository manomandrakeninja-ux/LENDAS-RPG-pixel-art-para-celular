// Fase 22: padrão das folhas do herói (todas as skins, atuais e futuras) e o "esqueleto" da mão.
//
// Folha: 12 colunas x 4 linhas de quadros 56 x 64 (pés na linha 62, centro em x = 28).
//   linhas  : baixo, esquerda, direita, cima (a esquerda é um perfil de verdade, não precisa ser espelho);
//   colunas : 0-3 andar | 4 respira (parado, peito/ombros 1 px abaixo) | 5 mão a caminho (peito)
//             6 mão no ombro (pega o cabo nas costas) | 7 preparar (arma erguida atrás)
//             8 golpe (braço estendido para a frente, tronco avança) | 9 retorno | 10 dano (recuo) | 11 pisca.
// A skin vem SEM arma desenhada. A arma (ou ferramenta) é um sprite à parte, posto pelo HeroAnimator na
// mão (`hands[coluna]`) ou nas costas (`back`). O pintor de cada skin desenha a mão de arma exatamente
// nesses pontos; uma skin cuja mão caia em outro lugar registra o ajuste em `RIG_OVERRIDES`.
// Folha só com as 4 colunas de andar também funciona: o HeroAnimator usa o andar e simula o resto.
//
// Ângulos em graus na tela (0 = direita, 90 = baixo, -90 = cima): direção do cabo para a ponta.
// A mão de arma é a direita do herói: na frente fica à esquerda da tela; de costas, à direita; de perfil,
// é a mão do lado da câmera.

import { SKIN_RIGS } from './skinRigs.js';
import { PAINTED_RIGS } from './heroPaintedRigs.js';

export const HERO_FRAME = Object.freeze({ width: 56, height: 64, feet: 62, cx: 28 });
export const HERO_DIRS = Object.freeze(['down', 'left', 'right', 'up']);
export const HERO_COLS = 12;
export const POSE = Object.freeze({ walk: [0, 1, 2, 3], idle: 1, breath: 4, reach: 5, grab: 6, windup: 7, strike: 8, recover: 9, hurt: 10, blink: 11 });

const W1 = HERO_FRAME.width - 1;

// Mãos por coluna (0..11). Valores pensados para o corpo "normal" do pintor (ombros em y 28, mão em y 40).
const DOWN = {
  hands: [[17, 40], [17, 40], [17, 41], [17, 40], [17, 41], [19, 32], [20, 22], [16, 15], [25, 45], [19, 41], [14, 37], [17, 40]],
  // Camada da arma na mão: 'front' = por cima do corpo, 'back' = por trás.
  layer: ['front', 'front', 'front', 'front', 'front', 'front', 'back', 'back', 'front', 'front', 'front', 'front'],
  // Arma nas costas: cabo sobre o ombro direito do herói (esquerda da tela), ponta na anca oposta.
  back: { grip: [20, 21], angle: 45, layer: 'back' },
  walkBob: [0, -1, 0, -1]
};

const RIGHT = {
  hands: [[25, 39], [29, 40], [33, 39], [29, 40], [29, 41], [29, 32], [25, 21], [21, 15], [40, 38], [33, 40], [23, 37], [29, 40]],
  layer: ['front', 'front', 'front', 'front', 'front', 'front', 'back', 'back', 'front', 'front', 'front', 'front'],
  // De perfil as costas ficam atrás: cabo atrás da nuca, ponta para baixo e para trás.
  back: { grip: [24, 22], angle: 135, layer: 'back' },
  walkBob: [0, -1, 0, -1]
};

const mirrorPoint = ([x, y]) => [W1 - x, y];
const mirrorAngle = (a) => (a === null ? null : 180 - a);
function mirrorDir(dir, { layerSwap = false } = {}) {
  const flip = (l) => (layerSwap ? (l === 'front' ? 'back' : 'front') : l);
  return {
    hands: dir.hands.map(mirrorPoint),
    layer: dir.layer.map(flip),
    back: { grip: mirrorPoint(dir.back.grip), angle: mirrorAngle(dir.back.angle), layer: dir.back.layer },
    walkBob: [...dir.walkBob]
  };
}

// De costas a mão de arma é a da direita da tela e a arma nas costas fica POR CIMA do corpo.
const UP = (() => {
  const m = mirrorDir(DOWN);
  return {
    ...m,
    // Golpe e retorno vão para a frente do herói (longe da câmera): por trás do corpo; o preparo sobe por cima.
    layer: ['back', 'back', 'back', 'back', 'back', 'back', 'front', 'front', 'back', 'back', 'back', 'back'],
    back: { ...m.back, layer: 'front' }
  };
})();

export const DEFAULT_RIG = Object.freeze({ down: DOWN, left: mirrorDir(RIGHT), right: RIGHT, up: UP });

/** Ajustes por textura (ex.: 'player-warrior': { down: { hands: { 7: [15, 14] } } }). */
export const RIG_OVERRIDES = { ...SKIN_RIGS, ...PAINTED_RIGS };
// As 4 guerreiras usam o mesmo ajuste.
for (const id of ['warrior-blue', 'warrior-green', 'warrior-black']) RIG_OVERRIDES[`player-${id}`] ??= RIG_OVERRIDES['player-warrior'];

/** Esqueleto da textura: o padrão com os ajustes da skin aplicados por coluna. */
export function rigFor(textureKey) {
  const over = RIG_OVERRIDES[textureKey] ?? {};
  const out = {};
  for (const dir of HERO_DIRS) {
    const base = DEFAULT_RIG[dir];
    const o = over[dir] ?? {};
    const hands = base.hands.map((h, i) => (o.hands?.[i] ? [...o.hands[i]] : [...h]));
    const layer = base.layer.map((l, i) => o.layer?.[i] ?? l);
    out[dir] = {
      hands,
      layer,
      back: { ...base.back, ...(o.back ?? {}) },
      walkBob: o.walkBob ?? base.walkBob
    };
  }
  return out;
}

export function registerRig(textureKey, overrides) {
  RIG_OVERRIDES[textureKey] = overrides;
}

// ---------------------------------------------------------------- jeitos de usar a arma
// seq: colunas do golpe [preparar, golpe, retorno]. angles[dir]: ângulo da arma na mão por coluna;
// `hold` vale para as colunas sem valor próprio (andar, parado, segurando). A esquerda espelha a direita.
const STYLE_TABLE = {
  slash: { seq: [7, 8, 9], down: { hold: 135, 7: -135, 8: 45 }, right: { hold: 45, 7: -135, 8: 30 }, up: { hold: 45, 7: -45, 8: 135 } },
  heavy: { seq: [7, 8, 9], down: { hold: 135, 7: -110, 8: 60 }, right: { hold: 45, 7: -120, 8: 60 }, up: { hold: 45, 7: -70, 8: 120 } },
  thrust: { seq: [5, 8, 9], down: { hold: -135, 5: -100, 8: 90, 9: 120 }, right: { hold: -45, 5: 0, 8: 0, 9: -20 }, up: { hold: -45, 5: -80, 8: -90, 9: -60 } },
  cast: { seq: [7, 8, 9], down: { hold: -135, 7: -100, 8: 60 }, right: { hold: -45, 7: -80, 8: -20 }, up: { hold: -45, 7: -80, 8: -120 } },
  bow: { seq: [5, 8, 9], down: { hold: -135, 5: -45, 8: -45 }, right: { hold: -45, 5: -60, 8: -90 }, up: { hold: -45, 5: -135, 8: -135 } },
  tool: { seq: [7, 8, 9], down: { hold: 135, 7: -135, 8: 45 }, right: { hold: 45, 7: -135, 8: 60 }, up: { hold: 45, 7: -45, 8: 135 } }
};

function styleFor(name) {
  const s = STYLE_TABLE[name] ?? STYLE_TABLE.slash;
  const left = Object.fromEntries(Object.entries(s.right).map(([k, a]) => [k, 180 - a]));
  return { seq: s.seq, angles: { down: s.down, right: s.right, up: s.up, left } };
}

export const WEAPON_STYLES = Object.freeze(Object.fromEntries(Object.keys(STYLE_TABLE).map((k) => [k, styleFor(k)])));

/** Ângulo da arma na mão para a direção e coluna (cai no `hold` do estilo). */
export function weaponAngle(style, dir, col) {
  const angles = (WEAPON_STYLES[style] ?? WEAPON_STYLES.slash).angles[dir] ?? WEAPON_STYLES.slash.angles.down;
  const a = angles[col] ?? angles.hold;
  return ((a + 540) % 360) - 180;
}
