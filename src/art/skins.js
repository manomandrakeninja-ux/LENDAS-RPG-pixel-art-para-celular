import { PixelCanvas, hash, mix } from './pixel.js';
import { KNIGHT_FRAME } from './knight.js';

// Skins novas do herói, no mesmo quadro de 32 x 40 do cavaleiro (pés na linha 38),
// 4 direções x 4 quadros (andando; o quadro 1 é o "parado"). Mais sombreado e detalhes
// que o cavaleiro: rampas de 4 a 5 tons, dobras no pano, brilho no metal e cabelo com textura.
// A arma equipada continua sendo desenhada à parte pelo jogo, então a guerreira vem de mãos livres.

export const SKIN_FRAME = KNIGHT_FRAME;

const INK = '#140f14';
const STEEL = ['#262b38', '#4a5264', '#7a8498', '#aab4c6', '#dde4ee', '#ffffff'];
const LEATHER = ['#22120d', '#4a2618', '#7a4426', '#a86a3c'];
const GOLD = ['#6a4a14', '#b4842a', '#e8c24e', '#fff0a0'];
const ramp = (list) => ({ 0: list[0], 1: list[1], 2: list[2], 3: list[3], 4: list[4] ?? list[3] });

/** Poses por quadro: 0 e 2 passos, 1 parado, 3 apoio (corpo desce 1 px). */
function pose(frame) {
  return {
    bob: frame === 3 ? 1 : 0,
    swing: frame === 0 ? 1 : frame === 2 ? -1 : 0,
    sway: frame === 1 ? 1 : frame === 3 ? -1 : 0,
    stride: frame === 0 ? 2 : frame === 2 ? -2 : 0
  };
}

/** Desenho à mão: cada letra é uma entrada do mapa `map`, '.' é vazio. */
function stamp(canvas, x, y, rows, map) {
  rows.forEach((row, dy) => {
    [...row].forEach((key, dx) => {
      const color = map[key];
      if (color) canvas.pixel(x + dx, y + dy, color);
    });
  });
}

/** Pano com volume: faixa vertical com luz à esquerda, sombra à direita e dobras. */
function cloth(canvas, polygon, tones, { folds = [], seed = 1 } = {}) {
  const xs = polygon.map((point) => point[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  canvas.forPolygon(polygon, (x, y) => {
    const t = (x - minX) / Math.max(1, maxX - minX);
    let tone = t < 0.28 ? 3 : t < 0.55 ? 2 : t < 0.82 ? 1 : 0;
    if (folds.includes(x)) tone = Math.max(0, tone - 1 - (hash(x, y, seed) > 0.6 ? 1 : 0));
    else if (hash(x, y, seed) > 0.9) tone = Math.min(3, tone + 1);
    canvas.pixel(x, y, tones[tone]);
  });
}

// ---------- Espadachim ----------

const SW = {
  skin: ['#9a4a28', '#d27a44', '#f0a064', '#ffc890'],
  hair: ['#2a120e', '#5a2a1a', '#8a4226', '#b9602f', '#d98846'],
  cream: ['#9c8268', '#cdb592', '#ecdcbc', '#fff6e0'],
  strap: LEATHER,
  steel: STEEL,
  boot: ['#2a140e', '#5a2c1a', '#8a4a28', '#b8683a']
};

const SWORDSMAN_HEAD_FRONT = [
  '.....a..c.b...',
  '...b.cbdcdb.a.',
  '..bcdcdccdcdb.',
  '.bcddcdddcddcb',
  '.bcdbcdbdbdcdb',
  '.bcb.bcdcb.bcb',
  '.bb.ssssssss.b',
  '.ba.sSsSSsSs.a',
  '..a.sEEssEEs.a',
  '..a.sEEssEEs.a',
  '.....ssSssSss.',
  '......tsssst..',
  '.......tttt...'
];

const SWORDSMAN_HEAD_BACK = [
  '.....a..c.b...',
  '...b.cbdcdb.a.',
  '..bcdcdccdcdb.',
  '.bcddcdddcddcb',
  '.bcdbcdcdbdbcb',
  '.bcbcdcdcdcbcb',
  '.bcdcbcbcdcdcb',
  '.bbcdcdcbdcdb.',
  '..bcbcdcdcbb..',
  '...bbcbcbbb...',
  '....tttttt....',
  '..............',
  '..............'
];

const SWORDSMAN_HEAD_SIDE = [
  '......a.c.b...',
  '....bcbdcdb...',
  '...bcdcdcdcb..',
  '..bcddcdddcdb.',
  '..bcdbcdddbdb.',
  '.ssbcb.cdcdcb.',
  '.sSsbs.bcdcbb.',
  '.sEssstbcbcb..',
  '.sEsssbbb.....',
  '.ssSsstt......',
  '..ssstt.......',
  '...tt.........',
  '..............'
];

function swordsmanMap() {
  const [s0, s1, s2, s3] = SW.skin;
  const [h0, h1, h2, h3, h4] = SW.hair;
  return { a: h0, b: h1, c: h3, d: h2, h: h4, s: s2, S: s3, t: s1, E: INK, '0': s0 };
}

function pauldron(canvas, cx, cy, flip = 1) {
  canvas.shadedEllipse(cx, cy, 4.4, 3.4, [SW.steel[1], SW.steel[2], SW.steel[3], SW.steel[5]]);
  canvas.line(cx - 3, cy + 2, cx + 3, cy + 2, SW.steel[1]);
  canvas.pixel(cx - flip * 2, cy - 1, SW.steel[5]);
  canvas.pixel(cx + flip, cy - 3, SW.steel[4]);
}

function swordsmanLegsFront(canvas, frame) {
  const { stride } = pose(frame);
  const lifts = [Math.sign(stride) < 0 ? 1 : 0, Math.sign(stride) > 0 ? 1 : 0];
  [[11, lifts[0]], [17, lifts[1]]].forEach(([x, up]) => {
    // Calça marrom, cano da bota em aço, bota de couro com sola.
    canvas.rect(x, 28, 4, 5 - up, SW.boot[1]);
    canvas.rect(x, 28, 1, 5 - up, SW.boot[2]);
    canvas.rect(x + 3, 28, 1, 5 - up, SW.boot[0]);
    canvas.rect(x, 33 - up, 4, 1, SW.steel[1]);
    canvas.pixel(x, 33 - up, SW.steel[3]);
    canvas.rect(x - (x < 16 ? 1 : 0), 34 - up, 5, 3, SW.boot[2]);
    canvas.rect(x - (x < 16 ? 1 : 0), 34 - up, 2, 3, SW.boot[3]);
    canvas.rect(x + 2, 34 - up, 2, 3, SW.boot[1]);
    canvas.rect(x - (x < 16 ? 1 : 0), 37 - up, 5, 1, SW.boot[0]);
    canvas.pixel(x, 34 - up, SW.boot[3]);
    canvas.pixel(x + 1, 35 - up, SW.boot[3]);
  });
}

function swordsmanTorso(canvas, top, back) {
  // Túnica creme comprida com dobras, faixa de couro e cinto.
  cloth(canvas, [[11, top], [21, top], [22, top + 13], [23, top + 16], [9, top + 16], [10, top + 13]], SW.cream, { folds: [14, 18, 20], seed: 3 });
  canvas.line(11, top + 16, 22, top + 16, SW.cream[0]);
  if (!back) {
    canvas.rect(14, top, 4, 2, SW.skin[1]);
    canvas.pixel(15, top + 1, SW.skin[0]);
    canvas.line(13, top, 16, top + 2, SW.cream[0]);
    canvas.line(18, top, 16, top + 2, SW.cream[0]);
    // Faixa de couro em diagonal do ombro esquerdo ao quadril direito.
    canvas.line(12, top + 1, 21, top + 9, SW.strap[1]);
    canvas.line(12, top + 2, 21, top + 10, SW.strap[0]);
    canvas.line(13, top + 1, 20, top + 8, SW.strap[2]);
  } else {
    canvas.line(12, top + 1, 21, top + 9, SW.strap[1]);
    canvas.line(12, top, 21, top + 8, SW.strap[2]);
  }
  // Cinto com fivela de aço, bolsa e vara pendurada.
  canvas.rect(10, top + 9, 12, 3, SW.strap[2]);
  canvas.rect(10, top + 9, 12, 1, SW.strap[3]);
  canvas.rect(10, top + 11, 12, 1, SW.strap[0]);
  if (!back) {
    canvas.rect(14, top + 9, 4, 3, SW.steel[2]);
    canvas.rect(15, top + 10, 2, 1, SW.steel[0]);
    canvas.pixel(14, top + 9, SW.steel[5]);
    canvas.rect(19, top + 11, 3, 4, SW.strap[1]);
    canvas.rect(19, top + 11, 3, 1, SW.strap[3]);
    canvas.pixel(20, top + 13, SW.steel[3]);
    canvas.rect(16, top + 12, 1, 5, SW.steel[2]);
  } else {
    canvas.rect(14, top + 9, 4, 2, SW.steel[1]);
  }
}

function swordsmanArm(canvas, x, top, swing, side) {
  const y = top + 3 + swing;
  // Manga marrom, braçadeira de aço com brilho, luva de couro.
  canvas.rect(x, y, 3, 3, SW.strap[2]);
  canvas.rect(x, y, 1, 3, SW.strap[3]);
  canvas.rect(x + 2, y, 1, 3, SW.strap[1]);
  canvas.rect(x, y + 3, 3, 4, SW.steel[2]);
  canvas.rect(x, y + 3, 1, 4, SW.steel[4]);
  canvas.rect(x + 2, y + 3, 1, 4, SW.steel[1]);
  canvas.line(x, y + 5, x + 2, y + 5, SW.steel[1]);
  canvas.rect(x, y + 7, 3, 3, SW.strap[2]);
  canvas.rect(x, y + 7, 3, 1, SW.strap[3]);
  canvas.rect(x + (side < 0 ? 0 : 2), y + 8, 1, 2, SW.strap[1]);
}

function swordBack(canvas, top, view) {
  // Espada nas costas: punho com pomo sobre o ombro esquerdo e ponta junto ao quadril direito.
  const grip = view === 'side' ? [[20, top - 6], [18, top]] : [[9, top - 8], [13, top - 1]];
  canvas.line(grip[0][0], grip[0][1], grip[1][0], grip[1][1], SW.strap[0]);
  canvas.line(grip[0][0] + 1, grip[0][1], grip[1][0] + 1, grip[1][1], SW.strap[2]);
  canvas.rect(grip[0][0] - 1, grip[0][1] - 2, 3, 3, SW.steel[2]);
  canvas.pixel(grip[0][0] - 1, grip[0][1] - 2, SW.steel[5]);
  canvas.pixel(grip[0][0] + 1, grip[0][1], SW.steel[0]);
  if (view === 'front') {
    canvas.line(23, top + 14, 28, top + 20, SW.steel[3]);
    canvas.line(24, top + 14, 29, top + 20, SW.steel[1]);
    canvas.line(22, top + 12, 24, top + 14, SW.steel[2]);
  }
}

function drawSwordsman(canvas, view, frame) {
  const { bob, swing, stride } = pose(frame);
  const top = 15 + bob;
  const map = swordsmanMap();
  canvas.shadow(16, 38, 9, 2, 110);
  if (view === 'front') {
    swordBack(canvas, top, 'front');
    swordsmanLegsFront(canvas, frame);
    swordsmanTorso(canvas, top, false);
    swordsmanArm(canvas, 5, top, -swing, -1);
    swordsmanArm(canvas, 24, top, swing, 1);
    pauldron(canvas, 9, top + 1, 1);
    pauldron(canvas, 23, top + 1, -1);
    canvas.rect(15, top - 2, 3, 2, SW.skin[1]);
    stamp(canvas, 9, 2 + bob, SWORDSMAN_HEAD_FRONT, map);
  } else if (view === 'back') {
    swordsmanLegsFront(canvas, frame);
    swordsmanArm(canvas, 5, top, swing, -1);
    swordsmanArm(canvas, 24, top, -swing, 1);
    swordsmanTorso(canvas, top, true);
    // Espada atravessada nas costas, do ombro direito ao quadril esquerdo.
    canvas.line(21, top - 2, 12, top + 14, SW.steel[3]);
    canvas.line(20, top - 2, 11, top + 14, SW.steel[1]);
    canvas.line(22, top - 3, 21, top - 2, SW.strap[2]);
    canvas.rect(21, top - 6, 2, 3, SW.strap[1]);
    canvas.rect(20, top - 8, 4, 2, SW.steel[3]);
    pauldron(canvas, 9, top + 1, 1);
    pauldron(canvas, 23, top + 1, -1);
    canvas.rect(15, top - 2, 3, 2, SW.skin[1]);
    stamp(canvas, 9, 2 + bob, SWORDSMAN_HEAD_BACK, map);
  } else {
    swordBack(canvas, top, 'side');
    for (const [offset, dark] of [[-stride, true], [stride, false]]) {
      const x = 14 + offset;
      canvas.rect(x, 28, 4, 5, dark ? SW.boot[0] : SW.boot[1]);
      canvas.rect(x, 33, 4, 1, dark ? SW.steel[0] : SW.steel[1]);
      canvas.rect(x - 2, 34, 6, 3, dark ? SW.boot[1] : SW.boot[2]);
      canvas.rect(x - 2, 34, 3, 2, dark ? SW.boot[2] : SW.boot[3]);
      canvas.rect(x - 2, 37, 6, 1, SW.boot[0]);
    }
    cloth(canvas, [[12, top], [20, top], [21, top + 13], [22, top + 16], [10, top + 16], [11, top + 13]], SW.cream, { folds: [15, 19], seed: 5 });
    canvas.rect(11, top + 9, 10, 3, SW.strap[2]);
    canvas.rect(11, top + 9, 10, 1, SW.strap[3]);
    canvas.rect(11, top + 11, 10, 1, SW.strap[0]);
    canvas.rect(11, top + 9, 3, 3, SW.steel[2]);
    canvas.pixel(11, top + 9, SW.steel[5]);
    canvas.line(14, top + 1, 20, top + 9, SW.strap[1]);
    // Braço da frente balançando, com ombreira.
    const arm = -Math.sign(stride);
    swordsmanArm(canvas, 14 + arm, top, 0, -1);
    pauldron(canvas, 16, top + 1, 1);
    canvas.rect(15, top - 2, 3, 2, SW.skin[1]);
    stamp(canvas, 9, 2 + bob, SWORDSMAN_HEAD_SIDE, map);
  }
}

// ---------- Guerreira da capa vinho ----------

/** Cores da capa: vinho original, azul, verde e preto. */
export const CAPE_COLORS = Object.freeze({
  wine: ['#3a0a16', '#6b1226', '#9c1d36', '#c63a50'],
  blue: ['#0e1e46', '#1c3a82', '#2e5cc0', '#5c8ae8'],
  green: ['#0e2a16', '#24562a', '#3e8a44', '#72bc6c'],
  black: ['#0a0a0e', '#1c1c24', '#34343f', '#55556a']
});

const WR = {
  skin: ['#5e3220', '#85502f', '#a96d41', '#c98c5a'],
  hair: ['#0c0809', '#231412', '#3a2420', '#58392e'],
  cloth: ['#8e8b9a', '#c4c2ce', '#ecebf1', '#ffffff'],
  leather: ['#1a0e0a', '#3a2016', '#5e3a26', '#835236'],
  metal: STEEL
};

function skinOf(shade) {
  return WR.skin[shade];
}

/** Massa de cabelo cacheado: elipse com ruído de cachos (anéis claros e fendas escuras). */
function curlyHair(canvas, cx, cy, rx, ry, seed) {
  canvas.forEllipse(cx, cy, rx, ry, (x, y, nx, ny) => {
    const n = hash(x, y, seed);
    const ring = (x + y * 2 + Math.round(hash(x >> 1, y >> 1, seed + 3) * 3)) % 5 === 0;
    let tone = n > 0.78 ? 2 : n > 0.3 ? 1 : 0;
    if (ring) tone = Math.min(3, tone + 1);
    // Luz do alto à esquerda, borda de baixo/direita mais escura.
    const light = -nx * 0.5 - ny * 0.7;
    if (light > 0.45 && n > 0.35) tone = Math.min(3, tone + 1);
    if (light < -0.55) tone = Math.max(0, tone - 1);
    canvas.pixel(x, y, WR.hair[tone]);
  });
}

function capeShape(canvas, cape, points, seed, folds) {
  cloth(canvas, points, [cape[0], cape[1], cape[2], cape[3]], { folds, seed });
}

function warriorLegsFront(canvas, frame) {
  const { stride } = pose(frame);
  const lifts = [Math.sign(stride) < 0 ? 1 : 0, Math.sign(stride) > 0 ? 1 : 0];
  [[11, lifts[0]], [17, lifts[1]]].forEach(([x, up]) => {
    // Coxa morena, meia-calça de couro, joelheira e caneleira de aço, bota de aço.
    canvas.rect(x, 27, 4, 2, skinOf(2));
    canvas.rect(x, 27, 1, 2, skinOf(3));
    canvas.rect(x + 3, 27, 1, 2, skinOf(1));
    canvas.rect(x, 29, 4, 2, WR.leather[1]);
    canvas.rect(x, 29, 1, 2, WR.leather[2]);
    canvas.rect(x, 31 - up, 4, 2, WR.metal[3]);
    canvas.rect(x, 31 - up, 1, 2, WR.metal[5]);
    canvas.rect(x + 3, 31 - up, 1, 2, WR.metal[2]);
    canvas.rect(x, 33 - up, 4, 3, WR.metal[2]);
    canvas.rect(x, 33 - up, 1, 3, WR.metal[4]);
    canvas.rect(x + 3, 33 - up, 1, 3, WR.metal[1]);
    canvas.line(x, 33 - up, x + 3, 33 - up, WR.metal[4]);
    canvas.rect(x - (x < 16 ? 1 : 0), 36 - up, 5, 2, WR.metal[2]);
    canvas.rect(x - (x < 16 ? 1 : 0), 36 - up, 3, 1, WR.metal[4]);
    canvas.rect(x - (x < 16 ? 1 : 0), 38 - up, 5, 1, WR.metal[0]);
  });
}

const WARRIOR_FACE_FRONT = [
  '..sssssss..',
  '.sSsSSsSss.',
  '.sssssssss.',
  'sEeEssEeEss',
  'sEEEssEEEss',
  '.ssssSsssss'.slice(0, 11),
  '.sssnnsssss'.slice(0, 11),
  '..sssLLsss.'.slice(0, 11),
  '...tssss...'.slice(0, 11),
  '....ttt....'
];

function warriorFace(canvas, cx, y, bob, frame) {
  const o = y + bob;
  canvas.shadedEllipse(cx, o + 4.2, 4.6, 5.2, [WR.skin[1], WR.skin[2], WR.skin[3], '#d99d68']);
  // Olhos grandes com cílios, íris castanha e brilho; sobrancelhas grossas.
  for (const dx of [-3, 1]) {
    canvas.rect(cx + dx, o + 3, 3, 1, WR.hair[0]);
    canvas.rect(cx + dx, o + 4, 3, 2, '#f1e4d4');
    canvas.rect(cx + dx + 1, o + 4, 2, 2, '#3a2014');
    canvas.pixel(cx + dx + 1, o + 4, WR.hair[0]);
    canvas.pixel(cx + dx + 2, o + 4, '#c8a078');
    canvas.rect(cx + dx, o + 2, 3, 1, WR.hair[1]);
  }
  canvas.pixel(cx, o + 6, WR.skin[1]);
  canvas.rect(cx - 1, o + 8, 3, 1, '#9a3a3c');
  canvas.pixel(cx, o + 8, '#c8585a');
  canvas.pixel(cx - 3, o + 7, '#b9754c');
  canvas.pixel(cx + 3, o + 7, WR.skin[1]);
  if (frame === 3) canvas.pixel(cx - 2, o + 9, WR.skin[1]);
}

function drawWarrior(canvas, view, frame, cape) {
  const { bob, swing, sway, stride } = pose(frame);
  const top = 15 + bob;
  canvas.shadow(16, 38, 9, 2, 110);
  if (view === 'front') {
    // Capa por trás: aparece dos dois lados do corpo e abaixo da cintura.
    capeShape(canvas, cape, [[8, top], [24, top], [27 + sway, 33], [5 - sway, 33]], 7, [10, 22, 7, 25]);
    canvas.line(5 - sway, 33, 27 + sway, 33, cape[0]);
    for (let x = 6 - sway; x < 27 + sway; x += 3) canvas.pixel(x, 33 + (x % 2), cape[1]);
    warriorLegsFront(canvas, frame);
    // Corset branco com decote, costuras e laços.
    canvas.rect(12, top, 9, 1, skinOf(2));
    canvas.polygon([[12, top + 1], [21, top + 1], [20, top + 10], [13, top + 10]], WR.cloth[2]);
    canvas.rect(12, top + 1, 2, 9, WR.cloth[3]);
    canvas.rect(19, top + 1, 2, 9, WR.cloth[1]);
    canvas.shadedEllipse(14, top + 3, 2.4, 2.4, [WR.cloth[1], WR.cloth[2], WR.cloth[3], '#ffffff']);
    canvas.shadedEllipse(19, top + 3, 2.4, 2.4, [WR.cloth[0], WR.cloth[1], WR.cloth[2], WR.cloth[3]]);
    canvas.rect(15, top, 3, 2, skinOf(2));
    canvas.pixel(16, top + 1, skinOf(1));
    canvas.line(16, top + 4, 16, top + 9, WR.cloth[0]);
    for (let y = top + 5; y < top + 9; y += 2) canvas.pixel(15, y, WR.cloth[1]);
    for (let y = top + 5; y < top + 9; y += 2) canvas.pixel(17, y, WR.cloth[0]);
    canvas.line(13, top + 1, 20, top + 1, WR.cloth[0]);
    // Cinto de couro com fivela dourada e tanga branca.
    canvas.rect(11, top + 10, 11, 2, WR.leather[2]);
    canvas.rect(11, top + 10, 11, 1, WR.leather[3]);
    canvas.rect(11, top + 11, 11, 1, WR.leather[0]);
    canvas.rect(15, top + 10, 3, 2, GOLD[2]);
    canvas.pixel(15, top + 10, GOLD[3]);
    canvas.pixel(16, top + 11, GOLD[0]);
    canvas.polygon([[14, top + 12], [19, top + 12], [19, top + 15], [17, top + 16], [14, top + 15]], WR.cloth[2]);
    canvas.rect(14, top + 12, 2, 3, WR.cloth[3]);
    canvas.rect(18, top + 12, 1, 3, WR.cloth[1]);
    canvas.line(14, top + 15, 18, top + 16, WR.metal[2]);
    canvas.pixel(16, top + 14, WR.cloth[0]);
    // Braços: ombro moreno, braçadeira de couro e manopla.
    for (const [x, s] of [[7, -swing], [22, swing]]) {
      const y = top + 2 + s;
      canvas.rect(x, y, 3, 3, skinOf(2));
      canvas.rect(x, y, 1, 3, skinOf(3));
      canvas.rect(x + 2, y, 1, 3, skinOf(1));
      canvas.rect(x, y + 3, 3, 4, WR.leather[2]);
      canvas.rect(x, y + 3, 1, 4, WR.leather[3]);
      canvas.rect(x + 2, y + 3, 1, 4, WR.leather[0]);
      canvas.line(x, y + 4, x + 2, y + 4, WR.leather[0]);
      canvas.pixel(x + 1, y + 6, WR.metal[3]);
      canvas.rect(x, y + 7, 3, 3, skinOf(2));
      canvas.rect(x, y + 7, 3, 1, WR.leather[1]);
      canvas.rect(x, y + 8, 1, 2, skinOf(3));
    }
    // Ombreiras de couro e fecho dourado da capa.
    for (const cx of [10, 22]) {
      canvas.shadedEllipse(cx, top + 1, 2.6, 2, [WR.leather[0], WR.leather[1], WR.leather[2], WR.leather[3]]);
    }
    cloth(canvas, [[9, top - 1], [14, top - 1], [14, top + 2], [8, top + 3]], cape, { seed: 11 });
    cloth(canvas, [[18, top - 1], [23, top - 1], [24, top + 3], [18, top + 2]], cape, { seed: 12 });
    canvas.rect(15, top - 1, 3, 3, GOLD[2]);
    canvas.pixel(15, top - 1, GOLD[3]);
    canvas.pixel(16, top, '#8a1c30');
    canvas.rect(15, top - 2, 3, 2, skinOf(1));
    // Cabelo: massa atrás da cabeça, rosto, franja de cachos e mechas caindo nos ombros.
    curlyHair(canvas, 16, 8 + bob, 8.5, 8, 21);
    curlyHair(canvas, 8 + sway, top + 1, 2.6, 5.5, 22);
    curlyHair(canvas, 24 - sway, top + 1, 2.6, 5.5, 23);
    warriorFace(canvas, 16, 4, bob, frame);
    curlyHair(canvas, 12, 5 + bob, 4.2, 2.8, 24);
    curlyHair(canvas, 20, 5 + bob, 4.2, 2.8, 25);
    curlyHair(canvas, 16, 2 + bob, 6, 3, 26);
  } else if (view === 'back') {
    warriorLegsFront(canvas, frame);
    // Capa cobrindo as costas inteiras, balançando.
    capeShape(canvas, cape, [[8, top - 1], [24, top - 1], [28 - sway, 34], [4 + sway, 34]], 9, [10, 13, 16, 19, 22]);
    canvas.line(4 + sway, 34, 28 - sway, 34, cape[0]);
    for (let x = 5 + sway; x < 28 - sway; x += 3) canvas.pixel(x, 34 + (x % 2), cape[1]);
    canvas.line(9, top - 1, 23, top - 1, cape[3]);
    canvas.rect(15, top - 2, 3, 2, cape[1]);
    // Cabelo cobrindo o alto das costas.
    curlyHair(canvas, 16, 9 + bob, 10, 9, 31);
    curlyHair(canvas, 16, top + 2, 7, 6, 32);
    curlyHair(canvas, 9 + sway, top + 2, 3, 6, 33);
    curlyHair(canvas, 23 - sway, top + 2, 3, 6, 34);
    for (const [x, s] of [[7, swing], [22, -swing]]) {
      const y = top + 3 + s;
      canvas.rect(x, y, 3, 4, skinOf(2));
      canvas.rect(x, y + 4, 3, 3, WR.leather[2]);
      canvas.rect(x, y + 7, 3, 3, skinOf(2));
    }
  } else {
    // Perfil virado para a esquerda; capa e cabelo vão para trás (direita da imagem).
    capeShape(canvas, cape, [[17, top - 1], [24, top], [28 + sway, 34], [16, 33]], 13, [20, 23, 26]);
    canvas.line(16, 33, 28 + sway, 34, cape[0]);
    for (const [offset, dark] of [[-stride, true], [stride, false]]) {
      const x = 14 + offset;
      const m = dark ? [WR.metal[0], WR.metal[1], WR.metal[2]] : [WR.metal[1], WR.metal[3], WR.metal[5]];
      canvas.rect(x, 27, 4, 4, dark ? WR.skin[1] : WR.skin[2]);
      canvas.rect(x, 29, 4, 2, dark ? WR.leather[0] : WR.leather[1]);
      canvas.rect(x, 31, 4, 2, m[1]);
      canvas.rect(x, 31, 1, 2, m[2]);
      canvas.rect(x, 33, 4, 3, m[1]);
      canvas.rect(x - 2, 36, 6, 2, m[1]);
      canvas.rect(x - 2, 36, 3, 1, m[2]);
      canvas.rect(x - 2, 38, 6, 1, WR.metal[0]);
    }
    canvas.polygon([[12, top + 1], [20, top + 1], [19, top + 10], [13, top + 10]], WR.cloth[2]);
    canvas.rect(12, top + 1, 3, 9, WR.cloth[3]);
    canvas.rect(18, top + 1, 2, 9, WR.cloth[1]);
    canvas.shadedEllipse(13, top + 3, 2.2, 2.4, [WR.cloth[1], WR.cloth[2], WR.cloth[3], '#ffffff']);
    canvas.rect(12, top + 10, 8, 2, WR.leather[2]);
    canvas.rect(12, top + 10, 8, 1, WR.leather[3]);
    canvas.polygon([[12, top + 12], [18, top + 12], [18, top + 15], [12, top + 15]], WR.cloth[2]);
    canvas.rect(12, top + 12, 2, 3, WR.cloth[3]);
    const arm = -Math.sign(stride);
    const x = 14 + arm;
    canvas.rect(x, top + 2, 3, 3, skinOf(2));
    canvas.rect(x, top + 5, 3, 4, WR.leather[2]);
    canvas.rect(x, top + 5, 1, 4, WR.leather[3]);
    canvas.rect(x, top + 9, 3, 3, skinOf(2));
    cloth(canvas, [[12, top - 1], [19, top - 1], [20, top + 3], [12, top + 3]], cape, { seed: 14 });
    canvas.rect(14, top - 2, 3, 2, skinOf(1));
    curlyHair(canvas, 17, 9 + bob, 9, 9, 41);
    curlyHair(canvas, 21 - sway, top + 3, 4, 7, 42);
    // Rosto de perfil.
    canvas.shadedEllipse(12.5, 10 + bob, 3.4, 4.8, [WR.skin[1], WR.skin[2], WR.skin[3], '#d99d68']);
    canvas.pixel(9, 11 + bob, WR.skin[3]);
    canvas.rect(11, 9 + bob, 2, 1, WR.hair[0]);
    canvas.rect(11, 10 + bob, 2, 2, '#f1e4d4');
    canvas.pixel(11, 10 + bob, '#3a2014');
    canvas.pixel(11, 11 + bob, WR.hair[0]);
    canvas.rect(10, 14 + bob, 2, 1, '#9a3a3c');
    curlyHair(canvas, 15, 5 + bob, 5.5, 3.5, 43);
    curlyHair(canvas, 12, 6 + bob, 3, 1.6, 44);
  }
}

// ---------- API ----------

/** Definição das skins novas. `id` vira o sufixo da textura (player-<id>). */
export const SKINS = Object.freeze([
  { id: 'swordsman', label: 'Espadachim', draw: (canvas, view, frame) => drawSwordsman(canvas, view, frame) },
  ...Object.entries(CAPE_COLORS).map(([key, cape]) => ({
    id: key === 'wine' ? 'warrior' : `warrior-${key}`,
    label: { wine: 'Guerreira Vinho', blue: 'Guerreira Azul', green: 'Guerreira Verde', black: 'Guerreira Negra' }[key],
    draw: (canvas, view, frame) => drawWarrior(canvas, view, frame, cape)
  }))
]);

/** direction: 0 = baixo, 1 = esquerda, 2 = direita, 3 = cima. */
export function drawSkinFrame(skinId, direction, frame) {
  const skin = SKINS.find((entry) => entry.id === skinId);
  if (!skin) throw new Error(`Skin desconhecida: ${skinId}`);
  const canvas = new PixelCanvas(SKIN_FRAME.width, SKIN_FRAME.height);
  if (direction === 0) skin.draw(canvas, 'front', frame);
  else if (direction === 3) skin.draw(canvas, 'back', frame);
  else {
    const side = new PixelCanvas(SKIN_FRAME.width, SKIN_FRAME.height);
    skin.draw(side, 'side', frame);
    canvas.blit(side, 0, 0, { flipX: direction === 2 });
  }
  return canvas.outline({ strength: 0.85 });
}

export { mix };
