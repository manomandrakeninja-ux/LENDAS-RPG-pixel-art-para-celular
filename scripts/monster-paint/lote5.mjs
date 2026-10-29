// Lote 5: os inimigos de missão que ainda usavam a arte antiga de canvas (VARIANTS de EnemyVisual):
// bandido (Saqueador, Bandido da Estrada), Contrabandista (chefe), cavaleiro corrompido, cavaleiro
// das brasas (comum e chefe), Guardião Adormecido (espírito da água) e Grifo Guardião.
// Mesmo pipeline das Notas (scripts/bake-monsters.mjs): grade 64, olhando para a direita,
// quadros 0..3 de andar e 4 de ataque.
import { C, P, ell, fill, furTex, glint, glow, hexA, horn, inside, limb, phaseOf, rand, shade, stroke } from './kit.mjs';
import { leg } from './lote1.mjs';
import { INK, angryEye, ember, lavaCrack, poly, rrect, tube, vol } from './lote3a.mjs';

const SKIN = ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'];
const LEATHER = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
const LEATHER_FAR = ['#0e071b', '#1c121c', '#391f21', '#5d2c28'];
const STEEL = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const STEEL_FAR = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392'];
const GOLD = ['#5d2c28', '#8a4836', '#edab50', '#ffc825', '#ffeb57'];

/** Perna de humanoide: coxa, canela e bota com cano dobrado. Devolve o pé. */
function bootLeg(ctx, o, hip, a, { bob = 0, w = 6, kneeY = 48, ground = 57.6, pants, boot, cuff = null, far = false, plate = null }) {
  const knee = [hip[0] + Math.sin(a) * 4, kneeY];
  const foot = [knee[0] + Math.sin(a) * 2.6, ground - bob];
  shade(ctx, limb(ctx, hip, knee, w * 1.12, w * 0.92), pants, [hip[0] - w, hip[1] - 1, w * 2, kneeY - hip[1] + 3], { ao: 0.3 });
  shade(ctx, limb(ctx, knee, [foot[0], foot[1] - 3], w * 0.92, w * 0.8), pants, [knee[0] - w, knee[1], w * 2, 9], { ao: 0.35 });
  const b = P(ctx, `M${foot[0] - w * 0.62},${foot[1] - 6.4} L${foot[0] + w * 0.55},${foot[1] - 6.4} L${foot[0] + w * 0.6},${foot[1] - 2}
    C${foot[0] + w * 1.15},${foot[1] - 1.6} ${foot[0] + w * 1.25},${foot[1] + 0.6} ${foot[0] + w * 0.9},${foot[1] + 1.2} L${foot[0] - w * 0.68},${foot[1] + 1.2} Z`);
  shade(ctx, b, boot, [foot[0] - w, foot[1] - 6.4, w * 2.2, 7.6], { ao: 0.25 });
  stroke(ctx, [[foot[0] - w * 0.6, foot[1] + 0.6], [foot[0] + w, foot[1] + 0.6]], 0.9 * o.px, far ? INK : '#1c121c');
  if (cuff) fill(ctx, poly(ctx, [[foot[0] - w * 0.75, foot[1] - 7.6], [foot[0] + w * 0.7, foot[1] - 7.6], [foot[0] + w * 0.62, foot[1] - 5], [foot[0] - w * 0.66, foot[1] - 5]]), cuff);
  if (plate) {
    const kp = poly(ctx, [[knee[0] - w * 0.6, knee[1] - 2.2], [knee[0] + w * 0.7, knee[1] - 2.6], [knee[0] + w * 0.5, knee[1] + 2], [knee[0] - w * 0.4, knee[1] + 1.8]]);
    shade(ctx, kp, plate, [knee[0] - w * 0.6, knee[1] - 2.6, w * 1.3, 4.6], { ao: 0 });
  }
  return foot;
}

/** Braço em dois segmentos. */
function arm(ctx, sh, el, hand, w0, w1, w2, ramp) {
  shade(ctx, limb(ctx, sh, el, w0, w1), ramp, [Math.min(sh[0], el[0]) - w0, Math.min(sh[1], el[1]) - w0 / 2, Math.abs(el[0] - sh[0]) + w0 * 2, Math.abs(el[1] - sh[1]) + w0], { ao: 0.2 });
  shade(ctx, limb(ctx, el, hand, w1, w2), ramp, [Math.min(el[0], hand[0]) - w1, Math.min(el[1], hand[1]) - w1 / 2, Math.abs(hand[0] - el[0]) + w1 * 2, Math.abs(hand[1] - el[1]) + w1], { ao: 0.2 });
}

function fist(ctx, hand, r, ramp) {
  shade(ctx, ell(ctx, hand[0], hand[1], r, r * 0.92), ramp, [hand[0] - r, hand[1] - r, r * 2, r * 2], { ao: 0.15 });
  stroke(ctx, [[hand[0] - r * 0.6, hand[1] + r * 0.1], [hand[0] + r * 0.5, hand[1] + r * 0.3]], 0.6, ramp[0]);
}

/** Lâmina reta genérica no sistema local (cabo na origem, lâmina para -y). */
function blade(ctx, o, len, w, ramp, { edge = '#ffffff', guard = GOLD, grip = LEATHER, pommel = '#ffc825', curve = 0 } = {}) {
  const tip = [curve, -len];
  const b = P(ctx, `M${-w / 2},-2 C${-w / 2 + curve * 0.3},${-len * 0.5} ${-w * 0.45 + curve * 0.8},${-len * 0.85} ${tip[0]},${tip[1]}
    C${w * 0.6 + curve * 0.9},${-len * 0.8} ${w / 2 + curve * 0.4},${-len * 0.45} ${w / 2},-2 Z`);
  shade(ctx, b, ramp, [-w / 2, -len, w + Math.abs(curve), len], { lx: 0.2, ly: 0.3, ao: 0 });
  fill(ctx, P(ctx, `M0,-2 C${curve * 0.3},${-len * 0.5} ${curve * 0.7},${-len * 0.8} ${tip[0]},${tip[1]} C${w * 0.6 + curve * 0.9},${-len * 0.8} ${w / 2 + curve * 0.4},${-len * 0.45} ${w / 2},-2 Z`), hexA('#0e071b', 0.3));
  stroke(ctx, [[-w * 0.3, -3], [-w * 0.3 + curve * 0.35, -len * 0.55], [curve * 0.75 - w * 0.15, -len * 0.86]], Math.max(0.6, 0.75 * o.px), edge);
  shade(ctx, rrect(ctx, -w * 1.25, -2.6, w * 2.5, 2.2, 0.8), guard, [-w * 1.25, -2.6, w * 2.5, 2.2], { ao: 0 });
  shade(ctx, P(ctx, `M-1,-0.4 L1,-0.4 L1,4.6 L-1,4.6 Z`), grip, [-1, -0.4, 2, 5], { ao: 0 });
  fill(ctx, ell(ctx, 0, 5.4, 1.3, 1.3), pommel);
}

/** Rastro de golpe: meia-lua preenchida (grossa no meio, fina nas pontas), da 1ª à última ponta. */
function slash(ctx, pts, color = '#d5e8ef') {
  const a = pts[0];
  const c = pts[pts.length - 1];
  const b = pts[Math.floor(pts.length / 2)];
  const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
  const ctrl = [2 * b[0] - mid[0], 2 * b[1] - mid[1]];
  const inner = [mid[0] + (ctrl[0] - mid[0]) * 0.45, mid[1] + (ctrl[1] - mid[1]) * 0.45];
  const p = P(ctx, `M${a[0]},${a[1]} Q${ctrl[0]},${ctrl[1]} ${c[0]},${c[1]} Q${inner[0]},${inner[1]} ${a[0]},${a[1]} Z`);
  fill(ctx, p, hexA(color, 0.5));
  ctx.save(); ctx.clip(p);
  ctx.lineWidth = 1.4; ctx.strokeStyle = hexA('#ffffff', 0.85);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(ctrl[0], ctrl[1], c[0], c[1]); ctx.stroke();
  ctx.restore();
}

// ================================================================ Bandido (Saqueador)
const HOOD = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f'];
const HOOD_FAR = ['#0e071b', '#0c2e44', '#134c4c', '#1e6f50'];
const SCARF = ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c'];
const PANTS = ['#1c121c', '#2d2e25', '#494834', '#775c5b'];
const PANTS_FAR = ['#0e071b', '#1c121c', '#2d2e25', '#494834'];

function bandit(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.6 : -Math.abs(Math.sin(ph)) * 1.3;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  // Capa curta do capuz, solta atrás.
  const cw = Math.sin(ph + 1.2) * 1.4;
  const cape = P(ctx, `M23,18 C18,24 15,32 ${13 + cw},42 L${16 + cw},40.4 L${17.6 + cw},44 L${20.4 + cw * 0.6},40.6 L23,43 L27,22 Z`);
  shade(ctx, cape, HOOD_FAR, [13, 18, 15, 26], { lx: 0.3, ly: 0.2, ao: 0.35 });
  // Pernas.
  for (const [x, s, far] of [[35.6, -1, true], [28.4, 1, false]]) {
    const a = at ? s * 0.42 : sw * s * 0.38;
    bootLeg(ctx, o, [x, 40], a, { bob, w: 5.4, pants: far ? PANTS_FAR : PANTS, boot: far ? LEATHER_FAR : LEATHER, cuff: far ? '#391f21' : '#8a4836', far });
  }
  // Braço de trás (mão com bolsa de moedas roubadas).
  const bh = at ? [19, 33] : [21 - sw * 2, 37];
  arm(ctx, [25, 24], [21.4, 31], bh, 5.4, 4.6, 4, HOOD_FAR);
  const pouch = P(ctx, `M${bh[0] - 3.4},${bh[1] + 1.6} C${bh[0] - 4},${bh[1] + 6.6} ${bh[0] + 4},${bh[1] + 6.6} ${bh[0] + 3.4},${bh[1] + 1.6} C${bh[0] + 1.6},${bh[1] + 0.4} ${bh[0] - 1.6},${bh[1] + 0.4} ${bh[0] - 3.4},${bh[1] + 1.6} Z`);
  shade(ctx, pouch, ['#391f21', '#775c5b', '#918275', '#cba36f'], [bh[0] - 4, bh[1], 8, 7], { ao: 0.3 });
  fill(ctx, ell(ctx, bh[0] + 0.6, bh[1] + 2.4, 1, 0.8), '#ffc825');
  fist(ctx, bh, 2.2, SKIN.slice(1, 5));
  // Tronco: gibão de couro sobre camisa verde, cinto cruzado.
  const torso = P(ctx, 'M23.4,23 C25,19.6 29,18.6 32.6,18.6 C36.6,18.6 40,19.8 41.6,23 C42.6,29 41.6,35 40.6,41.6 C36,43.4 29,43.4 24.6,41.6 C23.4,35 22.4,29 23.4,23 Z');
  shade(ctx, torso, LEATHER, [22, 18.6, 21, 25], { lx: 0.3, ly: 0.15, ao: 0.4 });
  inside(ctx, torso, () => {
    fill(ctx, P(ctx, 'M30.4,19 L35,19 L34,42 L31.4,42 Z'), '#134c4c');
    stroke(ctx, [[32.6, 20], [32.6, 41]], 0.8, '#0c2e44');
    for (const y of [24, 29, 34, 39]) { stroke(ctx, [[29.6, y], [31, y + 0.6]], 0.7, '#cba36f'); stroke(ctx, [[34.4, y], [35.8, y + 0.6]], 0.7, '#cba36f'); }
    stroke(ctx, [[24, 26], [24.4, 38]], 1, '#bf6f4a');
    // Remendos costurados.
    fill(ctx, rrect(ctx, 37, 31, 3.6, 3.6, 0.6), '#5d2c28');
    for (const [x, y] of [[37.4, 31.4], [40.2, 31.4], [37.4, 34.2], [40.2, 34.2]]) fill(ctx, ell(ctx, x, y, 0.4, 0.4), '#cba36f');
  });
  vol(ctx, o, P(ctx, 'M24,23 L27,21 L42,38 L39.6,41 Z'), ['#1c121c', '#391f21', '#5d2c28'], [24, 21, 18, 20], { ao: 0, rim: null });
  for (const t of [0.3, 0.6]) fill(ctx, ell(ctx, 25.5 + 15 * t, 22 + 18 * t, 0.8, 0.8), '#c7cfdd');
  // Cinto e fivela; adaga de reserva na bainha.
  shade(ctx, P(ctx, 'M24,39.6 C29,41.4 36,41.4 41,39.6 L41.4,43.4 C36,45 29,45 23.6,43.4 Z'), ['#0e071b', '#1c121c', '#391f21'], [23.6, 39.6, 18, 5], { ao: 0 });
  fill(ctx, rrect(ctx, 31, 40, 3.6, 3.4, 0.6), '#edab50');
  fill(ctx, rrect(ctx, 32, 41, 1.6, 1.4, 0.3), '#1c121c');
  // Arma: adaga longa curva; no ataque, estocada para a frente.
  const hand = at ? [48, 30] : [45, 36 - sw * 0.6];
  const ang = at ? 1.3 : 0.55 + sw * 0.06;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang);
  blade(ctx, o, 15, 3.2, STEEL.slice(2), { curve: 2.2, guard: ['#391f21', '#8a4836', '#bf6f4a'], pommel: '#c42430' });
  ctx.restore();
  if (at) slash(ctx, [[42, 18], [56, 22], [62, 33]]);
  const elb = at ? [44, 27] : [43.4, 31];
  arm(ctx, [39.6, 23.4], elb, hand, 5.6, 4.8, 4.2, HOOD);
  // Braçadeira de couro.
  shade(ctx, limb(ctx, [elb[0] + (hand[0] - elb[0]) * 0.35, elb[1] + (hand[1] - elb[1]) * 0.35], [elb[0] + (hand[0] - elb[0]) * 0.8, elb[1] + (hand[1] - elb[1]) * 0.8], 4.8, 4.4), LEATHER.slice(1), [elb[0] - 3, elb[1] - 3, 12, 10], { ao: 0 });
  fist(ctx, hand, 2.4, SKIN.slice(1, 5));
  // Cabeça: capuz verde, rosto na sombra, lenço vermelho no nariz e na boca.
  const hx = 34;
  const hy = 12.4;
  const hood = P(ctx, `M${hx - 9},${hy + 6} C${hx - 10.4},${hy - 2} ${hx - 6},${hy - 9} ${hx + 0.6},${hy - 9.2} C${hx + 6},${hy - 9} ${hx + 9},${hy - 4} ${hx + 8.6},${hy + 2}
    L${hx + 7},${hy + 8} C${hx + 2},${hy + 9.4} ${hx - 4},${hy + 9.4} ${hx - 9},${hy + 6} Z`);
  vol(ctx, o, hood, HOOD, [hx - 10, hy - 9.4, 19, 18.4], { lx: 0.25, ly: 0.15, ao: 0.3, rim: '#99e65f', rk: 1 });
  // Ponta do capuz caída para trás.
  fill(ctx, P(ctx, `M${hx - 7},${hy - 5} C${hx - 11},${hy - 5} ${hx - 13},${hy - 1} ${hx - 13.6},${hy + 3} C${hx - 11},${hy + 1} ${hx - 9},${hy} ${hx - 8.6},${hy + 1} Z`), '#134c4c');
  const face = P(ctx, `M${hx - 1.6},${hy + 7.6} C${hx - 2.6},${hy + 1} ${hx},${hy - 4.6} ${hx + 4},${hy - 4.8} C${hx + 7},${hy - 4.4} ${hx + 7.6},${hy - 1} ${hx + 7.4},${hy + 2} L${hx + 6.6},${hy + 7.6} Z`);
  shade(ctx, face, SKIN.slice(0, 5), [hx - 2, hy - 5, 10, 13], { lx: 0.7, ly: 0.2, ao: 0.2 });
  // Sombra do capuz por cima da testa.
  fill(ctx, P(ctx, `M${hx - 2},${hy - 1.6} C${hx},${hy - 5.4} ${hx + 5},${hy - 6} ${hx + 8},${hy - 2.4} C${hx + 5},${hy - 3.6} ${hx + 2},${hy - 3.4} ${hx - 1},${hy + 0.4} Z`), hexA('#0e071b', 0.7));
  // Olhos bravos (brilho branco forte para ler na sombra).
  for (const [x, r] of [[hx + 1.2, 1.1], [hx + 5, 1.25]]) {
    fill(ctx, ell(ctx, x, hy + 0.4, r * 1.3, r * 0.8), '#ffffff');
    fill(ctx, ell(ctx, x + 0.35, hy + 0.5, r * 0.55, r * 0.65), INK);
  }
  stroke(ctx, [[hx - 0.4, hy - 1.6], [hx + 2.4, hy - 0.6]], 0.9, '#1c121c');
  stroke(ctx, [[hx + 3.6, hy - 0.8], [hx + 6.8, hy - 1.8]], 0.9, '#1c121c');
  // Lenço vermelho com nó e pontas ao vento.
  const scarf = P(ctx, `M${hx - 2.4},${hy + 2.2} C${hx + 1},${hy + 1.6} ${hx + 5},${hy + 1.6} ${hx + 8.4},${hy + 2.2} L${hx + 7.6},${hy + 6.6} C${hx + 5},${hy + 9.4} ${hx},${hy + 9.4} ${hx - 2.6},${hy + 7.4} Z`);
  vol(ctx, o, scarf, SCARF, [hx - 3, hy + 1.6, 12, 8], { lx: 0.4, ly: 0.1, ao: 0.25, rim: '#f68187', rk: 0.9 });
  inside(ctx, scarf, () => { stroke(ctx, [[hx, hy + 5], [hx + 4, hy + 6.4], [hx + 7.6, hy + 5]], 0.7, '#571c27'); });
  const fl = Math.sin(ph) * 1.4;
  fill(ctx, P(ctx, `M${hx - 2.4},${hy + 3.4} C${hx - 6},${hy + 3 + fl} ${hx - 9},${hy + 5 + fl} ${hx - 11},${hy + 7 + fl} C${hx - 8},${hy + 6.6 + fl} ${hx - 5},${hy + 6.6} ${hx - 2.4},${hy + 6} Z`), '#891e2b');
  fill(ctx, ell(ctx, hx - 2.6, hy + 4.6, 1.4, 1.4), '#c42430');
  ctx.restore();
}

// ================================================================ Contrabandista (chefe)
const TURBAN = ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'];
const COAT = ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9'];
const COAT_FAR = ['#0e071b', '#0c2e44', '#00396d', '#0069aa'];
const SACK = ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f'];
const BEARD = ['#0e071b', '#1c121c', '#391f21', '#5d2c28'];

function banditBoss(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 1.1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 1.6 : 0, bob);
  // Saco de contrabando nas costas, amarrado, com moedas escapando.
  const sack = P(ctx, 'M8,26 C6,18 12,12 19,13 C24,13.6 27,18 26.6,24 C26,32 22,37 15,36.6 C10,36.4 8.6,32 8,26 Z');
  vol(ctx, o, sack, SACK, [6, 12, 21, 25], { lx: 0.3, ly: 0.15, ao: 0.4, rim: '#ffeb57', rk: 1 });
  inside(ctx, sack, () => {
    stroke(ctx, [[10, 22], [14, 25], [12, 31]], 0.8, '#775c5b');
    stroke(ctx, [[18, 16], [21, 22], [23, 30]], 0.8, '#775c5b');
    fill(ctx, rrect(ctx, 12, 26, 4, 4, 0.8), '#5d2c28');
    stroke(ctx, [[12.6, 26.6], [15.4, 29.4]], 0.6, '#cba36f');
  });
  stroke(ctx, [[14, 13.4], [17, 11.6], [20, 13.6]], 1.4, '#5d2c28');
  for (const [x, y] of [[9.4, 37.4], [12, 39.6], [7.6, 40.6]]) { fill(ctx, ell(ctx, x, y + (f % 2) * 0.4, 1.3, 1.1), '#ffc825'); fill(ctx, ell(ctx, x - 0.3, y - 0.3 + (f % 2) * 0.4, 0.5, 0.4), '#ffeb57'); }
  // Pernas grossas com calça bufante e botas de ponta.
  for (const [x, s, far] of [[38, -1, true], [27.6, 1, false]]) {
    const a = at ? s * 0.3 : sw * s * 0.3;
    const knee = [x + Math.sin(a) * 4, 49];
    const foot = [knee[0] + Math.sin(a) * 2.4, 57.6 - bob];
    const pr = far ? ['#0e071b', '#1c121c', '#3b1443', '#571c27'] : ['#1c121c', '#3b1443', '#571c27', '#891e2b', '#c42430'];
    shade(ctx, P(ctx, `M${x - 6},40 C${x - 7.4},46 ${knee[0] - 6},50 ${knee[0] - 4},52 L${knee[0] + 4.4},52 C${knee[0] + 6},49 ${x + 7},46 ${x + 5.6},40 Z`), pr, [x - 7, 40, 14, 12], { ao: 0.35 });
    const boot = P(ctx, `M${foot[0] - 4},${foot[1] - 6.6} L${foot[0] + 3.4},${foot[1] - 6.6} L${foot[0] + 3.8},${foot[1] - 2.4} C${foot[0] + 7},${foot[1] - 2.4} ${foot[0] + 8.6},${foot[1] - 3.4} ${foot[0] + 9.4},${foot[1] - 5} C${foot[0] + 9.4},${foot[1] - 1} ${foot[0] + 8},${foot[1] + 1.2} ${foot[0] + 5},${foot[1] + 1.2} L${foot[0] - 4.2},${foot[1] + 1.2} Z`);
    shade(ctx, boot, far ? LEATHER_FAR : LEATHER, [foot[0] - 4.4, foot[1] - 6.6, 14, 8], { ao: 0.25 });
    stroke(ctx, [[foot[0] - 4, foot[1] - 5.4], [foot[0] + 3.6, foot[1] - 5.4]], 1, far ? '#5d2c28' : '#edab50');
  }
  // Braço de trás segurando a corda do saco.
  arm(ctx, [24, 23], [19.6, 30], [17.4, 21], 7, 6, 5, COAT_FAR);
  fist(ctx, [17.4, 20.4], 2.8, SKIN.slice(0, 4));
  stroke(ctx, [[17.4, 20.4], [16, 14]], 1.2, '#8a4836');
  // Casaco longo azul com barra dourada, aberto sobre a barriga.
  const coat = P(ctx, 'M20.6,22 C22,17 28,15.4 33.6,15.4 C39,15.4 45,17 46,22 C47.4,30 47,38 45.6,46 C40,48.4 26,48.4 21,46 C19.4,38 19.4,30 20.6,22 Z');
  vol(ctx, o, coat, COAT, [19, 15.4, 29, 33], { lx: 0.3, ly: 0.15, ao: 0.45, rim: '#94fdff', rk: 1.1 });
  inside(ctx, coat, () => {
    // Barriga (camisa creme) e faixa vinho na cintura.
    shade(ctx, P(ctx, 'M29,17 C33,16.4 38,16.6 40,18 C42.6,26 42.6,34 41,42 L30,42 C28,34 27.6,26 29,17 Z'), ['#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'], [28, 16.4, 15, 26], { lx: 0.5, ao: 0.3 });
    stroke(ctx, [[34, 19], [35, 24]], 0.8, '#918275');
    // Barra dourada nas bordas do casaco.
    stroke(ctx, [[29, 16.6], [28, 30], [29.6, 47]], 1.3, '#ffc825');
    stroke(ctx, [[40.6, 17.6], [42, 30], [41, 47]], 1.3, '#edab50');
    for (const y of [24, 30, 36]) fill(ctx, ell(ctx, 27.2, y, 0.8, 0.8), '#ffeb57');
    // Bandoleira de facas de arremesso.
    shade(ctx, P(ctx, 'M22,20 L25.6,18 L45,40 L41.6,42.6 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [22, 18, 23, 25], { ao: 0 });
    for (const t of [0.15, 0.35, 0.55, 0.75]) {
      const x = 24 + 19 * t;
      const y = 19.6 + 21.6 * t;
      fill(ctx, poly(ctx, [[x - 0.8, y], [x + 0.8, y], [x + 0.3, y - 4.4], [x - 0.3, y - 4.4]]), '#c7cfdd');
      fill(ctx, rrect(ctx, x - 1, y - 0.4, 2, 2.2, 0.4), '#391f21');
    }
  });
  // Faixa vinho com nó e franja.
  const sash = P(ctx, 'M21.4,38.6 C29,41 38,41 45.8,38.6 L46,43.4 C38,46 29,46 21,43.4 Z');
  vol(ctx, o, sash, TURBAN.slice(0, 5), [21, 38.6, 25, 7], { lx: 0.4, ly: 0.1, ao: 0, rim: null });
  fill(ctx, P(ctx, `M41,42 L44,${49 + sw} L41.6,${48.4 + sw} L40,${51 + sw} L38.6,43 Z`), '#891e2b');
  fill(ctx, ell(ctx, 41.6, 41.6, 2.2, 2), '#c42430');
  // Cimitarra larga; no ataque, golpe por cima da cabeça.
  const hand = at ? [45, 20] : [50, 34 - sw * 0.6];
  const ang = at ? 0.78 : 0.4 + sw * 0.05;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang);
  blade(ctx, o, 26, 5.4, STEEL.slice(2).concat(['#ffffff']), { curve: 6.4, guard: GOLD, pommel: '#ea323c' });
  ctx.restore();
  if (at) slash(ctx, [[46, 2], [60, 10], [63, 30], [56, 44]]);
  const elb = at ? [47.6, 25] : [48.4, 28];
  arm(ctx, [44, 21], elb, hand, 7.6, 6.6, 5.6, COAT);
  // Punho dobrado dourado.
  const cufP = [elb[0] + (hand[0] - elb[0]) * 0.6, elb[1] + (hand[1] - elb[1]) * 0.6];
  fill(ctx, ell(ctx, cufP[0], cufP[1], 3.4, 2.6, Math.atan2(hand[1] - elb[1], hand[0] - elb[0]) + Math.PI / 2), '#ffc825');
  fist(ctx, hand, 3, SKIN.slice(0, 5));
  // Cabeça: rosto largo, barba negra, sorriso de dente de ouro, argola, turbante com joia.
  const hx = 35;
  const hy = 9.6;
  const head = P(ctx, `M${hx - 6.4},${hy + 1} C${hx - 6.6},${hy - 5} ${hx + 6.6},${hy - 5.6} ${hx + 7.2},${hy + 1} C${hx + 7.6},${hy + 5} ${hx + 6},${hy + 8} ${hx + 1},${hy + 8.4} C${hx - 4},${hy + 8} ${hx - 6.6},${hy + 5} ${hx - 6.4},${hy + 1} Z`);
  vol(ctx, o, head, SKIN.slice(1), [hx - 7, hy - 5.6, 14.6, 14], { lx: 0.55, ly: 0.2, ao: 0.25, rim: '#ffc825', rk: 0.8 });
  // Barba cheia em ponta e bigode.
  const beard = P(ctx, `M${hx - 5.6},${hy + 2.4} C${hx - 4},${hy + 5} ${hx},${hy + 5.4} ${hx + 7},${hy + 3} C${hx + 7.6},${hy + 7} ${hx + 5.6},${hy + 11} ${hx + 2},${hy + 14} C${hx},${hy + 11} ${hx - 4.6},${hy + 9.6} ${hx - 5.6},${hy + 2.4} Z`);
  vol(ctx, o, beard, BEARD, [hx - 6, hy + 2, 14, 12], { lx: 0.6, ly: 0.2, ao: 0.2, rim: '#5d2c28', rk: 0.8 });
  furTex(ctx, beard, [hx - 6, hy + 2, 14, 12], ['#391f21', '#0e071b'], { len: 1.8, lw: 0.6, step: 1.8, dx: 0.2, dy: 1, seed: 4 });
  stroke(ctx, [[hx + 0.6, hy + 3.4], [hx + 4, hy + 2.6], [hx + 7.6, hy + 3.8]], 1.3, '#1c121c');
  // Sorriso com dente de ouro.
  const grin = at ? 1 : 0;
  fill(ctx, P(ctx, `M${hx + 1.4},${hy + 4.6} C${hx + 3.6},${hy + 5.8 + grin} ${hx + 5.6},${hy + 5.6 + grin} ${hx + 7},${hy + 4.4} C${hx + 5.6},${hy + 7 + grin} ${hx + 3},${hy + 7 + grin} ${hx + 1.4},${hy + 4.6} Z`), '#1c121c');
  fill(ctx, rrect(ctx, hx + 2.6, hy + 4.8, 1.2, 1.2, 0.2), '#f9e6cf');
  fill(ctx, rrect(ctx, hx + 4, hy + 4.9, 1.3, 1.3, 0.2), '#ffc825');
  fill(ctx, rrect(ctx, hx + 5.4, hy + 4.8, 1, 1.1, 0.2), '#f9e6cf');
  // Nariz grande e olhos astutos.
  fill(ctx, P(ctx, `M${hx + 4.6},${hy - 0.4} C${hx + 7.6},${hy + 0.4} ${hx + 8.4},${hy + 2.4} ${hx + 6.6},${hy + 3} C${hx + 5.6},${hy + 3} ${hx + 4.6},${hy + 2.6} ${hx + 4.6},${hy + 2} Z`), '#bf6f4a');
  stroke(ctx, [[hx + 5.4], [hx + 6.6]].map(([x]) => [x, hy + 2.8]), 0.6, '#5d2c28');
  for (const [x, r] of [[hx + 1, 1.2], [hx + 5.2, 1.25]]) {
    fill(ctx, ell(ctx, x, hy - 0.2, r * 1.2, r * 0.75), '#f9e6cf');
    fill(ctx, ell(ctx, x + 0.4, hy - 0.1, r * 0.55, r * 0.65), INK);
  }
  stroke(ctx, [[hx - 1, hy - 2.2], [hx + 2.6, hy - 1.4]], 1.1, '#1c121c');
  stroke(ctx, [[hx + 3.8], [hx + 7.2]].map(([x], i) => [x, hy - 1.6 - i * 0.8]), 1.1, '#1c121c');
  // Argola de ouro na orelha.
  shade(ctx, ell(ctx, hx - 4.6, hy + 1.6, 1.8, 2.2), SKIN.slice(1, 5), [hx - 6.4, hy - 0.6, 3.6, 4.4], { ao: 0 });
  ctx.save(); ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffc825'; ctx.beginPath(); ctx.arc(hx - 4.8, hy + 4.6, 1.5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  // Turbante volumoso com joia e pena.
  const turb = P(ctx, `M${hx - 8},${hy - 1} C${hx - 9.6},${hy - 7} ${hx - 5},${hy - 11.6} ${hx + 0.6},${hy - 11.6} C${hx + 6.6},${hy - 11.6} ${hx + 9.6},${hy - 7} ${hx + 8.4},${hy - 1.6} C${hx + 4},${hy - 3} ${hx - 3},${hy - 3} ${hx - 8},${hy - 1} Z`);
  vol(ctx, o, turb, TURBAN, [hx - 9.6, hy - 11.6, 19, 10.6], { lx: 0.3, ly: 0.15, ao: 0.3, rim: '#ffc825', rk: 1 });
  inside(ctx, turb, () => {
    for (const k of [0, 1, 2]) stroke(ctx, [[hx - 9, hy - 3 - k * 3], [hx, hy - 6.4 - k * 2.4], [hx + 9, hy - 4 - k * 3]], 0.9, '#571c27');
    stroke(ctx, [[hx - 8, hy - 2], [hx, hy - 3.4], [hx + 8.4, hy - 2.2]], 1.4, '#ffc825');
  });
  fill(ctx, P(ctx, `M${hx + 1},${hy - 8.6} C${hx - 1},${hy - 13} ${hx - 4},${hy - 16} ${hx - 7},${hy - 17} C${hx - 4},${hy - 14} ${hx - 1.6},${hy - 11} ${hx - 0.6},${hy - 8.4} Z`), '#ffffff');
  stroke(ctx, [[hx + 0.4], [hx - 6.4]].map(([x], i) => [x, hy - 8.6 - i * 8]), 0.5, '#92a1b9');
  glow(ctx, hx + 1.2, hy - 7, 2.8, '#00cdf9', { alpha: 0.6 });
  shade(ctx, ell(ctx, hx + 1.2, hy - 7, 1.9, 2.1), ['#00396d', '#0098dc', '#00cdf9', '#94fdff'], [hx - 0.8, hy - 9, 4, 4], { ao: 0 });
  fill(ctx, ell(ctx, hx + 0.6, hy - 7.8, 0.6, 0.6), '#ffffff');
  ctx.restore();
}

// ================================================================ Cavaleiro corrompido
const VIO = ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9'];
const VIO_FAR = ['#0e071b', '#1a1932', '#3b1443', '#622461'];
const DSTEEL = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const DSTEEL_FAR = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392'];

function knight(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 1.6 : 0, bob);
  // Capa violeta rasgada.
  const cw = Math.sin(ph + 1) * 1.4;
  const cape = P(ctx, `M22,18 C18,26 15,36 ${12 + cw},48 L${15 + cw},45.6 L${16.6 + cw},50 L${19.4 + cw * 0.6},45.6 L22,49 L24,44 L26,20 Z`);
  shade(ctx, cape, VIO_FAR, [12, 18, 14, 32], { lx: 0.2, ly: 0.2, ao: 0.4 });
  // Pernas em grevas.
  for (const [x, s, far] of [[36.4, -1, true], [28, 1, false]]) {
    const a = at ? s * 0.32 : sw * s * 0.34;
    bootLeg(ctx, o, [x, 39], a, { bob, w: 6, kneeY: 47.6, pants: far ? DSTEEL_FAR : DSTEEL, boot: far ? DSTEEL_FAR : DSTEEL, far, plate: far ? null : ['#2a2f4e', '#657392', '#92a1b9', '#c7cfdd'] });
  }
  // Escudo pipa no braço de lá: emblema rachado e brilho roxo.
  const sy = at ? -1 : sw * 0.6;
  const shield = P(ctx, `M12,${22 + sy} C16,${20 + sy} 20,${20 + sy} 24,${22 + sy} C24.6,${30 + sy} 22,${37 + sy} 18,${42 + sy} C14,${37 + sy} 11.4,${30 + sy} 12,${22 + sy} Z`);
  vol(ctx, o, shield, DSTEEL, [11.4, 20 + sy, 13.4, 22], { lx: 0.25, ly: 0.2, ao: 0.35, rim: '#ca52c9', rk: 1 });
  inside(ctx, shield, () => {
    shade(ctx, P(ctx, `M14,${23.4 + sy} C16.6,${22.4 + sy} 19.4,${22.4 + sy} 22,${23.4 + sy} C22.4,${30 + sy} 20.4,${35.4 + sy} 18,${39 + sy} C15.6,${35.4 + sy} 13.6,${30 + sy} 14,${23.4 + sy} Z`), VIO.slice(1), [13.6, 22.4 + sy, 9, 17], { ao: 0.3 });
    // Leão apagado (silhueta) e rachadura.
    fill(ctx, P(ctx, `M16,${27 + sy} L19,${25.6 + sy} L20.4,${28 + sy} L19,${31 + sy} L17,${33 + sy} L16.4,${30 + sy} Z`), '#ca52c9');
    stroke(ctx, [[20.6, 23 + sy], [18.6, 28 + sy], [19.6, 32 + sy], [17.6, 37 + sy]], 0.9, INK);
    stroke(ctx, [[13, 23.6 + sy], [16, 22.6 + sy]], 0.8, '#c7cfdd');
  });
  // Tronco: peitoral escurecido com tabardo roxo rasgado.
  const torso = P(ctx, 'M22.6,22 C24,18.6 28,17.6 32.4,17.6 C37,17.6 41,18.6 42.4,22 C43.4,28 42.6,34 41.4,40 C36,41.6 29,41.6 23.6,40 C22.6,34 21.6,28 22.6,22 Z');
  vol(ctx, o, torso, DSTEEL, [21.6, 17.6, 22, 24], { lx: 0.3, ly: 0.15, ao: 0.4, rim: '#92a1b9', rk: 1 });
  inside(ctx, torso, () => {
    stroke(ctx, [[25, 21.6], [32.4, 24.4], [40, 21.6]], 0.9, '#0e071b');
    stroke(ctx, [[25.6, 20.6], [31, 22.6]], 0.9, '#c7cfdd');
    const tab = P(ctx, `M27,25 L38,25 L38.4,40 L36,${44 + sw * 0.6} L34,40.6 L32,${45 + sw} L30,40.4 L27.6,${43.6 + sw * 0.6} L26.6,40 Z`);
    shade(ctx, tab, VIO, [26.6, 25, 12, 20], { lx: 0.4, ly: 0.1, ao: 0.3 });
    stroke(ctx, [[27.4, 25.6], [37.6, 25.6]], 0.9, '#ffc825');
    // Sigilo: olho corrompido brilhando.
    glow(ctx, 32.6, 31, 3.4, '#ca52c9', { alpha: 0.7 });
    fill(ctx, ell(ctx, 32.6, 31, 2.2, 1.3), '#fdd2ed');
    fill(ctx, ell(ctx, 32.6, 31, 0.7, 1.1), INK);
  });
  // Tabardo pendendo abaixo do cinto.
  fill(ctx, P(ctx, `M27,40 L38,40 L37.4,${46 + sw * 0.6} L35,44.6 L33,${47.6 + sw} L30.6,44.6 L28,${46.4 + sw * 0.6} Z`), '#622461');
  shade(ctx, P(ctx, 'M23,38.6 C29,40.6 36,40.6 42,38.6 L42.4,42 C36,43.6 29,43.6 22.6,42 Z'), ['#0e071b', '#1c121c', '#391f21'], [22.6, 38.6, 20, 5], { ao: 0 });
  fill(ctx, rrect(ctx, 31, 38.8, 3.4, 3, 0.6), '#92a1b9');
  // Ombreiras arredondadas.
  for (const [x, back] of [[22.6, true], [42, false]]) {
    const pad = P(ctx, `M${x - 5.4},${22.6} C${x - 5.6},${16} ${x + 5},${15.4} ${x + 5.6},${21} L${x + 4},${24.6} L${x - 4.6},${25} Z`);
    vol(ctx, o, pad, back ? DSTEEL_FAR : DSTEEL, [x - 5.6, 15.4, 11.2, 9.6], { ao: 0.3, rim: back ? null : '#c7cfdd' });
    if (!back) { stroke(ctx, [[x - 4.4, 21.6], [x, 23.4], [x + 4.4, 21.6]], 0.8, '#1a1932'); glint(ctx, x - 2.6, 18.6, 2.4); }
  }
  // Espada longa com runas roxas; no ataque, golpe de cima para baixo.
  const hand = at ? [46, 22] : [45, 35 - sw * 0.6];
  const ang = at ? 0.72 : 0.2 + sw * 0.05;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang);
  blade(ctx, o, 22, 3.4, STEEL.slice(1), { guard: ['#1a1932', '#424c6e', '#92a1b9'], pommel: '#ca52c9', grip: ['#0e071b', '#1c121c', '#3b1443'] });
  for (const y of [-7, -11, -15]) fill(ctx, rrect(ctx, -0.5, y, 1, 1.8, 0.3), '#ca52c9');
  ctx.restore();
  if (at) slash(ctx, [[40, 4], [56, 10], [62, 26], [58, 40]], '#ca52c9');
  const elb = at ? [46.4, 27] : [44.4, 30];
  arm(ctx, [41.6, 23], elb, hand, 6, 5.4, 5, DSTEEL);
  fist(ctx, hand, 2.8, DSTEEL);
  // Elmo fechado com viseira em T brilhando e pluma quebrada.
  const hx = 32.6;
  const hy = 10.4;
  const plume = P(ctx, `M${hx - 1},${hy - 6.6} C${hx - 4},${hy - 11} ${hx - 9},${hy - 11} ${hx - 13},${hy - 7 + sw * 0.6} C${hx - 10},${hy - 7.6} ${hx - 6},${hy - 6} ${hx - 3},${hy - 4.4} Z`);
  shade(ctx, plume, VIO.slice(1), [hx - 13, hy - 11, 12, 7], { lx: 0.6, ly: 0.2, ao: 0 });
  furTex(ctx, plume, [hx - 13, hy - 11, 12, 7], ['#3b1443', '#ca52c9'], { len: 1.6, lw: 0.6, step: 1.8, dx: -1, dy: 0.4 });
  const helm = P(ctx, `M${hx - 6.6},${hy + 6.4} L${hx - 7},${hy - 1.6} C${hx - 6.4},${hy - 7.6} ${hx + 6},${hy - 7.8} ${hx + 7.4},${hy - 1.6} L${hx + 7.6},${hy + 4.6} L${hx + 4.4},${hy + 8.4} L${hx - 3},${hy + 8.4} Z`);
  vol(ctx, o, helm, DSTEEL, [hx - 7, hy - 7.8, 14.6, 16.2], { lx: 0.3, ly: 0.2, ao: 0.35, rim: '#c7cfdd', rk: 1 });
  inside(ctx, helm, () => {
    stroke(ctx, [[hx + 1.6, hy - 7.6], [hx + 1.6, hy + 8.4]], 1.1, '#2a2f4e');
    stroke(ctx, [[hx + 1, hy - 7.6], [hx + 1, hy - 1]], 0.7, '#92a1b9');
    for (const y of [hy + 4.2, hy + 6]) for (const x of [hx + 3.4, hx + 5.2]) fill(ctx, ell(ctx, x, y, 0.5, 0.5), '#0e071b');
  });
  glint(ctx, hx - 4.4, hy - 3.6, 2.6, '#ffffff', { lw: 0.9, angle: -0.9 });
  // Viseira em T com luz roxa.
  fill(ctx, poly(ctx, [[hx - 4, hy - 0.4], [hx + 7.6, hy - 0.8], [hx + 7.4, hy + 1.6], [hx + 3, hy + 1.8], [hx + 3, hy + 5.6], [hx + 1, hy + 5.6], [hx + 1, hy + 1.8], [hx - 3.6, hy + 1.8]]), INK);
  glow(ctx, hx + 3, hy + 0.8, 3.6, '#ca52c9', { alpha: 0.75 });
  for (const x of [hx - 1, hx + 5]) fill(ctx, ell(ctx, x, hy + 0.7, 1.4, 0.7), '#fdd2ed');
  ctx.restore();
}

// ================================================================ Cavaleiro das Brasas
const IRON = ['#0e071b', '#1c121c', '#2d2e25', '#3d3d3d', '#5d5d5d', '#858585'];
const IRON_FAR = ['#0e071b', '#0e071b', '#1c121c', '#2d2e25', '#3d3d3d'];
const FIRECAPE = ['#3b1443', '#571c27', '#8e251d', '#c64524', '#ff5000'];

function flameTongue(ctx, x, y, h, w, bend) {
  const cols = ['#c64524', '#ff5000', '#ffa214', '#ffeb57'];
  for (let i = 0; i < 4; i += 1) {
    const k = 1 - i * 0.22;
    const ww = w * k;
    const hh = h * k;
    fill(ctx, P(ctx, `M${x - ww},${y} C${x - ww},${y - hh * 0.5} ${x + bend * 0.4},${y - hh * 0.7} ${x + bend},${y - hh} C${x + bend * 0.5 + ww * 0.6},${y - hh * 0.6} ${x + ww * 1.1},${y - hh * 0.4} ${x + ww},${y} C${x + ww * 0.6},${y + ww * 0.7} ${x - ww * 0.6},${y + ww * 0.7} ${x - ww},${y} Z`), cols[i]);
  }
}

function emberKnightBase(ctx, f, o, boss) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(at ? 1.4 : 0, bob);
  // Capa em brasa, com a barra queimando.
  const cw = Math.sin(ph + 1) * 1.6;
  const cape = P(ctx, `M22,17 C17,25 13,36 ${9 + cw},${boss ? 52 : 49} L${12 + cw},48 L${14.4 + cw},52 L${17.4 + cw * 0.6},47.6 L20.6,51.4 L23,46 L26,19 Z`);
  shade(ctx, cape, FIRECAPE, [9, 17, 17, 35], { lx: 0.2, ly: 0.15, ao: 0.1 });
  inside(ctx, cape, () => {
    const g = ctx.createLinearGradient(0, 38, 0, 53);
    g.addColorStop(0, hexA('#ff5000', 0)); g.addColorStop(1, hexA('#ffa214', 0.9));
    ctx.fillStyle = g; ctx.fillRect(6, 38, 22, 16);
    stroke(ctx, [[21, 22], [15, 42]], 1, '#3b1443');
  });
  if (boss) for (const [x, h, k] of [[11 + cw, 6, 0], [15 + cw, 7, 1], [19.4 + cw * 0.6, 5, 2]]) flameTongue(ctx, x, 49 + (k % 2) * 1.4, h + Math.sin(ph * 2 + k) * 1.4, 1.6, -2.6);
  // Pernas de ferro negro com rachaduras de lava.
  for (const [x, s, far] of [[36.6, -1, true], [27.6, 1, false]]) {
    const a = at ? s * 0.3 : sw * s * 0.32;
    const foot = bootLeg(ctx, o, [x, 38.6], a, { bob, w: boss ? 7 : 6.4, kneeY: 47.4, pants: far ? IRON_FAR : IRON, boot: far ? IRON_FAR : IRON, far, plate: far ? null : ['#2d2e25', '#5d2c28', '#8a4836', '#bf6f4a'] });
    if (!far) lavaCrack(ctx, [[foot[0] - 1, 49.6], [foot[0] + 0.4, 53], [foot[0] - 0.6, foot[1] - 4]], 0.8);
  }
  // Braço de lá.
  const bh = at ? [18, 32] : [19.6 - sw * 1.4, 36];
  arm(ctx, [24, 23], [20, 30], bh, 6.4, 5.6, 5, IRON_FAR);
  fist(ctx, bh, 3, IRON_FAR);
  // Peitoral de ferro negro com núcleo de magma.
  const torso = P(ctx, 'M21.6,22 C23,18 28,16.8 32.4,16.8 C37,16.8 42,18 43.4,22 C44.6,28 43.6,34 42.4,40.4 C36.6,42.4 28.4,42.4 22.6,40.4 C21.4,34 20.4,28 21.6,22 Z');
  vol(ctx, o, torso, IRON, [20.4, 16.8, 24.2, 25.6], { lx: 0.3, ly: 0.15, ao: 0.4, rim: '#ffa214', rk: 1.2 });
  inside(ctx, torso, () => {
    stroke(ctx, [[24, 21.4], [32.4, 24.4], [41, 21.4]], 1, INK);
    stroke(ctx, [[32.4, 24.6], [32.4, 40]], 1, INK);
    stroke(ctx, [[24.6, 20.4], [30.6, 22.4]], 0.9, '#b4b4b4');
    lavaCrack(ctx, [[25, 26], [27.6, 29], [26, 33], [28.4, 37]], 1);
    lavaCrack(ctx, [[40.6, 25], [38.4, 29], [40, 34]], 0.9);
    const core = boss ? 4.4 : 3.2;
    glow(ctx, 33, 31.6, core * 2.2, '#ff5000', { core: '#ffc825', alpha: 0.95 });
    fill(ctx, P(ctx, `M33,${31.6 - core} L${33 + core * 0.8},31.6 L33,${31.6 + core} L${33 - core * 0.8},31.6 Z`), '#ffeb57');
    fill(ctx, ell(ctx, 33, 31.6, core * 0.35, core * 0.45), '#ffffff');
  });
  // Cinto e saiote de placas.
  shade(ctx, P(ctx, 'M22.4,38.6 C29,40.8 36,40.8 42.6,38.6 L43,42.4 C36,44 29,44 22,42.4 Z'), ['#0e071b', '#1c121c', '#391f21', '#5d2c28'], [22, 38.6, 21, 5.4], { ao: 0 });
  fill(ctx, rrect(ctx, 30.8, 38.8, 4, 3.4, 0.7), '#ffa214');
  for (const x of [23, 28.6, 34.2, 39.6]) {
    shade(ctx, poly(ctx, [[x, 42], [x + 5.2, 42], [x + 4.6, 46.6], [x + 0.6, 46]]), IRON.slice(0, 5), [x, 42, 5.4, 5], { ao: 0.2 });
    stroke(ctx, [[x + 0.6, 45.6], [x + 4.6, 46.2]], 0.7, '#ff5000');
  }
  // Ombreiras com espinhos; no chefe, maiores e com chamas.
  for (const [x, back] of [[22.6, true], [42.6, false]]) {
    const r = boss ? (back ? 0.95 : 1.2) : (back ? 0.85 : 1);
    const pad = P(ctx, `M${x - 6 * r},22.6 C${x - 6 * r},${21 - 7 * r} ${x + 5.6 * r},${21 - 7.6 * r} ${x + 6.4 * r},21 L${x + 4.4 * r},25 L${x - 4.8 * r},25.4 Z`);
    vol(ctx, o, pad, back ? IRON.slice(0, 5) : IRON, [x - 6 * r, 21 - 7.6 * r, 12.4 * r, 4 + 7.6 * r], { ao: 0.3, rim: '#ffa214', rk: back ? 0.8 : 1.1 });
    if (!back) lavaCrack(ctx, [[x - 3, 19.6], [x, 21.4], [x + 3.4, 20]], 0.7);
    for (const dx of boss && !back ? [-3.4, 0.6, 4.4] : back ? [0] : [-2, 2.6]) {
      const sp = horn(ctx, [x + dx * r, 17.6 - (boss ? 2 : 0)], [x + dx * r - 0.6, 14 - (boss ? 3 : 0)], [x + dx * r - 1.6, 11.4 - (boss ? 4 : 0)], 2.4 * r);
      shade(ctx, sp, back ? IRON_FAR : IRON.slice(1), [x + dx - 3, 8, 5, 10], { ao: 0 });
    }
    if (boss && !back) flameTongue(ctx, x + 1, 16, 7 + Math.sin(ph * 2) * 1.4, 2, -2.4);
  }
  // Espada flamejante (o chefe usa um montante maior).
  const hand = at ? [46, boss ? 25 : 22] : [45.6, 35 - sw * 0.6];
  const ang = at ? (boss ? 0.62 : 0.72) : 0.22 + sw * 0.05;
  const len = boss ? 28 : 22;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang);
  for (let i = 0; i < (boss ? 4 : 3); i += 1) {
    const y = -6 - i * (len / (boss ? 4.4 : 3.6));
    flameTongue(ctx, -1.6 + (i % 2) * 0.4, y, 5 + ((f + i) % 3), 1.5, -2.6);
  }
  blade(ctx, o, len, boss ? 5.4 : 3.8, ['#8e251d', '#c64524', '#ff5000', '#ffa214', '#ffc825', '#ffeb57'], { guard: ['#1c121c', '#3d3d3d', '#858585'], pommel: '#ff5000', grip: ['#0e071b', '#1c121c', '#391f21'], edge: '#ffffff' });
  stroke(ctx, [[0, -4], [0, -len + 3]], Math.max(0.6, 0.8 * o.px), '#ffeb57', { cap: 'butt' });
  ctx.restore();
  if (at) {
    slash(ctx, [[38, 2], [55, 6], [63, 22], [60, 40]], '#ffa214');
    for (const [x, y] of [[58, 12], [62, 30], [54, 42]]) ember(ctx, x, y, 1.1);
  }
  const elb = at ? [46.6, 28] : [45, 29.6];
  arm(ctx, [42, 23], elb, hand, 6.6, 6, 5.4, IRON);
  fist(ctx, hand, 3, IRON);
  // Elmo: fechado, com viseira incandescente; o chefe tem chifres e crista de fogo.
  const hx = 32.6;
  const hy = boss ? 10.4 : 10.2;
  ctx.save();
  if (boss) { ctx.translate(hx, hy + 8); ctx.scale(1.22, 1.22); ctx.translate(-hx, -hy - 8); }
  if (boss) {
    for (const s of [-1, 1]) {
      const hp = horn(ctx, [hx + s * 4.6 + 1, hy - 3], [hx + s * 11 + 1, hy - 4], [hx + s * 10 + 2, hy - 13], 3.4);
      shade(ctx, hp, s < 0 ? IRON_FAR : ['#1c121c', '#3d3d3d', '#858585', '#b4b4b4'], [hx + s * 6 - 5, hy - 13, 12, 11], { ao: 0 });
    }
    for (const [dx, h, k] of [[-3, 8, 0], [0, 11, 1], [3, 9, 2]]) flameTongue(ctx, hx + dx + 1, hy - 6, h + Math.sin(ph * 2 + k) * 1.6, 2, -3.4);
  } else {
    flameTongue(ctx, hx, hy - 6.4, 6 + Math.sin(ph * 2) * 1.2, 1.8, -3);
  }
  const helm = P(ctx, `M${hx - 6.6},${hy + 6.4} L${hx - 7},${hy - 1.6} C${hx - 6.4},${hy - 7.6} ${hx + 6},${hy - 7.8} ${hx + 7.4},${hy - 1.6} L${hx + 7.6},${hy + 4.6} L${hx + 4.4},${hy + 8.4} L${hx - 3},${hy + 8.4} Z`);
  vol(ctx, o, helm, IRON, [hx - 7, hy - 7.8, 14.6, 16.2], { lx: 0.3, ly: 0.2, ao: 0.35, rim: '#ffa214', rk: 1.1 });
  inside(ctx, helm, () => {
    lavaCrack(ctx, [[hx - 5, hy - 4], [hx - 3, hy - 1.6]], 0.7);
    for (const y of [hy + 4.2, hy + 6]) for (const x of [hx + 3.4, hx + 5.4]) fill(ctx, ell(ctx, x, y, 0.55, 0.55), '#ff5000');
  });
  glint(ctx, hx - 4.4, hy - 3.6, 2.4, '#b4b4b4', { lw: 0.9, angle: -0.9 });
  fill(ctx, poly(ctx, [[hx - 4.4, hy - 0.2], [hx + 7.6, hy - 0.8], [hx + 7.2, hy + 2.2], [hx - 4, hy + 2.4]]), INK);
  glow(ctx, hx + 2.6, hy + 1, 4.4, '#ff5000', { core: '#ffc825', alpha: 0.85 });
  for (const x of [hx - 1, hx + 4.8]) fill(ctx, P(ctx, `M${x - 2},${hy + 0.4} L${x + 2},${hy + 0.9} L${x - 1.6},${hy + 1.9} Z`), '#ffeb57');
  ctx.restore();
  // Brasas soltas no ar.
  for (const [x, y, k] of [[14, 14, 0], [50, 46, 1], [24, 8, 2]]) ember(ctx, x + ((f + k) % 2), y - ((f + k) % 3) * 1.4, boss ? 1 : 0.8);
  ctx.restore();
}

const emberKnight = (ctx, f, o) => emberKnightBase(ctx, f, o, false);
const emberKnightBoss = (ctx, f, o) => emberKnightBase(ctx, f, o, true);

// ================================================================ Guardião Adormecido (espírito da água)
const WATER = ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'];
const WATER_FAR = ['#0e071b', '#0c2e44', '#00396d', '#0069aa', '#0098dc'];
const STONE = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const CORAL = ['#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'];
const SHELL = ['#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];

function waterSpirit(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1.4 : Math.sin(ph) * 1.2;
  ctx.save();
  // Poça no chão (não balança com o corpo).
  const pool = ell(ctx, 32, 56.6, 17, 3.4);
  shade(ctx, pool, WATER.slice(0, 5), [15, 53.2, 34, 6.8], { lx: 0.4, ly: 0.2, ao: 0 });
  for (const [x, w] of [[24, 4], [34 + (f % 2) * 2, 5], [42, 3]]) stroke(ctx, [[x - w, 56.4], [x, 55.6], [x + w, 56.4]], 0.8, '#94fdff');
  ctx.translate(0, bob);
  // Cauda em redemoinho que desce até a poça.
  const tw = Math.sin(ph) * 1.6;
  const tail = P(ctx, `M22,40 C20,46 ${24 + tw},50 ${28 + tw},53 C${31 + tw},55 ${36},55.6 40,53.6 C${38 - tw},51 ${41 - tw},47 42,40 Z`);
  vol(ctx, o, tail, WATER, [20, 40, 22, 16], { lx: 0.3, ly: 0.2, ao: 0.2, rim: '#94fdff', rk: 1 });
  inside(ctx, tail, () => {
    stroke(ctx, [[23, 43], [30, 47], [37, 45]], 1, '#00cdf9');
    stroke(ctx, [[26, 49], [32, 52], [38, 50]], 0.9, '#94fdff');
  });
  // Barbatana/onda de trás.
  const fin = P(ctx, `M20,28 C12,26 7,${30 + tw} 5,${37 + tw} C9,35 12,36 13,${39 + tw} C15,36 17,36 19,38 Z`);
  vol(ctx, o, fin, WATER_FAR, [5, 26, 15, 13], { lx: 0.5, ly: 0.2, ao: 0.2, rim: null });
  inside(ctx, fin, () => { for (const k of [0, 1, 2]) stroke(ctx, [[19, 29 + k * 3], [9 + k * 2, 31 + tw + k * 2]], 0.7, '#0069aa'); });
  // Braço de lá (água com bracelete de pedra).
  const bh = at ? [17, 30] : [16 + tw * 0.6, 36];
  tube(ctx, [[23, 24], [18, 29], bh], 6.4, 4.8, WATER_FAR);
  shade(ctx, rrect(ctx, bh[0] - 3.2, bh[1] - 5, 6.4, 3.4, 1), STONE.slice(0, 4), [bh[0] - 3.2, bh[1] - 5, 6.4, 3.4], { ao: 0 });
  fill(ctx, ell(ctx, bh[0], bh[1] + 0.6, 2.8, 2.6), '#0069aa');
  // Tronco de água com bolhas e correnteza.
  const body = P(ctx, 'M20.6,26 C21,18 27,14 33,14 C40,14 45,18 45,26 C45,33 43.4,38 42,42 C35,44.6 28,44.6 22,42 C20.6,37 20.2,31 20.6,26 Z');
  vol(ctx, o, body, WATER, [20, 14, 25, 30], { lx: 0.3, ly: 0.15, ao: 0.35, rim: '#94fdff', rk: 1.3 });
  inside(ctx, body, () => {
    for (const [pts, c, w] of [[[[23, 22], [28, 26], [26, 32], [31, 37]], '#00cdf9', 1.1], [[[38, 20], [41, 26], [37, 32]], '#0098dc', 1], [[[27, 39], [33, 41], [40, 38]], '#94fdff', 0.9]]) stroke(ctx, pts, w, c);
    for (const [x, y, r] of [[25, 35, 1.1], [39, 30, 0.9], [36, 37 - (f % 2), 0.7], [30, 23, 0.8]]) {
      ctx.save(); ctx.lineWidth = 0.6; ctx.strokeStyle = '#94fdff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      fill(ctx, ell(ctx, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.35), '#ffffff');
    }
    // Brilho especular.
    stroke(ctx, [[23.4, 21], [25, 17.6]], 1.1, '#ffffff');
  });
  // Colar de conchas e coral.
  stroke(ctx, [[23, 24], [32, 28], [42.6, 23.6]], 1, '#cba36f');
  for (const [x, y, k] of [[26, 25.6, 0], [30, 27.4, 1], [34.4, 27.6, 0], [38.6, 26, 1]]) {
    if (k) shade(ctx, ell(ctx, x, y + 1, 1.6, 1.8), SHELL, [x - 1.6, y - 0.8, 3.2, 3.6], { ao: 0 });
    else shade(ctx, poly(ctx, [[x - 1.4, y], [x + 1.4, y], [x, y + 3]]), CORAL, [x - 1.4, y, 2.8, 3], { ao: 0 });
  }
  // Tridente de pedra e coral; no ataque, estocada com jato d'água.
  const hand = at ? [45, 25] : [46, 36];
  const ang = at ? 0.6 : 0.08 + Math.sin(ph) * 0.04;
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate(ang); ctx.scale(0.66, 0.66);
  shade(ctx, rrect(ctx, -1.2, -28, 2.4, 40, 1), STONE.slice(0, 5), [-1.2, -28, 2.4, 40], { lx: 0.2, ao: 0 });
  for (const y of [-14, -4, 6]) stroke(ctx, [[-1.3, y], [1.3, y + 0.8]], 0.8, '#00cdf9');
  const head = P(ctx, 'M-7,-29 C-7,-33 -6,-37 -6.6,-41 L-4.6,-37 C-4.4,-34 -3,-32 -1.6,-31 L-1.4,-44 L0,-48 L1.4,-44 L1.6,-31 C3,-32 4.4,-34 4.6,-37 L6.6,-41 C6,-37 7,-33 7,-29 C4,-27 -4,-27 -7,-29 Z');
  vol(ctx, o, head, CORAL.concat(['#fdd2ed']), [-7, -48, 14, 21], { lx: 0.3, ly: 0.3, ao: 0.2, rim: '#ffc825', rk: 0.9 });
  glow(ctx, 0, -29, 3, '#00cdf9', { alpha: 0.85 });
  fill(ctx, ell(ctx, 0, -29, 1.2, 1.2), '#94fdff');
  ctx.restore();
  if (at) {
    for (const [pts, c, w] of [[[[50, 16], [58, 10], [63, 14]], '#00cdf9', 2.4], [[[50, 18], [57, 13], [62, 17]], '#94fdff', 1]]) stroke(ctx, pts, w, hexA(c, 0.8));
    for (const [x, y, r] of [[60, 20, 1.4], [56, 7, 1], [63, 9, 0.9]]) fill(ctx, ell(ctx, x, y, r, r), '#94fdff');
  }
  const elb = at ? [45.6, 29] : [45, 31];
  tube(ctx, [[42, 22], elb, hand], 7, 5.4, WATER);
  const cuff = at ? [45.4, 27.4] : [45.6, 33];
  shade(ctx, ell(ctx, cuff[0], cuff[1], 3.6, 2.4, at ? 0 : 1.3), STONE, [cuff[0] - 3.6, cuff[1] - 2.4, 7.2, 4.8], { ao: 0 });
  fill(ctx, ell(ctx, hand[0], hand[1], 3, 2.8), '#0098dc');
  fill(ctx, ell(ctx, hand[0] - 0.8, hand[1] - 0.8, 1.2, 1), '#94fdff');
  // Cabeça: máscara de pedra antiga (o "guardião") com olhos que despertam.
  const hx = 34;
  const hy = 11.4;
  // Crista em barbatana de água atrás da máscara.
  const crest = P(ctx, `M${hx - 4},${hy - 5} C${hx - 9},${hy - 12} ${hx - 15},${hy - 12 + tw} ${hx - 19},${hy - 7 + tw} C${hx - 15},${hy - 7.6} ${hx - 12},${hy - 5} ${hx - 11},${hy - 1} C${hx - 9},${hy - 3} ${hx - 6},${hy - 2} ${hx - 5},${hy + 1} Z`);
  vol(ctx, o, crest, WATER, [hx - 19, hy - 12, 15, 13], { lx: 0.4, ly: 0.2, ao: 0.2, rim: '#94fdff', rk: 1 });
  inside(ctx, crest, () => { for (const k of [0, 1, 2]) stroke(ctx, [[hx - 5, hy - 3 + k], [hx - 16 + k * 2, hy - 9 + tw + k * 2]], 0.7, '#0069aa'); });
  const mask = P(ctx, `M${hx - 6.4},${hy - 1} C${hx - 6.6},${hy - 7} ${hx + 6.4},${hy - 8} ${hx + 7.4},${hy - 1} C${hx + 8},${hy + 4} ${hx + 6},${hy + 8.6} ${hx + 0.6},${hy + 9} C${hx - 4.4},${hy + 8.6} ${hx - 6.6},${hy + 4} ${hx - 6.4},${hy - 1} Z`);
  vol(ctx, o, mask, STONE, [hx - 6.6, hy - 8, 14.6, 17], { lx: 0.3, ly: 0.2, ao: 0.35, rim: '#ffc825', rk: 0.9 });
  inside(ctx, mask, () => {
    // Musgo e rachadura de pedra antiga, faixa turquesa na testa.
    fill(ctx, ell(ctx, hx - 4.4, hy + 5, 3, 2.4), hexA('#33984b', 0.9));
    fill(ctx, ell(ctx, hx - 3.6, hy + 4.4, 1.4, 1), '#5ac54f');
    stroke(ctx, [[hx + 5.6, hy - 6], [hx + 4, hy - 3], [hx + 5.4, hy - 1]], 0.7, INK);
    stroke(ctx, [[hx - 5.6, hy - 3.4], [hx + 7.2, hy - 3.8]], 1.2, '#0098dc');
    for (const x of [hx - 3, hx + 1, hx + 5]) fill(ctx, ell(ctx, x, hy - 3.6, 0.6, 0.6), '#94fdff');
    // Boca solene.
    stroke(ctx, [[hx + 1, hy + 5.4], [hx + 3.6, hy + 5.8], [hx + 6, hy + 5.2]], 0.9, INK);
  });
  // Olhos sonolentos: pálpebra pesada pela metade; no ataque, abertos e brilhando.
  const open = at ? 1 : 0.45;
  for (const [x, r] of [[hx + 0.4, 1.7], [hx + 5, 1.8]]) {
    fill(ctx, ell(ctx, x, hy + 0.8, r * 1.3, r), INK);
    glow(ctx, x, hy + 0.8 + (1 - open) * 0.6, r * 2.2, '#00cdf9', { alpha: at ? 0.95 : 0.6 });
    fill(ctx, ell(ctx, x, hy + 0.8 + (1 - open) * 0.6, r * 1.05, r * 0.7 * open), '#94fdff');
    fill(ctx, ell(ctx, x, hy + 0.8 + (1 - open) * 0.6, r * 0.5, r * 0.4 * open), '#ffffff');
    fill(ctx, P(ctx, `M${x - r * 1.5},${hy + 0.8 - r * 1.1} L${x + r * 1.5},${hy + 0.8 - r * 1.1} L${x + r * 1.4},${hy + 0.8 - r + (1 - open) * r * 1.4} C${x},${hy + 0.8 - r * 0.6 + (1 - open) * r * 1.6} ${x - r},${hy + 0.8 - r * 0.6 + (1 - open) * r * 1.6} ${x - r * 1.4},${hy + 0.8 - r + (1 - open) * r * 1.4} Z`), '#657392');
  }
  // Coroa de conchas e coral.
  for (const [dx, h, kind] of [[-5, 3.6, 'coral'], [-1.6, 5, 'shell'], [2, 6.4, 'coral'], [5.6, 4.4, 'shell']]) {
    const x = hx + dx;
    const y = hy - 6;
    if (kind === 'coral') {
      fill(ctx, horn(ctx, [x, y + 1], [x - 0.6, y - h * 0.5], [x + 0.4, y - h], 2.2), '#c42430');
      fill(ctx, horn(ctx, [x, y - h * 0.4], [x + 1.4, y - h * 0.5], [x + 2.2, y - h * 0.8], 1.3), '#ea323c');
      fill(ctx, ell(ctx, x + 0.4, y - h, 0.8, 0.8), '#f68187');
    } else {
      const sh = P(ctx, `M${x - 2.4},${y + 1} C${x - 2.6},${y - h * 0.7} ${x + 2.6},${y - h * 0.7} ${x + 2.4},${y + 1} Z`);
      shade(ctx, sh, SHELL, [x - 2.6, y - h * 0.7, 5.2, h * 0.7 + 1], { ao: 0 });
      for (const k of [-1, 0, 1]) stroke(ctx, [[x + k * 1.6, y + 0.6], [x + k * 0.6, y - h * 0.5]], 0.5, '#918275');
    }
  }
  // Gotas e bolhas flutuando.
  for (const [x, y, k] of [[12, 18, 0], [52, 44, 1], [48, 8, 2]]) {
    const yy = y - ((f + k) % 4) * 1.2;
    fill(ctx, ell(ctx, x, yy, 1.2, 1.2), '#00cdf9');
    fill(ctx, ell(ctx, x - 0.4, yy - 0.4, 0.5, 0.5), '#ffffff');
  }
  ctx.restore();
}

// ================================================================ Grifo Guardião
const LION = ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#edab50', '#ffc825'];
const LION_FAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
const FEATHER = ['#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#d5e8ef', '#ffffff'];
const FEATHER_FAR = ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const WINGB = ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'];
const WINGB_FAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
const TALON = ['#8a4836', '#edab50', '#ffc825', '#ffeb57'];

function griffinWing(ctx, o, root, ang, far) {
  ctx.save();
  ctx.translate(root[0], root[1]);
  ctx.rotate(ang);
  const ramp = far ? WINGB_FAR : WINGB;
  // Rêmiges longas (marrons com ponta clara), da ponta para a raiz.
  const prim = [[-30, -9, 3.2], [-28, -3.6, 3.2], [-25, 1.4, 3], [-21, 5, 2.8], [-16, 7.6, 2.6], [-11, 8.6, 2.4], [-6, 8.4, 2.2]];
  for (const [i, [x, y, w]] of prim.entries()) {
    const p = P(ctx, `M0,0 C${x * 0.4},${y * 0.4 - w} ${x * 0.85},${y - w * 0.6} ${x},${y} C${x * 0.85},${y + w * 0.6} ${x * 0.4},${y * 0.4 + w} 0,2 Z`);
    shade(ctx, p, ramp, [x, y - 6, -x, 12], { lx: 0.8, ly: 0.2, ao: 0.25 });
    if (!far && i < 4) inside(ctx, p, () => fill(ctx, ell(ctx, x * 0.92, y, 3.6, 2.4, Math.atan2(y, x)), '#f9e6cf'));
    stroke(ctx, [[x * 0.15, 1], [x * 0.9, y]], 0.6, far ? '#1c121c' : '#391f21');
  }
  // Cobertura clara (penas curtas em escamas) no braço da asa.
  const cov = P(ctx, 'M4,-4 C-4,-9 -16,-9 -22,-3 C-16,1 -8,4 3,5 Z');
  vol(ctx, o, cov, far ? FEATHER_FAR : FEATHER, [-22, -9, 26, 14], { lx: 0.5, ly: 0.1, ao: 0.3, rim: far ? null : '#ffc825', rk: 1 });
  inside(ctx, cov, () => {
    for (let r = 0; r < 2; r += 1) for (let k = 0; k < 6; k += 1) {
      const x = -19 + k * 3.6 + r * 1.8;
      const y = -3 + r * 3;
      stroke(ctx, [[x - 1.4, y - 0.6], [x, y + 0.8], [x + 1.4, y - 0.6]], 0.6, far ? '#424c6e' : '#92a1b9');
    }
  });
  ctx.restore();
}

function griffin(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1.2 : Math.cos(ph * 2) * 0.7;
  const flap = at ? -0.55 : Math.sin(ph) * 0.18;
  ctx.save();
  ctx.translate(at ? 1 : 0, bob);
  // No ataque, empina: o corpo gira para trás pelo quadril.
  if (at) { ctx.translate(20, 44); ctx.rotate(-0.22); ctx.translate(-20, -44); }
  // Asa de lá.
  griffinWing(ctx, o, [33, 27], 0.9 + flap * 1.2, true);
  // Cauda de leão com tufo escuro.
  const tw = at ? -2 : Math.sin(ph) * 2;
  tube(ctx, [[12, 33], [6, 32], [3, 27 + tw], [5, 22 + tw]], 2.6, 1.8, LION.slice(1, 5));
  const tuft = P(ctx, `M${5},${22 + tw} C${2},${20 + tw} ${3},${15 + tw} ${7},${15 + tw} C${9},${17 + tw} ${8},${20 + tw} ${5},${22 + tw} Z`);
  shade(ctx, tuft, ['#0e071b', '#1c121c', '#391f21', '#5d2c28'], [2, 15 + tw, 7, 7], { ao: 0 });
  // Patas do lado de lá: traseira de leão e dianteira de águia.
  const sw = (off) => at ? off : Math.sin(ph + off) * 0.42;
  const lf = (off) => at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2));
  leg(ctx, [17, 39], at ? -0.3 : sw(Math.PI), { upper: 8, lower: 11, wTop: 7.4, wMid: 4.4, wPaw: 4, ramp: LION_FAR, hock: true, lift: lf(Math.PI), paw: '#0e071b' });
  const farFront = talonLeg(ctx, [42, 40], at ? 1.1 : sw(0), lf(0), FEATHER_FAR, true, at);
  // Corpo: quarto traseiro de leão, peito emplumado.
  const body = P(ctx, `M11,34 C10,27 16,24 24,24.4 C31,24.6 36,22 42,22.6 C48,23.4 50,30 48,37 C46,42 41,44 36,42.6 C30,41 25,42.4 19,43 C14,43.4 11.6,39 11,34 Z`);
  vol(ctx, o, body, LION, [10, 22, 40, 22], { lx: 0.35, ly: 0.15, ao: 0.45, rim: '#ffeb57', rk: 1.2 });
  inside(ctx, body, () => {
    // Pelagem curta e barriga mais clara.
    furTex(ctx, body, [10, 22, 26, 22], ['#8a4836', '#edab50'], { len: 1.8, lw: 0.6, step: 3, dx: -0.6, dy: 0.8, seed: 6 });
    fill(ctx, P(ctx, 'M16,40 C22,39 30,39.4 36,41 L36,46 L16,46 Z'), hexA('#ffc825', 0.5));
    // Peito de penas brancas cobrindo a frente.
    const chest = P(ctx, 'M34,22 C40,20 48,22 50,30 C51,36 48,42 42,44 C38,40 35,34 34,22 Z');
    shade(ctx, chest, FEATHER, [34, 20, 17, 24], { lx: 0.5, ly: 0.2, ao: 0.35 });
    for (let r = 0; r < 4; r += 1) for (let k = 0; k < 3; k += 1) {
      const x = 39 + k * 3.4 + (r % 2) * 1.7;
      const y = 26 + r * 3.6;
      stroke(ctx, [[x - 1.5, y - 0.6], [x, y + 0.9], [x + 1.5, y - 0.6]], 0.6, '#92a1b9');
    }
  });
  // Coxa traseira em volume.
  const thigh = ell(ctx, 17, 34, 7, 7.6, -0.2);
  shade(ctx, thigh, LION, [10, 26, 15, 16], { ao: 0.35 });
  stroke(ctx, [[12, 31], [14, 37], [19, 40.6]], 0.7, '#5d2c28');
  // Patas do lado de cá.
  leg(ctx, [17.4, 39], at ? 0.3 : sw(0), { upper: 8.4, lower: 11, wTop: 7.6, wMid: 4.6, wPaw: 4.2, ramp: LION, hock: true, lift: lf(0), paw: '#391f21' });
  talonLeg(ctx, [43, 40.6], at ? 1.4 : sw(Math.PI), lf(Math.PI), FEATHER, false, at);
  // Pescoço de penas e cabeça de águia.
  const hx = at ? 51 : 50;
  const hy = at ? 15 : 16;
  const neck = P(ctx, `M40,26 C41,19 ${hx - 6},${hy - 3} ${hx - 1},${hy - 2} C${hx + 3},${hy} ${hx + 2},${hy + 8} 50,32 C46,33 42,31 40,26 Z`);
  vol(ctx, o, neck, FEATHER, [40, hy - 4, hx - 36, 33 - hy], { lx: 0.4, ly: 0.15, ao: 0.3, rim: '#ffc825', rk: 1 });
  furTex(ctx, neck, [40, hy - 4, 14, 20], ['#92a1b9', '#ffffff'], { len: 1.8, lw: 0.6, step: 2.2, dx: -0.8, dy: 0.7, seed: 11 });
  const head = P(ctx, `M${hx - 6},${hy + 2} C${hx - 6.6},${hy - 4} ${hx - 1},${hy - 7} ${hx + 3},${hy - 6} C${hx + 7},${hy - 5} ${hx + 8},${hy - 1} ${hx + 7},${hy + 3} C${hx + 5},${hy + 6} ${hx - 2},${hy + 7} ${hx - 6},${hy + 2} Z`);
  vol(ctx, o, head, FEATHER, [hx - 6.6, hy - 7, 14.6, 13], { lx: 0.35, ly: 0.2, ao: 0.25, rim: '#ffc825', rk: 1 });
  // Penachos (orelhas de pena) para trás.
  for (const [dy, len] of [[-4.6, 7], [-2.6, 6]]) fill(ctx, horn(ctx, [hx - 3, hy + dy], [hx - 7, hy + dy - 2], [hx - 3 - len, hy + dy - 3.6], 2.6), dy < -3 ? '#c7cfdd' : '#92a1b9');
  // Bico dourado em gancho (aberto no ataque, gritando).
  const open = at ? 3 : 0;
  const upper = P(ctx, `M${hx + 4},${hy - 2.6} C${hx + 8.6},${hy - 3.6} ${hx + 12},${hy - 1} ${hx + 11.6},${hy + 3.4} C${hx + 10.6},${hy + 1.6} ${hx + 9},${hy + 0.8} ${hx + 6.6},${hy + 1.2} L${hx + 4.4},${hy + 1.4} Z`);
  const lower = P(ctx, `M${hx + 4.4},${hy + 1.4} L${hx + 9},${hy + 1.4 + open} C${hx + 8},${hy + 3.4 + open} ${hx + 6},${hy + 3.6 + open * 0.6} ${hx + 4.4},${hy + 3} Z`);
  if (at) fill(ctx, P(ctx, `M${hx + 4.4},${hy + 1.2} L${hx + 10},${hy + 1.6} L${hx + 9},${hy + 1.4 + open} Z`), '#891e2b');
  shade(ctx, lower, TALON.slice(0, 3), [hx + 4.4, hy + 1.4, 5, 3 + open], { ao: 0 });
  vol(ctx, o, upper, TALON, [hx + 4, hy - 3.6, 8, 7], { lx: 0.3, ly: 0.2, ao: 0.2, rim: null });
  glint(ctx, hx + 6.4, hy - 2, 2.4, '#ffffff', { lw: 0.7, angle: -0.1 });
  fill(ctx, ell(ctx, hx + 6.6, hy - 1, 0.6, 0.5), '#5d2c28');
  // Olho dourado feroz com risco escuro (como águia).
  fill(ctx, P(ctx, `M${hx - 1.6},${hy - 1.4} L${hx + 4.6},${hy - 0.4} L${hx - 1},${hy + 0.4} Z`), '#1c121c');
  angryEye(ctx, hx + 1.6, hy - 1.4, 1.5, '#ffc825', { brow: '#424c6e', browW: 1.2 });
  if (at) slash(ctx, [[54, 30], [61, 36], [60, 46]], '#ffffff');
  // Asa de cá, por cima.
  griffinWing(ctx, o, [31, 28], 0.65 + flap, false);
  ctx.restore();
}

/** Pata dianteira de águia: perna emplumada, canela escamosa amarela e garras pretas. */
function talonLeg(ctx, hip, swing, lift, ramp, far, at) {
  const knee = [hip[0] + Math.sin(swing) * 6, hip[1] + 7 - (at ? 3 : 0)];
  let foot = [knee[0] + Math.sin(swing) * 3 + (at ? 5 : 0), Math.min(57.6, knee[1] + 10 - lift * 3) - (at ? 4 : 0)];
  shade(ctx, limb(ctx, hip, knee, 7, 5.4), ramp, [hip[0] - 4, hip[1] - 2, 9, 10], { ao: 0.3 });
  furTex(ctx, limb(ctx, hip, knee, 7, 5.4), [hip[0] - 4, hip[1] - 2, 9, 10], [ramp[1], ramp[3]], { len: 1.6, lw: 0.6, step: 2, dx: -0.3, dy: 1, seed: far ? 2 : 7 });
  const scale = far ? ['#5d2c28', '#8a4836', '#edab50'] : TALON;
  shade(ctx, limb(ctx, knee, foot, 3.4, 2.8), scale, [knee[0] - 2, knee[1], 4, 10], { ao: 0.2 });
  for (let k = 1; k < 4; k += 1) {
    const t = k / 4;
    stroke(ctx, [[knee[0] + (foot[0] - knee[0]) * t - 1.4, knee[1] + (foot[1] - knee[1]) * t], [knee[0] + (foot[0] - knee[0]) * t + 1.4, knee[1] + (foot[1] - knee[1]) * t]], 0.5, far ? '#391f21' : '#8a4836');
  }
  // Dedos e garras.
  for (const [dx, dy] of [[4, 0.6], [2.4, 1.4], [-2.4, 1]]) {
    const tip = [foot[0] + dx, foot[1] + dy];
    stroke(ctx, [foot, tip], 1.6, far ? '#8a4836' : '#edab50');
    fill(ctx, horn(ctx, tip, [tip[0] + Math.sign(dx) * 1.2, tip[1]], [tip[0] + Math.sign(dx) * 1.6, tip[1] + 1.6], 1.2), INK);
  }
  return foot;
}

export const MONSTERS_5 = {
  bandit: { size: 48, elite: 56, shadow: [32, 59, 12, 2.2], paint: bandit },
  banditBoss: { size: 112, elite: 112, shadow: [32, 59, 16, 2.6], paint: banditBoss },
  knight: { size: 52, elite: 60, shadow: [32, 59, 13, 2.4], paint: knight },
  emberKnight: { size: 56, elite: 64, shadow: [32, 59, 14, 2.4], paint: emberKnight },
  emberKnightBoss: { size: 136, elite: 136, shadow: [32, 59, 17, 2.8], paint: emberKnightBoss },
  waterSpirit: { size: 128, elite: 128, shadow: [32, 58.6, 18, 2.4], paint: waterSpirit },
  griffin: { size: 136, elite: 136, shadow: [31, 59, 24, 3], paint: griffin }
};
