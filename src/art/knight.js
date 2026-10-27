import { PixelCanvas } from './pixel.js';

// Jogador: cavaleiro de armadura prateada, pluma vermelha e escudo com cruz.
// Quadro de 32 x 40 px (pés na linha 38). A espada é um objeto separado (gear.js).

export const KNIGHT_FRAME = Object.freeze({ width: 32, height: 40 });

const PALETTE = {
  K: '#171a22', // fresta da viseira
  1: '#3d4452',
  2: '#5d6676',
  3: '#8c95a4',
  4: '#c1c8d2',
  5: '#eef2f6',
  r: '#6e1212',
  R: '#b8231d',
  p: '#e8553d',
  g: '#8a5a14',
  G: '#d99a2b',
  y: '#f6d36a',
  b: '#3e2618',
  B: '#6a4228'
};

/** Carimba um desenho feito à mão (cada letra é uma cor da paleta, '.' é vazio). */
function stamp(canvas, x, y, rows, { flipX = false } = {}) {
  rows.forEach((row, dy) => {
    [...row].forEach((key, dx) => {
      const color = PALETTE[key];
      if (!color) return;
      canvas.pixel(flipX ? x + row.length - 1 - dx : x + dx, y + dy, color);
    });
  });
}

const HELMET_FRONT = [
  '...344432...',
  '..34555432..',
  '.3445554332.',
  '.3445544332.',
  '344454443322',
  '344444433322',
  '3KKKKKKKKKK2',
  '344444433322',
  '3444K44K3322',
  '344444433322',
  '.3444443322.',
  '.2333333221.',
  '..12222211..'
];

const HELMET_BACK = [
  '...344432...',
  '..34554432..',
  '.3445544332.',
  '.3444444332.',
  '344443443322',
  '344443433322',
  '333333333222',
  '344443433322',
  '344443433322',
  '334443333222',
  '.3333333222.',
  '.2222222211.',
  '..11111111..'
];

const HELMET_SIDE = [
  '....344432..',
  '..3455554322',
  '.34555544322',
  '.34455444322',
  '344444443322',
  '344444433322',
  'KKKKK4433322',
  '344444433322',
  '4K4K44433322',
  '344444433222',
  '.34444332221',
  '..233332221.',
  '...1222211..'
];

/** Pluma vermelha: sobe do elmo e cai para trás (dir = 1 cai para a direita). */
function drawPlume(canvas, baseX, baseY, dir = 1, sway = 0) {
  const points = [
    [baseX - 1, baseY + 1],
    [baseX - 1, baseY - 3],
    [baseX + dir * 3, baseY - 6],
    [baseX + dir * 7, baseY - 6 + sway],
    [baseX + dir * 10, baseY - 3 + sway],
    [baseX + dir * 11, baseY + 2 + sway],
    [baseX + dir * 9, baseY + 1 + sway],
    [baseX + dir * 6, baseY - 2 + sway],
    [baseX + dir * 3, baseY - 2],
    [baseX + 2 * dir, baseY + 1]
  ];
  canvas.polygon(points, PALETTE.R);
  // Luz no alto, sombra embaixo e fios soltos na ponta.
  canvas.line(baseX, baseY - 3, baseX + dir * 3, baseY - 5, PALETTE.p);
  canvas.line(baseX + dir * 3, baseY - 5, baseX + dir * 7, baseY - 5 + sway, PALETTE.p);
  canvas.line(baseX + dir * 4, baseY - 2, baseX + dir * 7, baseY - 1 + sway, PALETTE.r);
  canvas.line(baseX + dir * 8, baseY + sway, baseX + dir * 10, baseY + 2 + sway, PALETTE.r);
  canvas.pixel(baseX + dir * 11, baseY + 3 + sway, PALETTE.r);
}

/** Escudo em forma de pipa com cruz vermelha. */
function drawShield(canvas, x, y, width = 9, height = 13, { edgeOnly = false } = {}) {
  const taperStart = Math.round(height * 0.55);
  const half = (width - 1) / 2;
  for (let row = 0; row < height; row += 1) {
    const inset = row <= taperStart ? 0 : Math.round(((row - taperStart) / (height - taperStart)) * half);
    for (let col = inset; col < width - inset; col += 1) {
      const border = row === 0 || row === height - 1 || col === inset || col === width - inset - 1;
      let color = border ? PALETTE[2] : col < width / 2 ? PALETTE[5] : PALETTE[4];
      if (!border && col === inset + 1) color = PALETTE[5];
      if (!border && col >= width - inset - 2) color = PALETTE[3];
      if (border && row === 0) color = PALETTE[3];
      canvas.pixel(x + col, y + row, color);
    }
  }
  if (edgeOnly) return;
  // Cruz.
  const cx = x + Math.floor(width / 2);
  const crossTop = y + 2;
  const crossBottom = y + height - 4;
  const armY = y + Math.round(height * 0.36);
  canvas.rect(cx, crossTop, 1, crossBottom - crossTop + 1, PALETTE.R);
  canvas.rect(x + 2, armY, width - 4, 1, PALETTE.R);
  canvas.pixel(cx, crossTop - 0, PALETTE.p);
  canvas.pixel(x + 2, armY, PALETTE.p);
  canvas.pixel(cx - 1, armY - 1, PALETTE.r);
}

// Quadros: 0 = passo esquerdo, 1 = parado, 2 = passo direito, 3 = parado (respira).
function stepOf(frame) {
  if (frame === 0) return { left: -1, right: 1 };
  if (frame === 2) return { left: 1, right: -1 };
  return { left: 0, right: 0 };
}

function drawLegsFront(canvas, frame) {
  const step = stepOf(frame);
  for (const [x, lift] of [[11, step.left], [17, step.right]]) {
    const up = lift < 0 ? 1 : 0;
    // Coxa em cota de malha, joelheira, caneleira e bota de placas.
    canvas.rect(x, 29, 4, 3, PALETTE[2]);
    canvas.pixel(x + 1, 30, PALETTE[3]);
    canvas.rect(x, 32 - up, 4, 2, PALETTE[4]);
    canvas.pixel(x, 32 - up, PALETTE[5]);
    canvas.rect(x, 34 - up, 4, 2, PALETTE[3]);
    canvas.pixel(x, 34 - up, PALETTE[4]);
    canvas.rect(x - (x < 16 ? 1 : 0), 36 - up, 5, 2, PALETTE[2]);
    canvas.rect(x - (x < 16 ? 1 : 0), 36 - up, 3, 1, PALETTE[4]);
  }
}

function drawTorsoFront(canvas, top, { back = false } = {}) {
  // Peitoral com quina central, gorjal, cinto com fivela e saia de placas.
  canvas.rect(13, top - 1, 6, 2, PALETTE[2]);
  canvas.shadedEllipse(16, top + 5, 6.5, 6, [PALETTE[2], PALETTE[3], PALETTE[4], PALETTE[5]]);
  canvas.rect(10, top + 2, 12, 7, PALETTE[3]);
  canvas.rect(10, top + 2, 3, 7, PALETTE[4]);
  canvas.rect(19, top + 2, 3, 7, PALETTE[2]);
  if (!back) {
    canvas.line(16, top + 1, 16, top + 8, PALETTE[5]);
    canvas.line(17, top + 2, 17, top + 8, PALETTE[2]);
    canvas.pixel(12, top + 3, PALETTE[5]);
  } else {
    canvas.line(16, top + 1, 16, top + 8, PALETTE[2]);
  }
  canvas.rect(10, top + 9, 12, 2, PALETTE.B);
  canvas.rect(10, top + 10, 12, 1, PALETTE.b);
  if (!back) {
    canvas.rect(15, top + 9, 3, 2, PALETTE.G);
    canvas.pixel(15, top + 9, PALETTE.y);
    canvas.pixel(16, top + 10, PALETTE.b);
  }
  // Saia de placas (tassets).
  canvas.polygon([[10, top + 11], [22, top + 11], [23, top + 14], [9, top + 14]], PALETTE[3]);
  canvas.rect(10, top + 11, 12, 1, PALETTE[4]);
  canvas.line(16, top + 11, 16, top + 13, PALETTE[2]);
  // Ombreiras.
  for (const cx of [10, 22]) {
    canvas.shadedEllipse(cx, top + 2, 3.6, 3, [PALETTE[2], PALETTE[3], PALETTE[4], PALETTE[5]]);
    canvas.line(cx - 3, top + 4, cx + 3, top + 4, PALETTE[2]);
  }
}

function drawArmFront(canvas, x, top, swing, light) {
  canvas.rect(x, top + 4 + swing, 3, 5, light ? PALETTE[4] : PALETTE[3]);
  canvas.pixel(x + (light ? 0 : 2), top + 4 + swing, light ? PALETTE[5] : PALETTE[2]);
  canvas.rect(x, top + 6 + swing, 3, 1, PALETTE[2]);
  // Manopla.
  canvas.rect(x, top + 9 + swing, 3, 3, PALETTE[2]);
  canvas.rect(x, top + 9 + swing, 2, 1, PALETTE[4]);
}

function drawFront(canvas, frame, female = false) {
  const bob = frame === 3 ? 1 : 0;
  const top = 15 + bob;
  const swing = frame === 0 ? 1 : frame === 2 ? -1 : 0;
  canvas.shadow(16, 38, 9, 2, 110);
  drawLegsFront(canvas, frame);
  drawTorsoFront(canvas, top);
  // Braço da espada (direita da tela); o outro fica atrás do escudo.
  drawArmFront(canvas, 22, top, swing, false);
  drawPlume(canvas, 16, 3 + bob, 1, frame === 1 ? 1 : 0);
  stamp(canvas, 10, 3 + bob, HELMET_FRONT);
  drawShield(canvas, 3, top + 1 - swing, 9, 14);
  if (female) heroineExtras(canvas, 'front', top, bob, frame);
}

function drawBack(canvas, frame, female = false) {
  const bob = frame === 3 ? 1 : 0;
  const top = 15 + bob;
  const swing = frame === 0 ? 1 : frame === 2 ? -1 : 0;
  canvas.shadow(16, 38, 9, 2, 110);
  drawLegsFront(canvas, frame);
  drawArmFront(canvas, 7, top, -swing, true);
  drawArmFront(canvas, 22, top, swing, false);
  drawTorsoFront(canvas, top, { back: true });
  // Escudo pendurado nas costas.
  drawShield(canvas, 12, top + 1, 9, 12);
  stamp(canvas, 10, 3 + bob, HELMET_BACK);
  drawPlume(canvas, 16, 3 + bob, 1, frame === 1 ? 1 : 0);
  if (female) heroineExtras(canvas, 'back', top, bob, frame);
}

/** Perfil virado para a esquerda (o lado direito é o espelho). */
function drawSide(canvas, frame, female = false) {
  const bob = frame === 3 ? 1 : 0;
  const top = 15 + bob;
  const stride = frame === 0 ? 2 : frame === 2 ? -2 : 0;
  canvas.shadow(16, 38, 8, 2, 110);
  // Escudo nas costas do braço de trás.
  drawShield(canvas, 19, top + 1, 7, 13);
  // Pernas: a de trás mais escura.
  for (const [offset, back] of [[-stride, true], [stride, false]]) {
    const x = 14 + offset;
    canvas.rect(x, 29, 4, 3, back ? PALETTE[1] : PALETTE[2]);
    canvas.rect(x, 32, 4, 2, back ? PALETTE[3] : PALETTE[4]);
    canvas.rect(x, 34, 4, 2, back ? PALETTE[2] : PALETTE[3]);
    canvas.rect(x - 2, 36, 6, 2, back ? PALETTE[1] : PALETTE[2]);
    canvas.rect(x - 2, 36, 3, 1, back ? PALETTE[2] : PALETTE[4]);
  }
  // Tronco de perfil.
  canvas.rect(13, top - 1, 5, 2, PALETTE[2]);
  canvas.shadedEllipse(16, top + 5, 5, 6, [PALETTE[2], PALETTE[3], PALETTE[4], PALETTE[5]]);
  canvas.rect(12, top + 2, 9, 7, PALETTE[3]);
  canvas.rect(12, top + 2, 3, 7, PALETTE[4]);
  canvas.rect(18, top + 2, 3, 7, PALETTE[2]);
  canvas.rect(12, top + 9, 9, 2, PALETTE.B);
  canvas.rect(12, top + 10, 9, 1, PALETTE.b);
  canvas.polygon([[12, top + 11], [21, top + 11], [22, top + 14], [11, top + 14]], PALETTE[3]);
  canvas.rect(12, top + 11, 9, 1, PALETTE[4]);
  // Ombreira e braço da frente balançando.
  canvas.shadedEllipse(16, top + 2, 4, 3, [PALETTE[2], PALETTE[3], PALETTE[4], PALETTE[5]]);
  const arm = -Math.sign(stride);
  canvas.rect(14 + arm, top + 4, 3, 5, PALETTE[4]);
  canvas.rect(14 + arm, top + 6, 3, 1, PALETTE[2]);
  canvas.rect(14 + arm, top + 9, 3, 3, PALETTE[2]);
  canvas.rect(14 + arm, top + 9, 2, 1, PALETTE[4]);
  drawPlume(canvas, 17, 3 + bob, 1, frame === 1 ? 1 : 0);
  stamp(canvas, 10, 3 + bob, HELMET_SIDE);
  if (female) heroineExtras(canvas, 'side', top, bob, frame);
}

// ---------- Heroína: o mesmo cavaleiro com cabelo longo, saia de placas e detalhes magenta ----------

const HAIR = { dark: '#8a5a14', mid: '#c98a2b', light: '#f0c25a' };
const SKIRT = { dark: '#3e1a50', mid: '#7a3a8a', light: '#b06cc4' };
const FEMALE_PALETTE = { r: '#5e1a5a', R: '#a8309a', p: '#e070c8', B: '#7a3a8a', b: '#3e1a50' };

/** Cabelo comprido, cinto e saia curva por cima do desenho do cavaleiro. */
function heroineExtras(canvas, view, top, bob, frame) {
  const sway = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const lock = (x, y, height) => {
    canvas.rect(x, y, 3, height, HAIR.mid);
    canvas.rect(x, y, 1, height, HAIR.light);
    canvas.rect(x + 2, y + 1, 1, height - 1, HAIR.dark);
    canvas.pixel(x + 1, y + height, HAIR.dark);
  };
  const skirt = (left, right, y, flare) => {
    canvas.polygon([[left, y], [right, y], [right + flare, y + 5], [left - flare, y + 5]], SKIRT.mid);
    canvas.line(left, y, right, y, SKIRT.light);
    canvas.line(left - flare, y + 5, right + flare, y + 5, SKIRT.dark);
    canvas.line(Math.round((left + right) / 2), y + 1, Math.round((left + right) / 2), y + 4, SKIRT.dark);
  };
  if (view === 'front') {
    skirt(10, 22, top + 12, 2);
    lock(8, 9 + bob, 9);
    lock(21, 9 + bob, 9 + sway);
  } else if (view === 'back') {
    skirt(10, 22, top + 12, 2);
    lock(14, 11 + bob, 15);
    canvas.rect(13, 11 + bob, 6, 2, HAIR.mid);
    canvas.pixel(15 + sway, 27 + bob, HAIR.dark);
  } else {
    skirt(11, 21, top + 12, 2);
    lock(20, 9 + bob, 14 + sway);
    canvas.rect(19, 9 + bob, 3, 2, HAIR.mid);
  }
}

function withFemalePalette(draw) {
  const saved = {};
  for (const [key, value] of Object.entries(FEMALE_PALETTE)) {
    saved[key] = PALETTE[key];
    PALETTE[key] = value;
  }
  try {
    return draw();
  } finally {
    Object.assign(PALETTE, saved);
  }
}

/** direction: 0 = baixo, 1 = esquerda, 2 = direita, 3 = cima. */
export function drawHeroineFrame(direction, frame) {
  return withFemalePalette(() => drawKnightFrame(direction, frame, true));
}

/** direction: 0 = baixo, 1 = esquerda, 2 = direita, 3 = cima. */
export function drawKnightFrame(direction, frame, female = false) {
  const canvas = new PixelCanvas(KNIGHT_FRAME.width, KNIGHT_FRAME.height);
  if (direction === 0) drawFront(canvas, frame, female);
  else if (direction === 3) drawBack(canvas, frame, female);
  else {
    const side = new PixelCanvas(KNIGHT_FRAME.width, KNIGHT_FRAME.height);
    drawSide(side, frame, female);
    canvas.blit(side, 0, 0, { flipX: direction === 2 });
  }
  return canvas.outline({ strength: 0.85 });
}
