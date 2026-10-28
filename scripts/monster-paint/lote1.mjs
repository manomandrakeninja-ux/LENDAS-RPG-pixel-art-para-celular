// Lote 1 da Fase 20G: monstros base (src/art/monsters.js) e os profundos mais vistos.
// Cada entrada: tamanho normal/elite (px), tamanhos extras (cenas da história), sombra
// [cx, cy, rx, ry] na grade de 64 e paint(ctx, quadro, opções). Quadros: 0..3 andar, 4 ataque.
// Todos olham para a direita (o jogo espelha para a esquerda).
import { C, P, ell, fill, fur, glow, hexA, horn, inside, limb, phaseOf, rand, shade, stroke } from './kit.mjs';

// ---------------------------------------------------------------- Gosma
function slime(ctx, f, o) {
  const at = o.attack;
  const sq = at ? -1.6 : [0, 1, 0, -1][f];
  const w = 21 + sq * 2.6;
  const h = 25 - sq * 3.2;
  const lean = at ? 5 : [0, 0.6, 0, -0.6][f];
  const cx = 32;
  const base = 57;
  const top = base - h;
  const body = P(ctx, `M${cx - w},${base}
    C${cx - w - 1},${base - h * 0.55} ${cx - w * 0.62 + lean},${top} ${cx + lean},${top}
    C${cx + w * 0.62 + lean},${top} ${cx + w + 1},${base - h * 0.55} ${cx + w},${base}
    C${cx + w * 0.7},${base + 2.2} ${cx + w * 0.3},${base + 0.6} ${cx},${base + 1.8}
    C${cx - w * 0.3},${base + 0.6} ${cx - w * 0.7},${base + 2.2} ${cx - w},${base} Z`);
  shade(ctx, body, C.slime, [cx - w, top, w * 2, h + 2], { lx: 0.3, ly: 0.2, ao: 0.35 });
  inside(ctx, body, () => {
    // Núcleo mais denso e escuro (translúcido), bolhas e reflexo do chão na base.
    fill(ctx, ell(ctx, cx + 4 + lean * 0.5, base - h * 0.35, w * 0.55, h * 0.3), hexA('#1e6f50', 0.55));
    for (const [bx, by, r] of [[cx - 9, base - 8, 2.2], [cx + 10, base - 12, 1.6], [cx - 2, base - 5, 1.3], [cx + 3, top + 9, 1.1]]) {
      fill(ctx, ell(ctx, bx + lean * 0.5, by, r, r), '#99e65f');
      fill(ctx, ell(ctx, bx + lean * 0.5 - r * 0.35, by - r * 0.35, r * 0.45, r * 0.45), '#d3fc7e');
    }
    stroke(ctx, [[cx - w + 4, base - 1.6], [cx, base + 0.2], [cx + w - 4, base - 1.6]], 1.6, '#5ac54f');
  });
  // Brilho grande e curvo no alto à esquerda.
  stroke(ctx, [[cx - w * 0.68 + lean, base - h * 0.42], [cx - w * 0.62 + lean, top + h * 0.2], [cx - w * 0.22 + lean, top + 2.6]], 2.6, '#ffffff');
  fill(ctx, ell(ctx, cx - w * 0.72 + lean, base - h * 0.28, 1.2, 1.4), '#d3fc7e');
  // Olhos grandes (olhando para a direita) e boca.
  const ey = top + h * 0.42;
  for (const ex of [cx + 1, cx + 11]) {
    const x = ex + lean;
    fill(ctx, ell(ctx, x, ey, 3.3, at ? 4.6 : 4.2), C.ink);
    fill(ctx, ell(ctx, x + 1, ey - 1.6, 1.4, 1.5), '#ffffff');
    fill(ctx, ell(ctx, x - 1.1, ey + 1.6, 0.7, 0.7), '#94fdff');
  }
  if (at) {
    fill(ctx, ell(ctx, cx + 6 + lean, ey + 7, 4, 3), '#134c4c');
    fill(ctx, ell(ctx, cx + 6 + lean, ey + 8.2, 2.4, 1.3), '#c42430');
  } else {
    stroke(ctx, [[cx + 3 + lean, ey + 6], [cx + 6 + lean, ey + 7.6], [cx + 9 + lean, ey + 6]], 1.3, '#134c4c');
  }
  // Gotas que pingam da base.
  if (f === 1 || at) fill(ctx, ell(ctx, cx - w + 2, base + 1, 1.6, 1.3), '#33984b');
}

// ---------------------------------------------------------------- Quadrúpedes
/**
 * Pata: do quadril/ombro, coxa e canela com articulação; `swing` em radianos (+ = para frente),
 * `lift` levanta a pata quando ela vai à frente. `hock` dobra para trás (patas traseiras).
 */
export function leg(ctx, hip, swing, { upper, lower, wTop, wMid, wPaw, ramp, hock = false, lift = 0, paw = '#2a2f4e', foot = 58 }) {
  const a1 = swing + (hock ? 0.35 : -0.08);
  const knee = [hip[0] + Math.sin(a1) * upper, hip[1] + Math.cos(a1) * upper];
  const a2 = swing * 0.4 + (hock ? -0.55 : 0.12) - lift * 0.9;
  let end = [knee[0] + Math.sin(a2) * lower, knee[1] + Math.cos(a2) * lower];
  end = [end[0], Math.min(end[1], foot - lift * 3.2)];
  const thigh = limb(ctx, hip, knee, wTop, wMid);
  const shin = limb(ctx, knee, end, wMid * 0.92, wPaw * 0.75);
  shade(ctx, thigh, ramp, [hip[0] - wTop, hip[1] - 2, wTop * 2, upper + 4], { ao: 0.2 });
  shade(ctx, shin, ramp, [knee[0] - wMid, knee[1] - 2, wMid * 2, lower + 4], { ao: 0.45 });
  const pawPath = ell(ctx, end[0] + wPaw * 0.35, end[1], wPaw * 0.85, wPaw * 0.5);
  shade(ctx, pawPath, ramp, [end[0] - wPaw, end[1] - wPaw * 0.5, wPaw * 2, wPaw], { ao: 0.6 });
  stroke(ctx, [[end[0] + wPaw * 0.2, end[1] + wPaw * 0.25], [end[0] + wPaw * 1.05, end[1] + wPaw * 0.1]], 0.7, paw);
  return end;
}

// ---------------------------------------------------------------- Lobo
const WOLF = ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'];
const WOLF_FAR = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392'];
const WOLF_CREAM = ['#657392', '#92a1b9', '#c7cfdd', '#d5e8ef'];

function wolf(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1.5 : Math.cos(ph * 2) * 0.8;
  const dx = at ? 3 : 0;
  ctx.save();
  ctx.translate(dx, bob);
  if (at) { ctx.translate(36, 34); ctx.rotate(-0.1); ctx.translate(-36, -34); }
  // Cauda peluda que balança.
  const tw = at ? -0.5 : Math.sin(ph) * 2.2;
  const tail = P(ctx, `M15,27 C9,26 5,31 3,${38 + tw} C2,${42 + tw} 4,${44 + tw} 6,${42 + tw} C8,${39 + tw} 10,34 16,32 Z`);
  shade(ctx, tail, WOLF, [2, 26, 14, 18], { ao: 0.3 });
  fur(ctx, [4, 40 + tw], [12, 30], 5, 2.6, '#657392', 0.7, { dx: -0.6, dy: 0.8, seed: 3 });
  fill(ctx, ell(ctx, 4.2, 42.5 + tw, 1.6, 1.4), '#c7cfdd');
  // Patas do lado de lá (mais escuras).
  const sw = (off) => at ? off : Math.sin(ph + off) * 0.42;
  const lf = (off) => at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2));
  leg(ctx, [19, 37], at ? -0.6 : sw(Math.PI), { upper: 9, lower: 12, wTop: 7, wMid: 4, wPaw: 3.6, ramp: WOLF_FAR, hock: true, lift: lf(Math.PI) });
  leg(ctx, [42, 38], at ? 0.7 : sw(0), { upper: 8, lower: 11, wTop: 5.5, wMid: 3.6, wPaw: 3.4, ramp: WOLF_FAR, lift: lf(0) });
  // Corpo: peito fundo, dorso reto e barriga recolhida.
  const body = P(ctx, `M13,31 C12,24 19,21 27,21.5 C35,22 40,19.5 46,21 C51,23 51,32 48,38
    C46,42 41,43 37,41 C31,39 26,40 21,41 C15,42 12,37 13,31 Z`);
  shade(ctx, body, WOLF, [12, 19, 39, 24], { lx: 0.4, ly: 0.15, ao: 0.4 });
  inside(ctx, body, () => {
    // Peito e barriga claros, sela escura no dorso.
    fill(ctx, P(ctx, 'M40,30 C44,28 49,30 50,36 C48,42 42,44 36,42 C30,40 24,42 18,43 L18,46 L52,46 L52,28 Z'), hexA('#c7cfdd', 0.9));
    stroke(ctx, [[15, 26], [24, 22.5], [34, 23], [42, 21.5]], 3.6, hexA('#2a2f4e', 0.75));
    fur(ctx, [17, 24], [40, 22], 8, 3, '#424c6e', 0.75, { dx: -1, dy: 0.5, seed: 9 });
  });
  // Franja da barriga e do peito.
  fur(ctx, [23, 40.5], [35, 40.5], 4, 1.8, '#657392', 0.9, { dx: -0.4, dy: 1, seed: 21 });
  // Coxa traseira em volume.
  const thigh = ell(ctx, 18, 33, 6.5, 7, -0.2);
  shade(ctx, thigh, WOLF, [11, 26, 14, 14], { ao: 0.35 });
  stroke(ctx, [[13, 30], [15, 36], [20, 39]], 0.7, '#2a2f4e');
  // Patas do lado de cá.
  leg(ctx, [18, 37], at ? 0.5 : sw(0), { upper: 9, lower: 12, wTop: 7, wMid: 4.2, wPaw: 3.8, ramp: WOLF, hock: true, lift: lf(0) });
  leg(ctx, [43, 38], at ? -0.2 : sw(Math.PI), { upper: 8, lower: 11, wTop: 6, wMid: 3.8, wPaw: 3.6, ramp: WOLF, lift: lf(Math.PI) });
  // Pescoço com juba.
  const neck = P(ctx, 'M41,24 C44,17 50,14 54,17 C56,22 54,30 50,35 C47,33 44,30 41,24 Z');
  shade(ctx, neck, WOLF, [41, 14, 15, 21], { ao: 0.3 });
  fur(ctx, [47, 26], [51, 34], 4, 3, '#c7cfdd', 0.8, { dx: -0.8, dy: 0.7, seed: 31 });
  fur(ctx, [43, 22], [47, 17], 3, 3, '#424c6e', 0.7, { dx: -1, dy: 0.6, seed: 5 });
  // Cabeça: crânio, focinho longo, mandíbula.
  const jawOpen = at ? 3.5 : 0;
  const jaw = P(ctx, `M50,24 C54,25 58,26 61,${26.5 + jawOpen} C61,${28.5 + jawOpen} 58,${29 + jawOpen} 54,${28.5 + jawOpen * 0.6} C52,28 50,27 50,24 Z`);
  shade(ctx, jaw, WOLF_CREAM, [50, 24, 12, 6], { ao: 0.4 });
  if (at) {
    fill(ctx, P(ctx, 'M52,24.5 L61,26 L60,29 L53,27 Z'), '#891e2b');
    for (const x of [55, 57.5, 60]) {
      fill(ctx, P(ctx, `M${x},25.6 l1,0 l-0.5,1.8 Z`), '#ffffff');
      fill(ctx, P(ctx, `M${x - 0.6},${28.6 + jawOpen * 0.8} l1,0 l-0.5,-1.6 Z`), '#ffffff');
    }
  }
  const head = P(ctx, `M46,19 C48,14 54,13 57,16 C59,18 59,20 61,21.5 C63,22.5 63.5,24.5 62,25.5
    C59,26.2 55,25.8 52,26.5 C49,27 46,25 46,19 Z`);
  shade(ctx, head, WOLF, [46, 13, 18, 14], { lx: 0.35, ly: 0.2, ao: 0.25 });
  inside(ctx, head, () => {
    fill(ctx, P(ctx, 'M53,23 C56,22.5 60,23 63,24 L63,27 L52,27 Z'), hexA('#c7cfdd', 0.9));
    stroke(ctx, [[54, 18.5], [58, 19.2], [61.5, 21.5]], 1, hexA('#c7cfdd', 0.8));
  });
  // Nariz preto e úmido.
  fill(ctx, ell(ctx, 62.3, 23.2, 1.4, 1.2), C.ink);
  fill(ctx, ell(ctx, 61.9, 22.7, 0.45, 0.4), '#92a1b9');
  // Orelhas em pé, com interior rosado.
  const earL = horn(ctx, [49, 17], [48.5, 12], [50, 8.5], 4.6);
  shade(ctx, earL, WOLF_FAR, [46, 8, 6, 10], { ao: 0 });
  const ear = horn(ctx, [52.5, 16.5], [52.5, 11.5], [54.5, 8], 5);
  shade(ctx, ear, WOLF, [50, 8, 7, 10], { ao: 0 });
  fill(ctx, horn(ctx, [53, 16], [53, 12.5], [54.3, 10], 2.2), '#775c5b');
  // Olho amarelo com pupila e sobrancelha.
  fill(ctx, P(ctx, 'M54,19.4 C55.2,18.4 57,18.5 57.8,19.6 C56.8,20.6 55.2,20.6 54,19.4 Z'), '#ffc825');
  fill(ctx, ell(ctx, 56.1, 19.5, 0.65, 0.75), C.ink);
  stroke(ctx, [[53.4, 18.2], [56, 17.6], [58.2, 18.8]], 0.8, '#1a1932');
  stroke(ctx, [[53, 24.6], [56, 25], [59, 25.4]], 0.6, '#2a2f4e');
  ctx.restore();
}

// ---------------------------------------------------------------- Esqueleto
const BONE = ['#391f21', '#775c5b', '#918275', '#b4b4b4', '#f9e6cf', '#ffffff'];
export function bone(ctx, a, b, w, ramp = BONE) {
  const p = limb(ctx, a, b, w, w * 0.85);
  shade(ctx, p, ramp, [Math.min(a[0], b[0]) - w, Math.min(a[1], b[1]) - w, Math.abs(b[0] - a[0]) + w * 2, Math.abs(b[1] - a[1]) + w * 2], { ao: 0.2 });
  for (const [x, y] of [a, b]) shade(ctx, ell(ctx, x, y, w * 0.78, w * 0.7), ramp, [x - w, y - w, w * 2, w * 2], { ao: 0 });
  return p;
}

function skeleton(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.5 : -Math.abs(Math.sin(ph)) * 1.2;
  const sw = at ? 0 : Math.sin(ph) * 0.42;
  const DARK = ['#1c121c', '#494834', '#775c5b', '#918275', '#b4b4b4'];
  ctx.save();
  ctx.translate(0, bob);
  const legTo = (h, a) => {
    const knee = [h[0] + Math.sin(a) * 9.5, h[1] + Math.cos(a) * 9.5];
    const ank = [knee[0] + Math.sin(a * 0.25 - 0.04) * 9.5, knee[1] + Math.cos(a * 0.25) * 9.5];
    return [knee, [ank[0], Math.min(ank[1], 56.8 - bob)]];
  };
  const footAt = (p, ramp) => shade(ctx, P(ctx, `M${p[0] - 1.6},${p[1] - 0.8} C${p[0] + 1},${p[1] - 1.4} ${p[0] + 4},${p[1] - 0.4} ${p[0] + 4.6},${p[1] + 1.2} L${p[0] - 1.8},${p[1] + 1.2} Z`), ramp, [p[0] - 2, p[1] - 1.5, 7, 3], { ao: 0 });
  // Perna e braço do lado de lá.
  const hip = [32, 40];
  const far = legTo([hip[0] + 3, hip[1]], at ? -0.5 : -sw);
  bone(ctx, [hip[0] + 3, hip[1]], far[0], 2.1, DARK);
  bone(ctx, far[0], far[1], 1.8, DARK);
  footAt(far[1], DARK);
  // Coluna lombar (vazada dos lados) e bacia.
  for (let i = 0; i < 4; i += 1) shade(ctx, ell(ctx, 32.3, 38.2 - i * 1.7, 1.5, 0.95), BONE, [30.5, 36.5 - i * 1.7, 4, 2.2], { ao: 0 });
  const pelvis = P(ctx, 'M25.5,40 C26.5,37.4 30,37.8 32,39.6 C34,37.8 37.6,37.4 38.6,40 C39,43 36.6,44.6 34.2,43.6 L32,45 L29.8,43.6 C27.4,44.6 25,43 25.5,40 Z');
  shade(ctx, pelvis, BONE, [25, 37, 15, 9], { ao: 0.3 });
  fill(ctx, ell(ctx, 28.8, 41.2, 1.3, 1.2), '#1c121c');
  fill(ctx, ell(ctx, 35.2, 41.2, 1.3, 1.2), '#1c121c');
  // Caixa torácica: cavidade escura com costelas claras por cima.
  const cage = P(ctx, 'M24.2,22.5 C27,20.6 37.5,20.6 40.4,22.5 C41.6,26.5 40.6,31.5 37.6,34.2 C35,35.6 29.6,35.6 27,34.2 C24,31.5 23,26.5 24.2,22.5 Z');
  fill(ctx, cage, '#1c121c');
  inside(ctx, cage, () => {
    fill(ctx, P(ctx, 'M31.2,20 L33.4,20 L33.2,36 L31.4,36 Z'), '#775c5b');
    for (let i = 0; i < 4; i += 1) {
      const y = 23.2 + i * 3;
      stroke(ctx, [[22, y + 2.2], [26, y - 0.4], [32.3, y + 0.6], [38.6, y - 0.4], [43, y + 2.2]], 1.8, '#b4b4b4');
      stroke(ctx, [[23, y + 1.2], [26, y - 0.9], [32.3, y + 0.1], [37, y - 0.9]], 0.75, '#f9e6cf');
    }
  });
  stroke(ctx, [[32.3, 21.5], [32.3, 32]], 1.6, '#f6ca9f');
  // Clavículas e ombros.
  stroke(ctx, [[24.5, 22.2], [32.3, 21.2], [40, 22.2]], 1.7, '#f9e6cf');
  // Perna de cá.
  const near = legTo([hip[0] - 3, hip[1]], at ? 0.55 : sw);
  bone(ctx, [hip[0] - 3, hip[1]], near[0], 2.4);
  bone(ctx, near[0], near[1], 2);
  footAt(near[1], BONE);
  // Crânio grande com órbitas fundas e brasas vermelhas.
  const sx = 33;
  const sy = 12.5;
  const skull = P(ctx, `M${sx - 7.6},${sy + 1.4} C${sx - 8.4},${sy - 8.2} ${sx + 7.6},${sy - 9.4} ${sx + 8.2},${sy}
    C${sx + 8.4},${sy + 3} ${sx + 6.8},${sy + 4.6} ${sx + 5.4},${sy + 5.2} L${sx + 4.8},${sy + 7.6} L${sx - 3.6},${sy + 7.6}
    L${sx - 4.2},${sy + 5.2} C${sx - 6.6},${sy + 4.6} ${sx - 7.6},${sy + 3.2} ${sx - 7.6},${sy + 1.4} Z`);
  shade(ctx, skull, BONE, [sx - 8.5, sy - 9, 17, 17], { lx: 0.3, ly: 0.15, ao: 0.3 });
  const jd = at ? 1.6 : 0;
  const jawPath = P(ctx, `M${sx - 4},${sy + 6.2 + jd} L${sx + 5.4},${sy + 6.2 + jd} C${sx + 5.4},${sy + 9.4 + jd} ${sx + 2.4},${sy + 10.4 + jd} ${sx + 0.7},${sy + 10.4 + jd} C${sx - 2},${sy + 10.4 + jd} ${sx - 4},${sy + 9.4 + jd} ${sx - 4},${sy + 6.2 + jd} Z`);
  shade(ctx, jawPath, BONE, [sx - 4.5, sy + 6, 10.5, 5], { ao: 0.45 });
  fill(ctx, P(ctx, `M${sx - 3.4},${sy + 5.6} L${sx + 5},${sy + 5.6} L${sx + 5},${sy + 6.8 + jd} L${sx - 3.4},${sy + 6.8 + jd} Z`), '#1c121c');
  for (let i = 0; i < 5; i += 1) {
    fill(ctx, P(ctx, `M${sx - 3 + i * 1.75},${sy + 4.9} l1.25,0 l0,1.5 l-1.25,0 Z`), '#f9e6cf');
    fill(ctx, P(ctx, `M${sx - 3 + i * 1.75},${sy + 6.8 + jd} l1.25,0 l0,1.2 l-1.25,0 Z`), '#f6ca9f');
  }
  for (const [ex, r] of [[sx - 2.8, 2.9], [sx + 4, 3]]) {
    fill(ctx, P(ctx, `M${ex - r},${sy + 0.2} C${ex - r},${sy - r * 1.3} ${ex + r},${sy - r * 1.3} ${ex + r},${sy + 0.4} C${ex + r * 0.7},${sy + r * 1.05} ${ex - r * 0.7},${sy + r * 1.05} ${ex - r},${sy + 0.2} Z`), '#0e071b');
    glow(ctx, ex + 0.4, sy + 0.2, 1.7, '#ea323c', { core: '#ffa214' });
  }
  fill(ctx, P(ctx, `M${sx + 0.6},${sy + 1.8} l1.2,2.4 l-2.4,0 Z`), '#1c121c');
  stroke(ctx, [[sx - 6, sy - 4.2], [sx - 3.4, sy - 7], [sx + 1.4, sy - 7.6]], 1.2, '#ffffff');
  stroke(ctx, [[sx + 6.6, sy + 1], [sx + 5.6, sy + 4]], 0.9, '#918275');
  // Braço de cá, solto, com dedos ossudos.
  const shN = [25, 23];
  const elN = [shN[0] - 1.5 - sw * 6, shN[1] + 8.5];
  const haN = [elN[0] + 1 - sw * 4, elN[1] + 7];
  bone(ctx, shN, elN, 2);
  bone(ctx, elN, haN, 1.7);
  for (let i = 0; i < 3; i += 1) stroke(ctx, [haN, [haN[0] - 0.6 + i * 0.9, haN[1] + 2.4]], 0.8, '#b4b4b4');
  shade(ctx, ell(ctx, shN[0], shN[1], 2.5, 2.3), BONE, [shN[0] - 3, shN[1] - 3, 6, 6], { ao: 0 });
  // Braço da frente com a espada enferrujada apontada para a frente.
  const shF = [39.5, 22.5];
  const elF = at ? [46, 19] : [shF[0] + 3 + sw * 3, shF[1] + 8];
  const haF = at ? [53, 16.5] : [elF[0] + 4 + sw * 3, elF[1] + 3];
  const bladeA = at ? -0.12 : -0.95 + sw * 0.35;
  bone(ctx, shF, elF, 1.9);
  bone(ctx, elF, haF, 1.6);
  shade(ctx, ell(ctx, shF[0], shF[1], 2.3, 2.1), BONE, [shF[0] - 3, shF[1] - 3, 6, 6], { ao: 0 });
  ctx.save();
  ctx.translate(haF[0], haF[1]);
  ctx.rotate(bladeA);
  const blade = P(ctx, 'M2.5,-1.4 L17.5,-1.2 C19.3,-0.8 20.7,0 21.5,0.4 C20.5,0.9 19.3,1.2 17.5,1.3 L2.5,1.4 Z');
  shade(ctx, blade, C.steel.slice(1, 7), [2, -2, 20, 4], { lx: 0.2, ly: 0, ao: 0.2 });
  stroke(ctx, [[3.5, -0.6], [17, -0.5]], 0.6, '#ffffff');
  for (const [x, r] of [[8, 1], [12.5, 0.8], [16, 0.9]]) fill(ctx, ell(ctx, x, 0.7, r, r * 0.75), '#8a4836');
  fill(ctx, P(ctx, 'M1.2,-3.8 L2.8,-3.8 L2.8,3.8 L1.2,3.8 Z'), '#8a4836');
  fill(ctx, P(ctx, 'M-3.4,-0.9 L1.2,-0.9 L1.2,0.9 L-3.4,0.9 Z'), '#391f21');
  fill(ctx, ell(ctx, -4, 0, 1.2, 1.2), '#bf6f4a');
  ctx.restore();
  shade(ctx, ell(ctx, haF[0], haF[1], 1.8, 1.6), BONE, [haF[0] - 2, haF[1] - 2, 4, 4], { ao: 0 });
  if (at) stroke(ctx, [[44, 4], [58, 9], [62, 22]], 1.1, hexA('#ffffff', 0.75));
  ctx.restore();
}

export const MONSTERS = {
  slime: { size: 40, elite: 48, shadow: [32, 58, 19, 3.5], paint: slime },
  wolf: { size: 52, elite: 60, shadow: [33, 58.5, 22, 3], paint: wolf },
  skeleton: { size: 52, elite: 60, extra: [40], shadow: [32, 58, 11, 2.6], paint: skeleton }
};
