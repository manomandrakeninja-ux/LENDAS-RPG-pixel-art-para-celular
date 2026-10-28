// Pintor de pessoas (NPCs) no padrão das skins da Espadachim/Guerreira: quadro 56 x 64, pés na linha 62,
// cabeça grande (~3,5 cabeças de altura), rosto com olhos, sobrancelhas e boca alinhados à grade,
// cabelo em mechas, roupa com dobras e material próprio, e a profissão nos acessórios.
//
// paintPerson(ctx, spec, { dir, phase, breath, blink })
//   dir: 'down' | 'right' | 'up'  ('left' = 'right' espelhado pelo bake)
//   phase: 0..3 (andar) ou null (parado); breath: 0/1 (peito e cabeça descem 1 px); blink: olhos fechados.
import { R, cel, ell, fill, inside, limb, poly, px, stroke } from './kit.mjs';

const CX = 28;
const FOOT = 62;

export const BUILDS = {
  normal: { headY: 13.5, rx: 8.1, ry: 8.4, sY: 25.5, shW: 10, wY: 37, waW: 7.6, hipY: 42.5, hipW: 8.2, hem: 47, legSep: 3.7, legW: 5.2, handY: 40.5, armW: 4.6 },
  stout: { headY: 14, rx: 8.3, ry: 8.4, sY: 26, shW: 11.6, wY: 37.5, waW: 10, hipY: 43, hipW: 10, hem: 47.5, legSep: 4.3, legW: 5.8, handY: 41, armW: 5.4 },
  slim: { headY: 13.5, rx: 7.9, ry: 8.3, sY: 25.5, shW: 8.8, wY: 36.5, waW: 6.4, hipY: 42, hipW: 8, hem: 47, legSep: 3.3, legW: 4.6, handY: 40, armW: 4 },
  tall: { headY: 11.5, rx: 7.9, ry: 8.3, sY: 23.5, shW: 10, wY: 35.5, waW: 7.6, hipY: 41.5, hipW: 8.4, hem: 46.5, legSep: 3.7, legW: 5.2, handY: 39, armW: 4.6 },
  dwarf: { headY: 21.5, rx: 8.6, ry: 8.3, sY: 33, shW: 12.2, wY: 42.5, waW: 11, hipY: 47.5, hipW: 11, hem: 51.5, legSep: 4.8, legW: 6, handY: 46.5, armW: 5.8 },
  child: { headY: 29.5, rx: 7.6, ry: 7.8, sY: 39.5, shW: 7.4, wY: 47, waW: 6.2, hipY: 50.5, hipW: 6.6, hem: 54, legSep: 2.9, legW: 4.2, handY: 50, armW: 3.6 }
};

const INK = '#1c121c';
const WHITE = '#f9e6cf';

// ---------------------------------------------------------------- rig

function rig(spec, dir, phase, breath) {
  const B = { ...BUILDS[spec.build ?? 'normal'] };
  const walking = phase !== null && phase !== undefined;
  const p = walking ? phase : 1;
  const s = [1, 0, -1, 0][p];
  const bob = walking ? [0, -1, 0, -1][p] : 0;
  const b = breath ? 1 : 0;
  const up = (v) => v + bob;
  return {
    B, dir, walking, p, s,
    head: { x: CX + (dir === 'right' ? 0.5 : 0), y: up(B.headY) + b },
    sY: up(B.sY) + b,
    wY: up(B.wY),
    hipY: up(B.hipY),
    hem: up(B.hem),
    handY: up(B.handY) + b * 0.5,
    bob
  };
}

// ---------------------------------------------------------------- pernas e pés

function boot(ctx, x, y, color, w, dir, toe = 1) {
  if (dir === 'right') {
    const p = poly(ctx, [[x - w / 2, y - 5], [x + w / 2 - 0.5, y - 5], [x + w / 2 + 0.2, y - 2], [x + w / 2 + 2.2 * toe, y - 1.4], [x + w / 2 + 2.4 * toe, y], [x - w / 2 - 0.3, y]], true);
    cel(ctx, p, color, { d: [0.6, 1.1], h: [0.6, 0.6] });
    px(ctx, x - w / 2, y - 1, R(color)[0], w + 2 * toe, 1);
  } else {
    const p = poly(ctx, [[x - w / 2, y - 5.5], [x + w / 2, y - 5.5], [x + w / 2 + 0.5, y - 1], [x + w / 2, y], [x - w / 2, y], [x - w / 2 - 0.5, y - 1]], true);
    cel(ctx, p, color, { d: [0.9, 1], h: [0.7, 0.7] });
    px(ctx, x - w / 2, y - 1, R(color)[0], w + 0.5, 1);
  }
  // Dobra do cano da bota.
  px(ctx, x - w / 2 + 0.5, y - 5, R(color)[3], Math.max(1, w - 1.5), 1);
}

function legs(ctx, spec, r, far = false) {
  const { B, dir, walking, p, s } = r;
  const pants = spec.pants ?? '#5d2c28';
  const boots = spec.boots ?? '#391f21';
  const longSkirt = spec.body?.kind === 'dress' || spec.body?.kind === 'robe';
  const top = r.hipY - 3;
  if (dir === 'right') {
    // Passada de perfil: perna de trás (escura) e da frente.
    const lift = walking ? { 1: 'far', 3: 'near' }[p] : null;
    const legsArr = [
      { side: 'far', fx: CX - s * 4.6 - 0.5 },
      { side: 'near', fx: CX + s * 4.6 + 0.5 }
    ];
    for (const leg of legsArr) {
      if ((leg.side === 'far') !== far) continue;
      const fy = FOOT - (lift === leg.side ? 2 : 0);
      const hipX = CX + (leg.side === 'near' ? 0.6 : -0.6);
      const knee = [(hipX + leg.fx) / 2 + 0.8, (top + fy) / 2 + 0.5];
      const tone = leg.side === 'far' ? R(pants)[1] : pants;
      if (!longSkirt) {
        fill(ctx, limb(ctx, [hipX, top], knee, B.legW + 0.6, B.legW), tone);
        fill(ctx, limb(ctx, knee, [leg.fx, fy - 4], B.legW, B.legW - 0.6), tone);
        if (leg.side === 'near') cel(ctx, limb(ctx, [hipX, top], knee, B.legW + 0.6, B.legW), pants, { d: [0.9, 0.4] });
      }
      boot(ctx, leg.fx, fy, leg.side === 'far' ? R(boots)[1] : boots, B.legW + 0.6, 'right');
    }
    return;
  }
  if (far) return;
  // Frente/costas: pé levantado alterna.
  const liftL = walking && p === 0 ? 2 : 0;
  const liftR = walking && p === 2 ? 2 : 0;
  for (const [side, lift] of [[-1, liftL], [1, liftR]]) {
    const x = CX + side * B.legSep;
    const fy = FOOT - lift;
    if (!longSkirt) {
      const path = limb(ctx, [x + side * 0.3, top], [x, fy - 4], B.legW + 0.4, B.legW - 0.4);
      cel(ctx, path, pants, { d: [1, 0.4], h: [0.7, 0.2] });
      // Vinco da calça no joelho.
      px(ctx, x - 0.5 + (side > 0 ? 0 : 0), (top + fy) / 2 + 1, R(pants)[1], 1, 1);
    }
    boot(ctx, x, fy, boots, B.legW + 0.8, dir);
  }
}

// ---------------------------------------------------------------- braços

function armPoints(r, side, dir) {
  const { B, s, walking } = r;
  if (dir === 'right') {
    const near = side > 0;
    const swing = r.holding && near ? 5.2 : (near ? -s : s) * 4.2;
    const shoulder = [CX + (near ? 0.6 : 1.4), r.sY + 2.4];
    const hand = [CX + swing + (near ? 0.8 : 1.6), r.handY - Math.abs(swing) * 0.25];
    const elbow = [(shoulder[0] + hand[0]) / 2 - 0.6, (shoulder[1] + hand[1]) / 2];
    return { shoulder, elbow, hand };
  }
  const k = dir === 'up' ? -side : side;
  const fwd = walking ? (k > 0 ? -s : s) : 0;
  const shoulder = [CX + side * (B.shW - 1.2), r.sY + 2.6];
  const hand = [CX + side * (B.shW + 0.6), r.handY + fwd * -0.8];
  const elbow = [CX + side * (B.shW + 0.7), (shoulder[1] + hand[1]) / 2];
  return { shoulder, elbow, hand };
}

function arm(ctx, spec, r, side, { dark = false, prop = null } = {}) {
  const { B, dir } = r;
  const { shoulder, elbow, hand } = armPoints(r, side, dir);
  const sleeve = spec.sleeveColor ?? spec.shirt ?? '#8a4836';
  const tone = dark ? R(sleeve)[1] : sleeve;
  const skin = dark ? R(spec.skin)[1] : spec.skin;
  const w = B.armW;
  const kind = spec.sleeves ?? 'long';
  const upper = limb(ctx, shoulder, elbow, w + 0.4, w - 0.1);
  const fore = limb(ctx, elbow, [hand[0], hand[1] - 1.2], w - 0.1, w - 0.6);
  if (kind === 'long') {
    cel(ctx, upper, tone, { d: [side > 0 ? 1.1 : 0.7, 0.5], h: [0.6, 0.4] });
    cel(ctx, fore, tone, { d: [side > 0 ? 1.1 : 0.7, 0.5], h: [0.6, 0.4] });
    // Punho da manga.
    fill(ctx, limb(ctx, [hand[0], hand[1] - 2.4], [hand[0], hand[1] - 1.6], w - 0.2, w - 0.2), R(tone)[1]);
  } else {
    cel(ctx, upper, tone, { d: [side > 0 ? 1.1 : 0.7, 0.5], h: [0.6, 0.4] });
    if (kind === 'rolled') fill(ctx, limb(ctx, [elbow[0], elbow[1] - 0.4], [elbow[0], elbow[1] + 0.8], w + 0.6, w + 0.6), R(tone)[3]);
    cel(ctx, fore, skin, { d: [side > 0 ? 1 : 0.6, 0.4], h: [0.5, 0.3] });
  }
  if (spec.gloves) {
    cel(ctx, ell(ctx, hand[0], hand[1] - 0.2, 2.1, 2.1), dark ? R(spec.gloves)[1] : spec.gloves, { d: [0.7, 0.7], h: [0.5, 0.5] });
  } else {
    cel(ctx, ell(ctx, hand[0], hand[1] - 0.2, 1.9, 1.9), skin, { d: [0.6, 0.7], h: [0.5, 0.5] });
  }
  if (spec.bracer && !dark) fill(ctx, limb(ctx, [hand[0], hand[1] - 4.2], [hand[0], hand[1] - 2.2], w + 0.2, w + 0.2), spec.bracer);
  if (prop) prop(ctx, { x: hand[0], y: hand[1] }, r);
}

// ---------------------------------------------------------------- tronco e roupas

function torsoPath(ctx, r, spec, { skirtTo = null } = {}) {
  const { B, dir } = r;
  const kind = spec.body?.kind ?? 'tunic';
  const long = kind === 'dress' || kind === 'robe';
  const hemY = skirtTo ?? (long ? FOOT - 1.5 : r.hem + (spec.body?.hem ?? 0));
  const flare = long ? (kind === 'dress' ? 4.2 : 2.6) : 1.1;
  if (dir === 'right') {
    const back = CX - B.shW * 0.58;
    const front = CX + B.shW * 0.55;
    const sway = r.walking ? -r.s * 0.8 : 0;
    return poly(ctx, [
      [CX - 1.5, r.sY - 1.2], [CX + 2.2, r.sY - 1.2], [front + 0.4, r.sY + 3.5], [front + 0.6, r.sY + 7],
      [front - 0.4, r.wY], [front + 0.4, r.hipY], [front + flare * 0.7 + sway, hemY], [back - flare * 0.7 + sway - 0.8, hemY],
      [back - 0.4, r.hipY], [back + 0.4, r.wY], [back - 0.6, r.sY + 6], [back, r.sY + 1.8]
    ], true);
  }
  const hemW = B.hipW + flare;
  return poly(ctx, [
    [CX - 2.6, r.sY - 1.4], [CX + 2.6, r.sY - 1.4], [CX + B.shW - 1.2, r.sY - 0.4], [CX + B.shW, r.sY + 2.6],
    [CX + B.shW - 0.9, r.sY + 6.5], [CX + B.waW, r.wY], [CX + B.hipW, r.hipY], [CX + hemW, hemY],
    [CX - hemW, hemY], [CX - B.hipW, r.hipY], [CX - B.waW, r.wY], [CX - B.shW + 0.9, r.sY + 6.5],
    [CX - B.shW, r.sY + 2.6], [CX - B.shW + 1.2, r.sY - 0.4]
  ], true);
}

function hemOf(r, spec) {
  const kind = spec.body?.kind ?? 'tunic';
  return kind === 'dress' || kind === 'robe' ? FOOT - 1.5 : r.hem + (spec.body?.hem ?? 0);
}

function torso(ctx, spec, r) {
  const { B, dir } = r;
  const color = spec.body?.color ?? spec.shirt ?? '#8a4836';
  const path = torsoPath(ctx, r, spec);
  cel(ctx, path, color, { d: dir === 'right' ? [1.4, 0.6] : [1.6, 0.8], h: [0.9, 0.6] });
  const [dp, sh, , li] = R(color);
  const hemY = hemOf(r, spec);
  // Camisa diferente da saia/calção: parte de cima.
  if (spec.shirt && spec.body?.color && spec.shirt !== spec.body.color && !spec.body.full) {
    inside(ctx, path, () => {
      const top = poly(ctx, [[0, 0], [56, 0], [56, r.wY], [0, r.wY]]);
      cel(ctx, inside2(ctx, path, top), spec.shirt, { d: [1.4, 0.8], h: [0.8, 0.6] });
    });
  }
  // Dobras do pano: da cintura até a barra (e um vinco no peito).
  inside(ctx, path, () => {
    const long = hemY - r.wY > 14;
    const folds = dir === 'right' ? [-2] : long ? [-B.hipW * 0.5, 0.6, B.hipW * 0.55] : [-B.hipW * 0.45, B.hipW * 0.5];
    folds.forEach((fx, i) => {
      const x0 = CX + fx * 0.6;
      const x1 = CX + fx * 1.1 + (i % 2 ? 0.6 : -0.6);
      const y0 = r.wY + (long ? 5 + i * 1.5 : 3);
      stroke(ctx, [[x0, y0], [x0 + (x1 - x0) * 0.4, (y0 + hemY) / 2], [x1, hemY - 0.3]], 0.95, sh);
      if (i === 0) stroke(ctx, [[x0 - 1.2, y0 + 1.5], [x1 - 1.4, hemY - 2]], 0.8, li);
    });
    // Barra: faixa escura e borda ondulada.
    ctx.fillStyle = dp;
    ctx.fillRect(0, hemY - 1, 56, 2);
    // Vinco do peito / axila.
    if (dir !== 'right') {
      stroke(ctx, [[CX - B.shW + 2.3, r.sY + 4], [CX - B.waW + 1.2, r.wY - 1]], 0.8, sh);
      stroke(ctx, [[CX + B.shW - 2.3, r.sY + 4], [CX + B.waW - 1.2, r.wY - 1]], 0.8, sh);
    }
  });
  return path;
}

/** Interseção simples: recorta `b` por `a` usando o clip já ativo (devolve b). */
function inside2(ctx, a, b) {
  return b;
}

// ---------------------------------------------------------------- camadas

const LAYERS = {
  belt(ctx, spec, r, L, path) {
    const color = L.color ?? '#391f21';
    inside(ctx, path, () => {
      ctx.fillStyle = R(color)[2]; ctx.fillRect(0, Math.round(r.wY) - 1, 56, 2);
      ctx.fillStyle = R(color)[0]; ctx.fillRect(0, Math.round(r.wY) + 1, 56, 1);
      ctx.fillStyle = R(color)[3]; ctx.fillRect(0, Math.round(r.wY) - 1, 56, 0.6);
    });
    if (r.dir === 'down') {
      px(ctx, CX - 1, Math.round(r.wY) - 1, L.buckle ?? '#edab50', 2, 2);
      px(ctx, CX - 1, Math.round(r.wY) - 1, R(L.buckle ?? '#edab50')[3], 1, 1);
    }
    if (L.pouch && r.dir !== 'up') {
      const x = r.dir === 'right' ? CX - 3 : CX + r.B.waW - 2;
      cel(ctx, poly(ctx, [[x - 1.8, r.wY + 0.5], [x + 1.8, r.wY + 0.5], [x + 2, r.wY + 4], [x - 2, r.wY + 4]], true), L.pouch, { d: [0.7, 0.8], h: [0.5, 0.5] });
      px(ctx, x - 1, r.wY + 0.6, R(L.pouch)[0], 2, 1);
    }
  },
  apron(ctx, spec, r, L) {
    const color = L.color ?? '#5d2c28';
    const { B } = r;
    const bottom = L.long ? FOOT - 4 : r.hem + 4;
    if (r.dir === 'up') {
      // Costas: tiras cruzadas e o laço.
      stroke(ctx, [[CX - B.shW + 2.5, r.sY + 0.5], [CX + B.waW - 1, r.wY]], 1, R(color)[1]);
      stroke(ctx, [[CX + B.shW - 2.5, r.sY + 0.5], [CX - B.waW + 1, r.wY]], 1, R(color)[1]);
      cel(ctx, ell(ctx, CX, r.wY, 2, 1.3), color, { d: [0.5, 0.5], h: [0.4, 0.4] });
      return;
    }
    if (r.dir === 'right') {
      const p = poly(ctx, [[CX + 2, r.sY + 3], [CX + 4.6, r.sY + 3], [CX + 4.9, r.wY], [CX + 5.6, bottom], [CX + 2.5, bottom], [CX + 1.6, r.wY]], true);
      cel(ctx, p, color, { d: [0.8, 0.8], h: [0.6, 0.5] });
      stroke(ctx, [[CX + 2.5, r.sY + 3], [CX - 1, r.sY - 0.5]], 0.9, R(color)[1]);
      stroke(ctx, [[CX + 1.8, r.wY], [CX - 4, r.wY]], 0.9, R(color)[1]);
      return;
    }
    const bibW = L.bib === false ? 0 : 3.6;
    const pts = bibW
      ? [[CX - bibW, r.sY + 3.5], [CX + bibW, r.sY + 3.5], [CX + bibW + 0.5, r.wY], [CX + B.hipW - 0.5, r.wY + 2], [CX + B.hipW + 0.2, bottom], [CX - B.hipW - 0.2, bottom], [CX - B.hipW + 0.5, r.wY + 2], [CX - bibW - 0.5, r.wY]]
      : [[CX - B.waW + 0.3, r.wY], [CX + B.waW - 0.3, r.wY], [CX + B.hipW + 0.2, bottom], [CX - B.hipW - 0.2, bottom]];
    const p = poly(ctx, pts, true);
    cel(ctx, p, color, { d: [1.1, 1], h: [0.7, 0.6] });
    inside(ctx, p, () => {
      // Costura e bolso.
      stroke(ctx, [[CX - B.hipW + 1.2, r.wY + 2.5], [CX - B.hipW + 1.4, bottom - 1]], 0.7, R(color)[1]);
      if (L.pocket !== false) {
        px(ctx, CX - 2, r.wY + 3, R(color)[1], 4, 1);
        px(ctx, CX - 2, r.wY + 6, R(color)[1], 4, 1);
        px(ctx, CX - 2, r.wY + 3, R(color)[1], 1, 3);
        px(ctx, CX + 1, r.wY + 3, R(color)[1], 1, 3);
      }
      if (L.stain) {
        px(ctx, CX + 2, r.wY + 8, R(color)[0], 2, 1);
        px(ctx, CX - 3, r.sY + 6, R(color)[0], 1, 1);
      }
      ctx.fillStyle = R(color)[0]; ctx.fillRect(0, bottom - 1, 56, 1);
    });
    if (bibW) {
      stroke(ctx, [[CX - bibW + 0.4, r.sY + 3.8], [CX - 2.5, r.sY - 0.8]], 0.9, R(color)[1]);
      stroke(ctx, [[CX + bibW - 0.4, r.sY + 3.8], [CX + 2.5, r.sY - 0.8]], 0.9, R(color)[1]);
    }
  },
  vest(ctx, spec, r, L) {
    const color = L.color;
    const { B } = r;
    if (r.dir === 'up') {
      const p = poly(ctx, [[CX - B.shW + 1, r.sY], [CX + B.shW - 1, r.sY], [CX + B.waW + 0.4, r.wY + 2], [CX - B.waW - 0.4, r.wY + 2]], true);
      cel(ctx, p, color, { d: [1.2, 0.8], h: [0.7, 0.6] });
      return;
    }
    if (r.dir === 'right') {
      const p = poly(ctx, [[CX - 4.6, r.sY + 0.5], [CX + 1.5, r.sY], [CX + 4, r.sY + 6], [CX + 3.8, r.wY + 2], [CX - 4.6, r.wY + 2]], true);
      cel(ctx, p, color, { d: [1, 0.8], h: [0.7, 0.6] });
      return;
    }
    for (const side of [-1, 1]) {
      const p = poly(ctx, [[CX + side * 2.2, r.sY - 0.6], [CX + side * (B.shW - 1), r.sY], [CX + side * (B.shW - 0.6), r.sY + 5],
        [CX + side * (B.waW + 0.4), r.wY + 2.4], [CX + side * 1.6, r.wY + 2.4], [CX + side * 1.4, r.sY + 5]], true);
      cel(ctx, p, color, { d: [1, 0.8], h: [0.7, 0.6] });
    }
    if (L.buttons) for (let y = r.sY + 4; y < r.wY; y += 3) px(ctx, CX + 1, y, L.buttons, 1, 1);
  },
  plate(ctx, spec, r, L) {
    const color = L.color ?? '#92a1b9';
    const { B } = r;
    let p;
    if (r.dir === 'right') p = poly(ctx, [[CX - 3.6, r.sY + 0.5], [CX + 2, r.sY + 0.2], [CX + 4.6, r.sY + 4], [CX + 4.2, r.wY], [CX - 3.8, r.wY]], true);
    else p = poly(ctx, [[CX - B.shW + 1.6, r.sY + 0.3], [CX + B.shW - 1.6, r.sY + 0.3], [CX + B.waW + 0.6, r.wY - 3], [CX + B.waW, r.wY + 0.5], [CX - B.waW, r.wY + 0.5], [CX - B.waW - 0.6, r.wY - 3]], true);
    cel(ctx, p, color, { d: [1.4, 1.2], h: [1, 0.8] });
    if (r.dir === 'down') {
      inside(ctx, p, () => {
        stroke(ctx, [[CX, r.sY + 1.5], [CX, r.wY]], 0.8, R(color)[3]);
        px(ctx, CX - 4, r.sY + 3, R(color)[4], 1, 2);
        stroke(ctx, [[CX - B.waW + 1, r.wY - 2], [CX + B.waW - 1, r.wY - 2]], 0.8, R(color)[1]);
      });
      if (L.emblem) { px(ctx, CX - 1, r.sY + 5, L.emblem, 2, 2); px(ctx, CX - 1, r.sY + 5, R(L.emblem)[3], 1, 1); }
    }
  },
  mail(ctx, spec, r, L, path) {
    // Cota de malha: pontinhos escuros em grade.
    inside(ctx, path, () => {
      const dark = R(L.color ?? '#657392')[1];
      for (let y = Math.ceil(r.sY + 1); y < r.hem - 1; y += 2) {
        for (let x = 14 + (y % 4 === 0 ? 1 : 0); x < 42; x += 2) px(ctx, x, y, dark, 1, 1);
      }
    });
  },
  tabard(ctx, spec, r, L) {
    const color = L.color;
    const { B } = r;
    if (r.dir === 'right') {
      const p = poly(ctx, [[CX + 1, r.sY], [CX + 4.2, r.sY + 2], [CX + 4.6, r.hem + 2], [CX + 1.4, r.hem + 2]], true);
      cel(ctx, p, color, { d: [0.8, 0.8], h: [0.6, 0.6] });
      return;
    }
    const w = B.waW - 1.6;
    const p = poly(ctx, [[CX - w, r.sY - 0.5], [CX + w, r.sY - 0.5], [CX + w + 0.4, r.hem + 2], [CX, r.hem + 3.2], [CX - w - 0.4, r.hem + 2]], true);
    cel(ctx, p, color, { d: [1.1, 1], h: [0.7, 0.6] });
    if (r.dir === 'down' && L.emblem) {
      px(ctx, CX - 1, r.sY + 4, L.emblem, 2, 3);
      px(ctx, CX - 2, r.sY + 5, L.emblem, 4, 1);
    }
    inside(ctx, p, () => stroke(ctx, [[CX - w + 1, r.sY + 1], [CX - w + 1, r.hem + 1]], 0.8, R(color)[3]));
  },
  fur(ctx, spec, r, L) {
    // Manto de pele nos ombros: gola redonda, tufos na borda de baixo e pelo em mechas.
    const color = L.color ?? '#cba36f';
    const { B } = r;
    const side = r.dir === 'right';
    const w = side ? B.shW * 0.75 : B.shW + 1.4;
    const cx = side ? CX - 0.8 : CX;
    const top = r.sY - 2;
    const bottom = r.sY + 5;
    const pts = [[cx - w * 0.45, top], [cx + w * 0.45, top], [cx + w, top + 2.4]];
    const n = 8;
    for (let i = 0; i <= n; i += 1) {
      const t = i / n;
      const x = cx + w - 2 * w * t;
      const sag = Math.sin(t * Math.PI) * 1.6;
      pts.push([x, bottom + sag + (i % 2 ? 1.1 : -0.6)]);
    }
    pts.push([cx - w, top + 2.4]);
    const p = poly(ctx, pts, true);
    cel(ctx, p, color, { d: [1, 1.2], h: [0.7, 0.8] });
    const [dp, sh, , li] = R(color);
    inside(ctx, p, () => {
      for (let i = 0; i < 7; i += 1) {
        const x = cx - w + 1.5 + i * (2 * w - 3) / 6;
        stroke(ctx, [[x, top + 2.4], [x + 0.5, bottom + 0.6]], 0.8, sh);
        px(ctx, x - 1, top + 1.6, li, 1, 1);
      }
      ctx.fillStyle = dp; ctx.fillRect(0, bottom + 1.6, 56, 2);
    });
    // Gola: a cabeça do bicho/fecho no peito.
    if (r.dir === 'down') { px(ctx, CX - 1, r.sY + 2, '#cba36f', 2, 2); px(ctx, CX - 1, r.sY + 2, '#f6ca9f', 1, 1); }
  },
  scarf(ctx, spec, r, L) {
    const color = L.color;
    const cx = r.dir === 'right' ? CX + 0.5 : CX;
    const p = ell(ctx, cx, r.sY - 0.2, r.dir === 'right' ? 4 : 4.8, 2.1);
    cel(ctx, p, color, { d: [0.8, 0.9], h: [0.6, 0.5] });
    if (r.dir === 'down') {
      const t = poly(ctx, [[CX + 1, r.sY + 0.8], [CX + 3.6, r.sY + 0.8], [CX + 3.2, r.sY + 6.5], [CX + 1.4, r.sY + 6]], true);
      cel(ctx, t, color, { d: [0.7, 0.8], h: [0.5, 0.5] });
      px(ctx, CX + 1, r.sY + 6, R(color)[0], 2, 1);
    } else if (r.dir === 'right' && r.walking) {
      stroke(ctx, [[CX - 3, r.sY], [CX - 6, r.sY + 1.5 + r.s]], 1.6, R(color)[1]);
    }
  },
  shawl(ctx, spec, r, L) {
    const color = L.color;
    const { B } = r;
    if (r.dir === 'right') {
      const p = poly(ctx, [[CX - 4.8, r.sY - 1], [CX + 2.6, r.sY - 1], [CX + 4.8, r.sY + 5], [CX - 5.4, r.sY + 7]], true);
      cel(ctx, p, color, { d: [1, 1], h: [0.7, 0.6] });
      return;
    }
    const p = poly(ctx, [[CX - B.shW - 0.6, r.sY + 0.5], [CX - 2.5, r.sY - 1.5], [CX + 2.5, r.sY - 1.5], [CX + B.shW + 0.6, r.sY + 0.5], [CX + B.shW, r.sY + 5.5], [CX, r.sY + (r.dir === 'up' ? 9 : 7.5)], [CX - B.shW, r.sY + 5.5]], true);
    cel(ctx, p, color, { d: [1.1, 1], h: [0.7, 0.6] });
    inside(ctx, p, () => {
      for (let x = CX - B.shW; x < CX + B.shW; x += 2.5) stroke(ctx, [[x, r.sY + 1], [x + (CX - x) * 0.2, r.sY + 6]], 0.7, R(color)[1]);
    });
    if (r.dir === 'down' && L.pin) px(ctx, CX - 1, r.sY + 0.5, L.pin, 2, 2);
  },
  sash(ctx, spec, r, L) {
    // Faixa/correia diagonal do ombro ao quadril (bolsa, aljava ou insígnia).
    const color = L.color;
    const { B } = r;
    if (r.dir === 'right') {
      stroke(ctx, [[CX - 1, r.sY - 0.5], [CX + 3.5, r.wY + 1]], 1.6, color);
      return;
    }
    const a = r.dir === 'down' ? [CX - B.shW + 2.4, r.sY + 0.2] : [CX + B.shW - 2.4, r.sY + 0.2];
    const b = r.dir === 'down' ? [CX + B.waW, r.wY + 2] : [CX - B.waW, r.wY + 2];
    stroke(ctx, [a, b], 1.8, R(color)[2]);
    stroke(ctx, [[a[0], a[1] - 0.6], [b[0], b[1] - 0.6]], 0.6, R(color)[3]);
    if (L.studs && r.dir === 'down') for (let t = 0.2; t < 1; t += 0.3) px(ctx, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.5, L.studs, 1, 1);
  },
  satchel(ctx, spec, r, L) {
    const color = L.color ?? '#8a4836';
    const { B } = r;
    if (r.dir === 'up') return;
    const x = r.dir === 'right' ? CX - 4 : CX - B.hipW - 0.6;
    const y = r.wY + 1;
    const p = poly(ctx, [[x - 2.6, y], [x + 2.6, y], [x + 2.9, y + 5], [x - 2.9, y + 5]], true);
    cel(ctx, p, color, { d: [0.9, 1], h: [0.6, 0.6] });
    const flap = poly(ctx, [[x - 2.6, y], [x + 2.6, y], [x + 2.4, y + 2.4], [x - 2.4, y + 2.4]], true);
    fill(ctx, flap, R(color)[1]);
    px(ctx, x - 0.5, y + 2, L.clasp ?? '#edab50', 1, 1);
    if (L.leaf) { px(ctx, x - 2, y - 1, '#5ac54f', 1, 2); px(ctx, x - 1, y - 2, '#99e65f', 1, 2); px(ctx, x + 1, y - 1, '#33984b', 1, 1); }
  },
  collar(ctx, spec, r, L) {
    if (r.dir === 'up') return;
    const color = L.color ?? WHITE;
    if (r.dir === 'right') {
      fill(ctx, poly(ctx, [[CX - 1, r.sY - 1.4], [CX + 3, r.sY - 1.4], [CX + 3.6, r.sY + 1.2], [CX, r.sY + 1]], true), color);
      return;
    }
    const p = poly(ctx, [[CX - 3.4, r.sY - 1.3], [CX, r.sY + 2.4], [CX + 3.4, r.sY - 1.3], [CX + 2.4, r.sY + 1.4], [CX, r.sY + 3], [CX - 2.4, r.sY + 1.4]]);
    cel(ctx, p, color, { d: [0.5, 0.6], h: [0.4, 0.4] });
  },
  cord(ctx, spec, r, L) {
    // Cordão com pingente (ervas, amuleto, chave).
    if (r.dir !== 'down') return;
    stroke(ctx, [[CX - 2.6, r.sY - 0.6], [CX, r.sY + 4], [CX + 2.6, r.sY - 0.6]], 0.6, L.color ?? '#cba36f');
    px(ctx, CX - 1, r.sY + 4, L.charm ?? '#c42430', 2, 2);
    px(ctx, CX - 1, r.sY + 4, R(L.charm ?? '#c42430')[3], 1, 1);
  },
  toolbelt(ctx, spec, r, L) {
    if (r.dir === 'up') return;
    const { B } = r;
    const color = L.color ?? '#8a4836';
    const xs = r.dir === 'right' ? [CX + 2.5] : [CX - B.waW + 1.5, CX + B.waW - 1.5];
    for (const x of xs) {
      cel(ctx, poly(ctx, [[x - 1.8, r.wY + 0.5], [x + 1.8, r.wY + 0.5], [x + 1.6, r.wY + 4.6], [x - 1.6, r.wY + 4.6]], true), color, { d: [0.6, 0.7], h: [0.5, 0.5] });
    }
    // Cabo de ferramenta saindo da bolsa e uma régua dobrável.
    const x = xs[xs.length - 1];
    stroke(ctx, [[x + 0.5, r.wY - 1.5], [x + 0.8, r.wY + 2]], 1, '#bf6f4a');
    px(ctx, x - 1, r.wY - 2.5, '#92a1b9', 3, 1);
    if (xs.length > 1) px(ctx, xs[0] - 1, r.wY - 1, '#cba36f', 1, 2);
  }
};

// ---------------------------------------------------------------- capa (atrás do corpo)

function cape(ctx, spec, r, front) {
  const c = spec.cape;
  if (!c) return;
  const { B, dir } = r;
  const bottom = c.short ? r.hem + 2 : FOOT - 3;
  if (dir === 'up') {
    if (front) return;
    const p = poly(ctx, [[CX - B.shW + 0.5, r.sY - 0.5], [CX + B.shW - 0.5, r.sY - 0.5], [CX + B.shW + 2.2, bottom - 1], [CX + B.shW, bottom + 0.5],
      [CX + 3, bottom - 0.5], [CX, bottom + 0.8], [CX - 3, bottom - 0.5], [CX - B.shW, bottom + 0.5], [CX - B.shW - 2.2, bottom - 1]], true);
    return { p, color: c.color };
  }
  if (front) return;
  if (dir === 'right') {
    const sway = r.walking ? (r.s === 0 ? 1 : 0) : 0;
    const p = poly(ctx, [[CX - 1.6, r.sY - 1], [CX + 1.4, r.sY - 0.4], [CX - 1, bottom - 4], [CX - 4.5, bottom], [CX - 8.5 - sway, bottom - 1], [CX - 6.4, r.sY + 6], [CX - 4.8, r.sY + 1]], true);
    cel(ctx, p, c.color, { d: [1.3, 1.3], h: [0.6, 0.6] });
    inside(ctx, p, () => stroke(ctx, [[CX - 4, r.sY + 4], [CX - 6, bottom - 1]], 0.9, R(c.color)[1]));
    return;
  }
  // De frente: a capa aparece dos lados e embaixo, atrás das pernas.
  const p = poly(ctx, [[CX - B.shW + 0.5, r.sY], [CX + B.shW - 0.5, r.sY], [CX + B.shW + 2, bottom - 1], [CX + B.shW - 0.5, bottom], [CX - B.shW + 0.5, bottom], [CX - B.shW - 2, bottom - 1]], true);
  cel(ctx, p, R(c.color)[1], { d: [1.2, 1], h: [0.5, 0.5] });
}

// ---------------------------------------------------------------- cabeça

function eyeRow(r) { return Math.round(r.head.y + 1.6); }

function face(ctx, spec, r, blink) {
  const { head, dir } = r;
  const ey = eyeRow(r);
  const skin = spec.skin;
  const [, skSh] = R(skin);
  const iris = spec.eyes ?? '#3b1443';
  const browC = R(spec.browColor ?? spec.hair?.color ?? '#391f21')[1];
  if (dir === 'up') return;
  if (dir === 'right') {
    const ex = Math.round(head.x + 3);
    if (blink) px(ctx, ex, ey + 1, INK, 2, 1);
    else {
      px(ctx, ex, ey, INK, 1, 2);
      px(ctx, ex + 1, ey, WHITE, 1, 1);
      px(ctx, ex + 1, ey + 1, iris, 1, 1);
      if (spec.lashes) px(ctx, ex + 1, ey - 1, INK, 1, 1);
    }
    const bt = { stern: [ex, ey - 2, 3], kind: [ex, ey - 3, 3], worried: [ex, ey - 3, 2], neutral: [ex, ey - 2, 3] }[spec.brows ?? 'neutral'];
    if (!spec.noBrows) px(ctx, bt[0] - 0.4, bt[1], browC, bt[2], 1);
    // Nariz e boca de perfil.
    px(ctx, Math.round(head.x + 6.8), ey + 2, skSh, 1, 1);
    const my = ey + 4;
    if (spec.mouth === 'smile' || spec.mouth === 'grin') { px(ctx, Math.round(head.x + 4.5), my, '#5d2c28', 2, 1); px(ctx, Math.round(head.x + 4), my - 1, '#5d2c28', 1, 1); }
    else if (spec.mouth === 'frown') { px(ctx, Math.round(head.x + 4.5), my, '#5d2c28', 2, 1); px(ctx, Math.round(head.x + 4), my + 1, '#5d2c28', 1, 1); }
    else px(ctx, Math.round(head.x + 5), my, '#5d2c28', 1, 1);
    if (spec.blush) px(ctx, Math.round(head.x + 2), ey + 3, '#e69c69', 2, 1);
    return;
  }
  const lx = Math.round(head.x - 4);
  const rx = Math.round(head.x + 2);
  for (const [x, outer] of [[lx, -1], [rx, 1]]) {
    if (blink) { px(ctx, x, ey + 1, INK, 2, 1); continue; }
    px(ctx, x, ey, INK, 2, 2);
    // Brilho do olho do lado da luz e íris embaixo.
    px(ctx, outer < 0 ? x : x, ey, WHITE, 1, 1);
    px(ctx, x + 1, ey + 1, iris, 1, 1);
    if (spec.lashes) px(ctx, outer < 0 ? x - 1 : x + 2, ey - 1, INK, 1, 1);
  }
  // Sobrancelhas (expressão).
  if (!spec.noBrows) {
    const style = spec.brows ?? 'neutral';
    for (const [x, outer] of [[lx, -1], [rx, 1]]) {
      const inner = outer < 0 ? x + 2 : x - 1;
      if (style === 'stern') {
        px(ctx, outer < 0 ? x - 1 : x, ey - 3, browC, 3, 1);
        px(ctx, inner, ey - 2, browC, 1, 1);
      } else if (style === 'worried') {
        px(ctx, outer < 0 ? x - 1 : x, ey - 2, browC, 3, 1);
        px(ctx, inner, ey - 3, browC, 1, 1);
      } else if (style === 'kind') {
        px(ctx, x, ey - 3, browC, 2, 1);
        px(ctx, outer < 0 ? x - 1 : x + 2, ey - 2, browC, 1, 1);
      } else {
        px(ctx, outer < 0 ? x - 1 : x, ey - 3, browC, 3, 1);
      }
    }
  }
  // Nariz (sombra) e boca.
  px(ctx, Math.round(head.x), ey + 3, skSh, 1, 1);
  const my = ey + 5;
  const lip = '#5d2c28';
  switch (spec.mouth ?? 'neutral') {
    case 'smile':
      px(ctx, head.x - 1, my, lip, 2, 1); px(ctx, head.x - 2, my - 1, lip, 1, 1); px(ctx, head.x + 1, my - 1, lip, 1, 1);
      break;
    case 'grin':
      px(ctx, head.x - 2, my - 1, lip, 4, 1); px(ctx, head.x - 1, my - 1, WHITE, 2, 1); px(ctx, head.x - 1, my, lip, 2, 1);
      break;
    case 'frown':
      px(ctx, head.x - 1, my, lip, 2, 1); px(ctx, head.x - 2, my + 1, lip, 1, 1); px(ctx, head.x + 1, my + 1, lip, 1, 1);
      break;
    case 'open':
      px(ctx, head.x - 1, my, lip, 2, 2); px(ctx, head.x - 1, my + 1, '#c42430', 2, 1);
      break;
    default:
      px(ctx, head.x - 1, my, lip, 2, 1);
  }
  if (spec.blush) { px(ctx, lx - 1, ey + 3, '#e69c69', 2, 1); px(ctx, rx + 1, ey + 3, '#e69c69', 2, 1); }
  if (spec.scar) { px(ctx, rx + 2, ey - 1, skSh, 1, 1); px(ctx, rx + 1, ey + 2, skSh, 1, 1); px(ctx, rx + 2, ey + 3, skSh, 1, 1); }
  if (spec.freckles) { px(ctx, lx, ey + 3, skSh, 1, 1); px(ctx, rx + 1, ey + 3, skSh, 1, 1); px(ctx, lx + 1, ey + 4, skSh, 1, 1); }
}

function hairMass(ctx, spec, r) {
  const { head, B, dir } = r;
  const hair = spec.hair ?? {};
  if (!hair.color || hair.style === 'bald') return null;
  const ox = dir === 'right' ? -1.2 : 0;
  const p = ell(ctx, head.x + ox, head.y - 0.9, B.rx + 1.1, B.ry + 0.4);
  cel(ctx, p, hair.color, { d: [1.4, 1.3], h: [0.9, 0.8] });
  return p;
}

function hairBack(ctx, spec, r) {
  // Cabelo comprido / trança / rabo atrás do corpo.
  const { head, B, dir } = r;
  const hair = spec.hair ?? {};
  if (!hair.color) return;
  const len = hair.len ?? 13;
  if (hair.style === 'long' || hair.style === 'wavy') {
    if (dir === 'right') {
      const p = poly(ctx, [[head.x - 6, head.y - 3], [head.x - 1, head.y + 2], [head.x - 2, head.y + len], [head.x - 6.8, head.y + len + 1], [head.x - 9, head.y + len - 3], [head.x - 9.6, head.y + 3]], true);
      cel(ctx, p, hair.color, { d: [1.2, 1.2], h: [0.6, 0.6] });
      inside(ctx, p, () => strands(ctx, hair.color, [[head.x - 7.6, head.y + 2], [head.x - 6, head.y + len - 1]], [[head.x - 4.6, head.y + 3], [head.x - 3.6, head.y + len - 2]]));
      return;
    }
    const w = B.rx + 1.6;
    const p = poly(ctx, [[head.x - w, head.y - 2], [head.x + w, head.y - 2], [head.x + w + 1.2, head.y + len - 2], [head.x + w - 1, head.y + len + 1], [head.x, head.y + len + 0.5], [head.x - w + 1, head.y + len + 1], [head.x - w - 1.2, head.y + len - 2]], true);
    cel(ctx, p, dir === 'up' ? hair.color : R(hair.color)[1], { d: [1.2, 1.2], h: [0.7, 0.6] });
    if (dir === 'up') inside(ctx, p, () => {
      for (let i = -2; i <= 2; i += 1) strands(ctx, hair.color, [[head.x + i * 2.6, head.y - 1], [head.x + i * 3, head.y + len - 1]]);
    });
  }
  if (hair.style === 'ponytail' || hair.style === 'bun') {
    if (hair.style === 'bun') return;
    const base = dir === 'right' ? [head.x - 7.6, head.y - 1.5] : [head.x, head.y - 4];
    const tip = dir === 'right' ? [head.x - 10, head.y + 9 + (r.walking ? r.s : 0)] : [head.x + 0.5, head.y + 12];
    if (dir === 'down') return;
    cel(ctx, limb(ctx, base, tip, 4.4, 2.2), hair.color, { d: [0.8, 0.8], h: [0.6, 0.6] });
  }
}

function strands(ctx, color, ...lines) {
  const [, sh, , li] = R(color);
  for (const line of lines) {
    stroke(ctx, line, 0.85, sh);
    stroke(ctx, line.map(([x, y]) => [x - 1, y]), 0.6, li);
  }
}

function hairFront(ctx, spec, r) {
  const { head, B, dir } = r;
  const hair = spec.hair ?? {};
  if (!hair.color) return;
  const [dp, sh, base, li, shine] = R(hair.color);
  const top = head.y - B.ry - 0.6;
  if (hair.style === 'bald') {
    // Careca: coroa de cabelo nas laterais/nuca e o brilho do cocuruto.
    if (dir === 'up') {
      const ring = poly(ctx, [[head.x - B.rx, head.y - 1], [head.x + B.rx, head.y - 1], [head.x + B.rx - 0.4, head.y + 4], [head.x, head.y + 6.5], [head.x - B.rx + 0.4, head.y + 4]], true);
      cel(ctx, ring, hair.color, { d: [0.8, 0.8], h: [0.5, 0.5] });
      px(ctx, head.x - 3, head.y - B.ry + 2, R(spec.skin)[3], 2, 1);
      return;
    }
    const sides = dir === 'right' ? [[head.x - 4.6, 2.4]] : [[head.x - B.rx + 1.1, 1.8], [head.x + B.rx - 1.1, 1.8]];
    for (const [x, rx] of sides) cel(ctx, ell(ctx, x, head.y - 0.6, rx, 3.4), hair.color, { d: [0.6, 0.7], h: [0.4, 0.4] });
    px(ctx, head.x - (dir === 'right' ? 1 : 3), head.y - B.ry + 2, R(spec.skin)[3], 2, 1);
    if (dir === 'right') {
      cel(ctx, ell(ctx, head.x - 1.4, eyeRow(r) + 1.4, 1.3, 1.7), spec.skin, { d: [0.5, 0.5], h: [0.3, 0.3] });
      px(ctx, head.x - 1.5, eyeRow(r) + 1, R(spec.skin)[1], 1, 1);
    }
    return;
  }
  if (dir === 'up') {
    // Nuca: mechas descendo.
    const p = ell(ctx, head.x, head.y - 0.6, B.rx + 1.1, B.ry + 0.6);
    cel(ctx, p, hair.color, { d: [1.4, 1.3], h: [0.9, 0.8] });
    inside(ctx, p, () => {
      for (let i = -2; i <= 2; i += 1) {
        stroke(ctx, [[head.x + i * 1.5, top + 1.5], [head.x + i * 2.6, head.y + B.ry - 0.5]], 0.9, sh);
      }
      stroke(ctx, [[head.x - 4, top + 2.4], [head.x + 1, top + 1.2]], 0.9, li);
    });
    if (hair.style === 'bun') cel(ctx, ell(ctx, head.x, top + 0.5, 3.6, 3), hair.color, { d: [0.8, 0.8], h: [0.6, 0.6] });
    if (hair.style === 'braids') for (const side of [-1, 1]) braid(ctx, hair.color, head.x + side * 4.4, head.y + 4, hair.len ?? 14);
    if (hair.style === 'ponytail') cel(ctx, limb(ctx, [head.x, head.y + 2], [head.x + 0.4, head.y + 13], 4, 2), hair.color, { d: [0.8, 0.8], h: [0.6, 0.6] });
    return;
  }
  if (dir === 'right') {
    // Perfil: capa de cabelo por trás e franja na frente.
    const back = poly(ctx, [[head.x - B.rx - 1.4, head.y + (hair.style === 'short' || hair.style === 'spiky' ? 3.5 : 6)], [head.x - B.rx - 1.2, head.y - 3], [head.x - 3, top - 0.4], [head.x + 3, top - 0.2],
      [head.x + B.rx + 0.8, head.y - 3.2], [head.x + B.rx, head.y - 1.2], [head.x + 3, head.y - 2.2], [head.x + 0.4, head.y - 0.6], [head.x - 1.4, head.y + 2.6], [head.x - 3.4, head.y + 3]], true);
    cel(ctx, back, hair.color, { d: [1.2, 1.2], h: [0.8, 0.8] });
    inside(ctx, back, () => {
      stroke(ctx, [[head.x - 6, top + 2], [head.x - 2, head.y - 3.4], [head.x + 2, head.y - 3]], 0.85, sh);
      stroke(ctx, [[head.x - 7, head.y - 2], [head.x - 5.6, head.y + 2.5]], 0.85, sh);
      stroke(ctx, [[head.x - 4, top + 1.2], [head.x + 2, top + 1]], 0.85, li);
    });
    if (hair.style === 'spiky') for (const [dx, dy] of [[-3, -1.6], [0, -2], [3, -1.4]]) fill(ctx, poly(ctx, [[head.x + dx - 1.4, top + 1.5], [head.x + dx + 0.4, top + dy], [head.x + dx + 1.6, top + 1.5]]), base);
    if (hair.style === 'bun') cel(ctx, ell(ctx, head.x - 5, top + 1.2, 3.2, 3), hair.color, { d: [0.8, 0.8], h: [0.6, 0.6] });
    if (hair.style === 'braids') braid(ctx, hair.color, head.x - 4, head.y + 3, hair.len ?? 14);
    // Orelha.
    cel(ctx, ell(ctx, head.x - 1.4, eyeRow(r) + 1.4, 1.3, 1.7), spec.skin, { d: [0.5, 0.5], h: [0.3, 0.3] });
    px(ctx, head.x - 1.5, eyeRow(r) + 1, R(spec.skin)[1], 1, 1);
    return;
  }
  // De frente: franja em mechas sobre a testa.
  const fringe = (hair.fringe ?? 2.6);
  const pts = [[head.x - B.rx - 1.1, head.y + (hair.style === 'short' || hair.style === 'spiky' ? 1.5 : 3)], [head.x - B.rx - 0.9, head.y - 3.6], [head.x - 4, top - 0.4], [head.x + 4, top - 0.4], [head.x + B.rx + 0.9, head.y - 3.6], [head.x + B.rx + 1.1, head.y + (hair.style === 'short' || hair.style === 'spiky' ? 1.5 : 3)]];
  // Borda de baixo em lóbulos (da direita para a esquerda).
  const lobes = hair.part === 'side' ? [5.6, 2.6, -0.6, -3.6, -6] : [5.6, 3, 0, -3, -5.6];
  const fy = head.y - 3 + fringe;
  pts.push([head.x + B.rx - 0.6, head.y - 0.4]);
  lobes.forEach((lx, i) => {
    pts.push([head.x + lx - 0.6, fy + (i % 2 ? -1.4 : 0.6) + (hair.part === 'side' ? (i < 2 ? 0.8 : -0.4) : 0)]);
  });
  pts.push([head.x - B.rx + 0.6, head.y - 0.4]);
  const p = poly(ctx, pts, true);
  cel(ctx, p, hair.color, { d: [1.2, 1.2], h: [0.8, 0.9] });
  inside(ctx, p, () => {
    // Mechas: linhas escuras partindo do topo, brilho em arco.
    for (const lx of [-4.5, -1.5, 1.6, 4.4]) stroke(ctx, [[head.x + lx * 0.4, top + 0.8], [head.x + lx, fy - 0.6]], 0.85, sh);
    stroke(ctx, [[head.x - B.rx, head.y - 1.5], [head.x - B.rx + 0.6, head.y + 2.5]], 0.8, sh);
    stroke(ctx, [[head.x + B.rx, head.y - 1.5], [head.x + B.rx - 0.6, head.y + 2.5]], 0.8, dp);
    stroke(ctx, [[head.x - 5, top + 2.6], [head.x - 2, top + 1.2], [head.x + 1, top + 1]], 0.9, li);
    px(ctx, head.x - 4, top + 2, shine, 1, 1);
  });
  if (hair.style === 'spiky') for (const [dx, dy] of [[-4, -1.6], [-1, -2.4], [2, -2], [4.6, -1]]) fill(ctx, poly(ctx, [[head.x + dx - 1.6, top + 1.6], [head.x + dx, top + dy], [head.x + dx + 1.6, top + 1.6]]), base);
  if (hair.style === 'bun') { cel(ctx, ell(ctx, head.x, top - 0.6, 3.4, 2.6), hair.color, { d: [0.8, 0.8], h: [0.6, 0.6] }); px(ctx, head.x - 2, top - 0.5, sh, 4, 1); }
  if (hair.style === 'braids') for (const side of [-1, 1]) braid(ctx, hair.color, head.x + side * (B.rx - 0.2), head.y + 3, hair.len ?? 14);
  if (hair.style === 'long' || hair.style === 'wavy') {
    // Mechas laterais caindo na frente dos ombros.
    for (const side of [-1, 1]) {
      const x = head.x + side * (B.rx + 0.2);
      const p2 = poly(ctx, [[x - 1.8, head.y - 1], [x + 1.8, head.y - 1], [x + side * 1.2 + 1.4, head.y + (hair.front ?? 9)], [x + side * 0.8 - 1.2, head.y + (hair.front ?? 9) + 1]], true);
      cel(ctx, p2, hair.color, { d: [0.9, 0.9], h: [0.6, 0.6] });
      inside(ctx, p2, () => stroke(ctx, [[x, head.y], [x + side * 0.8, head.y + (hair.front ?? 9)]], 0.75, sh));
    }
  }
  if (hair.flower) { px(ctx, head.x + 4, top + 2, hair.flower, 2, 2); px(ctx, head.x + 4, top + 2, R(hair.flower)[4], 1, 1); }
}

function braid(ctx, color, x, y, len) {
  for (let i = 0; i < len; i += 2.6) {
    cel(ctx, ell(ctx, x + (i % 5.2 ? 0.3 : -0.3), y + i, 1.8, 1.6), color, { d: [0.5, 0.6], h: [0.4, 0.4] });
  }
  px(ctx, x - 1, y + len, R(color)[0], 2, 1);
}

function beard(ctx, spec, r) {
  const b = spec.beard;
  if (!b || r.dir === 'up') return;
  const { head, B, dir } = r;
  const ey = eyeRow(r);
  const color = b.color ?? spec.hair?.color;
  const [, sh, , li] = R(color);
  const len = b.len ?? 4;
  if (dir === 'right') {
    const p = poly(ctx, [[head.x - 1.4, ey + 1], [head.x + 2, ey + 3], [head.x + 6.4, ey + 3.6], [head.x + 6, ey + 4.6 + len * 0.5], [head.x + 2.5, ey + 6 + len], [head.x - 0.6, ey + 5 + len * 0.6], [head.x - 2, ey + 3]], true);
    cel(ctx, p, color, { d: [0.9, 1], h: [0.6, 0.6] });
    inside(ctx, p, () => { stroke(ctx, [[head.x + 1, ey + 4], [head.x + 2, ey + 5 + len]], 0.8, sh); stroke(ctx, [[head.x + 3.4, ey + 4.5], [head.x + 4, ey + 5 + len]], 0.8, sh); });
    px(ctx, Math.round(head.x + 4.5), ey + 4, '#391f21', 2, 1);
    return;
  }
  const style = b.style ?? 'full';
  if (style !== 'mustache') {
    const p = poly(ctx, [[head.x - B.rx + 0.4, ey], [head.x - B.rx + 1.4, ey + 3.4], [head.x - 3, ey + 4.6 + len * 0.6], [head.x, ey + 5.6 + len], [head.x + 3, ey + 4.6 + len * 0.6], [head.x + B.rx - 1.4, ey + 3.4], [head.x + B.rx - 0.4, ey],
      [head.x + B.rx - 1.8, ey + 1.8], [head.x + 2.2, ey + 3.4], [head.x - 2.2, ey + 3.4], [head.x - B.rx + 1.8, ey + 1.8]], true);
    cel(ctx, p, color, { d: [1, 1.1], h: [0.6, 0.6] });
    inside(ctx, p, () => {
      for (const dx of [-3, -1, 1.2, 3.2]) stroke(ctx, [[head.x + dx * 0.9, ey + 4], [head.x + dx * 0.7, ey + 4.5 + len * 0.9]], 0.8, sh);
      stroke(ctx, [[head.x - 4, ey + 3], [head.x - 2.6, ey + 4 + len * 0.5]], 0.6, li);
    });
    if (b.beads) { px(ctx, head.x - 2, ey + 4 + len, b.beads, 1, 1); px(ctx, head.x + 1, ey + 4 + len, b.beads, 1, 1); }
  }
  // Bigode sobre a boca (a boca aparece embaixo).
  const m = poly(ctx, [[head.x - 3.6, ey + 4.6], [head.x - 1, ey + 3.4], [head.x + 1, ey + 3.4], [head.x + 3.6, ey + 4.6], [head.x + 2.4, ey + 5.2], [head.x, ey + 4.6], [head.x - 2.4, ey + 5.2]], true);
  cel(ctx, m, color, { d: [0.5, 0.7], h: [0.4, 0.4] });
  px(ctx, head.x - 1, ey + 6, '#391f21', 2, 1);
}

// ---------------------------------------------------------------- chapéus

const HATS = {
  helm(ctx, spec, r, h) {
    // Chapéu de ferro (capelina) do vigia: aba larga de metal com rebites.
    const { head, B, dir } = r;
    const color = h.color ?? '#92a1b9';
    const top = head.y - B.ry - 1.2;
    const dome = dir === 'right'
      ? poly(ctx, [[head.x - 6.6, head.y - 2.4], [head.x - 5.6, top + 1.4], [head.x - 1, top - 0.6], [head.x + 4, top + 0.4], [head.x + 6.4, head.y - 2.4]], true)
      : ell(ctx, head.x, head.y - 3.6, B.rx - 0.2, 5.4);
    cel(ctx, dome, color, { d: [1.3, 1.2], h: [0.9, 0.9] });
    inside(ctx, dome, () => { stroke(ctx, [[head.x - 0.5, top], [head.x - 0.5, head.y - 2]], 0.8, R(color)[1]); px(ctx, head.x - 4, head.y - 6, R(color)[4], 1, 2); });
    const brimY = head.y - 2.6;
    const brim = dir === 'right' ? ell(ctx, head.x + 0.2, brimY, B.rx + 2.6, 1.6) : ell(ctx, head.x, brimY, B.rx + 3, 1.8);
    cel(ctx, brim, color, { d: [0.9, 1.1], h: [0.5, 0.5] });
    inside(ctx, brim, () => { ctx.fillStyle = R(color)[0]; ctx.fillRect(0, brimY + 0.6, 56, 2); });
    inside(ctx, dome, () => { ctx.fillStyle = '#391f21'; ctx.fillRect(0, brimY - 2, 56, 1); });
    if (dir === 'down') for (const dx of [-6, -2, 2, 6]) px(ctx, head.x + dx - 0.5, brimY - 0.5, R(color)[4], 1, 1);
    if (h.plume) {
      const base = dir === 'right' ? [head.x - 3, top + 0.5] : [head.x, top];
      const tip = dir === 'right' ? [head.x - 8, top - 2] : [head.x + 3, top - 4];
      stroke(ctx, [base, [(base[0] + tip[0]) / 2, tip[1] - 1], tip], 2.6, h.plume);
      stroke(ctx, [base, [(base[0] + tip[0]) / 2, tip[1] - 1.4], tip], 1, R(h.plume)[3]);
    }
  },
  straw(ctx, spec, r, h) {
    const { head, B, dir } = r;
    const color = h.color ?? '#cba36f';
    const top = head.y - B.ry - 2;
    const brim = dir === 'right' ? ell(ctx, head.x + 0.4, head.y - 2.6, B.rx + 4, 2) : ell(ctx, head.x, head.y - 2.4, B.rx + 4.4, 2.4);
    cel(ctx, brim, color, { d: [0.9, 1], h: [0.6, 0.6] });
    inside(ctx, brim, () => {
      for (let a = 0; a < 12; a += 1) {
        const x = head.x - B.rx - 4 + a * (2 * B.rx + 8) / 11;
        px(ctx, x, head.y - 2.6 + (a % 2), R(color)[1], 1, 1);
      }
    });
    const crown = dir === 'right' ? poly(ctx, [[head.x - 5.4, head.y - 3], [head.x - 4.6, top], [head.x + 4.2, top + 0.4], [head.x + 5, head.y - 3]], true) : poly(ctx, [[head.x - 5.6, head.y - 3], [head.x - 4.8, top], [head.x + 4.8, top], [head.x + 5.6, head.y - 3]], true);
    cel(ctx, crown, color, { d: [1, 0.9], h: [0.7, 0.7] });
    // Fita.
    inside(ctx, crown, () => { ctx.fillStyle = h.band ?? '#8e251d'; ctx.fillRect(0, Math.round(head.y - 5), 56, 1.6); });
    if (dir === 'down') px(ctx, head.x - 2, top + 1.6, R(color)[3], 1, 1);
  },
  hood(ctx, spec, r, h, back) {
    // Capuz: atrás da cabeça (back = true) e a borda em volta do rosto.
    const { head, B, dir } = r;
    const color = h.color;
    if (back) {
      if (dir === 'up') return;
      const p = dir === 'right'
        ? poly(ctx, [[head.x - B.rx - 1.8, head.y + 6], [head.x - B.rx - 2, head.y - 2], [head.x - 3, head.y - B.ry - 2.2], [head.x + 4, head.y - B.ry - 1.4], [head.x + B.rx + 1.4, head.y - 1], [head.x + 2, head.y + 7]], true)
        : poly(ctx, [[head.x - B.rx - 2.2, head.y + 7], [head.x - B.rx - 2, head.y - 3], [head.x - 3, head.y - B.ry - 2.4], [head.x + 3, head.y - B.ry - 2.4], [head.x + B.rx + 2, head.y - 3], [head.x + B.rx + 2.2, head.y + 7]], true);
      cel(ctx, p, R(color)[1], { d: [1, 1], h: [0.6, 0.6] });
      return;
    }
    const outer = dir === 'up'
      ? ell(ctx, head.x, head.y, B.rx + 2.2, B.ry + 1.8)
      : dir === 'right'
        ? poly(ctx, [[head.x - B.rx - 2, head.y + 6], [head.x - B.rx - 2.2, head.y - 2.5], [head.x - 3, head.y - B.ry - 2.4], [head.x + 3.4, head.y - B.ry - 1.6], [head.x + B.rx + 1.2, head.y - 3], [head.x + 3.2, head.y - 3.4], [head.x + 0.6, head.y], [head.x - 0.2, head.y + 6.5]], true)
        : (() => {
          const p = new ctx.Path2D();
          p.addPath(poly(ctx, [[head.x - B.rx - 2.3, head.y + 7.5], [head.x - B.rx - 2.2, head.y - 3], [head.x - 3.4, head.y - B.ry - 2.4], [head.x + 3.4, head.y - B.ry - 2.4], [head.x + B.rx + 2.2, head.y - 3], [head.x + B.rx + 2.3, head.y + 7.5],
            [head.x + B.rx - 1, head.y + 6], [head.x + B.rx - 1.2, head.y - 1], [head.x + 3, head.y - 4.2], [head.x - 3, head.y - 4.2], [head.x - B.rx + 1.2, head.y - 1], [head.x - B.rx + 1, head.y + 6]], true));
          return p;
        })();
    cel(ctx, outer, color, { d: [1.2, 1.2], h: [0.8, 0.8] });
    inside(ctx, outer, () => {
      if (dir === 'down') {
        stroke(ctx, [[head.x - B.rx + 0.6, head.y + 5], [head.x - B.rx + 0.4, head.y - 1.5], [head.x - 3, head.y - 4.6], [head.x + 3, head.y - 4.6], [head.x + B.rx - 0.4, head.y - 1.5], [head.x + B.rx - 0.6, head.y + 5]], 0.9, R(color)[0]);
        stroke(ctx, [[head.x - B.rx - 1, head.y + 4], [head.x - B.rx - 1, head.y - 2]], 0.8, R(color)[3]);
      } else {
        stroke(ctx, [[head.x - 3, head.y - B.ry], [head.x - 1, head.y + 4]], 0.8, R(color)[1]);
      }
    });
    if (h.feather && dir !== 'up') {
      const base = dir === 'right' ? [head.x - 4, head.y - B.ry - 1] : [head.x + 4, head.y - B.ry - 1];
      stroke(ctx, [base, [base[0] + 2.5, base[1] - 3], [base[0] + 4.5, base[1] - 4.5]], 1.6, h.feather);
      px(ctx, base[0] + 3, base[1] - 4, R(h.feather)[3], 1, 1);
    }
  },
  cap(ctx, spec, r, h) {
    // Boné de pano (barqueiro) / boina.
    const { head, B, dir } = r;
    const color = h.color;
    const top = head.y - B.ry - 1.4;
    const p = dir === 'right'
      ? poly(ctx, [[head.x - B.rx - 0.8, head.y - 2], [head.x - 6, top + 0.4], [head.x + 1, top - 0.6], [head.x + 6, top + 1.4], [head.x + 7.6, head.y - 2.8], [head.x + 9.4, head.y - 2.2], [head.x + 7, head.y - 1.6]], true)
      : poly(ctx, [[head.x - B.rx - 1, head.y - 2], [head.x - B.rx, top + 2], [head.x - 3, top - 0.6], [head.x + 4, top - 0.4], [head.x + B.rx + 1.4, top + 2.4], [head.x + B.rx + 1, head.y - 2]], true);
    cel(ctx, p, color, { d: [1.1, 1.1], h: [0.7, 0.7] });
    inside(ctx, p, () => {
      ctx.fillStyle = R(color)[0]; ctx.fillRect(0, Math.round(head.y - 3), 56, 1);
      stroke(ctx, [[head.x - 2, top + 0.4], [head.x + 1, head.y - 3.5]], 0.75, R(color)[1]);
    });
    if (h.button && dir !== 'right') px(ctx, head.x, top - 0.4, h.button, 1, 1);
  },
  wide(ctx, spec, r, h) {
    // Chapéu de aba larga com pena (mercador).
    const { head, B, dir } = r;
    const color = h.color;
    const brim = dir === 'right' ? ell(ctx, head.x + 0.6, head.y - 3, B.rx + 4.2, 1.9, -0.06) : ell(ctx, head.x, head.y - 3, B.rx + 4.6, 2.2);
    cel(ctx, brim, R(color)[1], { d: [0.8, 0.9], h: [0.5, 0.5] });
    const top = head.y - B.ry - 2.6;
    const crown = poly(ctx, [[head.x - 5.4, head.y - 3.4], [head.x - 5, top + 1], [head.x - 1, top], [head.x + 5, top + 0.6], [head.x + 5.4, head.y - 3.4]], true);
    cel(ctx, crown, color, { d: [1.1, 0.9], h: [0.7, 0.7] });
    inside(ctx, crown, () => { ctx.fillStyle = h.band ?? '#edab50'; ctx.fillRect(0, Math.round(head.y - 5.2), 56, 1.4); });
    if (h.feather) {
      const base = dir === 'right' ? [head.x - 4, head.y - 5] : [head.x + 4.6, head.y - 5];
      const tip = dir === 'right' ? [head.x - 11, top - 2] : [head.x + 10, top - 3];
      stroke(ctx, [base, [(base[0] + tip[0]) / 2, top - 1.5], tip], 2.2, h.feather);
      stroke(ctx, [base, [(base[0] + tip[0]) / 2, top - 2], tip], 0.8, R(h.feather)[3]);
    }
  },
  kerchief(ctx, spec, r, h) {
    // Lenço amarrado na cabeça (cozinheira, ferreira).
    const { head, B, dir } = r;
    const color = h.color;
    const top = head.y - B.ry - 0.8;
    const p = dir === 'right'
      ? poly(ctx, [[head.x - B.rx - 1.2, head.y - 0.4], [head.x - 6, top], [head.x + 2, top - 0.4], [head.x + B.rx + 0.6, head.y - 4], [head.x + 4, head.y - 3.4], [head.x - 2, head.y - 2.6]], true)
      : poly(ctx, [[head.x - B.rx - 1.1, head.y - 1], [head.x - B.rx, top + 2], [head.x - 3, top - 0.4], [head.x + 3, top - 0.4], [head.x + B.rx, top + 2], [head.x + B.rx + 1.1, head.y - 1], [head.x + 2, head.y - 3.6], [head.x - 2, head.y - 3.6]], true);
    cel(ctx, p, color, { d: [1, 1], h: [0.7, 0.7] });
    if (h.dots) inside(ctx, p, () => { for (let x = 18; x < 40; x += 3) for (let y = top; y < head.y; y += 3) px(ctx, x + (y % 2), y, h.dots, 1, 1); });
    if (dir === 'up' || dir === 'right') {
      const kx = dir === 'right' ? head.x - B.rx - 0.6 : head.x;
      const ky = dir === 'right' ? head.y - 1 : head.y + 1;
      cel(ctx, ell(ctx, kx, ky, 1.8, 1.4), color, { d: [0.5, 0.5], h: [0.3, 0.3] });
      stroke(ctx, [[kx, ky + 1], [kx - 1.6, ky + 4.6]], 1.4, R(color)[1]);
      stroke(ctx, [[kx, ky + 1], [kx + 1.4, ky + 4.2]], 1.4, R(color)[1]);
    }
  },
  crown(ctx, spec, r, h) {
    const { head, B, dir } = r;
    const color = h.color ?? '#ffc825';
    const base = head.y - B.ry + 1.2;
    const w = dir === 'right' ? 5.6 : B.rx - 0.4;
    const cx = dir === 'right' ? head.x - 0.6 : head.x;
    const pts = [[cx - w, base + 1.6], [cx - w, base - 2.2], [cx - w * 0.5, base - 0.6], [cx, base - 3.6], [cx + w * 0.5, base - 0.6], [cx + w, base - 2.2], [cx + w, base + 1.6]];
    const p = poly(ctx, pts);
    cel(ctx, p, color, { d: [0.9, 0.9], h: [0.6, 0.6] });
    inside(ctx, p, () => { ctx.fillStyle = R(color)[1]; ctx.fillRect(0, Math.round(base + 0.6), 56, 1); });
    if (dir !== 'up') {
      px(ctx, cx - 1, base - 0.6, h.gem ?? '#c42430', 2, 1.6);
      px(ctx, cx - w + 0.6, base - 0.6, '#0098dc', 1, 1);
      px(ctx, cx + w - 1.6, base - 0.6, '#0098dc', 1, 1);
    }
    // Rachadura (coroa partida).
    if (h.cracked) stroke(ctx, [[cx + 1, base - 3], [cx + 0.3, base - 1], [cx + 1.2, base + 1.4]], 0.6, '#391f21');
  },
  bandana(ctx, spec, r, h) {
    const { head, B, dir } = r;
    const color = h.color;
    const y = head.y - 4.4;
    const p = dir === 'right'
      ? poly(ctx, [[head.x - B.rx - 1.2, y - 0.6], [head.x + B.rx + 0.4, y - 1.2], [head.x + B.rx + 0.4, y + 1], [head.x - B.rx - 1.2, y + 1.6]], true)
      : poly(ctx, [[head.x - B.rx - 1.2, y], [head.x, y - 0.8], [head.x + B.rx + 1.2, y], [head.x + B.rx + 1.1, y + 2], [head.x, y + 1.4], [head.x - B.rx - 1.1, y + 2]], true);
    cel(ctx, p, color, { d: [0.6, 0.8], h: [0.4, 0.5] });
    if (dir !== 'down') {
      const kx = dir === 'right' ? head.x - B.rx - 1 : head.x + 1;
      stroke(ctx, [[kx, y + 1], [kx - 2, y + 5 + (r.walking ? r.s : 0)]], 1.4, R(color)[1]);
      stroke(ctx, [[kx, y + 1], [kx - 0.4, y + 5.4]], 1.2, R(color)[1]);
    }
  },
  mask(ctx, spec, r, h) {
    // Pano no rosto (saqueador): cobre nariz e boca.
    if (r.dir === 'up') return;
    const { head, B, dir } = r;
    const ey = eyeRow(r);
    const p = dir === 'right'
      ? poly(ctx, [[head.x - 1, ey + 2], [head.x + 7.4, ey + 2], [head.x + 6.6, ey + 6.4], [head.x + 2, ey + 8], [head.x - 1.4, ey + 6]], true)
      : poly(ctx, [[head.x - B.rx + 0.4, ey + 2], [head.x + B.rx - 0.4, ey + 2], [head.x + B.rx - 1.4, ey + 6], [head.x, ey + 8.4], [head.x - B.rx + 1.4, ey + 6]], true);
    cel(ctx, p, h.color, { d: [0.8, 0.8], h: [0.5, 0.5] });
  }
};

// ---------------------------------------------------------------- props

const WOOD = '#8a4836';
const STEEL = '#92a1b9';

export const PROPS = {
  hammer(ctx, hand, r, o = {}) {
    // Martelo de forja apoiado no ombro: cabo de madeira subindo da mão e cabeça de ferro acima do ombro.
    const side = r.dir === 'right';
    const h0 = [hand.x + 0.4, hand.y + 1.5];
    const h1 = side ? [hand.x - 4.5, r.sY - 5.5] : [hand.x - 1.2, r.sY - 6.5];
    fill(ctx, limb(ctx, h0, h1, 2, 1.8), '#bf6f4a');
    stroke(ctx, [[h0[0] - 0.5, h0[1]], [h1[0] - 0.5, h1[1]]], 0.6, '#e69c69');
    const ang = Math.atan2(h1[1] - h0[1], h1[0] - h0[0]) + Math.PI / 2;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const vx = -uy;
    const vy = ux;
    const a1 = 4.6;
    const a2 = 3.2;
    const c = [h1[0] - vx * 1.2, h1[1] - vy * 1.2];
    const head = poly(ctx, [
      [c[0] - ux * a1 - vx * a2 * 0.5, c[1] - uy * a1 - vy * a2 * 0.5], [c[0] + ux * a1 * 0.8 - vx * a2 * 0.5, c[1] + uy * a1 * 0.8 - vy * a2 * 0.5],
      [c[0] + ux * a1 * 0.8 + vx * a2 * 0.5, c[1] + uy * a1 * 0.8 + vy * a2 * 0.5], [c[0] - ux * a1 + vx * a2 * 0.5, c[1] - uy * a1 + vy * a2 * 0.5]
    ], true);
    cel(ctx, head, o.metal ?? '#657392', { d: [1, 1], h: [0.8, 0.8] });
    px(ctx, c[0] - 2, c[1] - 1.5, R(o.metal ?? '#657392')[4], 2, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), o.skin);
  },
  spear(ctx, hand, r) {
    const x = hand.x + (r.dir === 'right' ? 0.4 : 0);
    const top = 3.5;
    fill(ctx, limb(ctx, [x, top + 6], [x, hand.y + 15], 1.5, 1.5), WOOD);
    stroke(ctx, [[x - 0.4, top + 7], [x - 0.4, hand.y + 14]], 0.5, R(WOOD)[3]);
    const head = poly(ctx, [[x, top - 1], [x + 2.1, top + 4.2], [x + 1, top + 6.6], [x - 1, top + 6.6], [x - 2.1, top + 4.2]], true);
    cel(ctx, head, STEEL, { d: [0.8, 0.8], h: [0.6, 0.6] });
    px(ctx, x - 1, top + 1.5, R(STEEL)[4], 1, 2);
    // Fita vermelha abaixo da ponta.
    fill(ctx, poly(ctx, [[x - 1.2, top + 7], [x + 1.2, top + 7], [x + 1.5, top + 8.6], [x - 1.2, top + 8.6]], true), '#ea323c');
    stroke(ctx, [[x + 1, top + 8], [x + 2.6, top + 11 + (r.walking ? r.s : 0)]], 1, '#c42430');
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  bow(ctx, hand, r) {
    // Arco longo na mão: madeira curva + corda.
    const x = hand.x + (r.dir === 'right' ? 1.6 : 1.8);
    const y = hand.y - 2;
    const color = '#5d2c28';
    const p = new ctx.Path2D();
    p.moveTo(x - 1.2, y - 15);
    p.quadraticCurveTo(x + 8.4, y, x - 1.2, y + 14);
    p.quadraticCurveTo(x + 5.6, y, x - 1.2, y - 15);
    cel(ctx, p, color, { d: [0.6, 0.6], h: [0.5, 0.5] });
    stroke(ctx, [[x - 1.4, y - 14.6], [x - 1.4, y + 13.6]], 0.7, '#b4b4b4');
    px(ctx, x + 2.6, y - 1.5, '#cba36f', 2, 3);
    px(ctx, x - 2, y - 15.5, '#cba36f', 2, 1);
    px(ctx, x - 2, y + 13.6, '#cba36f', 2, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  staff(ctx, hand, r, o = {}) {
    const x = hand.x + 0.4;
    const top = o.top ?? 12;
    const wood = o.wood ?? '#bf6f4a';
    fill(ctx, limb(ctx, [x + 0.6, top], [x, FOOT - 0.5], 1.9, 1.6), wood);
    stroke(ctx, [[x + 0.1, top + 1], [x - 0.4, FOOT - 2]], 0.6, R(wood)[3]);
    // Nó retorcido no topo.
    cel(ctx, ell(ctx, x + 0.8, top - 0.6, 2.4, 2.2), wood, { d: [0.7, 0.7], h: [0.5, 0.5] });
    px(ctx, x + 1, top + 4, R(wood)[1], 1, 1);
    if (o.gem) { px(ctx, x, top - 1, o.gem, 2, 2); px(ctx, x, top - 1, R(o.gem)[4], 1, 1); }
    if (o.leaves) { px(ctx, x + 2, top + 1, '#5ac54f', 2, 1); px(ctx, x + 3, top, '#99e65f', 1, 1); }
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  ladle(ctx, hand, r) {
    const h0 = [hand.x, hand.y + 1];
    const h1 = [hand.x + 1.6, hand.y - 9];
    fill(ctx, limb(ctx, h0, h1, 1.2, 1.2), '#b4b4b4');
    cel(ctx, ell(ctx, h1[0] + 0.6, h1[1] - 1.6, 2.6, 2), '#92a1b9', { d: [0.6, 0.6], h: [0.5, 0.5] });
    px(ctx, h1[0], h1[1] - 2.6, '#ffffff', 1, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  pitchfork(ctx, hand, r) {
    const x = hand.x + 0.4;
    fill(ctx, limb(ctx, [x, 10], [x, FOOT - 1], 1.4, 1.4), '#bf6f4a');
    stroke(ctx, [[x - 0.3, 11], [x - 0.3, FOOT - 2]], 0.45, '#e69c69');
    fill(ctx, poly(ctx, [[x - 3, 9], [x + 3, 9], [x + 3, 10.6], [x - 3, 10.6]], true), '#657392');
    for (const dx of [-2.6, 0, 2.6]) {
      fill(ctx, limb(ctx, [x + dx, 9.6], [x + dx * 1.1, 3.4], 1.2, 0.9), '#92a1b9');
      px(ctx, x + dx - 0.5, 4, '#c7cfdd', 1, 1);
    }
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  coins(ctx, hand, r) {
    // Bolsa de moedas cheia, com moedas aparecendo.
    const x = hand.x;
    const y = hand.y + 3.2;
    const bag = poly(ctx, [[x - 1.4, y - 2.6], [x + 1.4, y - 2.6], [x + 3.6, y + 1], [x + 3, y + 3.6], [x - 3, y + 3.6], [x - 3.6, y + 1]], true);
    cel(ctx, bag, '#ad7954', { d: [0.8, 0.8], h: [0.6, 0.6] });
    px(ctx, x - 1.5, y - 2.6, '#5d2c28', 3, 1);
    px(ctx, x - 1, y - 4, '#ffc825', 2, 1);
    px(ctx, x - 1, y - 4, '#ffeb57', 1, 1);
    px(ctx, x + 1, y - 3.4, '#edab50', 1, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  basket(ctx, hand, r) {
    const x = hand.x + (r.dir === 'right' ? 0.5 : 0);
    const y = hand.y + 2.6;
    const p = poly(ctx, [[x - 4.4, y - 1], [x + 4.4, y - 1], [x + 3.6, y + 4], [x - 3.6, y + 4]], true);
    cel(ctx, p, '#cba36f', { d: [0.8, 0.8], h: [0.6, 0.6] });
    inside(ctx, p, () => {
      for (let i = -4; i <= 4; i += 2) px(ctx, x + i, y, '#ad7954', 1, 4);
      px(ctx, x - 4, y + 2, '#ad7954', 9, 1);
    });
    // Alça e conteúdo (maçã, ovos, folhas).
    stroke(ctx, [[x - 3.6, y - 0.8], [x, y - 5.4], [x + 3.6, y - 0.8]], 0.9, '#8a4836');
    px(ctx, x - 3, y - 2, '#ea323c', 2, 2);
    px(ctx, x - 3, y - 2, '#f68187', 1, 1);
    px(ctx, x, y - 2, '#f9e6cf', 2, 2);
    px(ctx, x + 2, y - 2, '#5ac54f', 2, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  book(ctx, hand, r) {
    // Caderno de couro (os nomes que a Lia anota).
    const x = hand.x - (r.dir === 'right' ? -0.5 : 1.5);
    const y = hand.y - 3;
    cel(ctx, poly(ctx, [[x - 2.6, y - 3], [x + 2.6, y - 3], [x + 2.6, y + 3], [x - 2.6, y + 3]], true), '#5d2c28', { d: [0.6, 0.6], h: [0.5, 0.5] });
    px(ctx, x - 2, y - 3, '#f9e6cf', 1, 6);
    px(ctx, x, y - 1, '#edab50', 1, 2);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  herbs(ctx, hand, r) {
    const x = hand.x;
    const y = hand.y;
    for (const [dx, dy, c] of [[-1.5, -6, '#5ac54f'], [0.6, -7, '#99e65f'], [2, -5.4, '#33984b'], [-0.4, -4.4, '#1e6f50']]) {
      stroke(ctx, [[x, y - 1], [x + dx, y + dy]], 1.2, c);
    }
    px(ctx, x + 0.6, y - 7.4, '#f5555d', 1, 1);
    px(ctx, x - 2, y - 6.4, '#ffeb57', 1, 1);
    stroke(ctx, [[x - 0.5, y - 1.5], [x + 0.5, y - 1.5]], 1, '#bf6f4a');
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  mallet(ctx, hand, r) {
    // Marreta de madeira do construtor apoiada no ombro.
    const down = r.dir !== 'right';
    const h0 = [hand.x, hand.y + 1];
    const h1 = down ? [hand.x + 3, hand.y - 13] : [hand.x - 5, hand.y - 13];
    fill(ctx, limb(ctx, h0, h1, 1.6, 1.4), '#bf6f4a');
    const head = poly(ctx, [[h1[0] - 3.6, h1[1] - 2.2], [h1[0] + 3.6, h1[1] - 2.8], [h1[0] + 3.8, h1[1] + 1.6], [h1[0] - 3.4, h1[1] + 2.2]], true);
    cel(ctx, head, '#8a4836', { d: [0.9, 0.9], h: [0.6, 0.6] });
    px(ctx, h1[0] - 3, h1[1] - 1.4, '#e69c69', 1, 3);
    px(ctx, h1[0] + 2.6, h1[1] - 2, '#5d2c28', 1, 3);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  oar(ctx, hand, r) {
    const x = hand.x + 0.5;
    fill(ctx, limb(ctx, [x, 8], [x, FOOT - 10], 1.5, 1.5), '#bf6f4a');
    const blade = poly(ctx, [[x - 2.4, FOOT - 11], [x + 2.4, FOOT - 11], [x + 2.6, FOOT - 1.5], [x, FOOT - 0.5], [x - 2.6, FOOT - 1.5]], true);
    cel(ctx, blade, '#8a4836', { d: [0.8, 0.8], h: [0.6, 0.6] });
    px(ctx, x - 2, FOOT - 9, '#0098dc', 4, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  sword(ctx, hand, r, o = {}) {
    // Espada embainhada na cintura (só a bainha e o punho à mostra) ou de madeira (menino).
    const wood = o.wood;
    const x = hand.x + 0.4;
    const y0 = hand.y - 1;
    if (wood) {
      fill(ctx, limb(ctx, [x, y0 + 1], [x + 0.8, y0 - 11], 2, 1.6), '#cba36f');
      stroke(ctx, [[x - 0.4, y0], [x + 0.2, y0 - 10]], 0.5, '#f6ca9f');
      fill(ctx, poly(ctx, [[x - 2.4, y0 - 0.6], [x + 2.6, y0 - 0.8], [x + 2.6, y0 + 0.6], [x - 2.4, y0 + 0.8]], true), '#8a4836');
    } else {
      fill(ctx, limb(ctx, [x, y0 + 1], [x + 1, y0 - 13], 1.8, 1.4), '#c7cfdd');
      stroke(ctx, [[x - 0.3, y0], [x + 0.6, y0 - 12]], 0.5, '#ffffff');
      fill(ctx, poly(ctx, [[x - 2.6, y0 - 0.4], [x + 2.8, y0 - 0.6], [x + 2.8, y0 + 0.8], [x - 2.6, y0 + 1]], true), '#edab50');
    }
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  dagger(ctx, hand, r) {
    const x = hand.x + 0.5;
    const y = hand.y;
    fill(ctx, limb(ctx, [x, y + 1], [x + 1.6, y + 7], 1.6, 0.6), '#c7cfdd');
    px(ctx, x - 1.5, y + 0.5, '#391f21', 3, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  broom(ctx, hand, r) {
    const x = hand.x + 0.4;
    fill(ctx, limb(ctx, [x + 1.4, 18], [x, FOOT - 7], 1.3, 1.3), '#bf6f4a');
    const p = poly(ctx, [[x - 1.6, FOOT - 8], [x + 1.6, FOOT - 8], [x + 3.6, FOOT - 0.6], [x - 3.4, FOOT - 0.6]], true);
    cel(ctx, p, '#cba36f', { d: [0.7, 0.7], h: [0.5, 0.5] });
    inside(ctx, p, () => { for (let i = -3; i <= 3; i += 1.5) stroke(ctx, [[x + i * 0.4, FOOT - 7.6], [x + i, FOOT]], 0.6, '#ad7954'); });
    px(ctx, x - 1.5, FOOT - 8, '#8e251d', 3, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  },
  lantern(ctx, hand, r) {
    const x = hand.x;
    const y = hand.y + 4.2;
    stroke(ctx, [[x, hand.y], [x, y - 2.6]], 0.6, '#3d3d3d');
    cel(ctx, poly(ctx, [[x - 2, y - 2.6], [x + 2, y - 2.6], [x + 2.4, y + 2.4], [x - 2.4, y + 2.4]], true), '#424c6e', { d: [0.5, 0.5], h: [0.4, 0.4] });
    px(ctx, x - 1, y - 1.4, '#ffc825', 2, 3);
    px(ctx, x - 1, y - 1.4, '#ffeb57', 1, 1);
    fill(ctx, ell(ctx, hand.x, hand.y - 0.2, 1.9, 1.9), r.skin);
  }
};

const BACKS = {
  quiver(ctx, spec, r, front) {
    // Aljava nas costas com penas das flechas para fora.
    const { B, dir } = r;
    if (dir === 'down' && front) return;
    if (dir === 'up' && !front) return;
    if (dir === 'right' && front) return;
    const x0 = dir === 'right' ? CX - 5.4 : dir === 'up' ? CX + 3 : CX - 4.6;
    const top = r.sY - 6;
    const p = dir === 'right'
      ? limb(ctx, [x0 + 2, top + 1], [x0 - 1.6, r.wY + 1], 4, 3.6)
      : limb(ctx, [x0 + (dir === 'up' ? 2.4 : 3.6), top + 1], [x0 - (dir === 'up' ? 2.6 : 1), r.wY + 2], 4.2, 3.8);
    cel(ctx, p, '#8a4836', { d: [0.8, 0.8], h: [0.6, 0.6] });
    inside(ctx, p, () => { ctx.fillStyle = '#5d2c28'; ctx.fillRect(0, Math.round(top + 3), 56, 1); ctx.fillRect(0, Math.round(r.wY - 2), 56, 1); });
    const fx = dir === 'right' ? x0 + 2 : dir === 'up' ? x0 + 2.4 : x0 + 3.6;
    for (const [dx, c] of [[-1.4, '#f9e6cf'], [0.2, '#ea323c'], [1.6, '#f9e6cf']]) {
      stroke(ctx, [[fx + dx, top + 2], [fx + dx * 1.3, top - 2.6]], 0.8, '#bf6f4a');
      fill(ctx, poly(ctx, [[fx + dx * 1.3 - 1, top - 2.2], [fx + dx * 1.3, top - 4.6], [fx + dx * 1.3 + 1, top - 2.2]]), c);
    }
    void B;
  },
  pack(ctx, spec, r, front) {
    // Mochila grande de mercador (com rolo de tecido em cima).
    const { B, dir } = r;
    if (dir === 'down' && front) return;
    if (dir === 'up' && !front) return;
    if (dir === 'right' && front) return;
    const color = spec.back.color ?? '#8a4836';
    const cx = dir === 'right' ? CX - 7 : CX;
    const w = dir === 'right' ? 3.6 : B.shW - 1.2;
    const p = poly(ctx, [[cx - w, r.sY - 1], [cx + w, r.sY - 1], [cx + w + 0.6, r.wY + 3], [cx - w - 0.6, r.wY + 3]], true);
    cel(ctx, p, color, { d: [1, 1], h: [0.7, 0.7] });
    inside(ctx, p, () => {
      ctx.fillStyle = R(color)[1]; ctx.fillRect(0, Math.round(r.sY + 4), 56, 1);
      px(ctx, cx - 1, r.sY + 4, '#edab50', 2, 2);
    });
    const roll = dir === 'right' ? ell(ctx, cx, r.sY - 2.4, 3.6, 2) : ell(ctx, cx, r.sY - 2.6, w - 1.5, 2);
    cel(ctx, roll, spec.back.roll ?? '#c42430', { d: [0.6, 0.6], h: [0.5, 0.5] });
  },
  saw(ctx, spec, r, front) {
    const { dir } = r;
    if (dir === 'down' && front) return;
    if (dir === 'up' && !front) return;
    if (dir === 'right' && front) return;
    const x = dir === 'right' ? CX - 6 : dir === 'up' ? CX - 4 : CX + 4;
    const blade = poly(ctx, [[x - 1.6, r.sY - 7], [x + 1.6, r.sY - 6], [x + 3, r.wY + 2], [x - 0.6, r.wY + 2]], true);
    cel(ctx, blade, '#b4b4b4', { d: [0.6, 0.6], h: [0.4, 0.4] });
    inside(ctx, blade, () => { for (let y = r.sY - 6; y < r.wY + 2; y += 2) px(ctx, x + 2 + (y - r.sY) * 0.06, y, '#5d5d5d', 1, 1); });
    cel(ctx, poly(ctx, [[x - 2.4, r.sY - 10], [x + 2, r.sY - 9.4], [x + 1.6, r.sY - 6], [x - 2, r.sY - 6.6]], true), '#8a4836', { d: [0.5, 0.5], h: [0.4, 0.4] });
  }
};

// ---------------------------------------------------------------- montagem

export function paintPerson(ctx, spec, { dir = 'down', phase = null, breath = 0, blink = false } = {}) {
  const r = rig(spec, dir, phase, breath);
  r.skin = spec.skin;
  r.holding = Boolean(spec.prop && ['spear', 'staff', 'pitchfork', 'oar', 'broom', 'bow'].includes(spec.prop.kind));
  const hat = spec.hat;
  const propFn = spec.prop ? (c, hand, rr) => PROPS[spec.prop.kind](c, hand, { ...rr, skin: spec.gloves ?? spec.skin }, { ...spec.prop, skin: spec.gloves ?? spec.skin }) : null;
  const propSide = dir === 'up' ? -1 : 1;

  // 1. Atrás de tudo: capa, cabelo comprido, capuz, coisas nas costas.
  cape(ctx, spec, r, false);
  hairBack(ctx, spec, r);
  if (hat?.kind === 'hood') HATS.hood(ctx, spec, r, hat, true);
  if (spec.back) BACKS[spec.back.kind](ctx, spec, r, false);
  // Prop longo segurado atrás (de costas): a lança passa atrás do corpo.
  if (dir === 'right') {
    arm(ctx, spec, r, -1, { dark: true });
    legs(ctx, spec, r, true);
  }
  // 2. Pernas.
  legs(ctx, spec, r, false);
  // 3. Tronco e camadas.
  const path = torso(ctx, spec, r);
  // Sombra do queixo no peito (oclusão), antes das camadas.
  if (dir !== 'up') inside(ctx, path, () => fill(ctx, ell(ctx, r.head.x + (dir === 'right' ? 0.6 : 0.4), r.sY - 0.2, 3.6, 1.6), R(spec.body?.color ?? spec.shirt ?? '#8a4836')[1]));
  for (const L of spec.layers ?? []) LAYERS[L.kind](ctx, spec, r, L, path);
  const capeUp = cape(ctx, spec, r, true);
  if (dir === 'up') {
    const c = spec.cape && cape(ctx, spec, { ...r, dir: 'up' }, false);
    if (c) {
      cel(ctx, c.p, c.color, { d: [1.4, 1.2], h: [0.8, 0.7] });
      inside(ctx, c.p, () => {
        for (const dx of [-4, 0, 4]) stroke(ctx, [[CX + dx * 0.6, r.sY + 3], [CX + dx * 1.2, FOOT - 4]], 0.9, R(c.color)[1]);
        stroke(ctx, [[CX - 6, r.sY + 4], [CX - 7, FOOT - 6]], 0.7, R(c.color)[3]);
      });
    }
  }
  void capeUp;
  if (spec.back) BACKS[spec.back.kind](ctx, spec, r, true);
  // 4. Braços.
  if (dir === 'right') {
    arm(ctx, spec, r, 1, { prop: propFn });
  } else {
    arm(ctx, spec, r, -propSide, {});
    arm(ctx, spec, r, propSide, { prop: propFn });
  }
  // 5. Pescoço e cabeça.
  const { head, B } = r;
  const neck = dir === 'right' ? limb(ctx, [head.x - 0.6, head.y + 5], [head.x - 0.4, r.sY + 0.5], 3.6, 3.6) : limb(ctx, [head.x, head.y + 5], [head.x, r.sY + 0.4], 4.2, 4.2);
  fill(ctx, neck, R(spec.skin)[1]);
  hairMass(ctx, spec, r);
  if (dir !== 'up') {
    for (const side of dir === 'right' ? [] : [-1, 1]) {
      cel(ctx, ell(ctx, head.x + side * (B.rx - 0.2), eyeRow(r) + 1.2, 1.4, 1.9), spec.skin, { d: [0.5, 0.5], h: [0.3, 0.3] });
    }
    const facePath = dir === 'right'
      ? poly(ctx, [[head.x - 4, head.y - 5], [head.x + 3, head.y - 5.8], [head.x + 6.4, head.y - 2], [head.x + 7.2, head.y + 3.2], [head.x + 6.4, head.y + 4.6], [head.x + 5.4, head.y + 7], [head.x + 2, head.y + 8.2], [head.x - 3, head.y + 7], [head.x - 5, head.y + 2]], true)
      : poly(ctx, [[head.x - B.rx + 0.4, head.y - 3], [head.x - 3, head.y - 6], [head.x + 3, head.y - 6], [head.x + B.rx - 0.4, head.y - 3], [head.x + B.rx - 0.2, head.y + 2.6], [head.x + 4, head.y + 7.4], [head.x, head.y + 8.6], [head.x - 4, head.y + 7.4], [head.x - B.rx + 0.2, head.y + 2.6]], true);
    cel(ctx, facePath, spec.skin, { d: [1.1, 1], h: [0.7, 0.6] });
  } else {
    cel(ctx, ell(ctx, head.x, head.y + 0.4, B.rx - 0.2, B.ry - 0.2), spec.skin, { d: [1, 1], h: [0.6, 0.6] });
    for (const side of [-1, 1]) cel(ctx, ell(ctx, head.x + side * (B.rx - 0.2), eyeRow(r) + 1.2, 1.4, 1.9), spec.skin, { d: [0.5, 0.5], h: [0.3, 0.3] });
  }
  if (hat?.kind !== 'hood') {
    hairFront(ctx, spec, r);
  }
  face(ctx, spec, r, blink);
  beard(ctx, spec, r);
  if (hat) {
    HATS[hat.kind](ctx, spec, r, hat, false);
    if (hat.mask) HATS.mask(ctx, spec, r, { color: hat.mask });
  }
  if (spec.extra) spec.extra(ctx, r);
}
