// Lote 2 (2c): demônio, caranguejo, pirata e os chefes regionais (orc, hidra, gigante de gelo,
// faraó, dragão, capitão fantasma), repintados em alta resolução.
import { C, P, ell, fill, furTex, glint, glow, hexA, horn, inside, limb, phaseOf, rand, rimWarm, scales, shade, stroke } from './kit.mjs';

const INK = '#0e071b';
const rim = (ctx, o, path, box, c = '#edab50', k = 1.2) => rimWarm(ctx, path, box, c, k * o.px);
const poly = (ctx, pts) => P(ctx, `M${pts.map((p) => p.join(',')).join(' L')} Z`);

/** Ponto de uma curva quadrática. */
function qb(a, b, c, t) {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
}

/** Tubo cônico ao longo de uma curva (pescoço, cauda): camadas escuras -> claras deslocadas. */
function tube(ctx, a, b, c, w0, w1, ramp, { n = 16, offs = 0.22 } = {}) {
  const layers = ramp.length;
  for (let l = 0; l < layers; l += 1) {
    const k = 1 - l * 0.2;
    const dx = -l * offs;
    const dy = -l * offs * 1.2;
    for (let i = 0; i < n; i += 1) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const p0 = qb(a, b, c, t0);
      const p1 = qb(a, b, c, t1);
      const w = (w0 + (w1 - w0) * (t0 + t1) / 2) * k;
      stroke(ctx, [[p0[0] + dx, p0[1] + dy], [p1[0] + dx, p1[1] + dy]], Math.max(0.5, w), ramp[l]);
    }
  }
}

/** Asa de morcego/dragão: membrana com bordas em arco, dedos e osso do braço. */
function wing(ctx, root, elbow, tips, ramp, box, { finger = '#1c121c', bone = '#571c27', vein = null, lx = 0.3 } = {}) {
  let d = `M${root[0]},${root[1]} L${elbow[0]},${elbow[1]} L${tips[0][0]},${tips[0][1]} `;
  for (let i = 1; i < tips.length; i += 1) {
    const [px, py] = tips[i - 1];
    const [x, y] = tips[i];
    d += `Q${(px + x) / 2 + (root[0] - (px + x) / 2) * 0.28},${(py + y) / 2 + (root[1] - (py + y) / 2) * 0.28} ${x},${y} `;
  }
  const last = tips[tips.length - 1];
  d += `Q${(last[0] + root[0]) / 2},${(last[1] + root[1]) / 2 + 2} ${root[0]},${root[1] + 9} Z`;
  const path = P(ctx, d);
  shade(ctx, path, ramp, box, { lx, ly: 0.15, ao: 0.35 });
  inside(ctx, path, () => {
    for (const t of tips) stroke(ctx, [elbow, [(elbow[0] + t[0]) / 2, (elbow[1] + t[1]) / 2 + 1.2], t], 1.1, finger);
    if (vein) for (const t of tips) stroke(ctx, [[elbow[0] * 0.5 + t[0] * 0.5, elbow[1] * 0.5 + t[1] * 0.5], [(elbow[0] + t[0]) / 2 + (root[0] - t[0]) * 0.15, (elbow[1] + t[1]) / 2 + (root[1] - t[1]) * 0.15]], 0.8, vein);
  });
  stroke(ctx, [root, elbow], 2.6, finger);
  stroke(ctx, [root, elbow], 1.1, bone);
  return path;
}

/** Perna de bode/besta: coxa, joelho invertido, canela e casco. */
function goatLeg(ctx, hip, a, ramp, hoofRamp, { w = 7, ground = 58 } = {}) {
  const knee = [hip[0] + 2 + Math.sin(a) * 4.5, hip[1] + 8];
  const hock = [knee[0] - 2.4, knee[1] + 5.5];
  const foot = [hock[0] + 1.6 + Math.sin(a) * 2, ground];
  shade(ctx, limb(ctx, hip, knee, w, w * 0.62), ramp, [hip[0] - w, hip[1], w * 2, 12], { ao: 0.3 });
  shade(ctx, limb(ctx, knee, hock, w * 0.6, w * 0.42), ramp, [hock[0] - 3, knee[1], 7, 8], { ao: 0.3 });
  shade(ctx, limb(ctx, hock, foot, w * 0.42, w * 0.4), ramp, [foot[0] - 3, hock[1], 6, 8], { ao: 0.4 });
  const hoof = P(ctx, `M${foot[0] - 2.2},${foot[1] - 2} C${foot[0]},${foot[1] - 3.4} ${foot[0] + 3.4},${foot[1] - 2.6} ${foot[0] + 4},${foot[1] + 0.4} L${foot[0] - 2.4},${foot[1] + 0.4} Z`);
  shade(ctx, hoof, hoofRamp, [foot[0] - 2.4, foot[1] - 3.4, 6.4, 4], { ao: 0 });
  return foot;
}

// ---------------------------------------------------------------- Demônio
const DR = ['#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'];
const DR_B = ['#3b1443', '#571c27', '#891e2b', '#c42430'];
const MEMB = ['#0e071b', '#3b1443', '#571c27', '#891e2b'];
const BONE = ['#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];

function fireball(ctx, x, y, r, f, big = false) {
  glow(ctx, x, y, r * 2, '#ff5000', { core: '#ffc825', alpha: 0.9 });
  const flame = P(ctx, `M${x - r},${y + r * 0.4} C${x - r * 1.1},${y - r * 0.6} ${x - r * 0.2},${y - r * 1.2} ${x - r * 0.1},${y - r * 2.2 - (f % 2)} C${x + r * 0.5},${y - r * 1.2} ${x + r * 1.2},${y - r * 0.6} ${x + r},${y + r * 0.4} C${x + r * 0.6},${y + r * 1.1} ${x - r * 0.6},${y + r * 1.1} ${x - r},${y + r * 0.4} Z`);
  shade(ctx, flame, ['#c64524', '#ff5000', '#ffa214', '#ffc825'], [x - r, y - r * 2, r * 2, r * 3], { lx: 0.5, ly: 0.7, ao: 0 });
  fill(ctx, ell(ctx, x, y + r * 0.2, r * 0.55, r * 0.55), '#ffeb57');
  if (big) fill(ctx, ell(ctx, x, y + r * 0.2, r * 0.3, r * 0.3), '#ffffff');
}

function demon(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.2;
  const sw = at ? 0 : Math.sin(ph);
  const lift = at ? 3 : Math.sin(ph) * 3;
  ctx.save();
  ctx.translate(0, bob);
  // Asas de morcego (a de trás mais escura).
  wing(ctx, [27, 24], [10, 8 - lift], [[1, 17 - lift], [5, 30 - lift * 0.4], [16, 38]], MEMB, [0, 5, 28, 36], { vein: '#891e2b', lx: 0.7 });
  wing(ctx, [37, 24], [53, 8 - lift], [[62, 18 - lift], [60, 30 - lift * 0.4], [48, 37]], MEMB, [36, 6, 28, 34], { vein: '#891e2b' });
  // Cauda com ponta em seta.
  const tw = Math.sin(ph) * 2;
  stroke(ctx, [[27, 44], [17, 51], [9 + tw, 50], [6 + tw, 44]], 2.8, '#391f21');
  stroke(ctx, [[27, 43.4], [17, 50.2], [10 + tw, 49]], 1.2, '#891e2b');
  fill(ctx, poly(ctx, [[6 + tw, 40], [9 + tw, 45], [3.4 + tw, 45.4]]), '#ea323c');
  // Pernas de bode.
  goatLeg(ctx, [35, 42], at ? -0.2 : sw * 0.3, DR_B, ['#0e071b', '#1c121c', '#391f21']);
  goatLeg(ctx, [28, 42], at ? 0.25 : -sw * 0.3, DR, ['#0e071b', '#1c121c', '#391f21', '#5d2c28']);
  // Braço de trás: punho com bola de fogo baixa.
  const bh = at ? [16, 36] : [14, 37 + sw];
  shade(ctx, limb(ctx, [24, 27], [17, 31], 6, 5), DR_B, [14, 24, 12, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, [17, 31], bh, 5, 4.4), DR_B, [bh[0] - 4, 28, 9, 12], { ao: 0.2 });
  shade(ctx, ell(ctx, bh[0], bh[1] + 0.6, 3, 2.8), DR_B, [bh[0] - 3, bh[1] - 2, 6, 6], { ao: 0 });
  fireball(ctx, bh[0], bh[1] - 3.4, 3.2, f);
  // Tronco forte com peitorais e barriga.
  const torso = P(ctx, 'M22,28 C23,23 29,21 33,21 C38,21 43,23 44,28 C45,34 43,39 40.5,44 C35,46 29,46 25,44 C22,39 21,34 22,28 Z');
  shade(ctx, torso, DR, [21, 21, 24, 25], { lx: 0.32, ly: 0.18, ao: 0.4 });
  inside(ctx, torso, () => {
    fill(ctx, ell(ctx, 34, 35, 6, 9), hexA('#f68187', 0.0));
    stroke(ctx, [[25, 30], [29.5, 32.5], [33, 30.5], [37, 32.5], [41, 30]], 1, '#571c27');
    for (const y of [36, 40]) stroke(ctx, [[28, y], [33, y + 0.8], [38, y]], 0.9, '#891e2b');
    stroke(ctx, [[33, 31], [33, 44]], 0.9, '#571c27');
    stroke(ctx, [[26, 25.4], [30, 23.6]], 1.2, '#f68187');
  });
  rim(ctx, o, torso, [21, 21, 24, 25]);
  // Cinto escuro com fivela de ouro.
  shade(ctx, P(ctx, 'M24,42 C29,44.4 38,44.4 42,42 L42.4,46 C37,48 29,48 23.6,46 Z'), ['#0e071b', '#1c121c', '#391f21', '#5d2c28'], [23, 42, 19, 6], { ao: 0 });
  fill(ctx, ell(ctx, 33, 45, 2, 1.8), '#ffc825');
  fill(ctx, ell(ctx, 33, 45, 0.8, 0.8), '#891e2b');
  // Ombreiras de espinho curto.
  for (const [x, y, r] of [[23, 26, 4.4], [43, 26, 4.4]]) {
    const pad = ell(ctx, x, y, r, r * 0.85);
    shade(ctx, pad, DR, [x - r, y - r, r * 2, r * 2], { ao: 0.3 });
    fill(ctx, horn(ctx, [x, y - r * 0.6], [x + 0.4, y - r * 1.4], [x + 0.8, y - r * 2.1], 2.4), '#cba36f');
  }
  // Braço da frente: lança a bola de fogo.
  const hand = at ? [55, 27] : [50, 34 - sw];
  const elb = at ? [49, 30] : [48, 29];
  shade(ctx, limb(ctx, [41, 26], elb, 6.4, 5.4), DR, [38, 22, 12, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 5.4, 4.6), DR, [elb[0] - 4, elb[1] - 2, 12, 10], { ao: 0.25 });
  shade(ctx, ell(ctx, hand[0] + 0.6, hand[1], 3.2, 2.8), DR, [hand[0] - 3, hand[1] - 3, 7, 6], { ao: 0.2 });
  fireball(ctx, hand[0] + 1, hand[1] - (at ? 0.5 : 4), at ? 5 : 3.6, f, true);
  // Cabeça grande: chifres de osso curvos, sobrancelha franzida, olhos amarelos, presas.
  const hx = 33;
  const hy = 14;
  for (const s of [-1, 1]) {
    const a = [hx + s * 3.6, hy - 3.6];
    const b = [hx + s * 14, hy - 5];
    const c = [hx + s * 12, hy - 15];
    tube(ctx, a, b, c, 6.2, 1.6, s < 0 ? BONE.slice(0, 4) : BONE, { n: 14, offs: 0.25 });
    for (const t of [0.22, 0.4, 0.58, 0.76]) {
      const p = qb(a, b, c, t);
      const w = (6.2 - 4.6 * t) / 2;
      stroke(ctx, [[p[0] - w * 0.9, p[1] + w * 0.5], [p[0] + w * 0.9, p[1] - w * 0.5]], 0.8, '#775c5b');
    }
  }
  const head = P(ctx, `M${hx - 7.4},${hy} C${hx - 7.6},${hy - 6.4} ${hx + 7.6},${hy - 6.4} ${hx + 7.6},${hy} C${hx + 8},${hy + 4.4} ${hx + 4.6},${hy + 7.4} ${hx},${hy + 7.4} C${hx - 4.6},${hy + 7.4} ${hx - 7.8},${hy + 4.4} ${hx - 7.4},${hy} Z`);
  shade(ctx, head, DR, [hx - 8, hy - 7, 16, 15], { lx: 0.3, ly: 0.2, ao: 0.3 });
  rim(ctx, o, head, [hx - 8, hy - 7, 16, 15]);
  // Focinho claro e boca com presas.
  shade(ctx, ell(ctx, hx + 3.4, hy + 3.8, 4.6, 3.2), ['#891e2b', '#c42430', '#ea323c', '#f68187'], [hx - 1, hy + 0.6, 9, 7], { ao: 0.1 });
  fill(ctx, ell(ctx, hx + 6, hy + 2.6, 0.8, 0.7), INK);
  stroke(ctx, [[hx - 1.4, hy + 5.6], [hx + 3, hy + 6.4], [hx + 6.6, hy + 5.4]], 1.1, '#1c121c');
  for (const x of [hx + 1.6, hx + 5]) fill(ctx, poly(ctx, [[x - 0.9, hy + 5.8], [x + 0.9, hy + 5.8], [x, hy + 8.2]]), '#ffffff');
  for (const [x, y, r] of [[hx - 1.4, hy - 0.6, 2.2], [hx + 4.6, hy - 0.4, 2]]) {
    glow(ctx, x, y, r * 2.2, '#ff5000', { core: '#ffeb57', alpha: 0.8 });
    fill(ctx, ell(ctx, x, y, r, r * 0.8), '#ffeb57');
    fill(ctx, ell(ctx, x + 0.5, y + 0.1, r * 0.4, r * 0.6), INK);
  }
  stroke(ctx, [[hx - 4.4, hy - 3.6], [hx + 0.4, hy - 1.8], [hx + 2, hy - 1.4]], 1.5, '#391f21');
  stroke(ctx, [[hx + 2.6, hy - 1.4], [hx + 5, hy - 2.4], [hx + 7, hy - 3.4]], 1.5, '#391f21');
  fill(ctx, horn(ctx, [hx - 6.4, hy + 0.4], [hx - 9, hy - 1], [hx - 10.4, hy - 3.6], 3), '#c42430');
  ctx.restore();
}

// ---------------------------------------------------------------- Caranguejo
const CR = ['#3b1443', '#891e2b', '#c64524', '#ff5000', '#ffa214'];
const CR_C = ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c'];
const CR_B = ['#3b1443', '#571c27', '#891e2b', '#c42430'];

function claw(ctx, cx, cy, ang, open, ramp, scale = 1, far = false) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  const sh = (p, b) => shade(ctx, p, ramp, b, { lx: 0.3, ly: 0.2, ao: 0.25 });
  // Vão escuro entre os dedos.
  fill(ctx, poly(ctx, [[3, -2], [18, -2 - open], [18, 2 + open], [3, 2]]), '#0e071b');
  ctx.save(); ctx.translate(2, -1); ctx.rotate(-open * 0.06);
  sh(P(ctx, 'M-1,-5 C5,-9.4 14,-7.6 19,-1.4 C14,-3.6 8,-3.2 1,-1 Z'), [-1, -9, 20, 8]);
  ctx.restore();
  ctx.save(); ctx.translate(2, 1); ctx.rotate(open * 0.06);
  sh(P(ctx, 'M-1,5 C5,9 13,7.4 18,2 C13,4 8,3.4 1,1 Z'), [-1, 1, 19, 8]);
  ctx.restore();
  sh(ell(ctx, 0, 0, 7.4, 6.2), [-8, -6, 16, 12]);
  if (!far) {
    fill(ctx, ell(ctx, -2, -2.6, 2.4, 1.2, -0.4), '#ffc825');
    stroke(ctx, [[-4, 1.6], [0, 3.4], [4.4, 2]], 0.8, '#891e2b');
  }
  for (const x of [8, 11.4, 14.8]) fill(ctx, poly(ctx, [[x, -2.4 - open * 0.6], [x + 1.6, -2.2 - open * 0.5], [x + 0.6, -0.2]]), '#f9e6cf');
  ctx.restore();
}

function crab(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.6 : -Math.abs(Math.sin(ph)) * 0.8;
  ctx.save();
  ctx.translate(0, bob);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const lf = at ? 0 : Math.max(0, Math.sin(ph + i * 2.1 + (side > 0 ? 0 : Math.PI)));
      const sx = 32 + side * (13 - i * 1.6);
      const sy = 49 + i * 1.2;
      const knee = [32 + side * (20 + i * 2), sy - 6 - lf * 2];
      const foot = [32 + side * (22 + i * 3.6), 58.4 - lf * 2.4];
      const col = side < 0 ? '#571c27' : '#891e2b';
      stroke(ctx, [[sx, sy], knee], 2.6, col);
      stroke(ctx, [knee, foot], 2.2, col);
      stroke(ctx, [[sx, sy - 0.8], [knee[0], knee[1] - 0.8]], 0.9, '#c64524');
      fill(ctx, ell(ctx, knee[0], knee[1], 1.7, 1.7), '#c64524');
      fill(ctx, ell(ctx, foot[0], foot[1], 1.2, 0.9), '#0e071b');
    }
  }
  const sw = at ? 0 : Math.sin(ph) * 1.2;
  for (const side of [-1, 1]) {
    const sx = 32 + side * 15;
    const wr = at ? [32 + side * 12, 34] : [32 + side * 20, 31 + sw * side];
    const el = at ? [32 + side * 21, 40] : [32 + side * 23, 40];
    const m = (p) => [p[0], p[1]];
    shade(ctx, limb(ctx, [sx, 43], m(el), 5.6, 4.8), CR_C, [Math.min(sx, el[0]) - 3, 34, 12, 12], { ao: 0.2 });
    shade(ctx, limb(ctx, m(el), m(wr), 4.8, 4.4), CR_C, [Math.min(el[0], wr[0]) - 3, Math.min(el[1], wr[1]), 10, 14], { ao: 0.2 });
    ctx.save();
    if (side < 0) { ctx.translate(64, 0); ctx.scale(-1, 1); }
    const cx = side < 0 ? 64 - wr[0] : wr[0];
    claw(ctx, cx, wr[1] - 2, at ? -0.8 : -1.25, at ? 0.1 : 1.5 + sw * 0.1, CR_C, 1.45);
    ctx.restore();
  }
  const shell = P(ctx, 'M14,47 C13,38 21,35 32,35 C43,35 51,38 50,47 C49,53 42,55 32,55 C22,55 15,53 14,47 Z');
  shade(ctx, shell, CR, [13, 35, 38, 20], { lx: 0.35, ly: 0.1, ao: 0.55 });
  inside(ctx, shell, () => {
    for (const [x, y, r] of [[20, 44, 2.2], [27, 41, 1.8], [38, 41.4, 2], [44, 45, 1.8], [24, 49, 2], [33, 47, 2.4], [41, 50, 1.8]]) {
      fill(ctx, ell(ctx, x, y, r, r * 0.8), '#8e251d');
      fill(ctx, ell(ctx, x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.4), '#ffc825');
    }
    stroke(ctx, [[18, 41], [26, 38], [36, 38]], 1.8, '#ffc825');
    stroke(ctx, [[20, 39.6], [24, 38.6]], 1, '#ffeb57');
    stroke(ctx, [[15, 52], [32, 55], [49, 52]], 2, '#3b1443');
  });
  rim(ctx, o, shell, [13, 35, 38, 20], '#ffc825');
  for (const x of [28.4, 35.6]) {
    stroke(ctx, [[x, 38], [x, 32.6]], 2, '#c42430');
    fill(ctx, ell(ctx, x, 30.4, 3.2, 3.2), INK);
    fill(ctx, ell(ctx, x - 0.9, 29.4, 1, 1), '#ffffff');
  }
  stroke(ctx, [[29, 48.4], [32, 49.6], [35, 48.4]], 1, '#3b1443');
  ctx.restore();
}

// ---------------------------------------------------------------- Pirata esqueleto
const SK = ['#494834', '#918275', '#b4b4b4', '#f9e6cf', '#ffffff'];
const COAT = ['#1c121c', '#3b1443', '#571c27', '#891e2b', '#c42430'];
const LEATHER = ['#1c121c', '#391f21', '#5d2c28', '#8a4836'];

function sabre(ctx, hand, ang, len, o) {
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(ang);
  const blade = P(ctx, `M4,-1.4 C${len * 0.4},-3.4 ${len * 0.75},-3 ${len},1.2 C${len * 0.75},0 ${len * 0.4},0.6 4,1.5 Z`);
  shade(ctx, blade, C.steel.slice(1, 7), [4, -4, len, 6], { lx: 0.4, ly: 0, ao: 0 });
  stroke(ctx, [[6, -1], [len * 0.45, -2.2], [len * 0.8, -1.6]], 0.7 * Math.max(1, o.px), '#ffffff');
  fill(ctx, P(ctx, 'M2.6,-4.4 L4.4,-4.4 L4.4,4.4 L2.6,4.4 Z'), '#ffc825');
  shade(ctx, P(ctx, 'M-3,-1.2 L2.6,-1.2 L2.6,1.2 L-3,1.2 Z'), LEATHER, [-3, -1.2, 6, 2.4], { ao: 0 });
  fill(ctx, ell(ctx, -3.4, 0, 1.3, 1.3), '#ffc825');
  ctx.restore();
}

function pirate(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 1.4;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Bandana com ponta ao vento.
  const flut = Math.sin(ph) * 1.4;
  fill(ctx, P(ctx, `M22,15 C17,16 13,${19 + flut} 9,${22 + flut} C14,${21.4 + flut} 18,21 23,20.4 Z`), '#c42430');
  // Pernas de osso com botas.
  for (const [x, s, far] of [[36, -1, true], [28, 1, false]]) {
    const a = at ? s * 0.25 : sw * s * 0.35;
    const knee = [x + Math.sin(a) * 4, 49.5];
    const foot = [knee[0] + Math.sin(a) * 2.4, 57 - bob];
    const bone = far ? SK.slice(0, 4) : SK;
    shade(ctx, limb(ctx, [x, 41], knee, 5.4, 4), far ? COAT.slice(0, 4) : COAT, [x - 4, 40, 9, 10], { ao: 0.3 });
    shade(ctx, limb(ctx, knee, foot, 4, 3.4), bone, [knee[0] - 3, knee[1], 7, 9], { ao: 0.35 });
    shade(ctx, ell(ctx, knee[0], knee[1], 2.4, 2.2), bone, [knee[0] - 2.4, knee[1] - 2.2, 5, 4.4], { ao: 0 });
    const boot = P(ctx, `M${foot[0] - 3.6},${foot[1] - 4.4} L${foot[0] + 3},${foot[1] - 4.4} L${foot[0] + 3.2},${foot[1] - 1.6} C${foot[0] + 6},${foot[1] - 1} ${foot[0] + 6.4},${foot[1] + 1.2} ${foot[0] + 4},${foot[1] + 1.4} L${foot[0] - 3.8},${foot[1] + 1.4} Z`);
    shade(ctx, boot, far ? LEATHER.slice(0, 3) : LEATHER, [foot[0] - 4, foot[1] - 4.4, 10, 6], { ao: 0.2 });
    fill(ctx, P(ctx, `M${foot[0] - 4},${foot[1] - 5.4} L${foot[0] + 3.4},${foot[1] - 5.4} L${foot[0] + 3.2},${foot[1] - 3.2} L${foot[0] - 3.8},${foot[1] - 3.2} Z`), far ? '#391f21' : '#8a4836');
  }
  // Braço de trás.
  const bh = at ? [20, 36] : [20 - sw * 1.4, 38];
  shade(ctx, limb(ctx, [23, 24], [bh[0] - 2, 31], 5.6, 4.6), COAT.slice(0, 4), [14, 22, 12, 12], { ao: 0.25 });
  shade(ctx, limb(ctx, [bh[0] - 2, 31], bh, 4.6, 3.6), COAT.slice(0, 4), [bh[0] - 4, 29, 9, 10], { ao: 0.25 });
  shade(ctx, ell(ctx, bh[0], bh[1] + 1, 2.4, 2.4), SK.slice(0, 4), [bh[0] - 2.4, bh[1] - 1.4, 5, 5], { ao: 0 });
  // Tronco: casaco aberto, costelas à mostra.
  const torso = P(ctx, 'M22,24 C24,20 29,19 33,19 C38,19 42,20 44,24 C45,31 43,37 41.4,43 C36,45 29,45 24.6,43 C22.6,37 21,31 22,24 Z');
  shade(ctx, torso, COAT, [21, 19, 24, 25], { lx: 0.3, ly: 0.15, ao: 0.4 });
  const cavity = P(ctx, 'M28,21 C31,20 36,20 38.6,21.6 C39.4,28 38.6,34 37.4,41 C34,42 31,42 28.6,41 C27.4,34 27,28 28,21 Z');
  fill(ctx, cavity, '#0e071b');
  inside(ctx, cavity, () => {
    for (let i = 0; i < 4; i += 1) {
      const y = 24 + i * 4.4;
      stroke(ctx, [[28, y], [33, y + 1.4], [39, y]], 1.7, SK[3]);
      stroke(ctx, [[28, y + 0.6], [33, y + 2], [39, y + 0.6]], 0.8, SK[1]);
    }
    stroke(ctx, [[33.4, 21], [33.4, 42]], 1.7, SK[2]);
  });
  inside(ctx, torso, () => {
    stroke(ctx, [[24, 25], [23.6, 36], [24.6, 42]], 0.9, '#c42430');
    stroke(ctx, [[42.4, 25], [41.4, 36]], 0.9, '#571c27');
    for (const y of [27, 32, 37]) { fill(ctx, ell(ctx, 26.8, y, 0.8, 0.8), '#ffc825'); fill(ctx, ell(ctx, 39.2, y, 0.7, 0.7), '#edab50'); }
  });
  rim(ctx, o, torso, [21, 19, 24, 25], '#ffa214');
  // Cinto, fivela e saiote da casaca.
  shade(ctx, P(ctx, 'M23.4,40 C29,42.4 38,42.4 43,40 L43.6,44.4 C38,46.6 29,46.6 23,44.4 Z'), LEATHER, [23, 40, 20, 6], { ao: 0 });
  fill(ctx, P(ctx, 'M31,40.6 L35.4,40.6 L35.4,45 L31,45 Z'), '#ffc825');
  fill(ctx, P(ctx, 'M32.2,41.8 L34.2,41.8 L34.2,43.8 L32.2,43.8 Z'), '#891e2b');
  // Sabre e braço da frente.
  const hand = at ? [49, 21] : [48, 33 - sw * 0.6];
  const ang = at ? 0.75 : -1.2 + sw * 0.05;
  sabre(ctx, hand, ang, 24, o);
  const elb = at ? [45, 28] : [44, 31];
  shade(ctx, limb(ctx, [42, 24], elb, 6, 5), COAT, [38, 22, 12, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 5, 4), COAT, [Math.min(elb[0], hand[0]) - 3, Math.min(elb[1], hand[1]) - 2, 12, 12], { ao: 0.2 });
  fill(ctx, P(ctx, `M${hand[0] - 3.4},${hand[1] - 3.6} L${hand[0] + 3.4},${hand[1] - 3.6} L${hand[0] + 3},${hand[1] - 1.6} L${hand[0] - 3},${hand[1] - 1.6} Z`), '#ffc825');
  shade(ctx, ell(ctx, hand[0], hand[1] + 0.4, 2.6, 2.4), SK, [hand[0] - 2.6, hand[1] - 2, 5.2, 4.8], { ao: 0 });
  // Caveira grande: órbitas, tapa-olho, nariz, dentes.
  const skull = P(ctx, 'M24,15.6 C24,9 28.4,6 33.6,6 C39,6 43,9.6 43,15.6 C43,18.6 41.6,20.6 39.6,21.4 L39.4,25 L28.4,25 L28.2,21.4 C25.6,20.6 24,18.6 24,15.6 Z');
  shade(ctx, skull, SK, [23, 6, 21, 19], { lx: 0.3, ly: 0.15, ao: 0.35 });
  rim(ctx, o, skull, [23, 6, 21, 19], '#ffc825', 1);
  fill(ctx, ell(ctx, 29.6, 15, 3.2, 3.4), '#0e071b');
  fill(ctx, ell(ctx, 38, 15, 3.2, 3.4), '#0e071b');
  glow(ctx, 38.2, 15.2, 2.2, '#ea323c', { core: '#ffeb57' });
  fill(ctx, ell(ctx, 29.6, 15, 3.8, 3.9), '#0e071b');
  stroke(ctx, [[24.6, 11], [30, 14], [38, 9.6]], 1.1, '#0e071b');
  fill(ctx, poly(ctx, [[33.4, 17.6], [35.4, 21], [31.4, 21]]), '#1c121c');
  for (let i = 0; i < 5; i += 1) fill(ctx, P(ctx, `M${29.6 + i * 2.2},22.6 h1.6 v2.4 h-1.6 Z`), i % 2 ? SK[4] : SK[3]);
  stroke(ctx, [[28.6, 22.6], [39, 22.6]], 0.7, '#1c121c');
  stroke(ctx, [[26, 12.2], [28.6, 11.4]], 0.9, '#494834');
  // Chapéu tricórnio com caveira e galão de ouro.
  const hat = P(ctx, 'M18,10.4 C20,5 25,2.6 28,1.6 C30,0.4 34,0.4 38,1.8 C42,2.8 46,6 48,10.4 C42,8.4 38,8.4 33,8.8 C28,8.4 23,8.4 18,10.4 Z');
  shade(ctx, hat, ['#0e071b', '#1c121c', '#2a2f4e', '#424c6e'], [17, 0, 32, 11], { lx: 0.3, ly: 0.1, ao: 0.2 });
  rim(ctx, o, hat, [17, 0, 32, 11], '#edab50', 1);
  stroke(ctx, [[18.6, 10.2], [33, 8.4], [47.6, 10.2]], 1.4, '#ffc825');
  fill(ctx, ell(ctx, 33, 5.2, 2.2, 2), '#f9e6cf');
  fill(ctx, ell(ctx, 32.2, 5.2, 0.6, 0.7), INK);
  fill(ctx, ell(ctx, 34, 5.2, 0.6, 0.7), INK);
  stroke(ctx, [[30, 8.4], [36, 6.8]], 0.7, '#f9e6cf');
  ctx.restore();
}

// ---------------------------------------------------------------- Helpers de chefes
const ORCSK = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
const ORCSK_B = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b'];
const FURB = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
const STEEL = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];

function stud(ctx, x, y, r = 0.9) {
  fill(ctx, ell(ctx, x, y, r, r), '#92a1b9');
  fill(ctx, ell(ctx, x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.45), '#ffffff');
}

function twoLimb(ctx, a, b, c, w0, w1, w2, ramp, box) {
  shade(ctx, limb(ctx, a, b, w0, w1), ramp, box, { ao: 0.2 });
  shade(ctx, limb(ctx, b, c, w1, w2), ramp, box, { ao: 0.3 });
}

// ---------------------------------------------------------------- Grokk, chefe orc
function orcChief(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.5 : -Math.abs(Math.sin(ph)) * 1.1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Capa de pele ao vento.
  const cape = P(ctx, `M19,22 C15,30 13,38 ${12 + sw},46 C18,48 24,45 30,47 C36,45 42,48 47,46 L46,22 Z`);
  shade(ctx, cape, FURB, [8, 22, 42, 38], { lx: 0.3, ly: 0.1, ao: 0.5 });
  furTex(ctx, cape, [8, 22, 42, 38], ['#391f21', '#8a4836', '#1c121c'], { len: 2.6, lw: 1, step: 2.8, dx: -0.4, dy: 1 });
  // Pernas grossas com botas de pele.
  fill(ctx, P(ctx, 'M26,40 L41,40 L41,59 L26,59 Z'), '#0e071b');
  for (const [x, s, ramp] of [[42, -1, ORCSK_B], [23, 1, ORCSK]]) {
    const a = at ? s * 0.18 : sw * s * 0.3;
    const knee = [x + Math.sin(a) * 4, 50];
    const foot = [knee[0] + Math.sin(a) * 2, 56.5 - bob];
    shade(ctx, limb(ctx, [x, 40], knee, 12, 10), ramp, [x - 7, 38, 14, 14], { ao: 0.3 });
    const boot = P(ctx, `M${foot[0] - 6},${foot[1] - 9} L${foot[0] + 5.4},${foot[1] - 9} L${foot[0] + 6},${foot[1] - 2} C${foot[0] + 10},${foot[1] - 1.4} ${foot[0] + 10},${foot[1] + 2.6} ${foot[0] + 7},${foot[1] + 2.6} L${foot[0] - 6.4},${foot[1] + 2.6} Z`);
    shade(ctx, boot, s < 0 ? ['#1c121c', '#391f21', '#5d2c28'] : ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a'], [foot[0] - 7, foot[1] - 9, 15, 12], { ao: 0.3 });
    stroke(ctx, [[foot[0] - 5.6, foot[1] - 5], [foot[0] + 5.6, foot[1] - 5]], 1.4, '#e69c69');
    furTex(ctx, P(ctx, `M${foot[0] - 7},${foot[1] - 10} L${foot[0] + 6.4},${foot[1] - 10} L${foot[0] + 6},${foot[1] - 5} L${foot[0] - 6.4},${foot[1] - 5} Z`), [foot[0] - 7, foot[1] - 10, 14, 6], ['#bf6f4a', '#8a4836'], { len: 2, lw: 0.9, step: 2.2 });
    stroke(ctx, [[foot[0] - 5, foot[1] - 1], [foot[0] + 6, foot[1] - 1]], 0.8, '#1c121c');
  }
  ctx.save(); ctx.translate(33, 0); ctx.scale(0.8, 0.8); ctx.translate(-33, 0);
  // Braço de trás pendurado.
  const bh = at ? [11, 44] : [10 - sw * 1.2, 45];
  twoLimb(ctx, [16, 28], [11.4, 37], bh, 11, 9, 7.6, ORCSK_B, [6, 26, 12, 24]);
  shade(ctx, ell(ctx, bh[0], bh[1] + 2.4, 5, 4.6), ORCSK_B, [bh[0] - 5, bh[1] - 2, 10, 10], { ao: 0.2 });
  // Torso gigante.
  const torso = P(ctx, 'M14,28 C15,20 24,17 33,17 C42,17 50,20 51,28 C52,36 49,44 45,48 C39,50.4 27,50.4 21,48 C16.4,44 13,36 14,28 Z');
  shade(ctx, torso, ORCSK, [13, 17, 39, 33], { lx: 0.3, ly: 0.16, ao: 0.45 });
  inside(ctx, torso, () => {
    for (const s of [-1, 1]) stroke(ctx, [[33, 24], [33 + s * 8, 30], [33 + s * 14, 28]], 1.2, '#134c4c');
    stroke(ctx, [[33, 29], [33, 46]], 1.1, '#134c4c');
    for (const y of [36, 41]) { stroke(ctx, [[24, y], [29, y + 1.4], [33, y]], 1, '#1e6f50'); stroke(ctx, [[33, y], [37, y + 1.4], [42, y]], 1, '#1e6f50'); }
    stroke(ctx, [[40, 26], [44, 34]], 0.9, '#99e65f');
    stroke(ctx, [[39.4, 26.6], [43.4, 34.6]], 0.7, '#d3fc7e');
    stroke(ctx, [[20, 22], [27, 20]], 1.4, '#99e65f');
  });
  rim(ctx, o, torso, [13, 17, 39, 33], '#ffc825');
  // Correias cruzadas de couro com rebites.
  const strap = P(ctx, 'M17,22 L22,20 L47,44 L43.6,47.4 Z');
  shade(ctx, strap, LEATHER, [17, 20, 30, 28], { ao: 0 });
  for (const t of [0.22, 0.48, 0.74]) stud(ctx, 20 + 25 * t, 22 + 24 * t, 0.9);
  // Cinto largo com caveira.
  shade(ctx, P(ctx, 'M19,44 C27,47.4 39,47.4 47,44 L47.6,49.4 C39,52.4 27,52.4 18.4,49.4 Z'), LEATHER, [18, 44, 30, 8], { ao: 0 });
  shade(ctx, ell(ctx, 33, 48, 3.4, 3.4), SK, [29.6, 44.6, 6.8, 6.8], { ao: 0.1 });
  fill(ctx, ell(ctx, 31.8, 48, 0.9, 1), INK);
  fill(ctx, ell(ctx, 34.2, 48, 0.9, 1), INK);
  // Ombreiras de aço arredondadas com cones.
  for (const [x, y, r, back] of [[17, 22, 8, true], [49, 22, 7.4, false]]) {
    const pad = ell(ctx, x, y, r, r * 0.74);
    shade(ctx, pad, back ? STEEL.slice(0, 5) : STEEL, [x - r, y - r, r * 2, r * 2], { ao: 0.35 });
    rim(ctx, o, pad, [x - r, y - r, r * 2, r * 2], '#edab50');
    stroke(ctx, [[x - r + 1.6, y + r * 0.34], [x, y + r * 0.7], [x + r - 1.6, y + r * 0.34]], 1, '#1a1932');
    for (const dx of [-r * 0.5, r * 0.5]) fill(ctx, poly(ctx, [[x + dx - 1.8, y - r * 0.5], [x + dx, y - r * 1.3], [x + dx + 1.8, y - r * 0.5]]), back ? '#657392' : '#92a1b9');
    stud(ctx, x, y, 0.9);
  }
  // Machado de duas lâminas.
  const hand = at ? [52, 36] : [50, 40];
  const ang = at ? 1.1 : 0.08 + sw * 0.03;
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(ang);
  ctx.translate(0, 13);
  shade(ctx, P(ctx, 'M-1.5,-40 L1.5,-40 L2,18 L-2,18 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [-2, -40, 4, 58], { lx: 0.15, ly: 0.5, ao: 0 });
  for (const y of [-6, 2, 8]) stroke(ctx, [[-1.8, y], [1.8, y + 1]], 0.8, '#1c121c');
  const bl1 = P(ctx, 'M1,-39 C5,-45 12,-47 15,-43 C16,-36 16,-30 14,-26 C11,-30 6,-31 1,-30 Z');
  const bl2 = P(ctx, 'M-1,-39 C-5,-45 -12,-47 -15,-43 C-16,-36 -16,-30 -14,-26 C-11,-30 -6,-31 -1,-30 Z');
  shade(ctx, bl2, STEEL.slice(0, 5), [-16, -47, 15, 21], { lx: 0.6, ao: 0 });
  shade(ctx, bl1, STEEL, [0, -47, 16, 21], { lx: 0.3, ao: 0 });
  stroke(ctx, [[14.6, -42], [15.6, -35], [13.6, -27.4]], 1.2, '#ffffff');
  stroke(ctx, [[3.6, -41], [9.6, -43.4], [13, -41]], 0.9, '#c7cfdd');
  stroke(ctx, [[-14.6, -42], [-15.6, -35], [-13.6, -27.4]], 1, '#92a1b9');
  fill(ctx, ell(ctx, 0, -35, 2.6, 2.6), '#891e2b');
  fill(ctx, ell(ctx, 0, -35, 1.2, 1.2), '#ea323c');
  ctx.restore();
  if (at) stroke(ctx, [[54, 10], [62, 28], [58, 48]], 1.6, hexA('#d5e8ef', 0.75));
  const elb = at ? [49, 31] : [51, 33];
  twoLimb(ctx, [47, 25], elb, hand, 11, 9.4, 8, ORCSK, [44, 22, 14, 22]);
  shade(ctx, ell(ctx, hand[0], hand[1], 4.6, 4.2), ORCSK, [hand[0] - 5, hand[1] - 4.4, 10, 9], { ao: 0.2 });
  for (const dy of [-2.4, 0, 2.4]) stroke(ctx, [[hand[0] - 3, hand[1] + dy], [hand[0] + 2.6, hand[1] + dy + 0.6]], 0.8, '#134c4c');
  // Cabeça enorme: mandíbula, presas, olhos vermelhos, coroa de ossos.
  const hx = 33;
  const hy = 13;
  ctx.save();
  ctx.translate(hx, hy - 14); ctx.scale(1.3, 1.3); ctx.translate(-hx, -hy + 14);
  const head = P(ctx, `M${hx - 9},${hy + 1} C${hx - 9.4},${hy - 6.6} ${hx + 9.4},${hy - 6.6} ${hx + 9},${hy + 1} C${hx + 10},${hy + 6} ${hx + 7},${hy + 9.4} ${hx + 2},${hy + 9.6} L${hx - 3},${hy + 9.6} C${hx - 7},${hy + 9} ${hx - 9.6},${hy + 6} ${hx - 9},${hy + 1} Z`);
  shade(ctx, head, ORCSK, [hx - 10, hy - 7, 20, 17], { lx: 0.3, ly: 0.18, ao: 0.3 });
  rim(ctx, o, head, [hx - 10, hy - 7, 20, 17], '#ffc825');
  fill(ctx, ell(ctx, hx - 9, hy + 1.4, 2.4, 3.2, -0.3), '#33984b');
  // Pintura de guerra vermelha nas bochechas.
  for (const [x0, x1] of [[hx - 6.6, hx - 3.4], [hx + 5.4, hx + 8.6]]) {
    stroke(ctx, [[x0, hy + 1.6], [x1, hy + 2.6]], 1.1, '#c42430');
  }
  // Boca aberta num rugido: gengiva escura, língua, fileira de dentes e presas grandes de baixo.
  const roar = at ? 1.6 : 0.4 + Math.abs(Math.sin(ph)) * 0.6;
  const mouth = P(ctx, `M${hx - 4.6},${hy + 4.8} C${hx - 2},${hy + 4} ${hx + 3},${hy + 4} ${hx + 6.4},${hy + 4.6} C${hx + 6},${hy + 8 + roar} ${hx - 4},${hy + 8.4 + roar} ${hx - 4.6},${hy + 4.8} Z`);
  fill(ctx, mouth, '#1c121c');
  fill(ctx, ell(ctx, hx + 1, hy + 7.2 + roar * 0.6, 3, 1.2), '#c42430');
  for (let i = 0; i < 5; i += 1) {
    const x = hx - 3 + i * 2.1;
    fill(ctx, poly(ctx, [[x - 0.8, hy + 4.4], [x + 0.8, hy + 4.4], [x, hy + 5.8]]), '#f9e6cf');
  }
  for (const dx of [-3.6, 5.2]) {
    const tk = horn(ctx, [hx + dx, hy + 8.2 + roar], [hx + dx + 0.2, hy + 5.4], [hx + dx + 0.9, hy + 3], 3.2);
    fill(ctx, tk, '#f9e6cf');
    stroke(ctx, [[hx + dx + 1.4, hy + 7.6 + roar], [hx + dx + 1.4, hy + 4]], 0.8, '#cba36f');
  }
  // Nariz largo de porco com narinas.
  fill(ctx, ell(ctx, hx + 1.6, hy + 2.6, 2.6, 1.6), '#1e6f50');
  for (const dx of [0.4, 2.8]) fill(ctx, ell(ctx, hx + dx, hy + 3, 0.7, 0.6), '#0c2e44');
  // Rugas de fúria entre os olhos.
  for (const dx of [0.6, 2.2]) stroke(ctx, [[hx + dx, hy - 3.4], [hx + dx + 0.2, hy - 1]], 0.7, '#134c4c');
  // Olhos vermelhos acesos, maiores, com pupila fina.
  for (const [x, y, r] of [[hx - 2.4, hy - 0.4, 2.5], [hx + 5.6, hy - 0.2, 2.5]]) {
    fill(ctx, ell(ctx, x, y, r + 0.9, r * 0.8 + 0.7), '#0c2e44');
    glow(ctx, x, y, r * 1.5, '#ea323c', { core: '#ffeb57', alpha: 0.5 });
    fill(ctx, ell(ctx, x, y, r, r * 0.78), '#ea323c');
    fill(ctx, ell(ctx, x - 0.3, y - 0.2, r * 0.55, r * 0.45), '#ffc825');
    fill(ctx, ell(ctx, x + 0.4, y, r * 0.22, r * 0.55), INK);
  }
  // Sobrancelha pesada em V e cicatriz atravessando o olho de lá.
  stroke(ctx, [[hx - 6, hy - 4.2], [hx - 1, hy - 2.4], [hx + 1.4, hy - 1.4]], 2.2, '#0c2e44');
  stroke(ctx, [[hx + 2.8, hy - 1.4], [hx + 6, hy - 2.8], [hx + 9, hy - 4.4]], 2.2, '#0c2e44');
  stroke(ctx, [[hx - 4.6, hy - 5.6], [hx - 1.4, hy + 3]], 1, '#f68187');
  for (const t of [0.3, 0.65]) stroke(ctx, [[hx - 4.6 + 3.2 * t - 1, hy - 5.6 + 8.6 * t], [hx - 4.6 + 3.2 * t + 1, hy - 5.6 + 8.6 * t - 0.2]], 0.6, '#891e2b');
  // Coroa de ossos com ponta arredondada.
  const crown = P(ctx, `M${hx - 9.6},${hy - 4} L${hx + 9.6},${hy - 4.6} L${hx + 9.4},${hy - 7.6} L${hx - 9.6},${hy - 7.2} Z`);
  shade(ctx, crown, SK, [hx - 10, hy - 8, 20, 4], { ao: 0 });
  for (const [dx, h] of [[-8, 4], [-4, 6], [0, 8], [4, 6], [8, 4]]) {
    fill(ctx, horn(ctx, [hx + dx, hy - 6.4], [hx + dx + 0.3, hy - 6.4 - h * 0.6], [hx + dx + 0.4, hy - 6.8 - h], 3.4), SK[3]);
    stroke(ctx, [[hx + dx - 0.9, hy - 7.4], [hx + dx - 0.4, hy - 6.4 - h * 0.6]], 0.8, '#ffffff');
  }
  fill(ctx, ell(ctx, hx, hy - 5.8, 1.5, 1.5), '#ea323c');
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- Hidra do brejo
const HY = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
const HY_B = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b'];
const BELLY = ['#cba36f', '#f6ca9f', '#f9e6cf'];

function hydraHead(ctx, x, y, open, ramp, far, o, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // Chifres e franja atrás.
  for (const [dx, dy, len] of [[-2, -4, 7], [-5, -2, 6]]) fill(ctx, horn(ctx, [dx, dy], [dx - len * 0.6, dy - len * 0.2], [dx - len, dy + 1.2], 3), far ? '#918275' : '#cba36f');
  // Mandíbula inferior (abre).
  ctx.save(); ctx.translate(-1, 2.4); ctx.rotate(open * 0.5);
  const jaw = P(ctx, 'M-2,0 C4,2.6 10,2.4 14.4,0.6 C12,3.6 6,5.6 -1,4.2 Z');
  fill(ctx, P(ctx, 'M-1,-0.4 L13,-0.6 L12,1.4 L-1,1.2 Z'), '#571c27');
  shade(ctx, jaw, ramp, [-2, 0, 16, 6], { ao: 0 });
  for (const t of [4, 7.6, 11]) fill(ctx, poly(ctx, [[t - 0.8, 0.6], [t + 0.8, 0.6], [t, -2]]), '#f9e6cf');
  ctx.restore();
  // Interior da boca e crânio.
  fill(ctx, P(ctx, `M2,${0.6} L14,${0.4} L${13},${2 + open * 3} L2,${2 + open * 3} Z`), '#3b1443');
  const skull = P(ctx, 'M-6,0 C-6,-5.6 -1,-7.4 4.6,-6.4 C9,-5.6 13,-3.6 15.4,-1.2 C16.2,-0.2 15.6,1 14,1.2 L0,1.6 C-4,1.6 -6,1 -6,0 Z');
  shade(ctx, skull, ramp, [-6, -7, 22, 9], { lx: 0.3, ly: 0.15, ao: 0.25 });
  scales(ctx, skull, [-6, -7, 22, 9], 1.6, hexA('#0c2e44', 0.7), null, { lw: 0.5 });
  rim(ctx, o, skull, [-6, -7, 22, 9], '#ffc825', 1);
  for (const t of [6, 9.6, 13]) fill(ctx, poly(ctx, [[t - 0.7, 1.2], [t + 0.7, 1.2], [t, 3.6]]), '#ffffff');
  fill(ctx, ell(ctx, 14, -1.6, 0.7, 0.6), INK);
  // Olho amarelo e sobrancelha.
  glow(ctx, 5.2, -2.6, 3.4, '#ffc825', { core: '#ffeb57', alpha: 0.7 });
  fill(ctx, ell(ctx, 5.2, -2.6, 2.2, 1.8), '#ffeb57');
  fill(ctx, ell(ctx, 5.8, -2.6, 0.7, 1.5), INK);
  stroke(ctx, [[1.6, -5], [5.4, -4.4], [8.6, -2.6]], 1.4, ramp[0]);
  ctx.restore();
}

function hydra(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  ctx.save();
  // Poça do brejo.
  const pond = ell(ctx, 32, 57, 30, 5.6);
  shade(ctx, pond, ['#0c2e44', '#134c4c', '#1e6f50', '#33984b'], [2, 51, 60, 11], { ao: 0 });
  stroke(ctx, [[8, 56.4], [14, 57.6]], 0.9, '#5ac54f');
  stroke(ctx, [[48, 58], [56, 56.8]], 0.9, '#5ac54f');
  // Pescoços (o do fundo mais escuro).
  const A = { a: [22, 46], b: [3, 38 + Math.sin(ph) * 2], c: [10 + Math.sin(ph + 1) * 2, 18 + Math.sin(ph) * 1.4] };
  const B = { a: [31, 44], b: [26, 24], c: [31 + Math.sin(ph + 2) * 2, 9 + Math.sin(ph + 1) * 1.4] };
  const Cn = at ? { a: [42, 46], b: [58, 44], c: [56, 36] } : { a: [42, 46], b: [62, 42], c: [52 + Math.sin(ph) * 2, 21 + Math.sin(ph + 3) * 1.4] };
  tube(ctx, B.a, B.b, B.c, 8, 6, HY_B);
  hydraHead(ctx, B.c[0] - 1, B.c[1], at ? 0 : 0.3 + Math.sin(ph) * 0.3, HY_B, true, o, 0.1);
  tube(ctx, A.a, A.b, A.c, 9, 6.6, HY_B.slice(0, 4));
  hydraHead(ctx, A.c[0], A.c[1], 0.25 + Math.sin(ph + 1) * 0.3, HY_B, true, o, -0.15);
  // Corpo mergulhado em escamas, com barriga clara.
  const body = P(ctx, 'M8,56 C6,44 16,36 32,36 C48,36 58,44 56,56 C46,59 18,59 8,56 Z');
  shade(ctx, body, HY, [6, 36, 52, 22], { lx: 0.3, ly: 0.15, ao: 0.5 });
  scales(ctx, body, [6, 36, 52, 22], 2.4, hexA('#0c2e44', 0.8), '#99e65f', { lw: 0.8 });
  rim(ctx, o, body, [6, 36, 52, 22], '#ffc825');
  for (const [x, y] of [[22, 38], [29, 36.4], [36, 36.4], [43, 38.4]]) fill(ctx, horn(ctx, [x, y + 2], [x - 0.4, y - 1], [x - 1.4, y - 3.6], 3.4), '#cba36f');
  // Pescoço da frente (maior) e cabeça principal.
  tube(ctx, Cn.a, Cn.b, Cn.c, 10, 7.4, HY);
  inside(ctx, body, () => {});
  // Linha de barriga clara no pescoço.
  for (let i = 1; i < 14; i += 1) {
    const p = qb(Cn.a, Cn.b, Cn.c, i / 14);
    fill(ctx, ell(ctx, p[0] + 3.2 - i * 0.12, p[1] + 0.8, 1.4, 1.2), BELLY[i % 3]);
  }
  hydraHead(ctx, Cn.c[0], Cn.c[1], at ? 1.7 : 0.4 + Math.sin(ph) * 0.3, HY, false, o, at ? 0.05 : 0.2);
  if (at) glow(ctx, 60, 38, 5, '#99e65f', { core: '#d3fc7e', alpha: 0.6 });
  for (const [x, y, k] of [[8, 53, 0], [58, 52, 1], [30, 60, 2]]) fill(ctx, ell(ctx, x, y - Math.abs(Math.sin(ph + k)) * 1.2, 0.8, 0.8), '#94fdff');
  ctx.restore();
}

// ---------------------------------------------------------------- Gigante de gelo
const GS = ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const GS_B = ['#1a1932', '#2a2f4e', '#424c6e', '#657392'];
const ICE = ['#0069aa', '#0098dc', '#00cdf9', '#94fdff', '#ffffff'];
const ICE_B = ['#00396d', '#0069aa', '#0098dc', '#00cdf9'];

function iceShard(ctx, x, y, w, h, ramp = ICE) {
  const p = poly(ctx, [[x - w / 2, y], [x - w * 0.15, y - h], [x + w * 0.1, y - h * 0.55], [x + w / 2, y]]);
  shade(ctx, p, ramp, [x - w / 2, y - h, w, h], { lx: 0.3, ly: 0.1, ao: 0 });
  stroke(ctx, [[x - w * 0.25, y - 0.6], [x - w * 0.1, y - h * 0.8]], 0.7, '#ffffff');
}

function frostGiant(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.5 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Pernas com botas de gelo e pelo.
  for (const [x, s, ramp] of [[39, -1, GS_B], [26, 1, GS]]) {
    const a = at ? s * 0.16 : sw * s * 0.3;
    const knee = [x + Math.sin(a) * 4, 50];
    const foot = [knee[0] + Math.sin(a) * 2, 56.8 - bob];
    shade(ctx, limb(ctx, [x, 40], knee, 12, 10), ramp, [x - 7, 38, 14, 14], { ao: 0.3 });
    const boot = P(ctx, `M${foot[0] - 6},${foot[1] - 9} L${foot[0] + 5.6},${foot[1] - 9} L${foot[0] + 6},${foot[1] - 2} C${foot[0] + 10},${foot[1] - 1.4} ${foot[0] + 10},${foot[1] + 2.4} ${foot[0] + 7},${foot[1] + 2.4} L${foot[0] - 6.4},${foot[1] + 2.4} Z`);
    shade(ctx, boot, s < 0 ? ICE_B : ICE, [foot[0] - 7, foot[1] - 9, 15, 12], { ao: 0.3 });
    stroke(ctx, [[foot[0] - 5, foot[1] - 5.4], [foot[0] + 5, foot[1] - 5.4]], 1, '#ffffff');
    for (const dx of [-3.6, 0, 3.6]) iceShard(ctx, foot[0] + dx, foot[1] - 8.4, 2.6, 3.4, ICE);
  }
  ctx.save(); ctx.translate(33, 0); ctx.scale(0.8, 0.8); ctx.translate(-33, 0);
  // Braço de trás.
  const bh = at ? [11, 44] : [10 - sw, 45];
  twoLimb(ctx, [16, 28], [11, 37], bh, 11, 9, 7.6, GS_B, [6, 26, 12, 24]);
  shade(ctx, ell(ctx, bh[0], bh[1] + 2.4, 5, 4.6), GS_B, [bh[0] - 5, bh[1] - 2, 10, 10], { ao: 0.2 });
  // Torso de pele azulada com peitoral de gelo.
  const torso = P(ctx, 'M14,28 C15,20 24,17 33,17 C42,17 50,20 51,28 C52,36 49,44 45,48 C39,50.4 27,50.4 21,48 C16.4,44 13,36 14,28 Z');
  shade(ctx, torso, GS, [13, 17, 39, 33], { lx: 0.3, ly: 0.16, ao: 0.45 });
  furTex(ctx, torso, [13, 17, 39, 33], ['#92a1b9', '#424c6e'], { len: 2, lw: 0.8, step: 3.4 });
  const plate = poly(ctx, [[19, 22], [47, 22], [45, 38], [33, 47], [21, 38]]);
  shade(ctx, plate, ICE, [19, 22, 28, 25], { lx: 0.3, ly: 0.1, ao: 0.2 });
  inside(ctx, plate, () => {
    stroke(ctx, [[33, 22], [33, 47]], 1, ICE[0]);
    stroke(ctx, [[22, 31], [33, 28], [44, 31]], 1, ICE[0]);
    stroke(ctx, [[21, 27], [28, 24]], 1.4, '#ffffff');
    stroke(ctx, [[24, 35], [29, 31]], 0.8, '#ffffff');
    glow(ctx, 33, 32, 4, '#94fdff', { core: '#ffffff', alpha: 0.7 });
  });
  rim(ctx, o, plate, [19, 22, 28, 25], '#ffffff', 0.9);
  shade(ctx, P(ctx, 'M19,44 C27,47.4 39,47.4 47,44 L47.6,49.4 C39,52.4 27,52.4 18.4,49.4 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [18, 44, 30, 8], { ao: 0 });
  fill(ctx, ell(ctx, 33, 48, 3, 2.6), '#9cc8e6');
  fill(ctx, ell(ctx, 33, 48, 1.2, 1), '#ffffff');
  // Ombreiras de gelo com cristais.
  for (const [x, y, r, back] of [[17, 22, 8, true], [49, 22, 7.4, false]]) {
    const pad = ell(ctx, x, y, r, r * 0.76);
    shade(ctx, pad, back ? ICE_B : ICE, [x - r, y - r, r * 2, r * 2], { ao: 0.3 });
    rim(ctx, o, pad, [x - r, y - r, r * 2, r * 2], '#ffffff', 0.9);
    iceShard(ctx, x - r * 0.45, y - r * 0.3, 3.8, r * 1.4, back ? ICE_B : ICE);
    iceShard(ctx, x + r * 0.25, y - r * 0.3, 4.4, r * 1.9, back ? ICE_B : ICE);
  }
  // Clava de gelo.
  const hand = at ? [52, 36] : [50, 40];
  const ang = at ? 1.1 : 0.1 + sw * 0.03;
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(ang);
  ctx.translate(0, 13);
  shade(ctx, P(ctx, 'M-2,-26 L2,-26 L2.4,18 L-2.4,18 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [-2, -26, 5, 44], { lx: 0.15, ly: 0.5, ao: 0 });
  for (const y of [-2, 5, 12]) stroke(ctx, [[-2.2, y], [2.2, y + 1]], 0.9, '#1c121c');
  const head = P(ctx, 'M-6,-26 C-9,-32 -8,-40 -3,-45 L1,-50 L5,-44 C10,-42 11,-34 8,-27 C4,-24 -2,-23 -6,-26 Z');
  shade(ctx, head, ICE, [-10, -50, 21, 27], { lx: 0.28, ly: 0.2, ao: 0.2 });
  inside(ctx, head, () => {
    stroke(ctx, [[-4, -31], [0, -38], [-1, -46]], 0.9, ICE[0]);
    stroke(ctx, [[3, -30], [5, -37]], 0.8, ICE[1]);
    stroke(ctx, [[-6.6, -33], [-5, -41]], 1.4, '#ffffff');
  });
  for (const [x, y, w, h, a] of [[-8, -34, 4, 7, -1.2], [10, -36, 4, 7, 1.2], [7, -46, 3.4, 6, 0.5]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); iceShard(ctx, 0, 0, w, h); ctx.restore();
  }
  ctx.restore();
  if (at) stroke(ctx, [[54, 6], [62, 26], [58, 48]], 1.6, hexA('#d5e8ef', 0.8));
  const elb = at ? [49, 31] : [51, 33];
  twoLimb(ctx, [47, 25], elb, hand, 11, 9.4, 8, GS, [44, 22, 14, 22]);
  shade(ctx, ell(ctx, hand[0], hand[1], 4.6, 4.2), GS, [hand[0] - 5, hand[1] - 4.4, 10, 9], { ao: 0.2 });
  // Cabeça: rosto severo, barba de gelo, coroa de pingentes.
  const hx = 33;
  const hy = 13;
  const face = P(ctx, `M${hx - 8},${hy + 1} C${hx - 8.4},${hy - 6} ${hx + 8.4},${hy - 6} ${hx + 8},${hy + 1} C${hx + 8.4},${hy + 6} ${hx + 5},${hy + 8.4} ${hx},${hy + 8.4} C${hx - 5},${hy + 8.4} ${hx - 8.4},${hy + 6} ${hx - 8},${hy + 1} Z`);
  shade(ctx, face, GS, [hx - 9, hy - 6, 18, 15], { lx: 0.3, ly: 0.18, ao: 0.2 });
  const beard = P(ctx, `M${hx - 7},${hy + 3.4} C${hx - 8},${hy + 10} ${hx - 5},${hy + 15} ${hx - 2},${hy + 19} C${hx},${hy + 16} ${hx + 2},${hy + 19} ${hx + 3.4},${hy + 15.6} C${hx + 6},${hy + 14} ${hx + 8.6},${hy + 9} ${hx + 7.6},${hy + 3.4} C${hx + 4},${hy + 6} ${hx - 3},${hy + 6} ${hx - 7},${hy + 3.4} Z`);
  shade(ctx, beard, ICE, [hx - 8, hy + 3, 16, 17], { lx: 0.3, ly: 0.1, ao: 0 });
  inside(ctx, beard, () => { for (const x of [-4, -0.6, 2.8, 5.6]) stroke(ctx, [[hx + x, hy + 6], [hx + x + 0.4, hy + 16]], 0.8, ICE[0]); });
  rim(ctx, o, face, [hx - 9, hy - 6, 18, 15], '#ffffff', 0.9);
  for (const [x, r] of [[hx - 1.8, 2.2], [hx + 4.6, 2.2]]) {
    glow(ctx, x, hy - 0.4, r * 2.4, '#00cdf9', { core: '#ffffff', alpha: 0.8 });
    fill(ctx, ell(ctx, x, hy - 0.4, r, r * 0.8), '#94fdff');
    fill(ctx, ell(ctx, x + 0.5, hy - 0.3, r * 0.4, r * 0.6), '#0069aa');
  }
  stroke(ctx, [[hx - 5.4, hy - 3.8], [hx - 0.6, hy - 1.8]], 2, '#1a1932');
  stroke(ctx, [[hx + 2.8, hy - 1.8], [hx + 7.6, hy - 3.8]], 2, '#1a1932');
  fill(ctx, ell(ctx, hx + 6.8, hy + 2.6, 0.8, 0.7), '#1a1932');
  const crown = P(ctx, `M${hx - 8.8},${hy - 3.4} L${hx + 8.8},${hy - 3.8} L${hx + 8.6},${hy - 6.6} L${hx - 8.8},${hy - 6.2} Z`);
  shade(ctx, crown, ICE, [hx - 9, hy - 7, 18, 4], { ao: 0 });
  for (const [dx, h] of [[-7.4, 4.4], [-3.6, 6.6], [0.4, 9], [4.4, 6.6], [7.8, 4.4]]) iceShard(ctx, hx + dx, hy - 6, 3.8, h);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- Faraó amaldiçoado
const WR = ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];
const GD = ['#5d2c28', '#8a4836', '#edab50', '#ffc825', '#ffeb57'];
const LAP = ['#0c2e44', '#00396d', '#0069aa', '#0098dc'];
const MG = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'];

function pharaoh(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 0.9;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Pernas enfaixadas.
  for (const [x, s, ramp] of [[35, -1, WR.slice(0, 5)], [28, 1, WR]]) {
    const a = at ? s * 0.12 : sw * s * 0.22;
    const knee = [x + Math.sin(a) * 3, 49];
    const foot = [knee[0] + Math.sin(a) * 2, 57.4 - bob];
    shade(ctx, limb(ctx, [x, 40], knee, 8, 6.4), ramp, [x - 5, 38, 10, 12], { ao: 0.3 });
    shade(ctx, limb(ctx, knee, foot, 6.4, 5.8), ramp, [knee[0] - 4, knee[1] - 1, 8, 10], { ao: 0.4 });
    for (const y of [42, 46, 50, 54]) stroke(ctx, [[x - 3.4 + Math.sin(a) * (y - 40) * 0.4, y], [x + 3.4 + Math.sin(a) * (y - 40) * 0.4, y + 1.2]], 0.9, '#494834');
    shade(ctx, P(ctx, `M${foot[0] - 3.4},${foot[1] - 1.4} C${foot[0]},${foot[1] - 3.6} ${foot[0] + 4},${foot[1] - 3} ${foot[0] + 6},${foot[1] - 0.4} L${foot[0] + 6},${foot[1] + 1.2} L${foot[0] - 3.6},${foot[1] + 1.2} Z`), GD, [foot[0] - 4, foot[1] - 3.6, 10, 5], { ao: 0 });
  }
  // Braço de trás: bola de magia verde.
  const bh = at ? [18, 36] : [15, 39 + sw];
  shade(ctx, limb(ctx, [24, 26], [19, 32], 5.6, 4.6), WR.slice(0, 5), [14, 24, 12, 14], { ao: 0.25 });
  shade(ctx, limb(ctx, [19, 32], bh, 4.6, 4), WR.slice(0, 5), [bh[0] - 4, 30, 9, 12], { ao: 0.25 });
  glow(ctx, bh[0] - 1, bh[1] + 3, 6, '#5ac54f', { core: '#d3fc7e', alpha: 0.7 });
  fill(ctx, ell(ctx, bh[0] - 1, bh[1] + 3, 2.8, 2.8), '#99e65f');
  fill(ctx, ell(ctx, bh[0] - 1.6, bh[1] + 2.4, 1.1, 1.1), '#ffffff');
  // Saiote dourado com listras azuis.
  const skirt = poly(ctx, [[23, 38], [43, 38], [46, 50], [20, 50]]);
  shade(ctx, skirt, GD, [20, 38, 26, 12], { lx: 0.3, ly: 0.1, ao: 0.3 });
  inside(ctx, skirt, () => { for (const x of [24, 28.6, 33.2, 37.8, 42.4]) stroke(ctx, [[x, 38], [x + (x - 33) * 0.2, 50]], 1.4, '#0069aa'); });
  stroke(ctx, [[22, 38.6], [44, 38.6]], 1.4, '#ffeb57');
  // Tronco enfaixado.
  const torso = P(ctx, 'M24,29 C25,25 29,24 33,24 C38,24 41,25 42,29 C43,34 41.6,38 40.4,40.4 C36,41.4 30,41.4 25.6,40.4 C24,38 23,34 24,29 Z');
  shade(ctx, torso, WR, [23, 24, 20, 17], { lx: 0.3, ly: 0.15, ao: 0.4 });
  inside(ctx, torso, () => {
    for (let y = 27; y < 42; y += 3.4) { stroke(ctx, [[22, y], [33, y + 1.6], [44, y - 0.4]], 1, '#494834'); stroke(ctx, [[23, y + 1.4], [33, y + 3], [44, y + 1]], 0.7, '#f9e6cf'); }
  });
  rim(ctx, o, torso, [23, 24, 20, 17], '#ffc825');
  // Colar largo de ouro e lápis-lazúli.
  const collar = P(ctx, 'M22.4,25.4 C25,31 41,31 43.6,25.4 C42,22 38,21 33,21 C28,21 24,22 22.4,25.4 Z');
  shade(ctx, collar, GD, [22, 21, 22, 10], { lx: 0.3, ly: 0.1, ao: 0.2 });
  inside(ctx, collar, () => {
    for (const [r, c] of [[6.4, '#0069aa'], [4.2, '#ffeb57']]) stroke(ctx, [[33 - r * 1.4, 24.4], [33, 24.4 + r * 0.8 + 2], [33 + r * 1.4, 24.4]], 1.4, c);
    for (let i = 0; i < 5; i += 1) fill(ctx, ell(ctx, 25.6 + i * 3.6, 27.4 + Math.sin(i / 4 * Math.PI) * 1.8, 0.9, 0.9), '#00cdf9');
  });
  rim(ctx, o, collar, [22, 21, 22, 10], '#ffeb57', 0.9);
  // Cajado de ouro e braço da frente.
  const hand = at ? [50, 32] : [48, 36];
  const ang = at ? 1.05 : 0.04 + sw * 0.02;
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(ang);
  ctx.translate(0, 9);
  shade(ctx, P(ctx, 'M-1.1,-32 L1.1,-32 L1.3,24 L-1.3,24 Z'), GD, [-1.3, -32, 2.6, 56], { lx: 0.2, ly: 0.5, ao: 0 });
  for (const y of [-20, -8, 4, 14]) fill(ctx, ell(ctx, 0, y, 1.8, 1), '#0069aa');
  stroke(ctx, [[0, -32], [0, -36], [3.4, -40], [8, -40], [10.4, -36.6], [9.4, -33]], 2.2, '#5d2c28');
  stroke(ctx, [[0, -32], [0, -36], [3.4, -40], [8, -40], [10.4, -36.6], [9.4, -33]], 1.3, '#ffc825');
  fill(ctx, ell(ctx, 9.4, -32, 1.5, 1.5), '#33984b');
  ctx.restore();
  const elb = at ? [45, 31] : [46, 32];
  shade(ctx, limb(ctx, [41, 27], elb, 6, 5), WR, [38, 24, 12, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 5, 4.4), WR, [Math.min(elb[0], hand[0]) - 3, elb[1] - 2, 12, 10], { ao: 0.2 });
  for (const t of [0.35, 0.7]) stroke(ctx, [[elb[0] + (hand[0] - elb[0]) * t - 2.4, elb[1] + (hand[1] - elb[1]) * t], [elb[0] + (hand[0] - elb[0]) * t + 2.4, elb[1] + (hand[1] - elb[1]) * t + 0.8]], 0.8, '#494834');
  shade(ctx, ell(ctx, hand[0], hand[1], 2.8, 2.6), WR, [hand[0] - 3, hand[1] - 3, 6, 6], { ao: 0 });
  fill(ctx, P(ctx, `M${hand[0] - 3.4},${hand[1] - 2.4} L${hand[0] + 3.4},${hand[1] - 2.4} L${hand[0] + 3.2},${hand[1] - 0.8} L${hand[0] - 3.2},${hand[1] - 0.8} Z`), '#ffc825');
  if (at) {
    glow(ctx, 59, 21, 6, '#5ac54f', { core: '#d3fc7e', alpha: 0.85 });
    fill(ctx, ell(ctx, 59, 21, 3, 3), '#99e65f');
  }
  // Nemes: capa listrada em azul e ouro caindo dos lados.
  const nemes = P(ctx, 'M20,13 C20,5 26,1 33,1 C40,1 46,5 46,13 C46.6,19 47.6,25 46.4,30 L41,26 L40,18 L26,18 L25,26 L19.6,30 C18.6,25 20,19 20,13 Z');
  shade(ctx, nemes, GD, [19, 1, 28, 29], { lx: 0.3, ly: 0.12, ao: 0.3 });
  inside(ctx, nemes, () => { for (let y = 3; y < 31; y += 3.4) stroke(ctx, [[18, y], [48, y + 1]], 1.5, y % 6.8 < 3.4 ? '#0069aa' : '#00396d'); });
  rim(ctx, o, nemes, [19, 1, 28, 29], '#ffeb57', 1);
  // Rosto enfaixado com olhos verdes e barba cerimonial.
  const face = P(ctx, 'M26.4,15 C26.4,9.6 29.6,7 33.4,7 C37.4,7 40.6,9.6 40.6,15 C40.6,19.4 38.2,22.4 33.6,22.4 C29,22.4 26.4,19.4 26.4,15 Z');
  shade(ctx, face, WR, [26, 7, 15, 15], { lx: 0.3, ly: 0.18, ao: 0.3 });
  fill(ctx, P(ctx, 'M27,13.6 C31,12 36,12 40,13.6 L40,17.4 C36,18.6 31,18.6 27,17.4 Z'), '#0e071b');
  for (const x of [31.2, 37]) {
    glow(ctx, x, 15.6, 2.8, '#5ac54f', { core: '#ffffff', alpha: 0.9 });
    fill(ctx, ell(ctx, x, 15.6, 1.7, 1.3), '#99e65f');
    fill(ctx, ell(ctx, x + 0.3, 15.6, 0.6, 0.9), '#ffffff');
  }
  stroke(ctx, [[28.4, 12.6], [32, 13.6]], 1.2, '#494834');
  stroke(ctx, [[35.6, 13.6], [39.8, 12.2]], 1.2, '#494834');
  stroke(ctx, [[28, 20.4], [38.6, 19.6]], 0.9, '#775c5b');
  stroke(ctx, [[29, 22.2], [37, 21.4]], 0.7, '#775c5b');
  shade(ctx, P(ctx, 'M31.4,22 L36,22 L35.4,29.4 L32,29.4 Z'), LAP, [31, 22, 5, 8], { ao: 0 });
  for (const y of [24.4, 26.8]) stroke(ctx, [[31.8, y], [35.6, y]], 0.7, '#ffc825');
  // Cobra real na testa e faixa frontal de ouro.
  stroke(ctx, [[26, 8], [40.6, 7.4]], 1.8, '#ffc825');
  fill(ctx, P(ctx, 'M31.2,8.2 C31,4.6 32.6,2 34.6,1.4 C36.2,2.2 36.4,4.6 35.4,6 C36,7 36.4,8 36,8.8 Z'), '#ffc825');
  fill(ctx, ell(ctx, 34.6, 3.6, 0.8, 0.9), '#ea323c');
  ctx.restore();
}

// ---------------------------------------------------------------- Dragão de brasa
const DG = ['#391f21', '#571c27', '#891e2b', '#c42430', '#ea323c', '#ff5000'];
const DG_B = ['#1c121c', '#3b1443', '#571c27', '#891e2b'];
const DBELLY = ['#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'];

function dragon(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 0.8;
  const sw = at ? 0 : Math.sin(ph);
  const lift = at ? 2.5 : Math.sin(ph) * 2.5;
  ctx.save();
  ctx.translate(at ? -1 : 0, bob);
  // Asa de trás (escura) e asa da frente (membrana carmim com ossos).
  wing(ctx, [32, 30], [23, 9 - lift], [[10, 12 - lift], [5, 23 - lift * 0.4], [12, 33]], MEMB, [3, 2, 32, 30], { vein: '#891e2b', lx: 0.6 });
  // Cauda longa: segmentos afunilados com ponta em lança.
  const tw = at ? 0 : Math.sin(ph) * 2;
  tube(ctx, [10, 41], [-2, 46 + tw], [3, 57 + tw * 0.5], 8, 2.4, DG_B.concat(['#891e2b']).slice(0, 5));
  fill(ctx, poly(ctx, [[3 - 3.4, 54.4 + tw * 0.5], [3, 51 + tw * 0.5], [3 + 3.4, 54.4 + tw * 0.5], [3, 60 + tw * 0.5]]), '#c42430');
  // Pernas de trás.
  const lf = (k) => at ? 0 : Math.max(0, Math.sin(ph + k + Math.PI / 2)) * 2.4;
  for (const [x, s, far] of [[19, -1, true], [12, 1, false]]) {
    const k = s > 0 ? 0 : Math.PI;
    const ramp = far ? DG_B : DG;
    const foot = [x + 1.6 + (at ? 0 : Math.sin(ph + k) * 2.4), 58 - lf(k)];
    const hock = [x - 3.4, 52];
    shade(ctx, ell(ctx, x, 45, 6, 7.4, 0.2), ramp, [x - 7, 36, 14, 16], { ao: 0.3 });
    shade(ctx, limb(ctx, [x, 48], hock, 6.4, 3.6), ramp, [x - 7, 46, 12, 8], { ao: 0.3 });
    shade(ctx, limb(ctx, hock, foot, 3.8, 3.4), ramp, [x - 6, 50, 10, 8], { ao: 0.4 });
    shade(ctx, ell(ctx, foot[0] + 2, foot[1] - 0.2, 4.6, 1.8), ramp, [foot[0] - 3, foot[1] - 2, 10, 4], { ao: 0 });
    for (const dx of [0, 2.4, 4.8]) fill(ctx, poly(ctx, [[foot[0] + dx, foot[1] - 0.6], [foot[0] + dx + 1.6, foot[1] - 0.4], [foot[0] + dx + 2.4, foot[1] + 1.6]]), '#f9e6cf');
  }
  // Corpo: costas arqueadas, peito fundo, barriga de placas.
  const body = P(ctx, 'M5,43 C5,36 14,32 26,32 C37,32 43,34 45,39 C46,45 42,49.4 34,50 C24,51 13,50 8,47 C6,46 5,44.6 5,43 Z');
  shade(ctx, body, DG, [5, 32, 41, 19], { lx: 0.3, ly: 0.14, ao: 0.5 });
  scales(ctx, body, [5, 32, 41, 19], 2.6, hexA('#391f21', 0.85), '#ff5000', { lw: 0.8 });
  const belly = P(ctx, 'M8,46.6 C16,50.6 32,51 41,48.4 C44,45.6 45,42.6 44.6,40 C38,45 22,47 8,46.6 Z');
  shade(ctx, belly, ['#bf6f4a', '#e69c69', '#f6ca9f', '#f9e6cf'], [8, 40, 37, 12], { lx: 0.4, ly: 0.2, ao: 0.1 });
  inside(ctx, belly, () => { for (let x = 12; x < 44; x += 3.4) stroke(ctx, [[x, 40], [x - 1.4, 52]], 0.8, '#8a4836'); });
  rim(ctx, o, body, [5, 32, 41, 19], '#ffc825');
  // Espinhos dorsais redondos.
  for (let x = 14; x <= 38; x += 4.6) {
    const y = 33.6 - Math.sin((x - 14) / 24 * Math.PI) * 2.4;
    fill(ctx, horn(ctx, [x, y + 3], [x - 0.4, y - 0.4], [x - 1.6, y - 3.6], 3.6), x % 2 > 1 ? '#cba36f' : '#f6ca9f');
  }
  // Pernas da frente.
  for (const [x, far] of [[40, true], [34, false]]) {
    const k = far ? 0 : Math.PI;
    const foot = [x + 2 + (at ? 1 : Math.sin(ph + k) * 2.2), 58 - lf(k)];
    const ramp = far ? DG_B : DG;
    shade(ctx, limb(ctx, [x - 1, 44], [x + 1, 51], 7, 5), ramp, [x - 5, 42, 10, 12], { ao: 0.3 });
    shade(ctx, limb(ctx, [x + 1, 51], foot, 5, 4.2), ramp, [x - 4, 49, 9, 10], { ao: 0.4 });
    shade(ctx, ell(ctx, foot[0] + 2, foot[1] - 0.2, 4.4, 1.8), ramp, [foot[0] - 3, foot[1] - 2, 10, 4], { ao: 0 });
    for (const dx of [0, 2.4, 4.8]) fill(ctx, poly(ctx, [[foot[0] + dx, foot[1] - 0.6], [foot[0] + dx + 1.6, foot[1] - 0.4], [foot[0] + dx + 2.4, foot[1] + 1.6]]), '#f9e6cf');
  }
  // Asa da frente por cima do dorso.
  wing(ctx, [34, 30], [31, 8 - lift], [[19, 10 - lift], [13, 21 - lift * 0.4], [20, 30]], ['#571c27', '#891e2b', '#c42430', '#ea323c'], [11, 6, 26, 26], { finger: '#391f21', bone: '#c42430', vein: '#571c27', lx: 0.65 });
  // Pescoço em S e cabeça enorme.
  const head = at ? [53, 22] : [50, 15 + Math.sin(ph) * 0.8];
  tube(ctx, [40, 40], [52, 42], [head[0] - 1, head[1] + 3], 10, 6.4, DG, { n: 18, offs: 0.3 });
  for (let i = 1; i < 12; i += 1) {
    const p = qb([40, 40], [52, 42], [head[0] - 1, head[1] + 3], i / 12);
    fill(ctx, ell(ctx, p[0] + 3 + i * 0.1, p[1] + 1, 1.8, 1.2), DBELLY[1 + (i % 2)]);
  }
  const hx = head[0];
  const hy = head[1];
  for (const [dx, dy, ex, ey] of [[-2, -4, -9, -9], [1, -5, -4, -12]]) fill(ctx, horn(ctx, [hx + dx, hy + dy], [hx + dx * 1.5 - 2, hy + dy - 3], [hx + ex, hy + ey], 3.6), dx < 0 ? '#cba36f' : '#f6ca9f');
  // Mandíbula inferior (abre no ataque).
  const jo = at ? 5 : 1.4;
  ctx.save(); ctx.translate(hx - 1, hy + 3.4); ctx.rotate(jo * 0.1);
  fill(ctx, P(ctx, 'M0,0 L12,-1 L11,2 L0,2.6 Z'), '#3b1443');
  const jaw = P(ctx, 'M-3,0 C3,3.4 9,3.2 13,0.6 C11,4.6 5,6.4 -2,5 Z');
  shade(ctx, jaw, DG, [-3, 0, 16, 6.4], { ao: 0 });
  for (const t of [4, 7.4, 10.6]) fill(ctx, poly(ctx, [[t - 0.8, 0.6], [t + 0.8, 0.6], [t, -2.2]]), '#ffffff');
  ctx.restore();
  fill(ctx, P(ctx, `M${hx - 1},${hy + 3} L${hx + 11},${hy + 2.4} L${hx + 11},${hy + 3.6 + jo * 0.5} L${hx - 1},${hy + 4 + jo * 0.5} Z`), '#3b1443');
  const skull = P(ctx, `M${hx - 7},${hy + 2} C${hx - 7.4},${hy - 5} ${hx - 1},${hy - 8} ${hx + 5},${hy - 6.4} C${hx + 9},${hy - 5.4} ${hx + 12},${hy - 3} ${hx + 13.4},${hy - 0.6} C${hx + 14.4},${hy + 1} ${hx + 13.4},${hy + 2.6} ${hx + 11.6},${hy + 3} L${hx - 1},${hy + 3.6} C${hx - 5},${hy + 3.6} ${hx - 7},${hy + 3} ${hx - 7},${hy + 2} Z`);
  shade(ctx, skull, DG, [hx - 8, hy - 8, 23, 12], { lx: 0.3, ly: 0.12, ao: 0.25 });
  scales(ctx, skull, [hx - 8, hy - 8, 23, 12], 1.8, hexA('#391f21', 0.7), null, { lw: 0.5 });
  rim(ctx, o, skull, [hx - 8, hy - 8, 23, 12], '#ffc825', 1);
  for (const t of [3, 6.6, 10]) fill(ctx, poly(ctx, [[hx + t - 0.8, hy + 3.2], [hx + t + 0.8, hy + 3.2], [hx + t, hy + 5.8]]), '#ffffff');
  fill(ctx, ell(ctx, hx + 12.2, hy - 1.2, 0.8, 0.7), INK);
  glow(ctx, hx + 3.4, hy - 2.6, 3.6, '#ffc825', { core: '#ffffff', alpha: 0.8 });
  fill(ctx, ell(ctx, hx + 3.4, hy - 2.6, 2.4, 1.9), '#ffeb57');
  fill(ctx, ell(ctx, hx + 4, hy - 2.6, 0.7, 1.6), INK);
  stroke(ctx, [[hx - 0.6, hy - 5.4], [hx + 3.6, hy - 4.8], [hx + 7.4, hy - 2.8]], 1.6, '#391f21');
  // Fogo na boca.
  if (at) {
    const fx = hx + 12;
    const fy = hy + 4;
    const flame = P(ctx, `M${fx},${fy - 2} C${fx + 6},${fy - 6} ${fx + 12},${fy - 3} ${fx + 15},${fy + 0.4} C${fx + 12},${fy + 4} ${fx + 6},${fy + 6} ${fx},${fy + 3} Z`);
    glow(ctx, fx + 6, fy + 1, 9, '#ff5000', { core: '#ffc825', alpha: 0.7 });
    shade(ctx, flame, ['#c64524', '#ff5000', '#ffa214', '#ffc825'], [fx, fy - 5, 16, 10], { lx: 0.1, ly: 0.5, ao: 0 });
    fill(ctx, ell(ctx, fx + 3, fy + 0.4, 5, 1.8), '#ffeb57');
    fill(ctx, ell(ctx, fx + 2, fy + 0.4, 2.4, 0.9), '#ffffff');
  } else {
    glow(ctx, hx + 12, hy + 4, 3.4, '#ff5000', { core: '#ffc825', alpha: 0.7 });
    fill(ctx, ell(ctx, hx + 12.4 + (f % 2), hy + 3.4 - (f % 2), 1.2, 1.2), '#ffa214');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Capitão fantasma
const GH = ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'];
const GH_COAT = ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9'];

function wispTail(ctx, x, y, h, flick, col) {
  const p = P(ctx, `M${x - 2.6},${y} C${x - 3},${y + h * 0.5} ${x - 1 + flick},${y + h} ${x + flick},${y + h} C${x + 2 + flick},${y + h * 0.9} ${x + 3},${y + h * 0.5} ${x + 2.6},${y} Z`);
  fill(ctx, p, col);
}

function ghostCaptain(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : Math.sin(ph) * 1.6;
  ctx.save();
  ctx.translate(0, bob - 1);
  // Névoa de fantasma pelo chão.
  for (let i = 0; i < 9; i += 1) {
    const x = 12 + rand(i * 3.3) * 40;
    const y = 52 + rand(i * 1.7) * 6 + Math.sin(ph + i) * 0.8;
    fill(ctx, ell(ctx, x, y, 3 + rand(i) * 3, 1.2), hexA('#0098dc', 0.55));
  }
  // Casacão comprido que termina em fumaça.
  const wv = Math.sin(ph) * 1.6;
  const coat = P(ctx, `M20,26 C21,19 27,17 33,17 C39,17 45,19 46,26 C47,36 49,44 ${50 + wv},50 L${46 + wv},${50 - wv} L${42 + wv},46 L37,${52 + wv} L32,47 L27,${51 - wv} L23,46 L${17 - wv},49 L${16 - wv},44 C17,38 19,32 20,26 Z`);
  shade(ctx, coat, GH_COAT, [15, 17, 36, 40], { lx: 0.3, ly: 0.12, ao: 0.55 });
  inside(ctx, coat, () => {
    stroke(ctx, [[25, 24], [24, 40], [22, 54]], 1.2, '#134c4c');
    stroke(ctx, [[41, 24], [42, 40], [45, 54]], 1.2, '#134c4c');
    stroke(ctx, [[22, 28], [21, 36]], 1.2, '#5ac54f');
    fill(ctx, P(ctx, 'M28,22 L38,22 L36.6,46 L29.4,46 Z'), '#0c2e44');
    stroke(ctx, [[33, 22], [33, 46]], 0.9, '#00396d');
    const g = ctx.createLinearGradient(0, 44, 0, 58);
    g.addColorStop(0, hexA('#0098dc', 0));
    g.addColorStop(1, hexA('#94fdff', 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(10, 44, 46, 16);
  });
  for (let i = 0; i < 8; i += 1) wispTail(ctx, 17 + i * 4.6, 45 + Math.sin(i * 2) * 1.5, 8 + (i % 3) * 3, Math.sin(ph + i) * 1.6, hexA(i % 2 ? '#00cdf9' : '#0098dc', 0.7 - (i % 3) * 0.12));
  rim(ctx, o, coat, [15, 17, 36, 40], '#94fdff', 1);
  for (const y of [24, 29, 34, 39]) { fill(ctx, ell(ctx, 28.4, y, 0.9, 0.9), '#ffc825'); fill(ctx, ell(ctx, 37.6, y, 0.9, 0.9), '#ffc825'); }
  shade(ctx, P(ctx, 'M21,40 C27,42.4 39,42.4 45,40 L45.4,44 C39,46.4 27,46.4 20.6,44 Z'), ['#3b1443', '#571c27', '#891e2b', '#c42430'], [20, 40, 26, 6], { ao: 0 });
  fill(ctx, P(ctx, 'M31,40.6 L35.4,40.6 L35.4,45 L31,45 Z'), '#ffc825');
  // Gola e lapelas claras.
  fill(ctx, poly(ctx, [[27.4, 19], [33, 26], [29, 29], [24.4, 22]]), '#94fdff');
  fill(ctx, poly(ctx, [[38.6, 19], [33, 26], [37, 29], [41.6, 22]]), '#00cdf9');
  // Braço de trás com gancho.
  const bh = at ? [14, 40] : [13, 41 + wv * 0.4];
  shade(ctx, limb(ctx, [22, 25], [16.6, 33], 6, 5), GH_COAT.slice(0, 4), [12, 22, 12, 14], { ao: 0.25 });
  shade(ctx, limb(ctx, [16.6, 33], bh, 5, 4), GH_COAT.slice(0, 4), [bh[0] - 4, 30, 9, 12], { ao: 0.25 });
  stroke(ctx, [[bh[0], bh[1] + 1], [bh[0] - 1, bh[1] + 5], [bh[0] + 2.4, bh[1] + 6.4]], 1.8, '#c7cfdd');
  // Braço da frente com sabre espectral.
  const hand = at ? [51, 25] : [50, 33];
  const ang = at ? 0.7 : -1.1 + Math.sin(ph) * 0.05;
  sabre(ctx, hand, ang, 24, o);
  glow(ctx, hand[0] + Math.cos(ang) * 16, hand[1] + Math.sin(ang) * 16, 8, '#00cdf9', { alpha: 0.35 });
  const elb = at ? [45, 29] : [45, 31];
  shade(ctx, limb(ctx, [42, 25], elb, 6, 5), GH_COAT, [38, 22, 12, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 5, 4), GH_COAT, [Math.min(elb[0], hand[0]) - 3, elb[1] - 2, 12, 10], { ao: 0.2 });
  fill(ctx, P(ctx, `M${hand[0] - 3.4},${hand[1] - 3.4} L${hand[0] + 3.4},${hand[1] - 3.4} L${hand[0] + 3},${hand[1] - 1.4} L${hand[0] - 3},${hand[1] - 1.4} Z`), '#94fdff');
  shade(ctx, ell(ctx, hand[0], hand[1] + 0.4, 2.6, 2.4), GH, [hand[0] - 2.6, hand[1] - 2, 5.2, 4.8], { ao: 0 });
  // Cabeça: crânio translúcido ciano com olhos verdes acesos e barba de algas.
  const hx = 33;
  const hy = 13;
  for (let i = 0; i < 7; i += 1) {
    const x = hx - 5 + i * 1.7;
    const len = 6 + (i % 3) * 2 + Math.sin(ph + i) * 1;
    stroke(ctx, [[x, hy + 6], [x + Math.sin(i + ph) * 1.4, hy + 6 + len * 0.5], [x + Math.sin(i * 2 + ph) * 1.6, hy + 6 + len]], 2, i % 2 ? '#134c4c' : '#1e6f50');
    stroke(ctx, [[x - 0.4, hy + 6], [x - 0.2, hy + 6 + len * 0.5]], 0.8, '#33984b');
  }
  const skull = P(ctx, `M${hx - 7.4},${hy - 0.4} C${hx - 7.8},${hy - 7} ${hx + 7.8},${hy - 7} ${hx + 7.4},${hy - 0.4} C${hx + 7.4},${hy + 2.4} ${hx + 6},${hy + 4} ${hx + 5},${hy + 5} L${hx + 4.6},${hy + 7.4} L${hx - 4.4},${hy + 7.4} L${hx - 5},${hy + 5} C${hx - 6.4},${hy + 4} ${hx - 7.4},${hy + 2.4} ${hx - 7.4},${hy - 0.4} Z`);
  shade(ctx, skull, ['#0069aa', '#0098dc', '#00cdf9', '#94fdff', '#d5e8ef'], [hx - 8, hy - 7, 16, 15], { lx: 0.3, ly: 0.2, ao: 0.1 });
  rim(ctx, o, skull, [hx - 8, hy - 7, 16, 15], '#ffffff', 0.9);
  for (const [x, r] of [[hx - 3, 2.6], [hx + 3.6, 2.6]]) {
    fill(ctx, ell(ctx, x, hy, r + 0.6, r + 1), '#0c2e44');
    glow(ctx, x, hy, r * 2, '#5ac54f', { core: '#d3fc7e', alpha: 0.9 });
    fill(ctx, ell(ctx, x, hy + 0.2, r * 0.7, r * 0.8), '#d3fc7e');
  }
  stroke(ctx, [[hx - 6, hy - 3.6], [hx - 1.4, hy - 1.6]], 1.4, '#00396d');
  stroke(ctx, [[hx + 1.6, hy - 1.6], [hx + 6.4, hy - 3.6]], 1.4, '#00396d');
  fill(ctx, poly(ctx, [[hx + 0.2, hy + 2.4], [hx + 1.6, hy + 5], [hx - 1.2, hy + 5]]), '#0c2e44');
  fill(ctx, poly(ctx, [[hx - 4, hy + 5.4], [hx + 4, hy + 5.4], [hx + 3.6, hy + 7.4], [hx - 3.6, hy + 7.4]]), '#0c2e44');
  for (let i = 0; i < 4; i += 1) fill(ctx, poly(ctx, [[hx - 3 + i * 1.8, hy + 5.6], [hx - 1.8 + i * 1.8, hy + 5.6], [hx - 1.8 + i * 1.8, hy + 7.2], [hx - 3 + i * 1.8, hy + 7.2]]), '#ffffff');
  // Tricórnio com caveira, galão dourado e pluma.
  ctx.save(); ctx.translate(33, 9); ctx.scale(0.8, 0.8); ctx.translate(-33, -9);
  const hat = P(ctx, 'M16,10 C18,4.6 24,1.8 27,1.2 C30,0 36,0 39,1.2 C43,2.4 47,5 49,10 C42,8 38,8 33,8.4 C28,8 23,8 16,10 Z');
  shade(ctx, hat, ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e'], [15, 0, 34, 11], { lx: 0.3, ly: 0.1, ao: 0.2 });
  rim(ctx, o, hat, [15, 0, 34, 11], '#94fdff', 1);
  stroke(ctx, [[16.6, 9.8], [33, 8], [48.4, 9.8]], 1.5, '#ffc825');
  fill(ctx, ell(ctx, 33, 4.6, 2.4, 2.2), '#f9e6cf');
  fill(ctx, ell(ctx, 32.1, 4.6, 0.6, 0.7), INK);
  fill(ctx, ell(ctx, 34, 4.6, 0.6, 0.7), INK);
  stroke(ctx, [[29.4, 8], [36.6, 6.4]], 0.7, '#f9e6cf');
  stroke(ctx, [[18, 7], [14, 2 + wv * 0.4], [11, 5]], 1.4, '#94fdff');
  ctx.restore();
  // Faíscas fantasmas.
  for (let i = 0; i < 4; i += 1) fill(ctx, ell(ctx, 8 + rand(i * 5.1) * 48, 10 + ((rand(i * 2.3) * 40 - f * 3 + 80) % 40), 0.7, 0.7), '#d5e8ef');
  ctx.restore();
}

export const MONSTERS_2C = {
  demon: { size: 56, elite: 64, shadow: [32, 59.5, 14, 2.6], paint: demon },
  crab: { size: 44, elite: 52, shadow: [32, 59, 22, 2.6], paint: crab },
  pirate: { size: 48, elite: 56, shadow: [32, 58.5, 12, 2.4], paint: pirate },
  orcChief: { size: 104, elite: 104, shadow: [32, 59, 22, 3], paint: orcChief },
  hydra: { size: 96, elite: 96, shadow: [32, 59.5, 28, 3.4], paint: hydra },
  frostGiant: { size: 96, elite: 96, shadow: [32, 59, 22, 3], paint: frostGiant },
  pharaoh: { size: 96, elite: 96, shadow: [32, 59, 14, 2.6], paint: pharaoh },
  dragon: { size: 112, elite: 112, shadow: [30, 59.5, 24, 3], paint: dragon },
  ghostCaptain: { size: 96, elite: 96, shadow: [32, 60, 14, 2.2], paint: ghostCaptain }
};
