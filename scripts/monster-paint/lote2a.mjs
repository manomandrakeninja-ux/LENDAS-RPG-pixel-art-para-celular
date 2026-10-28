// Lote 2 (2a): rato, cobra, morcego, goblin, orc, urso, ent, sapo e zumbi repintados.
import { C, P, ell, eye, fill, furTex, glint, glow, hexA, horn, inside, limb, phaseOf, rand, rimWarm, scales, shade, stroke } from './kit.mjs';
import { leg } from './lote1.mjs';

const RIM = '#edab50';

/** Volume com degradê + luz de borda quente. */
function vol(ctx, path, ramp, box, o, opts = {}) {
  const { rim = true, rw = 0.85, rc = RIM, side = 'tl', ...rest } = opts;
  shade(ctx, path, ramp, box, rest);
  if (rim) rimWarm(ctx, path, box, rc, rw * o.px, { side, alpha: 0.9 });
}

function spline(pts, per = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k += 1) {
      const t = k / per; const t2 = t * t; const t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Tubo com volume (camadas do escuro ao claro, deslocadas para cima/esquerda), largura w0 -> w1. */
function tube(ctx, pts, w0, w1, ramp, per = 6) {
  const s = spline(pts, per);
  const n = s.length;
  const L = ramp.length;
  for (let k = 0; k < L; k += 1) {
    const fk = 1 - k * (0.8 / L);
    for (let i = 0; i < n - 1; i += 1) {
      const w = w0 + (w1 - w0) * (i / (n - 1));
      const off = w * 0.09 * k;
      stroke(ctx, [[s[i][0] - off * 0.5, s[i][1] - off], [s[i + 1][0] - off * 0.5, s[i + 1][1] - off]], w * fk, ramp[k]);
    }
  }
  return s;
}

const tri = (ctx, a, b, c, color) => fill(ctx, P(ctx, `M${a[0]},${a[1]} L${b[0]},${b[1]} L${c[0]},${c[1]} Z`), color);

// ---------------------------------------------------------------- Rato
const RAT = ['#1c121c', '#2d2e25', '#494834', '#775c5b', '#918275', '#b4b4b4'];
const RAT_FAR = ['#1c121c', '#1c121c', '#2d2e25', '#494834', '#775c5b'];
const PINK = ['#571c27', '#891e2b', '#c42430', '#f68187'];

function rat(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : -Math.abs(Math.sin(ph)) * 1.4;
  const tw = at ? -4 : Math.sin(ph) * 4;
  ctx.save();
  ctx.translate(at ? 3 : -1, bob);
  // Rabo longo e rosado.
  stroke(ctx, [[17, 49], [9, 53], [3, 48], [3, 38 + tw]], 3.8, '#a8434f');
  stroke(ctx, [[17, 48.4], [9, 52.2], [3.6, 47.6], [3.8, 38.6 + tw]], 2.4, '#f68187');
  const sw = (off) => (at ? 0 : Math.sin(ph + off) * 3.4);
  const pawLeg = (hx, hy, fx, ramp, w) => {
    const foot = [fx, 58.5 - bob];
    vol(ctx, limb(ctx, [hx, hy], foot, w, w * 0.7), ramp, [hx - 3, hy, 7, 12], o, { rim: false, ao: 0.3 });
    fill(ctx, ell(ctx, foot[0] + 1.6, foot[1] - 0.4, 3, 1.5), '#e69c69');
  };
  pawLeg(30, 48, 30 + sw(Math.PI), RAT_FAR, 5.4);
  pawLeg(44, 49, 45 + sw(0), RAT_FAR, 5);
  // Corpo curvado, com a anca alta.
  const body = P(ctx, 'M11,49 C8,38 17,29 28,29.5 C38,30 47,35 49,44 C50,51 44,54 38,54 L21,54 C15,54 12,52 11,49 Z');
  vol(ctx, body, RAT, [8, 29, 42, 26], o, { lx: 0.3, ly: 0.2, ao: 0.5 });
  furTex(ctx, body, [8, 29, 42, 26], [RAT[3], RAT[2]], { len: 2.8, lw: 1, step: 4, dx: -0.7, dy: 0.9, seed: 5 });
  inside(ctx, body, () => fill(ctx, ell(ctx, 32, 56, 15, 5), '#b4b4b4'));
  // Anca traseira.
  vol(ctx, ell(ctx, 21, 46, 8, 8), RAT, [13, 38, 16, 16], o, { ao: 0.3, rw: 1 });
  pawLeg(21, 50, 20 + sw(0), RAT, 6);
  pawLeg(38, 50, 39 + sw(Math.PI), RAT, 5.6);
  // Cabeça grande com focinho comprido.
  const head = P(ctx, 'M38,42 C37,34 43,31 49,32 C55,33 60,38 63,43 C63,47 57,49 51,49 C44,49 38.5,47 38,42 Z');
  vol(ctx, head, RAT, [37, 31, 26, 18], o, { lx: 0.3, ly: 0.2, ao: 0.45 });
  furTex(ctx, head, [37, 31, 26, 18], [RAT[3], RAT[2]], { len: 2.4, lw: 0.9, step: 4, dx: -0.7, seed: 11 });
  // Orelhas redondas e grandes.
  for (const [x, y, rx, ry, far] of [[48.5, 31, 5, 6, true], [41, 32, 6, 7.5, false]]) {
    vol(ctx, ell(ctx, x, y, rx, ry), far ? RAT_FAR : RAT, [x - rx, y - ry, rx * 2, ry * 2], o, { ao: 0.2, rim: !far, rw: 1 });
    fill(ctx, ell(ctx, x + 0.3, y + 0.8, rx * 0.62, ry * 0.68), far ? '#c45a6a' : '#f68187');
    fill(ctx, ell(ctx, x - 0.5, y, rx * 0.34, ry * 0.4), far ? '#f68187' : '#fdd2ed');
  }
  // Nariz rosa, dentes de roedor e boca.
  fill(ctx, ell(ctx, 62.4, 43, 2.5, 2.3), '#f68187');
  fill(ctx, ell(ctx, 61.6, 42.2, 0.9, 0.8), '#ffffff');
  if (at) {
    fill(ctx, P(ctx, 'M47,46 C52,45 58,45 62,46.4 C60,52 52,53 47,50 Z'), '#1c121c');
    fill(ctx, ell(ctx, 54, 50.5, 4, 1.4), '#c42430');
    tri(ctx, [55, 46], [58, 46.2], [56.8, 50], '#ffffff');
    tri(ctx, [50, 46], [53, 46], [51.4, 49], '#ffffff');
  } else {
    stroke(ctx, [[49, 46.4], [55, 47.4], [60, 46]], 1.1, '#1c121c');
    fill(ctx, P(ctx, 'M56,46.6 L59.2,46.2 L58.8,50.6 L56.2,50.8 Z'), '#f9e6cf');
    stroke(ctx, [[57.6, 46.6], [57.6, 50.4]], 0.5, '#918275');
  }
  // Olho vermelho de rato bravo.
  eye(ctx, 52, 39, 2.6, { iris: '#0e071b', pupil: '#0e071b', browTilt: 0.55 });
  // Bigodes claros.
  stroke(ctx, [[59, 44.6], [64, 41.6]], 1, '#c7cfdd');
  stroke(ctx, [[59, 46], [64, 47.4]], 1, '#c7cfdd');
  ctx.restore();
}

// ---------------------------------------------------------------- Cobra
const SNK = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];

function snake(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  const ring = (cx, cy, rx, ry, w, ramp, a0 = 0.4) => {
    const pts = [];
    for (let i = 0; i <= 12; i += 1) { const a = a0 + (i / 12) * Math.PI * 2.1; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return tube(ctx, pts, w, w, ramp);
  };
  // Cauda fina e anéis do corpo enrolado.
  tube(ctx, [[12, 53], [6, 51], [3, 46 + sw]], 4.4, 1.6, SNK);
  const lower = ring(25, 52, 11.6, 3.6, 9, SNK);
  const upper = ring(25, 46, 8, 3, 7.8, SNK, 1.3);
  const dia = (s, skip) => s.forEach(([x, y], i) => { if (i % skip === 0) fill(ctx, ell(ctx, x - 0.5, y - 1.8, 1.5, 1.1, 0.4), '#134c4c'); });
  dia(lower, 5);
  dia(upper, 5);
  // Pescoço subindo até a cabeça.
  const H = at ? [51, 32] : [42 + sw * 1.6, 17 + sw * 0.6];
  const neckPts = at ? [[35, 44], [43, 43], [49, 38], [H[0] - 2, H[1] + 1]] : [[32, 46], [40, 42], [34 + sw, 30], [H[0] - 4, H[1] + 6]];
  const neck = tube(ctx, neckPts, 9.4, 7.4, SNK);
  dia(neck, 5);
  // Barriga clara no pescoço.
  for (const [x, y] of neck.filter((_, i) => i % 3 === 1).slice(1)) stroke(ctx, [[x + 0.6, y + 0.4], [x + 3.4, y + 1.2]], 1.5, '#f6ca9f');
  for (const [x, y] of lower.filter((_, i) => i % 4 === 0)) fill(ctx, ell(ctx, x, y + 2.8, 1.6, 0.8), '#f6ca9f');
  // Cabeça com capuz de naja.
  ctx.save();
  ctx.translate(H[0], H[1]);
  ctx.scale(1.5, 1.5);
  ctx.rotate(at ? 0.55 : 0.12);
  const hood = P(ctx, 'M-4,-8 C-12,-9 -15,2 -10,12 C-6,14 -2,10 0,6 Z');
  vol(ctx, hood, SNK.slice(0, 5), [-14, -9, 14, 22], o, { ao: 0.2, rim: false });
  inside(ctx, hood, () => {
    fill(ctx, ell(ctx, -8, 2.5, 2.8, 4), '#f6ca9f');
    fill(ctx, ell(ctx, -8.2, 2.2, 1.2, 2), '#134c4c');
  });
  const head = P(ctx, 'M-7,-1 C-7,-6 -2,-8 4,-6.5 C9,-5.5 13,-2.5 13,0.5 C13,3.5 7,5 0,5 C-5,5 -7,3 -7,-1 Z');
  vol(ctx, head, SNK, [-7, -8, 20, 13], o, { ao: 0.35, rw: 1.1 });
  inside(ctx, head, () => {
    fill(ctx, P(ctx, 'M-6,2 C0,5.2 8,4.6 13,1.4 L13,6 L-6,6 Z'), '#f6ca9f');
    for (const [x, y] of [[-3, -4], [1, -5.4], [-0.5, -1.6]]) fill(ctx, ell(ctx, x, y, 1.2, 0.9), '#134c4c');
  });
  // Mandíbula aberta no ataque.
  if (at) {
    const jaw = P(ctx, 'M-1,3 C4,4 10,4.4 13,3 C11,9 4,11 -2,8 Z');
    shade(ctx, jaw, SNK, [-2, 3, 15, 8], { ao: 0.3 });
    fill(ctx, P(ctx, 'M0,2.6 C5,3.6 10,3.4 13,2.2 C11,6.6 5,8 0,6 Z'), '#571c27');
  }
  // Olho amarelo com pupila de fenda.
  fill(ctx, ell(ctx, 4.4, -2.4, 2.6, 2.3), '#ffeb57');
  fill(ctx, ell(ctx, 4.8, -2.3, 0.8, 2), '#0e071b');
  fill(ctx, ell(ctx, 3.6, -3.3, 0.7, 0.6), '#ffffff');
  stroke(ctx, [[1.2, -5.4], [4.8, -5], [8, -3.2]], 1.5, '#134c4c');
  // Presas e língua bifurcada.
  tri(ctx, [9, at ? 3.2 : 3.6], [11, at ? 3.4 : 3.6], [10.4, at ? 7.4 : 7], '#ffffff');
  const tl = at ? 7 : 4.6 + sw;
  stroke(ctx, [[12.6, 1.6], [15.4, 2.2]], 1.2, '#ea323c');
  stroke(ctx, [[15.2, 2.2], [15.4 + tl * 0.5, 0.6]], 1.1, '#ea323c');
  stroke(ctx, [[15.2, 2.2], [15.4 + tl * 0.5, 3.8]], 1.1, '#ea323c');
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- Morcego
const BAT = ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9'];
const BAT_FAR = ['#0e071b', '#0e071b', '#3b1443', '#622461', '#93388f'];
const MEM = ['#3b1443', '#622461', '#93388f', '#ca52c9', '#e08ae0'];
const MEM_FAR = ['#0e071b', '#3b1443', '#622461', '#93388f'];

const MEMB = ['#3b1443', '#622461', '#93388f', '#ca52c9', '#e6a0e6'];
const MEMB_FAR = ['#1c121c', '#3b1443', '#622461', '#93388f'];
const FURB = ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#775c5b'];

function batWing(ctx, o, far) {
  const S = [0, 0]; const E = [11, -9]; const W = [21, -12];
  const A = [31, -24]; const B = [37, -6]; const Cc = [30, 9]; const D = [19, 13]; const R = [4, 14];
  const mem = P(ctx, `M${S[0]},${S[1]} L${E[0]},${E[1]} L${W[0]},${W[1]} L${A[0]},${A[1]}
    Q${W[0] + 9},${W[1] + 1} ${B[0]},${B[1]} Q${B[0] - 7},${B[1] + 8} ${Cc[0]},${Cc[1]}
    Q${Cc[0] - 6},${Cc[1] + 1} ${D[0]},${D[1]} Q${D[0] - 7},${D[1] + 0.5} ${R[0]},${R[1]} Z`);
  shade(ctx, mem, far ? MEMB_FAR : MEMB, [-2, -24, 40, 38], { lx: 0.25, ly: 0.1, ao: 0.15 });
  const bone = far ? '#0e071b' : '#1c121c';
  inside(ctx, mem, () => {
    for (const t of [B, Cc, D]) stroke(ctx, [W, [(W[0] + t[0]) / 2, (W[1] + t[1]) / 2 + 0.6], t], 1.5, bone);
    stroke(ctx, [W, [(W[0] + R[0]) / 2 + 3, (W[1] + R[1]) / 2 + 1.4], R], 1.3, bone);
  });
  stroke(ctx, [S, E, W, A], 2.2, bone);
  fill(ctx, horn(ctx, W, [W[0] + 3, W[1] - 4], [A[0] + 1, A[1] - 3], 1.8), '#cba36f');
}

function bat(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const flap = at ? -0.9 : Math.sin(ph);
  const bob = at ? 0 : Math.cos(ph) * 1.6;
  ctx.save();
  ctx.translate(at ? 2 : 0, bob + 3);
  for (const [tx, sx, sy, far] of [[24, -0.72, 0.76, true], [40, 0.9, 0.9, false]]) {
    ctx.save();
    ctx.translate(tx, 33);
    ctx.scale(sx, sy);
    ctx.rotate(flap * 0.5 - 0.15);
    batWing(ctx, o, far);
    ctx.restore();
  }
  for (const x of [29.5, 36]) {
    stroke(ctx, [[x, 42], [x + 0.4, 46.4]], 2.2, '#391f21');
    stroke(ctx, [[x - 1.6, 47.8], [x + 0.4, 46.2], [x + 2.2, 47.8]], 1.3, '#cba36f');
  }
  // Corpo pequeno e peludo, barriga mais clara.
  const body = P(ctx, 'M25,37 C25,31 28,29 32,29 C37,29 40,32 40,37 C40,42 36,45 32.5,45 C28,45 25,42 25,37 Z');
  shade(ctx, body, FURB, [24, 29, 17, 17], { ao: 0.5 });
  furTex(ctx, body, [24, 29, 17, 17], ['#391f21', '#775c5b'], { len: 2.6, lw: 1, step: 3.2, dx: -0.4, seed: 7 });
  inside(ctx, body, () => fill(ctx, ell(ctx, 33, 40, 4.4, 5), '#775c5b'));
  // Orelhas grandes, bem separadas, com o miolo rosa.
  for (const [x, far] of [[26.6, true], [40, false]]) {
    const ear = P(ctx, `M${x - 4.8},22 C${x - 6},15 ${x - 4},8 ${x - 1},3.6 C${x + 2},8 ${x + 4.4},15 ${x + 4.6},22 Z`);
    shade(ctx, ear, far ? FURB.slice(0, 4) : FURB, [x - 6, 3, 11, 19], { ao: 0 });
    fill(ctx, P(ctx, `M${x - 2.6},21 C${x - 3.2},15 ${x - 1.8},10 ${x - 0.8},7.4 C${x + 0.8},11 ${x + 2.2},16 ${x + 2.4},21 Z`), far ? '#c42430' : '#f68187');
  }
  const head = P(ctx, 'M24.6,25.4 C24.6,19.6 28.4,17.6 33,17.6 C38,17.6 42.6,20 42.6,25.4 C42.6,30.6 38,33 33.4,33 C28.4,33 24.6,30.6 24.6,25.4 Z');
  shade(ctx, head, FURB, [24, 17, 19, 16], { ao: 0.3 });
  furTex(ctx, head, [24, 17, 19, 16], ['#391f21', '#775c5b'], { len: 2.2, lw: 0.9, step: 3.6, dx: -0.4, seed: 3 });
  // Focinho claro, olhos vermelhos brilhantes e presas.
  fill(ctx, ell(ctx, 38.6, 27.6, 4.2, 3.4), '#775c5b');
  fill(ctx, ell(ctx, 41.6, 26.4, 1.3, 1), '#0e071b');
  eye(ctx, 31.4, 23.6, 2.6, { iris: '#ea323c', browTilt: 0.5, brow: '#0e071b', pupil: '#ffeb57' });
  eye(ctx, 37.6, 22.8, 2.3, { iris: '#ea323c', browTilt: 0.5, brow: '#0e071b', pupil: '#ffeb57' });
  if (at) {
    fill(ctx, P(ctx, 'M33,29.4 C36,28.4 41,28.6 43,29.8 C42,34.6 37,35.4 33.6,33.4 Z'), '#1c121c');
    fill(ctx, ell(ctx, 38, 33.2, 3.2, 1.2), '#ea323c');
  } else {
    stroke(ctx, [[33.6, 29.8], [37.6, 30.8], [41.6, 29.6]], 1, '#0e071b');
  }
  tri(ctx, [34.8, 29.8], [37, 30], [36, at ? 34.4 : 33.6], '#ffffff');
  tri(ctx, [39.2, 29.4], [41.4, 29], [40.4, at ? 33.8 : 33], '#ffffff');
  ctx.restore();
}

// ---------------------------------------------------------------- Goblin
const GOB = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'];
const GOB_FAR = ['#134c4c', '#134c4c', '#1e6f50', '#33984b', '#5ac54f'];
const LEATHER = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];

function goblin(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.4;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  // Pernas finas e pés grandes.
  for (const [hx, s, far] of [[36, -1, true], [29, 1, false]]) {
    const fx = hx + (at ? s * 3 : sw * s * 4);
    const foot = [fx, 57 - bob];
    vol(ctx, limb(ctx, [hx, 44], [fx - 0.5, 53], 5.6, 4.2), far ? GOB_FAR : GOB, [hx - 4, 43, 8, 14], o, { ao: 0.3, rim: !far, rw: 1 });
    vol(ctx, limb(ctx, [fx - 0.5, 53], foot, 4.2, 4), far ? GOB_FAR : GOB, [fx - 4, 52, 8, 7], o, { ao: 0.3, rim: false });
    vol(ctx, ell(ctx, fx + 2.4, 57.4 - bob, 5, 2.3), far ? LEATHER.slice(0, 4) : LEATHER, [fx - 3, 54, 10, 5], o, { ao: 0, rim: false });
  }
  // Braço de lá com o punhal.
  const hand = at ? [52, 31] : [47 + sw * 1.4, 33];
  vol(ctx, limb(ctx, [39, 28], hand, 4.6, 4), GOB_FAR, [38, 26, 14, 10], o, { ao: 0.2, rim: false });
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(at ? -1.5 : -0.55);
  shade(ctx, P(ctx, 'M-1,0 L1,0 L1,3.4 L-1,3.4 Z'), LEATHER, [-1, 0, 2, 3.4], { ao: 0 });
  fill(ctx, P(ctx, 'M-3,0 L3,0 L3,-1.6 L-3,-1.6 Z'), '#edab50');
  const blade = P(ctx, 'M-1.8,-1.6 L1.8,-1.6 L1.2,-12 L0,-14.6 L-1.2,-12 Z');
  shade(ctx, blade, C.steel.slice(2, 7), [-2, -14.6, 4, 13], { lx: 0.3, ly: 0.1, ao: 0 });
  stroke(ctx, [[-0.6, -2.6], [-0.4, -11]], 0.9, '#ffffff');
  ctx.restore();
  fill(ctx, ell(ctx, hand[0], hand[1], 2.6, 2.4), '#33984b');
  // Túnica de couro e cinto.
  const torso = P(ctx, 'M24.6,28 C25,24 29,23 33,23 C37,23 41,24 41.6,28 C43,34 42,41 40,45.4 C35,47 29,47 25,45.4 C23,41 23.4,34 24.6,28 Z');
  vol(ctx, torso, LEATHER, [23, 23, 20, 24], o, { ao: 0.4, rw: 1.1 });
  inside(ctx, torso, () => {
    stroke(ctx, [[27, 27], [30, 36], [28, 45]], 0.9, '#391f21');
    stroke(ctx, [[36, 27], [37, 36], [38, 45]], 0.9, '#391f21');
    stroke(ctx, [[26, 30.4], [32, 31.6], [40, 30]], 0.8, '#bf6f4a');
    fill(ctx, P(ctx, 'M24,43 L42,43 L43,48 L38,46.4 L34,48.4 L30,46.4 L25,48 Z'), '#391f21');
  });
  stroke(ctx, [[24.4, 39.4], [33, 41], [41.6, 39.4]], 2.2, '#1c121c');
  fill(ctx, ell(ctx, 33, 40.4, 1.9, 1.7), '#ffc825');
  fill(ctx, ell(ctx, 33, 40.4, 0.8, 0.7), '#5d2c28');
  // Braço de cá balançando.
  const hn = at ? [20, 33] : [20.4 - sw * 1.6, 39];
  vol(ctx, limb(ctx, [26, 28], [hn[0] - 0.4, (28 + hn[1]) / 2 + 0.6], 5, 4.4), GOB, [16, 26, 12, 14], o, { ao: 0.2, rw: 1 });
  vol(ctx, limb(ctx, [hn[0] - 0.4, (28 + hn[1]) / 2 + 0.6], hn, 4.4, 3.8), GOB, [hn[0] - 4, 30, 8, 12], o, { ao: 0.3, rim: false });
  fill(ctx, ell(ctx, hn[0], hn[1] + 0.8, 2.6, 2.4), '#33984b');
  // Orelhas enormes e pontudas.
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 24.6 : 41.4;
    const ear = P(ctx, `M${x0},12 C${x0 + s * 8},8 ${x0 + s * 15},7 ${x0 + s * 19},3.6 C${x0 + s * 18},11.4 ${x0 + s * 12},19 ${x0 + s * 0.6},19.6 Z`);
    vol(ctx, ear, s < 0 ? GOB : GOB_FAR, [s < 0 ? 5 : 41, 3, 20, 17], o, { ao: 0.2, rim: s < 0, rw: 1.1, lx: s < 0 ? 0.3 : 0.7 });
    fill(ctx, P(ctx, `M${x0 + s * 1.2},13.4 C${x0 + s * 7},11 ${x0 + s * 11},9.6 ${x0 + s * 14.4},7.4 C${x0 + s * 12},13 ${x0 + s * 8},16.6 ${x0 + s * 2},17.4 Z`), s < 0 ? '#c42430' : '#891e2b');
  }
  // Cabeça grande: nariz comprido, olhos amarelos enormes, sorriso de dentes.
  const head = P(ctx, 'M24,15 C24,8.4 28,5.4 33,5.4 C38.4,5.4 42.6,8.6 42.6,15 C42.6,20.6 38.6,24 33.2,24 C28,24 24,20.6 24,15 Z');
  vol(ctx, head, GOB, [23, 5, 20, 20], o, { ao: 0.3, rw: 1.2 });
  fill(ctx, P(ctx, 'M38,15.6 C42.4,15.4 46.4,18.4 46.6,22 C43,22.6 39.6,22 37.4,20.4 Z'), '#99e65f');
  stroke(ctx, [[40.4, 17.4], [44, 18.6]], 0.9, '#d3fc7e');
  eye(ctx, 30, 13.2, 2.8, { iris: '#ffeb57', browTilt: 0.6, brow: '#134c4c' });
  eye(ctx, 37.2, 12.8, 2.5, { iris: '#ffeb57', browTilt: 0.6, brow: '#134c4c' });
  if (at) {
    fill(ctx, P(ctx, 'M28,19.6 C31,18.6 37,18.6 40,19.8 C39,24.4 34,25.6 30,23.8 Z'), '#391f21');
    fill(ctx, ell(ctx, 34, 23.2, 2.8, 1.1), '#c42430');
  } else {
    stroke(ctx, [[28, 20.4], [33.4, 22.6], [39.4, 20.4]], 1.3, '#134c4c');
  }
  for (const x of [30.4, 36.4]) tri(ctx, [x - 1, at ? 19.6 : 21], [x + 1, at ? 19.6 : 21], [x, at ? 22.8 : 23.4], '#ffffff');
  ctx.restore();
}

// ---------------------------------------------------------------- Orc
const ORC = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
const ORC_FAR = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b'];
const IRONS = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];

function orc(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.2;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  // Pernas grossas com botas.
  for (const [hx, s, far] of [[38, -1, true], [27, 1, false]]) {
    const a = at ? s * 0.25 : sw * s * 0.3;
    const knee = [hx + Math.sin(a) * 5, 50];
    const foot = [knee[0] + Math.sin(a) * 2, 56.4 - bob];
    const ramp = far ? LEATHER.slice(0, 4) : LEATHER;
    vol(ctx, limb(ctx, [hx, 41], knee, 11, 9), ramp, [hx - 6, 40, 12, 12], o, { ao: 0.3, rim: !far, rw: 1 });
    vol(ctx, limb(ctx, knee, foot, 9, 8.6), far ? ['#0e071b', '#1c121c', '#391f21'] : ['#0e071b', '#1c121c', '#391f21', '#5d2c28'], [knee[0] - 5, 49, 10, 10], o, { ao: 0.3, rim: false });
    vol(ctx, ell(ctx, foot[0] + 1.6, 58, 6.4, 2.4), ['#0e071b', '#1c121c', '#391f21'], [foot[0] - 5, 55, 12, 5], o, { ao: 0, rim: false });
  }
  // Machado de lá: haste e lâmina larga.
  const handR = at ? [50, 30] : [50 + sw * 1.2, 36];
  const ang = at ? 1.15 : -0.18 + sw * 0.05;
  vol(ctx, limb(ctx, [43, 25], handR, 8, 6.6), ORC_FAR, [40, 23, 14, 14], o, { ao: 0.2, rim: false });
  ctx.save();
  ctx.translate(handR[0], handR[1]);
  ctx.rotate(ang);
  shade(ctx, P(ctx, 'M-1.3,-20 L1.3,-20 L1.3,12 L-1.3,12 Z'), C.wood, [-1.3, -20, 2.6, 32], { lx: 0.2, ly: 0.5, ao: 0 });
  const axeHead = P(ctx, 'M1,-20 C7,-24 13,-21 13,-14.6 C13,-10 9,-6.6 4.6,-6.4 C6,-10 6,-14 1,-15.6 Z');
  vol(ctx, axeHead, IRONS, [0, -26, 17, 22], o, { lx: 0.3, ly: 0.2, ao: 0.2, rc: '#ffffff', rw: 0.9 });
  stroke(ctx, [[9, -24], [14.4, -19.4], [14.4, -12]], 1.1, '#ffffff');
  stroke(ctx, [[2.4, -16.6], [5.4, -9.4]], 0.9, '#1a1932');
  fill(ctx, P(ctx, 'M-1.8,-20.5 L1.8,-20.5 L1.8,-17 L-1.8,-17 Z'), '#657392');
  ctx.restore();
  fill(ctx, ell(ctx, handR[0], handR[1], 3.8, 3.4), '#33984b');
  // Tronco largo: barriga verde e arnês de couro.
  const torso = P(ctx, 'M17,26 C17,19 25,17 32,17 C39,17 46,19 46,26 C47,34 45,41 42,45 C36,47.4 28,47.4 22,45 C19,41 16.4,34 17,26 Z');
  vol(ctx, torso, ORC, [16, 17, 31, 31], o, { lx: 0.35, ly: 0.2, ao: 0.4, rw: 1.2 });
  const harness = P(ctx, 'M20,21 C24,19 40,19 44,21 L44,26 C40,28 24,28 20,26 Z');
  vol(ctx, harness, LEATHER, [20, 19, 24, 9], o, { ao: 0.2, rw: 1 });
  inside(ctx, torso, () => {
    stroke(ctx, [[21, 20], [34, 36], [43, 44]], 3.4, '#391f21');
    stroke(ctx, [[21, 19], [34, 35], [43, 43]], 1.2, '#8a4836');
    // Barriga e cicatrizes.
    stroke(ctx, [[25, 32], [29, 37]], 1, '#134c4c');
    stroke(ctx, [[37, 30], [40, 35]], 1, '#1e6f50');
    fill(ctx, P(ctx, 'M17,42 L46,42 L46,48 L17,48 Z'), '#1c121c');
  });
  stroke(ctx, [[18.4, 42], [32, 44.4], [45, 42]], 3.2, '#391f21');
  fill(ctx, P(ctx, 'M29.6,41 L34.4,41 L34.4,45.4 L29.6,45.4 Z'), '#ffc825');
  fill(ctx, P(ctx, 'M31,42.2 L33,42.2 L33,44.2 L31,44.2 Z'), '#5d2c28');
  for (const x of [38, 43]) fill(ctx, ell(ctx, x - 6.4 - (43 - x) * 0.2, 25 + (x - 38) * 0.4, 0.9, 0.9), '#c7cfdd');
  // Ombreiras de aço.
  for (const [x, y, rx] of [[19, 21.4, 6.4], [45.4, 22, 4.6]]) {
    vol(ctx, ell(ctx, x, y, rx, 5), IRONS, [x - rx, y - 5, rx * 2, 10], o, { ao: 0.4, rc: '#ffffff', rw: 0.9 });
    stroke(ctx, [[x - rx + 1.6, y + 1.8], [x, y + 3.8], [x + rx - 1.6, y + 1.8]], 1.1, '#1a1932');
    fill(ctx, ell(ctx, x - 1.4, y - 1.4, 1, 1), '#c7cfdd');
  }
  // Braço de cá: punho para baixo.
  const hn = at ? [15, 36] : [14 - sw * 1.6, 41];
  vol(ctx, limb(ctx, [20, 25], [hn[0] - 0.6, (25 + hn[1]) / 2 + 1], 9, 7.6), ORC, [8, 22, 14, 16], o, { ao: 0.2, rw: 1 });
  vol(ctx, limb(ctx, [hn[0] - 0.6, (25 + hn[1]) / 2 + 1], hn, 7.6, 7), ORC, [hn[0] - 6, 28, 12, 16], o, { ao: 0.3, rim: false });
  stroke(ctx, [[hn[0] - 3.6, (25 + hn[1]) / 2 + 3.4], [hn[0] + 2.8, (25 + hn[1]) / 2 + 3]], 2.2, '#391f21');
  vol(ctx, ell(ctx, hn[0], hn[1] + 1.4, 4.2, 3.8), ORC, [hn[0] - 4, hn[1] - 2, 8, 8], o, { ao: 0.3, rim: false });
  // Cabeça: rabo de cavalo preto, testa pesada, olhos brabos e mandíbula com presas.
  const hx = 33;
  const hy = 12.4;
  fill(ctx, P(ctx, `M${hx - 4},${hy - 6} C${hx - 8},${hy - 12} ${hx - 3},${hy - 14} ${hx - 5},${hy - 9} C${hx - 9},${hy - 10} ${hx - 12},${hy - 6} ${hx - 11},${hy - 1} Z`), '#0e071b');
  stroke(ctx, [[hx - 6, hy - 8], [hx - 11, hy - 4], [hx - 12, hy + 3]], 3.2, '#1c121c');
  const head = P(ctx, `M${hx - 9},${hy - 1} C${hx - 9.4},${hy - 7} ${hx - 4},${hy - 9} ${hx + 1},${hy - 9} C${hx + 6},${hy - 9} ${hx + 10},${hy - 5} ${hx + 10},${hy} C${hx + 10.4},${hy + 5} ${hx + 7},${hy + 8} ${hx},${hy + 8} C${hx - 6},${hy + 8} ${hx - 9},${hy + 4} ${hx - 9},${hy - 1} Z`);
  vol(ctx, head, ORC, [hx - 10, hy - 9, 21, 17], o, { ao: 0.35, rw: 1.2 });
  stroke(ctx, [[hx - 6, hy - 3], [hx + 1, hy - 1.8], [hx + 8.4, hy - 3.8]], 2.4, '#134c4c');
  eye(ctx, hx - 1.6, hy - 0.4, 2.2, { iris: '#ffeb57', browTilt: 0.7, brow: '#0c2e44', pupil: '#891e2b' });
  eye(ctx, hx + 5.6, hy - 1, 2, { iris: '#ffeb57', browTilt: 0.7, brow: '#0c2e44', pupil: '#891e2b' });
  fill(ctx, P(ctx, `M${hx - 5},${hy + 3.4} C${hx - 2},${hy + 2.4} ${hx + 7},${hy + 2.4} ${hx + 9},${hy + 3.6} C${hx + 8},${hy + 7.6} ${hx + 3},${hy + 9} ${hx - 2},${hy + 8} C${hx - 4},${hy + 6.6} ${hx - 5},${hy + 5} ${hx - 5},${hy + 3.4} Z`), at ? '#1c121c' : '#134c4c');
  if (at) fill(ctx, ell(ctx, hx + 2, hy + 7.2, 3.6, 1.2), '#c42430');
  for (const x of [hx - 3.6, hx + 6.4]) fill(ctx, horn(ctx, [x, hy + 5.6], [x + 0.4, hy + 2.8], [x + 0.2, hy - 0.2], 2.4), '#f9e6cf');
  ctx.restore();
}

// ---------------------------------------------------------------- Urso
const BEAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69'];
const BEAR_FAR = ['#1c121c', '#1c121c', '#391f21', '#5d2c28', '#8a4836'];
const TAN = ['#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'];

function bear(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : Math.cos(ph * 2) * 0.9;
  ctx.save();
  ctx.translate(-5, bob);
  if (at) { ctx.translate(20, 52); ctx.rotate(-0.22); ctx.translate(-20, -52); }
  const sw = (off) => (at ? off : Math.sin(ph + off) * 0.4);
  const lf = (off) => (at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2)));
  const legO = (ramp, hock) => ({ upper: 8, lower: 11, wTop: 11, wMid: 8.4, wPaw: 7.4, ramp, hock, paw: '#1c121c', foot: 58.4 });
  const claws = (end, far) => {
    for (const dx of [0.2, 2.4, 4.6]) tri(ctx, [end[0] + dx + 1.2, end[1] + 0.6], [end[0] + dx + 3, end[1] + 0.4], [end[0] + dx + 3.4, end[1] + 2], far ? '#918275' : '#f9e6cf');
  };
  // Pernas do lado de lá.
  const e1 = leg(ctx, [15, 40], at ? -0.4 : sw(Math.PI), { ...legO(BEAR_FAR, true), lift: lf(Math.PI) });
  const e2 = at ? null : leg(ctx, [38, 40], sw(0), { ...legO(BEAR_FAR, false), lift: lf(0) });
  claws(e1, true);
  if (e2) claws(e2, true);
  // Corpo enorme com a corcova nos ombros.
  const body = P(ctx, 'M8,38 C6,28 15,22 26,22 C32,17 42,17 47,23 C53,26 55,32 53,39 C52,46 47,48 41,47 C33,48 22,48 15,47 C10,46 8.4,42 8,38 Z');
  vol(ctx, body, BEAR, [6, 17, 49, 32], o, { lx: 0.4, ly: 0.2, ao: 0.5, rw: 1.5 });
  furTex(ctx, body, [6, 17, 49, 32], [BEAR[2], BEAR[4], BEAR[1]], { len: 3.4, lw: 1.2, step: 3.8, dx: -0.7, dy: 0.9, seed: 4 });
  // Anca e ombro em volume.
  vol(ctx, ell(ctx, 18, 40, 10, 9.4), BEAR, [8, 31, 20, 19], o, { ao: 0.3, rw: 1.2 });
  furTex(ctx, ell(ctx, 18, 40, 10, 9.4), [8, 31, 20, 19], [BEAR[2], BEAR[4]], { len: 3, lw: 1.1, step: 3.8, seed: 9 });
  // Pernas do lado de cá.
  const e3 = leg(ctx, [17, 41], at ? 0.5 : sw(0), { ...legO(BEAR, true), lift: lf(0) });
  claws(e3, false);
  const e4 = leg(ctx, [40, 41], at ? 1.5 : sw(Math.PI), { ...legO(BEAR, false), lift: at ? 0 : lf(Math.PI) });
  claws(e4, false);
  // Rabinho.
  vol(ctx, ell(ctx, 7.6, 31, 3.4, 3.2), BEAR, [4, 28, 7, 7], o, { ao: 0.2, rw: 1 });
  // Cabeça grande e redonda, focinho claro.
  const hx = 50;
  const hy = 32.6;
  for (const [x, y, r, far] of [[hx + 6, hy - 9.4, 4.2, true], [hx - 3, hy - 9, 5, false]]) {
    vol(ctx, ell(ctx, x, y, r, r), far ? BEAR_FAR : BEAR, [x - r, y - r, r * 2, r * 2], o, { ao: 0.2, rim: !far, rw: 1 });
    fill(ctx, ell(ctx, x + 0.4, y + 0.8, r * 0.55, r * 0.55), far ? '#391f21' : '#8a4836');
  }
  vol(ctx, ell(ctx, hx, hy, 11.4, 10), BEAR, [hx - 12, hy - 10, 24, 20], o, { lx: 0.35, ly: 0.2, ao: 0.35, rw: 1.4 });
  furTex(ctx, ell(ctx, hx, hy, 11.4, 10), [hx - 12, hy - 10, 24, 20], [BEAR[2], BEAR[4]], { len: 2.8, lw: 1.1, step: 3.8, dx: -0.5, seed: 14 });
  const jo = at ? 3.4 : 0;
  if (at) fill(ctx, P(ctx, `M${hx + 1},${hy + 5} C${hx + 7},${hy + 5} ${hx + 14},${hy + 5} ${hx + 16},${hy + 7} C${hx + 15},${hy + 12 + jo} ${hx + 6},${hy + 13 + jo} ${hx + 1},${hy + 9} Z`), '#391f21');
  if (at) fill(ctx, ell(ctx, hx + 8, hy + 10.6, 5, 1.6), '#c42430');
  const snout = P(ctx, `M${hx + 1},${hy + 1} C${hx + 6},${hy - 2.4} ${hx + 14},${hy - 1} ${hx + 16},${hy + 2} C${hx + 17},${hy + 5.4} ${hx + 11},${hy + 7.4} ${hx + 6},${hy + 7} C${hx + 2},${hy + 6.4} ${hx},${hy + 4} ${hx + 1},${hy + 1} Z`);
  vol(ctx, snout, TAN, [hx, hy - 3, 17, 11], o, { ao: 0.3, rw: 1.1, rc: '#ffc825' });
  fill(ctx, ell(ctx, hx + 15, hy + 1.6, 3, 2.4), '#1c121c');
  fill(ctx, ell(ctx, hx + 14, hy + 0.8, 1.1, 0.8), '#c7cfdd');
  if (!at) stroke(ctx, [[hx + 8, hy + 5.8], [hx + 12, hy + 6.8], [hx + 15, hy + 5.2]], 1.2, '#1c121c');
  else for (const x of [hx + 5, hx + 12]) { tri(ctx, [x - 1, hy + 5], [x + 1.2, hy + 5], [x + 0.1, hy + 8.4], '#ffffff'); tri(ctx, [x - 0.4, hy + 10.4 + jo * 0.3], [x + 1.6, hy + 10.4 + jo * 0.3], [x + 0.6, hy + 8], '#ffffff'); }
  eye(ctx, hx + 6.4, hy - 3, 2.2, { iris: '#ffc825', browTilt: 0.65, brow: '#1c121c', pupil: '#1c121c' });
  stroke(ctx, [[hx - 1, hy - 3.6], [hx + 3, hy - 3.2]], 1.2, '#391f21');
  ctx.restore();
}

// ---------------------------------------------------------------- Ent (treant)
const BARK = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
const LEAF = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];

function leafClump(ctx, o, cx, cy, r, far = false, seed = 1) {
  const ramp = far ? LEAF.slice(0, 5) : LEAF;
  const p = new ctx.Path2D();
  const n = 16;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (i % 2 ? 0.8 : 1.08) * (0.94 + rand(seed + i * 3.1) * 0.12);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * 0.84;
    if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
  }
  p.closePath();
  vol(ctx, p, ramp, [cx - r, cy - r, r * 2, r * 2], o, { lx: 0.3, ly: 0.18, ao: 0.7, spread: 0.85, bias: 1.3, rw: 0.9, rc: '#ffeb57', rim: !far });
  inside(ctx, p, () => {
    fill(ctx, ell(ctx, cx + r * 0.1, cy + r * 0.78, r * 1.1, r * 0.34), '#0c2e44');
    for (let i = 0; i < 10; i += 1) {
      const x = cx + (rand(seed + i * 1.7) - 0.5) * r * 1.7;
      const y = cy + (rand(seed + i * 2.3) - 0.3) * r * 1.2;
      const lit = y < cy + r * 0.1;
      fill(ctx, ell(ctx, x, y, r * 0.24, r * 0.1, -0.6), lit ? ramp[ramp.length - 1] : ramp[1]);
    }
    for (let i = 0; i < 4; i += 1) fill(ctx, ell(ctx, cx + (rand(seed + i * 5.1) - 0.5) * r * 1.4, cy + (rand(seed + i * 4.3) - 0.2) * r, r * 0.16, r * 0.09, 0.5), ramp[0]);
  });
}

function treant(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.2;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  // Copa de trás, mais escura.
  for (const [x, y, r, s] of [[14, 14, 9, 1], [44, 11, 9, 2], [30, 6, 9.4, 3]]) leafClump(ctx, o, x, y, r, true, s);
  // Raízes que servem de pés.
  for (const [x, s, far] of [[38, -1, true], [24, 1, false]]) {
    const dx = at ? 0 : sw * s * 3;
    const root = P(ctx, `M${x - 4},46 C${x - 5},52 ${x - 8 + dx},54 ${x - 11 + dx},57 C${x - 8 + dx},59.4 ${x - 2 + dx},58.6 ${x + dx},57.6 C${x + 3 + dx},59.4 ${x + 9 + dx},59 ${x + 11 + dx},57 C${x + 7 + dx},54 ${x + 4},51 ${x + 4},46 Z`);
    vol(ctx, root, far ? BARK.slice(0, 4) : BARK, [x - 11, 46, 22, 13], o, { ao: 0.4, rim: !far, rw: 1.1 });
    stroke(ctx, [[x - 1, 50], [x - 4 + dx, 56]], 1.1, far ? '#1c121c' : '#391f21');
  }
  // Braço de lá (direita): galho com mão de folhas.
  const handR = at ? [57, 44] : [53 + sw * 1.4, 28 - sw * 1.2];
  const elbowR = at ? [50, 32] : [47, 25 - sw];
  vol(ctx, limb(ctx, [42, 24], elbowR, 8, 6), BARK.slice(0, 4), [40, 18, 14, 14], o, { ao: 0.2, rim: false });
  vol(ctx, limb(ctx, elbowR, handR, 6, 4.4), BARK.slice(0, 4), [Math.min(elbowR[0], handR[0]) - 3, 20, 14, 26], o, { ao: 0.2, rim: false });
  for (const [dx, dy] of [[-2.4, -2], [2.4, -2.6], [3.4, 1.6]]) stroke(ctx, [[handR[0], handR[1]], [handR[0] + dx * 1.6, handR[1] + dy * 1.6]], 2, '#391f21');
  leafClump(ctx, o, handR[0] + 1, handR[1] - 2, 4.2, true, 9);
  // Tronco com casca e rachaduras.
  const trunk = P(ctx, 'M19,22 C20,16 26,14 32,14 C38,14 44,16 44,22 C45,30 43,38 42,46 C38,49 25,49 21,46 C19,38 18,30 19,22 Z');
  vol(ctx, trunk, BARK, [18, 14, 27, 35], o, { lx: 0.3, ly: 0.2, ao: 0.5, rw: 1.4, rc: '#ffc825' });
  inside(ctx, trunk, () => {
    for (const [x0, x1, y0, y1] of [[22, 21.4, 16, 46], [26.4, 27.4, 24, 47], [38, 39, 22, 47], [41.6, 41, 18, 44]]) stroke(ctx, [[x0, y0], [(x0 + x1) / 2 + 0.7, (y0 + y1) / 2], [x1, y1]], 1.2, '#1c121c');
    for (const [x0, x1, y0, y1] of [[24, 24.8, 20, 40], [34, 35, 14, 26], [31, 30.4, 40, 48]]) stroke(ctx, [[x0, y0], [(x0 + x1) / 2 - 0.4, (y0 + y1) / 2], [x1, y1]], 1.1, '#bf6f4a');
    for (const [mx, my, mr] of [[21.4, 20, 3], [41.8, 23, 2.6], [24, 44, 3.2], [40, 43, 2.4], [30, 47, 2.2]]) { fill(ctx, ell(ctx, mx, my, mr, mr * 0.7), '#1e6f50'); fill(ctx, ell(ctx, mx - 0.5, my - 0.6, mr * 0.6, mr * 0.4), '#5ac54f'); }
    fill(ctx, ell(ctx, 23, 35, 1.6, 2.2), '#1c121c');
    fill(ctx, ell(ctx, 41, 28, 1.6, 2.2), '#391f21');
  });
  // Rosto: olhos amarelos acesos, sobrancelhas de galho e boca de oco.
  const fx = 33.4;
  fill(ctx, ell(ctx, fx, 31, 8.6, 9.6), '#391f21');
  inside(ctx, ell(ctx, fx, 31, 8.6, 9.6), () => {
    fill(ctx, ell(ctx, fx - 1, 27, 9, 7), '#5d2c28');
  });
  for (const x of [fx - 3.4, fx + 3.6]) {
    glow(ctx, x, 29.4, 3.6, '#ffc825', { core: '#ffeb57', alpha: 0.85 });
    fill(ctx, P(ctx, `M${x - 2.4},29.6 C${x - 1},27.6 ${x + 1.4},27.6 ${x + 2.6},29.6 C${x + 1.4},31.4 ${x - 1},31.4 ${x - 2.4},29.6 Z`), '#ffeb57');
    fill(ctx, ell(ctx, x + 0.5, 29.6, 0.8, 1.2), '#5d2c28');
  }
  stroke(ctx, [[fx - 7, 25.2], [fx - 3, 27.6], [fx - 1, 27.8]], 2, '#1c121c');
  stroke(ctx, [[fx + 8, 25.2], [fx + 4, 27.6], [fx + 1.4, 27.8]], 2, '#1c121c');
  fill(ctx, P(ctx, `M${fx - 4},36 C${fx - 2},34.6 ${fx + 2},34.6 ${fx + 4},36 C${fx + 4},${at ? 42.6 : 40.4} ${fx + 1},${at ? 43.4 : 41.4} ${fx},${at ? 43.4 : 41.4} C${fx - 1},${at ? 43.4 : 41.4} ${fx - 4},${at ? 42.6 : 40.4} ${fx - 4},36 Z`), '#0e071b');
  if (at) fill(ctx, ell(ctx, fx, 41.4, 2.4, 1.2), '#8e251d');
  // Braço de cá: galho pendurado.
  const handN = at ? [12, 36] : [13 - sw * 1.4, 42];
  vol(ctx, limb(ctx, [20, 24], [handN[0] + 1, (24 + handN[1]) / 2], 8, 6.4), BARK, [8, 18, 14, 16], o, { ao: 0.2, rw: 1.1 });
  vol(ctx, limb(ctx, [handN[0] + 1, (24 + handN[1]) / 2], handN, 6.4, 4.6), BARK, [handN[0] - 5, 28, 12, 20], o, { ao: 0.3, rim: false });
  for (const dx of [-2.6, 0, 2.6]) stroke(ctx, [[handN[0], handN[1]], [handN[0] + dx, handN[1] + 4]], 2, '#391f21');
  // Galhos que sustentam a copa.
  for (const [x0, y0, x1, y1] of [[27, 16, 15, 14], [36, 15, 47, 12], [32, 15, 31, 8]]) { stroke(ctx, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + 1], [x1, y1]], 3.2, '#391f21'); stroke(ctx, [[x0, y0 - 0.8], [(x0 + x1) / 2, (y0 + y1) / 2 + 0.2], [x1, y1 - 0.8]], 1.2, '#8a4836'); }
  // Copa da frente.
  for (const [x, y, r, s] of [[14, 12.4, 9, 4], [48, 10.4, 8.6, 5], [31, 6.4, 10.4, 6], [20, 16.4, 6.6, 7], [43, 16.4, 6.4, 8]]) leafClump(ctx, o, x, y, r, false, s);
  ctx.restore();
}

// ---------------------------------------------------------------- Sapo
const FROG = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'];
const FROG_FAR = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f'];
const BELLY = ['#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];

function frog(ctx, f, o) {
  const at = o.attack;
  const lift = at ? 0 : [0, -5, -9, -3][f];
  const ext = at ? 0 : [0, 0.8, 1.5, 0.4][f];
  const sq = at ? 1 : [0.92, 1.05, 1.1, 0.96][f];
  ctx.save();
  ctx.translate(at ? -2 : 0, lift);
  ctx.translate(32, 59 - lift);
  ctx.scale(1 / sq + (sq - 1) * 0.5 + 0.02, sq);
  ctx.translate(-32, -(59 - lift));
  // Pata dianteira do lado de lá.
  const front = (x, ramp, rim) => {
    vol(ctx, limb(ctx, [x, 48], [x + 2, 56.6 - lift], 5.6, 4.6), ramp, [x - 3, 46, 8, 14], o, { ao: 0.3, rim, rw: 1 });
    vol(ctx, ell(ctx, x + 4, 58.2 - lift, 5.4, 1.8), ramp, [x - 2, 56, 12, 4], o, { ao: 0, rim: false });
    for (const dx of [1.6, 4.4, 7.2]) fill(ctx, ell(ctx, x + dx, 58.6 - lift, 1.2, 1), ramp[ramp.length - 2]);
  };
  front(44, FROG_FAR, false);
  // Corpo largo e gordo.
  const body = P(ctx, 'M8,46 C5,34 16,26 29,26 C43,26 55,31 56,43 C57,51 50,54 40,54 L22,54 C13,54 9,51 8,46 Z');
  vol(ctx, body, FROG, [6, 29, 51, 26], o, { lx: 0.35, ly: 0.18, ao: 0.5, rw: 1.5 });
  inside(ctx, body, () => {
    fill(ctx, P(ctx, 'M10,50 C20,46 36,46 54,47 L54,58 L10,58 Z'), '#cba36f');
    fill(ctx, P(ctx, 'M16,52 C26,49 40,49 52,50 L52,58 L16,58 Z'), '#f6ca9f');
    for (const [x, y, r] of [[16, 36, 2.4], [24, 31, 2.1], [32, 32.4, 2.4], [21, 40, 2.2], [29, 38.6, 2], [38, 37.4, 2.2], [12, 44, 1.8]]) {
      fill(ctx, ell(ctx, x, y, r, r * 0.8), '#134c4c');
      fill(ctx, ell(ctx, x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.35), '#99e65f');
    }
  });
  // Coxa traseira dobrada e pé comprido.
  const thigh = P(ctx, `M7,48 C5,38 13,33 21,35 C27,37 28,44 26,50 C22,54 12,54 7,48 Z`);
  vol(ctx, thigh, FROG, [4, 33, 25, 22], o, { ao: 0.4, rw: 1.3 });
  stroke(ctx, [[10, 42], [17, 40], [24, 44]], 1.2, '#1e6f50');
  const fx = 28 - ext * 8;
  vol(ctx, limb(ctx, [14, 51], [fx, 57.4 - lift], 4.4, 3.8), FROG, [10, 50, 22, 9], o, { ao: 0.3, rim: false });
  vol(ctx, ell(ctx, fx + 6, 58.4 - lift, 8, 1.8), FROG, [fx - 2, 56, 18, 5], o, { ao: 0, rim: false });
  for (const dx of [5, 9, 13]) fill(ctx, ell(ctx, fx + dx, 58.9 - lift, 1.4, 1), FROG[4]);
  front(40, FROG, true);
  // Cabeça larga com a boca enorme.
  const head = P(ctx, 'M32,37 C32,29 40,26 48,27 C56,28 62,34 62,43 C62,48 56,50 48,50 C40,50 32,46 32,37 Z');
  vol(ctx, head, FROG, [31, 28, 32, 22], o, { lx: 0.3, ly: 0.2, ao: 0.4, rw: 1.4 });
  inside(ctx, head, () => fill(ctx, P(ctx, 'M34,46 C42,48 54,48 63,45 L63,52 L34,52 Z'), '#cba36f'));
  if (at) {
    fill(ctx, P(ctx, 'M40,43 C48,41 58,41 63,43 C61,50 50,52 41,48 Z'), '#571c27');
    fill(ctx, P(ctx, 'M45,43 C52,48 60,47 63,44 L63,41 C57,42 50,41 45,43 Z'), '#891e2b');
  } else {
    stroke(ctx, [[34, 44], [45, 47.4], [55, 46.4], [62, 42.4]], 2, '#0c2e44');
  }
  // Língua que dispara no ataque.
  if (at) {
    stroke(ctx, [[58, 44.4], [61.6, 46]], 3.2, '#f68187');
    fill(ctx, ell(ctx, 62, 46.4, 2.2, 2), '#c42430');
  }
  // Olhos saltados no alto da cabeça.
  for (const [x, y, r, far] of [[35.4, 25.4, 7, true], [47.4, 23.4, 8, false]]) {
    vol(ctx, ell(ctx, x, y, r, r * 0.95), far ? FROG_FAR : FROG, [x - r, y - r, r * 2, r * 2], o, { ao: 0.3, rim: !far, rw: 1.1 });
    fill(ctx, ell(ctx, x + 0.6, y + 0.4, r * 0.76, r * 0.72), far ? '#cba36f' : '#ffc825');
    fill(ctx, ell(ctx, x + 1.2, y + 0.6, r * 0.6, r * 0.26), '#0e071b');
    fill(ctx, ell(ctx, x - r * 0.1, y - r * 0.2, r * 0.22, r * 0.2), '#ffffff');
    stroke(ctx, [[x - r * 0.9, y - r * 0.4], [x + r * 0.8, y - r * 0.8]], 1.6, '#134c4c');
  }
  // Narinas.
  fill(ctx, ell(ctx, 58.4, 38.6, 0.8, 0.6), '#134c4c');
  ctx.restore();
}

// ---------------------------------------------------------------- Zumbi
const ZSKIN = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
const ZSKIN_FAR = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b'];
const RAGS = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392'];

function zombieArm(ctx, o, from, to, w, far, sleeve) {
  const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 1.6];
  const skin = far ? ZSKIN_FAR : ZSKIN;
  vol(ctx, limb(ctx, from, mid, w, w * 0.84), far ? RAGS.slice(0, 4) : RAGS, [Math.min(from[0], mid[0]) - 2, from[1] - 4, 16, 12], o, { ao: 0.2, rim: !far, rw: 1 });
  vol(ctx, limb(ctx, mid, to, w * 0.8, w * 0.62), skin, [Math.min(mid[0], to[0]) - 2, mid[1] - 4, 16, 10], o, { ao: 0.2, rim: false });
  // Dedos curtos e curvos, garras de unha.
  for (let i = 0; i < 3; i += 1) {
    const dy = (i - 1) * 1.7;
    stroke(ctx, [[to[0], to[1] + dy * 0.4], [to[0] + 2.6, to[1] + dy], [to[0] + 4.2, to[1] + dy + 0.6]], 1.5, skin[far ? 2 : 3]);
  }
  fill(ctx, ell(ctx, to[0] + 0.4, to[1], w * 0.55, w * 0.5), skin[far ? 2 : 3]);
  stroke(ctx, [[from[0] + 0.6, from[1] + w * 0.4], [mid[0] + 0.6, mid[1] + w * 0.3]], 1.1, '#0e071b');
  if (sleeve) fill(ctx, P(ctx, `M${mid[0] - 1},${mid[1] + w * 0.4} l2,0.4 l-1,2 l-1.4,-0.6 Z`), RAGS[3]);
}

function zombie(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 0.9;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  // Braço de lá, esticado.
  zombieArm(ctx, o, [38, 25], at ? [58, 24] : [54, 26 + sw * 1.2], 6, true, false);
  // Pernas bambas: calça rasgada e pé descalço.
  for (const [hx, s, far] of [[35, -1, true], [27, 1, false]]) {
    const dx = at ? s * 1.5 : sw * s * 3;
    const knee = [hx + dx * 0.5, 50];
    const foot = [knee[0] + dx * 0.4, 57.4 - bob];
    const pants = far ? RAGS.slice(0, 4) : RAGS;
    vol(ctx, limb(ctx, [hx, 42], knee, 8, 7), pants, [hx - 5, 41, 10, 11], o, { ao: 0.3, rim: !far, rw: 1 });
    vol(ctx, limb(ctx, knee, [knee[0], knee[1] + (s > 0 ? 2.4 : 5)], 7, 6.2), pants, [knee[0] - 4, 49, 8, 6], o, { ao: 0.3, rim: false });
    const lowTop = knee[1] + (s > 0 ? 2.4 : 5);
    vol(ctx, limb(ctx, [knee[0], lowTop], foot, 5, 4.6), far ? ZSKIN_FAR : ZSKIN, [foot[0] - 3, lowTop, 7, 9], o, { ao: 0.3, rim: false });
    vol(ctx, ell(ctx, foot[0] + 2, 58.2 - bob, 4.8, 2), far ? ZSKIN_FAR : ZSKIN, [foot[0] - 3, 55, 10, 5], o, { ao: 0, rim: false });
    stroke(ctx, [[hx - 3, knee[1] + 3.6], [hx - 1, knee[1] + 5.4], [hx + 1, knee[1] + 3.8], [hx + 3, knee[1] + 5.4]], 1.1, '#0e071b');
  }
  // Torso inclinado com a camisa em farrapos e costelas à mostra.
  const torso = P(ctx, 'M21,28 C21,23 26,21 31,21 C37,21 41,23 41,28 C42.6,35 41,41 39,46 C34,47.6 28,47.6 23,46 C21,41 20,34 21,28 Z');
  vol(ctx, torso, RAGS, [19, 21, 23, 27], o, { lx: 0.3, ly: 0.2, ao: 0.4, rw: 1.2 });
  inside(ctx, torso, () => {
    fill(ctx, P(ctx, 'M28,29 C32,27.4 38,28 40,30 L40,40 C36,42 31,41.4 28,39 Z'), '#1e6f50');
    for (const y of [31, 34.2, 37.4]) stroke(ctx, [[30, y], [34, y + 1], [39, y]], 1.2, '#99e65f');
    stroke(ctx, [[34.4, 29.6], [34.4, 40]], 1, '#134c4c');
    stroke(ctx, [[24, 30], [26.4, 40], [23.6, 46]], 1, '#1a1932');
    stroke(ctx, [[22, 36.6], [25, 37.6]], 0.9, '#657392');
    fill(ctx, P(ctx, 'M21,44 L41,44 L40,48 L37,46 L34,48.4 L30,46.2 L26,48.6 L22,46.4 Z'), '#0e071b');
  });
  // Braço de cá estendido para a frente.
  zombieArm(ctx, o, [24, 26], at ? [48, 29] : [47, 31 - sw * 1.2], 6.6, false, true);
  // Cabeça enorme, olho saltado, olho afundado, dentes à mostra.
  const hx = 32;
  const hy = at ? 14.4 : 13.4;
  ctx.save();
  ctx.translate(at ? 3 : 1, 0);
  const head = P(ctx, `M${hx - 9},${hy + 1} C${hx - 9.6},${hy - 6} ${hx - 4},${hy - 9} ${hx + 1},${hy - 9} C${hx + 7},${hy - 9} ${hx + 10},${hy - 4} ${hx + 10},${hy + 1} C${hx + 10},${hy + 7} ${hx + 6},${hy + 10} ${hx},${hy + 10} C${hx - 5},${hy + 10} ${hx - 8.6},${hy + 7} ${hx - 9},${hy + 1} Z`);
  vol(ctx, head, ZSKIN, [hx - 10, hy - 9, 21, 19], o, { ao: 0.35, rw: 1.3 });
  // Cabelo ralo em tufos.
  for (const [dx, h] of [[-6.4, 5], [-3, 6.4], [0.4, 5.4], [3.6, 5.6], [6.6, 3.6]]) {
    stroke(ctx, [[hx + dx, hy - 7.6], [hx + dx - 1.4, hy - 7.6 - h * 0.6], [hx + dx - 2.4, hy - 6.4 - h]], 1.8, '#1c121c');
  }
  // Remendo costurado e olhos.
  stroke(ctx, [[hx - 8, hy - 3], [hx - 3, hy - 4.6]], 1, '#0e071b');
  for (const k of [0, 1, 2]) stroke(ctx, [[hx - 7 + k * 2, hy - 4.8], [hx - 7 + k * 2, hy - 2.4]], 0.9, '#0e071b');
  fill(ctx, ell(ctx, hx - 1.6, hy - 0.6, 3.4, 3.2), '#0e071b');
  glow(ctx, hx - 1.6, hy - 0.6, 2.2, '#ffc825', { core: '#ffeb57', alpha: 0.9 });
  fill(ctx, ell(ctx, hx - 1.4, hy - 0.6, 1.2, 1.1), '#ffeb57');
  fill(ctx, ell(ctx, hx + 6, hy - 1, 3.1, 3), '#f9e6cf');
  fill(ctx, ell(ctx, hx + 6.6, hy - 0.8, 1.3, 1.3), '#ea323c');
  fill(ctx, ell(ctx, hx + 6.8, hy - 0.8, 0.5, 0.5), '#0e071b');
  stroke(ctx, [[hx - 5.6, hy - 4], [hx + 1, hy - 2.6]], 1.8, '#134c4c');
  stroke(ctx, [[hx + 3, hy - 3], [hx + 9, hy - 5]], 1.8, '#134c4c');
  // Boca aberta com dentes tortos.
  const mo = at ? 3.4 : 1.4;
  fill(ctx, P(ctx, `M${hx - 4},${hy + 5} C${hx},${hy + 3.6} ${hx + 6},${hy + 3.6} ${hx + 9},${hy + 5} C${hx + 8},${hy + 8 + mo} ${hx + 3},${hy + 9.4 + mo} ${hx - 1},${hy + 8.4 + mo} C${hx - 3},${hy + 7.4} ${hx - 4},${hy + 6.4} ${hx - 4},${hy + 5} Z`), '#0e071b');
  for (const x of [hx - 2.2, hx + 1.6, hx + 5.4]) tri(ctx, [x - 1, hy + 4.4], [x + 1, hy + 4.4], [x, hy + 6.6], '#f9e6cf');
  tri(ctx, [hx + 0.2, hy + 8.4 + mo], [hx + 2.2, hy + 8.2 + mo], [hx + 1.2, hy + 6.4 + mo * 0.4], '#cba36f');
  ctx.restore();
  ctx.restore();
}

export const MONSTERS_2A = {
  rat: { size: 40, elite: 48, shadow: [34, 59.4, 17, 2.4], paint: rat },
  snake: { size: 40, elite: 48, shadow: [28, 60, 18, 2.4], paint: snake },
  bat: { size: 40, elite: 48, shadow: [33, 60, 12, 1.8], paint: bat },
  goblin: { size: 44, elite: 52, shadow: [33, 59.6, 12, 2], paint: goblin },
  orc: { size: 52, elite: 60, shadow: [32, 59.6, 17, 2.6], paint: orc },
  bear: { size: 56, elite: 64, shadow: [30, 59.6, 24, 3], paint: bear },
  treant: { size: 56, elite: 64, shadow: [32, 59.6, 17, 2.6], paint: treant },
  frog: { size: 40, elite: 48, shadow: [32, 59.6, 24, 2.6], paint: frog },
  zombie: { size: 48, elite: 56, shadow: [32, 59.6, 14, 2.2], paint: zombie }
};
