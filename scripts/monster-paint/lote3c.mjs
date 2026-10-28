// Lote 3 (3c): gárgula, serpe de ossos, gigante de cinzas, verme de lava e cão do abismo.
import { P, ell, fill, furTex, glint, glow, hexA, horn, inside, limb, phaseOf, rand, rimWarm, scales, shade, stroke } from './kit.mjs';
import { leg } from './lote1.mjs';
import { INK, angryEye, ember, lavaCrack, poly, rrect, spline, tube, vol } from './lote3a.mjs';

const STONE = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const STONE_FAR = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392'];
const MOSS = ['#134c4c', '#1e6f50', '#33984b', '#5ac54f'];
const BONE = ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];
const BONE_FAR = ['#2d2e25', '#494834', '#775c5b', '#918275', '#cba36f'];
const ASHR = ['#0e071b', '#1c121c', '#2d2e25', '#3d3d3d', '#5d5d5d', '#858585'];
const ASHR_FAR = ['#0e071b', '#0e071b', '#1c121c', '#2d2e25', '#3d3d3d'];

function crack(ctx, pts, w = 0.9) {
  stroke(ctx, pts, w, '#0e071b');
  stroke(ctx, pts.map(([x, y]) => [x - 0.5, y - 0.5]), w * 0.6, '#92a1b9');
}

/** Perna de besta com joelho invertido (gárgula, cão). */
function beastLeg(ctx, hip, a, ramp, { w = 7, ground = 58, claw = '#0e071b' } = {}) {
  const knee = [hip[0] + 2.6 + Math.sin(a) * 4, hip[1] + 6.4];
  const hock = [knee[0] - 3, knee[1] + 5];
  const foot = [hock[0] + 1.4 + Math.sin(a) * 2, ground - 1.4];
  shade(ctx, limb(ctx, hip, knee, w, w * 0.66), ramp, [hip[0] - w, hip[1] - 2, w * 2, 12], { ao: 0.25 });
  shade(ctx, limb(ctx, knee, hock, w * 0.62, w * 0.44), ramp, [hock[0] - 3, knee[1], 7, 7], { ao: 0.3 });
  shade(ctx, limb(ctx, hock, foot, w * 0.44, w * 0.42), ramp, [foot[0] - 3, hock[1], 6, 8], { ao: 0.4 });
  shade(ctx, ell(ctx, foot[0] + 1.6, foot[1] + 0.2, 3.4, 1.6), ramp, [foot[0] - 2, foot[1] - 1.4, 7, 3], { ao: 0.3 });
  for (const dx of [2.4, 4.4]) stroke(ctx, [[foot[0] + dx, foot[1] + 0.4], [foot[0] + dx + 1.2, foot[1] + 1.4]], 0.9, claw);
  return foot;
}

// ---------------------------------------------------------------- Gárgula
function stoneWing(ctx, o, root, ang, ramp, far) {
  ctx.save();
  ctx.translate(root[0], root[1]);
  ctx.rotate(ang);
  ctx.scale(1.3, 1.3);
  // Braço da asa e membrana de pedra com bordas em arco.
  const tips = [[-22, -14], [-24, -4], [-20, 4], [-13, 8]];
  let d = 'M0,0 L-8,-12 ';
  let prev = [-8, -12];
  d += `L${tips[0][0]},${tips[0][1]} `;
  prev = tips[0];
  for (let i = 1; i < tips.length; i += 1) {
    const t = tips[i];
    d += `Q${(prev[0] + t[0]) / 2 + 3.4},${(prev[1] + t[1]) / 2 + 0.6} ${t[0]},${t[1]} `;
    prev = t;
  }
  d += 'Q-6,6 0,4 Z';
  const p = P(ctx, d);
  shade(ctx, p, ramp, [-24, -14, 26, 22], { lx: 0.4, ly: 0.1, ao: 0.4 });
  inside(ctx, p, () => {
    for (const t of tips) stroke(ctx, [[-8, -12], t], 1.3, ramp[0]);
    for (const t of tips) stroke(ctx, [[-8.6, -12.4], [t[0] - 0.4, t[1] - 0.6]], 0.6, ramp[ramp.length - 2]);
    if (!far) { crack(ctx, [[-16, -3], [-13, 0], [-14, 3]], 0.7); fill(ctx, ell(ctx, -18, 3, 2.4, 1.2), hexA('#33984b', 0.85)); }
  });
  stroke(ctx, [[0, 0], [-8, -12]], 2.6, ramp[1]);
  stroke(ctx, [[-0.6, -0.6], [-8.4, -12.4]], 1.1, ramp[ramp.length - 2]);
  fill(ctx, horn(ctx, [-8, -12], [-9, -15], [-11, -17], 2), ramp[2]);
  if (!far) rimWarm(ctx, p, [-24, -14, 26, 22], '#edab50', 1 * o.px, { side: 't', alpha: 0.8 });
  ctx.restore();
}

function gargoyle(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : -Math.abs(Math.sin(ph)) * 1.2;
  const flap = at ? -0.3 : 0.15 + Math.sin(ph) * 0.18;
  ctx.save();
  ctx.translate(0, bob);
  // Asa de lá e cauda com ponta de lança.
  stoneWing(ctx, o, [30, 24], flap + 0.25, STONE_FAR, true);
  const tw = at ? 1 : Math.sin(ph) * 1.4;
  tube(ctx, [[22, 42], [14, 46], [8, 44 + tw], [5, 39 + tw]], 3.4, 1.8, STONE_FAR.slice(1));
  fill(ctx, poly(ctx, [[5, 35 + tw], [2.6, 39.6 + tw], [5, 41 + tw], [7.4, 39 + tw]]), '#424c6e');
  beastLeg(ctx, [33, 42], at ? 0.4 : Math.sin(ph + Math.PI) * 0.4, STONE_FAR, { w: 7.4 });
  // Braço de lá.
  shade(ctx, limb(ctx, [24, 28], at ? [22, 38] : [24, 38], 5.6, 4.4), STONE_FAR, [19, 28, 10, 12], { ao: 0.2 });
  // Tronco curvado de pedra.
  const torso = P(ctx, 'M20,30 C19,23 25,19 32,19.6 C39,20 43,25 42,32 C41,38 38,44 32,45 C26,45.6 21,40 20,30 Z');
  vol(ctx, o, torso, STONE, [19, 19, 24, 27], { lx: 0.4, ly: 0.2, ao: 0.4, rk: 1.2 });
  inside(ctx, torso, () => {
    stroke(ctx, [[31, 26], [36, 29], [40, 27]], 1, '#2a2f4e');
    for (const y of [32, 36, 40]) stroke(ctx, [[30, y], [35, y + 1], [39, y - 0.4]], 0.9, '#2a2f4e');
    crack(ctx, [[23, 24], [25, 28], [24, 32]]);
    fill(ctx, ell(ctx, 22, 39, 3.4, 2.4), '#1e6f50');
    fill(ctx, ell(ctx, 21.4, 38.4, 1.8, 1.2), '#5ac54f');
  });
  // Asa de cá.
  stoneWing(ctx, o, [27, 25], flap, STONE, false);
  beastLeg(ctx, [26, 42], at ? -0.3 : Math.sin(ph) * 0.4, STONE, { w: 8 });
  // Cabeça de demônio: chifres para trás, orelhas pontudas, focinho com presas.
  const hx = 43;
  const hy = 18;
  for (const [s, ramp] of [[-1, STONE_FAR], [1, STONE]]) {
    const hp = horn(ctx, [hx - 2 + s * 1.6, hy - 4], [hx - 8 + s, hy - 10], [hx - 12 + s, hy - 6], 3.6);
    shade(ctx, hp, ramp, [hx - 13, hy - 11, 12, 8], { ao: 0 });
  }
  const head = P(ctx, `M${hx - 6},${hy} C${hx - 6},${hy - 6} ${hx},${hy - 7} ${hx + 4},${hy - 4} C${hx + 7},${hy - 2} ${hx + 10},${hy} ${hx + 10},${hy + 3} C${hx + 9},${hy + 6} ${hx + 3},${hy + 7} ${hx - 1},${hy + 6} C${hx - 5},${hy + 5} ${hx - 6.4},${hy + 3} ${hx - 6},${hy} Z`);
  vol(ctx, o, head, STONE, [hx - 6.4, hy - 7, 16.4, 14], { lx: 0.3, ly: 0.2, ao: 0.3, rk: 1.1 });
  const ear = P(ctx, `M${hx - 4},${hy - 2} L${hx - 9},${hy - 5} L${hx - 3},${hy + 2} Z`);
  shade(ctx, ear, STONE, [hx - 9, hy - 5, 6, 7], { ao: 0 });
  // Boca com presas.
  const jo = at ? 2.4 : 0;
  fill(ctx, P(ctx, `M${hx + 2},${hy + 3.4} L${hx + 9.6},${hy + 3} L${hx + 8},${hy + 4.6 + jo} L${hx + 2.6},${hy + 5 + jo} Z`), '#0e071b');
  if (at) fill(ctx, ell(ctx, hx + 6, hy + 4.4 + jo * 0.5, 2, 0.8), '#ea323c');
  for (const x of [hx + 4, hx + 7.4]) fill(ctx, poly(ctx, [[x - 0.8, hy + 3.2], [x + 0.8, hy + 3.2], [x, hy + 5.4]]), '#f9e6cf');
  fill(ctx, ell(ctx, hx + 9, hy + 0.8, 0.7, 0.5), INK);
  fill(ctx, ell(ctx, hx + 3, hy - 0.6, 2.6, 2), '#1a1932');
  angryEye(ctx, hx + 3.2, hy - 0.6, 1.7, '#ffa214', { glowC: '#ff5000', brow: '#0e071b', browW: 1.5 });
  // Braço de cá: garras.
  const hand = at ? [56, 26] : [40 + Math.sin(ph) * 1.4, 39];
  const elb = at ? [47, 28] : [38, 33];
  shade(ctx, limb(ctx, [36, 26], elb, 6, 5), STONE, [34, 24, 14, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 5, 4.4), STONE, [Math.min(elb[0], hand[0]) - 3, Math.min(elb[1], hand[1]) - 3, 14, 10], { ao: 0.2 });
  for (const [dx, dy] of [[2.4, -2], [3.4, 0], [2.6, 2]]) stroke(ctx, [[hand[0], hand[1] + dy * 0.6], [hand[0] + dx, hand[1] + dy], [hand[0] + dx + 1.4, hand[1] + dy + 1]], 1, '#0e071b');
  if (at) for (const k of [0, 1, 2]) stroke(ctx, [[54 + k * 2, 14 + k], [61, 24 + k * 2], [58 + k, 36]], 0.9, hexA('#ffffff', 0.7));
  ctx.restore();
}

// ---------------------------------------------------------------- Serpe de ossos
function vertebra(ctx, x, y, r, far) {
  shade(ctx, ell(ctx, x, y, r, r * 0.85), far ? BONE_FAR : BONE, [x - r, y - r, r * 2, r * 2], { ao: 0.35 });
  fill(ctx, poly(ctx, [[x - r * 0.5, y - r * 0.6], [x + r * 0.1, y - r * 1.6], [x + r * 0.5, y - r * 0.6]]), far ? '#775c5b' : '#cba36f');
  stroke(ctx, [[x - r * 0.3, y + r * 0.4], [x + r * 0.4, y + r * 0.5]], 0.6, '#494834');
}

function boneWyrm(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  ctx.save();
  // Espinha ondulando do rabo até o pescoço.
  const wave = (i) => (at ? 0 : Math.sin(ph + i * 0.9) * 1.6);
  const spine = [[4, 52 + wave(0)], [12, 48 + wave(1)], [20, 50 + wave(2)], [28, 42], [35, 34], [40, 26], [at ? 49 : 45, at ? 19 : 18]];
  const s = spline(spine, 5);
  // Brilho espectral verde dentro das costelas.
  fill(ctx, P(ctx, `M${s[12][0]},${s[12][1]} C${s[12][0] - 4},${s[12][1] + 8} ${s[20][0] - 4},${s[20][1] + 14} ${s[20][0] + 2},${s[20][1] + 8} Z`), hexA('#134c4c', 0.9));
  glow(ctx, 30, 46, 10, '#33984b', { core: '#5ac54f', alpha: 0.7 });
  // Costelas de lá.
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = s[11 + i * 3];
    stroke(ctx, [[x, y], [x - 4, y + 6], [x - 2, y + 12 - i]], 1.2, '#494834');
  }
  // Vértebras (do rabo para a frente, diminuindo para o rabo).
  stroke(ctx, s, 1.6, '#2d2e25');
  for (let i = 0; i < s.length; i += 1) {
    const [x, y] = s[i];
    const r = 0.9 + (i / s.length) * 1.6;
    if (i % 2 === 0) vertebra(ctx, x, y, r, false);
  }
  // Costelas de cá, curvas, com sombra.
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = s[11 + i * 3];
    const pts = [[x, y], [x + 3.6, y + 6], [x + 1.6, y + 12.4 - i * 1.4]];
    stroke(ctx, pts, 1.9, '#2d2e25');
    stroke(ctx, pts.map(([a, b]) => [a - 0.3, b - 0.3]), 1.1, '#f6ca9f');
  }
  // Fogo-fátuo verde preso nas costelas.
  for (const [x, y, k] of [[26, 50, 0], [32, 44, 1], [37, 40, 2]]) {
    const h = 6 + Math.sin(ph * 2 + k) * 1.2;
    fill(ctx, P(ctx, `M${x - 2},${y} C${x - 2},${y - h * 0.5} ${x},${y - h * 0.7} ${x + 0.6},${y - h} C${x + 1.6},${y - h * 0.5} ${x + 2},${y - 1} ${x + 2},${y} C${x + 1},${y + 1.4} ${x - 1},${y + 1.4} ${x - 2},${y} Z`), hexA('#5ac54f', 0.9));
    fill(ctx, ell(ctx, x, y - 1, 1, 1.4), '#d3fc7e');
  }
  // Patinhas de osso (garras).
  for (const [x, a, far] of [[30, 0, true], [24, 1, false]]) {
    const sw = at ? 0.3 : Math.sin(ph + a * Math.PI) * 0.4;
    const kn = [x + 2 + sw * 3, 53];
    const ft = [kn[0] + 2, 58];
    const base = s[14 + a * 2];
    stroke(ctx, [base, kn], far ? 1.6 : 2, far ? '#775c5b' : '#cba36f');
    stroke(ctx, [kn, ft], far ? 1.4 : 1.8, far ? '#775c5b' : '#f6ca9f');
    for (const dx of [-1, 1, 3]) stroke(ctx, [ft, [ft[0] + dx, ft[1] + 0.8]], 0.8, '#494834');
  }
  // Crânio de dragão.
  const [hx, hy] = s[s.length - 1];
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(at ? -0.15 : Math.sin(ph) * 0.05);
  ctx.scale(1.35, 1.35);
  for (const [dx, far] of [[-1.6, true], [0, false]]) {
    const hp = horn(ctx, [-2 + dx, -4], [-8 + dx, -9], [-12 + dx, -5], 3.4);
    shade(ctx, hp, far ? BONE_FAR : BONE, [-13, -10, 12, 8], { ao: 0 });
  }
  const jo = at ? 4 : 0.6 + Math.abs(Math.sin(ph)) * 0.8;
  const jaw = P(ctx, `M-3,3 L12,${3 + jo} L11,${5 + jo} L-2,6 Z`);
  shade(ctx, jaw, BONE, [-3, 3, 15, 4 + jo], { ao: 0.2 });
  for (const x of [4, 7, 10]) fill(ctx, poly(ctx, [[x - 0.7, 3 + jo * (x / 12)], [x + 0.7, 3 + jo * (x / 12)], [x, 1.4 + jo * (x / 12)]]), '#f9e6cf');
  if (at) glow(ctx, 12, 4.6, 6, '#5ac54f', { core: '#d3fc7e', alpha: 0.9 });
  const skull = P(ctx, 'M-5,0 C-5,-5 0,-6.4 4,-4.6 C8,-3.4 12,-2 13.4,0.6 C13.4,2.6 11,3.4 8,3.4 L-1,4 C-4,4 -5.4,2.4 -5,0 Z');
  vol(ctx, o, skull, BONE, [-5.4, -6.4, 19, 10.4], { lx: 0.3, ly: 0.2, ao: 0.25, rim: '#ffc825', rk: 1 });
  for (const x of [5.4, 8.4, 11]) fill(ctx, poly(ctx, [[x - 0.7, 3], [x + 0.7, 3], [x, 4.8]]), '#f9e6cf');
  // Órbita funda com chama verde.
  fill(ctx, ell(ctx, 2.6, -1.6, 2.6, 2), INK);
  glow(ctx, 2.8, -1.4, 3.4, '#5ac54f', { core: '#d3fc7e', alpha: 0.95 });
  fill(ctx, ell(ctx, 3, -1.4, 0.9, 0.9), '#d3fc7e');
  stroke(ctx, [[-0.6, -4.4], [3, -3.6], [5.6, -2.4]], 1.2, '#494834');
  fill(ctx, ell(ctx, 11.6, -0.6, 0.8, 0.5), INK);
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- Gigante de cinzas
function cinderGiant(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Braço de lá.
  const bh = [12 - sw, 44];
  shade(ctx, limb(ctx, [18, 26], [13, 36], 9, 7.6), ASHR_FAR, [8, 24, 12, 14], { ao: 0.2 });
  shade(ctx, limb(ctx, [13, 36], bh, 7.6, 7), ASHR_FAR, [8, 34, 10, 12], { ao: 0.2 });
  shade(ctx, ell(ctx, bh[0], bh[1] + 2, 4.4, 4), ASHR_FAR, [bh[0] - 4, bh[1] - 2, 8, 8], { ao: 0.2 });
  // Pernas.
  for (const [x, s, ramp] of [[38, -1, ASHR_FAR], [25, 1, ASHR]]) {
    const a = at ? s * 0.18 : sw * s * 0.3;
    const knee = [x + Math.sin(a) * 4, 49];
    const foot = [knee[0] + Math.sin(a) * 2, 57 - bob];
    shade(ctx, limb(ctx, [x, 40], knee, 10, 8.4), ramp, [x - 6, 40, 12, 10], { ao: 0.25 });
    shade(ctx, limb(ctx, knee, foot, 8.4, 8), ramp, [x - 5, 48, 10, 10], { ao: 0.3 });
    shade(ctx, ell(ctx, foot[0] + 1.6, foot[1], 5.4, 2.4), ramp, [foot[0] - 4, foot[1] - 2.4, 11, 5], { ao: 0.3 });
    if (ramp === ASHR) lavaCrack(ctx, [[x - 1, 43], [x + 1.6, 47], [x, 52]], 1);
  }
  // Tanga de couro queimado com corrente.
  shade(ctx, P(ctx, 'M20,40 L45,40 L44,49 L38,47 L33,51 L27,47 L21,49 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [20, 40, 25, 11], { ao: 0.2 });
  // Tronco maciço de rocha de cinzas com lava.
  const torso = P(ctx, 'M15,26 C15,18 23,14 32,14 C42,14 50,18 50,27 C50,34 47,40 42,42 C36,43.6 28,43.6 22,42 C17,40 15,33 15,26 Z');
  vol(ctx, o, torso, ASHR, [14, 14, 37, 30], { lx: 0.35, ly: 0.15, ao: 0.45, rim: '#ffa214', rk: 1.3 });
  inside(ctx, torso, () => {
    glow(ctx, 33, 31, 9, '#ff5000', { alpha: 0.5 });
    lavaCrack(ctx, [[33, 20], [31, 25], [34, 29], [32, 34], [35, 40]], 1.4);
    lavaCrack(ctx, [[22, 24], [26, 28], [24, 33]], 1.1);
    lavaCrack(ctx, [[42, 22], [39, 27], [43, 31]], 1.1);
    for (const [x, y, r] of [[25, 20, 3], [41, 34, 2.6], [20, 36, 2.4]]) { fill(ctx, ell(ctx, x, y, r, r * 0.6), '#5d5d5d'); fill(ctx, ell(ctx, x - 0.6, y - 0.4, r * 0.5, r * 0.3), '#858585'); }
  });
  // Corrente cruzada.
  for (let i = 0; i < 7; i += 1) {
    const x = 18 + i * 4.4;
    const y = 18 + i * 3.4;
    shade(ctx, ell(ctx, x, y, 1.8, 1.3, 0.6), ['#1a1932', '#424c6e', '#657392', '#92a1b9'], [x - 2, y - 1.4, 4, 2.8], { ao: 0 });
  }
  // Cabeça pequena afundada, chifres em chamas.
  const hx = 34;
  const hy = 12;
  for (const [s, k] of [[-1, 0], [1, 1]]) {
    const hp = horn(ctx, [hx + s * 4, hy - 3], [hx + s * 8, hy - 5], [hx + s * 7, hy - 12], 3.6);
    shade(ctx, hp, ASHR, [hx + s * 4 - 4, hy - 12, 9, 10], { ao: 0 });
    const fl = Math.sin(ph * 2 + k) * 1.2;
    for (const [dx, h, c] of [[0, 7, '#c64524'], [0, 5.4, '#ff5000'], [0.2, 3.6, '#ffc825']]) {
      const tx = hx + s * 7 + dx;
      const ty = hy - 11;
      fill(ctx, P(ctx, `M${tx - h * 0.3},${ty + 1} C${tx - h * 0.3},${ty - h * 0.5} ${tx + fl * 0.4},${ty - h * 0.7} ${tx - 1 + fl},${ty - h} C${tx + h * 0.4},${ty - h * 0.5} ${tx + h * 0.35},${ty - 0.6} ${tx + h * 0.3},${ty + 1} Z`), c);
    }
  }
  const head = P(ctx, `M${hx - 6},${hy + 4} C${hx - 7},${hy - 4} ${hx - 3},${hy - 6} ${hx + 1},${hy - 6} C${hx + 6},${hy - 6} ${hx + 8},${hy - 3} ${hx + 7.6},${hy + 3} C${hx + 7},${hy + 7} ${hx + 3},${hy + 8.4} ${hx},${hy + 8.4} C${hx - 3},${hy + 8.4} ${hx - 6},${hy + 7} ${hx - 6},${hy + 4} Z`);
  vol(ctx, o, head, ASHR, [hx - 7, hy - 6, 15, 14.4], { lx: 0.3, ly: 0.2, ao: 0.3, rim: '#ffa214', rk: 1.1 });
  // Sobrancelha de rocha e olhos de brasa.
  stroke(ctx, [[hx - 5, hy - 2.4], [hx + 1, hy - 0.4], [hx + 7, hy - 2.6]], 2, '#0e071b');
  for (const x of [hx - 1.6, hx + 4]) {
    glow(ctx, x, hy + 0.8, 3, '#ffa214', { core: '#ffeb57', alpha: 0.9 });
    fill(ctx, ell(ctx, x, hy + 0.8, 1.3, 0.9), '#ffeb57');
  }
  // Boca de fornalha.
  const mo = at ? 2.6 : 1.4;
  fill(ctx, P(ctx, `M${hx - 2},${hy + 4.4} L${hx + 5},${hy + 4.2} L${hx + 4},${hy + 4.4 + mo} L${hx - 1.4},${hy + 4.6 + mo} Z`), '#1c121c');
  fill(ctx, ell(ctx, hx + 1.6, hy + 4.8 + mo * 0.5, 2.2, mo * 0.35), '#ffa214');
  for (const x of [hx - 0.6, hx + 1.6, hx + 3.6]) fill(ctx, poly(ctx, [[x - 0.6, hy + 4.2], [x + 0.6, hy + 4.2], [x, hy + 5.4]]), '#cba36f');
  // Ombreira de pedra de cá.
  const pad = ell(ctx, 48, 21, 6.4, 5);
  vol(ctx, o, pad, ASHR, [41.6, 16, 12.8, 10], { ao: 0.3, rim: '#ffa214' });
  lavaCrack(ctx, [[45, 20], [48, 22], [51, 20]], 0.8);
  // Clava de rocha vulcânica com brasa na ponta.
  const hand = at ? [50, 9] : [51, 38];
  const ang = at ? -1.4 : 2.7 + sw * 0.05;
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(ang);
  shade(ctx, P(ctx, 'M-1.8,6 L1.8,6 L2.6,-16 L-2.6,-16 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [-2.6, -16, 5.2, 22], { lx: 0.2, ao: 0 });
  const club = P(ctx, 'M-5,-14 C-7,-20 -6,-28 0,-30 C6,-28 7,-20 5,-14 C3,-12 -3,-12 -5,-14 Z');
  vol(ctx, o, club, ASHR, [-7, -30, 14, 18], { lx: 0.3, ly: 0.2, ao: 0.3, rim: '#ffa214' });
  inside(ctx, club, () => { glow(ctx, 0, -26, 6, '#ff5000', { alpha: 0.7 }); lavaCrack(ctx, [[-3, -18], [0, -23], [-1, -28]], 1); lavaCrack(ctx, [[3, -16], [3.4, -22]], 0.8); });
  for (const [x, y] of [[-6, -22], [6, -21], [0, -30.4], [-4.6, -27], [4.6, -27]]) shade(ctx, ell(ctx, x, y, 1.5, 1.5), ['#1a1932', '#424c6e', '#92a1b9'], [x - 1.5, y - 1.5, 3, 3], { ao: 0 });
  ctx.restore();
  if (at) for (const [x, y] of [[44, 2], [58, 4], [61, 14], [40, 6]]) ember(ctx, x, y, 1);
  // Braço de cá.
  const elb = at ? [52, 18] : [50, 29];
  shade(ctx, limb(ctx, [46, 22], elb, 9.6, 8.4), ASHR, [44, 16, 12, 16], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 8.4, 7.6), ASHR, [46, Math.min(elb[1], hand[1]) - 4, 10, 14], { ao: 0.25 });
  lavaCrack(ctx, [[elb[0] - 1, elb[1] + 1], [elb[0] + 1, elb[1] + 4]], 0.8);
  vol(ctx, o, ell(ctx, hand[0], hand[1], 4.6, 4.2), ASHR, [hand[0] - 4.6, hand[1] - 4.2, 9.2, 8.4], { ao: 0.2, rim: '#ffa214' });
  for (const [x, y] of [[10, 10 - (f % 2) * 2], [56, 6 + (f % 3)], [22, 3 + (f % 2)]]) ember(ctx, x, y, 0.8);
  ctx.restore();
}

// ---------------------------------------------------------------- Verme de lava
const WORMR = ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];

function lavaWorm(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const sway = at ? 0 : Math.sin(ph) * 2;
  ctx.save();
  // Poça de lava de onde ele sai.
  fill(ctx, ell(ctx, 20, 56.6, 15, 3.2), '#391f21');
  fill(ctx, ell(ctx, 20, 56.2, 12, 2.2), '#8e251d');
  fill(ctx, ell(ctx, 26, 56, 4, 0.9), '#ffa214');
  // Corpo em segmentos blindados, curva em S subindo.
  const hx = at ? 46 : 42 + sway;
  const hy = at ? 12 : 18;
  const pts = [[16, 56], [16 + sway * 0.4, 46], [24 + sway * 0.6, 38], [32 + sway, 34], [hx - 4, hy + 8], [hx, hy]];
  const s = spline(pts, 5);
  for (let i = 0; i < s.length - 1; i += 1) {
    const [x, y] = s[i];
    const [nx, ny] = s[i + 1];
    const r = 7.6 - i * 0.12;
    const a = Math.atan2(ny - y, nx - x);
    fill(ctx, ell(ctx, x, y, r * 0.95, r * 0.86, a), '#ff5000');
    fill(ctx, ell(ctx, x - 0.4, y - 0.4, r * 0.7, r * 0.6, a), '#ffc825');
  }
  for (let i = 0; i < s.length - 1; i += 1) {
    const [x, y] = s[i];
    const [nx, ny] = s[i + 1];
    const r = 7.6 - i * 0.12;
    const a = Math.atan2(ny - y, nx - x);
    if (i % 4 === 0) {
      const seg = ell(ctx, x, y, r * 0.46, r * 0.92, a);
      vol(ctx, o, seg, WORMR, [x - r, y - r, r * 2, r * 2], { lx: 0.3, ly: 0.2, ao: 0.4, rim: '#ffa214', rk: 0.9 });
      // Espinho rombudo no dorso de cada placa.
      const bx = x - Math.sin(a) * r * 0.7;
      const by = y - Math.cos(a) * r * 0.7 * -1;
      fill(ctx, ell(ctx, x - r * 0.3, y - r * 0.55, 1.6, 1.1, a), '#8a4836');
    }
  }
  // Brilho entre as placas, para o lado da luz.
  glow(ctx, 20, 50, 6, '#ff5000', { alpha: 0.6 });
  // Cabeça: boca redonda virada para a frente com anéis de dentes.
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(at ? -0.5 : -0.2 + sway * 0.03);
  const head = ell(ctx, 0, 0, 8.4, 8);
  vol(ctx, o, head, WORMR, [-8.4, -8, 16.8, 16], { lx: 0.3, ly: 0.2, ao: 0.4, rim: '#ffa214', rk: 1.1 });
  inside(ctx, head, () => {
    for (const k of [-4, 0]) stroke(ctx, [[k - 2, -8], [k, 0], [k - 2, 8]], 1.1, '#ff5000');
  });
  // Placas-lábio em volta da boca.
  const mr = at ? 6.4 : 5.2;
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    shade(ctx, ell(ctx, 5 + Math.cos(a) * 1.4, Math.sin(a) * (mr + 1.4), 2.4, 2, a), WORMR.slice(2), [3, -mr - 3, 6, mr * 2 + 6], { ao: 0 });
  }
  fill(ctx, ell(ctx, 5.6, 0, mr * 0.45, mr), '#1c121c');
  glow(ctx, 6, 0, mr * 1.1, '#ffa214', { core: '#ffeb57', alpha: 0.95 });
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    const tx = 5.6 + Math.cos(a) * mr * 0.42;
    const ty = Math.sin(a) * mr * 0.92;
    fill(ctx, poly(ctx, [[tx, ty], [tx + Math.cos(a) * -1.2 + 0.4, ty - Math.sin(a) * 1.6], [tx - 0.8, ty + 0.4]]), '#f9e6cf');
  }
  // Olhinhos de brasa acima da boca.
  for (const [x, y] of [[0.6, -5.4], [3.4, -5.8]]) angryEye(ctx, x, y, 1.2, '#ffeb57', { glowC: '#ff5000', brow: null, pupil: false });
  ctx.restore();
  if (at) {
    for (const [x, y, r] of [[56, 8, 2], [60, 4, 1.4], [61, 12, 1.2], [58, 0, 1]]) ember(ctx, x, y, r);
    glow(ctx, 56, 8, 6, '#ffa214', { alpha: 0.8 });
  }
  for (const [x, y] of [[10, 52 - (f % 3) * 1.6], [44, 53 - (f % 2) * 2]]) ember(ctx, x, y, 0.9);
  ctx.restore();
}

// ---------------------------------------------------------------- Cão do abismo
const ABY = ['#0e071b', '#1c121c', '#3b1443', '#571c27', '#891e2b'];
const ABY_FAR = ['#0e071b', '#0e071b', '#1c121c', '#3b1443', '#571c27'];
const VFIRE = ['#3b1443', '#622461', '#93388f', '#ca52c9', '#fdd2ed'];

function voidFlame(ctx, x, y, h, w, bend) {
  for (const [k, c] of [[1, '#622461'], [0.72, '#93388f'], [0.45, '#ca52c9']]) {
    const ww = w * k; const hh = h * k;
    fill(ctx, P(ctx, `M${x - ww},${y} C${x - ww},${y - hh * 0.5} ${x + bend * 0.4},${y - hh * 0.7} ${x + bend},${y - hh} C${x + bend * 0.5 + ww * 0.6},${y - hh * 0.6} ${x + ww * 1.1},${y - hh * 0.4} ${x + ww},${y} C${x + ww * 0.6},${y + ww * 0.7} ${x - ww * 0.6},${y + ww * 0.7} ${x - ww},${y} Z`), c);
  }
}

function abyssHound(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1.4 : Math.cos(ph * 2) * 0.8;
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  if (at) { ctx.translate(34, 40); ctx.rotate(-0.12); ctx.translate(-34, -40); }
  const sw = (off) => (at ? 0 : Math.sin(ph + off) * 0.5);
  const lf = (off) => (at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2)));
  // Cauda de espinhos com chama roxa.
  const tw = at ? -1 : Math.sin(ph) * 1.6;
  tube(ctx, [[15, 32], [9, 34 + tw], [4, 30 + tw]], 4, 1.8, ABY.slice(1, 5));
  voidFlame(ctx, 4, 31 + tw, 8, 2.4, -2 + tw);
  const lo = (ramp, hock) => ({ upper: 8, lower: 10, wTop: 7.6, wMid: 4.4, wPaw: 4, ramp, hock, paw: '#ca52c9' });
  leg(ctx, [19, 39], at ? -0.8 : sw(Math.PI), { ...lo(ABY_FAR, true), lift: lf(Math.PI) });
  leg(ctx, [42, 40], at ? 0.9 : sw(0), { ...lo(ABY_FAR, false), lift: lf(0) });
  // Corpo magro com costelas à mostra.
  const body = P(ctx, `M12,34 C12,27 18,24.6 26,25.4 C33,26 38,22.6 44,23.6 C50,24.6 52,32 50,38
    C48.6,43 43,43 37,41 C31,39.6 25,42.4 20,42.6 C14.6,42.6 12,39.4 12,34 Z`);
  vol(ctx, o, body, ABY, [11, 22.6, 41, 21], { lx: 0.4, ly: 0.1, ao: 0.4, rim: '#ca52c9', rk: 1.1, side: 't' });
  furTex(ctx, body, [11, 22.6, 41, 21], ['#3b1443', '#1c121c'], { len: 2.2, lw: 0.8, step: 3, dx: -0.8, dy: 0.6, seed: 5 });
  inside(ctx, body, () => {
    for (const x of [30, 34, 38]) { stroke(ctx, [[x, 28], [x + 1.6, 33], [x + 0.6, 38]], 1.2, '#0e071b'); stroke(ctx, [[x - 0.6, 28], [x + 0.8, 33]], 0.7, '#891e2b'); }
    glow(ctx, 26, 36, 5, '#ea323c', { alpha: 0.4 });
  });
  // Juba de espinhos rombudos (chifres curtos) e chamas roxas no dorso.
  for (const [x, h, k] of [[18, 5, 0], [23, 6.4, 1], [28, 7, 2], [33, 7.6, 3], [38, 8.4, 4]]) {
    const sp = horn(ctx, [x, 27], [x - 1.4, 27 - h * 0.6], [x - 3.6, 27 - h], 3.4);
    shade(ctx, sp, ['#1c121c', '#571c27', '#891e2b', '#c42430'], [x - 4, 27 - h, 6, h], { ao: 0 });
    if (k % 2) voidFlame(ctx, x + 1.6, 26, 4 + Math.sin(ph * 2 + k), 1.4, -1.6);
  }
  leg(ctx, [18, 40], at ? 0.6 : sw(0), { ...lo(ABY, true), lift: lf(0) });
  leg(ctx, [45, 40], at ? 1.2 : sw(Math.PI), { ...lo(ABY, false), lift: lf(Math.PI) });
  // Coleira de ferro com elo partido.
  stroke(ctx, [[42, 25], [45, 33]], 2.6, '#2a2f4e');
  stroke(ctx, [[41.6, 25], [44.6, 33]], 1, '#92a1b9');
  for (const [x, y] of [[44, 35], [42.6, 37.6]]) shade(ctx, ell(ctx, x, y, 1.4, 1.1, 0.8), ['#1a1932', '#424c6e', '#92a1b9'], [x - 1.4, y - 1.1, 2.8, 2.2], { ao: 0 });
  // Cabeça: crânio de lobo demoníaco, 3 olhos, chifres curvos.
  ctx.save();
  ctx.translate(47, 29); ctx.scale(1.25, 1.25); ctx.translate(-47, -29);
  const jo = at ? 4 : 0;
  const jaw = P(ctx, `M48,32 C52,32.6 57,${33 + jo * 0.6} 60.6,${34 + jo} C60,${36.6 + jo} 55,${37 + jo} 50,35 Z`);
  shade(ctx, jaw, ABY, [48, 32, 13, 6 + jo], { ao: 0.2 });
  if (at) {
    fill(ctx, poly(ctx, [[49.4, 32], [60.6, 33], [60, 34.2 + jo], [50, 33.6]]), '#3b1443');
    glow(ctx, 56, 33.4 + jo * 0.5, 3.4, '#ca52c9', { alpha: 0.9 });
    for (const x of [52, 55, 58]) fill(ctx, P(ctx, `M${x - 0.7},${34.4 + jo * 0.7} l1.4,0 l-0.7,-2.4 Z`), '#f9e6cf');
  }
  for (const [s, ramp] of [[-1, ABY_FAR], [1, ['#1c121c', '#391f21', '#775c5b', '#918275', '#cba36f']]]) {
    const hp = horn(ctx, [46 + s, 21], [41 + s, 15], [44 + s * 1.4, 10.6], 3.4);
    shade(ctx, hp, ramp, [40, 10, 8, 12], { ao: 0 });
  }
  const head = P(ctx, 'M42.6,25 C43.4,19.6 49,18 53.4,19.6 C56,20.8 57.6,23.4 60.4,25.6 C62,27.2 61.6,31 59.4,32 C55.6,33.2 51,33.2 47.6,32.4 C44,31.4 42.2,28.4 42.6,25 Z');
  vol(ctx, o, head, ABY, [42, 18, 20, 16], { lx: 0.3, ly: 0.2, ao: 0.3, rim: '#ca52c9', rk: 1 });
  const ear = P(ctx, 'M47,21 C46,17 47,14.6 48.6,13.4 C50,15 50.6,18 50.4,21 Z');
  shade(ctx, ear, ABY, [46, 13, 5, 8], { ao: 0 });
  fill(ctx, ell(ctx, 60.6, 27.8, 1.5, 1.2), INK);
  if (!at) {
    stroke(ctx, [[53, 30.6], [57, 31.2], [60, 30.4]], 0.9, '#0e071b');
    for (const x of [55.4, 58]) fill(ctx, P(ctx, `M${x - 0.7},30.8 l1.4,0 l-0.7,2.2 Z`), '#f9e6cf');
  }
  // Três olhos vermelhos em triângulo.
  fill(ctx, ell(ctx, 53, 24.6, 4.6, 2.6, -0.2), '#0e071b');
  for (const [x, y, r] of [[51, 25.2, 1.2], [55, 24.4, 1.4], [53, 22.4, 1]]) {
    glow(ctx, x, y, r * 2.4, '#ea323c', { core: '#f68187', alpha: 0.8 });
    fill(ctx, ell(ctx, x, y, r, r * 0.8), '#f68187');
  }
  stroke(ctx, [[49.6, 21.4], [53, 22.8], [57.4, 22.6]], 1.1, '#0e071b');
  ctx.restore();
  if (at) for (const [x, y] of [[62, 28], [63, 36]]) { fill(ctx, ell(ctx, x, y, 1, 1), '#ca52c9'); }
  for (const [x, y] of [[26, 18 - (f % 2) * 2], [12, 24 + (f % 3)]]) fill(ctx, ell(ctx, x, y, 0.8, 0.8), '#ca52c9');
  ctx.restore();
}

export const MONSTERS_3C = {
  gargoyle: { size: 54, elite: 62, shadow: [30, 59, 16, 2.4], paint: gargoyle },
  boneWyrm: { size: 56, elite: 64, shadow: [30, 59, 24, 2.4], paint: boneWyrm },
  cinderGiant: { size: 56, elite: 64, shadow: [32, 59, 18, 3], paint: cinderGiant },
  lavaWorm: { size: 56, elite: 64, shadow: [28, 59, 20, 2.6], paint: lavaWorm },
  abyssHound: { size: 52, elite: 60, shadow: [32, 59, 20, 2.4], paint: abyssHound }
};
