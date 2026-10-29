// Lote 3 (3a): profundos de src/art/monstersDeep.js repintados em alta resolução:
// coruja das neves, mamute, naja, escaravelho e golem de areia. Também exporta os ajudantes do lote 3.
import { P, ell, fill, furTex, glint, glow, hexA, horn, inside, limb, phaseOf, rand, rimWarm, scales, shade, stroke } from './kit.mjs';

export const INK = '#0e071b';
export const poly = (ctx, pts) => P(ctx, `M${pts.map((p) => p.join(',')).join(' L')} Z`);

/** Volume com degradê + luz de borda quente. */
export function vol(ctx, o, path, ramp, box, { rim = '#edab50', rk = 1.1, side = 'tl', alpha = 0.9, ...sh } = {}) {
  shade(ctx, path, ramp, box, sh);
  if (rim) rimWarm(ctx, path, box, rim, rk * o.px, { side, alpha });
  return path;
}

export function spline(pts, per = 6) {
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

/** Tubo com volume (camadas do escuro ao claro, deslocadas para cima/esquerda). Devolve os pontos. */
export function tube(ctx, pts, w0, w1, ramp, { per = 6, lift = 0.09 } = {}) {
  const s = spline(pts, per);
  const n = s.length;
  const L = ramp.length;
  for (let k = 0; k < L; k += 1) {
    const fk = 1 - k * (0.8 / L);
    for (let i = 0; i < n - 1; i += 1) {
      const w = w0 + (w1 - w0) * (i / (n - 1));
      const off = w * lift * k;
      stroke(ctx, [[s[i][0] - off * 0.5, s[i][1] - off], [s[i + 1][0] - off * 0.5, s[i + 1][1] - off]], w * fk, ramp[k]);
    }
  }
  return s;
}

/** Retângulo arredondado como Path2D. */
export function rrect(ctx, x, y, w, h, r) {
  const p = new ctx.Path2D();
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

/** Olho bravo: brilho, íris, pupila, reflexo e sobrancelha franzida (desce para a frente). */
export function angryEye(ctx, x, y, r, iris, { glowC = null, brow = INK, browW = 1.4, slit = false, pupil = true } = {}) {
  if (glowC) glow(ctx, x, y, r * 2.4, glowC, { core: iris, alpha: 0.75 });
  fill(ctx, ell(ctx, x, y, r, r * 0.82), iris);
  if (pupil) fill(ctx, ell(ctx, x + r * 0.2, y + r * 0.05, slit ? r * 0.22 : r * 0.42, r * 0.62), INK);
  fill(ctx, ell(ctx, x - r * 0.35, y - r * 0.3, Math.max(0.55, r * 0.28), Math.max(0.55, r * 0.28)), '#ffffff');
  if (brow) stroke(ctx, [[x - r * 1.4, y - r * 1.25], [x + r * 0.2, y - r * 0.85], [x + r * 1.3, y - r * 0.2]], browW, brow);
}

/** Rachaduras de lava: traço escuro largo + miolo incandescente. */
export function lavaCrack(ctx, pts, w = 1.6, { hot = '#ffa214', core = '#ffeb57' } = {}) {
  stroke(ctx, pts, w + 0.9, '#1c121c');
  stroke(ctx, pts, w, hot);
  stroke(ctx, pts, Math.max(0.6, w * 0.45), core);
}

/** Brasa/faísca solta. */
export function ember(ctx, x, y, r) {
  fill(ctx, ell(ctx, x, y, r, r), '#ff5000');
  fill(ctx, ell(ctx, x - r * 0.2, y - r * 0.2, r * 0.55, r * 0.55), '#ffeb57');
}

// ---------------------------------------------------------------- Coruja das neves
const OWL = ['#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#d5e8ef', '#ffffff'];
const OWL_FAR = ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];

function owlWing(ctx, o, root, ang, ramp, scale = 1) {
  ctx.save();
  ctx.translate(root[0], root[1]);
  ctx.rotate(ang);
  ctx.scale(scale, scale);
  const p = P(ctx, 'M2,-4 C-5,-8 -15,-8 -24,-3 L-21.5,1.5 L-19,0.4 L-17.4,4.4 L-14.4,2.6 L-12.6,6.4 L-9.4,4.4 L-7.4,7.6 L-4,5.6 L-1,7.4 C2,5 4,0 2,-4 Z');
  shade(ctx, p, ramp, [-24, -8, 28, 16], { lx: 0.6, ly: 0.1, ao: 0.3 });
  inside(ctx, p, () => {
    // Penas primárias: faixas escuras nas pontas e manchas em V.
    for (const [x, y] of [[-20, 0.8], [-16, 3.4], [-12, 5.4], [-8, 6.6]]) stroke(ctx, [[x + 3.6, y - 3.6], [x, y]], 1.1, ramp[1]);
    for (const [x, y] of [[-6, -3], [-11, -3.4], [-16, -2], [-9, 0.6], [-3.6, 0.4]]) stroke(ctx, [[x - 1, y - 0.6], [x, y + 0.5], [x + 1, y - 0.6]], 0.8, '#657392');
    stroke(ctx, [[1, -5], [-8, -6.8], [-18, -4.6]], 1.1, '#ffffff');
  });
  rimWarm(ctx, p, [-24, -8, 28, 16], '#ffc825', 1 * o.px, { side: 't', alpha: 0.8 });
  ctx.restore();
}

function snowOwl(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -2 : Math.cos(ph) * 1.4 - 1;
  const flap = at ? 1.15 : -0.45 + Math.sin(ph) * 0.65;
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  if (at) { ctx.translate(32, 40); ctx.rotate(-0.16); ctx.translate(-32, -40); }
  // Asa de lá (atrás do corpo).
  owlWing(ctx, o, [33, 30], flap + 0.35, OWL_FAR, 0.95);
  // Pés emplumados e garras.
  const feet = at ? [[40, 53], [45, 51]] : [[27, 56.4 - bob], [34, 56.6 - bob]];
  for (const [x, y] of feet) {
    shade(ctx, ell(ctx, x, y - 2.6, 3, 3.4), OWL, [x - 3, y - 6, 6, 7], { ao: 0.3 });
    for (const dx of [-1.6, 0.4, 2.4]) {
      stroke(ctx, [[x + dx * 0.6, y - 0.6], [x + dx + (at ? 1.6 : 0.6), y + 0.8]], 1.2, '#2a2f4e');
      fill(ctx, ell(ctx, x + dx + (at ? 1.8 : 0.8), y + 1, 0.6, 0.6), INK);
    }
  }
  // Cauda curta em leque.
  const tail = P(ctx, 'M18,46 C13,48 10,52 11,55 C14,55 17,53.6 20,51 Z');
  shade(ctx, tail, OWL_FAR, [10, 46, 10, 9], { ao: 0.2 });
  stroke(ctx, [[17, 48.4], [12.6, 53.6]], 0.9, '#424c6e');
  // Corpo redondo (barriga de penas).
  const body = P(ctx, 'M17,40 C16,30 23,25 31,25 C40,25 45,31 44.6,40 C44.4,48 39,54 31,54.4 C23,54.6 17.6,49 17,40 Z');
  shade(ctx, body, OWL, [16, 25, 29, 30], { lx: 0.45, ly: 0.2, ao: 0.45 });
  furTex(ctx, body, [16, 25, 29, 30], ['#ffffff', '#c7cfdd'], { len: 1.8, lw: 0.8, step: 2.9, dx: -0.3, dy: 1, seed: 4 });
  inside(ctx, body, () => {
    // Manchas em V da coruja-das-neves.
    for (let i = 0; i < 14; i += 1) {
      const x = 19 + rand(i * 3.1) * 22;
      const y = 31 + rand(i * 5.7) * 19;
      stroke(ctx, [[x - 1.2, y - 0.6], [x, y + 0.6], [x + 1.2, y - 0.6]], 0.85, i % 3 ? '#657392' : '#424c6e');
    }
  });
  rimWarm(ctx, body, [16, 25, 29, 30], '#ffc825', 1.1 * o.px, { alpha: 0.8 });
  // Asa de cá.
  owlWing(ctx, o, [31, 31], flap, OWL, 1.2);
  // Cabeça grande e redonda com tufos.
  const hx = 34;
  const hy = 20;
  for (const [x, far] of [[hx - 7, true], [hx + 4, false]]) {
    const tuft = P(ctx, `M${x - 3},${hy - 4} C${x - 2.6},${hy - 9} ${x + 0.4},${hy - 11.4} ${x + 1.6},${hy - 12} C${x + 2.6},${hy - 9} ${x + 3},${hy - 6} ${x + 2.6},${hy - 3.6} Z`);
    shade(ctx, tuft, far ? OWL_FAR : OWL, [x - 3, hy - 12, 6, 9], { ao: 0 });
  }
  const head = ell(ctx, hx, hy, 11.4, 9.6);
  shade(ctx, head, OWL, [hx - 11.4, hy - 9.6, 22.8, 19.2], { lx: 0.4, ly: 0.2, ao: 0.3 });
  inside(ctx, head, () => {
    for (const [x, y] of [[hx - 8, hy - 4], [hx - 5, hy - 7], [hx - 9, hy + 1], [hx - 4.6, hy - 2]]) stroke(ctx, [[x - 1, y], [x, y + 0.8], [x + 1, y]], 0.8, '#657392');
  });
  rimWarm(ctx, head, [hx - 11.4, hy - 9.6, 22.8, 19.2], '#ffc825', 1.1 * o.px, { alpha: 0.85 });
  // Disco facial claro com borda escura, virado para a direita.
  const disc = ell(ctx, hx + 4.4, hy + 0.6, 7.4, 7.2);
  fill(ctx, disc, '#ffffff');
  stroke(ctx, [[hx - 2.4, hy - 4.6], [hx - 3, hy + 2], [hx + 0.4, hy + 7], [hx + 5, hy + 8]], 1, '#92a1b9');
  // Olhos enormes âmbar, sobrancelhas de penas franzidas.
  for (const [x, r] of [[hx + 1, 2.7], [hx + 7.4, 3]]) {
    fill(ctx, ell(ctx, x, hy, r + 0.8, r + 0.6), '#2a2f4e');
    angryEye(ctx, x, hy, r, '#ffc825', { glowC: at ? '#ffa214' : null, brow: '#424c6e', browW: 1.5 });
  }
  // Bico em gancho.
  const bk = P(ctx, `M${hx + 3},${hy + 3} C${hx + 5},${hy + 2.6} ${hx + 6.4},${hy + 4} ${hx + 5.6},${hy + (at ? 8.4 : 7.4)} C${hx + 4.6},${hy + 6} ${hx + 3.6},${hy + 5.4} ${hx + 3},${hy + 3} Z`);
  shade(ctx, bk, ['#1a1932', '#2a2f4e', '#424c6e', '#657392'], [hx + 3, hy + 2.6, 4, 6], { ao: 0 });
  if (at) fill(ctx, ell(ctx, hx + 6.6, hy + 6, 1.3, 1.6), '#c42430');
  ctx.restore();
}

// ---------------------------------------------------------------- Mamute
const MAM = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69'];
const MAM_FAR = ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#8a4836'];
const TUSK = ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'];

function pillar(ctx, hip, swing, ramp, ground, { w = 9, len = 15 } = {}) {
  const foot = [hip[0] + Math.sin(swing) * len * 0.6, ground];
  const knee = [(hip[0] + foot[0]) / 2 + 0.6, (hip[1] + ground) / 2];
  shade(ctx, limb(ctx, hip, knee, w, w * 0.88), ramp, [hip[0] - w, hip[1], w * 2, len], { ao: 0.25 });
  shade(ctx, limb(ctx, knee, [foot[0], foot[1] - 2], w * 0.88, w * 0.92), ramp, [foot[0] - w, knee[1], w * 2, len], { ao: 0.4 });
  furTex(ctx, limb(ctx, hip, knee, w, w * 0.88), [hip[0] - w, hip[1], w * 2, len / 2], [ramp[2], ramp[4]], { len: 2.2, lw: 0.8, step: 3, dx: -0.2, dy: 1 });
  fill(ctx, ell(ctx, foot[0], foot[1] - 1.4, w * 0.55, 1.8), ramp[0]);
  for (const dx of [-2.2, 0.4, 3]) fill(ctx, ell(ctx, foot[0] + dx, foot[1] - 1, 1.1, 0.9), '#f6ca9f');
  return foot;
}

function mammoth(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 0.9;
  const sw = (off) => (at ? 0 : Math.sin(ph + off) * 0.28);
  ctx.save();
  ctx.translate(0, bob);
  if (at) { ctx.translate(10, 58); ctx.rotate(-0.14); ctx.translate(-10, -58); }
  // Patas de lá.
  pillar(ctx, [14, 40], sw(Math.PI), MAM_FAR, 58.6 - bob);
  pillar(ctx, [38, 42], at ? 0.5 : sw(0), MAM_FAR, at ? 54 : 58.6 - bob);
  // Presa de lá.
  tube(ctx, [[47, 36], [53, 43], [59, 42], [61, 35]], 3, 1.6, TUSK.slice(0, 4));
  // Corpo com corcova.
  const body = P(ctx, 'M5,40 C3,30 9,20 20,17 C27,15 33,15 38,18 C44,21 47,27 47,35 C47,43 43,48 36,48 L14,48 C8,48 5.4,45 5,40 Z');
  shade(ctx, body, MAM, [3, 15, 45, 34], { lx: 0.35, ly: 0.1, ao: 0.45 });
  furTex(ctx, body, [3, 15, 45, 34], ['#5d2c28', '#bf6f4a', '#8a4836'], { len: 2.6, lw: 0.8, step: 3.2, dx: -0.5, dy: 1, seed: 6 });
  rimWarm(ctx, body, [3, 15, 45, 34], '#ffc825', 1.2 * o.px, { side: 't', alpha: 0.85 });
  // Franja de pelo comprido pendurada na barriga.
  for (let i = 0; i < 13; i += 1) {
    const x = 7 + i * 3.1;
    const l = 5 + rand(i * 2.3) * 3;
    const sway = at ? 0.6 : Math.sin(ph + i * 0.6) * 0.6;
    stroke(ctx, [[x, 45], [x - 0.6 + sway, 45 + l * 0.6], [x - 1.2 + sway, 45 + l]], 2, i % 2 ? '#391f21' : '#5d2c28');
    stroke(ctx, [[x - 0.4, 45], [x - 0.8 + sway, 45 + l * 0.5]], 0.9, '#8a4836');
  }
  // Cauda curta com tufo.
  stroke(ctx, [[6, 30], [3, 36], [3.4, 41]], 1.6, '#391f21');
  fill(ctx, ell(ctx, 3.4, 42, 1.6, 2.4), '#1c121c');
  // Patas de cá.
  pillar(ctx, [18, 42], sw(0), MAM, 58.8 - bob, { w: 10 });
  pillar(ctx, [41, 43], at ? 0.7 : sw(Math.PI), MAM, at ? 54.4 : 58.8 - bob, { w: 10 });
  // Cabeça em domo, orelha pequena, olho bravo.
  const head = P(ctx, 'M37,26 C36,16 42,9 49,10 C55,11 58,17 57.4,24 C57,30 55,35 50,37 C45,38.4 40,35 37,26 Z');
  shade(ctx, head, MAM, [36, 9, 22, 30], { lx: 0.4, ly: 0.12, ao: 0.35 });
  furTex(ctx, head, [36, 9, 22, 30], ['#5d2c28', '#bf6f4a'], { len: 2.4, lw: 0.9, step: 2.8, dx: -0.4, dy: 1, seed: 2 });
  rimWarm(ctx, head, [36, 9, 22, 30], '#ffc825', 1.2 * o.px, { alpha: 0.9 });
  // Topete de pelo no alto.
  for (const [x, l] of [[44, 5], [47, 6], [50, 5]]) stroke(ctx, [[x, 12], [x - 1.4, 12 - l * 0.6], [x - 3, 12 - l]], 1.8, '#5d2c28');
  const ear = P(ctx, 'M40,22 C36,21 34,25 35,30 C36,33 40,33 42,30 Z');
  shade(ctx, ear, MAM, [34, 21, 8, 12], { ao: 0.2 });
  stroke(ctx, [[39.6, 22.6], [35.6, 24], [35.4, 30], [38.6, 32.4]], 0.9, '#bf6f4a');
  fill(ctx, ell(ctx, 38.6, 27, 1.4, 2.4), '#5d2c28');
  fill(ctx, ell(ctx, 50.4, 22.6, 2.8, 2.4), '#391f21');
  angryEye(ctx, 50.6, 22.6, 1.9, '#ffc825', { brow: '#1c121c', browW: 1.7 });
  stroke(ctx, [[48, 26], [51, 27.4]], 0.8, '#391f21');
  // Tromba: abaixada andando, erguida no ataque.
  const swing = at ? 0 : Math.sin(ph) * 1.4;
  const trunk = at
    ? [[54, 30], [59, 24], [61, 16], [58, 11], [55.6, 13]]
    : [[54, 30], [57.4, 37], [58 + swing, 45], [56.6 + swing, 51], [54.4 + swing, 51]];
  tube(ctx, trunk, 6, 2.4, ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'], { per: 8 });
  const s = spline(trunk, 3);
  for (let i = 2; i < s.length - 2; i += 1) {
    const [x, y] = s[i];
    stroke(ctx, [[x - 1.4, y - 0.4], [x + 1.4, y + 0.4]], 0.7, '#391f21');
  }
  // Presa de cá: enorme, curva para cima, marfim com veio.
  const tk = at ? [[50, 33], [56, 42], [62, 38], [62.6, 28]] : [[50, 33], [55, 42], [61.4, 42], [63, 34]];
  tube(ctx, tk, 4, 1.8, TUSK, { per: 8 });
  stroke(ctx, spline(tk, 4).slice(2, 9).map(([x, y]) => [x - 0.4, y - 0.8]), 0.7, '#ffffff');
  fill(ctx, ell(ctx, 50.6, 33.4, 2.4, 2), '#391f21');
  if (at) for (const [x, y] of [[60, 9], [63, 13], [57, 7]]) fill(ctx, ell(ctx, x, y, 0.9, 0.9), '#d5e8ef');
  ctx.restore();
}

// ---------------------------------------------------------------- Naja do deserto
const COB = ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#edab50', '#ffc825'];
const COB_FAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#ad7954'];
const COB_BELLY = ['#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf'];

function bands(ctx, s, every, w, color, from = 0) {
  for (let i = from; i < s.length - 2; i += every) {
    const [x0, y0] = s[i]; const [x1, y1] = s[i + 1];
    const dx = x1 - x0; const dy = y1 - y0; const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l * w; const ny = dx / l * w;
    stroke(ctx, [[x0 + nx, y0 + ny], [x0 - nx, y0 - ny]], 1.2, color);
  }
}

function cobra(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const sway = at ? 0 : Math.sin(ph) * 1.6;
  ctx.save();
  // Rodilhas no chão (de trás, mais escuras).
  const back = [[38, 51], [30, 49.6], [18, 50], [9, 52.4], [8, 55.6], [16, 57.4], [28, 57.4], [40, 56.8], [46, 55]];
  const sb = tube(ctx, back, 6.4, 6, COB_FAR, { per: 6 });
  bands(ctx, sb, 4, 2.8, '#1c121c');
  // Cauda fina por cima.
  tube(ctx, [[46, 55], [50, 52.4], [49, 50], [46 + sway * 0.4, 49.6]], 4.4, 1.2, COB, { per: 5 });
  // Pescoço erguido.
  const hx = at ? 52 : 41 + sway;
  const hy = at ? 22 : 16;
  const neck = [[32, 54], [34.6, 46], [37 + sway * 0.4, 37], [hx - 4, hy + 12]];
  const sn = tube(ctx, neck, 7.4, 6, COB, { per: 6 });
  // Barriga clara em placas na frente do pescoço.
  for (let i = 1; i < sn.length - 1; i += 2) {
    const [x, y] = sn[i];
    fill(ctx, ell(ctx, x + 2.4, y, 1.6, 1.1), COB_BELLY[2]);
    stroke(ctx, [[x + 1, y + 1], [x + 3.6, y + 0.8]], 0.6, COB_BELLY[0]);
  }
  bands(ctx, sn, 3, 3.4, '#391f21');
  // Capuz aberto e largo atrás da cabeça: dourado com bordas escuras e escamas.
  const cx = hx - 4.6;
  const cy = hy + 10;
  const hood = P(ctx, `M${cx},${cy + 13} C${cx - 11},${cy + 7} ${cx - 13},${cy - 5} ${cx - 6},${cy - 10} C${cx - 2},${cy - 12.6} ${cx + 3},${cy - 12.6} ${cx + 7},${cy - 10} C${cx + 13},${cy - 5} ${cx + 11},${cy + 7} ${cx},${cy + 13} Z`);
  shade(ctx, hood, COB, [cx - 12, cy - 12, 24, 25], { lx: 0.3, ly: 0.2, ao: 0.45 });
  scales(ctx, hood, [cx - 12, cy - 12, 24, 25], 1.6, hexA('#391f21', 0.75), hexA('#ffeb57', 0.6), { lw: 0.6, lightW: 0.5 });
  inside(ctx, hood, () => {
    stroke(ctx, [[cx - 9.6, cy + 4], [cx - 10.6, cy - 4], [cx - 5, cy - 10.4]], 2.2, '#391f21');
    stroke(ctx, [[cx + 9.6, cy + 4], [cx + 10.6, cy - 4], [cx + 5, cy - 10.4]], 2.2, '#391f21');
    shade(ctx, P(ctx, `M${cx - 2},${cy + 12} C${cx - 3.4},${cy + 4} ${cx - 2.4},${cy - 2} ${cx},${cy - 3} C${cx + 2.4},${cy - 2} ${cx + 3.4},${cy + 4} ${cx + 2},${cy + 12} Z`), COB_BELLY, [cx - 3.4, cy - 3, 7, 15], { ao: 0.2 });
    for (const y of [cy + 1, cy + 4, cy + 7, cy + 10]) stroke(ctx, [[cx - 2.6, y], [cx + 2.6, y]], 0.6, '#ad7954');
  });
  rimWarm(ctx, hood, [cx - 12, cy - 12, 24, 25], '#ffeb57', 1.1 * o.px, { alpha: 0.9 });
  // Cabeça grande, escura, de perfil para a direita, por cima do capuz.
  const HEADR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f'];
  ctx.save();
  ctx.translate(hx, hy); ctx.scale(1.35, 1.35); ctx.translate(-hx, -hy);
  const head = P(ctx, `M${hx - 6},${hy + 1} C${hx - 5},${hy - 4} ${hx + 1},${hy - 4.6} ${hx + 5},${hy - 2} C${hx + 7.4},${hy - 0.6} ${hx + 7.4},${hy + 2} ${hx + 5},${hy + 3} L${hx - 2},${hy + 4.6} C${hx - 4.6},${hy + 4.6} ${hx - 6.4},${hy + 3.4} ${hx - 6},${hy + 1} Z`);
  shade(ctx, head, HEADR, [hx - 6.4, hy - 4.6, 14, 9], { lx: 0.3, ly: 0.1, ao: 0.25 });
  scales(ctx, head, [hx - 6.4, hy - 4.6, 14, 9], 1.2, hexA('#1c121c', 0.6), null, { lw: 0.45 });
  rimWarm(ctx, head, [hx - 6.4, hy - 4.6, 14, 9], '#ffc825', 0.8 * o.px, { alpha: 0.9 });
  stroke(ctx, [[hx - 4, hy + 3.4], [hx + 4.4, hy + 2.6]], 0.8, '#cba36f');
  if (at) {
    const jaw = P(ctx, `M${hx - 2},${hy + 3} L${hx + 6},${hy + 2} C${hx + 7},${hy + 6} ${hx + 3},${hy + 8.4} ${hx - 2},${hy + 6} Z`);
    fill(ctx, jaw, '#571c27');
    fill(ctx, P(ctx, `M${hx - 1.4},${hy + 4.4} L${hx + 5},${hy + 3.4} C${hx + 4.4},${hy + 6} ${hx + 2},${hy + 6.6} ${hx - 1},${hy + 5.6} Z`), '#ea323c');
    for (const x of [hx + 4.4, hx + 1.4]) fill(ctx, poly(ctx, [[x - 0.7, hy + 2.4], [x + 0.7, hy + 2.4], [x + 0.2, hy + 5.6]]), '#ffffff');
  } else if (f % 2) {
    stroke(ctx, [[hx + 6.4, hy + 1.4], [hx + 9, hy + 2]], 0.7, '#ea323c');
    stroke(ctx, [[hx + 9, hy + 2], [hx + 10.2, hy + 1.2]], 0.6, '#ea323c');
    stroke(ctx, [[hx + 9, hy + 2], [hx + 10.2, hy + 3]], 0.6, '#ea323c');
  }
  fill(ctx, ell(ctx, hx + 5.4, hy - 0.4, 0.45, 0.45), INK);
  angryEye(ctx, hx + 1.2, hy - 0.6, 1.7, '#ffc825', { glowC: '#ff5000', slit: true, brow: '#0e071b', browW: 1.1 });
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- Escaravelho sagrado
// Fase 22c: escaravelho sagrado de lápis-lazúli e ouro (o verde lia como besouro comum), com o disco solar.
const SCB = ['#0e071b', '#03193f', '#00396d', '#0069aa', '#0098dc', '#00cdf9'];
const SCB_FAR = ['#0e071b', '#0e071b', '#03193f', '#00396d', '#0069aa'];
const GOLD = ['#5d2c28', '#8a4836', '#edab50', '#ffc825', '#ffeb57'];

function beetleLeg(ctx, base, a, far, at) {
  const col = far ? '#0c2e44' : '#134c4c';
  const knee = [base[0] + Math.sin(a) * 4 + (far ? 1 : 0), base[1] + 2.6];
  const foot = [knee[0] + Math.sin(a) * 2.6 + 1.6, 58.4];
  stroke(ctx, [base, knee], 3, far ? '#0e071b' : '#0c2e44');
  stroke(ctx, [[base[0] - 0.4, base[1] - 0.4], [knee[0] - 0.4, knee[1] - 0.4]], 1.4, col);
  stroke(ctx, [knee, foot], 2.2, far ? '#0e071b' : '#0c2e44');
  stroke(ctx, [[knee[0] - 0.4, knee[1]], [foot[0] - 0.4, foot[1] - 1.6]], 0.9, far ? '#0c2e44' : '#1e6f50');
  fill(ctx, ell(ctx, knee[0], knee[1], 1.6, 1.4), far ? '#134c4c' : '#edab50');
  stroke(ctx, [foot, [foot[0] + 1.6, foot[1] - 0.2]], 1, '#0e071b');
  if (at) stroke(ctx, [[knee[0], knee[1]], [knee[0] + 1, knee[1] - 1]], 0.8, '#0e071b');
}

function scarab(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph * 2)) * 0.6;
  ctx.save();
  ctx.translate(0, bob);
  const tilt = at ? -0.32 : 0;
  // Patas de lá.
  for (let i = 0; i < 3; i += 1) beetleLeg(ctx, [22 + i * 9, 47], at ? -0.2 : Math.sin(ph + i * 2.1) * 0.6, true, at);
  ctx.save();
  ctx.translate(14, 52); ctx.rotate(tilt); ctx.translate(-14, -52);
  // Asas membranosas (só no ataque, élitros abertos).
  if (at) {
    const mw = P(ctx, 'M24,32 C16,20 8,16 4,20 C6,26 14,32 22,36 Z');
    fill(ctx, mw, hexA('#9cc8e6', 0.85));
    stroke(ctx, [[22, 34], [8, 20]], 0.8, '#424c6e');
    stroke(ctx, [[20, 34.6], [6, 25]], 0.7, '#657392');
  }
  // Cabeça e chifre dourado.
  for (const [dx, c] of [[0, '#0c2e44'], [-1.4, '#0e071b']]) {
    stroke(ctx, [[53 + dx, 41], [55 + dx, 36], [58 + dx, 34.6]], 0.9, c);
    fill(ctx, ell(ctx, 58.6 + dx, 34.4, 1.3, 1), dx ? '#8a4836' : '#ffc825');
  }
  const head = ell(ctx, 52.4, 45, 6.6, 5.8);
  shade(ctx, head, SCB, [45.8, 39.2, 13.2, 11.6], { lx: 0.4, ly: 0.2, ao: 0.4 });
  rimWarm(ctx, head, [45.8, 39.2, 13.2, 11.6], '#ffc825', 0.9 * o.px);
  // Mandíbulas.
  for (const [dy, c] of [[2.6, '#0e071b'], [1, '#1e6f50']]) stroke(ctx, [[56, 45 + dy], [60, 46 + dy], [61, 44.6 + dy]], 1.6, c);
  const hornP = horn(ctx, [54.6, 42.4], at ? [62, 36] : [62.4, 40], at ? [60, 24] : [59.6, 27], 5.4);
  shade(ctx, hornP, GOLD, [54, 26, 9, 18], { lx: 0.3, ly: 0.3, ao: 0.2 });
  rimWarm(ctx, hornP, [54, 26, 9, 18], '#ffeb57', 0.9 * o.px);
  angryEye(ctx, 53.4, 43.2, 1.5, '#ea323c', { glowC: '#ff5000', brow: null });
  // Tórax (pronoto) com borda dourada.
  const thor = P(ctx, 'M38,38 C40,32 47,31 50.4,35 C52.6,38 53,44 51,48 C48,51 41,51 38.6,48 C37,45 37,41 38,38 Z');
  shade(ctx, thor, SCB, [37, 31, 16, 20], { lx: 0.35, ly: 0.15, ao: 0.45 });
  stroke(ctx, [[39.6, 35.6], [44, 32.6], [49, 34]], 1.2, '#ffc825');
  glint(ctx, 41.6, 37, 2.4, '#ffffff', { lw: 0.9, angle: -0.7 });
  // Élitros: grande domo metálico.
  const lift = at ? -2.4 : 0;
  const shell = P(ctx, `M10,47 C8,36 15,${27 + lift} 26,${26 + lift} C35,${25.4 + lift} 41,30 42,38 C42.6,44 41,49 36,50.6 L14,50.6 C11.4,50.4 10.2,49 10,47 Z`);
  shade(ctx, shell, SCB, [8, 25, 35, 26], { lx: 0.38, ly: 0.12, ao: 0.5 });
  inside(ctx, shell, () => {
    // Sulcos longitudinais e iridescência azul.
    for (const k of [0, 1, 2]) stroke(ctx, [[12 + k * 2, 46 - k * 5], [22, 33 - k * 3 + lift], [38, 36 - k * 4 + lift]], 0.8, '#0c2e44');
    stroke(ctx, [[15, 36 + lift], [24, 30 + lift], [34, 30.4 + lift]], 1.6, '#00cdf9');
    stroke(ctx, [[18, 33.6 + lift], [24, 31 + lift]], 1, '#ffffff');
    // Faixas de ouro (élitros de joia).
    stroke(ctx, [[26, 27 + lift], [26, 50]], 1.4, '#edab50');
    stroke(ctx, [[25.6, 27 + lift], [25.6, 50]], 0.6, '#ffeb57');
    stroke(ctx, [[30, 44], [37, 41], [40, 36]], 1.3, hexA('#00cdf9', 0.65));
    stroke(ctx, [[12, 44], [20, 45.6]], 1.1, hexA('#0098dc', 0.6));
    // Hieróglifos dourados gravados.
    fill(ctx, ell(ctx, 26, 40, 2.2, 1.6), '#ffc825');
    fill(ctx, ell(ctx, 26, 40, 1, 0.7), '#0c2e44');
    stroke(ctx, [[21, 39], [23.6, 39.6]], 0.8, '#edab50');
    stroke(ctx, [[28.6, 39.6], [31.6, 39]], 0.8, '#edab50');
  });
  rimWarm(ctx, shell, [8, 25, 35, 26], '#ffc825', 1.2 * o.px, { alpha: 0.9 });
  // Borda dourada na base do casco.
  stroke(ctx, [[11, 48.6], [24, 50.4], [38, 49.4]], 1.8, '#8a4836');
  stroke(ctx, [[11, 48], [24, 49.6], [38, 48.6]], 1, '#ffc825');
  glint(ctx, 22, 30.4 + lift, 3, '#ffffff', { lw: 1, angle: -0.25 });
  // Disco solar flutuando sobre o casco (marca do escaravelho sagrado).
  {
    const sy = 15 + lift + (at ? -2 : Math.sin(ph) * 0.8);
    glow(ctx, 26, sy, 9, '#ffa214', { core: '#ffeb57', alpha: 0.75 });
    shade(ctx, ell(ctx, 26, sy, 5.4, 5.4), ['#8a4836', '#edab50', '#ffc825', '#ffeb57'], [20.6, sy - 5.4, 10.8, 10.8], { lx: 0.3, ly: 0.3, ao: 0.2 });
    stroke(ctx, [[22.6, sy + 5], [26, sy + 6.6], [29.4, sy + 5]], 1, '#8a4836');
  }
  ctx.restore();
  // Patas de cá.
  for (let i = 0; i < 3; i += 1) beetleLeg(ctx, [19 + i * 10, 49], at ? 0.2 : Math.sin(ph + i * 2.1 + Math.PI) * 0.6, false, at);
  ctx.restore();
}

// ---------------------------------------------------------------- Golem de areia
const SST = ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#f6ca9f'];
const SST_FAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#ad7954'];
const LAPIS = ['#03193f', '#00396d', '#0069aa', '#0098dc'];

function stoneCrack(ctx, pts) {
  stroke(ctx, pts, 1, '#391f21');
  stroke(ctx, pts.map(([x, y]) => [x - 0.5, y - 0.5]), 0.6, '#f6ca9f');
}

function sandArm(ctx, o, sh, el, fist, ramp) {
  const up = limb(ctx, sh, el, 9, 8);
  shade(ctx, up, ramp, [Math.min(sh[0], el[0]) - 5, Math.min(sh[1], el[1]) - 5, Math.abs(el[0] - sh[0]) + 10, Math.abs(el[1] - sh[1]) + 10], { ao: 0.2 });
  const fo = limb(ctx, el, fist, 10, 11);
  vol(ctx, o, fo, ramp, [Math.min(fist[0], el[0]) - 6, Math.min(fist[1], el[1]) - 6, Math.abs(el[0] - fist[0]) + 12, Math.abs(el[1] - fist[1]) + 12], { ao: 0.25, rk: 0.9 });
  const fp = rrect(ctx, fist[0] - 6, fist[1] - 5.4, 12, 11, 4);
  vol(ctx, o, fp, ramp, [fist[0] - 6, fist[1] - 5.4, 12, 11], { ao: 0.35, rk: 0.9 });
  for (const dy of [-2, 1, 4]) stroke(ctx, [[fist[0] + 1, fist[1] + dy - 1], [fist[0] + 5.4, fist[1] + dy - 0.6]], 0.8, ramp[0]);
  // Bracelete de ouro com lápis.
  stroke(ctx, [[el[0] + (fist[0] - el[0]) * 0.55 - 4, el[1] + (fist[1] - el[1]) * 0.55], [el[0] + (fist[0] - el[0]) * 0.55 + 4, el[1] + (fist[1] - el[1]) * 0.55]], 2.6, '#ffc825');
}

function sandGolem(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.6 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Braço de lá.
  sandArm(ctx, o, [20, 26], [14 - sw, 36], [14 - sw * 1.6, 45], SST_FAR);
  // Pernas-pilares.
  for (const [x, s, ramp] of [[38, -1, SST_FAR], [24, 1, SST]]) {
    const dx = at ? s * 1 : sw * s * 2.4;
    const leg = rrect(ctx, x - 5 + dx * 0.4, 42, 10, 12, 3);
    shade(ctx, leg, ramp, [x - 5, 42, 10, 12], { ao: 0.3 });
    const foot = rrect(ctx, x - 6 + dx, 52.6 - bob, 13, 6, 2.4);
    vol(ctx, o, foot, ramp, [x - 6 + dx, 52.6, 13, 6], { ao: 0.4, rk: 0.8 });
    stoneCrack(ctx, [[x - 2 + dx * 0.4, 45], [x + 1 + dx * 0.4, 49]]);
  }
  // Torso de blocos de arenito.
  const torso = P(ctx, 'M15,24 C15,18 22,15 31,15 C40,15 47,18 47,24 L46,38 C45,44 39,46 31,46 C23,46 17,44 16,38 Z');
  vol(ctx, o, torso, SST, [14, 15, 34, 31], { lx: 0.32, ly: 0.15, ao: 0.4, rim: '#ffc825', rk: 1.2 });
  inside(ctx, torso, () => {
    // Juntas dos blocos.
    stroke(ctx, [[14, 30.6], [48, 30]], 1.1, '#5d2c28');
    stroke(ctx, [[14, 30], [48, 29.4]], 0.6, '#f6ca9f');
    for (const x of [24, 38]) stroke(ctx, [[x, 30.6], [x + 0.4, 38]], 1, '#5d2c28');
    stoneCrack(ctx, [[19, 34], [22, 37], [21, 41]]);
    stoneCrack(ctx, [[42, 19], [40, 23]]);
    // Faixa de hieróglifos.
    shade(ctx, P(ctx, 'M15,37.6 L47,37 L46.6,42 L15.4,42.4 Z'), ['#391f21', '#5d2c28', '#8a4836'], [15, 37, 32, 5], { ao: 0 });
    for (let i = 0; i < 6; i += 1) {
      const x = 18 + i * 4.8;
      if (i % 3 === 0) fill(ctx, ell(ctx, x, 39.8, 1.2, 1.2), '#ffc825');
      else if (i % 3 === 1) stroke(ctx, [[x - 1, 41], [x, 38.4], [x + 1, 41]], 0.8, '#ffc825');
      else stroke(ctx, [[x - 1.2, 38.6], [x + 1.2, 38.6], [x, 41]], 0.8, '#ffc825');
    }
  });
  // Colar usekh de ouro e lápis.
  const collar = P(ctx, 'M20,19 C24,25 38,25 42,19 L44,21.6 C39,29.6 23,29.6 18,21.6 Z');
  shade(ctx, collar, GOLD, [18, 19, 26, 10], { ao: 0.1 });
  inside(ctx, collar, () => {
    stroke(ctx, [[19.6, 22.6], [31, 27.6], [42.4, 22.6]], 1.3, '#0069aa');
    for (let i = 0; i < 7; i += 1) fill(ctx, ell(ctx, 22.4 + i * 2.8, 24.4 + Math.sin(i / 6 * Math.PI) * 3, 0.8, 0.8), '#0098dc');
  });
  // Escaravelho de lápis no peito, brilhando.
  glow(ctx, 31, 33.6, 5, '#00cdf9', { alpha: 0.5 });
  shade(ctx, ell(ctx, 31, 33.6, 3, 2.6), LAPIS, [28, 31, 6, 5.4], { ao: 0 });
  fill(ctx, ell(ctx, 30, 32.6, 0.9, 0.7), '#94fdff');
  // Cabeça pequena afundada com nemes (toucado listrado).
  const hx = 31;
  const hy = 11;
  const nemes = P(ctx, `M${hx - 9},${hy + 8} C${hx - 9},${hy - 4} ${hx - 5},${hy - 7} ${hx},${hy - 7} C${hx + 5},${hy - 7} ${hx + 9},${hy - 4} ${hx + 9},${hy + 8} L${hx + 6},${hy + 9} L${hx + 5},${hy + 2} L${hx - 5},${hy + 2} L${hx - 6},${hy + 9} Z`);
  shade(ctx, nemes, LAPIS.concat(['#00cdf9']), [hx - 9, hy - 7, 18, 16], { ao: 0.2 });
  inside(ctx, nemes, () => { for (let i = 0; i < 6; i += 1) stroke(ctx, [[hx - 10, hy - 4 + i * 2.6], [hx + 10, hy - 4 + i * 2.6]], 0.9, '#ffc825'); });
  const face = rrect(ctx, hx - 5, hy - 3, 10, 11, 3);
  vol(ctx, o, face, SST, [hx - 5, hy - 3, 10, 11], { ao: 0.3, rk: 0.9, rim: '#ffc825' });
  stroke(ctx, [[hx - 4.4, hy + 0.2], [hx + 4.6, hy - 0.4]], 1.4, '#391f21');
  for (const x of [hx - 2.2, hx + 2.4]) {
    glow(ctx, x, hy + 1.6, 3.4, '#00cdf9', { core: '#94fdff', alpha: 0.9 });
    fill(ctx, ell(ctx, x, hy + 1.6, 1.3, 0.9), '#94fdff');
  }
  stroke(ctx, [[hx - 2, hy + 5.6], [hx + 2.6, hy + 5.2]], 0.9, '#391f21');
  // Barba postiça de faraó.
  shade(ctx, rrect(ctx, hx - 1.4, hy + 7.6, 3, 4.4, 1), LAPIS, [hx - 1.4, hy + 7.6, 3, 4.4], { ao: 0 });
  // Braço de cá: soco ou golpe por cima.
  if (at) {
    sandArm(ctx, o, [43, 23], [50, 29], [57, 26], SST);
    for (const [x, y, r] of [[63, 22, 1.2], [63.4, 29, 1], [61, 33, 0.8], [62, 18, 0.7]]) fill(ctx, ell(ctx, x, y, r, r), '#f6ca9f');
    stroke(ctx, [[50, 18], [60, 17]], 1, hexA('#f6ca9f', 0.8));
    stroke(ctx, [[50, 35], [59, 36]], 1, hexA('#f6ca9f', 0.8));
  } else {
    sandArm(ctx, o, [43, 24], [48 + sw * 0.6, 33], [50 + sw * 1.4, 42], SST);
  }
  // Areia escorrendo das juntas.
  for (let i = 0; i < 4; i += 1) {
    const x = [17, 45, 27, 37][i];
    const y = [46, 45, 47, 47][i] + ((f + i) % 3) * 1.6;
    fill(ctx, ell(ctx, x, y, 0.75, 0.75), i % 2 ? '#cba36f' : '#f6ca9f');
  }
  ctx.restore();
}

export const MONSTERS_3A = {
  snowOwl: { size: 44, elite: 52, shadow: [31, 59, 12, 2.2], paint: snowOwl },
  mammoth: { size: 68, elite: 76, shadow: [30, 59, 24, 3], paint: mammoth },
  cobra: { size: 48, elite: 56, shadow: [28, 59, 22, 2.4], paint: cobra },
  scarab: { size: 44, elite: 52, shadow: [32, 59, 23, 2.4], paint: (ctx, f, o) => { ctx.save(); ctx.translate(32, 58.6); ctx.scale(1.1, 1.1); ctx.translate(-33, -58.6); scarab(ctx, f, { ...o, px: o.px / 1.1 }); ctx.restore(); } },
  sandGolem: { size: 68, elite: 76, shadow: [31, 59, 18, 3], paint: sandGolem }
};
