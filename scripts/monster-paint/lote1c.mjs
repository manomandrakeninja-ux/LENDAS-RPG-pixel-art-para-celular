// Lote 1 (fim): os profundos da captura reprovada (djinn, espreitador do vazio, carcereiro,
// espectro de cinzas, ceifador) e o chefe Senhor do Abismo.
import { C, P, ell, fill, fur, glow, hexA, horn, inside, limb, phaseOf, rand, shade, stroke } from './kit.mjs';
import { leg } from './lote1.mjs';

// ---------------------------------------------------------------- Djinn
const DJINN = ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9'];
const SMOKE = ['#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'];
const TURBAN = ['#3b1443', '#622461', '#93388f', '#ca52c9'];

function djinn(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : Math.sin(ph) * 1.4;
  ctx.save();
  ctx.translate(0, bob);
  // Cauda de fumaça: redemoinho que afina e termina numa ponta enrolada no ar (não toca o chão).
  const w = Math.sin(ph) * 1.6;
  const tail = P(ctx, `M18,37 C16.5,42 20,45.5 24.5,48 C28,50 ${29.6 + w},52 ${27.6 + w},54 C${26 + w},55.4 ${23.2 + w},55 ${22.6 + w},53.4
    C${24 + w},54 ${25.6 + w},53.4 ${25.4 + w},52.2 C${30.5 + w},51 ${34.5 + w},48.4 37.5,45.4 C40,43 41.4,40 41,37 Z`);
  shade(ctx, tail, SMOKE, [16, 36, 26, 20], { lx: 0.3, ly: 0.15, ao: 0.15 });
  inside(ctx, tail, () => {
    // Faixas do redemoinho (sombra embaixo, brilho em cima), inclinadas como um tornado.
    for (let i = 0; i < 4; i += 1) {
      const y = 39.5 + i * 3.4 + ((f % 2) ? 0.8 : 0);
      const x0 = 17 + i * 1.6;
      const x1 = 41 - i * 3.2 + w * (i / 3);
      stroke(ctx, [[x0, y], [(x0 + x1) / 2, y + 2.2], [x1, y - 0.6]], 1.2, '#0069aa');
      stroke(ctx, [[x0 + 1, y - 1.2], [(x0 + x1) / 2, y + 0.9], [x1 - 1, y - 1.8]], 0.8, '#94fdff');
    }
  });
  // Fiapos soltos de fumaça ao lado do redemoinho.
  for (const [x, y, r] of [[15.5 + w, 44, 1.8], [42.5 - w, 42.5, 1.6], [20 + w, 50.5, 1.3]]) {
    fill(ctx, ell(ctx, x, y, r, r * 0.8), '#00cdf9');
    fill(ctx, ell(ctx, x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.4), '#94fdff');
  }
  // Faixa vermelha na cintura com fivela dourada.
  const sash = P(ctx, 'M19,36.5 C25,38 33,38 40,36 L40.5,40.5 C33,42 25,42 18.5,40.5 Z');
  shade(ctx, sash, C.wine.slice(0, 5), [18, 36, 23, 6], { ao: 0.3 });
  const flap = at ? 2 : Math.sin(ph + 1) * 1.5;
  shade(ctx, P(ctx, `M21,40 C20,44 ${19 + flap},47 ${17 + flap},49 L${20 + flap},48.5 C22,46 23,43 23.5,40.5 Z`), C.wine.slice(0, 5), [16, 40, 8, 10], { ao: 0.2 });
  fill(ctx, ell(ctx, 30, 39, 1.8, 1.8), '#ffc825');
  fill(ctx, ell(ctx, 30, 39, 0.8, 0.8), '#ea323c');
  // Braço de lá: ergue a esfera de fogo mágico.
  const orb = at ? [55, 26] : [48, 9 + Math.sin(ph) * 0.6];
  const elF = at ? [46, 27] : [45, 18];
  shade(ctx, limb(ctx, [38, 22], elF, 5, 4.2), ['#0c2e44', '#00396d', '#0069aa', '#0098dc'], [36, 14, 12, 14], { ao: 0.2 });
  shade(ctx, limb(ctx, elF, [orb[0] - 1, orb[1] + 3.5], 4.2, 3.4), ['#0c2e44', '#00396d', '#0069aa', '#0098dc'], [elF[0] - 3, orb[1], 8, 20], { ao: 0.2 });
  fill(ctx, ell(ctx, (elF[0] + orb[0]) / 2, (elF[1] + orb[1] + 3.5) / 2 + 1, 2.4, 1.4), '#edab50');
  // Tronco musculoso em V.
  const torso = P(ctx, 'M20,22 C22,19 28,18 30,18 C33,18 38,19 41,22 C42,27 39,33 37,37.5 C32,39 27,39 22,37.5 C20,33 18.5,27 20,22 Z');
  shade(ctx, torso, DJINN, [18, 18, 24, 21], { lx: 0.35, ly: 0.2, ao: 0.35 });
  inside(ctx, torso, () => {
    stroke(ctx, [[24, 26.5], [29, 28], [30.5, 26.5], [32, 28], [37, 26.5]], 0.8, '#00396d');
    for (const y of [30.5, 33.5]) stroke(ctx, [[27, y], [29.5, y + 0.5], [32, y], [34.5, y + 0.4]], 0.7, '#0069aa');
    stroke(ctx, [[30.5, 28], [30.5, 37]], 0.7, '#00396d');
    stroke(ctx, [[23, 23], [27, 21.5]], 1, '#00cdf9');
  });
  // Colete roxo aberto com barra dourada.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 20 : 41;
    const vest = P(ctx, side < 0
      ? 'M20.4,22.4 C21.6,20.6 23.4,19.8 24.6,20 C24,26 23.6,32 24,37.5 L22.2,37.3 C20.8,32 19.8,26 20.4,22.4 Z'
      : 'M40.6,22.4 C39.4,20.6 37.6,19.8 36.4,20 C37,26 37.4,32 37,37.5 L38.8,37.3 C40.2,32 41.2,26 40.6,22.4 Z');
    shade(ctx, vest, TURBAN, [x0 - 3, 19, 8, 19], { ao: 0.3 });
    stroke(ctx, side < 0 ? [[24.6, 20], [24, 28], [24, 37.5]] : [[36.4, 20], [37, 28], [37, 37.5]], 0.8, '#ffc825');
  }
  // Cabeça: orelha pontuda, barbicha, olhos acesos, turbante com joia.
  const head = P(ctx, 'M25,12 C25,7.5 28,5.5 31,5.5 C34.5,5.5 37,8 37,12 C37,15.5 35,18.2 31,18.2 C27.5,18.2 25,15.5 25,12 Z');
  shade(ctx, head, DJINN, [25, 5, 12, 13], { ao: 0.25 });
  shade(ctx, horn(ctx, [26, 12.5], [23.5, 11.5], [21.6, 9], 2.6), DJINN, [21, 9, 5, 4], { ao: 0 });
  fill(ctx, ell(ctx, 25, 14.4, 0.7, 0.9), '#ffc825');
  const beard = P(ctx, 'M29,16.4 C31,17.2 34,17 35.6,15.6 C35.6,18.6 34.2,21.6 33,23.4 C31.6,21.4 30,19 29,16.4 Z');
  fill(ctx, beard, '#0e071b');
  stroke(ctx, [[30.8, 15.6], [32.6, 16.2], [34.6, 15.4]], 0.7, '#0e071b');
  for (const x of [30, 34.4]) {
    fill(ctx, P(ctx, `M${x - 1.4},12 C${x - 0.4},11 ${x + 1},11 ${x + 1.6},12.2 C${x + 0.6},12.9 ${x - 0.6},12.9 ${x - 1.4},12 Z`), '#ffeb57');
    stroke(ctx, [[x - 1.8, 10.6], [x + 0.2, 10.1], [x + 1.8, 10.8]], 0.8, '#0c2e44');
  }
  const turban = P(ctx, 'M24,8.6 C23,3.5 27,0.6 31.5,0.8 C36.5,1 39.8,4 38.6,8.8 C35,10 28,10 24,8.6 Z');
  shade(ctx, turban, TURBAN, [23, 0.5, 16.5, 10], { ao: 0.25 });
  inside(ctx, turban, () => {
    stroke(ctx, [[24, 6], [30, 3.5], [38.5, 5.6]], 1, '#3b1443');
    stroke(ctx, [[24.5, 3.8], [31, 1.8], [37.5, 3]], 0.8, '#ca52c9');
  });
  fill(ctx, ell(ctx, 32, 7.2, 1.8, 1.9), '#ffc825');
  fill(ctx, ell(ctx, 32, 7.3, 1, 1.1), '#ea323c');
  stroke(ctx, [[32.6, 5.4], [34.6, 1.8], [37.6, 0.8]], 1.1, '#ffeb57');
  // Braço de cá: no quadril (anda) ou para a frente (ataque), com bracelete de ouro.
  const elN = at ? [30, 26] : [17, 29];
  const haN = at ? [44, 25] : [21.5, 35.5];
  shade(ctx, limb(ctx, [21.5, 22], elN, 5.4, 4.4), DJINN, [14, 20, 16, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, elN, haN, 4.4, 3.6), DJINN, [Math.min(elN[0], haN[0]) - 3, 24, 18, 14], { ao: 0.25 });
  const bx = elN[0] + (haN[0] - elN[0]) * 0.55;
  const by = elN[1] + (haN[1] - elN[1]) * 0.55;
  fill(ctx, ell(ctx, bx, by, 2.4, 2.4, Math.atan2(haN[1] - elN[1], haN[0] - elN[0])), '#edab50');
  stroke(ctx, [[bx - 1.2, by - 1], [bx + 0.6, by - 1.6]], 0.6, '#ffeb57');
  // Esfera de fogo mágico.
  glow(ctx, orb[0], orb[1], at ? 7 : 5.6, '#ca52c9', { core: '#fdd2ed' });
  fill(ctx, ell(ctx, orb[0], orb[1], at ? 3.2 : 2.6, at ? 3.2 : 2.6), '#ca52c9');
  fill(ctx, ell(ctx, orb[0] - 0.6, orb[1] - 0.6, 1.4, 1.4), '#fdd2ed');
  for (let i = 0; i < 3; i += 1) {
    const a = ph + i * 2.1;
    fill(ctx, ell(ctx, orb[0] + Math.cos(a) * 5, orb[1] + Math.sin(a) * 3.4, 0.7, 0.7), '#ffc825');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Espreitador do Vazio (pantera do vazio)
const VOID = ['#0e071b', '#1a1932', '#3b1443', '#622461', '#93388f'];
const VOID_FAR = ['#0e071b', '#0e071b', '#1a1932', '#3b1443', '#622461'];

function wisp(ctx, x, y, h, flick) {
  const p = P(ctx, `M${x - 2.4},${y} C${x - 3},${y - h * 0.55} ${x - 1 + flick},${y - h} ${x + flick},${y - h}
    C${x + 1.6 + flick},${y - h} ${x + 3},${y - h * 0.5} ${x + 2.4},${y} Z`);
  shade(ctx, p, ['#622461', '#93388f', '#ca52c9', '#fdd2ed'], [x - 3, y - h, 6, h], { lx: 0.5, ly: 0.9, ao: 0 });
}

function voidStalker(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -3 : Math.cos(ph * 2) * 0.7;
  ctx.save();
  ctx.translate(at ? 2 : 0, bob);
  if (at) { ctx.translate(34, 40); ctx.rotate(-0.16); ctx.translate(-34, -40); }
  const sw = (off) => at ? 0 : Math.sin(ph + off) * 0.45;
  const lf = (off) => at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2));
  // Cauda longa em S, com ponta etérea.
  const t = Math.sin(ph) * 2.5;
  stroke(ctx, [[14, 32], [7, 31], [4.5, 24 + t], [8, 17 + t]], 3, '#1a1932');
  stroke(ctx, [[14, 31.4], [7.4, 30.4], [5.2, 24 + t], [8.2, 18 + t]], 1, '#622461');
  wisp(ctx, 8.6, 18.5 + t, 7, 2 - t * 0.4);
  const legOpts = (ramp, hock) => ({ upper: 8, lower: 10, wTop: 6, wMid: 3.4, wPaw: 3.4, ramp, hock, paw: '#0e071b' });
  leg(ctx, [18, 38], at ? -0.8 : sw(Math.PI), { ...legOpts(VOID_FAR, true), lift: lf(Math.PI) });
  leg(ctx, [41, 39], at ? 0.9 : sw(0), { ...legOpts(VOID_FAR, false), lift: lf(0) });
  // Corpo felino, longo e baixo.
  const body = P(ctx, `M12,33 C12,27 18,25 26,25.5 C33,26 38,23.5 44,24.5 C49,25.5 50,32 48,37.5
    C46.5,41.5 41,42 36,40.5 C30,39.5 24,41.5 19,41.5 C14,41.5 12,38 12,33 Z`);
  shade(ctx, body, VOID, [11, 23, 39, 19], { lx: 0.4, ly: 0.1, ao: 0.45 });
  inside(ctx, body, () => {
    // Listras que brilham e poeira de estrelas.
    for (const x of [20, 26, 32, 38]) stroke(ctx, [[x - 1, 26], [x + 1.4, 30], [x, 34]], 1.1, '#ca52c9');
    for (let i = 0; i < 9; i += 1) fill(ctx, ell(ctx, 14 + rand(i * 5.3) * 34, 28 + rand(i * 2.9) * 11, 0.45, 0.45), i % 3 ? '#c7cfdd' : '#94fdff');
  });
  // Chamas roxas ao longo do dorso.
  for (const [x, y, h] of [[22, 26.5, 5], [28, 26, 6], [34, 25.6, 5]]) wisp(ctx, x, y, h, Math.sin(ph + x) * 1.6);
  leg(ctx, [17, 38], at ? 0.6 : sw(0), { ...legOpts(VOID, true), lift: lf(0) });
  leg(ctx, [43, 39], at ? 1.2 : sw(Math.PI), { ...legOpts(VOID, false), lift: lf(Math.PI) });
  // Cabeça de felino: crânio redondo, focinho curto, orelhas, olhos ciano.
  const jo = at ? 3 : 0;
  if (at) {
    const jaw = P(ctx, `M48,30 C52,30.5 56,${31 + jo} 59,${32 + jo} C58,${34 + jo} 54,${34.5 + jo} 50,33 Z`);
    shade(ctx, jaw, VOID, [48, 30, 11, 6], { ao: 0.2 });
    fill(ctx, P(ctx, `M50,30 L59,30.5 L58.5,${32 + jo} L50,31.5 Z`), '#891e2b');
    for (const x of [53, 56]) {
      fill(ctx, P(ctx, `M${x},30.2 l1,0 l-0.5,2 Z`), '#ffffff');
      fill(ctx, P(ctx, `M${x - 0.5},${32 + jo} l1,0 l-0.5,-1.8 Z`), '#ffffff');
    }
  }
  const head = P(ctx, 'M44,24 C45,19.5 50,18 54,19.5 C56.5,20.5 57.5,23 59.5,25 C61,26.5 60.5,29.5 58.5,30.4 C55,31.5 51,31.6 48,30.8 C45,30 43.5,27 44,24 Z');
  shade(ctx, head, VOID, [43, 18, 18, 14], { lx: 0.35, ly: 0.2, ao: 0.3 });
  for (const [x, far] of [[47, true], [51, false]]) {
    const ear = P(ctx, `M${x - 2.4},21 C${x - 2.6},17.5 ${x - 1},15 ${x + 0.4},14.6 C${x + 1.6},16 ${x + 2.4},18.5 ${x + 2},21 Z`);
    shade(ctx, ear, far ? VOID_FAR : VOID, [x - 3, 14, 6, 8], { ao: 0 });
    if (!far) fill(ctx, P(ctx, `M${x - 1},20 C${x - 1},18 ${x - 0.4},16.6 ${x + 0.3},16.4 C${x + 0.8},17.6 ${x + 1},19 ${x + 0.8},20 Z`), '#93388f');
  }
  stroke(ctx, [[54, 27], [57, 27.4], [59.6, 26.8]], 0.7, '#93388f');
  fill(ctx, ell(ctx, 60, 26.4, 1, 0.9), '#ca52c9');
  // Olho ciano aceso com rastro de luz.
  glow(ctx, 53.4, 23.4, 3, '#00cdf9', { core: '#ffffff' });
  fill(ctx, P(ctx, 'M51.6,23.6 C52.6,22.4 54.4,22.4 55.4,23.4 C54.4,24.4 52.6,24.6 51.6,23.6 Z'), '#94fdff');
  fill(ctx, ell(ctx, 53.6, 23.5, 0.35, 0.7), '#0e071b');
  stroke(ctx, [[51, 22], [53.6, 21.4], [56, 22.4]], 0.8, '#0e071b');
  // Bigodes.
  stroke(ctx, [[57, 28.4], [62, 28.8]], 0.4, '#c7cfdd');
  ctx.restore();
}

// ---------------------------------------------------------------- Carcereiro Infernal
const HELLSKIN = ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c'];
const IRON = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9'];
const HORN = ['#391f21', '#775c5b', '#918275', '#cba36f', '#f9e6cf'];

function rivets(ctx, pts) {
  for (const [x, y] of pts) { fill(ctx, ell(ctx, x, y, 0.7, 0.7), '#92a1b9'); fill(ctx, ell(ctx, x - 0.2, y - 0.2, 0.3, 0.3), '#ffffff'); }
}

function hellWarden(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 1.3;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Corrente com bola de ferro (braço de lá) — gira no ataque.
  const handF = at ? [47, 16] : [45 + sw * 2, 37];
  const ball = at ? [58, 8] : [49 + sw * 3, 52 - Math.abs(sw)];
  for (let i = 0; i <= 6; i += 1) {
    const t = i / 6;
    const x = handF[0] + (ball[0] - handF[0]) * t + Math.sin(t * Math.PI) * (at ? -2 : 1.5);
    const y = handF[1] + (ball[1] - handF[1]) * t;
    fill(ctx, ell(ctx, x, y, 1.1, 0.8, t * 3), i % 2 ? '#657392' : '#424c6e');
  }
  shade(ctx, ell(ctx, ball[0], ball[1], 4.6, 4.6), IRON, [ball[0] - 4.6, ball[1] - 4.6, 9.2, 9.2], { ao: 0.3 });
  for (const a of [0, 1.6, 3.2, 4.7]) fill(ctx, ell(ctx, ball[0] + Math.cos(a) * 4.4, ball[1] + Math.sin(a) * 4.4, 1.1, 1.1), '#2a2f4e');
  stroke(ctx, [[ball[0] - 2.6, ball[1] - 1.8], [ball[0] - 0.8, ball[1] - 3.2]], 0.9, '#c7cfdd');
  // Braço de lá.
  shade(ctx, limb(ctx, [41, 22], [handF[0], (22 + handF[1]) / 2 + 1], 7, 6), ['#1c121c', '#3b1443', '#571c27', '#891e2b'], [38, 18, 12, 16], { ao: 0.2 });
  shade(ctx, limb(ctx, [handF[0], (22 + handF[1]) / 2 + 1], handF, 6, 5.4), ['#1c121c', '#3b1443', '#571c27', '#891e2b'], [handF[0] - 4, 20, 8, 20], { ao: 0.2 });
  // Pernas com grevas de ferro e cascos.
  for (const [x, s, ramp] of [[37, -1, IRON.slice(0, 5)], [27, 1, IRON]]) {
    const a = at ? s * 0.3 : sw * s * 0.4;
    const knee = [x + Math.sin(a) * 6, 49];
    const foot = [knee[0] + Math.sin(a) * 2, 56.8 - bob];
    shade(ctx, limb(ctx, [x, 40], knee, 8.5, 7), HELLSKIN, [x - 5, 39, 10, 12], { ao: 0.3 });
    shade(ctx, limb(ctx, knee, foot, 7, 6.4), ramp, [knee[0] - 4, knee[1] - 2, 8, 10], { ao: 0.3 });
    shade(ctx, P(ctx, `M${foot[0] - 3.6},${foot[1] - 1} C${foot[0] - 2},${foot[1] - 3} ${foot[0] + 3},${foot[1] - 3} ${foot[0] + 5},${foot[1] - 0.5} L${foot[0] + 5},${foot[1] + 1} L${foot[0] - 3.6},${foot[1] + 1} Z`), ['#0e071b', '#1c121c', '#391f21'], [foot[0] - 4, foot[1] - 3, 9, 4], { ao: 0 });
    stroke(ctx, [[knee[0] - 3, knee[1] + 1], [knee[0] + 3, knee[1] + 1]], 1, '#92a1b9');
  }
  // Tronco largo, barriga e peitoral de ferro.
  const torso = P(ctx, 'M19,24 C19,18 25,15 32,15 C39,15 45,18 45,24 C45.5,31 44,37 41,42 C36,44 28,44 23,42 C20,37 18.5,31 19,24 Z');
  shade(ctx, torso, HELLSKIN, [18, 15, 28, 29], { lx: 0.35, ly: 0.2, ao: 0.4 });
  const plate = P(ctx, 'M22.5,22 C26,19.6 38,19.6 41.5,22 C42,27 40.5,31 38,33 C34,34.4 30,34.4 26,33 C23.5,31 22,27 22.5,22 Z');
  shade(ctx, plate, IRON, [22, 19.5, 20, 15], { lx: 0.3, ly: 0.15, ao: 0.3 });
  stroke(ctx, [[32, 21], [32, 33.6]], 0.9, '#1a1932');
  rivets(ctx, [[24.5, 23], [39.5, 23], [25.5, 30.5], [38.5, 30.5]]);
  // Brasa no peito (fornalha) e cinto com argola de chaves.
  glow(ctx, 32, 27, 3.4, '#ff5000', { core: '#ffc825' });
  shade(ctx, P(ctx, 'M21.5,37.5 C27,39.4 37,39.4 42.5,37.5 L42.8,41 C37,43 27,43 21.2,41 Z'), ['#1c121c', '#391f21', '#5d2c28', '#8a4836'], [21, 37, 22, 6], { ao: 0 });
  fill(ctx, ell(ctx, 32, 39.6, 2, 1.8), '#edab50');
  fill(ctx, ell(ctx, 32, 39.6, 1, 0.9), '#391f21');
  const ring = [25, 43.6];
  ctx.save(); ctx.lineWidth = 0.9; ctx.strokeStyle = '#edab50'; ctx.beginPath(); ctx.arc(ring[0], ring[1], 2.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  for (const [dx, a] of [[-1.6, 0.5], [0, 0.1], [1.6, -0.3]]) {
    ctx.save(); ctx.translate(ring[0] + dx, ring[1] + 2); ctx.rotate(a + sw * 0.2);
    fill(ctx, P(ctx, 'M-0.45,0 L0.45,0 L0.45,4 L1.4,4 L1.4,5 L0.45,5 L0.45,5.8 L-0.45,5.8 Z'), '#ffc825');
    ctx.restore();
  }
  // Ombreiras redondas de ferro com rebites.
  for (const [x, y, rx] of [[20, 20.5, 6.4], [44, 20.5, 5.6]]) {
    shade(ctx, ell(ctx, x, y, rx, 4.8), IRON, [x - rx, y - 5, rx * 2, 10], { ao: 0.35 });
    stroke(ctx, [[x - rx + 1.4, y + 1.6], [x, y + 3.6], [x + rx - 1.4, y + 1.6]], 0.8, '#1a1932');
    rivets(ctx, [[x - 2, y - 1.4], [x + 2, y - 1.4]]);
  }
  // Cabeça: testa pesada, olhos amarelos, presas e chifres de carneiro enrolados.
  const hx = 32;
  const hy = 11.5;
  for (const [s, ramp] of [[1, HORN], [-1, HORN]]) {
    const hornP = P(ctx, `M${hx + s * 3.5},${hy - 4} C${hx + s * 8},${hy - 9} ${hx + s * 13.5},${hy - 6} ${hx + s * 13},${hy}
      C${hx + s * 12.6},${hy + 3.6} ${hx + s * 9},${hy + 4.4} ${hx + s * 8.2},${hy + 1.6} C${hx + s * 9.6},${hy + 1.6} ${hx + s * 10.4},${hy - 0.4} ${hx + s * 9.8},${hy - 2.2}
      C${hx + s * 9},${hy - 4.4} ${hx + s * 6.4},${hy - 3.6} ${hx + s * 5},${hy - 1.6} Z`);
    shade(ctx, hornP, ramp, [hx + (s > 0 ? 3 : -14), hy - 9, 11, 14], { lx: s > 0 ? 0.3 : 0.6, ao: 0.2 });
    for (const t of [0.35, 0.55, 0.75]) stroke(ctx, [[hx + s * (5 + t * 8), hy - 6 + t * 3], [hx + s * (5.6 + t * 8), hy - 4 + t * 3]], 0.6, '#775c5b');
  }
  const head = P(ctx, `M${hx - 6},${hy - 1} C${hx - 6},${hy - 6.5} ${hx + 6},${hy - 6.5} ${hx + 6},${hy - 1} C${hx + 6.2},${hy + 3} ${hx + 4},${hy + 6} ${hx},${hy + 6} C${hx - 4},${hy + 6} ${hx - 6.2},${hy + 3} ${hx - 6},${hy - 1} Z`);
  shade(ctx, head, HELLSKIN, [hx - 6, hy - 6, 12, 12], { ao: 0.25 });
  stroke(ctx, [[hx - 4.8, hy - 1.6], [hx - 1, hy - 0.6], [hx + 1, hy - 0.6], [hx + 4.8, hy - 1.6]], 1.4, '#3b1443');
  for (const x of [hx - 2.4, hx + 2.6]) { glow(ctx, x, hy + 0.4, 1.8, '#ffc825', { core: '#ffeb57' }); }
  stroke(ctx, [[hx - 2.6, hy + 3.6], [hx, hy + 4.2], [hx + 2.6, hy + 3.6]], 0.8, '#1c121c');
  for (const s of [-1, 1]) fill(ctx, horn(ctx, [hx + s * 2.2, hy + 4.2], [hx + s * 2.4, hy + 2.8], [hx + s * 2.8, hy + 2], 1.3), '#f9e6cf');
  // Braço de cá segurando a lanterna de almas.
  const handN = at ? [16, 30] : [15 - sw * 2, 37];
  shade(ctx, limb(ctx, [20, 22], [handN[0] - 1, (22 + handN[1]) / 2 + 1], 7.4, 6.4), HELLSKIN, [12, 18, 12, 16], { ao: 0.2 });
  shade(ctx, limb(ctx, [handN[0] - 1, (22 + handN[1]) / 2 + 1], handN, 6.4, 5.8), HELLSKIN, [handN[0] - 5, 22, 10, 18], { ao: 0.2 });
  fill(ctx, ell(ctx, handN[0] - 0.5, (22 + handN[1]) / 2 + 3, 3.4, 1.5), '#424c6e');
  const lan = [handN[0] + sw * 1.4, handN[1] + 7];
  stroke(ctx, [[handN[0], handN[1] + 1.5], [lan[0], lan[1] - 3.6]], 0.6, '#2a2f4e');
  shade(ctx, P(ctx, `M${lan[0] - 2.8},${lan[1] - 3} L${lan[0] + 2.8},${lan[1] - 3} L${lan[0] + 2.4},${lan[1] + 3.4} L${lan[0] - 2.4},${lan[1] + 3.4} Z`), IRON, [lan[0] - 3, lan[1] - 3, 6, 7], { ao: 0 });
  fill(ctx, P(ctx, `M${lan[0] - 1.8},${lan[1] - 2} L${lan[0] + 1.8},${lan[1] - 2} L${lan[0] + 1.5},${lan[1] + 2.4} L${lan[0] - 1.5},${lan[1] + 2.4} Z`), '#5ac54f');
  glow(ctx, lan[0], lan[1] + 0.2, 2, '#99e65f', { core: '#d3fc7e' });
  stroke(ctx, [[lan[0] - 3.2, lan[1] - 3.2], [lan[0], lan[1] - 4.6], [lan[0] + 3.2, lan[1] - 3.2]], 0.8, '#424c6e');
  ctx.restore();
}

// ---------------------------------------------------------------- Espectro de Cinzas
const ASH = ['#1c121c', '#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4'];

function ragHem(base, ph, count, x0, x1, len, at) {
  const pts = [];
  for (let i = 0; i <= count; i += 1) {
    const x = x0 + (x1 - x0) * (i / count) - (at ? 2 : 0);
    const deep = i % 2 === 0;
    pts.push([x + Math.sin(ph + i) * 1.2, base + (deep ? len : 0) + Math.sin(ph * 1 + i * 1.7) * 1.6]);
  }
  return pts;
}

function ashWraith(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : Math.sin(ph) * 1.5;
  ctx.save();
  ctx.translate(at ? 3 : 0, bob - 1);
  // Manto em farrapos que balança.
  const hem = ragHem(48, ph, 6, 14, 48, 6, at);
  let d = 'M24,14 C24,6 29,3 33,3 C38,3 42,7 42,14 C44,22 47,32 49,44 ';
  for (let i = hem.length - 1; i >= 0; i -= 1) {
    const [x, y] = hem[i];
    const prev = hem[i + 1] ?? [49, 44];
    d += `Q${(x + prev[0]) / 2},${Math.min(y, prev[1]) - 2} ${x},${y} `;
  }
  d += 'C15,36 19,24 24,14 Z';
  const cloak = P(ctx, d);
  shade(ctx, cloak, ASH, [14, 3, 36, 52], { lx: 0.35, ly: 0.12, ao: 0.6 });
  inside(ctx, cloak, () => {
    // Dobras do pano e barra em brasa.
    for (const [x0, x1] of [[26, 22], [33, 31], [40, 43]]) stroke(ctx, [[x0, 22], [(x0 + x1) / 2 + 1, 36], [x1, 52]], 1.1, '#272727');
    stroke(ctx, [[28, 20], [27, 34]], 0.8, '#858585');
    for (const [x, y] of hem) glow(ctx, x, y, 3.4, '#c64524', { core: '#ffa214', alpha: 0.95 });
  });
  // Capuz: abertura escura com olhos de brasa.
  const hood = P(ctx, 'M27,15 C27,9.5 30,7.5 34,7.5 C38,7.5 40.6,10 40.4,15.5 C40,19.5 37.5,21.5 33.6,21.5 C29.6,21.5 27,19 27,15 Z');
  fill(ctx, hood, '#0e071b');
  for (const x of [31.6, 37]) {
    glow(ctx, x, 14.6, 2.6, '#ff5000', { core: '#ffeb57' });
    fill(ctx, P(ctx, `M${x - 1.3},14.6 C${x - 0.4},13.6 ${x + 0.8},13.6 ${x + 1.4},14.4 C${x + 0.6},15.4 ${x - 0.6},15.4 ${x - 1.3},14.6 Z`), '#ffc825');
  }
  stroke(ctx, [[25.4, 13], [27.5, 6.8], [33, 4.4]], 1.2, '#b4b4b4');
  // Mãos esqueléticas cinzentas, de dedos longos e curvos, saindo das mangas.
  const reach = at ? 6 : Math.sin(ph) * 1.4;
  for (const [sx, sy, far] of [[43, 24, true], [39, 30, false]]) {
    const sleeve = P(ctx, `M${sx - 5},${sy - 2} C${sx},${sy - 4} ${sx + 4 + reach * 0.4},${sy - 2} ${sx + 5 + reach * 0.5},${sy + 1} C${sx + 3},${sy + 3.6} ${sx - 2},${sy + 4} ${sx - 5},${sy + 3} Z`);
    shade(ctx, sleeve, far ? ASH.slice(0, 5) : ASH, [sx - 5, sy - 4, 11, 8], { ao: 0.3 });
    const hx = sx + 5 + reach;
    const hy = sy + 0.5;
    shade(ctx, ell(ctx, hx, hy, 2.2, 1.8), ['#494834', '#775c5b', '#918275', '#b4b4b4'], [hx - 2.2, hy - 2, 4.4, 4], { ao: 0 });
    for (let i = 0; i < 4; i += 1) {
      const a = -0.5 + i * 0.32;
      const k = [hx + 1.8 + Math.cos(a) * 2.6, hy + Math.sin(a) * 2.6];
      const tip = [k[0] + Math.cos(a + 0.9) * 2.6, k[1] + Math.sin(a + 0.9) * 2.6];
      stroke(ctx, [[hx + 1, hy + (i - 1.5) * 0.6], k, tip], 0.75, far ? '#775c5b' : '#918275');
    }
  }
  // Cinzas e brasas subindo.
  for (let i = 0; i < 7; i += 1) {
    const x = 12 + rand(i * 4.7) * 42;
    const y = 4 + ((rand(i * 1.9) * 46 - f * 4 + 60) % 46);
    fill(ctx, ell(ctx, x, y, 0.6, 0.6), i % 3 === 0 ? '#ffa214' : i % 3 === 1 ? '#ff5000' : '#858585');
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Ceifador de Almas
const ROBE = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392'];
const SKULL = ['#494834', '#918275', '#b4b4b4', '#f9e6cf', '#ffffff'];

function soulReaper(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0 : Math.sin(ph) * 1.4;
  ctx.save();
  ctx.translate(0, bob - 1);
  // Almas verdes girando.
  const souls = [0, 2.1, 4.2].map((a) => [32 + Math.cos(ph + a) * 22, 32 + Math.sin(ph + a) * 6]);
  const soul = ([x, y], back) => {
    if (back) return;
    stroke(ctx, [[x, y], [x - 2.4, y + 1.2], [x - 4.4, y + 0.4]], 1.2, hexA('#5ac54f', 0.9));
    fill(ctx, ell(ctx, x, y, 1.6, 1.6), '#99e65f');
    fill(ctx, ell(ctx, x - 0.4, y - 0.4, 0.7, 0.7), '#d3fc7e');
  };
  // Foice: cabo longo e lâmina curva com fio verde.
  const handTop = at ? [38, 27] : [41, 31];
  const angle = at ? 1.2 : -0.42 + Math.sin(ph) * 0.05;
  ctx.save();
  ctx.translate(handTop[0], handTop[1]);
  ctx.rotate(angle);
  shade(ctx, P(ctx, 'M-1,-21 L1,-21 L1,29 L-1,29 Z'), C.wood, [-1, -21, 2, 50], { lx: 0.2, ly: 0.5, ao: 0 });
  for (const y of [-14, 4]) fill(ctx, P(ctx, `M-1.4,${y} L1.4,${y} L1.4,${y + 1.4} L-1.4,${y + 1.4} Z`), '#657392');
  const blade = P(ctx, 'M0,-20.5 C8,-27.5 20,-26 27,-15 C20,-21 11,-21.4 3,-15.6 L0,-16.4 Z');
  shade(ctx, blade, C.steel.slice(1, 7), [0, -27, 27, 12], { lx: 0.4, ly: 0.1, ao: 0.2 });
  stroke(ctx, [[3, -15.8], [11, -20.6], [20, -20.4], [26.6, -15.4]], 0.8, '#99e65f');
  glow(ctx, 17, -20, 3.6, '#5ac54f', { alpha: 0.6 });
  fill(ctx, ell(ctx, 0, -18.4, 1.8, 2.2), '#424c6e');
  ctx.restore();
  // Manto preto com capuz e barra em farrapos.
  const hem = ragHem(51, ph, 6, 16, 46, 5, at);
  let d = 'M23,15 C23,6 28,3 32.5,3 C37.5,3 42,6.5 42,15 C43,25 45,36 46.5,47 ';
  for (let i = hem.length - 1; i >= 0; i -= 1) {
    const [x, y] = hem[i];
    const prev = hem[i + 1] ?? [46.5, 47];
    d += `Q${(x + prev[0]) / 2},${Math.min(y, prev[1]) - 2} ${x},${y} `;
  }
  d += 'C16,38 19,25 23,15 Z';
  const robe = P(ctx, d);
  shade(ctx, robe, ROBE, [16, 3, 31, 54], { lx: 0.35, ly: 0.12, ao: 0.5 });
  inside(ctx, robe, () => {
    for (const [x0, x1] of [[25, 21], [31, 30], [38, 41]]) stroke(ctx, [[x0, 24], [(x0 + x1) / 2 - 0.5, 38], [x1, 54]], 1.2, '#0e071b');
    stroke(ctx, [[26, 22], [25, 36]], 0.8, '#657392');
    const g = ctx.createLinearGradient(0, 42, 0, 56);
    g.addColorStop(0, hexA('#1e6f50', 0));
    g.addColorStop(1, hexA('#33984b', 0.5));
    ctx.fillStyle = g;
    ctx.fillRect(14, 42, 36, 16);
  });
  // Rosto de caveira no capuz, com órbitas verdes.
  const hood = P(ctx, 'M26.5,15.6 C26.5,10 29.5,7.6 33.6,7.6 C37.6,7.6 40.4,10.4 40.2,15.8 C40,20 37.2,22.4 33.4,22.4 C29.6,22.4 26.5,20 26.5,15.6 Z');
  fill(ctx, hood, '#0e071b');
  const skull = P(ctx, 'M28.6,15 C28.6,11 31,9.4 34,9.4 C37,9.4 39.2,11.2 39,15 C38.9,17 38,18.2 37,18.6 L36.6,20.6 L31.2,20.6 L30.8,18.6 C29.4,18 28.6,16.8 28.6,15 Z');
  shade(ctx, skull, SKULL, [28.5, 9.4, 11, 11.4], { lx: 0.3, ly: 0.15, ao: 0.3 });
  for (const x of [31.6, 36]) {
    fill(ctx, ell(ctx, x, 14.6, 1.6, 1.7), '#0e071b');
    glow(ctx, x + 0.2, 14.7, 1.4, '#5ac54f', { core: '#d3fc7e' });
  }
  fill(ctx, P(ctx, 'M33.6,16.6 l0.8,1.4 l-1.6,0 Z'), '#1c121c');
  for (let i = 0; i < 4; i += 1) stroke(ctx, [[31.8 + i * 1.3, 19.2], [31.8 + i * 1.3, 20.4]], 0.45, '#494834');
  stroke(ctx, [[24.6, 14], [26.8, 7.4], [32, 4.6]], 1.1, '#657392');
  // Mãos ossudas no cabo.
  const grip = (t) => [handTop[0] + Math.sin(-angle) * -t, handTop[1] + Math.cos(angle) * t];
  for (const [t, sleeveFrom] of [[0, [38, 24]], [12, [26, 30]]]) {
    const [x, y] = grip(t);
    shade(ctx, limb(ctx, sleeveFrom, [x - 1, y], 5, 4), ROBE, [Math.min(sleeveFrom[0], x) - 3, Math.min(sleeveFrom[1], y) - 3, 16, 10], { ao: 0.2 });
    shade(ctx, ell(ctx, x, y, 1.9, 1.7), SKULL, [x - 2, y - 2, 4, 4], { ao: 0 });
    stroke(ctx, [[x - 0.6, y - 1.2], [x + 1.4, y - 0.2]], 0.5, '#494834');
  }
  souls.forEach((s) => soul(s, s[1] < 32 && !at));
  if (at) stroke(ctx, [[50, 6], [61, 20], [58, 40]], 1.1, hexA('#d3fc7e', 0.75));
  ctx.restore();
}

// ---------------------------------------------------------------- Senhor do Abismo (chefe)
const DEMON = ['#1c121c', '#391f21', '#571c27', '#891e2b', '#c42430', '#ea323c'];
const WING = ['#0e071b', '#1c121c', '#3b1443', '#571c27', '#891e2b'];

function wingPath(ctx, s, flap) {
  // s = 1 (direita) ou -1 (esquerda); dedos da asa abertos, membrana com bordas recortadas em arco.
  const sx = 32 + s * 6;
  const sy = 20;
  const lift = flap * 4;
  const tips = [[32 + s * 30, 3 - lift], [32 + s * 31, 16 - lift * 0.6], [32 + s * 27, 29 - lift * 0.3], [32 + s * 16, 36]];
  const elbow = [32 + s * 19, 6 - lift * 0.8];
  let d = `M${sx},${sy} L${elbow[0]},${elbow[1]} L${tips[0][0]},${tips[0][1]} `;
  for (let i = 1; i < tips.length; i += 1) {
    const [px, py] = tips[i - 1];
    const [x, y] = tips[i];
    const mx = (px + x) / 2 - s * 3.5;
    const my = (py + y) / 2 - 1;
    d += `Q${mx},${my} ${x},${y} `;
  }
  d += `Q${32 + s * 9},33 ${sx},${sy + 12} Z`;
  return { path: P(ctx, d), elbow, tips, root: [sx, sy] };
}

function abyssLord(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const flap = at ? 1 : Math.sin(ph);
  const bob = at ? 0 : -Math.abs(Math.sin(ph)) * 0.8;
  ctx.save();
  ctx.translate(0, bob);
  // Asas de morcego atrás do corpo.
  for (const s of [-1, 1]) {
    const w = wingPath(ctx, s, flap);
    shade(ctx, w.path, WING, [s > 0 ? 32 : 0, 0, 32, 38], { lx: s > 0 ? 0.3 : 0.7, ly: 0.2, ao: 0.4 });
    inside(ctx, w.path, () => {
      for (const t of w.tips) stroke(ctx, [w.elbow, [(w.elbow[0] + t[0]) / 2 + s, (w.elbow[1] + t[1]) / 2 + 1.5], t], 0.6, hexA('#c42430', 0.6));
    });
    stroke(ctx, [w.root, w.elbow], 2.2, '#1c121c');
    stroke(ctx, [w.root, w.elbow], 0.9, '#571c27');
    for (const t of w.tips) stroke(ctx, [w.elbow, t], 1, '#1c121c');
    fill(ctx, horn(ctx, w.elbow, [w.elbow[0] + s * 1, w.elbow[1] - 2], [w.elbow[0] + s * 0.4, w.elbow[1] - 3.6], 1.6), '#cba36f');
  }
  // Cauda com ponta em pá.
  const tw = Math.sin(ph) * 2;
  stroke(ctx, [[28, 42], [18, 48], [10 + tw, 50], [6 + tw, 46]], 2, '#391f21');
  stroke(ctx, [[28, 41.6], [18, 47.4], [10 + tw, 49.4]], 0.7, '#891e2b');
  fill(ctx, P(ctx, `M${6 + tw},46 C${3 + tw},44 ${2 + tw},41.6 ${4 + tw},40.4 C${5.4 + tw},42 ${7.6 + tw},42.6 ${8.6 + tw},43.6 Z`), '#571c27');
  // Pernas de bode com cascos.
  for (const [x, s, ramp] of [[36, -1, DEMON.slice(0, 5)], [28, 1, DEMON]]) {
    const a = at ? s * 0.25 : Math.sin(ph) * s * 0.25;
    const knee = [x + 2 + Math.sin(a) * 4, 48];
    const hock = [knee[0] - 2, 53];
    const foot = [hock[0] + 1 + Math.sin(a) * 2, 58.2 - bob];
    shade(ctx, limb(ctx, [x, 40], knee, 6.5, 4.6), ramp, [x - 4, 39, 10, 10], { ao: 0.3 });
    shade(ctx, limb(ctx, knee, hock, 4.2, 3.2), ramp, [hock[0] - 2, knee[1] - 2, 7, 8], { ao: 0.3 });
    shade(ctx, limb(ctx, hock, foot, 3.2, 3), ramp, [foot[0] - 2, hock[1], 5, 6], { ao: 0.4 });
    shade(ctx, P(ctx, `M${foot[0] - 2},${foot[1] - 1.2} C${foot[0]},${foot[1] - 2.6} ${foot[0] + 3},${foot[1] - 2} ${foot[0] + 3.4},${foot[1] + 0.6} L${foot[0] - 2.2},${foot[1] + 0.6} Z`), ['#0e071b', '#1c121c', '#2a2f4e'], [foot[0] - 2, foot[1] - 3, 6, 4], { ao: 0 });
  }
  // Saiote de placas com barra dourada.
  const skirt = P(ctx, 'M23,38 C28,40 36,40 41,38 L43,46 C40,47.4 37,46.4 35.5,47.8 C33.6,46.6 30.4,46.6 28.5,47.8 C27,46.4 24,47.4 21,46 Z');
  // Saiote de couro vinho-escuro com barra rasgada em pontas (no lugar das placas cinza).
  shade(ctx, skirt, ['#0e071b', '#1c121c', '#3b1443', '#571c27', '#891e2b'], [21, 38, 22, 10], { ao: 0.3 });
  inside(ctx, skirt, () => {
    for (const x of [25, 29, 35, 39]) stroke(ctx, [[x, 40.5], [x + 0.4, 44], [x - 0.2, 47]], 0.8, '#1c121c');
    for (const x of [26.4, 37.2]) stroke(ctx, [[x, 41], [x + 0.3, 44]], 0.6, '#891e2b');
  });
  // Cinto de couro preto com fivela de caveira dourada e tachas.
  shade(ctx, P(ctx, 'M22.2,39.6 C28,41.6 36,41.6 41.8,39.6 L42.2,42.8 C36,44.6 28,44.6 21.8,42.8 Z'), ['#0e071b', '#1c121c', '#391f21', '#5d2c28'], [22, 39.5, 20, 5], { ao: 0 });
  for (const x of [25, 28.4, 35.6, 39]) fill(ctx, ell(ctx, x, 42.2 - Math.abs(x - 32) * 0.08, 0.75, 0.75), '#ffc825');
  shade(ctx, ell(ctx, 32, 42.4, 2.4, 2.1), C.gold, [29.6, 40.3, 4.8, 4.2], { ao: 0 });
  fill(ctx, ell(ctx, 31.2, 42.2, 0.6, 0.6), '#1c121c');
  fill(ctx, ell(ctx, 32.8, 42.2, 0.6, 0.6), '#1c121c');
  shade(ctx, P(ctx, `M28.5,40 C30.5,40.6 33.5,40.6 35.5,40 L${35 + Math.sin(ph) * 0.8},50 C33,51 31,51 ${29 + Math.sin(ph) * 0.8},50 Z`), C.wine.slice(0, 5), [28, 40, 8, 11], { ao: 0.3 });
  stroke(ctx, [[29, 49.6], [32, 50.4], [35, 49.6]], 0.8, '#edab50');
  // Tronco musculoso com veias de lava e runa no peito.
  const torso = P(ctx, 'M21.5,22 C22,17 27,15 32,15 C37,15 42,17 42.5,22 C43,28 41.5,34 40,39 C35,40.6 29,40.6 24,39 C22.5,34 21,28 21.5,22 Z');
  shade(ctx, torso, DEMON, [21, 15, 22, 26], { lx: 0.35, ly: 0.2, ao: 0.35 });
  inside(ctx, torso, () => {
    stroke(ctx, [[25.5, 24.5], [29.5, 26.5], [32, 25], [34.5, 26.5], [38.5, 24.5]], 0.7, '#391f21');
    for (const y of [30, 33.4]) stroke(ctx, [[28, y], [30, y + 0.6], [32, y], [34, y + 0.6], [36, y]], 0.6, '#571c27');
    stroke(ctx, [[32, 26.5], [32, 38]], 0.6, '#391f21');
    for (const v of [[[23, 30], [25, 34], [24.4, 37]], [[41, 28], [39.6, 33], [40, 36]]]) stroke(ctx, v, 0.6, '#ff5000');
  });
  glow(ctx, 32, 21.6, 3, '#ffa214', { core: '#ffeb57' });
  stroke(ctx, [[30.4, 20.4], [32, 23.4], [33.6, 20.4]], 0.6, '#ffeb57');
  // Braço de lá: punho em chamas.
  const fistF = at ? [46, 26] : [45 + Math.sin(ph) * 0.8, 34];
  shade(ctx, limb(ctx, [41, 20], [44.4, 27.4], 6, 5), DEMON.slice(0, 5), [38, 18, 10, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, [44.4, 27.4], fistF, 5, 4.6), DEMON.slice(0, 5), [40, 25, 10, 12], { ao: 0.2 });
  shade(ctx, P(ctx, `M${fistF[0] - 2.8},${fistF[1] - 3.6} L${fistF[0] + 2.8},${fistF[1] - 3.6} L${fistF[0] + 2.4},${fistF[1] - 1} L${fistF[0] - 2.4},${fistF[1] - 1} Z`), IRON, [fistF[0] - 3, fistF[1] - 4, 6, 3], { ao: 0 });
  shade(ctx, ell(ctx, fistF[0], fistF[1] + 0.6, 2.6, 2.2), DEMON, [fistF[0] - 3, fistF[1] - 2, 6, 5], { ao: 0.2 });
  glow(ctx, fistF[0] + 1, fistF[1] - 1, 3.4, '#ff5000', { core: '#ffc825', alpha: 0.9 });
  // Ombreiras de ferro com borda dourada.
  for (const [x, y] of [[22, 19.5], [42, 19.5]]) {
    shade(ctx, ell(ctx, x, y, 5, 3.8), IRON, [x - 5, y - 4, 10, 8], { ao: 0.3 });
    stroke(ctx, [[x - 4.4, y + 1.6], [x, y + 3.6], [x + 4.4, y + 1.6]], 0.8, '#edab50');
  }
  // Cabeça: chifres grandes curvados para trás, coroa, olhos acesos e presas.
  const hx = 32;
  const hy = 10.5;
  for (const s of [-1, 1]) {
    const hornP = P(ctx, `M${hx + s * 3},${hy - 3.4} C${hx + s * 7},${hy - 8} ${hx + s * 12},${hy - 8} ${hx + s * 14.5},${hy - 13}
      C${hx + s * 13.4},${hy - 7.4} ${hx + s * 10},${hy - 3.6} ${hx + s * 5.4},${hy - 0.8} Z`);
    shade(ctx, hornP, HORN, [hx + (s > 0 ? 3 : -15), hy - 13, 12, 12], { lx: s > 0 ? 0.3 : 0.7, ly: 0.3, ao: 0.2 });
    for (const t of [0.3, 0.5, 0.7]) stroke(ctx, [[hx + s * (3.6 + t * 10), hy - 2.6 - t * 7], [hx + s * (4.6 + t * 10), hy - 1.4 - t * 7]], 0.5, '#775c5b');
  }
  const head = P(ctx, `M${hx - 4.8},${hy - 1} C${hx - 5},${hy - 6} ${hx + 5},${hy - 6} ${hx + 4.8},${hy - 1} C${hx + 4.8},${hy + 3} ${hx + 3},${hy + 5.6} ${hx},${hy + 5.6} C${hx - 3},${hy + 5.6} ${hx - 4.8},${hy + 3} ${hx - 4.8},${hy - 1} Z`);
  shade(ctx, head, DEMON, [hx - 5, hy - 6, 10, 12], { ao: 0.3 });
  // Coroa de ouro com rubi.
  const crown = P(ctx, `M${hx - 4.6},${hy - 3.4} L${hx - 4.4},${hy - 6.4} L${hx - 2.6},${hy - 4.8} L${hx},${hy - 7.4} L${hx + 2.6},${hy - 4.8} L${hx + 4.4},${hy - 6.4} L${hx + 4.6},${hy - 3.4} C${hx + 2},${hy - 2.4} ${hx - 2},${hy - 2.4} ${hx - 4.6},${hy - 3.4} Z`);
  shade(ctx, crown, C.gold, [hx - 5, hy - 7.5, 10, 5], { ao: 0 });
  fill(ctx, ell(ctx, hx, hy - 4.2, 0.9, 0.9), '#ea323c');
  stroke(ctx, [[hx - 3.6, hy - 0.8], [hx - 1, hy], [hx + 1, hy], [hx + 3.6, hy - 0.8]], 0.9, '#1c121c');
  for (const x of [hx - 1.9, hx + 1.9]) glow(ctx, x, hy + 0.8, 1.6, '#ffc825', { core: '#ffeb57' });
  fill(ctx, P(ctx, `M${hx - 2.2},${hy + 3.2} C${hx - 1},${hy + 4.2} ${hx + 1},${hy + 4.2} ${hx + 2.2},${hy + 3.2} L${hx + 1.6},${hy + 4.6} L${hx - 1.6},${hy + 4.6} Z`), '#1c121c');
  for (const s of [-1, 1]) fill(ctx, P(ctx, `M${hx + s * 1.6},${hy + 3.4} l${s * 0.5},0 l${-s * 0.25},1.3 Z`), '#ffffff');
  // Braço de cá: espada flamejante enorme.
  const handN = at ? [30, 22] : [19 - Math.sin(ph) * 0.8, 31];
  const swordA = at ? -0.2 : -1.85 + Math.sin(ph) * 0.06;
  shade(ctx, limb(ctx, [22.5, 20.5], [19.6, 26.6], 6, 5), DEMON, [16, 18, 10, 12], { ao: 0.2 });
  shade(ctx, limb(ctx, [19.6, 26.6], handN, 5, 4.6), DEMON, [Math.min(handN[0], 19.6) - 3, Math.min(handN[1], 26.6) - 3, 16, 10], { ao: 0.2 });
  ctx.save();
  ctx.translate(handN[0], handN[1]);
  ctx.rotate(swordA);
  const blade = P(ctx, 'M3,-1.8 L24,-1.4 C26.5,-0.8 28,0 29,0.4 C27.6,1.2 26,1.6 24,1.8 L3,1.8 Z');
  shade(ctx, blade, ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e'], [3, -2, 26, 4], { lx: 0.2, ly: 0, ao: 0 });
  stroke(ctx, [[4, -1.3], [24, -1], [28.4, 0.2]], 0.6, '#ff5000');
  stroke(ctx, [[4, 1.3], [24, 1.3], [28.4, 0.6]], 0.5, '#ffa214');
  for (let i = 0; i < 5; i += 1) {
    const x = 7 + i * 4.6;
    const h = 2.4 + rand(i + f * 3) * 2.2;
    fill(ctx, P(ctx, `M${x - 1.4},-1.6 C${x - 1},${-1.6 - h} ${x + 1.2},${-1.4 - h * 0.6} ${x + 1.8},${-1.6 - h * 1.2} C${x + 1.6},${-1.6 - h * 0.4} ${x + 1.2},-1.8 ${x + 1.2},-1.6 Z`), i % 2 ? '#ff5000' : '#ffa214');
  }
  shade(ctx, P(ctx, 'M1.6,-4.2 L3.2,-4.2 L3.2,4.2 L1.6,4.2 Z'), C.gold, [1.5, -4.2, 2, 8.4], { ao: 0 });
  fill(ctx, P(ctx, 'M-3.6,-1 L1.6,-1 L1.6,1 L-3.6,1 Z'), '#391f21');
  fill(ctx, ell(ctx, -4, 0, 1.2, 1.2), '#ea323c');
  ctx.restore();
  shade(ctx, ell(ctx, handN[0], handN[1], 2.6, 2.2), DEMON, [handN[0] - 3, handN[1] - 2, 6, 5], { ao: 0.2 });
  if (at) stroke(ctx, [[34, 2], [56, 8], [62, 24]], 1, hexA('#ffc825', 0.8));
  ctx.restore();
}

export const MONSTERS_C = {
  djinn: { size: 56, elite: 64, shadow: [29, 59.5, 10, 2], paint: djinn },
  voidStalker: { size: 54, elite: 62, shadow: [33, 58.5, 22, 3], paint: voidStalker },
  hellWarden: { size: 56, elite: 64, shadow: [32, 58.5, 15, 3], paint: hellWarden },
  ashWraith: { size: 50, elite: 58, shadow: [32, 60, 13, 2.2], paint: ashWraith },
  soulReaper: { size: 56, elite: 64, shadow: [32, 60, 14, 2.4], paint: soulReaper },
  abyssLord: { size: 112, elite: 112, shadow: [32, 59, 16, 2.6], paint: abyssLord }
};
