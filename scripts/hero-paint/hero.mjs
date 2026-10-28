// Pintor do herói (Fase 22): cavaleiro e heroína em quadros 56 x 64, sem arma desenhada (a arma é um sprite
// à parte posto em hands[coluna]) e sem sombra no chão. Mesmo kit dos NPCs (scripts/npc-paint/kit.mjs).
//
// paintHero(ctx, spec, { dir: 'down'|'right'|'up', flip, col, hand: [x, y], bob })
//   flip = true: o contexto já vem espelhado (perfil esquerdo): a geometria é espelhada, mas a luz continua
//   vindo do alto à esquerda (os crescentes de luz/sombra do `cel` são invertidos aqui) e a mão de arma
//   continua do lado da câmera. `hand` é o ponto de arma em coordenadas do contexto.
import { R, cel, ell, inside, limb, poly, px, stroke } from '../npc-paint/kit.mjs';

const CX = 28;
const FOOT = 62;
const INK = '#1c121c';
let FLIP = false;
const C = (ctx, p, color, o = {}) => {
  const { d = [1.2, 1.1], h = [0.8, 0.8], light = true } = o;
  cel(ctx, p, color, { d: [FLIP ? -d[0] : d[0], d[1]], h: [FLIP ? -h[0] : h[0], h[1]], light });
};
const lerp = (a, b, t) => a + (b - a) * t;

const STEEL = '#8c95a4';
const STEEL_DK = '#5d6676';
const STEEL_LT = '#c1c8d2';
const ARMOR = '#68727f';
const LEATHER = '#6a4228';
const GOLD = '#d99a2b';

export const SPECS = {
  knight: { id: 'knight', cape: '#b8231d', accent: '#b8231d', plume: '#b8231d', tabard: '#e3e7ee', cross: '#b8231d', skirt: null, hair: null, waist: 0 },
  heroine: { id: 'heroine', accent: '#a8309a', plume: null, tabard: null, cross: '#a8309a', skirt: '#7a3a8a', hair: '#d99a2b', waist: 0.9, face: true, skin: '#f6ca9f', iris: '#3b5dc9' }
};

// lean: [para a frente, para cima]; stance: pernas; squint/blink: viseira; tilt: inclinação da cabeça (graus).
const POSES = {
  4: { lean: [0, -1] },
  5: { lean: [0.3, 0] },
  6: { lean: [0, 0] },
  7: { lean: [-1.6, 0.4], stance: 'windup' },
  8: { lean: [3, -1.2], stance: 'strike' },
  9: { lean: [1.3, -0.4], stance: 'recover' },
  10: { lean: [-3, 0], tilt: 11, stance: 'hurt', squint: true },
  11: { lean: [0, 0], blink: true }
};
// Mão livre (contrapeso): [para fora (frente/costas) ou para frente (perfil), y].
const FREE_FRONT = { 4: [10.8, 41], 5: [10.8, 40], 6: [10.8, 40], 7: [13.5, 31], 8: [11.5, 37], 9: [10.8, 40], 10: [14, 32], 11: [10.8, 40] };
const FREE_SIDE = { 4: [1, 41], 5: [1, 40], 6: [0, 40], 7: [6, 32], 8: [-7.5, 38], 9: [-3, 40], 10: [-8, 33], 11: [1, 40] };

function rig(dir, col, bob) {
  const walking = col <= 3;
  const p = walking ? col : 1;
  const s = [1, 0, -1, 0][p];
  const pose = POSES[col] ?? { lean: [0, 0] };
  const [fwd, rise] = pose.lean;
  const side = dir === 'right';
  const ux = side ? fwd : (pose.tilt ? 2 : 0);
  const uy = (side ? 0 : dir === 'up' ? -fwd * 0.55 : fwd * 0.55) - rise + bob;
  return { dir, col, walking, p, s, pose, bob, side, ux, uy, sY: 25.5 + uy, head: { x: CX + (side ? fwd * 1.1 : ux), y: 13.5 + uy }, hipY: 43 + bob };
}

// Cotovelo (dois ossos): escolhe a dobra que mais se afasta do corpo.
function ik(S, H, outward) {
  const dx = H[0] - S[0]; const dy = H[1] - S[1];
  const d = Math.hypot(dx, dy) || 0.01;
  let L1 = 9.4; let L2 = 9;
  if (d > L1 + L2 - 0.3) { const k = (d + 0.3) / (L1 + L2); L1 *= k; L2 *= k; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0.2, L1 * L1 - a * a));
  const ux = dx / d; const uy = dy / d;
  const c1 = [S[0] + ux * a - uy * h, S[1] + uy * a + ux * h];
  const c2 = [S[0] + ux * a + uy * h, S[1] + uy * a - ux * h];
  return outward(c1) >= outward(c2) ? c1 : c2;
}

// ---------------------------------------------------------------- pernas
function boot(ctx, x, y, dir, dark) {
  const col = dark ? R(STEEL_DK)[1] : STEEL_DK;
  if (dir === 'right') {
    const p = poly(ctx, [[x - 3.2, y - 5], [x + 2.4, y - 5], [x + 3, y - 2.4], [x + 5.8, y - 1.4], [x + 6, y], [x - 3.2, y]], true);
    C(ctx, p, col, { d: [0.6, 1.1], h: [0.6, 0.6] });
    px(ctx, x - 3, y - 1, R(STEEL_DK)[0], 9, 1);
  } else {
    const p = poly(ctx, [[x - 2.8, y - 5.5], [x + 2.8, y - 5.5], [x + 3.4, y - 1.6], [x + 3, y], [x - 3, y], [x - 3.4, y - 1.6]], true);
    C(ctx, p, col, { d: [0.9, 1], h: [0.7, 0.7] });
    px(ctx, x - 3, y - 1, R(STEEL_DK)[0], 6, 1);
  }
}

function leg(ctx, hip, foot, knee, dark) {
  const tone = (c) => (dark ? R(c)[1] : c);
  C(ctx, limb(ctx, hip, knee, 6.2, 5.2), tone(ARMOR), { d: [1, 0.6], h: [0.8, 0.5] });
  C(ctx, limb(ctx, knee, [foot[0], foot[1] - 4.5], 5, 4.4), tone(ARMOR), { d: [1, 0.6], h: [0.8, 0.5] });
  C(ctx, ell(ctx, knee[0], knee[1], 3, 2.6), tone(STEEL_LT), { d: [0.7, 0.8], h: [0.5, 0.5] });
}

function legsFront(ctx, r) {
  const { p, walking, pose } = r;
  let lf = [CX - 3.9, FOOT]; let rf = [CX + 3.9, FOOT];
  if (walking) {
    if (p === 1) lf = [lf[0] + 0.4, FOOT - 2.2];
    if (p === 3) rf = [rf[0] - 0.4, FOOT - 2.2];
  } else if (pose.stance === 'strike') { lf = [CX - 6, FOOT]; rf = [CX + 5, FOOT - 2.5]; }
  else if (pose.stance === 'windup') { lf = [CX - 4.6, FOOT]; rf = [CX + 4.6, FOOT]; }
  else if (pose.stance === 'hurt') { lf = [CX - 3, FOOT]; rf = [CX + 6.4, FOOT - 1.6]; }
  else if (pose.stance === 'recover') { lf = [CX - 5, FOOT]; rf = [CX + 4.6, FOOT - 0.6]; }
  for (const [hx, f, sx] of [[CX - 3.3, lf, -1], [CX + 3.3, rf, 1]]) {
    const h = [hx + r.ux * 0.2, r.hipY - 1];
    leg(ctx, h, f, [lerp(h[0], f[0], 0.55) + sx * 0.6, lerp(h[1], f[1] - 4, 0.55)], false);
    boot(ctx, f[0], f[1], 'down', false);
  }
}

function legsSide(ctx, r) {
  const { p, s, walking, pose } = r;
  let nearX = 2; let farX = -2; let nearLift = 0; let farLift = 0;
  if (walking) { nearX = s * 4.6 + 0.5; farX = -s * 4.6 - 0.5; if (p === 1) farLift = 2.2; if (p === 3) nearLift = 2.2; }
  if (pose.stance === 'strike') { nearX = 7; farX = -5.5; farLift = 0.8; }
  if (pose.stance === 'windup') { nearX = 2.2; farX = -2.6; }
  if (pose.stance === 'recover') { nearX = 5; farX = -3.6; }
  if (pose.stance === 'hurt') { nearX = 3.4; farX = -4.4; nearLift = 1.4; }
  const hip = [CX + r.ux * 0.2, r.hipY - 1];
  const draw = (fx, lift, dark) => {
    const f = [CX + fx, FOOT - lift];
    leg(ctx, hip, f, [lerp(hip[0], f[0], 0.5) + 1.6, lerp(hip[1], f[1] - 4, 0.5)], dark);
    boot(ctx, f[0], f[1], 'right', dark);
  };
  return { far: () => draw(farX, farLift, true), near: () => draw(nearX, nearLift, false) };
}

// ---------------------------------------------------------------- tronco
function torsoPath(ctx, spec, r) {
  const { dir, sY, hipY, ux } = r;
  const w = spec.waist;
  if (dir === 'right') {
    const back = CX - 6.2; const front = CX + 6;
    return poly(ctx, [[CX - 1.5 + ux, sY - 1.2], [CX + 2.4 + ux, sY - 1.2], [front + ux, sY + 3.5], [front + 0.4 + ux * 0.6, sY + 8], [front - 0.4 - w * 0.4, 37 + r.bob], [front, hipY], [back, hipY], [back + w * 0.4, 37 + r.bob], [back + ux * 0.5 - 0.4, sY + 7], [back + ux, sY + 1.8]], true);
  }
  return poly(ctx, [
    [CX - 3 + ux, sY - 1.4], [CX + 3 + ux, sY - 1.4], [CX + 9.4 + ux, sY - 0.2], [CX + 10 + ux, sY + 3], [CX + 8.6 + ux * 0.6, sY + 8],
    [CX + 7.6 - w, 37.4 + r.bob], [CX + 8.2, hipY], [CX - 8.2, hipY], [CX - 7.6 + w, 37.4 + r.bob],
    [CX - 8.6 + ux * 0.6, sY + 8], [CX - 10 + ux, sY + 3], [CX - 9.4 + ux, sY - 0.2]
  ], true);
}

function body(ctx, spec, r) {
  const { dir, sY } = r;
  const hemY = (spec.skirt ? 49.5 : 50.5) + r.bob * 0.5;
  const path = torsoPath(ctx, spec, r);
  C(ctx, path, ARMOR, { d: [1.5, 0.8], h: [0.9, 0.6] });
  const [, sh, , li] = R(STEEL);
  inside(ctx, path, () => {
    if (dir === 'up') {
      stroke(ctx, [[CX + r.ux, sY + 1], [CX + r.ux * 0.5, 38]], 0.9, sh);
      stroke(ctx, [[CX - 7, sY + 5], [CX - 5, 36]], 0.8, li);
    } else if (dir === 'down') stroke(ctx, [[CX - 8, sY + 6], [CX - 6.6, 37]], 0.7, li);
    else stroke(ctx, [[CX + 3.6, sY + 4], [CX + 4, 36]], 0.8, li);
  });
  const wy = Math.round(37.6 + r.bob);
  inside(ctx, path, () => {
    ctx.fillStyle = R(LEATHER)[2]; ctx.fillRect(0, wy - 1, 56, 2);
    ctx.fillStyle = R(LEATHER)[0]; ctx.fillRect(0, wy + 1, 56, 1);
    ctx.fillStyle = R(LEATHER)[3]; ctx.fillRect(0, wy - 1, 56, 0.6);
  });
  const sway = r.walking ? -r.s * 0.7 : 0;
  const cloth = spec.skirt ?? spec.tabard;
  const [cd, cs] = R(cloth);
  if (dir === 'right') {
    const pts = spec.skirt
      ? [[CX - 7.6, wy + 0.5], [CX + 7, wy + 0.5], [CX + 10 + sway, hemY], [CX - 10 + sway, hemY]]
      : [[CX - 6.6, wy + 0.5], [CX + 6, wy + 0.5], [CX + 7.2 + sway, hemY], [CX - 7.4 + sway, hemY]];
    const cp = poly(ctx, pts, true);
    C(ctx, cp, cloth, { d: [1.4, 0.8], h: [0.8, 0.5] });
    inside(ctx, cp, () => { ctx.fillStyle = cd; ctx.fillRect(0, hemY - 1.6, 56, 1.6); ctx.fillStyle = R(GOLD)[2]; ctx.fillRect(0, Math.round(hemY - 3), 56, 1); ctx.fillStyle = R(GOLD)[3]; ctx.fillRect(0, Math.round(hemY - 3), 56, 0.5); stroke(ctx, [[CX - 1, wy + 3], [CX - 1.6 + sway, hemY - 1]], 0.8, cs); });
  } else {
    const wide = spec.skirt ? 11 : 8.6;
    const cp = poly(ctx, [[CX - 7.8, wy + 0.5], [CX + 7.8, wy + 0.5], [CX + wide + sway * 0.4, hemY], [CX - wide + sway * 0.4, hemY]], true);
    C(ctx, cp, cloth, { d: [1.5, 0.8], h: [0.9, 0.5] });
    inside(ctx, cp, () => {
      ctx.fillStyle = cd; ctx.fillRect(0, hemY - 1.6, 56, 1.6); ctx.fillStyle = R(GOLD)[2]; ctx.fillRect(0, Math.round(hemY - 3), 56, 1); ctx.fillStyle = R(GOLD)[3]; ctx.fillRect(0, Math.round(hemY - 3), 56, 0.5);
      const folds = spec.skirt ? [-6, -2, 2.4, 6.4] : [-4.6, 4.6];
      folds.forEach((f, i) => stroke(ctx, [[CX + f * 0.55, wy + 3], [CX + f * 1.05 + (i % 2 ? 0.5 : -0.5), hemY - 1]], 0.9, cs));
    });
  }
  if (dir === 'down') {
    if (spec.tabard) {
      // Sobretudo do cavaleiro: tabardo claro sobre o peito com a cruz.
      const tp = poly(ctx, [[CX - 5.6 + r.ux * 0.4, sY + 1.6], [CX + 5.6 + r.ux * 0.4, sY + 1.6], [CX + 6.4, wy], [CX - 6.4, wy]], true);
      C(ctx, tp, spec.tabard, { d: [1.2, 0.8], h: [0.8, 0.6] });
    }
    inside(ctx, path, () => {
      const [dd, , cb, cl] = R(spec.cross);
      const x = Math.round(CX + r.ux * 0.4); const y0 = Math.round(sY + 3);
      ctx.fillStyle = cb; ctx.fillRect(x - 1, y0, 2, 11); ctx.fillRect(x - 3, y0 + 3, 6, 2);
      ctx.fillStyle = cl; ctx.fillRect(x - 1, y0, 1, 10); ctx.fillRect(x - 3, y0 + 3, 2, 1);
      ctx.fillStyle = dd; ctx.fillRect(x, y0 + 10, 1, 1);
    });
    px(ctx, CX - 1.5, wy - 1, GOLD, 3, 2);
    px(ctx, CX - 1.5, wy - 1, R(GOLD)[3], 2, 1);
  }
  engrave(ctx, spec, r, path);
  return path;
}

// Gravuras douradas, frisos gravados e o brilho do metal polido no peitoral (as três direções).
function gilt(ctx, pts, w = 1.1) {
  const [, gs, gb, gl] = R(GOLD);
  stroke(ctx, pts, w + 0.3, gs);
  stroke(ctx, pts, w, gb);
  stroke(ctx, pts.map(([x, y]) => [x - 0.3, y - 0.35]), w * 0.5, gl);
}
function engrave(ctx, spec, r, path) {
  const { dir, sY, bob } = r;
  const ux = r.ux;
  const [, sh, , li, shine] = R(STEEL);
  inside(ctx, path, () => {
    if (dir === 'down') {
      // Gola dourada, volutas dos lados do peito, lâminas do ventre e o reflexo.
      gilt(ctx, [[CX - 6 + ux, sY - 0.6], [CX + ux, sY + 1.6], [CX + 6 + ux, sY - 0.6]]);
      for (const sd of [-1, 1]) {
        gilt(ctx, [[CX + sd * 8.6 + ux, sY + 2.4], [CX + sd * 7.4 + ux, sY + 7], [CX + sd * 5.2 + ux, sY + 9.2], [CX + sd * 4.6 + ux, sY + 7.2], [CX + sd * 5.8 + ux, sY + 6.4]], 0.9);
      }
      for (const yy of [33.2, 35.4]) stroke(ctx, [[CX - 9, yy + bob], [CX, yy + 1.2 + bob], [CX + 9, yy + bob]], 0.8, sh);
      stroke(ctx, [[CX - 9, 34.2 + bob], [CX, 35.4 + bob], [CX + 9, 34.2 + bob]], 0.6, li);
      stroke(ctx, [[CX - 6.6 + ux, sY + 2.6], [CX - 5.8 + ux, sY + 7.4]], 1.3, shine);
    } else if (dir === 'right') {
      gilt(ctx, [[CX + 0.4 + ux, sY - 0.8], [CX + 5.6 + ux, sY + 3.4], [CX + 6 + ux, sY + 8.6]]);
      gilt(ctx, [[CX - 1 + ux, sY + 4.4], [CX + 2.6 + ux, sY + 7.6], [CX + 1.4 + ux, sY + 9.4], [CX + 0.4 + ux, sY + 8]], 0.9);
      for (const yy of [33.2, 35.4]) stroke(ctx, [[CX - 7, yy + bob], [CX + 7, yy + 0.6 + bob]], 0.8, sh);
      stroke(ctx, [[CX - 3.4 + ux, sY + 2.4], [CX - 2.6 + ux, sY + 8]], 1.3, shine);
    } else {
      // Costas: espinha dourada e omoplatas gravadas.
      gilt(ctx, [[CX - 7 + ux, sY + 0.6], [CX + ux, sY + 2.4], [CX + 7 + ux, sY + 0.6]]);
      for (const sd of [-1, 1]) gilt(ctx, [[CX + sd * 2 + ux, sY + 4], [CX + sd * 6.4 + ux, sY + 5.6], [CX + sd * 6.8 + ux, sY + 9], [CX + sd * 4.4 + ux, sY + 9.6]], 0.9);
      stroke(ctx, [[CX + ux, sY + 3.6], [CX + ux * 0.5, 36]], 0.9, R(GOLD)[1]);
      stroke(ctx, [[CX - 7.4 + ux, sY + 3.4], [CX - 6.6 + ux, sY + 8]], 1.3, shine);
    }
  });
}

function pauldron(ctx, spec, r, x, dark) {
  const y = r.sY + 1.6 + (r.dir === 'right' ? 1 : 0);
  const col = dark ? STEEL_DK : STEEL_LT;
  C(ctx, ell(ctx, x, y, r.dir === 'right' ? 3.8 : 4.8, 3.9), col, { d: [1, 1], h: [0.8, 0.7] });
  if (!dark) {
    const rx = r.dir === 'right' ? 3.8 : 4.8;
    const pp = ell(ctx, x, y, rx, 3.9);
    inside(ctx, pp, () => {
      const [, gs, gb] = R(GOLD);
      ctx.save(); ctx.beginPath(); ctx.rect(x - 8, y + 0.8, 16, 8); ctx.clip();
      ctx.strokeStyle = gs; ctx.lineWidth = 2.2; ctx.stroke(pp);
      ctx.strokeStyle = gb; ctx.lineWidth = 1.3; ctx.stroke(pp);
      ctx.restore();
      px(ctx, x - 0.5, y - 0.5, R(GOLD)[3], 1, 1);
      stroke(ctx, [[x - rx + 1.2, y + 0.6], [x + rx - 1.2, y + 0.6]], 0.8, R(STEEL_LT)[1]);
    });
    px(ctx, x - 2, y - 2, R(STEEL_LT)[4], 3, 1);
    px(ctx, x - 1, y - 1, R(STEEL_LT)[4], 1, 1);
  }
}

function arm(ctx, spec, r, S, H, dark) {
  const out = (pt) => (r.dir === 'right' ? pt[1] - pt[0] * 0.3 : Math.abs(pt[0] - CX) + pt[1] * 0.05);
  const E = ik(S, H, out);
  const tone = (c) => (dark ? R(c)[1] : c);
  C(ctx, limb(ctx, S, E, 5.4, 4.8), tone(ARMOR), { d: [1, 0.6], h: [0.7, 0.5] });
  C(ctx, limb(ctx, E, [H[0], H[1] - 0.6], 4.8, 4.2), tone(STEEL), { d: [1, 0.6], h: [0.7, 0.5] });
  C(ctx, ell(ctx, E[0], E[1], 2.6, 2.4), tone(STEEL_LT), { d: [0.6, 0.6], h: [0.5, 0.5] });
  px(ctx, H[0] - 2, H[1] - 3.4, R(spec.accent)[1], 4, 1);
  C(ctx, ell(ctx, H[0], H[1], 2.5, 2.5), tone(STEEL_DK), { d: [0.7, 0.7], h: [0.5, 0.5] });
}

function shield(ctx, spec, hand, back) {
  const [x, y] = hand;
  const p = poly(ctx, [[x - 4.2, y - 9.4], [x + 4.2, y - 9.4], [x + 4.4, y - 3], [x, y + 3.6], [x - 4.4, y - 3]], true);
  C(ctx, p, back ? STEEL : STEEL_LT, { d: [1, 1], h: [0.8, 0.8] });
  inside(ctx, p, () => {
    ctx.strokeStyle = R(STEEL)[1]; ctx.lineWidth = 1; ctx.stroke(p);
    if (!back) {
      const [, , cb, cl] = R(spec.cross);
      ctx.fillStyle = cb; ctx.fillRect(Math.round(x) - 1, y - 7, 2, 9); ctx.fillRect(Math.round(x) - 3, y - 4, 6, 2);
      ctx.fillStyle = cl; ctx.fillRect(Math.round(x) - 1, y - 7, 1, 8);
    }
  });
}

// ---------------------------------------------------------------- cabeça
function plume(ctx, spec, r, base, sway) {
  const { dir } = r;
  let tip; let ctrl;
  if (dir === 'right') { tip = [base[0] - 11 - sway, base[1] - 3 + sway * 0.3]; ctrl = [base[0] - 5, base[1] - 7]; }
  else { tip = [base[0] + 9 + sway, base[1] - 5 + (dir === 'up' ? 1.5 : 0)]; ctrl = [base[0] + 3, base[1] - 6.5]; }
  const p = new ctx.Path2D();
  p.moveTo(base[0] - 2.4, base[1] + 0.8);
  p.quadraticCurveTo(ctrl[0] - 1, ctrl[1] - 2, tip[0], tip[1]);
  p.quadraticCurveTo(ctrl[0] + 1, ctrl[1] + 3.2, base[0] + 2.4, base[1] + 0.8);
  p.closePath();
  C(ctx, p, spec.plume, { d: [1, 1.2], h: [0.8, 0.8] });
  inside(ctx, p, () => {
    stroke(ctx, [[base[0], base[1]], [ctrl[0], ctrl[1] + 0.6], tip], 0.8, R(spec.plume)[3]);
    stroke(ctx, [[base[0] + 1.6, base[1] + 0.6], [ctrl[0] + 1, ctrl[1] + 2], [tip[0] - 0.6, tip[1] + 1]], 0.7, R(spec.plume)[1]);
  });
}

function hairBack(ctx, spec, r, sway) {
  const { head, dir, sY } = r;
  const col = spec.hair;
  if (dir === 'right') {
    const p = poly(ctx, [[head.x - 5, head.y + 2], [head.x - 8.8 - sway, head.y + 10], [head.x - 9.6 - sway * 1.4, sY + 12], [head.x - 6.4 - sway, sY + 17], [head.x - 3.4, sY + 12], [head.x - 3.2, head.y + 8]], true);
    C(ctx, p, col, { d: [1, 1], h: [0.8, 0.8] });
    inside(ctx, p, () => { stroke(ctx, [[head.x - 6, head.y + 6], [head.x - 7.6 - sway, sY + 10]], 0.8, R(col)[1]); stroke(ctx, [[head.x - 5, head.y + 5], [head.x - 5.4 - sway * 0.6, sY + 11]], 0.7, R(col)[3]); });
  } else {
    const p = poly(ctx, [[head.x - 7, head.y + 2], [head.x + 7, head.y + 2], [head.x + 7.6 + sway * 0.6, sY + 6], [head.x + 5.6 + sway, sY + 17], [head.x + 2 + sway, sY + 19], [head.x - 2, sY + 17], [head.x - 6 + sway, sY + 14], [head.x - 7.6, sY + 6]], true);
    C(ctx, p, col, { d: [1.5, 1.2], h: [1, 0.8] });
    inside(ctx, p, () => {
      for (const dx of [-4.6, -1.4, 1.8, 4.8]) stroke(ctx, [[head.x + dx, head.y + 7], [head.x + dx * 1.15 + sway * 0.5, sY + 17]], 0.9, R(col)[1]);
      stroke(ctx, [[head.x - 5.8, head.y + 6], [head.x - 6.2, sY + 10]], 0.7, R(col)[3]);
    });
  }
}

function hairLocks(ctx, spec, r, sway) {
  const { head, sY } = r;
  for (const side of [-1, 1]) {
    const x = head.x + side * 7.8;
    const p = poly(ctx, [[x - 1.8, head.y + 1], [x + 1.8, head.y + 1], [x + 2.2 + side * 0.4, sY + 6 + sway * side * 0.3], [x, sY + 9.6 + sway * side * 0.3], [x - 2.2 - side * 0.4, sY + 6]], true);
    C(ctx, p, spec.hair, { d: [0.9, 1], h: [0.7, 0.7] });
    inside(ctx, p, () => stroke(ctx, [[x - 0.4, head.y + 3], [x + 0.2, sY + 7]], 0.7, R(spec.hair)[1]));
  }
}

// Heroína de rosto à mostra: cabelo dourado comprido, tiara com gema, olhos, sobrancelhas e boca na grade.
function hairBehindFront(ctx, spec, r, sway) {
  const { head: hd, sY } = r;
  const p = poly(ctx, [[hd.x - 8.4, hd.y - 2], [hd.x + 8.4, hd.y - 2], [hd.x + 9.8 + sway * 0.4, sY + 3], [hd.x + 9.6 + sway * 0.6, sY + 9], [hd.x + 7, sY + 11.4], [hd.x - 7, sY + 11.4], [hd.x - 9.6 + sway * 0.6, sY + 9], [hd.x - 9.8 + sway * 0.4, sY + 3]], true);
  C(ctx, p, R(spec.hair)[1], { d: [1.2, 1.2], h: [0.6, 0.6] });
}

function faceHead(ctx, spec, r, sway) {
  const { dir, head: hd, sY } = r;
  const squint = r.pose.squint; const blink = r.pose.blink;
  const skin = spec.skin; const hair = spec.hair;
  const [hdp, hsh, , hli, hshine] = R(hair);
  const [, ssh, , sli] = R(skin);
  const [gdp, gs, gb, gl] = R(GOLD);
  const top = hd.y - 8.2;
  const ey = Math.round(hd.y + 1.4);
  ctx.save();
  if (r.pose.tilt) { ctx.translate(hd.x, hd.y + 6); ctx.rotate((r.pose.tilt * Math.PI) / 180); ctx.translate(-hd.x, -(hd.y + 6)); }
  if (dir !== 'down') hairBack(ctx, spec, r, sway);
  // Pescoço.
  if (dir !== 'up') C(ctx, limb(ctx, [hd.x + (dir === 'right' ? -0.6 : 0), hd.y + 5], [hd.x + (dir === 'right' ? -0.8 : 0), sY - 1.6], 3.8, 4), skin, { d: [0.6, 0.6], h: [0.3, 0.3] });
  if (dir === 'up') {
    const p = ell(ctx, hd.x, hd.y - 0.4, 7.6, 8.2);
    C(ctx, p, hair, { d: [1.5, 1.3], h: [1, 0.9] });
    inside(ctx, p, () => {
      for (const dx of [-5, -2.4, 0.2, 2.8, 5.2]) stroke(ctx, [[hd.x + dx * 0.4, top + 1.2], [hd.x + dx, hd.y + 8]], 0.85, hsh);
      stroke(ctx, [[hd.x - 5, top + 3], [hd.x - 1.6, top + 1.4], [hd.x + 1.4, top + 1.3]], 1, hli);
      px(ctx, hd.x - 3, top + 2, hshine, 2, 1);
      // Aro da tiara por trás.
      stroke(ctx, [[hd.x - 8, hd.y - 2.4], [hd.x, hd.y - 1], [hd.x + 8, hd.y - 2.4]], 1.1, gs);
      stroke(ctx, [[hd.x - 8, hd.y - 2.8], [hd.x, hd.y - 1.4], [hd.x + 8, hd.y - 2.8]], 0.6, gb);
    });
    ctx.restore();
    return;
  }
  if (dir === 'right') {
    const face = poly(ctx, [[hd.x - 5.6, hd.y - 4], [hd.x - 2, hd.y - 7.6], [hd.x + 3, hd.y - 7.4], [hd.x + 5.8, hd.y - 4.2], [hd.x + 6.2, hd.y - 0.6], [hd.x + 7.6, hd.y + 2.2], [hd.x + 6.2, hd.y + 3.2], [hd.x + 6.4, hd.y + 4.8], [hd.x + 5, hd.y + 7.2], [hd.x + 1, hd.y + 7.8], [hd.x - 3, hd.y + 5.6], [hd.x - 5.6, hd.y + 1.6]], true);
    C(ctx, face, skin, { d: [1, 1], h: [0.5, 0.6] });
    // Cabelo: capa por trás da cabeça e franja.
    const cap = poly(ctx, [[hd.x - 7.6, hd.y + 6.4], [hd.x - 8.2, hd.y - 2], [hd.x - 4.4, top - 0.6], [hd.x + 3, top - 0.6], [hd.x + 6.8, hd.y - 4.4], [hd.x + 6.6, hd.y - 1.4], [hd.x + 4.2, hd.y - 3.4], [hd.x + 1.6, hd.y - 2.4], [hd.x + 0.2, hd.y + 0.4], [hd.x - 0.8, hd.y + 4], [hd.x - 3.4, hd.y + 6]], true);
    C(ctx, cap, hair, { d: [1.4, 1.2], h: [0.9, 0.8] });
    inside(ctx, cap, () => {
      stroke(ctx, [[hd.x - 6, top + 2.2], [hd.x - 1.6, hd.y - 4], [hd.x + 3, hd.y - 3.6]], 0.85, hsh);
      stroke(ctx, [[hd.x - 6.8, hd.y - 2], [hd.x - 5.6, hd.y + 4]], 0.85, hsh);
      stroke(ctx, [[hd.x - 3.4, hd.y - 1], [hd.x - 2.6, hd.y + 4.4]], 0.85, hdp);
      stroke(ctx, [[hd.x - 4, top + 1.6], [hd.x + 2, top + 1.2]], 1, hli);
      px(ctx, hd.x - 2, top + 1, hshine, 2, 1);
    });
    // Tiara.
    stroke(ctx, [[hd.x - 7.4, hd.y - 1.6], [hd.x - 1, hd.y - 4.2], [hd.x + 5, hd.y - 5]], 1.2, gs);
    stroke(ctx, [[hd.x - 7.4, hd.y - 2], [hd.x - 1, hd.y - 4.6], [hd.x + 5, hd.y - 5.4]], 0.6, gl);
    px(ctx, hd.x + 3.6, hd.y - 6.6, R(spec.accent)[2], 2, 2);
    px(ctx, hd.x + 3.6, hd.y - 6.6, R(spec.accent)[4], 1, 1);
    // Orelha, olho, nariz, boca.
    C(ctx, ell(ctx, hd.x - 1.4, ey + 1.4, 1.3, 1.8), skin, { d: [0.5, 0.5], h: [0.3, 0.3] });
    px(ctx, hd.x - 1.5, ey + 1, ssh, 1, 1);
    const ex = Math.round(hd.x + 3);
    if (blink) px(ctx, ex, ey + 1, INK, 3, 1);
    else if (squint) { px(ctx, ex, ey + 1, INK, 3, 1); px(ctx, ex + 1, ey - 1, hdp, 2, 1); }
    else {
      px(ctx, ex, ey, INK, 2, 2);
      px(ctx, ex + 1, ey + 1, spec.iris, 1, 1);
      px(ctx, ex + 1, ey, '#f9e6cf', 1, 1);
      px(ctx, ex - 1, ey - 1, INK, 2, 1);
      px(ctx, ex, ey - 3, hdp, 3, 1);
    }
    px(ctx, Math.round(hd.x + 5), ey + 4, '#a8304a', 2, 1);
    px(ctx, Math.round(hd.x + 2), ey + 3, '#e69c69', 2, 1);
    ctx.restore();
    return;
  }
  // De frente.
  const face = ell(ctx, hd.x, hd.y + 0.8, 6.6, 7.4);
  C(ctx, face, skin, { d: [1.1, 1], h: [0.6, 0.6] });
  inside(ctx, face, () => { px(ctx, hd.x + 4.4, hd.y + 1, ssh, 2, 5); });
  // Olhos (2x2 com brilho e íris), cílios, sobrancelhas.
  const lx = Math.round(hd.x - 4); const rx = Math.round(hd.x + 2);
  for (const [x, outer] of [[lx, -1], [rx, 1]]) {
    if (blink) { px(ctx, x, ey + 1, INK, 2, 1); continue; }
    if (squint) { px(ctx, x, ey + 1, INK, 2, 1); px(ctx, outer < 0 ? x : x, ey - 1, hdp, 2, 1); continue; }
    px(ctx, x, ey, INK, 2, 2);
    px(ctx, x, ey, '#f9e6cf', 1, 1);
    px(ctx, x + 1, ey + 1, spec.iris, 1, 1);
    px(ctx, outer < 0 ? x - 1 : x + 2, ey - 1, INK, 1, 1);
    px(ctx, outer < 0 ? x - 1 : x, ey - 2, hsh, 3, 1);
  }
  px(ctx, Math.round(hd.x), ey + 3, ssh, 1, 1);
  px(ctx, Math.round(hd.x - 1), ey + 5, '#a8304a', 2, 1);
  px(ctx, lx - 1, ey + 3, '#e69c69', 2, 1); px(ctx, rx + 1, ey + 3, '#e69c69', 2, 1);
  // Cabelo: topo com risca de lado e franja em mechas.
  const fy = hd.y - 1.6;
  const cap = poly(ctx, [[hd.x - 8, hd.y + 4], [hd.x - 8.2, hd.y - 3.6], [hd.x - 4.4, top - 0.6], [hd.x + 4.4, top - 0.6], [hd.x + 8.2, hd.y - 3.6], [hd.x + 8, hd.y + 4],
    [hd.x + 6.4, hd.y - 0.6], [hd.x + 5, fy - 1.4], [hd.x + 2.6, fy + 0.2], [hd.x + 0.6, fy - 1.6], [hd.x - 2, fy - 0.2], [hd.x - 4, fy - 1.8], [hd.x - 5.6, fy + 0.4], [hd.x - 6.6, hd.y]], true);
  C(ctx, cap, hair, { d: [1.2, 1.2], h: [0.8, 0.9] });
  inside(ctx, cap, () => {
    for (const lxx of [-4.6, -1.6, 1.6, 4.6]) stroke(ctx, [[hd.x + lxx * 0.3 + 1, top + 0.8], [hd.x + lxx, fy - 0.4]], 0.85, hsh);
    stroke(ctx, [[hd.x - 7.6, hd.y - 1.5], [hd.x - 7, hd.y + 3]], 0.8, hsh);
    stroke(ctx, [[hd.x + 7.6, hd.y - 1.5], [hd.x + 7, hd.y + 3]], 0.8, hdp);
    stroke(ctx, [[hd.x - 5, top + 2.8], [hd.x - 2, top + 1.3], [hd.x + 1.4, top + 1.1]], 1, hli);
    px(ctx, hd.x - 4, top + 2, hshine, 2, 1);
  });
  // Tiara dourada com gema.
  stroke(ctx, [[hd.x - 7.6, hd.y - 3.2], [hd.x, hd.y - 5.4], [hd.x + 7.6, hd.y - 3.2]], 1.2, gs);
  stroke(ctx, [[hd.x - 7.6, hd.y - 3.6], [hd.x, hd.y - 5.8], [hd.x + 7.6, hd.y - 3.6]], 0.6, gl);
  px(ctx, Math.round(hd.x) - 1, Math.round(hd.y - 7), gb, 2, 1);
  px(ctx, Math.round(hd.x) - 1, Math.round(hd.y - 6.6), R(spec.accent)[2], 2, 2);
  px(ctx, Math.round(hd.x) - 1, Math.round(hd.y - 6.6), R(spec.accent)[4], 1, 1);
  void gdp;
  hairLocks(ctx, spec, r, sway);
  ctx.restore();
}

function head(ctx, spec, r, sway) {
  if (spec.face) { faceHead(ctx, spec, r, sway); return; }
  const { dir, head: hd } = r;
  const squint = r.pose.squint; const blink = r.pose.blink;
  const hx = Math.round(hd.x);
  ctx.save();
  if (r.pose.tilt) { ctx.translate(hd.x, hd.y + 6); ctx.rotate((r.pose.tilt * Math.PI) / 180); ctx.translate(-hd.x, -(hd.y + 6)); }
  if (spec.hair && dir !== 'down') hairBack(ctx, spec, r, sway);
  if (spec.plume) plume(ctx, spec, r, [hd.x + (dir === 'right' ? -1 : 0), hd.y - 7.6], sway);
  if (dir === 'down' && spec.hair) hairLocks(ctx, spec, r, sway);
  const shape = dir === 'right'
    ? poly(ctx, [[hd.x - 6.6, hd.y - 3], [hd.x - 3, hd.y - 8], [hd.x + 3, hd.y - 8.4], [hd.x + 6.6, hd.y - 4.6], [hd.x + 7.6, hd.y + 1.4], [hd.x + 7.4, hd.y + 5.6], [hd.x + 5.4, hd.y + 8.6], [hd.x - 1, hd.y + 8.8], [hd.x - 5.8, hd.y + 6.2], [hd.x - 7.4, hd.y + 2]], true)
    : ell(ctx, hd.x, hd.y, 8.2, 8.7);
  C(ctx, ell(ctx, hd.x - (dir === 'right' ? 0.6 : 0), hd.y + 8, dir === 'right' ? 4 : 5.2, 2.6), STEEL_DK, { d: [0.6, 0.8], h: [0.5, 0.5] });
  C(ctx, shape, STEEL, { d: [1.6, 1.4], h: [1.1, 0.9] });
  inside(ctx, shape, () => {
    const [dp, sh, , li, shine] = R(STEEL);
    stroke(ctx, dir === 'right' ? [[hd.x - 6.8, hd.y - 4.2], [hd.x, hd.y - 6.2], [hd.x + 6.6, hd.y - 3.4]] : [[hd.x - 7, hd.y - 3.6], [hd.x, hd.y - 5.8], [hd.x + 7, hd.y - 3.6]], 0.9, sh);
    px(ctx, hd.x - 4.4, hd.y - 6.4, shine, 3, 1);
    // Elmo gravado: crista e testeira douradas, rebites e o reflexo vertical do aço polido.
    if (dir === 'down') {
      gilt(ctx, [[hd.x - 8, hd.y - 2.2], [hd.x, hd.y - 3.8], [hd.x + 8, hd.y - 2.2]], 1);
      gilt(ctx, [[hd.x, hd.y - 9], [hd.x, hd.y - 4]], 1.3);
      for (const sx of [-6, 5]) px(ctx, hx + sx, Math.round(hd.y + 3.6), R(GOLD)[2], 1, 1);
      stroke(ctx, [[hd.x - 5.4, hd.y - 5], [hd.x - 5.8, hd.y - 2.6]], 1, shine);
    } else if (dir === 'right') {
      gilt(ctx, [[hd.x - 7, hd.y - 2], [hd.x, hd.y - 2.8], [hd.x + 7.4, hd.y - 2.6]], 1);
      gilt(ctx, [[hd.x - 6, hd.y - 5.4], [hd.x - 1, hd.y - 8.4], [hd.x + 4, hd.y - 7.6]], 1.2);
      px(ctx, hx - 4, Math.round(hd.y + 4), R(GOLD)[2], 1, 1);
      stroke(ctx, [[hd.x - 4.8, hd.y - 4.6], [hd.x - 5.2, hd.y - 1.6]], 1, shine);
    } else {
      gilt(ctx, [[hd.x, hd.y - 9], [hd.x, hd.y + 8]], 1.2);
      gilt(ctx, [[hd.x - 8, hd.y - 1.2], [hd.x, hd.y - 0.2], [hd.x + 8, hd.y - 1.2]], 1);
    }
    const vy = Math.round(hd.y + 0.2);
    const slitH = blink ? 1 : squint ? 1 : 2;
    if (dir === 'down') {
      px(ctx, hd.x - 6.4, hd.y - 4, li, 1, 2);
      px(ctx, hx - 6, vy, INK, 12, slitH);
      if (!blink) { px(ctx, hx - 4, vy + (squint ? 0 : 1), shine, 2, 1); px(ctx, hx + 2, vy + (squint ? 0 : 1), shine, 2, 1); }
      if (squint) { px(ctx, hx - 6, vy - 1, INK, 3, 1); px(ctx, hx + 3, vy - 1, INK, 3, 1); }
      px(ctx, hx - 1, vy + 3, li, 1, 5); px(ctx, hx, vy + 3, sh, 1, 5);
      for (const sx of [-4, 3]) for (let k = 0; k < 2; k += 1) px(ctx, hx + sx, vy + 4 + k * 2, dp, 1, 1);
    } else if (dir === 'right') {
      px(ctx, hd.x - 6.2, hd.y - 3, li, 1, 2);
      px(ctx, hx, vy, INK, 8, slitH);
      if (!blink) px(ctx, hx + 3, vy + (squint ? 0 : 1), shine, 2, 1);
      if (squint) px(ctx, hx + 2, vy - 1, INK, 4, 1);
      px(ctx, hx + 4, vy + 3, sh, 1, 5);
      for (let k = 0; k < 2; k += 1) px(ctx, hx + 5, vy + 4 + k * 2, dp, 1, 1);
      stroke(ctx, [[hd.x - 2.4, hd.y - 3], [hd.x - 2.6, hd.y + 7]], 0.8, sh);
    } else {
      px(ctx, hd.x - 6.4, hd.y - 4, li, 1, 2);
      for (const dx of [-4, 3]) for (let k = 0; k < 3; k += 1) px(ctx, hx + dx, hd.y - 1 + k * 3, sh, 1, 1);
    }
  });
  ctx.restore();
}

// Capa curta do cavaleiro: atrás do corpo (frente/perfil) ou cobrindo as costas.
function cape(ctx, spec, r, sway) {
  const { dir, sY } = r;
  const [cdp, csh, , cli] = R(spec.cape);
  const hem = 54 + r.bob * 0.4;
  if (dir === 'right') {
    const p = poly(ctx, [[CX - 3.6, sY - 0.6], [CX - 0.6, sY + 1.4], [CX - 4 - sway * 0.8, hem], [CX - 9.6 - sway * 1.6, hem - 1.6], [CX - 8.6 - sway * 0.6, sY + 8], [CX - 6.4, sY + 1]], true);
    C(ctx, p, spec.cape, { d: [1.4, 1], h: [0.8, 0.6] });
    inside(ctx, p, () => { stroke(ctx, [[CX - 4.4, sY + 4], [CX - 7.4 - sway, hem - 1]], 0.9, csh); stroke(ctx, [[CX - 2.6, sY + 3], [CX - 4.6 - sway * 0.8, hem - 1]], 0.7, cli); });
    return;
  }
  if (dir === 'down') {
    const p = poly(ctx, [[CX - 9, sY + 1], [CX + 9, sY + 1], [CX + 11.6 + sway * 0.5, hem], [CX - 11.6 + sway * 0.5, hem]], true);
    C(ctx, p, csh, { d: [1, 0.8], h: [0.6, 0.5] });
    inside(ctx, p, () => { for (const f of [-9.6, 9.4]) stroke(ctx, [[CX + f * 0.9, sY + 6], [CX + f + sway * 0.4, hem - 1]], 0.8, cdp); });
    return;
  }
  const p = poly(ctx, [[CX - 9 + r.ux, sY - 0.4], [CX + 9 + r.ux, sY - 0.4], [CX + 10.8 + sway * 0.5, hem], [CX + 4 + sway * 0.5, hem + 1.2], [CX - 3 + sway * 0.5, hem + 0.4], [CX - 10.8 + sway * 0.5, hem]], true);
  C(ctx, p, spec.cape, { d: [1.6, 1], h: [1, 0.6] });
  inside(ctx, p, () => {
    for (const f of [-6, -2, 2.4, 6.4]) stroke(ctx, [[CX + f * 0.6 + r.ux, sY + 3], [CX + f + sway * 0.5, hem - 0.6]], 0.9, csh);
    for (const f of [-4, 0.2, 4.4]) stroke(ctx, [[CX + f * 0.6 + r.ux, sY + 4], [CX + f + sway * 0.5, hem - 2]], 0.6, cli);
    ctx.fillStyle = R(GOLD)[2]; ctx.fillRect(0, Math.round(sY), 56, 1);
  });
}

// ---------------------------------------------------------------- montagem
export function paintHero(ctx, spec, { dir = 'down', flip = false, col = 4, hand, bob = 0 } = {}) {
  FLIP = flip;
  const r = rig(dir, col, bob);
  const stance = r.pose.stance;
  const sway = (r.walking ? [1, 0, -1, 0][(col + 3) % 4] * 1.2 : stance === 'hurt' ? 1.6 : stance === 'strike' ? -1.4 : 0) + (stance === 'windup' ? 1 : 0);
  const side = r.side;
  const fr = side ? FREE_SIDE[col] : FREE_FRONT[col];
  const layerBack = (dir === 'down' && (col === 6 || col === 7)) || (dir === 'up' && col !== 6 && col !== 7) || (side && (col === 6 || col === 7));
  const farSign = dir === 'up' ? -1 : 1;
  const nearS = side ? [CX + 0.8 + r.ux, r.sY + 3.8] : [CX - farSign * 8.6 + r.ux * 0.6, r.sY + 3];
  const farS = side ? [CX + 1.6 + r.ux, r.sY + 3.4] : [CX + farSign * 8.6 + r.ux * 0.6, r.sY + 3];
  let freeH;
  if (side) freeH = col <= 3 ? [CX + 1 - (hand[0] - 29), 40] : [CX + fr[0], fr[1]];
  else freeH = col <= 3 ? [CX + farSign * 10.8 + r.ux * 0.6, 40 + (col === 0 ? -0.5 : col === 2 ? 0.5 : 0)] : [CX + farSign * fr[0] + r.ux * 0.6, fr[1]];

  if (side) {
    if (spec.cape) cape(ctx, spec, r, sway);
    arm(ctx, spec, r, farS, freeH, true);
    const L = legsSide(ctx, r);
    L.far();
    pauldron(ctx, spec, r, CX + 2.4 + r.ux, true);
    L.near();
    if (layerBack) arm(ctx, spec, r, nearS, hand, false);
    body(ctx, spec, r);
    if (!layerBack) arm(ctx, spec, r, nearS, hand, false);
    pauldron(ctx, spec, r, CX + 0.8 + r.ux, false);
  } else {
    if (spec.face && dir === 'down') hairBehindFront(ctx, spec, r, sway);
    if (spec.cape && dir === 'down') cape(ctx, spec, r, sway);
    if (layerBack) arm(ctx, spec, r, nearS, hand, false);
    legsFront(ctx, r);
    body(ctx, spec, r);
    if (spec.cape && dir === 'up') cape(ctx, spec, r, sway);
    if (!layerBack) arm(ctx, spec, r, nearS, hand, false);
    arm(ctx, spec, r, farS, freeH, false);
    shield(ctx, spec, freeH, dir === 'up');
    pauldron(ctx, spec, r, nearS[0] - farSign * 1.4, false);
    pauldron(ctx, spec, r, farS[0] + farSign * 1.4, false);
  }
  head(ctx, spec, r, sway);
}
