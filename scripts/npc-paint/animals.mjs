// Animais da fazenda e mascotes (Fase 20 G-npcs), de perfil olhando para a direita (o jogo espelha).
// Cada um: { kind: 'animal' | 'pet', w, h, frames, feet, shadow, paint(ctx, quadro) }.
// Quadros 0..3 = andar (patas em pares diagonais) ou bater asas (voadores).
import { R, cel, ell, fill, inside, limb, poly, px, stroke } from './kit.mjs';

const INK = '#1c121c';
const WHITE = '#f9e6cf';
const SWING = [1, 0, -1, 0];
const BOB = [0, -1, 0, -1];

function eye(ctx, x, y, { big = false, glint = true, color = INK } = {}) {
  px(ctx, x, y, color, 1, big ? 2 : 1);
  if (big) px(ctx, x + 1, y, color, 1, 2);
  if (glint) px(ctx, x + (big ? 1 : 0), y, WHITE, 1, 1);
}

/** Pata de quadrúpede: coxa + canela até o casco, com o casco escuro. */
function leg(ctx, [x, y], len, w, color, hoof, swing, lift = 0) {
  const foot = [x + swing, y + len - lift];
  const knee = [x + swing * 0.4 + 0.4, y + len * 0.5];
  fill(ctx, limb(ctx, [x, y], knee, w + 0.6, w), color);
  fill(ctx, limb(ctx, knee, [foot[0], foot[1] - 1], w, w - 0.4), color);
  if (hoof) px(ctx, foot[0] - w / 2, foot[1] - 1.4, hoof, Math.max(1, Math.round(w)), 1.6);
}

function quadLegs(ctx, f, { hipX, shX, y, len, w, near, far, hoof, step = 2.4 }) {
  const s = SWING[f];
  const liftA = f === 1 ? 1 : 0;
  const liftB = f === 3 ? 1 : 0;
  // Pares diagonais: (traseira perto + dianteira longe) e (traseira longe + dianteira perto).
  leg(ctx, [hipX - 1, y], len, w, far, hoof, -s * step, liftB);
  leg(ctx, [shX - 1, y], len, w, far, hoof, s * step, liftA);
  return () => {
    leg(ctx, [hipX + 0.6, y], len, w, near, hoof, s * step, liftA);
    leg(ctx, [shX + 0.6, y], len, w, near, hoof, -s * step, liftB);
  };
}

// ---------------------------------------------------------------- fazenda

const chicken = {
  kind: 'animal', w: 24, h: 24, frames: 4, feet: 22, shadow: [12, 21.5, 6, 1.5],
  paint(ctx, f) {
    const b = BOB[f];
    const peck = f === 2 ? 1.6 : 0;
    // Pernas amarelas.
    const s = SWING[f];
    for (const [x, d] of [[10.5, s], [13, -s]]) {
      stroke(ctx, [[x, 16 + b], [x + d * 1.2, 21]], 1, '#edab50');
      px(ctx, x + d * 1.2 - 1, 20.6, '#e07438', 2, 1);
    }
    // Rabo.
    fill(ctx, poly(ctx, [[5.5, 9 + b], [8.6, 11 + b], [8, 15 + b], [4.8, 13 + b]], true), '#c7cfdd');
    px(ctx, 5, 9 + b, '#92a1b9', 1, 2);
    // Corpo.
    const body = ell(ctx, 11.5, 13 + b, 6, 4.6, -0.12);
    cel(ctx, body, '#f9e6cf', { d: [1, 1], h: [0.6, 0.6] });
    // Asa com penas.
    const wing = poly(ctx, [[8.5, 11.5 + b], [13.6, 11.2 + b], [14.4, 13.6 + b], [11.4, 16 + b], [8.6, 15 + b]], true);
    cel(ctx, wing, '#d5e8ef', { d: [0.7, 0.8], h: [0.4, 0.4] });
    px(ctx, 10, 14 + b, '#92a1b9', 3, 1);
    // Cabeça (bica no chão no quadro 2).
    const hx = 16.4;
    const hy = 8.4 + b + peck;
    cel(ctx, ell(ctx, hx, hy, 2.8, 2.9), '#ffffff', { d: [0.6, 0.6], h: [0.4, 0.4] });
    fill(ctx, poly(ctx, [[15, hy - 2.6], [15.8, hy - 4.4], [16.8, hy - 3], [17.8, hy - 4.2], [18.4, hy - 2.2]], true), '#ea323c');
    fill(ctx, poly(ctx, [[18.6, hy - 0.6], [21, hy + 0.4], [18.6, hy + 1.2]]), '#ffc825');
    px(ctx, 17.6, hy + 1.6, '#ea323c', 1, 2);
    eye(ctx, 17, hy - 1, { glint: false });
  }
};

const sheep = {
  kind: 'animal', w: 32, h: 28, frames: 4, feet: 26, shadow: [16, 25.5, 10, 2],
  paint(ctx, f) {
    const b = BOB[f];
    const front = quadLegs(ctx, f, { hipX: 10, shX: 20, y: 17 + b, len: 8.4 - b, w: 2.2, near: '#2a2f4e', far: '#1a1932', hoof: '#131313', step: 2 });
    // Lã: muitos cachos sobre um corpo oval.
    const fluff = new ctx.Path2D();
    fluff.addPath(ell(ctx, 15, 14 + b, 9.6, 6.4));
    for (const [x, y, r] of [[7, 12, 3.4], [10, 9, 3.6], [14.5, 8, 3.8], [19, 9, 3.4], [22.6, 12, 3], [8, 17, 3.2], [13, 18.6, 3.4], [18.6, 18.4, 3.2], [22, 16, 2.8]]) fluff.addPath(ell(ctx, x, y + b, r, r * 0.92));
    cel(ctx, fluff, '#f9e6cf', { d: [1.4, 1.4], h: [0.8, 0.8] });
    inside(ctx, fluff, () => {
      for (const [x, y] of [[9, 11], [13, 13], [17, 11], [11, 16], [16, 16], [20, 14], [7, 15]]) {
        stroke(ctx, [[x - 1, y + b + 0.6], [x, y + b - 0.4], [x + 1.2, y + b + 0.6]], 0.8, '#cba36f');
      }
    });
    front();
    // Cabeça escura com orelhas.
    const hx = 25;
    const hy = 11 + b + (f === 2 ? 1 : 0);
    fill(ctx, ell(ctx, hx - 2.2, hy - 1.8, 2.2, 1.2, -0.5), '#424c6e');
    cel(ctx, poly(ctx, [[hx - 3, hy - 3], [hx + 1.6, hy - 3.4], [hx + 4.2, hy], [hx + 3.6, hy + 2.8], [hx, hy + 3.4], [hx - 3, hy + 1.8]], true), '#2a2f4e', { d: [0.7, 0.7], h: [0.5, 0.5] });
    cel(ctx, ell(ctx, hx - 1, hy - 3.6, 2.8, 2, 0), '#f9e6cf', { d: [0.5, 0.5], h: [0.3, 0.3] });
    eye(ctx, hx + 0.5, hy - 1, { color: '#131313' });
    px(ctx, hx + 3, hy + 1.4, '#131313', 1, 1);
  }
};

const pig = {
  kind: 'animal', w: 32, h: 26, frames: 4, feet: 24, shadow: [16, 23.5, 10, 2],
  paint(ctx, f) {
    const b = BOB[f];
    const pink = '#f68187';
    const front = quadLegs(ctx, f, { hipX: 10, shX: 20.5, y: 16 + b, len: 7.6 - b, w: 2.6, near: '#f68187', far: '#c85086', hoof: '#5d2c28', step: 1.6 });
    // Rabo enrolado.
    stroke(ctx, [[5.4, 12 + b], [3.2, 10.6 + b], [3.4, 8.6 + b], [5, 9.4 + b]], 1, '#c85086');
    const body = ell(ctx, 15.4, 13.4 + b, 10.2, 6.6);
    cel(ctx, body, pink, { d: [1.4, 1.4], h: [0.8, 0.8] });
    inside(ctx, body, () => {
      stroke(ctx, [[8, 17 + b], [20, 18.4 + b]], 0.8, R(pink)[1]);
      px(ctx, 12, 10 + b, '#5d2c28', 2, 1);
      px(ctx, 17, 15 + b, R(pink)[1], 1, 1);
    });
    front();
    // Cabeça com focinho e orelha caída.
    const hx = 24.6;
    const hy = 11 + b;
    cel(ctx, ell(ctx, hx, hy, 4.4, 4), pink, { d: [0.8, 0.8], h: [0.6, 0.6] });
    fill(ctx, poly(ctx, [[hx - 2.8, hy - 3], [hx - 0.4, hy - 6.4], [hx + 1.2, hy - 2.8]], true), '#c85086');
    cel(ctx, ell(ctx, hx + 4.4, hy + 0.8, 1.8, 2.2), '#fdd2ed', { d: [0.4, 0.4], h: [0.3, 0.3] });
    px(ctx, hx + 4, hy + 0.4, '#891e2b', 1, 1);
    px(ctx, hx + 5, hy + 1.4, '#891e2b', 1, 1);
    eye(ctx, hx + 1, hy - 1.4, { color: '#131313' });
    px(ctx, hx + 1, hy + 2.6, '#c85086', 2, 1);
  }
};

const cow = {
  kind: 'animal', w: 44, h: 36, frames: 4, feet: 34, shadow: [21, 33.5, 15, 2.4],
  paint(ctx, f) {
    const b = BOB[f];
    const white = '#f9e6cf';
    const front = quadLegs(ctx, f, { hipX: 11, shX: 28, y: 21 + b, len: 11.6 - b, w: 3.2, near: '#f9e6cf', far: '#cba36f', hoof: '#391f21', step: 2.4 });
    // Rabo com tufo.
    const tail = SWING[f] * 0.8;
    stroke(ctx, [[5, 14 + b], [3.6, 19 + b], [3.4 + tail, 24 + b]], 1.1, '#cba36f');
    fill(ctx, ell(ctx, 3.4 + tail, 25 + b, 1.4, 2), '#391f21');
    const body = poly(ctx, [[6, 13 + b], [12, 9.6 + b], [26, 9.8 + b], [32.4, 12 + b], [33, 20 + b], [28, 24.4 + b], [12, 24.6 + b], [5.4, 21 + b]], true);
    cel(ctx, body, white, { d: [1.6, 1.6], h: [0.9, 0.9] });
    inside(ctx, body, () => {
      for (const [x, y, rx, ry, rot] of [[11, 14, 4.4, 3.2, 0.3], [21, 19.6, 4, 2.8, -0.2], [26.6, 12.6, 3, 2.2, 0.4], [16, 10.4, 2.4, 1.6, 0]]) {
        fill(ctx, ell(ctx, x, y + b, rx, ry, rot), '#272727');
        px(ctx, x - rx + 1, y + b - 1, '#5d5d5d', 1, 1);
      }
      stroke(ctx, [[8, 22.6 + b], [30, 22.8 + b]], 1, '#cba36f');
    });
    // Úbere.
    cel(ctx, ell(ctx, 15, 25 + b, 3, 1.8), '#f68187', { d: [0.5, 0.5], h: [0.3, 0.3] });
    front();
    // Cabeça: testa branca, focinho rosa, chifres e orelha.
    const hx = 35.4;
    const hy = 12.6 + b + (f === 2 ? 0.6 : 0);
    fill(ctx, ell(ctx, hx - 3.4, hy - 3.6, 2.6, 1.2, -0.3), '#cba36f');
    const headP = poly(ctx, [[hx - 3.4, hy - 4.4], [hx + 2.6, hy - 4.6], [hx + 4.8, hy + 1], [hx + 5.4, hy + 5], [hx + 2, hy + 7.6], [hx - 1.6, hy + 6.4], [hx - 4, hy + 1]], true);
    cel(ctx, headP, white, { d: [0.9, 0.9], h: [0.6, 0.6] });
    inside(ctx, headP, () => fill(ctx, ell(ctx, hx - 2, hy - 2, 2.6, 2.4), '#272727'));
    cel(ctx, ell(ctx, hx + 3.4, hy + 5.6, 2.8, 2.2), '#f68187', { d: [0.5, 0.5], h: [0.4, 0.4] });
    px(ctx, hx + 4, hy + 5, '#891e2b', 1, 1);
    fill(ctx, poly(ctx, [[hx - 1.6, hy - 4.2], [hx - 2.2, hy - 7.6], [hx - 0.4, hy - 4.4]], true), '#f6ca9f');
    fill(ctx, poly(ctx, [[hx + 1.4, hy - 4.4], [hx + 2.4, hy - 7.8], [hx + 2.8, hy - 4.2]], true), '#f6ca9f');
    eye(ctx, hx + 1.4, hy - 0.6, { color: '#131313' });
    // Sininho.
    px(ctx, hx - 2, hy + 6.6, '#ffc825', 2, 2);
    px(ctx, hx - 2, hy + 6.6, '#ffeb57', 1, 1);
  }
};

// ---------------------------------------------------------------- mascotes

const wolfpup = {
  kind: 'pet', w: 28, h: 24, frames: 4, feet: 22, shadow: [14, 21.5, 8, 1.6],
  paint(ctx, f) {
    const b = BOB[f];
    const grey = '#92a1b9';
    const front = quadLegs(ctx, f, { hipX: 8.6, shX: 16.4, y: 14.6 + b, len: 7 - b, w: 2.2, near: grey, far: '#657392', hoof: '#424c6e', step: 2 });
    // Rabo peludo abanando.
    const wag = [0, 1.2, 0, -1.2][f];
    const tail = poly(ctx, [[5.6, 11 + b], [2, 7.6 + b + wag], [1.2, 5.6 + b + wag], [3.6, 6.8 + b + wag], [7, 10 + b]], true);
    cel(ctx, tail, grey, { d: [0.6, 0.6], h: [0.4, 0.4] });
    px(ctx, 1.5, 5.6 + b + wag, '#f9e6cf', 1, 1);
    const body = ell(ctx, 12, 12.4 + b, 6.8, 4.2);
    cel(ctx, body, grey, { d: [1, 1.1], h: [0.7, 0.7] });
    inside(ctx, body, () => {
      fill(ctx, ell(ctx, 13, 15.6 + b, 5.4, 2), '#d5e8ef');
      stroke(ctx, [[8, 10 + b], [10, 9.4 + b], [12, 10 + b]], 0.7, '#657392');
    });
    front();
    // Cabeça grande de filhote, orelhas em pé, focinho claro.
    const hx = 19.6;
    const hy = 8.6 + b;
    fill(ctx, poly(ctx, [[hx - 3.6, hy - 2.4], [hx - 3.4, hy - 7], [hx - 0.8, hy - 3.4]], true), '#657392');
    fill(ctx, poly(ctx, [[hx + 0.2, hy - 3.4], [hx + 1.4, hy - 7.4], [hx + 3, hy - 2.6]], true), grey);
    px(ctx, hx + 1.2, hy - 5.4, '#f68187', 1, 2);
    cel(ctx, ell(ctx, hx, hy, 4.4, 4), grey, { d: [0.8, 0.8], h: [0.6, 0.6] });
    cel(ctx, ell(ctx, hx + 3.6, hy + 1.4, 2.8, 2), '#d5e8ef', { d: [0.5, 0.6], h: [0.3, 0.3] });
    px(ctx, hx + 5.6, hy + 0.6, INK, 1, 1);
    eye(ctx, hx + 1, hy - 1.6, { big: true });
    if (f % 2 === 0) px(ctx, hx + 4, hy + 3, '#f5555d', 1, 1);
    // Coleira com plaquinha.
    stroke(ctx, [[hx - 3, hy + 2], [hx - 1, hy + 3.6]], 1.2, '#c42430');
    px(ctx, hx - 1.6, hy + 4, '#ffc825', 1, 1);
  }
};

const FLAP = [-1, 0, 1, 0];

const fairy = {
  kind: 'pet', w: 24, h: 26, frames: 4, feet: 24, shadow: [12, 23.5, 4, 1],
  paint(ctx, f) {
    const flap = FLAP[f];
    const y = 0;
    // Asas translúcidas (4 lóbulos) batendo.
    for (const [cx, cy, rx, ry, rot, c] of [[7.6, 9 - flap, 4.4, 2.8 + flap * 0.6, -0.5, '#94fdff'], [8, 14 + flap * 0.4, 3.2, 2, 0.4, '#9cc8e6'], [16.4, 9 - flap, 4.4, 2.8 + flap * 0.6, 0.5, '#94fdff'], [16, 14 + flap * 0.4, 3.2, 2, -0.4, '#9cc8e6']]) {
      const p = ell(ctx, cx, cy + y, rx, ry, rot);
      cel(ctx, p, c, { d: [0.6, 0.6], h: [0.5, 0.5] });
      inside(ctx, p, () => stroke(ctx, [[12, 12], [cx, cy]], 0.6, '#d5e8ef'));
    }
    // Vestido de pétala.
    const dress = poly(ctx, [[10.4, 12.6], [13.6, 12.6], [15.6, 18.6], [12, 19.6], [8.4, 18.6]], true);
    cel(ctx, dress, '#5ac54f', { d: [0.7, 0.7], h: [0.5, 0.5] });
    px(ctx, 10, 18.6, '#99e65f', 1, 1);
    px(ctx, 14, 18.6, '#99e65f', 1, 1);
    stroke(ctx, [[11, 19.4], [10.6, 22]], 1, '#f6ca9f');
    stroke(ctx, [[13, 19.4], [13.4, 21.6]], 1, '#f6ca9f');
    // Cabeça, cabelo e brilho.
    cel(ctx, ell(ctx, 12, 9, 3.4, 3.4), '#f6ca9f', { d: [0.6, 0.6], h: [0.4, 0.4] });
    const hair = poly(ctx, [[8.4, 9.6], [8.8, 6.4], [12, 5], [15.2, 6.4], [15.6, 9.6], [14, 7.8], [12, 8.2], [10, 7.8]], true);
    cel(ctx, hair, '#ffeb57', { d: [0.6, 0.6], h: [0.4, 0.4] });
    px(ctx, 10, 9, INK, 1, 2);
    px(ctx, 13, 9, INK, 1, 2);
    px(ctx, 11, 11, '#f68187', 2, 1);
    // Varinha com estrela.
    stroke(ctx, [[15, 14], [18.4, 10.6]], 0.8, '#cba36f');
    px(ctx, 18, 9.6, '#ffeb57', 2, 2);
    px(ctx, 18, 9.6, '#ffffff', 1, 1);
    if (f % 2 === 0) { px(ctx, 20, 7.6, '#ffeb57', 1, 1); px(ctx, 5, 16, '#d3fc7e', 1, 1); }
  }
};

const magpie = {
  kind: 'pet', w: 26, h: 24, frames: 4, feet: 22, shadow: [12, 21.5, 6, 1.4],
  paint(ctx, f) {
    const hop = [0, -1.6, 0, 0][f];
    const flap = FLAP[f];
    const dark = '#1a1932';
    // Rabo longo azul-escuro brilhante.
    fill(ctx, poly(ctx, [[8, 13 + hop], [1, 11 + hop], [0.6, 12.8 + hop], [7.4, 15.6 + hop]], true), '#2a2f4e');
    px(ctx, 2, 11.6 + hop, '#0069aa', 4, 1);
    // Pernas.
    stroke(ctx, [[12, 17 + hop], [11.4, 21 + Math.min(0, hop)]], 0.9, '#3d3d3d');
    stroke(ctx, [[14, 17 + hop], [14.4, 21 + Math.min(0, hop)]], 0.9, '#3d3d3d');
    // Corpo: dorso preto, barriga branca.
    const body = ell(ctx, 12.6, 13.4 + hop, 5.6, 4.2, -0.2);
    cel(ctx, body, dark, { d: [0.8, 0.8], h: [0.6, 0.6] });
    inside(ctx, body, () => fill(ctx, ell(ctx, 14, 16 + hop, 4.6, 2.6), '#f9e6cf'));
    // Asa (abre no quadro 0).
    const wing = f === 0
      ? poly(ctx, [[10, 12 + hop], [15, 11 + hop], [11, 4 + hop], [6, 6.6 + hop]], true)
      : poly(ctx, [[8.4, 12 + hop + flap * 0.4], [15, 11.4 + hop], [13.6, 15 + hop], [8, 15 + hop]], true);
    cel(ctx, wing, '#2a2f4e', { d: [0.7, 0.7], h: [0.5, 0.5] });
    inside(ctx, wing, () => { stroke(ctx, [[9, 13.6 + hop], [14, 13.4 + hop]], 1.2, '#f9e6cf'); px(ctx, 10, 12.4 + hop, '#0098dc', 3, 1); });
    // Cabeça e bico com moeda.
    const hx = 17.6;
    const hy = 8.6 + hop;
    cel(ctx, ell(ctx, hx, hy, 3.2, 3), dark, { d: [0.6, 0.6], h: [0.4, 0.4] });
    fill(ctx, poly(ctx, [[hx + 2.4, hy - 0.6], [hx + 6, hy + 0.6], [hx + 2.4, hy + 1.4]]), '#3d3d3d');
    px(ctx, hx + 4.4, hy + 1, '#ffc825', 2, 2);
    px(ctx, hx + 4.4, hy + 1, '#ffeb57', 1, 1);
    eye(ctx, hx + 0.6, hy - 1, { color: '#000000' });
  }
};

const dragonling = {
  kind: 'pet', w: 32, h: 28, frames: 4, feet: 26, shadow: [15, 25.5, 9, 1.8],
  paint(ctx, f) {
    const b = BOB[f];
    const red = '#c64524';
    const flap = FLAP[f];
    // Asa de trás.
    const wingB = poly(ctx, [[12, 11 + b], [7, 3 + b - flap * 1.5], [3.4, 6 + b - flap], [5.4, 9 + b], [8, 12 + b]], true);
    cel(ctx, wingB, '#8e251d', { d: [0.6, 0.6], h: [0.4, 0.4] });
    const front = quadLegs(ctx, f, { hipX: 10, shX: 18, y: 17 + b, len: 7 - b, w: 2.6, near: red, far: '#8e251d', hoof: '#ffc825', step: 1.8 });
    // Rabo com ponta de seta.
    stroke(ctx, [[8, 17 + b], [4, 18.6 + b], [2.4, 16 + b + SWING[f]]], 2.2, red);
    fill(ctx, poly(ctx, [[0.4, 15 + b + SWING[f]], [3.4, 13.6 + b + SWING[f]], [3.4, 17.4 + b + SWING[f]]]), '#ffc825');
    const body = ell(ctx, 13.6, 15 + b, 6.6, 4.6, -0.1);
    cel(ctx, body, red, { d: [1, 1], h: [0.7, 0.7] });
    inside(ctx, body, () => {
      fill(ctx, ell(ctx, 15, 18.2 + b, 5, 2.2), '#ffc825');
      for (let x = 12; x < 19; x += 2) px(ctx, x, 17.4 + b, '#edab50', 1, 1);
    });
    // Espinhos nas costas.
    for (const x of [9, 12, 15]) fill(ctx, poly(ctx, [[x - 1.2, 11 + b], [x, 8.6 + b], [x + 1.2, 11 + b]]), '#ffc825');
    front();
    // Asa da frente.
    const wingF = poly(ctx, [[13, 12 + b], [11, 2 + b - flap * 1.8], [15.4, 4.6 + b - flap * 1.2], [17, 7 + b], [16, 12 + b]], true);
    cel(ctx, wingF, '#ea323c', { d: [0.7, 0.7], h: [0.5, 0.5] });
    inside(ctx, wingF, () => stroke(ctx, [[14, 11 + b], [11.6, 3 + b - flap * 1.8]], 0.7, '#8e251d'));
    // Cabeça com chifrinhos e focinho.
    const hx = 22.4;
    const hy = 10 + b;
    fill(ctx, poly(ctx, [[hx - 2.6, hy - 2.6], [hx - 4.6, hy - 6.4], [hx - 1, hy - 3.4]], true), '#f6ca9f');
    fill(ctx, poly(ctx, [[hx - 0.4, hy - 3.2], [hx, hy - 6.8], [hx + 1.6, hy - 3]], true), '#f6ca9f');
    cel(ctx, ell(ctx, hx, hy, 4.2, 3.8), red, { d: [0.8, 0.8], h: [0.6, 0.6] });
    cel(ctx, ell(ctx, hx + 4, hy + 1.4, 3, 2.2), red, { d: [0.5, 0.6], h: [0.4, 0.4] });
    px(ctx, hx + 6, hy + 0.6, '#5d2c28', 1, 1);
    eye(ctx, hx + 0.6, hy - 1.6, { big: true });
    if (f === 2) { px(ctx, hx + 7, hy + 1, '#ffa214', 2, 1); px(ctx, hx + 8.6, hy + 0.4, '#ffeb57', 1, 1); }
  }
};

const phoenix = {
  kind: 'pet', w: 30, h: 30, frames: 4, feet: 28, shadow: [15, 27.5, 5, 1.2],
  paint(ctx, f) {
    const flap = FLAP[f];
    // Cauda de chamas em 3 penas longas.
    for (const [dy, len, c] of [[-1.6, 11, '#ffa214'], [0.6, 13, '#e07438'], [2.6, 10, '#ffc825']]) {
      const p = poly(ctx, [[10, 15 + dy * 0.4], [10 - len * 0.6, 16 + dy + 2], [10 - len, 18 + dy * 1.6 + flap * 0.6], [10 - len * 0.55, 18.6 + dy], [11, 17.4]], true);
      cel(ctx, p, c, { d: [0.6, 0.6], h: [0.4, 0.4] });
    }
    px(ctx, 0, 20 + flap * 0.6, '#ffeb57', 1, 1);
    // Asa de trás.
    const wingB = poly(ctx, [[14, 12], [9, 4 - flap * 2], [6, 6 - flap * 1.5], [9, 11], [12, 14]], true);
    cel(ctx, wingB, '#c64524', { d: [0.6, 0.6], h: [0.4, 0.4] });
    const body = ell(ctx, 15, 14.4, 5, 4.2, -0.3);
    cel(ctx, body, '#e07438', { d: [0.9, 0.9], h: [0.6, 0.6] });
    inside(ctx, body, () => fill(ctx, ell(ctx, 16.6, 16.8, 3.4, 2.2), '#ffc825'));
    // Asa da frente (penas em degraus amarelo → laranja).
    const wingF = poly(ctx, [[14, 13], [12.4, 3 - flap * 2.4], [16, 2.6 - flap * 2.4], [19, 7 - flap], [18, 12.6]], true);
    cel(ctx, wingF, '#ffa214', { d: [0.8, 0.8], h: [0.5, 0.5] });
    inside(ctx, wingF, () => {
      stroke(ctx, [[14.6, 11], [13.6, 4 - flap * 2.4]], 0.8, '#c64524');
      stroke(ctx, [[16.6, 11], [17, 4.6 - flap * 2]], 0.8, '#e07438');
      px(ctx, 14, 3.4 - flap * 2.4, '#ffeb57', 2, 1);
    });
    // Cabeça com crista.
    const hx = 20.6;
    const hy = 9.4;
    for (const [dx, dy] of [[-2.6, -5.4], [-0.8, -6.6], [1, -5.6]]) stroke(ctx, [[hx - 0.6, hy - 2], [hx + dx, hy + dy]], 1.1, '#ffc825');
    cel(ctx, ell(ctx, hx, hy, 3.2, 3), '#ea323c', { d: [0.6, 0.6], h: [0.4, 0.4] });
    fill(ctx, poly(ctx, [[hx + 2.6, hy - 0.4], [hx + 5.4, hy + 0.8], [hx + 2.6, hy + 1.6]]), '#edab50');
    eye(ctx, hx + 0.6, hy - 1, { color: INK });
    // Pés e faísca.
    stroke(ctx, [[14.4, 18.4], [14, 22]], 0.9, '#edab50');
    stroke(ctx, [[16.4, 18.4], [16.8, 21.6]], 0.9, '#edab50');
    if (f % 2 === 1) { px(ctx, 24, 4, '#ffeb57', 1, 1); px(ctx, 6, 24, '#ffa214', 1, 1); }
  }
};

export const CREATURES = { chicken, sheep, pig, cow, wolfpup, fairy, magpie, dragonling, phoenix };
