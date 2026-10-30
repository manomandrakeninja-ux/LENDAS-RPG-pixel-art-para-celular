// Lote 2 (2b): monstros de src/art/monstersRegions.js repintados.
// bruxa, lobo do gelo, yeti, elemental de gelo, escorpiao, mumia, verme da areia, diabrete, salamandra.
import { C, P, ell, fill, glow, glint, hexA, horn, inside, limb, phaseOf, rand, rimWarm, scales, furTex, shade, stroke, eye } from './kit.mjs';
import { leg } from './lote1.mjs';

/** Caminho poligonal a partir de pontos. */
function poly(ctx, pts) {
  const p = new ctx.Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

/** Cristal facetado: lado esquerdo claro, direito escuro, aresta de luz e brilho. */
function gem(ctx, T, L, B, R, ramp, { glintOn = true } = {}) {
  const n = ramp.length;
  const left = poly(ctx, [T, L, B]);
  const right = poly(ctx, [T, R, B]);
  shade(ctx, left, ramp.slice(1, n), [L[0], T[1], B[0] - L[0] + 2, B[1] - T[1]], { ao: 0.15, lx: 0.2, ly: 0.2 });
  shade(ctx, right, ramp.slice(0, n - 2), [T[0], T[1], R[0] - T[0], B[1] - T[1]], { ao: 0.25, lx: 0.1, ly: 0.2 });
  stroke(ctx, [T, B], 0.9, ramp[n - 1]);
  stroke(ctx, [L, T], 0.8, ramp[n - 1]);
  stroke(ctx, [B, R], 0.8, ramp[0]);
  if (glintOn) fill(ctx, ell(ctx, T[0] - (T[0] - L[0]) * 0.35, T[1] + (B[1] - T[1]) * 0.18, 0.7, 0.7), '#ffffff');
}

// ---------------------------------------------------------------- Bruxa do brejo
const CLOAK = ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9'];
const HAT = ['#0e071b', '#1a1932', '#3b1443', '#622461', '#93388f'];
const WSKIN = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];

function witch(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const sw = at ? 0 : Math.sin(ph);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.1;
  ctx.save();
  ctx.translate(at ? 1 : 0, bob);
  // Cajado torto com orbe: no ataque aponta para a frente.
  const base = at ? [46, 58.5 - bob] : [55, 58.5 - bob];
  const top = at ? [58, 16] : [56 + sw * 0.4, 11];
  ctx.save();
  stroke(ctx, [base, [(base[0] + top[0]) / 2 + 1.4, (base[1] + top[1]) / 2], top], 3, '#391f21');
  stroke(ctx, [[base[0] - 0.5, base[1]], [(base[0] + top[0]) / 2 + 0.6, (base[1] + top[1]) / 2], [top[0] - 0.5, top[1]]], 1.1, '#8a4836');
  ctx.restore();
  // Botas pontudas (embaixo da barra).
  for (const [x, col] of [[19, '#391f21'], [34, '#5d2c28']]) {
    const boot = P(ctx, `M${x - 3},54 L${x + 3},54 C${x + 3},57 ${x + 6},57.2 ${x + 9},58.2 C${x + 9},59.6 ${x + 6},59.8 ${x - 3},59.8 Z`);
    shade(ctx, boot, ['#1c121c', '#391f21', col, '#bf6f4a'], [x - 3, 54, 12, 6], { ao: 0.3 });
    glint(ctx, x + 3.6, 57.2, 3, '#e69c69', { lw: 0.9, angle: 0.1 });
  }
  // Capa afunilada, barra em pontas irregulares e corcunda.
  let d = 'M34,22 C24,15 12,21 11.5,34 C11.5,42 14,48 16,51.5';
  const depth = [5.6, 1, 4.4, 0.4, 6, 1.2, 4.8, 0.6];
  const nn = depth.length;
  for (let i = 0; i < nn; i += 1) {
    const x = 16 + (42 - 16) * ((i + 1) / nn);
    const y = 51.5 + depth[i] + Math.sin(ph + i * 1.3) * 0.7;
    d += ` L${x},${y}`;
  }
  d += ' C42.5,46 42.5,38 41.5,31 C40,23 38,20 34,19.5 Z';
  const cloak = P(ctx, d);
  shade(ctx, cloak, CLOAK, [11, 18, 32, 42], { lx: 0.28, ly: 0.12, ao: 0.5 });
  inside(ctx, cloak, () => {
    for (const [a1, b1, c1, d1] of [[36, 28, 22, 54], [30, 26, 19, 50], [40, 34, 33, 57], [24, 26, 15, 46]]) stroke(ctx, [[a1, b1], [(a1 + c1) / 2 + 1.4, (b1 + d1) / 2], [c1, d1]], 1.5, '#0e071b');
    for (const [a1, b1, c1, d1] of [[33, 27, 20, 52], [38, 31, 30, 55]]) stroke(ctx, [[a1, b1], [(a1 + c1) / 2 + 1.4, (b1 + d1) / 2], [c1, d1]], 1.1, '#93388f');
    fill(ctx, poly(ctx, [[27, 40], [32, 39], [32.6, 44], [27.4, 44.6]]), '#93388f');
    stroke(ctx, [[27.4, 40.4], [32, 39.6], [32.4, 44], [27.8, 44.4], [27.4, 40.4]], 0.8, '#ca52c9');
    stroke(ctx, [[14, 51], [20, 52.6], [28, 51.4], [36, 52.8], [43, 51.6]], 1.6, '#0e071b');
  });
  rimWarm(ctx, cloak, [11, 18, 32, 42], '#ca52c9', 1.1 * o.px, { alpha: 0.8 });
  // Cabelo grisalho escorrido saindo do chapéu.
  const hair = P(ctx, 'M36,20 C30,20 28,26 28.6,33 C28.8,38 30.6,41 33,42 C32.4,37 33.6,32 36,28 Z');
  shade(ctx, hair, C.coolGrey, [28, 19, 9, 24], { ao: 0.2 });
  for (const [x0, y0, x1, y1] of [[32, 24, 30.8, 36], [34.4, 25, 33.4, 38]]) stroke(ctx, [[x0, y0], [x1, y1]], 1.2, '#c7cfdd');
  // Braço de manga larga e mão ossuda de unhas longas no cajado.
  const hand = at ? [51, 31] : [54.6, 34];
  const sleeve = P(ctx, `M37,27 C42,25.6 48,28 ${hand[0] - 3},${hand[1] - 3.4} L${hand[0] - 1},${hand[1] + 2} C46,38 40,36 35,33 Z`);
  shade(ctx, sleeve, CLOAK, [35, 25, 16, 13], { ao: 0.3 });
  stroke(ctx, [[38, 30], [45, 32.4]], 1.3, '#3b1443');
  fill(ctx, ell(ctx, hand[0], hand[1], 2.8, 2.4), '#5ac54f');
  for (const k of [-2, -0.2, 1.6]) {
    stroke(ctx, [[hand[0] + k, hand[1] - 1], [hand[0] + k + 0.5, hand[1] + 2.6]], 1.3, '#33984b');
    fill(ctx, ell(ctx, hand[0] + k + 0.6, hand[1] + 3.2, 0.7, 1), '#f9e6cf');
  }
  // Rosto de perfil: queixo pontudo, nariz ganchudo comprido, olho amarelo e sorriso torto.
  const fx = 41;
  const fy = 27;
  const chin = horn(ctx, [fx - 3.4, fy + 4], [fx - 1, fy + 11], [fx + 6, fy + 12.4], 7);
  shade(ctx, chin, ['#1e6f50', '#33984b', '#5ac54f', '#99e65f'], [fx - 4, fy + 3, 12, 11], { ao: 0 });
  const face = ell(ctx, fx, fy, 7.6, 7.2);
  shade(ctx, face, ['#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'], [fx - 7.6, fy - 7.2, 15.2, 14.4], { ao: 0.25, lx: 0.4, ly: 0.2 });
  const nose = horn(ctx, [fx + 4, fy - 2.4], [fx + 13.4, fy - 2.2], [fx + 13.4, fy + 7.2], 6.6);
  shade(ctx, nose, ['#1e6f50', '#33984b', '#5ac54f', '#99e65f'], [fx + 3, fy - 3, 12, 11], { ao: 0.1, lx: 0.3 });
  fill(ctx, ell(ctx, fx + 11.2, fy + 3.6, 1.3, 1.3), '#134c4c');
  fill(ctx, ell(ctx, fx + 8, fy + 5.6, 1, 0.9), '#0e071b');
  glow(ctx, fx + 2.8, fy - 2.6, 4, '#ffc825', { core: '#ffeb57', alpha: 0.75 });
  eye(ctx, fx + 2.8, fy - 2.6, 2.7, { iris: '#ffeb57', brow: '#0e071b', browTilt: 0.7, pupil: '#0e071b' });
  stroke(ctx, [[fx - 3, fy + 5.6], [fx + 2.4, fy + 6.6], [fx + 7, fy + 4.4]], 1.3, '#0e071b');
  fill(ctx, poly(ctx, [[fx + 1, fy + 6.2], [fx + 3.6, fy + 6.2], [fx + 2.4, fy + 9]]), '#f9e6cf');
  rimWarm(ctx, face, [fx - 7.6, fy - 7.2, 15.2, 14.4], '#ffc825', 1 * o.px, { side: 't', alpha: 0.9 });
  // Chapéu: aba larga, cone dobrado para trás e fivela de ouro.
  ctx.save();
  ctx.translate(3.4, 0);
  const brim = ell(ctx, 36, 19, 12.5, 3.2, -0.07);
  shade(ctx, brim, HAT, [23, 15, 25, 8], { ao: 0.2, ly: 0.1 });
  const cone = P(ctx, 'M26.4,18.6 C27.4,12.6 31,9 35,7.6 C38.4,9 42,13 45.6,18.2 C38,21 32,21.4 26.4,18.6 Z');
  shade(ctx, cone, HAT, [26, 7, 20, 13], { lx: 0.25, ly: 0.2, ao: 0.4 });
  const tipA = limb(ctx, [33, 9.6], [24, 3.4], 6.2, 2);
  shade(ctx, tipA, HAT, [22, 2, 12, 9], { ao: 0.2 });
  const tipB = limb(ctx, [25, 4], [19.6, 6.8], 3.2, 1.6);
  shade(ctx, tipB, HAT, [18, 2, 8, 6], { ao: 0.2 });
  inside(ctx, cone, () => stroke(ctx, [[28.6, 14], [32, 10.4]], 1.1, '#93388f'));
  stroke(ctx, [[27, 17.4], [36, 19.6], [45, 17.2]], 2.2, '#391f21');
  fill(ctx, poly(ctx, [[34, 16.6], [38.4, 16.8], [38.2, 20.2], [34.2, 20]]), '#ffc825');
  fill(ctx, poly(ctx, [[35.2, 17.6], [37.2, 17.7], [37.1, 19.2], [35.3, 19.1]]), '#391f21');
  rimWarm(ctx, brim, [23, 15, 25, 8], '#ca52c9', 1 * o.px, { side: 't', alpha: 0.8 });
  ctx.restore();
  // Orbe verde brilhando.
  glow(ctx, top[0], top[1], at ? 10 : 7.4, '#5ac54f', { core: '#d3fc7e', alpha: at ? 0.9 : 0.8 });
  shade(ctx, ell(ctx, top[0], top[1], 3.9, 3.9), ['#134c4c', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'], [top[0] - 4, top[1] - 4, 8, 8], { ao: 0 });
  fill(ctx, ell(ctx, top[0] - 1.2, top[1] - 1.2, 1.1, 1.1), '#ffffff');
  stroke(ctx, [[top[0] - 3.4, top[1] + 3.8], [top[0], top[1] + 4.6], [top[0] + 3.4, top[1] + 3.8]], 1.2, '#391f21');
  for (let i = 0; i < 3; i += 1) {
    const a = ph + i * 2.1;
    fill(ctx, ell(ctx, top[0] + Math.cos(a) * 6.4, top[1] + Math.sin(a) * 5, 0.9, 0.9), '#d3fc7e');
  }
  if (at) {
    stroke(ctx, [[top[0] + 3, top[1]], [top[0] + 8, top[1] - 2], [62, top[1] + 2]], 2.4, hexA('#99e65f', 0.85));
    stroke(ctx, [[top[0] + 3, top[1]], [top[0] + 8, top[1] - 2], [62, top[1] + 2]], 0.9, '#ffffff');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Lobo do gelo
const FROST = ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#d5e8ef', '#ffffff'];
const FROST_FAR = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9'];
const CRYS = ['#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'];

function frostWolf(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1.5 : Math.cos(ph * 2) * 0.8;
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  if (at) { ctx.translate(34, 40); ctx.rotate(-0.1); ctx.translate(-34, -40); }
  const sw = (off) => (at ? 0 : Math.sin(ph + off) * 0.5);
  const lf = (off) => (at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2)));
  // Cauda peluda.
  const tw = at ? -0.5 : Math.sin(ph) * 2;
  const tail = P(ctx, `M15,30 C9,28 5,32 3,${38 + tw} C2,${43 + tw} 5,${45 + tw} 7.5,${42 + tw} C9.5,${39 + tw} 11,35 16,35 Z`);
  shade(ctx, tail, FROST, [2, 28, 14, 18], { ao: 0.25 });
  furTex(ctx, tail, [2, 28, 14, 18], ['#d5e8ef', '#657392'], { len: 2.2, lw: 0.9, step: 2.6, dx: -0.8, dy: 0.6 });
  fill(ctx, ell(ctx, 4.2, 43 + tw, 1.5, 1.6), '#ffffff');
  const lo = (ramp, hock) => ({ upper: 8, lower: 10, wTop: 7, wMid: 4, wPaw: 3.8, ramp, hock, paw: '#1a1932' });
  leg(ctx, [19, 40], at ? -0.8 : sw(Math.PI), { ...lo(FROST_FAR, true), lift: lf(Math.PI) });
  leg(ctx, [42, 41], at ? 0.9 : sw(0), { ...lo(FROST_FAR, false), lift: lf(0) });
  // Corpo longo e alto no peito.
  const body = P(ctx, `M12,35 C12,28 18,26 26,26.5 C33,27 38,24 44,25 C49.5,26 51,33 49,39
    C47.5,43.5 42,44 37,42.5 C31,41.5 25,43.5 20,43.5 C14.5,43.5 12,40 12,35 Z`);
  shade(ctx, body, FROST, [11, 24, 40, 20], { lx: 0.4, ly: 0.1, ao: 0.4 });
  furTex(ctx, body, [11, 24, 40, 20], ['#d5e8ef', '#92a1b9', '#424c6e'], { len: 2.6, lw: 0.95, step: 2.8, dx: -0.8, dy: 0.7 });
  inside(ctx, body, () => stroke(ctx, [[17, 41], [28, 40], [38, 41.4]], 1.3, '#424c6e'));
  rimWarm(ctx, body, [11, 24, 40, 20], '#edab50', 1.2 * o.px, { side: 't', alpha: 0.85 });
  // Juba de cristais de gelo ao longo do dorso (grossos e arredondados).
  for (const [x, h, w] of [[18, 5, 4.6], [24, 7, 5.2], [30, 8, 5.4], [36, 7, 5], [42, 5.5, 4.6]]) {
    const y = 26 - (x > 32 ? 0.6 : 0);
    gem(ctx, [x - w * 0.12, y - h], [x - w / 2, y + 0.5], [x + w * 0.1, y + 1.4], [x + w / 2, y + 0.2], CRYS);
  }
  leg(ctx, [18, 40], at ? 0.6 : sw(0), { ...lo(FROST, true), lift: lf(0) });
  leg(ctx, [44, 41], at ? 1.2 : sw(Math.PI), { ...lo(FROST, false), lift: lf(Math.PI) });
  // Cabeça grande de lobo: orelhas, focinho, presas e olho azul.
  ctx.save();
  ctx.translate(46, 30);
  ctx.scale(1.22, 1.22);
  ctx.translate(-46, -30);
  const jo = at ? 3.4 : 0;
  if (at) {
    const jaw = P(ctx, `M49,33 C53,33.5 57.5,${34 + jo} 61,${35 + jo} C60,${37.6 + jo} 55,${38 + jo} 51,36 Z`);
    shade(ctx, jaw, FROST, [49, 33, 12, 7], { ao: 0.2 });
    fill(ctx, poly(ctx, [[50.4, 33], [61, 33.8], [60.4, 35.4 + jo], [51, 34.6]]), '#571c27');
    for (const x of [54, 57.4]) fill(ctx, P(ctx, `M${x - 0.8},${35.2 + jo} l1.6,0 l-0.8,-2.4 Z`), '#ffffff');
  }
  const head = P(ctx, 'M43.6,26 C44.4,20 50,18.4 54.4,20.2 C57,21.4 58.4,24 60.6,26.4 C62.2,28.2 61.6,32 59.4,33 C55.6,34.2 51.4,34.2 48.4,33.4 C45,32.4 43.2,29.4 43.6,26 Z');
  shade(ctx, head, FROST, [43, 18, 19, 16], { lx: 0.3, ly: 0.2, ao: 0.25 });
  furTex(ctx, head, [43, 18, 19, 16], ['#ffffff', '#92a1b9'], { len: 2, lw: 0.9, step: 2.8, dx: -0.8, dy: 0.5, seed: 9 });
  rimWarm(ctx, head, [43, 18, 19, 16], '#ffc825', 1.2 * o.px, { alpha: 0.85 });
  for (const [x, far] of [[47, true], [52, false]]) {
    const ear = P(ctx, `M${x - 3},22 C${x - 3.4},18 ${x - 1},14.6 ${x + 0.6},14 C${x + 2},15.6 ${x + 3},18.6 ${x + 2.6},22 Z`);
    shade(ctx, ear, far ? FROST_FAR : FROST, [x - 3, 13, 7, 10], { ao: 0 });
    fill(ctx, P(ctx, `M${x - 1},21 C${x - 1.2},18.6 ${x - 0.2},16.6 ${x + 0.6},16.4 C${x + 1.2},18 ${x + 1.4},19.8 ${x + 1.2},21 Z`), far ? '#424c6e' : '#9cc8e6');
  }
  fill(ctx, ell(ctx, 61, 28.8, 1.7, 1.4), '#0e071b');
  stroke(ctx, [[54, 30], [61, 29.8]], 2, '#657392');
  fill(ctx, ell(ctx, 60.6, 28.3, 0.5, 0.4), '#ffffff');
  stroke(ctx, [[54.4, 30.6], [58, 31], [60.4, 30.4]], 0.9, '#1a1932');
  if (!at) for (const x of [56.6, 59]) fill(ctx, P(ctx, `M${x - 0.7},30.8 l1.4,0 l-0.7,2 Z`), '#ffffff');
  // Olho azul brilhante com sobrancelha franzida.
  glow(ctx, 54.6, 25, 4.4, '#00cdf9', { core: '#ffffff' });
  fill(ctx, P(ctx, 'M52.4,25.2 C53.6,23.8 56,23.8 57.2,25 C56,26.4 53.6,26.6 52.4,25.2 Z'), '#94fdff');
  fill(ctx, ell(ctx, 54.9, 25.1, 0.5, 0.95), '#0e071b');
  stroke(ctx, [[51.8, 22.6], [54.8, 22.4], [57.6, 24]], 1.3, '#1a1932');
  ctx.restore();
  // Hálito gelado.
  if (at) {
    for (const [x, y, r] of [[63, 35, 1.4], [61.6, 38.6, 1.1], [63.4, 40.6, 0.9]]) fill(ctx, ell(ctx, x, y, r, r), '#d5e8ef');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Yeti
const YFUR = ['#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#d5e8ef', '#ffffff'];
const YFAR = ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const YFACE = ['#00396d', '#0069aa', '#0098dc', '#00cdf9'];

function bigFur(ctx, path, box, colors, opts = {}) {
  const far = colors[0] === YFAR[3] || colors[0] === '#657392';
  furTex(ctx, path, box, far ? ['#c7cfdd', '#92a1b9', '#657392'] : ['#ffffff', '#d5e8ef', '#9cc8e6', '#92a1b9'], { len: 4.2, lw: 1.8, step: 4.6, dx: -0.4, dy: 1, seed: opts.seed ?? 3 });
}

function yeti(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.2;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  const ground = 58.5 - bob;
  // Pernas curtas e grossas com pés grandes.
  for (const [x, s, ramp] of [[24, 1, YFAR], [37, -1, YFUR]]) {
    const dx = sw * s * 2;
    const lg = limb(ctx, [x, 44], [x + dx, ground - 3], 11, 9.5);
    shade(ctx, lg, ramp, [x - 6, 43, 12, 16], { ao: 0.4 });
    bigFur(ctx, lg, [x - 6, 43, 12, 16], [ramp[3], ramp[1]], { len: 2.4, lw: 0.9, step: 2.8, seed: x });
    const foot = ell(ctx, x + dx + 2, ground - 1.2, 7, 3.1);
    shade(ctx, foot, ['#2a2f4e', '#424c6e', '#657392'], [x + dx - 5, ground - 4, 14, 6], { ao: 0.3 });
    for (const k of [-2.4, 0.4, 3.2]) fill(ctx, ell(ctx, x + dx + 6.4 + k * 0.3, ground - 1.4 + k * 0.4, 1.2, 1.1), '#f9e6cf');
  }
  // Braço de trás (escuro).
  const bh = at ? [49, 41] : [17 - sw * 2, 49];
  const ba = limb(ctx, [22, 27], [(22 + bh[0]) / 2 - 3, 38], 12, 10);
  shade(ctx, ba, YFAR, [10, 22, 16, 20], { ao: 0.3 });
  const bf = limb(ctx, [(22 + bh[0]) / 2 - 3, 38], bh, 10, 8.4);
  shade(ctx, bf, YFAR, [bh[0] - 6, 34, 14, 18], { ao: 0.35 });
  bigFur(ctx, bf, [bh[0] - 6, 34, 14, 18], [YFAR[3], YFAR[1]], { len: 2.4, lw: 0.9, seed: 5 });
  shade(ctx, ell(ctx, bh[0], bh[1] + 2.4, 5, 4.4), ['#1a1932', '#2a2f4e', '#424c6e', '#657392'], [bh[0] - 5, bh[1] - 2, 10, 9], { ao: 0.2 });
  for (const k of [-2.4, 0, 2.4]) fill(ctx, P(ctx, `M${bh[0] + k - 0.9},${bh[1] + 5.6} l1.8,0 l-0.9,2.2 Z`), '#c7cfdd');
  // Corpo enorme com barriga clara.
  const torso = P(ctx, 'M16,30 C15,19 23,15 32,15 C41,15 49,19 48,30 C49,38 47,45 42,48 C37,50 27,50 22,48 C17,45 15,38 16,30 Z');
  shade(ctx, torso, YFUR, [14, 14, 36, 36], { lx: 0.32, ly: 0.2, ao: 0.4 });
  bigFur(ctx, torso, [14, 14, 36, 36], ['#ffffff', '#92a1b9', '#424c6e', '#c7cfdd'], { len: 3, lw: 1.1, step: 3, dx: -0.5, dy: 1, seed: 11 });
  inside(ctx, torso, () => {
    fill(ctx, ell(ctx, 33, 37, 8, 9), hexA('#c7cfdd', 0.55));
    bigFur(ctx, ell(ctx, 33, 37, 8, 9), [25, 28, 16, 18], ['#ffffff', '#92a1b9'], { len: 2.4, lw: 1, step: 2.8, seed: 21 });
  });
  rimWarm(ctx, torso, [14, 14, 36, 36], '#edab50', 1.3 * o.px, { alpha: 0.9 });
  // Braço da frente: soco para a frente.
  const fh = at ? [57, 34] : [50 + sw * 2, 47];
  const fe = at ? [51, 25] : [48, 36];
  const fa = limb(ctx, [42, 22], fe, 12.5, 10.5);
  shade(ctx, fa, YFUR, [38, 16, 16, 22], { ao: 0.2 });
  const fb = limb(ctx, fe, fh, 10.5, 9.2);
  shade(ctx, fb, YFUR, [Math.min(fe[0], fh[0]) - 5, Math.min(fe[1], fh[1]) - 3, 16, 22], { ao: 0.3 });
  bigFur(ctx, fa, [38, 16, 16, 22], ['#ffffff', '#657392'], { len: 2.6, lw: 1, seed: 31 });
  bigFur(ctx, fb, [Math.min(fe[0], fh[0]) - 5, Math.min(fe[1], fh[1]) - 3, 16, 22], ['#ffffff', '#657392'], { len: 2.6, lw: 1, seed: 41 });
  rimWarm(ctx, fa, [38, 16, 16, 22], '#edab50', 1.2 * o.px, { side: 't', alpha: 0.8 });
  shade(ctx, ell(ctx, fh[0], fh[1] + 1.6, 5.6, 5), ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9'], [fh[0] - 5.6, fh[1] - 3, 11, 10], { ao: 0.2 });
  for (const k of [-2.8, 0, 2.8]) fill(ctx, P(ctx, `M${fh[0] + k - 1},${fh[1] + 5} l2,0 l-1,2.6 Z`), '#f9e6cf');
  // Cabeça grande: rosto azul, olhos amarelos, presas, chifres.
  const hx = at ? 36 : 35;
  const hy = at ? 13 : 14;
  for (const [s, h] of [[-1, 0.3], [1, 0]]) {
    const hp = horn(ctx, [hx - 2 + s * 6, hy - 6], [hx + s * 10 + (s < 0 ? -2 : 3), hy - 9 - h], [hx + s * 10 + (s < 0 ? -3 : 3), hy - 15], 4.4);
    shade(ctx, hp, ['#775c5b', '#cba36f', '#f6ca9f', '#f9e6cf'], [hx + s * 7 - 4, hy - 16, 9, 11], { ao: 0 });
  }
  const head = P(ctx, `M${hx - 9},${hy + 1} C${hx - 9.6},${hy - 7} ${hx + 9},${hy - 8} ${hx + 9.6},${hy + 1} C${hx + 10},${hy + 7} ${hx + 5},${hy + 10} ${hx},${hy + 10} C${hx - 5},${hy + 10} ${hx - 9.4},${hy + 7} ${hx - 9},${hy + 1} Z`);
  shade(ctx, head, YFUR, [hx - 10, hy - 8, 20, 19], { ao: 0.25 });
  bigFur(ctx, head, [hx - 10, hy - 8, 20, 19], ['#ffffff', '#92a1b9'], { len: 2.4, lw: 1, seed: 51 });
  const mask = P(ctx, `M${hx - 5.6},${hy - 1} C${hx - 5},${hy - 4.6} ${hx + 5.4},${hy - 4.6} ${hx + 6.2},${hy - 1} C${hx + 6.4},${hy + 4} ${hx + 3},${hy + 8.4} ${hx},${hy + 8.4} C${hx - 3},${hy + 8.4} ${hx - 5.8},${hy + 4} ${hx - 5.6},${hy - 1} Z`);
  shade(ctx, mask, YFACE, [hx - 6, hy - 5, 12.4, 14], { ao: 0.2 });
  rimWarm(ctx, head, [hx - 10, hy - 8, 20, 19], '#ffc825', 1.2 * o.px, { alpha: 0.9 });
  for (const x of [hx - 2.6, hx + 3]) eye(ctx, x, hy + 0.2, 1.7, { iris: '#ffeb57', brow: '#0e071b', browTilt: 0.9 });
  const mw = at ? 4 : 2;
  fill(ctx, P(ctx, `M${hx - 4},${hy + 4} C${hx - 2},${hy + 3.4} ${hx + 2},${hy + 3.4} ${hx + 5},${hy + 4} C${hx + 4},${hy + 4.5 + mw} ${hx - 3},${hy + 4.5 + mw} ${hx - 4},${hy + 4} Z`), '#1a1932');
  for (const x of [hx - 3, hx - 0.4, hx + 2.4, hx + 4.4]) fill(ctx, P(ctx, `M${x - 1.2},${hy + 4} l2.4,0 l-1.2,3 Z`), '#ffffff');
  fill(ctx, ell(ctx, hx + 1, hy + 2.2, 1, 0.7), '#00396d');
  ctx.restore();
}

// ---------------------------------------------------------------- Elemental de gelo
function iceElemental(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : Math.sin(ph) * 1.4;
  const ib = -bob;
  ctx.save();
  ctx.translate(0, bob);
  // Estilhacos da cauda (abaixo do tronco, flutuando).
  gem(ctx, [32, 44], [27, 48.4], [32, 58 - bob * 0.5], [37, 48.4], CRYS);
  gem(ctx, [24.4, 45], [20.6, 49], [24.6, 56 - bob * 0.3], [28.4, 49], CRYS, { glintOn: false });
  gem(ctx, [40, 45], [36.4, 49], [40, 55 + bob * 0.3], [44, 49], CRYS, { glintOn: false });
  // Mao de tras e ombro de tras.
  const sh1 = [17, 22 + ib * 0.6];
  gem(ctx, [sh1[0], sh1[1] - 7], [sh1[0] - 6, sh1[1]], [sh1[0] + 1, sh1[1] + 8], [sh1[0] + 5, sh1[1] - 1], CRYS.slice(0, 5));
  const hb = at ? [48, 28] : [9, 38 + ib];
  gem(ctx, [hb[0], hb[1] - 6], [hb[0] - 4, hb[1]], [hb[0] + 0.6, hb[1] + 7], [hb[0] + 4, hb[1]], CRYS);
  // Tronco cristalino.
  const torso = poly(ctx, [[22, 21], [28, 14], [37, 15], [42, 22], [39, 38], [33, 46], [27, 44], [23, 36]]);
  shade(ctx, torso, CRYS, [22, 14, 20, 32], { lx: 0.25, ly: 0.15, ao: 0.3 });
  inside(ctx, torso, () => {
    fill(ctx, poly(ctx, [[28, 14], [31, 30], [24, 36], [23, 36], [22, 21]]), hexA('#94fdff', 0.5));
    fill(ctx, poly(ctx, [[37, 15], [42, 22], [39, 38], [33, 46], [31, 30]]), hexA('#00396d', 0.55));
    stroke(ctx, [[28, 14], [31, 30], [33, 46]], 0.9, '#d5e8ef');
    stroke(ctx, [[22, 21], [31, 30], [42, 22]], 0.8, '#0069aa');
    stroke(ctx, [[23, 36], [31, 30], [39, 38]], 0.8, '#0069aa');
  });
  rimWarm(ctx, torso, [22, 14, 20, 32], '#ffffff', 1.1 * o.px, { alpha: 0.9 });
  // Rodada 3: geada roxa nas faces de sombra e neve acumulada nos ombros (rampas próprias).
  inside(ctx, torso, () => {
    fill(ctx, poly(ctx, [[34, 34], [39, 38], [33, 46], [31, 40]]), hexA('#424c6e', 0.8));
    fill(ctx, poly(ctx, [[35, 36], [38, 38], [34, 43]]), hexA('#657392', 0.8));
    fill(ctx, poly(ctx, [[23, 32], [27, 35], [24, 37]]), hexA('#8e7cc3', 0.6));
  });
  for (const [x, y] of [[24, 19.6], [38, 19.6]]) {
    fill(ctx, ell(ctx, x, y, 3.4, 1.6), '#d5e8ef');
    fill(ctx, ell(ctx, x - 0.6, y - 0.6, 2.2, 0.9), '#ffffff');
    fill(ctx, ell(ctx, x + 1.2, y + 0.9, 1.6, 0.6), '#9cc8e6');
  }
  // Nucleo brilhante.
  glow(ctx, 31, 29, at ? 11 : 8.4, '#00cdf9', { core: '#ffffff', alpha: 0.9 });
  fill(ctx, ell(ctx, 31, 29, 3.3, 3.9), '#94fdff');
  fill(ctx, ell(ctx, 30.5, 28.4, 1.6, 2), '#ffffff');
  ctx.save();
  ctx.translate(32, 19);
  ctx.scale(1.25, 1.25);
  ctx.translate(-32, -19);
  // Cabeca facetada com olhos brancos acesos.
  const head = poly(ctx, [[25, 13], [32, 4], [39, 13], [36, 19], [28, 19]]);
  shade(ctx, head, CRYS.slice(1), [25, 4, 14, 15], { ao: 0.2, lx: 0.25 });
  inside(ctx, head, () => {
    fill(ctx, poly(ctx, [[32, 4], [39, 13], [36, 19], [32, 14]]), hexA('#00396d', 0.5));
    fill(ctx, poly(ctx, [[27, 12.6], [37.6, 12.6], [36.4, 15.4], [28.4, 15.4]]), '#0c2e44');
  });
  stroke(ctx, [[25, 13], [32, 4], [39, 13]], 0.9, '#ffffff');
  for (const x of [29.6, 34.6]) {
    glow(ctx, x, 14, 2.4, '#94fdff', { core: '#ffffff' });
    fill(ctx, poly(ctx, [[x - 1.6, 13.4], [x + 1.6, 13.8], [x + 1.2, 15.2], [x - 1.2, 15]]), '#ffffff');
  }
  stroke(ctx, [[27.6, 12.2], [31, 13.2]], 0.9, '#00396d');
  stroke(ctx, [[37.4, 12.2], [34, 13.2]], 0.9, '#00396d');
  stroke(ctx, [[29.4, 17.4], [32, 18], [34.8, 17.4]], 1.1, '#0c2e44');
  for (const x of [30.4, 33.6]) fill(ctx, poly(ctx, [[x - 0.6, 17.4], [x + 0.6, 17.4], [x, 18.6]]), '#ffffff');
  ctx.restore();
  // Ombro e mao da frente (no ataque, dispara estilhaco).
  const sh2 = [44, 22 + ib * 0.4];
  gem(ctx, [sh2[0] - 1, sh2[1] - 7], [sh2[0] - 5, sh2[1] - 0.5], [sh2[0] + 1, sh2[1] + 8], [sh2[0] + 6, sh2[1]], CRYS);
  const hf = at ? [54, 24] : [53, 36 - ib];
  gem(ctx, [hf[0], hf[1] - 6], [hf[0] - 4.4, hf[1]], [hf[0] + 0.6, hf[1] + 7], [hf[0] + 4.4, hf[1]], CRYS);
  if (at) {
    for (const [x, y, s] of [[60, 20, 4], [61, 30, 3.4], [58, 26, 2.6]]) gem(ctx, [x + s, y], [x - s * 0.4, y - s * 0.6], [x - s, y + 0.2], [x - s * 0.3, y + s * 0.7], CRYS, { glintOn: false });
  }
  // Flocos de neve.
  for (let i = 0; i < 6; i += 1) {
    const x = 6 + rand(i * 3.3) * 52;
    const y = 4 + ((rand(i * 7.1) * 50 + f * 5) % 50);
    fill(ctx, ell(ctx, x, y, 0.9, 0.9), i % 2 ? '#ffffff' : '#94fdff');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Escorpiao
const SHELL = ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'];
const SHELL_FAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];

function scorpion(ctx, f, o) {
  // Refeito (rodada 4): carapaça âmbar-escura, pinças grandes à frente separadas por contorno de
  // quitina escura, cauda em arco alto com ferrão dourado. Cada volume tem borda escura própria
  // para não virar uma mancha só no tamanho final.
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 0.5;
  const INK = '#1c121c';
  const AMB = ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'];
  const DARK = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
  const vol = (path, ramp, box, opts = {}) => {
    ctx.save(); ctx.lineWidth = 1.7; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(path); ctx.restore();
    shade(ctx, path, ramp, box, { ao: 0.35, ...opts });
  };
  ctx.save();
  ctx.translate(0, bob);
  const ground = 58.6 - bob;
  // Patas: 4 pares, as de lá escuras, joelho alto.
  for (const far of [true, false]) {
    for (let i = 0; i < 4; i += 1) {
      const x = 20 + i * 4.6 + (far ? 1.6 : 0);
      const lift = at ? 0 : Math.max(0, Math.sin(ph + i * 1.6 + (far ? Math.PI : 0)));
      const pts = [[x, 48], [x + 3 + (i - 1.5) * 1.3, 42.5 + (far ? 0.6 : 0)], [x + 5 + (i - 1.5) * 2, ground - lift * 2.2]];
      stroke(ctx, pts, 2.6, INK);
      stroke(ctx, pts, 1.6, far ? '#391f21' : '#8a4836');
      if (!far) stroke(ctx, [pts[0], pts[1]], 0.7, '#e69c69');
    }
  }
  // Cauda: segmentos que afinam num arco alto sobre o dorso.
  const tl = at
    ? [[18, 46], [12, 39], [13, 30], [19, 23], [28, 19], [37, 20]]
    : [[18, 46], [11.5, 40], [10.5, 31], [14, 23], [21, 18.4], [28.5, 19.5]];
  const tw = at ? 0 : Math.sin(ph) * 0.6;
  for (let i = 0; i < tl.length; i += 1) {
    const [x, y] = [tl[i][0], tl[i][1] + (i > 2 ? tw : 0)];
    const r = 4.6 - i * 0.38;
    vol(ell(ctx, x, y, r, r * 0.9), AMB, [x - r, y - r, r * 2, r * 2], { ao: 0.4 });
    glint(ctx, x - r * 0.5, y - r * 0.4, r * 0.8, '#f6ca9f', { lw: 0.9, angle: -0.4 });
  }
  // Bulbo do veneno e ferrão dourado curvado para a frente/baixo.
  const [bx, by] = [tl[5][0] + 3.2, tl[5][1] + 2 + tw];
  vol(ell(ctx, bx, by, 3.8, 3.4), ['#5d2c28', '#8a4836', '#edab50', '#ffc825'], [bx - 4, by - 4, 8, 8], { ao: 0.2 });
  const sting = at
    ? horn(ctx, [bx + 2.4, by + 0.6], [bx + 7, by + 1], [bx + 10, by + 5.4], 2.6)
    : horn(ctx, [bx + 2, by + 1.6], [bx + 5.4, by + 3.6], [bx + 4.6, by + 8.6], 2.6);
  ctx.save(); ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke(sting); ctx.restore();
  fill(ctx, sting, '#ffc825');
  glow(ctx, bx + (at ? 8 : 4.6), by + (at ? 4 : 7.6), 2.4, '#ffa214', { core: '#ffeb57', alpha: 0.9 });
  // Corpo segmentado (abdome) e cefalotórax.
  const body = P(ctx, 'M15,46 C15,40.5 21,39 28,39.4 C34,39.6 39,40.4 41,44 C42,48.4 37,51.4 28,51.4 C20,51.4 15,50 15,46 Z');
  vol(body, AMB, [14, 39, 28, 13], { lx: 0.35, ly: 0.12, ao: 0.5 });
  inside(ctx, body, () => {
    for (const x of [20, 24.5, 29, 33.5]) {
      stroke(ctx, [[x, 39], [x - 0.6, 45], [x, 52]], 1.1, '#391f21');
      stroke(ctx, [[x + 1.1, 40.4], [x + 3, 40.6]], 0.9, '#f6ca9f');
    }
  });
  rimWarm(ctx, body, [14, 39, 28, 13], '#ffc825', 1.1 * o.px, { side: 't' });
  // Pinças: a de lá (escura, mais alta) e a de cá (clara, maior). Dedos abertos em V com vão escuro.
  const claw = (sh, el, pc, ramp, k, open) => {
    vol(limb(ctx, sh, el, 3.6 * k, 3.2 * k), ramp, [Math.min(sh[0], el[0]) - 2, Math.min(sh[1], el[1]) - 2, 10, 8], { ao: 0.2 });
    vol(limb(ctx, el, pc, 3.2 * k, 3.8 * k), ramp, [el[0] - 2, Math.min(el[1], pc[1]) - 3, 10, 8], { ao: 0.2 });
    const [cx, cy] = pc;
    const up = horn(ctx, [cx + 0.5, cy - 1.6 * k], [cx + 5 * k, cy - (2.8 + open) * k], [cx + 8.4 * k, cy - (0.4 + open * 0.5) * k], 3 * k);
    const dn = horn(ctx, [cx + 0.5, cy + 1.6 * k], [cx + 5 * k, cy + (1.8 + open * 0.6) * k], [cx + 7.6 * k, cy + (1 + open * 0.3) * k], 2.6 * k);
    vol(dn, ramp.slice(0, -1), [cx, cy, 8 * k, 6 * k], { ao: 0 });
    vol(up, ramp, [cx, cy - 6 * k, 9 * k, 6 * k], { ao: 0 });
    const palm = ell(ctx, cx, cy, 4.2 * k, 3.4 * k, -0.15);
    vol(palm, ramp, [cx - 4 * k, cy - 3.4 * k, 8 * k, 7 * k], { ao: 0.25 });
    glint(ctx, cx - 2 * k, cy - 1.8 * k, 2.6 * k, ramp[ramp.length - 1], { lw: 0.9, angle: -0.25 });
  };
  const open = at ? 0.4 : 2 + Math.sin(ph) * 0.4;
  claw([38, 42], [43, 35], [46.4, 31 + (at ? 3 : 0)], DARK, 1.15, open);
  // Cefalotórax com olhos acesos.
  const head = P(ctx, 'M36.5,41.8 C39,39.6 44,39.8 46.4,42.4 C47.8,44.6 46.6,48.6 43.6,49.6 C40,50.4 36.8,48.6 36.2,46 Z');
  vol(head, AMB, [36, 39.6, 12, 11], { lx: 0.3, ly: 0.15, ao: 0.4 });
  for (const [x, y] of [[42.4, 42.8], [44.8, 43.4]]) {
    fill(ctx, ell(ctx, x, y, 1.1, 1), INK);
    fill(ctx, ell(ctx, x - 0.2, y - 0.2, 0.6, 0.55), '#ea323c');
  }
  stroke(ctx, [[45.6, 47.4], [47.4, 48.4]], 0.9, INK);
  claw([42, 48], [46, 51], [48.6 + (at ? 2.4 : 0), 46.6 - (at ? 2 : 0)], AMB, 1.5, open);
  ctx.restore();
}

// ---------------------------------------------------------------- Mumia
const WRAP = ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];
const WRAP_FAR = ['#2d2e25', '#494834', '#775c5b', '#918275', '#cba36f'];

function wrapBands(ctx, path, [x, y, w, h], step, dark, light, tilt = 0.18, lw = 0.9) {
  inside(ctx, path, () => {
    for (let yy = y; yy < y + h + 4; yy += step) {
      stroke(ctx, [[x - 2, yy], [x + w + 2, yy + w * tilt]], lw, dark);
      stroke(ctx, [[x - 2, yy - 0.9], [x + w + 2, yy - 0.9 + w * tilt]], 0.7, light);
    }
  });
}

function mummy(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  const ground = 58.5 - bob;
  // Atadura solta balancando atras.
  stroke(ctx, [[22, 28], [14, 34 + sw * 2], [11, 44 + sw]], 2.4, '#775c5b');
  stroke(ctx, [[22, 27.4], [14.6, 33.4 + sw * 2], [11.6, 43 + sw]], 1, '#cba36f');
  // Pernas enfaixadas.
  for (const [x, s, ramp] of [[26, 1, WRAP_FAR], [36, -1, WRAP]]) {
    const dx = sw * s * 2.2;
    const lg = limb(ctx, [x, 40], [x + dx, ground - 2], 9, 8);
    shade(ctx, lg, ramp, [x - 5, 39, 10, 20], { ao: 0.4 });
    wrapBands(ctx, lg, [x - 5, 42, 10, 18], 3.2, ramp[0], ramp[4], 0.2);
    const foot = P(ctx, `M${x + dx - 4.6},${ground - 2.6} C${x + dx - 2},${ground - 5} ${x + dx + 4},${ground - 4.4} ${x + dx + 6.4},${ground - 1.2} L${x + dx + 6.4},${ground + 0.6} L${x + dx - 4.6},${ground + 0.6} Z`);
    shade(ctx, foot, ramp, [x + dx - 5, ground - 5, 12, 6], { ao: 0.3 });
    stroke(ctx, [[x + dx - 1, ground - 3.4], [x + dx + 1.6, ground - 0.6]], 0.9, ramp[0]);
  }
  // Braco de tras estendido.
  const bh = at ? [51, 24] : [47, 31 + sw];
  const ba = limb(ctx, [27, 25], bh, 7.4, 6);
  shade(ctx, ba, WRAP_FAR, [26, 20, 26, 14], { ao: 0.3 });
  wrapBands(ctx, ba, [26, 20, 26, 14], 3, '#2d2e25', '#918275', 0.1);
  fill(ctx, ell(ctx, bh[0] + 1.6, bh[1] + 0.4, 3.6, 3.2), WRAP_FAR[3]);
  // Tronco enfaixado e corcunda.
  const torso = P(ctx, 'M22,27 C22,21 27,18.6 32,18.6 C38,18.6 42,21.4 41.6,27 C42,33 40.6,38 38.6,42 C34,43.6 28,43.6 24,42 C22,38 21.4,33 22,27 Z');
  shade(ctx, torso, WRAP, [21, 18, 22, 26], { lx: 0.3, ly: 0.15, ao: 0.45 });
  wrapBands(ctx, torso, [21, 20, 22, 24], 3.4, '#494834', '#f9e6cf', -0.22);
  inside(ctx, torso, () => {
    stroke(ctx, [[24, 23], [30, 30], [38, 28]], 1.1, '#775c5b');
    stroke(ctx, [[26, 36], [34, 33.6], [40, 38]], 1.1, '#775c5b');
  });
  rimWarm(ctx, torso, [21, 18, 22, 26], '#ffc825', 1.2 * o.px, { alpha: 0.9 });
  // Braco da frente estendido, mao de dedos enfaixados.
  const fh = at ? [56, 21] : [51, 27 - sw];
  const fe = at ? [46, 22] : [43, 26];
  const fa = limb(ctx, [37, 25], fe, 7.6, 6.6);
  shade(ctx, fa, WRAP, [36, 20, 12, 12], { ao: 0.2 });
  const fb = limb(ctx, fe, fh, 6.6, 5.6);
  shade(ctx, fb, WRAP, [Math.min(fe[0], fh[0]) - 3, Math.min(fe[1], fh[1]) - 4, 18, 11], { ao: 0.3 });
  wrapBands(ctx, fb, [Math.min(fe[0], fh[0]) - 3, Math.min(fe[1], fh[1]) - 4, 18, 11], 2.8, '#494834', '#f9e6cf', 0.1);
  fill(ctx, ell(ctx, fh[0] + 1.6, fh[1], 3.4, 3), WRAP[3]);
  for (const k of [-1.4, 0.4, 2.2]) stroke(ctx, [[fh[0] + 2.4, fh[1] + k - 0.4], [fh[0] + 5.4, fh[1] + k + 0.5]], 1.3, WRAP[4]);
  // Cabeca: faixas, fresta escura e olhos verdes acesos.
  const head = ell(ctx, 33, 11.4, 8.6, 8.4);
  shade(ctx, head, WRAP, [24, 3, 18, 17], { lx: 0.3, ly: 0.2, ao: 0.35 });
  wrapBands(ctx, head, [24, 4, 18, 16], 2.8, '#494834', '#f9e6cf', -0.2);
  fill(ctx, poly(ctx, [[26, 9.4], [41.4, 9.4], [41, 14.4], [26.6, 14.4]]), '#0e071b');
  inside(ctx, head, () => {
    stroke(ctx, [[25, 8.4], [42, 10.6]], 1.4, '#cba36f');
    stroke(ctx, [[25.6, 15.4], [41, 15.6]], 1.2, '#918275');
  });
  for (const x of [30.4, 37]) {
    glow(ctx, x, 12, 3, '#5ac54f', { core: '#d3fc7e' });
    fill(ctx, ell(ctx, x, 12, 1.5, 1.4), '#d3fc7e');
    fill(ctx, ell(ctx, x + 0.5, 12, 0.5, 0.8), '#0e071b');
  }
  stroke(ctx, [[28, 9.8], [32.4, 10.8]], 1.1, '#0e071b');
  stroke(ctx, [[39.4, 9.8], [35, 10.8]], 1.1, '#0e071b');
  rimWarm(ctx, head, [24, 3, 18, 17], '#ffc825', 1.2 * o.px, { alpha: 0.9 });
  ctx.restore();
}

// ---------------------------------------------------------------- Verme da areia
const WORM = ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69'];
const SAND = ['#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];

function sandworm(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const sway = at ? 0 : Math.sin(ph);
  ctx.save();
  // Monte de areia atras do corpo.
  const mound = P(ctx, 'M3,58.6 C6,52 14,49.4 22,50.4 C28,48.6 38,48.6 44,50.6 C52,50.4 58,54 61,58.6 Z');
  shade(ctx, mound, SAND, [3, 48, 58, 11], { lx: 0.3, ly: 0.1, ao: 0.25 });
  inside(ctx, mound, () => {
    for (let i = 0; i < 16; i += 1) {
      const x = 6 + rand(i * 2.7) * 52;
      const y = 51 + rand(i * 5.1) * 7;
      fill(ctx, ell(ctx, x, y, 0.9, 0.7), i % 2 ? '#f9e6cf' : '#775c5b');
    }
    stroke(ctx, [[8, 56], [20, 53.6], [32, 55]], 0.9, '#918275');
  });
  rimWarm(ctx, mound, [3, 48, 58, 11], '#ffc825', 1.1 * o.px, { side: 't', alpha: 0.7 });
  // Corpo segmentado: aneis do chao ate a cabeca.
  const segs = at
    ? [[22, 52, 9.4], [21.6, 45, 9], [23, 38, 8.6], [27, 32, 8.2], [32, 27, 7.8], [38, 24, 7.6]]
    : [[22 + sway * 0.4, 52, 9.4], [21, 45, 9], [21 + sway * 0.7, 38, 8.6], [23.6 + sway, 31.4, 8.2], [27.4 + sway * 1.2, 25, 7.8], [31.6 + sway * 1.4, 19.6, 7.6]];
  const head = segs[segs.length - 1];
  for (let i = 0; i < segs.length - 1; i += 1) {
    const [x, y, r] = segs[i];
    const ring = ell(ctx, x, y, r, r * 0.86);
    shade(ctx, ring, WORM, [x - r, y - r, r * 2, r * 2], { ao: 0.45, lx: 0.3, ly: 0.15 });
    inside(ctx, ring, () => {
      stroke(ctx, [[x - r, y + r * 0.58], [x, y + r * 0.82], [x + r, y + r * 0.58]], 1.4, '#391f21');
      fill(ctx, ell(ctx, x + r * 0.5, y + r * 0.1, r * 0.34, r * 0.5), '#cba36f');
      stroke(ctx, [[x + r * 0.28, y - r * 0.2], [x + r * 0.28, y + r * 0.4]], 0.8, '#f6ca9f');
    });
    rimWarm(ctx, ring, [x - r, y - r, r * 2, r * 2], '#ffc825', 1.2 * o.px, { alpha: 0.85 });
  }
  // Cabeca: boca redonda aberta, anel de dentes, olhinhos.
  const [hx, hy, hr] = head;
  const hd = ell(ctx, hx, hy, hr + 0.6, hr);
  shade(ctx, hd, WORM, [hx - hr, hy - hr, hr * 2, hr * 2], { ao: 0.3, lx: 0.3, ly: 0.15 });
  const mx = hx + 5.6;
  const my = hy - 1.4 + (at ? 1 : 0);
  const mrx = at ? 7.4 : 6;
  const mry = at ? 9.2 : 7.8;
  fill(ctx, ell(ctx, mx, my, mrx + 1.4, mry + 1.4), '#cba36f');
  fill(ctx, ell(ctx, mx, my, mrx, mry), '#1c121c');
  shade(ctx, ell(ctx, mx + 0.6, my + 0.4, mrx * 0.66, mry * 0.66), ['#1c121c', '#571c27', '#891e2b'], [mx - mrx, my - mry, mrx * 2, mry * 2], { ao: 0, lx: 0.5, ly: 0.5 });
  fill(ctx, ell(ctx, mx + 0.8, my + 0.6, mrx * 0.3, mry * 0.3), '#1c121c');
  const n = 12;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const px = mx + Math.cos(a) * (mrx + 0.2);
    const py = my + Math.sin(a) * (mry + 0.2);
    const ix = mx + Math.cos(a) * (mrx * 0.58);
    const iy = my + Math.sin(a) * (mry * 0.58);
    const tx = -Math.sin(a) * 1.5;
    const ty = Math.cos(a) * 1.5;
    fill(ctx, poly(ctx, [[px + tx, py + ty], [px - tx, py - ty], [ix, iy]]), i % 2 ? '#f9e6cf' : '#ffffff');
  }
  eye(ctx, hx - 1.4, hy - 6.2, 1.2, { iris: '#ffc825', brow: '#1c121c', browTilt: 0.5, lid: true });
  rimWarm(ctx, hd, [hx - hr, hy - hr, hr * 2, hr * 2], '#ffc825', 1.2 * o.px, { side: 't', alpha: 0.85 });
  // Areia caindo do corpo.
  for (const [x, y] of [[13, 36 + sway], [11, 44 - sway], [34 + (at ? 4 : 0), 38]]) fill(ctx, ell(ctx, x, y, 0.8, 0.8), '#cba36f');
  ctx.restore();
}

// ---------------------------------------------------------------- Diabrete
const IMPR = ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'];
const IMPR_FAR = ['#0e071b', '#3b1443', '#571c27', '#891e2b', '#c42430'];

function imp(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.6;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 1 : 0, bob);
  const ground = 58.5 - bob;
  // Asas de morcego atras.
  const flap = at ? 2 : Math.sin(ph) * 3;
  for (const [far, ox] of [[true, 0], [false, 0]]) {
    const wp = P(ctx, `M${27 + ox},${33} C22,${22 - flap} 14,${14 - flap} 4,${11 - flap} C8,${18 - flap} 6,${22 - flap * 0.6} 3,${26 - flap * 0.6} C9,${25 - flap * 0.5} 10,${29 - flap * 0.3} 8,${33} C14,${31 - flap * 0.2} 20,${35} 29,40 Z`);
    if (far && at) continue;
    shade(ctx, wp, far ? ['#0e071b', '#3b1443', '#571c27'] : ['#3b1443', '#571c27', '#891e2b', '#c42430'], [3, 10, 26, 30], { lx: 0.2, ly: 0.2, ao: 0.3 });
    stroke(ctx, [[27, 33], [14, 18 - flap], [5, 11.6 - flap]], 1.8, '#0e071b');
    stroke(ctx, [[27, 34], [9, 31 - flap * 0.3]], 1.5, '#0e071b');
    if (!far) rimWarm(ctx, wp, [3, 10, 26, 30], '#ffa214', 1.1 * o.px, { alpha: 0.7 });
    break;
  }
  // Cauda com ponta de flecha.
  const tw = at ? -1 : Math.sin(ph) * 2;
  stroke(ctx, [[27, 47], [20, 52], [14, 50 + tw], [11, 45 + tw]], 2.4, '#571c27');
  stroke(ctx, [[27, 46.4], [20, 51.4], [14.6, 49.6 + tw]], 0.9, '#c42430');
  fill(ctx, poly(ctx, [[11, 41 + tw], [15.4, 45 + tw], [8.6, 47 + tw]]), '#891e2b');
  // Pernas de bode.
  for (const [x, s, ramp] of [[28, 1, IMPR_FAR], [35, -1, IMPR]]) {
    const dx = sw * s * 2;
    const lift = at ? 0 : Math.max(0, sw * s);
    const knee = [x + dx * 0.5 + 1, 50];
    const foot = [x + dx - 0.6, ground - lift * 2.2];
    const th = limb(ctx, [x, 44], knee, 7, 5);
    shade(ctx, th, ramp, [x - 4, 43, 8, 8], { ao: 0.2 });
    const sh = limb(ctx, knee, foot, 4.4, 3.4);
    shade(ctx, sh, ramp, [foot[0] - 3, 49, 7, 10], { ao: 0.4 });
    fill(ctx, P(ctx, `M${foot[0] - 3},${foot[1] + 0.8} C${foot[0] - 2},${foot[1] - 1.4} ${foot[0] + 2},${foot[1] - 1.4} ${foot[0] + 4},${foot[1] + 0.8} Z`), '#0e071b');
  }
  // Tronco pancudo.
  const body = P(ctx, 'M26,34 C26,28.4 31,26.4 35,26.8 C40,27.4 42.6,31.6 42,38 C41.6,44 38,47.4 33.4,47.4 C28.6,47.4 26,43 26,38 Z');
  shade(ctx, body, IMPR, [25, 26, 18, 22], { lx: 0.3, ly: 0.2, ao: 0.45 });
  fill(ctx, ell(ctx, 35.6, 38.4, 4.4, 6.4), hexA('#f68187', 0.5));
  rimWarm(ctx, body, [25, 26, 18, 22], '#ffc825', 1.3 * o.px, { alpha: 0.9 });
  // Braco de tras e tridente.
  const hand = at ? [52, 31] : [48, 38 + sw * 0.5];
  const tbase = at ? [40, 52] : [47, 58.5 - bob];
  const ttop = at ? [60, 24] : [49.6, 14];
  stroke(ctx, [tbase, ttop], 2.4, '#391f21');
  stroke(ctx, [[tbase[0] - 0.6, tbase[1]], [ttop[0] - 0.6, ttop[1]]], 0.9, '#8a4836');
  const ang = Math.atan2(ttop[1] - tbase[1], ttop[0] - tbase[0]);
  ctx.save();
  ctx.translate(ttop[0], ttop[1]);
  ctx.rotate(ang + Math.PI / 2);
  fill(ctx, poly(ctx, [[-4, -1.6], [4, -1.6], [4, 0], [-4, 0]]), '#edab50');
  for (const x of [-3.4, 0, 3.4]) {
    fill(ctx, poly(ctx, [[x - 1.1, -1.4], [x + 1.1, -1.4], [x, -(x === 0 ? 7.4 : 5.6)]]), '#ffc825');
    glint(ctx, x - 0.3, -2, 2, '#ffffff', { lw: 0.8, angle: -Math.PI / 2 });
  }
  ctx.restore();
  const arm = limb(ctx, [38, 31], hand, 5, 4.2);
  shade(ctx, arm, IMPR, [36, 28, 16, 14], { ao: 0.2 });
  fill(ctx, ell(ctx, hand[0], hand[1], 2.6, 2.4), IMPR[3]);
  // Braco de cá no quadril.
  const arm2 = limb(ctx, [29, 31], [26, 38.4], 4.6, 3.8);
  shade(ctx, arm2, IMPR_FAR, [24, 29, 8, 12], { ao: 0.2 });
  // Cabecona: chifres, orelhas, olhos grandes, sorriso de presas.
  const hx = 34;
  const hy = 19;
  for (const [x, dx, rampLit] of [[hx - 6, -5.6, false], [hx + 3.6, 5.6, true]]) {
    const hp = horn(ctx, [x, hy - 6], [x + dx * 0.5, hy - 13], [x + dx * 0.9, hy - 16.6], 4.6);
    shade(ctx, hp, ['#775c5b', '#cba36f', '#f6ca9f', '#f9e6cf'], [x - 4, hy - 17, 9, 12], { ao: 0 });
    if (rampLit) glint(ctx, x + 0.6, hy - 9, 3, '#ffffff', { lw: 0.9, angle: -1.1 });
  }
  const ear = P(ctx, `M${hx - 7},${hy - 1} C${hx - 12},${hy - 3.6} ${hx - 14},${hy - 2} ${hx - 14},${hy - 0.4} C${hx - 11},${hy + 1} ${hx - 9},${hy + 1.6} ${hx - 7},${hy + 2.4} Z`);
  shade(ctx, ear, IMPR_FAR, [hx - 14, hy - 4, 8, 7], { ao: 0 });
  const head = ell(ctx, hx, hy, 9.4, 8.6);
  shade(ctx, head, IMPR, [hx - 9.4, hy - 8.6, 18.8, 17.2], { lx: 0.3, ly: 0.2, ao: 0.35 });
  rimWarm(ctx, head, [hx - 9.4, hy - 8.6, 18.8, 17.2], '#ffc825', 1.3 * o.px, { alpha: 0.95 });
  for (const [x, big] of [[hx - 1.6, 1], [hx + 5.2, 0.92]]) eye(ctx, x, hy - 1.2, 2.7 * big, { iris: '#ffeb57', glowC: null, brow: '#0e071b', browTilt: 0.7 });
  fill(ctx, P(ctx, `M${hx + 9},${hy + 1.4} C${hx + 11.2},${hy + 1.6} ${hx + 12},${hy + 3.4} ${hx + 9.4},${hy + 4.2} Z`), IMPR[3]);
  const mo = at ? 3 : 0;
  fill(ctx, P(ctx, `M${hx - 4.6},${hy + 3.6} C${hx - 1},${hy + 3} ${hx + 5},${hy + 3} ${hx + 8},${hy + 3.6} C${hx + 6},${hy + 6.6 + mo} ${hx - 2},${hy + 6.6 + mo} ${hx - 4.6},${hy + 3.6} Z`), '#1c121c');
  for (const x of [hx - 3, hx + 0.6, hx + 4.2]) fill(ctx, poly(ctx, [[x - 1.1, hy + 3.4], [x + 1.1, hy + 3.4], [x, hy + 5.8]]), '#ffffff');
  ctx.restore();
}

// ---------------------------------------------------------------- Salamandra
const SAL = ['#1c121c', '#391f21', '#571c27', '#891e2b', '#c42430'];
const SAL_FAR = ['#0e071b', '#1c121c', '#391f21', '#571c27', '#891e2b'];

function flame(ctx, x, y, h, w, flick) {
  const p = P(ctx, `M${x - w},${y} C${x - w * 1.1},${y - h * 0.5} ${x - w * 0.2 + flick},${y - h * 0.8} ${x + flick},${y - h} C${x + w * 0.6 + flick * 0.5},${y - h * 0.55} ${x + w * 1.1},${y - h * 0.4} ${x + w},${y} Z`);
  shade(ctx, p, ['#c64524', '#ff5000', '#ffa214', '#ffeb57'], [x - w, y - h, w * 2, h], { lx: 0.5, ly: 0.9, ao: 0 });
}

function salamander(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : Math.cos(ph * 2) * 0.5;
  ctx.save();
  ctx.translate(at ? -7 : 0, bob);
  const ground = 58.4 - bob;
  const tw = at ? 0 : Math.sin(ph) * 2;
  // Cauda longa e curva que afina, com ponta em brasa.
  const tp = [[19, 44, 10], [12, 49, 8], [6, 51 + tw * 0.3, 6], [2.4, 47 + tw * 0.6, 4.2], [2.2, 41 + tw, 3]];
  for (let i = 0; i < tp.length - 1; i += 1) {
    const sg = limb(ctx, [tp[i][0], tp[i][1]], [tp[i + 1][0], tp[i + 1][1]], tp[i][2], tp[i + 1][2]);
    shade(ctx, sg, SAL, [tp[i][0] - 6, tp[i][1] - 6, 14, 14], { ao: 0.4 });
    stroke(ctx, [[tp[i][0] + 1, tp[i][1] + tp[i][2] * 0.4], [tp[i + 1][0] + 1, tp[i + 1][1] + tp[i + 1][2] * 0.4]], 1.1, '#ffa214');
  }
  const tipX = tp[tp.length - 1][0];
  const tipY = tp[tp.length - 1][1];
  glow(ctx, tipX, tipY - 1, 4.4, '#ff5000', { core: '#ffeb57' });
  fill(ctx, ell(ctx, tipX, tipY - 1, 1.6, 1.6), '#ffeb57');
  // Patas de lagarto: coxa para fora, canela, pe com dedos abertos.
  const legs = [[17, -1, Math.PI, true], [35, 1, 0, true], [24, -1, 0, false], [43, 1, Math.PI, false]];
  for (const [x, dir, off, far] of legs) {
    const lift = at ? 0 : Math.max(0, Math.sin(ph + off));
    const ramp = far ? SAL_FAR : SAL;
    const knee = [x + dir * 3.6, 51.4];
    const foot = [x + dir * 6.6 + (at ? 0 : Math.sin(ph + off) * 1.2), ground - 1.2 - lift * 2.6];
    const up = limb(ctx, [x, 44], knee, 7.4, 5.6);
    shade(ctx, up, ramp, [Math.min(x, knee[0]) - 4, 42, 12, 11], { ao: 0.15 });
    const lo = limb(ctx, knee, foot, 5.2, 4.4);
    shade(ctx, lo, ramp, [foot[0] - 4, 49, 9, 10], { ao: 0.4 });
    for (const k of [-1, 0.2, 1.4, 2.6]) {
      stroke(ctx, [[foot[0], foot[1]], [foot[0] + k * 1.4 + 1, foot[1] + 1.6 - Math.abs(k) * 0.3]], 1.5, far ? '#391f21' : '#891e2b');
      fill(ctx, ell(ctx, foot[0] + k * 1.4 + 1.3, foot[1] + 1.7 - Math.abs(k) * 0.3, 0.8, 0.8), '#f9e6cf');
    }
  }
  // Corpo com escamas, barriga clara e manchas de lava.
  const body = P(ctx, 'M14,44 C14,36.6 22,34.4 32,34.6 C42,34.4 49,36.6 50,44 C50,50.8 42,53.4 32,53.4 C22,53.4 14,51 14,44 Z');
  shade(ctx, body, SAL, [13, 34, 38, 20], { lx: 0.32, ly: 0.1, ao: 0.2 });
  scales(ctx, body, [13, 35, 38, 14], 3, '#571c27', '#ea323c', { lw: 0.9 });
  inside(ctx, body, () => {
    fill(ctx, P(ctx, 'M12,47 C20,46 44,46 52,47 L52,56 L12,56 Z'), '#e69c69');
    fill(ctx, P(ctx, 'M12,47 C20,46 44,46 52,47 L52,49 C44,48 20,48 12,49 Z'), '#ffa214');
    for (const x of [18, 24, 30, 36, 42, 48]) stroke(ctx, [[x, 49.4], [x + 0.4, 53.4]], 0.9, '#bf6f4a');
    for (const [x, y, r] of [[21, 40, 2], [28, 39, 2.4], [35, 39, 2.4], [42, 40.4, 2], [25, 43.6, 1.5], [38, 43.8, 1.6]]) {
      glow(ctx, x, y, r * 2, '#ff5000', { core: '#ffc825', alpha: 0.8 });
      fill(ctx, ell(ctx, x, y, r, r * 0.8), '#ff5000');
      fill(ctx, ell(ctx, x - 0.3, y - 0.3, r * 0.5, r * 0.4), '#ffeb57');
    }
  });
  rimWarm(ctx, body, [13, 34, 38, 20], '#ffa214', 1.3 * o.px, { side: 't', alpha: 0.9 });
  // Crista de chamas redondas ao longo do dorso.
  for (const [x, h] of [[19, 5], [25, 6.6], [31, 7.4], [37, 6.8], [43, 5.4]]) flame(ctx, x, 36, h, 3, Math.sin(ph * 2 + x) * 1.2);
  // Cabeca larga de lagarto: olho grande brilhante, narinas, boca com dentes.
  const jo = at ? 5 : 0;
  const jaw = P(ctx, `M45,46 C50,${47 + jo} 58,${47 + jo} 63.4,${45.4 + jo * 0.7} C60.6,${50 + jo} 52,${51.4 + jo} 46,49 Z`);
  shade(ctx, jaw, SAL, [45, 45, 19, 8], { ao: 0.2 });
  if (at) fill(ctx, P(ctx, `M46,45.6 C52,46.4 58,46.4 63,45 L62.6,${46.4 + jo * 0.7} C58,${48 + jo} 50,${48 + jo} 46,47.6 Z`), '#c64524');
  const head = P(ctx, 'M42.6,37 C45.6,33 54,32.6 58.8,36.6 C61.8,38.8 64,41.4 63.6,44 C63.4,46.2 60.4,46.8 56,46.4 C52,46.8 47,47.6 43.6,46.4 Z');
  shade(ctx, head, SAL, [42, 32, 22, 16], { lx: 0.3, ly: 0.12, ao: 0.25 });
  scales(ctx, head, [42, 32, 22, 16], 3, '#571c27', '#ea323c', { lw: 0.9 });
  rimWarm(ctx, head, [42, 32, 22, 16], '#ffa214', 1.3 * o.px, { side: 't', alpha: 0.9 });
  stroke(ctx, [[47, 45.4], [55, 45.8], [63, 44.6]], 1.1, '#0e071b');
  for (const x of [51.4, 56, 60]) fill(ctx, poly(ctx, [[x - 1, 45.4], [x + 1, 45.4], [x, 47.8]]), '#ffffff');
  fill(ctx, ell(ctx, 61.6, 40.8, 1.3, 1.1), '#0e071b');
  glow(ctx, 52, 38.6, 5, '#ffa214', { core: '#ffeb57', alpha: 0.85 });
  eye(ctx, 52, 38.8, 3, { iris: '#ffeb57', brow: '#0e071b', browTilt: 0.7, pupil: '#0e071b' });
  if (at) {
    const fx = 64;
    const fy = 45.6 + jo * 0.5;
    glow(ctx, fx + 4, fy, 10, '#ff5000', { core: '#ffc825', alpha: 0.7 });
    for (const [dx, dy, r] of [[1.4, 0, 3.4], [5.4, -1, 4.2], [9.6, -0.6, 3.6], [13, 0.4, 2.4]]) {
      fill(ctx, ell(ctx, fx + dx, fy + dy, r, r * 0.82), dx > 8 ? '#ff5000' : '#ffa214');
      fill(ctx, ell(ctx, fx + dx - 0.4, fy + dy, r * 0.55, r * 0.45), '#ffeb57');
    }
  }
  ctx.restore();
}

export const MONSTERS_2B = {
  witch: { size: 48, elite: 56, shadow: [30, 59.6, 14, 2.2], paint: witch },
  frostWolf: { size: 52, elite: 60, shadow: [32, 59.6, 22, 3], paint: frostWolf },
  yeti: { size: 56, elite: 64, shadow: [32, 59.8, 20, 3], paint: yeti },
  iceElemental: { size: 52, elite: 60, shadow: [32, 60, 9, 2], paint: iceElemental },
  scorpion: { size: 48, elite: 56, shadow: [29, 59.6, 22, 2.6], paint: scorpion },
  mummy: { size: 48, elite: 56, shadow: [32, 59.6, 13, 2.4], paint: mummy },
  sandworm: { size: 56, elite: 64, shadow: [32, 59.6, 26, 2.6], paint: sandworm },
  imp: { size: 40, elite: 48, shadow: [33, 59.6, 11, 2.2], paint: imp },
  salamander: { size: 52, elite: 60, shadow: [32, 59.6, 24, 2.6], paint: salamander }
};
