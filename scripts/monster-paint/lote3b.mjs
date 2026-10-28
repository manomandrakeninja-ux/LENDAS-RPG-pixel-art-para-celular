// Lote 3 (3b): cão de lava, slime de magma, elemental de fogo, cavaleiro de obsidiana e fênix.
import { P, ell, fill, furTex, glint, glow, hexA, horn, inside, limb, phaseOf, rand, rimWarm, shade, stroke } from './kit.mjs';
import { leg } from './lote1.mjs';
import { INK, angryEye, ember, lavaCrack, poly, rrect, spline, tube, vol } from './lote3a.mjs';

const BASALT = ['#0e071b', '#1c121c', '#2d2e25', '#3d3d3d', '#5d5d5d', '#858585'];
const BASALT_FAR = ['#0e071b', '#0e071b', '#1c121c', '#2d2e25', '#3d3d3d'];
const FIRE = ['#8e251d', '#c64524', '#ff5000', '#ffa214', '#ffc825', '#ffeb57'];
const FIRE_HOT = ['#ff5000', '#ffa214', '#ffc825', '#ffeb57', '#ffffff'];

/** Língua de fogo: gota alongada que sobe e se curva, em 3 camadas (vermelho, laranja, amarelo). */
function flame(ctx, x, y, h, w, bend = 0, layers = 3) {
  const cols = ['#c64524', '#ff5000', '#ffa214', '#ffeb57'].slice(4 - Math.max(layers, 2) - 0);
  const all = ['#c64524', '#ff5000', '#ffa214', '#ffeb57'];
  for (let i = 0; i < layers; i += 1) {
    const k = 1 - i * 0.28;
    const ww = w * k;
    const hh = h * k;
    const yy = y - i * 0.2;
    const p = P(ctx, `M${x - ww},${yy} C${x - ww},${yy - hh * 0.5} ${x + bend * 0.4},${yy - hh * 0.7} ${x + bend},${yy - hh} C${x + bend * 0.5 + ww * 0.6},${yy - hh * 0.6} ${x + ww * 1.1},${yy - hh * 0.4} ${x + ww},${yy} C${x + ww * 0.6},${yy + ww * 0.7} ${x - ww * 0.6},${yy + ww * 0.7} ${x - ww},${yy} Z`);
    fill(ctx, p, all[i + (4 - layers)] ?? cols[0]);
  }
}

// ---------------------------------------------------------------- Cão de lava
function lavaHound(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1.4 : Math.cos(ph * 2) * 0.8;
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  if (at) { ctx.translate(34, 40); ctx.rotate(-0.12); ctx.translate(-34, -40); }
  const sw = (off) => (at ? 0 : Math.sin(ph + off) * 0.5);
  const lf = (off) => (at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2)));
  // Cauda de fogo.
  const tw = at ? -1 : Math.sin(ph) * 1.5;
  tube(ctx, [[15, 32], [9, 30 + tw], [5, 25 + tw]], 4, 2, BASALT.slice(1, 5));
  flame(ctx, 5, 26 + tw, 9, 2.8, -2 + tw, 4);
  const lo = (ramp, hock) => ({ upper: 8, lower: 10, wTop: 7.4, wMid: 4.4, wPaw: 4, ramp, hock, paw: '#ff5000' });
  leg(ctx, [19, 39], at ? -0.8 : sw(Math.PI), { ...lo(BASALT_FAR, true), lift: lf(Math.PI) });
  leg(ctx, [42, 40], at ? 0.9 : sw(0), { ...lo(BASALT_FAR, false), lift: lf(0) });
  // Corpo de basalto com rachaduras de lava.
  const body = P(ctx, `M12,34 C12,27 18,25 26,25.6 C33,26 38,23 44,24 C50,25 52,32 50,38
    C48.6,43 43,43.4 37,42 C31,41 25,43 20,43 C14.6,43 12,39.4 12,34 Z`);
  vol(ctx, o, body, BASALT, [11, 23, 41, 21], { lx: 0.4, ly: 0.1, ao: 0.4, rim: '#ffa214', rk: 1.2, side: 't' });
  inside(ctx, body, () => {
    glow(ctx, 30, 44, 10, '#ff5000', { alpha: 0.55 });
    lavaCrack(ctx, [[16, 36], [21, 33], [25, 36], [30, 32]], 1.2);
    lavaCrack(ctx, [[34, 38], [38, 33], [43, 34], [46, 30]], 1.2);
    lavaCrack(ctx, [[22, 41], [27, 39.6]], 1);
    for (const [x, y] of [[20, 29], [32, 28], [40, 28.6]]) { fill(ctx, ell(ctx, x, y, 2.6, 1.2), '#5d5d5d'); fill(ctx, ell(ctx, x - 0.6, y - 0.4, 1.2, 0.5), '#858585'); }
  });
  // Juba de chamas ao longo do dorso e da nuca.
  for (const [x, h, w, k] of [[17, 6, 2.4, 0], [22, 7, 2.6, 1], [27, 8, 2.8, 2], [32, 8.6, 3, 3], [37, 9.4, 3, 4], [42, 10, 3.2, 5]]) {
    const fl = at ? 1.4 : Math.sin(ph * 2 + k) * 1.3;
    flame(ctx, x, 26.4 - (x > 30 ? 1 : 0), h + fl * 0.6, w, -2.4 + fl, 4);
  }
  leg(ctx, [18, 40], at ? 0.6 : sw(0), { ...lo(BASALT, true), lift: lf(0) });
  leg(ctx, [45, 40], at ? 1.2 : sw(Math.PI), { ...lo(BASALT, false), lift: lf(Math.PI) });
  // Cabeça de cão de caça: focinho longo, mandíbula com brasa.
  ctx.save();
  ctx.translate(47, 29); ctx.scale(1.25, 1.25); ctx.translate(-47, -29);
  const jo = at ? 4 : 0;
  const jaw = P(ctx, `M48,32 C52,32.6 57,${33 + jo * 0.6} 60.6,${34 + jo} C60,${36.6 + jo} 55,${37 + jo} 50,35 Z`);
  shade(ctx, jaw, BASALT, [48, 32, 13, 6 + jo], { ao: 0.2 });
  if (at) {
    fill(ctx, poly(ctx, [[49.4, 32], [60.6, 33], [60, 34.2 + jo], [50, 33.6]]), '#ff5000');
    fill(ctx, poly(ctx, [[51, 32.6], [58, 33.2], [57.4, 33.6 + jo * 0.6], [51.6, 33.4]]), '#ffeb57');
    for (const x of [53, 56.4]) fill(ctx, P(ctx, `M${x - 0.8},${34 + jo * 0.7} l1.6,0 l-0.8,-2.4 Z`), '#f9e6cf');
  }
  const head = P(ctx, 'M42.6,25 C43.4,19.6 49,18 53.4,19.6 C56,20.8 57.6,23.4 60.4,25.6 C62,27.2 61.6,31 59.4,32 C55.6,33.2 51,33.2 47.6,32.4 C44,31.4 42.2,28.4 42.6,25 Z');
  vol(ctx, o, head, BASALT, [42, 18, 20, 16], { lx: 0.3, ly: 0.2, ao: 0.3, rim: '#ffa214', rk: 1 });
  inside(ctx, head, () => lavaCrack(ctx, [[45, 30], [48, 27], [51, 28.6]], 0.9));
  // Orelhas/chifres pontudos curvos.
  for (const [x, far] of [[46, true], [50.6, false]]) {
    const e = horn(ctx, [x, 21], [x - 2, 16], [x - 5, 13.4], 4);
    shade(ctx, e, far ? BASALT_FAR : BASALT, [x - 5, 13, 6, 9], { ao: 0 });
  }
  fill(ctx, ell(ctx, 60.6, 27.8, 1.6, 1.3), INK);
  fill(ctx, ell(ctx, 60, 27.3, 0.5, 0.4), '#ffa214');
  if (!at) {
    stroke(ctx, [[53, 30.6], [57, 31.2], [60, 30.4]], 0.9, '#ff5000');
    for (const x of [55.6, 58.2]) fill(ctx, P(ctx, `M${x - 0.7},30.8 l1.4,0 l-0.7,2 Z`), '#f9e6cf');
    // Baba de lava pingando.
    const d = (f % 2) * 1.6;
    stroke(ctx, [[56.4, 32.4], [56.6, 34.6 + d]], 1, '#ffa214');
    fill(ctx, ell(ctx, 56.6, 35 + d, 0.8, 0.9), '#ffeb57');
  }
  angryEye(ctx, 53.6, 24.4, 1.9, '#ffeb57', { glowC: '#ff5000', brow: '#0e071b', browW: 1.4 });
  ctx.restore();
  if (at) for (const [x, y, r] of [[63, 28, 1.2], [62, 36, 1], [63.4, 33, 0.8]]) ember(ctx, x, y, r);
  ctx.restore();
}

// ---------------------------------------------------------------- Slime de magma
function magmaSlime(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const sq = at ? -0.22 : Math.sin(ph) * 0.12;
  const h = 31 * (1 - sq);
  const w = 19 * (1 + sq * 0.8);
  const cx = 32;
  const base = 58;
  ctx.save();
  // Poça de lava no chão.
  fill(ctx, ell(ctx, cx, base - 0.4, w + 3, 2.6), '#8e251d');
  fill(ctx, ell(ctx, cx - 2, base - 0.8, w - 2, 1.4), '#ff5000');
  // Corpo derretido.
  const top = base - h;
  const lean = at ? 3 : Math.sin(ph) * 0.8;
  const body = P(ctx, `M${cx - w},${base - 1} C${cx - w - 1},${base - h * 0.55} ${cx - w * 0.55 + lean},${top} ${cx + lean},${top}
    C${cx + w * 0.6 + lean},${top} ${cx + w + 1},${base - h * 0.55} ${cx + w},${base - 1}
    C${cx + w * 0.6},${base + 0.6} ${cx + w * 0.3},${base - 2} ${cx},${base - 1} C${cx - w * 0.3},${base - 2} ${cx - w * 0.6},${base + 0.6} ${cx - w},${base - 1} Z`);
  shade(ctx, body, FIRE, [cx - w, top, w * 2, h], { lx: 0.4, ly: 0.3, ao: 0.5 });
  inside(ctx, body, () => {
    glow(ctx, cx + 2, base - h * 0.4, w * 0.8, '#ffeb57', { alpha: 0.55 });
    // Crosta de rocha escura em placas no alto.
    const plates = [[cx - w * 0.5, top + h * 0.22, 7, 4.4, -0.3], [cx + 2 + lean, top + 1.6, 7, 3.4, 0.05], [cx + w * 0.62, top + h * 0.32, 5.4, 4, 0.5], [cx - w * 0.78, top + h * 0.6, 4.4, 3.6, -0.8]];
    for (const [x, y, rx, ry, r] of plates) {
      const pl = ell(ctx, x, y, rx, ry, r);
      shade(ctx, pl, BASALT.slice(1), [x - rx, y - ry, rx * 2, ry * 2], { ao: 0.2 });
      stroke(ctx, [[x - rx * 0.6, y - ry * 0.5], [x + rx * 0.2, y - ry * 0.7]], 0.9, '#858585');
    }
    // Bolhas.
    for (let i = 0; i < 5; i += 1) {
      const bx = cx - w * 0.7 + rand(i * 4.3) * w * 1.4;
      const by = base - 4 - rand(i * 2.9) * h * 0.5 - ((f + i) % 4) * 1.2;
      const r = 1 + rand(i * 7.7) * 1.2;
      stroke(ctx, [[bx - r, by], [bx, by - r], [bx + r, by]], 0.7, '#ffeb57');
      fill(ctx, ell(ctx, bx, by, r * 0.6, r * 0.6), '#ffa214');
    }
    // Escorridos na base.
    for (const x of [cx - w * 0.7, cx - 6, cx + w * 0.6]) stroke(ctx, [[x, base - h * 0.22], [x + 0.6, base - 2]], 1.4, '#c64524');
  });
  rimWarm(ctx, body, [cx - w, top, w * 2, h], '#ffeb57', 1.2 * o.px, { alpha: 0.9 });
  // Rosto zangado de rocha: olhos de brasa branca, boca derretida.
  const ey = top + h * 0.42;
  for (const [x, r, s2] of [[cx - 2 + lean, 3.8, -1], [cx + 8.4 + lean, 3.8, 1]]) {
    fill(ctx, ell(ctx, x, ey + 0.6, r * 0.95, r * 1.05), '#391f21');
    fill(ctx, ell(ctx, x + 0.9, ey + 1.6, r * 0.42, r * 0.42), '#ffeb57');
    fill(ctx, ell(ctx, x + 0.7, ey + 1.4, r * 0.2, r * 0.2), '#ffffff');
    stroke(ctx, [[x - r * 1.3, ey - r * (s2 < 0 ? 1.3 : 0.4)], [x + r * 1.3, ey - r * (s2 < 0 ? 0.4 : 1.3)]], 2, '#1c121c');
  }
  const mo = at ? 5 : 2.2 + Math.abs(Math.sin(ph)) * 0.8;
  fill(ctx, P(ctx, `M${cx - 1.6 + lean},${ey + 6.8} C${cx + 2 + lean},${ey + 6.2 + mo * 0.3} ${cx + 6 + lean},${ey + 6.2 + mo * 0.3} ${cx + 9 + lean},${ey + 6.4} C${cx + 7 + lean},${ey + 6.8 + mo} ${cx + 1 + lean},${ey + 6.8 + mo} ${cx - 1 + lean},${ey + 6.8} Z`), '#391f21');
  fill(ctx, ell(ctx, cx + 4 + lean, ey + 7.2 + mo * 0.6, 2.4, mo * 0.3), '#ffeb57');
  for (const x of [cx + 0.6 + lean, cx + 4 + lean, cx + 7.4 + lean]) fill(ctx, poly(ctx, [[x - 1, ey + 6.8], [x + 1, ey + 6.8], [x, ey + 9.2]]), '#f9e6cf');
  if (at) for (const [x, y, r] of [[cx + 14, top - 2, 1.6], [cx + 10, top - 6, 1.2], [cx + 18, top + 2, 1], [cx + 4, top - 5, 0.9]]) ember(ctx, x, y, r);
  else for (const [x, y] of [[cx - 10, top - 1 - (f % 2) * 2], [cx + 12, top - (f % 3)]]) ember(ctx, x, y, 0.8);
  ctx.restore();
}

// ---------------------------------------------------------------- Elemental de fogo
function fireElemental(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : Math.sin(ph) * 1.2;
  const fl = (k) => Math.sin(ph * 2 + k) * 1.4;
  ctx.save();
  ctx.translate(0, bob);
  // Vórtice de chamas embaixo (não toca o chão).
  for (let i = 0; i < 4; i += 1) {
    const y = 48 + i * 2.4;
    const w = 8 - i * 1.6;
    fill(ctx, ell(ctx, 30 + Math.sin(ph + i) * 1.2, y, w, 2), ['#c64524', '#ff5000', '#ffa214', '#ffc825'][i % 4]);
  }
  flame(ctx, 30 + Math.sin(ph) * 2, 57, 10, 2.4, -2, 3);
  // Braço de lá (labaredas).
  const handB = at ? [14, 30] : [16 - fl(1) * 0.4, 38];
  tube(ctx, [[22, 25], [17, 30], handB], 6, 4.4, ['#8e251d', '#c64524', '#ff5000', '#ffa214']);
  flame(ctx, handB[0], handB[1] + 1, 7, 2.6, -1.4 + fl(2) * 0.6, 3);
  // Tronco de fogo com núcleo de magma.
  const torso = P(ctx, `M18,24 C19,18 26,15 31,15 C37,15 43,18 44,24 C44.6,31 41,38 37,43 C35,47 33,50 31,52 C28,49 25,45 23,42 C19,37 17.4,30 18,24 Z`);
  for (const [x, y, h, b, k] of [[19, 30, 10, -3, 0], [43, 30, 9, 2, 1], [21, 40, 9, -3, 2], [40, 40, 8, 2, 3], [17, 22, 8, -3, 4], [45, 22, 8, 3, 5]]) flame(ctx, x, y, h + fl(k), 2.6, b + fl(k) * 0.5, 4);
  shade(ctx, torso, ['#571c27', '#8e251d', '#c64524', '#ff5000', '#ffa214'], [17, 15, 28, 37], { lx: 0.45, ly: 0.3, ao: 0.4 });
  inside(ctx, torso, () => {
    for (const [x, y, h, b] of [[22, 44, 14, -2], [30, 50, 18, 1], [38, 42, 13, 2], [26, 36, 10, -1], [35, 34, 9, 1]]) flame(ctx, x, y, h, 3, b + fl(x) * 0.3, 3);
    glow(ctx, 31, 29, 6, '#ffc825', { core: '#ffffff', alpha: 0.6 });
    // Núcleo: pedra de magma com brilho branco.
    const core = ell(ctx, 31, 29, 4, 4.4);
    shade(ctx, core, ['#ffa214', '#ffc825', '#ffeb57', '#ffffff'], [27, 24.6, 8, 8.8], { ao: 0 });
    stroke(ctx, [[22, 21], [27, 18.6]], 1.2, '#ffeb57');
  });
  rimWarm(ctx, torso, [17, 15, 28, 37], '#ffeb57', 1.2 * o.px, { alpha: 0.9 });
  // Placas de rocha (ombros) para dar forma.
  for (const [x, y, r] of [[20, 20, 4.2], [42.6, 20, 4.6]]) {
    const pl = ell(ctx, x, y, r, r * 0.75, x > 30 ? 0.3 : -0.3);
    vol(ctx, o, pl, BASALT.slice(1), [x - r, y - r, r * 2, r * 1.5], { ao: 0.3, rim: '#ffa214', rk: 0.9 });
    lavaCrack(ctx, [[x - r * 0.5, y + 0.4], [x + r * 0.4, y - 0.6]], 0.7);
  }
  // Cabeça: chama com rosto.
  const hx = 32;
  const hy = 10;
  for (const [dx, h, b, k] of [[-6, 14, -5, 0], [0, 20, -2, 1], [5, 15, 2, 2], [-3, 18, -4, 3], [3, 13, -1, 4]]) flame(ctx, hx + dx, hy + 3, h + fl(k), 3.8, b + fl(k) * 0.9, 4);
  const head = ell(ctx, hx, hy + 2, 7, 6.4);
  shade(ctx, head, FIRE.slice(1), [hx - 7, hy - 4.4, 14, 12.8], { lx: 0.4, ly: 0.3, ao: 0.2 });
  for (const [dx, h, b, k] of [[-3.4, 8, -3, 0], [0.4, 10, -2, 1], [3.6, 8, 0, 2]]) { flame(ctx, hx + dx, hy - 2.4, h + fl(k) * 0.6, 2.2, b, 2); }
  // Máscara escura de fumaça ao redor dos olhos para o rosto ler.
  fill(ctx, P(ctx, `M${hx - 5},${hy} C${hx - 2},${hy - 1.6} ${hx + 3},${hy - 1.6} ${hx + 6.4},${hy - 0.4} C${hx + 6},${hy + 3.6} ${hx - 4},${hy + 4} ${hx - 5},${hy} Z`), '#8e251d');
  for (const x of [hx - 1.6, hx + 3.6]) {
    glow(ctx, x, hy + 1.2, 3, '#ffffff', { alpha: 0.8 });
    fill(ctx, P(ctx, `M${x - 1.8},${hy + 0.4} L${x + 1.8},${hy + 1.4} L${x + 1},${hy + 2.6} L${x - 1.4},${hy + 2} Z`), '#ffffff');
  }
  stroke(ctx, [[hx - 4.6, hy - 1.6], [hx - 0.4, hy - 0.2]], 1.2, '#391f21');
  stroke(ctx, [[hx + 6, hy - 1.4], [hx + 2.4, hy - 0.2]], 1.2, '#391f21');
  const mo = at ? 3 : 1.4;
  fill(ctx, ell(ctx, hx + 1.4, hy + 5.4, 2.6, mo * 0.7), '#391f21');
  fill(ctx, ell(ctx, hx + 1.4, hy + 5.6 + mo * 0.2, 1.4, mo * 0.3), '#ffeb57');
  // Braço de cá: lança uma bola de fogo.
  const hand = at ? [56, 22] : [46 + fl(3) * 0.3, 37];
  tube(ctx, [[41, 24], at ? [49, 21] : [46, 30], hand], 6.4, 5, FIRE.slice(0, 5));
  if (at) {
    glow(ctx, 59, 21, 8, '#ffa214', { alpha: 0.85 });
    fill(ctx, ell(ctx, 59, 21, 4, 4), '#ffc825');
    fill(ctx, ell(ctx, 59.6, 20.4, 2.4, 2.4), '#ffffff');
    for (const [x, y] of [[54, 14], [62, 13], [63, 28]]) ember(ctx, x, y, 0.9);
  } else {
    flame(ctx, hand[0], hand[1] + 1, 8, 2.8, 1 + fl(4) * 0.6, 4);
  }
  for (const [x, y] of [[14, 14 - (f % 2) * 2], [50, 8 + (f % 3)], [24, 4 + (f % 2)]]) ember(ctx, x, y, 0.8);
  ctx.restore();
}

// ---------------------------------------------------------------- Cavaleiro de obsidiana
// Fase 22c: obsidiana um degrau mais clara (lia como mancha escura, sumia à noite na Brasa) + fendas de lava.
const OBS = ['#0e071b', '#2a2f4e', '#3b1443', '#622461', '#93388f', '#ca52c9'];
const OBS_FAR = ['#0e071b', '#1a1932', '#2a2f4e', '#3b1443', '#622461'];
const CAPE = ['#3b1443', '#571c27', '#891e2b', '#c42430'];

/** Faceta vítrea: faixa de brilho reto (vidro vulcânico). */
function sheen(ctx, a, b, w = 1) {
  stroke(ctx, [a, b], w, '#9cc8e6', { cap: 'butt' });
  stroke(ctx, [a, [a[0] + (b[0] - a[0]) * 0.4, a[1] + (b[1] - a[1]) * 0.4]], w * 0.7, '#ffffff', { cap: 'butt' });
}

function obsidianKnight(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.4 : -Math.abs(Math.sin(ph)) * 1;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Capa rasgada vinho ao vento.
  const cw = Math.sin(ph + 1) * 1.6;
  const cape = P(ctx, `M22,18 C17,26 13,36 ${10 + cw},50 L${13 + cw},48 L${15 + cw},52 L${18 + cw * 0.6},48.6 L${21},52 L23,47 L26,20 Z`);
  shade(ctx, cape, CAPE, [10, 18, 16, 34], { lx: 0.2, ly: 0.2, ao: 0.4 });
  inside(ctx, cape, () => { stroke(ctx, [[20, 22], [15, 40]], 1, '#3b1443'); stroke(ctx, [[23, 24], [20, 44]], 0.9, '#3b1443'); });
  // Pernas em grevas facetadas.
  for (const [x, s, ramp] of [[37, -1, OBS_FAR], [27, 1, OBS]]) {
    const a = at ? s * 0.25 : sw * s * 0.32;
    const knee = [x + Math.sin(a) * 4, 47];
    const foot = [knee[0] + Math.sin(a) * 3, 57.6 - bob];
    shade(ctx, limb(ctx, [x, 38], knee, 7.4, 6.4), ramp, [x - 4, 38, 8, 10], { ao: 0.2 });
    shade(ctx, limb(ctx, knee, foot, 6.4, 6), ramp, [foot[0] - 4, knee[1], 8, 11], { ao: 0.3 });
    const boot = poly(ctx, [[foot[0] - 3.6, foot[1] - 3], [foot[0] + 3, foot[1] - 3.4], [foot[0] + 6.4, foot[1] + 0.6], [foot[0] - 3.6, foot[1] + 0.6]]);
    shade(ctx, boot, ramp, [foot[0] - 4, foot[1] - 4, 11, 5], { ao: 0.2 });
    fill(ctx, poly(ctx, [[knee[0] - 3, knee[1] - 2], [knee[0] + 3.6, knee[1] - 3], [knee[0] + 2, knee[1] + 2], [knee[0] - 2.4, knee[1] + 1.6]]), ramp === OBS ? '#622461' : '#2a2f4e');
    if (ramp === OBS) sheen(ctx, [knee[0] - 1.6, knee[1] - 1.4], [knee[0] + 1.6, knee[1] - 2], 0.9);
    lavaCrack(ctx, [[knee[0] - 1, knee[1] + 3], [foot[0], foot[1] - 4]], 0.8);
  }
  // Braço de lá com escudo de vidro vulcânico.
  const sh = poly(ctx, [[10, 24], [19, 22], [21, 33], [15, 42], [9, 34]]);
  vol(ctx, o, sh, OBS, [9, 22, 12, 20], { lx: 0.2, ly: 0.2, ao: 0.3, rim: '#ca52c9', rk: 1 });
  inside(ctx, sh, () => { sheen(ctx, [11.6, 26], [13, 34], 1); lavaCrack(ctx, [[15, 26], [16, 31], [14.6, 36]], 0.9, { hot: '#ea323c', core: '#f68187' }); });
  // Torso: peitoral em facetas.
  const torso = poly(ctx, [[19, 18], [43, 18], [45, 27], [41, 39], [23, 39], [18.6, 27]]);
  vol(ctx, o, torso, OBS, [18, 18, 27, 21], { lx: 0.3, ly: 0.2, ao: 0.4, rim: '#ca52c9', rk: 1.2 });
  inside(ctx, torso, () => {
    fill(ctx, poly(ctx, [[31, 18], [43, 18], [45, 27], [33, 30]]), hexA('#0e071b', 0.35));
    stroke(ctx, [[31, 19], [33, 30], [32, 39]], 1, '#0e071b');
    stroke(ctx, [[19, 27.4], [33, 30], [45, 27]], 1, '#0e071b');
    sheen(ctx, [22, 20.6], [28, 27], 1.3);
    sheen(ctx, [36, 31.4], [40, 36], 0.9);
    // Fendas de lava entre as facetas (brilham no escuro).
    lavaCrack(ctx, [[21, 23], [25, 26], [24, 31], [27, 36]], 1);
    lavaCrack(ctx, [[42, 21], [39, 25], [41, 30]], 0.9);
    // Runa vermelha incandescente.
    glow(ctx, 32, 33.6, 5, '#ff5000', { alpha: 0.85 });
    stroke(ctx, [[30.4, 31.6], [32, 35.6], [33.6, 31.6]], 1, '#f68187');
  });
  // Cinto e saiote de placas.
  shade(ctx, poly(ctx, [[22, 38], [42, 38], [43, 42], [21, 42]]), ['#1c121c', '#391f21', '#5d2c28'], [21, 38, 22, 4], { ao: 0 });
  fill(ctx, rrect(ctx, 30, 38.4, 4, 3.4, 0.8), '#c42430');
  for (const x of [22, 28, 34, 40]) shade(ctx, poly(ctx, [[x, 42], [x + 5.6, 42], [x + 5, 47], [x + 0.6, 46.4]]), OBS.slice(0, 5), [x, 42, 6, 5], { ao: 0.2 });
  // Ombreiras em lâminas.
  for (const [x, back] of [[19, true], [44, false]]) {
    const pad = P(ctx, `M${x - 6},${21} C${x - 6},${14} ${x + 5},${13} ${x + 6.4},${19} L${x + 4},${23.6} L${x - 4.6},${24} Z`);
    vol(ctx, o, pad, back ? OBS_FAR : OBS, [x - 6, 13, 13, 11], { ao: 0.3, rim: back ? null : '#ca52c9' });
    fill(ctx, horn(ctx, [x - 1, 15.6], [x - 2, 11], [x - 4.6, 8.4], 3), back ? '#1a1932' : '#2a2f4e');
    if (!back) sheen(ctx, [x - 3.6, 18], [x + 1.4, 15.4], 1);
  }
  // Elmo fechado com chifres e viseira em fenda vermelha.
  const hx = 32;
  const hy = 10.6;
  for (const s of [-1, 1]) {
    const hp = horn(ctx, [hx + s * 4.6, hy - 3], [hx + s * 9, hy - 6], [hx + s * 7.4, hy - 13], 3.2);
    shade(ctx, hp, s < 0 ? OBS_FAR : OBS, [hx + s * 4 - 4, hy - 13, 9, 11], { ao: 0 });
  }
  const helm = P(ctx, `M${hx - 6.4},${hy + 6} L${hx - 7},${hy - 2} C${hx - 6},${hy - 7.6} ${hx + 6},${hy - 7.6} ${hx + 7.4},${hy - 2} L${hx + 7.4},${hy + 4} L${hx + 4},${hy + 8} L${hx - 3},${hy + 8} Z`);
  vol(ctx, o, helm, OBS, [hx - 7, hy - 7.6, 14.4, 15.6], { lx: 0.3, ly: 0.2, ao: 0.35, rim: '#ca52c9', rk: 1.1 });
  sheen(ctx, [hx - 4.6, hy - 4], [hx - 1, hy - 5.6], 1);
  fill(ctx, poly(ctx, [[hx - 4.6, hy], [hx + 7.4, hy - 0.4], [hx + 7, hy + 2], [hx - 4, hy + 2.2]]), INK);
  glow(ctx, hx + 2.6, hy + 1, 3, '#ea323c', { alpha: 0.6 });
  for (const x of [hx - 1.4, hx + 4.6]) fill(ctx, P(ctx, `M${x - 1.8},${hy + 0.6} L${x + 1.8},${hy + 1.2} L${x - 1.4},${hy + 1.8} Z`), '#f68187');
  for (const y of [hy + 4, hy + 5.6]) stroke(ctx, [[hx + 1, y], [hx + 6.4, y - 0.4]], 0.7, '#0e071b');
  // Espadão de obsidiana (lâmina facetada com fio vermelho).
  const hand = at ? [46, 8] : [45, 34];
  const ang = at ? -0.5 : 0.25 + sw * 0.05;
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(ang);
  const blade = P(ctx, 'M-2.2,-2 L-2.6,-30 L0,-35 L2.6,-30 L2.2,-2 Z');
  shade(ctx, blade, OBS, [-2.6, -35, 5.2, 33], { lx: 0.2, ly: 0.4, ao: 0 });
  fill(ctx, P(ctx, 'M0,-34 L2.6,-30 L2.2,-2 L0,-2 Z'), hexA('#0e071b', 0.45));
  stroke(ctx, [[0, -3], [0, -33]], 0.7, '#ea323c', { cap: 'butt' });
  stroke(ctx, [[-1.8, -5], [-2, -28]], 0.8, '#9cc8e6', { cap: 'butt' });
  shade(ctx, P(ctx, 'M-6,-2.4 L6,-2.4 L5,0.4 L-5,0.4 Z'), ['#3b1443', '#891e2b', '#c42430', '#ea323c'], [-6, -2.4, 12, 3], { ao: 0 });
  stroke(ctx, [[0, 0.4], [0, 5.4]], 1.8, '#1c121c');
  fill(ctx, ell(ctx, 0, 6.2, 1.4, 1.4), '#ea323c');
  ctx.restore();
  if (at) {
    stroke(ctx, [[30, 0.6], [50, 2], [62, 14]], 1.6, hexA('#f68187', 0.7));
    stroke(ctx, [[36, 1.6], [52, 4], [60, 14]], 0.9, hexA('#ffffff', 0.6));
  }
  // Braço de cá.
  const elb = at ? [44, 16] : [44.6, 28];
  shade(ctx, limb(ctx, [43, 21], elb, 6.4, 5.6), OBS, [40, 14, 8, 16], { ao: 0.2 });
  shade(ctx, limb(ctx, elb, hand, 5.6, 5.4), OBS, [42, Math.min(elb[1], hand[1]) - 3, 8, 12], { ao: 0.2 });
  shade(ctx, ell(ctx, hand[0], hand[1], 3.2, 3), OBS, [hand[0] - 3, hand[1] - 3, 6, 6], { ao: 0 });
  ctx.restore();
}

// ---------------------------------------------------------------- Fênix
const PHX = ['#8e251d', '#c64524', '#ff5000', '#ffa214', '#ffc825', '#ffeb57'];
const PHX_FAR = ['#571c27', '#8e251d', '#c64524', '#ff5000', '#ffa214'];
const PHX_RED = ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c'];

function phxWing(ctx, o, root, ang, ramp, far) {
  ctx.save();
  ctx.translate(root[0], root[1]);
  ctx.rotate(ang);
  ctx.scale(1.35, 1.35);
  // Penas longas em leque (cada uma uma gota alongada).
  const feathers = [[-26, -6, 3.4], [-24, -1, 3.4], [-21, 3.4, 3.2], [-17, 6.6, 3], [-12.6, 8.4, 2.8], [-8, 9, 2.6]];
  for (const [i, [x, y, w]] of feathers.entries()) {
    const p = P(ctx, `M0,0 C${x * 0.4},${y * 0.4 - w} ${x * 0.85},${y - w * 0.6} ${x},${y} C${x * 0.85},${y + w * 0.6} ${x * 0.4},${y * 0.4 + w} 0,2 Z`);
    shade(ctx, p, far ? PHX_FAR : (i < 3 ? PHX_RED.concat(['#ff5000']) : PHX), [x, y - 6, -x, 12], { lx: 0.8, ly: 0.2, ao: 0.2 });
    stroke(ctx, [[x * 0.15, 1], [x * 0.9, y]], 0.6, far ? '#571c27' : '#8e251d');
  }
  // Cobertura (penas curtas) no ombro.
  const cov = P(ctx, 'M3,-3 C-5,-7 -14,-6 -17,-1 C-12,2 -6,4 2,5 Z');
  vol(ctx, o, cov, far ? PHX_FAR : PHX, [-17, -7, 20, 12], { lx: 0.5, ly: 0.1, ao: 0.2, rim: far ? null : '#ffeb57' });
  inside(ctx, cov, () => { for (const x of [-13, -9, -5, -1]) stroke(ctx, [[x, -2], [x - 1.4, 2], [x - 3, 3.6]], 0.7, far ? '#8e251d' : '#c64524'); });
  ctx.restore();
}

function phoenix(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -2 : Math.sin(ph) * 1.6 - 2;
  const flap = at ? 1.5 : 1.0 + Math.sin(ph) * 0.5;
  ctx.save();
  ctx.translate(0, bob);
  // Rastro de chamas embaixo (voa, não toca o chão).
  for (const [x, h, k] of [[22, 9, 0], [27, 11, 1], [32, 8, 2]]) flame(ctx, x, 54 + (k % 2), h + Math.sin(ph * 2 + k) * 1.4, 2.4, -3 - k, 3);
  // Asa de lá.
  phxWing(ctx, o, [33, 30], flap + 0.4, PHX_FAR, true);
  // Cauda longa com penas-olho.
  const tw = at ? -1 : Math.sin(ph + 1) * 2;
  for (const [dy, len, c] of [[0, 1, PHX_RED], [3, 0.85, PHX], [-3, 0.8, PHX]]) {
    const pts = [[22, 40], [14, 44 + dy * 0.5], [7, 47 + dy + tw], [2, 46 + dy + tw * 1.2]];
    tube(ctx, pts.map(([x, y], i) => [22 + (x - 22) * len, y]), 3.4, 1.4, c.slice(0, 4));
    const end = [22 + (2 - 22) * len, 46 + dy + tw * 1.2];
    fill(ctx, ell(ctx, end[0] + 1, end[1], 2.4, 1.8), '#ffc825');
    fill(ctx, ell(ctx, end[0] + 1, end[1], 1.2, 1), '#891e2b');
  }
  // Corpo.
  const body = P(ctx, 'M20,40 C19,32 25,26 32,26 C39,26 43,31 42,38 C41,44 36,48 30,48 C24,48 20.6,45 20,40 Z');
  vol(ctx, o, body, PHX, [19, 26, 24, 22], { lx: 0.5, ly: 0.2, ao: 0.4, rim: '#ffeb57', rk: 1.2 });
  furTex(ctx, body, [19, 26, 24, 22], ['#ff5000', '#ffeb57'], { len: 1.8, lw: 0.7, step: 2.8, dx: -0.4, dy: 1, seed: 8 });
  // Pés com garras.
  for (const x of [28, 33]) {
    stroke(ctx, [[x, 46], [x + 0.6, 51]], 1.4, '#8a4836');
    for (const dx of [-1.2, 0.4, 2]) stroke(ctx, [[x + 0.6, 51], [x + 0.6 + dx, 52.6]], 0.9, '#391f21');
  }
  // Pescoço e cabeça com crista de fogo.
  const hx = at ? 46 : 44;
  const hy = at ? 20 : 19;
  tube(ctx, [[36, 31], [40, 26], [hx - 1, hy + 3]], 8, 6.4, PHX.slice(1));
  for (const [dx, h, b, k] of [[-5, 9, -4, 0], [-2.4, 11, -3, 1], [0.6, 9, -2, 2]]) flame(ctx, hx + dx, hy - 2, h + Math.sin(ph * 2 + k) * 1.2, 2.2, b, 4);
  const head = ell(ctx, hx, hy, 5.2, 4.4);
  vol(ctx, o, head, PHX, [hx - 5.2, hy - 4.4, 10.4, 8.8], { lx: 0.4, ly: 0.2, ao: 0.25, rim: '#ffeb57' });
  // Bico dourado em gancho.
  const bo = at ? 2.4 : 0;
  shade(ctx, P(ctx, `M${hx + 3.4},${hy - 1.4} C${hx + 7},${hy - 1.8} ${hx + 9.4},${hy} ${hx + 9},${hy + 2.4} C${hx + 7},${hy + 1.4} ${hx + 5},${hy + 1.2} ${hx + 3.6},${hy + 1.4} Z`), ['#5d2c28', '#8a4836', '#edab50', '#ffeb57'], [hx + 3, hy - 2, 7, 5], { ao: 0 });
  if (at) {
    fill(ctx, P(ctx, `M${hx + 3.6},${hy + 1.4} L${hx + 8},${hy + 2 + bo} L${hx + 4},${hy + 3 + bo} Z`), '#8a4836');
    glow(ctx, hx + 11, hy + 2, 5, '#ffa214', { alpha: 0.85 });
    for (const [x, y] of [[hx + 12, hy], [hx + 14, hy + 4], [hx + 15, hy + 1]]) ember(ctx, x, y, 1);
  }
  // Máscara vinho ao redor do olho (contraste) e olho branco-dourado.
  fill(ctx, ell(ctx, hx + 1.6, hy - 0.6, 2.8, 2), '#571c27');
  angryEye(ctx, hx + 1.8, hy - 0.6, 1.5, '#ffeb57', { glowC: '#ffffff', brow: '#3b1443', browW: 1.1 });
  // Asa de cá.
  phxWing(ctx, o, [31, 31], flap, PHX, false);
  for (const [x, y] of [[12, 22 + (f % 2) * 2], [50, 36 - (f % 3)], [18, 12 + (f % 2)]]) ember(ctx, x, y, 0.8);
  ctx.restore();
}

export const MONSTERS_3B = {
  lavaHound: { size: 52, elite: 60, shadow: [32, 59, 20, 2.4], paint: lavaHound },
  magmaSlime: { size: 44, elite: 52, shadow: [32, 59, 22, 2.6], paint: magmaSlime },
  fireElemental: { size: 52, elite: 60, shadow: [31, 60, 11, 2], paint: fireElemental },
  obsidianKnight: { size: 56, elite: 64, shadow: [32, 59, 15, 2.6], paint: obsidianKnight },
  phoenix: { size: 52, elite: 60, shadow: [30, 60, 14, 2], paint: phoenix }
};
