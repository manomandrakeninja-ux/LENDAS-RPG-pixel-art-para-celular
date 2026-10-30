// Lote 1 (continuação): javali, aranha, fantasma, lobisomem e golem/titã de magma.
import { C, P, ell, fill, fur, glow, hexA, horn, inside, limb, phaseOf, rand, shade, stroke } from './kit.mjs';
import { leg } from './lote1.mjs';

// ---------------------------------------------------------------- Javali
const BOAR = ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'];
const BOAR_FAR = ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#8a4836'];

function boar(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? 0.5 : Math.cos(ph * 2) * 0.7;
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  const sw = (off) => at ? 0 : Math.sin(ph + off) * 0.4;
  const lf = (off) => at ? 0 : Math.max(0, Math.sin(ph + off + Math.PI / 2));
  const legOpts = (ramp, hock) => ({ upper: 6.5, lower: 7.5, wTop: 6.5, wMid: 3.8, wPaw: 3.2, ramp, hock, paw: '#0e071b' });
  leg(ctx, [17, 42], at ? -0.6 : sw(Math.PI), { ...legOpts(BOAR_FAR, true), lift: lf(Math.PI) });
  leg(ctx, [41, 43], at ? 0.5 : sw(0), { ...legOpts(BOAR_FAR, false), lift: lf(0) });
  // Rabo enrolado.
  stroke(ctx, [[10, 30], [7, 29], [6.5, 32], [8.5, 33]], 1.2, '#391f21');
  // Corpo em barril com corcova alta nos ombros.
  const body = P(ctx, `M10,34 C9,26 15,22 23,21 C30,20 34,15 41,15.5 C47,16 50,22 51,30
    C52,38 48,46 41,46 C34,47 24,47 17,46 C11,45 10,40 10,34 Z`);
  shade(ctx, body, BOAR, [9, 15, 43, 32], { lx: 0.45, ly: 0.12, ao: 0.5 });
  inside(ctx, body, () => {
    fill(ctx, P(ctx, 'M12,40 C20,44 34,45 50,40 L52,50 L10,50 Z'), hexA('#391f21', 0.55));
    fur(ctx, [14, 28], [46, 22], 12, 3.2, '#391f21', 0.8, { dx: -0.9, dy: 0.7, seed: 7 });
    fur(ctx, [16, 34], [44, 32], 9, 2.8, '#8a4836', 0.6, { dx: -0.9, dy: 0.7, seed: 17 });
    // Rodada 3: lama seca na barriga (2 tons), cicatriz rosada e pelos grisalhos no lombo.
    for (const [x, y, r] of [[19, 43, 3.2], [27, 44.4, 2.6], [36, 44, 3], [44, 42.6, 2.2]]) {
      fill(ctx, ell(ctx, x, y, r, r * 0.6), '#4e3434');
      fill(ctx, ell(ctx, x - r * 0.3, y - r * 0.2, r * 0.5, r * 0.3), '#7a5d4c');
    }
    stroke(ctx, [[30, 27], [34, 30.4], [37, 29]], 1.3, '#c64524');
    stroke(ctx, [[30.4, 26.6], [34, 29.8]], 0.6, '#f68187');
    fur(ctx, [24, 23], [40, 18], 6, 2.2, '#9a8c80', 0.7, { dx: -0.9, dy: 0.7, seed: 29 });
  });
  // Crina escura e eriçada ao longo do dorso, da nuca até o meio das costas.
  const mane = P(ctx, 'M17,24 C20,20.6 24,19.4 27,17.6 C31,14.6 35,12 40,11.6 C44.6,11.4 47.6,13.6 48.4,17.6 C44,18 38,19.6 32,22.2 C26,24.6 21,25.6 17,24 Z');
  shade(ctx, mane, ['#0e071b', '#1c121c', '#391f21', '#5d2c28'], [17, 11, 32, 15], { lx: 0.5, ly: 0.1, ao: 0 });
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    const x = 21 + t * 26;
    const y = 23 - Math.sin(t * Math.PI * 0.85) * 7 + (t > 0.85 ? 2 : 0);
    if (i % 2 === 0) stroke(ctx, [[x + 1.5, y], [x - 0.4, y - 2.4], [x - 2.2, y - 3.2]], 2.2, '#1c121c');
  }
  leg(ctx, [16, 42], at ? 0.45 : sw(0), { ...legOpts(BOAR, true), lift: lf(0) });
  leg(ctx, [42, 44], at ? -0.3 : sw(Math.PI), { ...legOpts(BOAR, false), lift: lf(Math.PI) });
  // Cabeça em cunha, baixa, com focinho e presas.
  ctx.save();
  if (at) { ctx.translate(48, 32); ctx.rotate(0.18); ctx.translate(-48, -32); }
  const head = P(ctx, `M42,19 C48,16.5 53,19.5 56,24 C58,27.5 60.5,30.5 62.6,32.6 C63.6,35.6 62,38.6 58.6,39.2
    C53,40 47,39.4 43.5,36 C40,32 39.6,23 42,19 Z`);
  shade(ctx, head, BOAR, [39, 16.5, 25, 23], { lx: 0.35, ly: 0.15, ao: 0.45 });
  inside(ctx, head, () => {
    // Focinho mais claro e máscara escura em volta do olho.
    fill(ctx, P(ctx, 'M51,28 C55,27.6 59,29.6 63,32 L63,40 L50,40 Z'), hexA('#8a4836', 0.8));
    fill(ctx, ell(ctx, 50.6, 27, 4.2, 2.8, 0.3), hexA('#1c121c', 0.55));
    fur(ctx, [44, 22], [44, 34], 4, 2.6, '#391f21', 0.7, { dx: -1, dy: 0.4, seed: 41 });
  });
  // Disco do focinho rosado com narinas.
  const snout = ell(ctx, 62.4, 35.4, 1.9, 3.2, -0.1);
  shade(ctx, snout, ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a'], [60, 32, 5, 7], { ao: 0 });
  fill(ctx, ell(ctx, 62.8, 34.4, 0.45, 0.7), '#391f21');
  fill(ctx, ell(ctx, 62.6, 36.6, 0.45, 0.7), '#391f21');
  // Presa grande, curva para cima e para trás.
  const tusk = horn(ctx, [53.6, 39.4], [60, 41.2], [58.4, 29.2], 3.6);
  ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#0e071b'; ctx.stroke(tusk); ctx.restore();
  shade(ctx, tusk, ['#918275', '#cba36f', '#f9e6cf', '#ffffff'], [54, 28, 8, 13], { lx: 0.2, ly: 0.2, ao: 0 });
  stroke(ctx, [[48.6, 37.4], [53, 38.6], [56, 38.8]], 0.8, '#1c121c');
  // Orelha virada para trás.
  const ear = horn(ctx, [45, 20.4], [42, 14.6], [38.6, 13.6], 4.6);
  shade(ctx, ear, BOAR, [38, 13, 8, 8], { ao: 0 });
  fill(ctx, horn(ctx, [44.4, 20], [42.2, 16.4], [40.2, 15.4], 1.8), '#8a4836');
  // Olhinho vermelho bravo sob a sobrancelha.
  fill(ctx, ell(ctx, 51, 26.8, 1.4, 1.1), '#0e071b');
  fill(ctx, ell(ctx, 51.5, 26.6, 0.6, 0.55), '#ea323c');
  stroke(ctx, [[48.4, 24.6], [51.4, 25], [53.8, 26.6]], 1.1, '#0e071b');
  stroke(ctx, [[45, 21], [51, 21.6], [57, 26.6]], 0.8, '#bf6f4a');
  ctx.restore();
  if (at) for (const [x, y, r] of [[8, 54, 2.4], [4, 51, 1.6], [11, 50.5, 1.3]]) fill(ctx, ell(ctx, x, y, r, r * 0.8), hexA('#cba36f', 0.85));
  ctx.restore();
}

// ---------------------------------------------------------------- Aranha
const SPIDER = ['#0e071b', '#1a1932', '#2a2f4e', '#3b1443', '#622461'];
const SPIDER_LEG = ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e'];

function spiderLeg(ctx, base, knee, tip, w, ramp, band) {
  const a = limb(ctx, base, knee, w, w * 0.8);
  shade(ctx, a, ramp, [Math.min(base[0], knee[0]) - 2, knee[1] - 2, Math.abs(knee[0] - base[0]) + 4, Math.abs(base[1] - knee[1]) + 4], { ao: 0 });
  const b = limb(ctx, knee, tip, w * 0.8, w * 0.35);
  shade(ctx, b, ramp, [Math.min(tip[0], knee[0]) - 2, knee[1] - 2, Math.abs(knee[0] - tip[0]) + 4, Math.abs(tip[1] - knee[1]) + 4], { ao: 0.3 });
  // Faixa laranja na articulação (tarântula) e pelos.
  fill(ctx, ell(ctx, knee[0], knee[1], w * 0.62, w * 0.62), band);
  const mx = (knee[0] + tip[0]) / 2;
  const my = (knee[1] + tip[1]) / 2;
  stroke(ctx, [[mx, my], [mx + (tip[0] > knee[0] ? 1.2 : -1.2), my - 0.6]], 0.5, '#424c6e');
}

function spider(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -2 : Math.cos(ph * 2) * 0.6;
  // Pontas das 8 patas (lado de lá primeiro), alternando em dois grupos.
  const legsFar = [[37, 37, 30, 24, 16, 55], [39, 36.5, 37, 21, 28, 56], [41, 36.5, 45, 21, 47, 56], [43, 37, 52, 24, 60, 54]];
  const legsNear = [[36, 42, 26, 31, 13, 58], [38.5, 43, 33, 30, 24, 59], [41.5, 43, 47, 30, 44, 59.5], [44, 42, 55, 31, 59, 58.5]];
  const move = (i, side) => {
    const group = (i + side) % 2 === 0 ? 0 : Math.PI;
    return at ? 0 : Math.sin(ph + group);
  };
  ctx.save();
  ctx.translate(0, bob);
  legsFar.forEach(([bx, by, kx, ky, tx, ty], i) => {
    const m = move(i, 0);
    const raise = at && i === 3 ? [8, -14] : [0, 0];
    spiderLeg(ctx, [bx, by], [kx + m * 1.5, ky - Math.max(0, m) * 2 + raise[1] * 0.6], [tx + m * 2.5 + raise[0], ty - bob - Math.max(0, m) * 2 + raise[1]], 2.1, SPIDER_LEG, '#5d2c28');
  });
  // Abdômen grande com a marca vermelha, cefalotórax e cabeça.
  const abdomen = ell(ctx, 22, 36, 14, 11, -0.18);
  shade(ctx, abdomen, SPIDER, [8, 25, 28, 22], { lx: 0.35, ly: 0.2, ao: 0.4 });
  inside(ctx, abdomen, () => {
    fill(ctx, P(ctx, 'M15,30 C18,28 22,29 24,31 C22,33 22,35 24,38 C21,40 17,40 15,38 C17,35 17,33 15,30 Z'), '#c42430');
    fill(ctx, P(ctx, 'M16.5,31.5 C18.5,30.5 20.5,31 21.5,32 C20,33 20,35 21.5,36.5 C19.5,37.6 17.6,37.4 16.5,36.5 Z'), '#ea323c');
    for (const [x, y] of [[29, 30], [31, 34], [28, 39], [11, 33], [12, 40]]) fill(ctx, ell(ctx, x, y, 1.2, 0.9), '#622461');
    stroke(ctx, [[12, 28], [18, 25.6], [26, 26]], 1.4, hexA('#657392', 0.9));
  });
  fur(ctx, [10, 42], [30, 46], 6, 1.8, '#2a2f4e', 0.6, { dx: 0, dy: 1, seed: 5 });
  const thorax = ell(ctx, 39.5, 40, 8, 6.2);
  shade(ctx, thorax, SPIDER, [31, 33, 17, 13], { ao: 0.35 });
  const head = ell(ctx, 46.5, 39, 4.8, 4.4);
  shade(ctx, head, SPIDER, [41, 34, 10, 10], { ao: 0.2 });
  // Olhos: 2 grandes e 4 pequenos, vermelhos com brilho.
  for (const [x, y, r] of [[48.2, 37.2, 1.25], [50.2, 37.8, 1.1], [46.6, 35.8, 0.7], [49.2, 35.5, 0.7], [47, 38.8, 0.55], [50.6, 39.6, 0.55]]) {
    fill(ctx, ell(ctx, x, y, r, r), '#ea323c');
    fill(ctx, ell(ctx, x - r * 0.35, y - r * 0.35, r * 0.4, r * 0.4), '#ffffff');
  }
  // Quelíceras com presas.
  const open = at ? 1.6 : 0;
  for (const [x, dir] of [[48, -1], [50.5, 1]]) {
    const fang = horn(ctx, [x, 41.5], [x + 0.8, 45 + open], [x + dir * (0.6 + open), 46.8 + open], 1.8);
    shade(ctx, fang, ['#1c121c', '#2a2f4e', '#c7cfdd'], [x - 1, 41, 3, 6], { ao: 0 });
  }
  legsNear.forEach(([bx, by, kx, ky, tx, ty], i) => {
    const m = move(i, 1);
    const raise = at && i === 3 ? [4, -16] : [0, 0];
    spiderLeg(ctx, [bx, by], [kx + m * 1.5, ky - Math.max(0, m) * 2.4 + raise[1] * 0.6], [tx + m * 3 + raise[0], ty - bob - Math.max(0, m) * 2.4 + raise[1]], 2.5, ['#1a1932', '#2a2f4e', '#424c6e', '#657392'], '#8a4836');
  });
  ctx.restore();
}

// ---------------------------------------------------------------- Fantasma
const GHOST = ['#424c6e', '#657392', '#9cc8e6', '#d5e8ef', '#ffffff'];

function ghost(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -1 : [0, -1.2, -2, -1.2][f];
  const lean = at ? 4 : 0;
  ctx.save();
  ctx.translate(lean, bob);
  // Barra ondulada com 4 pontas que balançam.
  const hem = [];
  for (let i = 0; i <= 4; i += 1) {
    const x = 15 + i * 8.5 - (at ? 3 : 0);
    hem.push([x, 50 + Math.sin(ph + i * 1.3) * 2.2 + (i % 2 ? -2.5 : 1.5)]);
  }
  let d = 'M18,22 C17,10 25,5 32,5 C40,5 47,10 47,22 C47,32 49,40 51,46 ';
  for (let i = hem.length - 1; i >= 0; i -= 1) {
    const [x, y] = hem[i];
    const prev = hem[i + 1] ?? [53, 47];
    d += `Q${(x + prev[0]) / 2},${y - 5.5} ${x},${y} `;
  }
  d += 'C14,44 17,32 18,22 Z';
  const body = P(ctx, d);
  shade(ctx, body, GHOST, [13, 5, 40, 48], { lx: 0.3, ly: 0.12, ao: 0.55 });
  inside(ctx, body, () => {
    const g = ctx.createLinearGradient(0, 38, 0, 54);
    g.addColorStop(0, hexA('#00cdf9', 0));
    g.addColorStop(1, hexA('#0098dc', 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(10, 36, 46, 20);
    stroke(ctx, [[22, 32], [21, 42], [19, 48]], 1, hexA('#9cc8e6', 0.9));
    stroke(ctx, [[42, 30], [44, 40]], 0.9, hexA('#9cc8e6', 0.9));
  });
  // Bracinhos erguidos.
  const armA = at ? -0.4 : Math.sin(ph) * 0.15;
  ctx.save();
  ctx.translate(45, 25);
  ctx.rotate(armA);
  const arm = P(ctx, 'M0,0 C4,-1 8,0 10,2.4 C11,4 9.5,5 8,4.4 C6,3.6 3,4.6 0,5 Z');
  shade(ctx, arm, GHOST, [0, -1, 11, 6], { ao: 0.3 });
  ctx.restore();
  const backArm = P(ctx, `M19,27 C15,27 11,29 9.5,${32 - armA * 4} C9,34 11,34.5 12.5,33.4 C14,32.5 16,32.4 18.5,33 Z`);
  shade(ctx, backArm, GHOST, [9, 27, 10, 8], { ao: 0.4 });
  // Rosto: olhos fundos inclinados e boca aberta.
  const eyeH = at ? 4.4 : 3.8;
  for (const [x, tilt] of [[29, 0.25], [38.5, -0.25]]) {
    fill(ctx, ell(ctx, x, 17, 2.6, eyeH, tilt), '#1a1932');
    glow(ctx, x + 0.4, 17.5, 1.5, '#00cdf9', { core: '#94fdff' });
  }
  fill(ctx, ell(ctx, 34.5, at ? 27 : 25.6, at ? 3.4 : 2.2, at ? 4 : 2.8), '#1a1932');
  fill(ctx, ell(ctx, 34.5, at ? 28.4 : 26.6, at ? 2 : 1.2, at ? 1.6 : 1), '#2a2f4e');
  // Brilho no topo da cabeça.
  stroke(ctx, [[22, 15], [24, 9.5], [29, 7.2]], 1.6, '#ffffff');
  ctx.restore();
}

// ---------------------------------------------------------------- Lobisomem
const WEREFUR = ['#1c121c', '#391f21', '#5d2c28', '#775c5b', '#918275'];
const WEREFUR_FAR = ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#775c5b'];
const CHEST = ['#5d2c28', '#775c5b', '#918275', '#cba36f'];

function werewolfLeg(ctx, hip, a, ramp, bob) {
  const knee = [hip[0] + 3 + Math.sin(a) * 6, hip[1] + 7];
  const hock = [knee[0] - 3.5 + Math.sin(a) * 2, knee[1] + 6.5];
  const foot = [hock[0] + 1 + Math.sin(a) * 2.5, Math.min(57.5 - bob, hock[1] + 5)];
  shade(ctx, limb(ctx, hip, knee, 8, 5.5), ramp, [hip[0] - 4, hip[1] - 2, 12, 11], { ao: 0.2 });
  shade(ctx, limb(ctx, knee, hock, 5, 3.5), ramp, [hock[0] - 3, knee[1] - 2, 9, 9], { ao: 0.4 });
  shade(ctx, limb(ctx, hock, foot, 3.4, 3), ramp, [foot[0] - 2, hock[1], 6, 7], { ao: 0.5 });
  const pawP = ell(ctx, foot[0] + 1.6, foot[1], 3.2, 1.6);
  shade(ctx, pawP, ramp, [foot[0] - 2, foot[1] - 2, 7, 4], { ao: 0.5 });
  for (const dx of [3.2, 4.6]) stroke(ctx, [[foot[0] + dx, foot[1]], [foot[0] + dx + 0.9, foot[1] + 0.8]], 0.7, '#cba36f');
}

function claws(ctx, x, y, dir = 1) {
  for (let i = 0; i < 3; i += 1) {
    const c = horn(ctx, [x + i * 1.2 * dir, y], [x + (i * 1.2 + 1.2) * dir, y + 2], [x + (i * 1.3 + 0.6) * dir, y + 3.6], 1);
    fill(ctx, c, '#f9e6cf');
  }
}

function werewolf(ctx, f, o) {
  const at = o.attack;
  const ph = phaseOf(f);
  const bob = at ? -0.5 : -Math.abs(Math.sin(ph)) * 1.4;
  const sw = at ? 0 : Math.sin(ph);
  ctx.save();
  ctx.translate(0, bob);
  // Braço de lá (atrás do corpo).
  const shF = [40, 22];
  const haF = at ? [52, 34] : [44 + sw * 4, 41];
  shade(ctx, limb(ctx, shF, [haF[0] - 1, (shF[1] + haF[1]) / 2], 6, 4.6), WEREFUR_FAR, [36, 20, 14, 16], { ao: 0.2 });
  shade(ctx, limb(ctx, [haF[0] - 1, (shF[1] + haF[1]) / 2], haF, 4.6, 4), WEREFUR_FAR, [haF[0] - 4, shF[1], 8, 22], { ao: 0.3 });
  claws(ctx, haF[0] - 1, haF[1] + 1.5);
  werewolfLeg(ctx, [33, 40], at ? 0.3 : -sw * 0.6, WEREFUR_FAR, bob);
  // Tronco curvado com peito largo.
  const torso = P(ctx, `M23,24 C23,17 29,14 36,14.5 C42,15 46,19 46,25 C46,31 42,37 38,42
    C34,44 27,44 24.5,41 C21.5,37 22,30 23,24 Z`);
  shade(ctx, torso, WEREFUR, [21, 14, 26, 30], { lx: 0.3, ly: 0.15, ao: 0.45 });
  inside(ctx, torso, () => {
    const chest = P(ctx, 'M32,21 C37,19.4 44,21 45,26 C45,31 41.6,36 37,38.6 C34,36 32,30 32,21 Z');
    shade(ctx, chest, ['#391f21', '#5d2c28', '#775c5b', '#918275'], [31, 19, 14, 20], { ao: 0.3 });
    fur(ctx, [34, 24], [40, 36], 6, 2.4, '#5d2c28', 0.6, { dx: -0.4, dy: 1, seed: 71 });
    stroke(ctx, [[37, 26], [38.5, 29.5], [42, 28]], 0.7, '#775c5b');
    stroke(ctx, [[35, 32], [37.5, 34.5], [41, 33]], 0.7, '#775c5b');
    fur(ctx, [25, 22], [27, 38], 6, 3, '#1c121c', 0.75, { dx: -0.5, dy: 0.9, seed: 13 });
  });
  // Calção roxo rasgado.
  const pants = P(ctx, `M24,37 C29,39.5 35,40 40,38.5 L41.5,43 L39.5,45 L38,43.6 L36.6,46.5 L34,44.2 L31.8,46.8 L29.6,44 L27,46.2 L25.4,43.6 L23.2,44.5 C22.8,41.5 23.2,39 24,37 Z`);
  shade(ctx, pants, ['#0e071b', '#3b1443', '#622461', '#93388f'], [22, 37, 20, 10], { ao: 0.3 });
  stroke(ctx, [[24.5, 38.2], [40, 39.2]], 1.2, '#391f21');
  werewolfLeg(ctx, [27, 41], at ? -0.5 : sw * 0.6, WEREFUR, bob);
  // Juba nos ombros.
  for (let i = 0; i < 7; i += 1) {
    const x = 24 + i * 2.6;
    const y = 16 - Math.sin(i / 6 * Math.PI) * 2;
    stroke(ctx, [[x + 2, y + 4], [x, y + 1], [x - 2.4, y - 0.6]], 2, i % 2 ? '#1c121c' : '#391f21');
  }
  // Cabeça de lobo com focinho, orelhas, olhos acesos e presas.
  const hx = 42;
  const hy = 13.5;
  ctx.save();
  ctx.translate(hx, hy + 2);
  ctx.scale(1.3, 1.3);
  ctx.translate(-hx, -hy - 2);
  const ears = [horn(ctx, [hx - 3, hy - 3], [hx - 5, hy - 8], [hx - 4, hy - 11.5], 4.4), horn(ctx, [hx + 1, hy - 4], [hx + 0.5, hy - 9], [hx + 2.5, hy - 12], 4.6)];
  shade(ctx, ears[0], WEREFUR_FAR, [hx - 7, hy - 12, 6, 9], { ao: 0 });
  shade(ctx, ears[1], WEREFUR, [hx - 1, hy - 12, 6, 9], { ao: 0 });
  fill(ctx, horn(ctx, [hx + 1.3, hy - 4.5], [hx + 1.3, hy - 8], [hx + 2.4, hy - 10], 1.8), '#775c5b');
  const jo = at ? 3 : 1;
  const jaw = P(ctx, `M${hx + 2},${hy + 3} C${hx + 6},${hy + 3.5} ${hx + 10},${hy + 3 + jo} ${hx + 13},${hy + 3.5 + jo} C${hx + 12.5},${hy + 6 + jo} ${hx + 8},${hy + 6.5 + jo} ${hx + 4},${hy + 6} Z`);
  shade(ctx, jaw, CHEST, [hx + 2, hy + 3, 12, 5], { ao: 0.3 });
  fill(ctx, P(ctx, `M${hx + 5},${hy + 2.6} L${hx + 13},${hy + 2.8} L${hx + 12.5},${hy + 3.6 + jo} L${hx + 5},${hy + 4} Z`), '#891e2b');
  for (const x of [7, 9.5, 12]) {
    fill(ctx, P(ctx, `M${hx + x},${hy + 2.6} l1,0 l-0.5,1.8 Z`), '#ffffff');
    fill(ctx, P(ctx, `M${hx + x - 0.8},${hy + 3.6 + jo} l1,0 l-0.5,-1.6 Z`), '#f9e6cf');
  }
  const head = P(ctx, `M${hx - 7},${hy} C${hx - 7},${hy - 6} ${hx - 1},${hy - 7} ${hx + 3},${hy - 5} C${hx + 6},${hy - 3.5} ${hx + 9},${hy - 2.4} ${hx + 13.5},${hy - 0.8}
    C${hx + 15},${hy} ${hx + 14.6},${hy + 2.4} ${hx + 13},${hy + 2.8} C${hx + 9},${hy + 3.2} ${hx + 4},${hy + 3.2} ${hx},${hy + 4.5} C${hx - 4},${hy + 5} ${hx - 7},${hy + 3} ${hx - 7},${hy} Z`);
  shade(ctx, head, WEREFUR, [hx - 7, hy - 7, 22, 12], { lx: 0.35, ly: 0.2, ao: 0.3 });
  stroke(ctx, [[hx + 2, hy + 0.6], [hx + 8, hy + 0.8], [hx + 13, hy + 0.4]], 1, hexA('#918275', 0.9));
  fill(ctx, ell(ctx, hx + 14, hy - 0.4, 1.4, 1.2), '#0e071b');
  // Olho amarelo aceso e sobrancelha franzida.
  fill(ctx, P(ctx, `M${hx + 1.5},${hy - 2.6} C${hx + 2.6},${hy - 3.6} ${hx + 4.6},${hy - 3.4} ${hx + 5.2},${hy - 2.4} C${hx + 4},${hy - 1.4} ${hx + 2.6},${hy - 1.4} ${hx + 1.5},${hy - 2.6} Z`), '#ffc825');
  fill(ctx, ell(ctx, hx + 3.6, hy - 2.5, 0.55, 0.75), '#0e071b');
  stroke(ctx, [[hx + 0.6, hy - 3.6], [hx + 3.4, hy - 4], [hx + 6, hy - 3]], 0.9, '#0e071b');
  fur(ctx, [hx - 6, hy + 2], [hx - 2, hy + 5], 4, 2.6, '#391f21', 0.8, { dx: -0.6, dy: 1, seed: 61 });
  ctx.restore();
  // Braço de cá, com garras.
  const shN = [27, 22];
  const elN = at ? [38, 12] : [24 - sw * 4, 32];
  const haN = at ? [50, 8] : [28 - sw * 5, 41];
  shade(ctx, limb(ctx, shN, elN, 7, 5), WEREFUR, [Math.min(shN[0], elN[0]) - 4, Math.min(shN[1], elN[1]) - 4, 16, 16], { ao: 0.2 });
  shade(ctx, limb(ctx, elN, haN, 5, 4.2), WEREFUR, [Math.min(elN[0], haN[0]) - 3, Math.min(elN[1], haN[1]) - 3, 16, 16], { ao: 0.3 });
  fur(ctx, [elN[0] - 1, elN[1]], [elN[0] + 1, elN[1] + 1], 2, 2.6, '#1c121c', 0.8, { dx: -1, dy: 0.5, seed: 2 });
  if (at) {
    for (let i = 0; i < 3; i += 1) fill(ctx, horn(ctx, [haN[0] + i * 0.6, haN[1] + i * 1.2], [haN[0] + 3, haN[1] + i * 1.5], [haN[0] + 5 - i * 0.4, haN[1] + 2 + i * 1.6], 1), '#f9e6cf');
    for (let i = 0; i < 3; i += 1) stroke(ctx, [[46 + i * 3, 4 + i], [56 + i * 2, 14 + i * 2], [57 + i * 2, 28 + i]], 0.8, hexA('#ffffff', 0.7));
  } else {
    claws(ctx, haN[0] - 1, haN[1] + 1.4);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Golem de magma / Titã
const ROCK = ['#0e071b', '#1a1932', '#2a2f4e', '#3d3d3d', '#5d5d5d', '#858585'];

function crack(ctx, pts, w = 1.3) {
  stroke(ctx, pts, w * 1.9, hexA('#c64524', 0.9));
  stroke(ctx, pts, w, '#ffa214');
  stroke(ctx, pts, w * 0.45, '#ffeb57');
}

function rock(ctx, path, box, cracks = []) {
  shade(ctx, path, ROCK, box, { lx: 0.3, ly: 0.2, ao: 0.5 });
  inside(ctx, path, () => {
    const [x, y, w, h] = box;
    stroke(ctx, [[x + w * 0.2, y + h * 0.2], [x + w * 0.45, y + h * 0.1], [x + w * 0.7, y + h * 0.18]], 0.8, hexA('#858585', 0.8));
    for (const c of cracks) crack(ctx, c);
  });
}

function golem(ctx, f, o) {
  const at = o.attack;
  const titan = o.titan;
  const ph = phaseOf(f);
  const bob = at ? -1 : Math.abs(Math.cos(ph)) * 1.2 - 1;
  const sway = at ? 0 : Math.sin(ph) * 1.2;
  ctx.save();
  ctx.translate(0, bob);
  // Pernas curtas e grossas, alternando o passo.
  for (const [x, s] of [[24, 1], [40, -1]]) {
    const lift = at ? 0 : Math.max(0, Math.sin(ph) * s) * 2.4;
    const legP = P(ctx, `M${x - 6},${44} C${x - 7},${50} ${x - 6.5},${55 - lift} ${x - 5},${57.5 - lift - bob} L${x + 5},${57.5 - lift - bob} C${x + 6.5},${55 - lift} ${x + 7},${50} ${x + 6},${44} Z`);
    rock(ctx, legP, [x - 7, 44, 14, 14], [[[x - 2, 47], [x + 1, 50], [x - 1, 53]]]);
  }
  // Braço de lá.
  const armSw = at ? 0 : -sway;
  const fistF = at ? [49, 7] : [53 + armSw, 45];
  rock(ctx, limb(ctx, [47, 25], fistF, 9, 8), [44, 22, 14, 26], [[[50, 30], [52, 35], [51, 39]]]);
  rock(ctx, ell(ctx, fistF[0], fistF[1], 6, 5.5), [fistF[0] - 6, fistF[1] - 5.5, 12, 11], [[[fistF[0] - 3, fistF[1]], [fistF[0] + 2, fistF[1] + 1]]]);
  // Tronco: pedregulho arredondado com núcleo de lava.
  const torso = P(ctx, `M14,30 C13,21 21,15.5 32,15.5 C43,15.5 51,21 50,30 C49.5,38 46,45.5 38,47
    C33,48 29,48 25,47 C17,45.5 14.5,38 14,30 Z`);
  rock(ctx, torso, [13, 15, 38, 33], [
    [[32, 31], [26, 26], [22, 27]], [[32, 31], [38, 25], [44, 26]], [[32, 31], [29, 38], [25, 43]], [[32, 31], [37, 39], [41, 42]]
  ]);
  inside(ctx, torso, () => {
    stroke(ctx, [[15, 37], [24, 39], [32, 37.5], [41, 39.5], [50, 37]], 1, '#1a1932');
    stroke(ctx, [[20, 20], [24, 24], [22, 30]], 0.9, '#1a1932');
  });
  glow(ctx, 32, 31, at ? 7 : 6, '#ff5000', { core: '#ffeb57' });
  fill(ctx, ell(ctx, 32, 31, 2.4, 2.4), '#ffeb57');
  // Ombros: pedras redondas.
  rock(ctx, ell(ctx, 16, 22, 8, 7), [8, 15, 16, 14], [[[12, 21], [16, 24], [20, 22]]]);
  rock(ctx, ell(ctx, 48, 22, 7.5, 6.5), [40.5, 15.5, 15, 13], [[[45, 20], [49, 23]]]);
  // Cabeça afundada entre os ombros, sobrancelha de pedra e olhos acesos.
  const head = P(ctx, 'M24.5,14 C24.5,7.5 28.5,4 33,4 C37.5,4 41.5,7.5 41,14 C40.6,18 37.5,20 33,20 C28.5,20 24.8,18 24.5,14 Z');
  rock(ctx, head, [24, 4, 18, 16]);
  stroke(ctx, [[26, 11.6], [33, 10.6], [40, 11.6]], 2, '#1a1932');
  for (const x of [29.6, 36.6]) {
    fill(ctx, ell(ctx, x, 13.4, 2.2, 1.2), '#ffa214');
    fill(ctx, ell(ctx, x + 0.3, 13.3, 1, 0.6), '#ffeb57');
  }
  crack(ctx, [[30, 16.6], [33, 17.6], [36, 16.6]], 0.9);
  if (titan) {
    // Coroa de lava escorrendo e magma nos ombros.
    crack(ctx, [[25.5, 8.4], [29, 6.6], [33, 6.2], [37, 6.6], [40.5, 8.4]], 1.3);
    for (const [x, y] of [[13, 50], [52, 51]]) { fill(ctx, ell(ctx, x, y, 1.2, 1.6), '#ff5000'); fill(ctx, ell(ctx, x, y + 0.3, 0.6, 0.8), '#ffc825'); }
    for (const [x, y, l] of [[13, 16, 5], [18, 17, 3.5], [45, 16.5, 4.5]]) crack(ctx, [[x, y], [x + 0.4, y + l * 0.5], [x, y + l]], 1.1);
  }
  // Braço de cá, com o punho enorme.
  const fistN = at ? [17, 6] : [11 + sway, 44];
  rock(ctx, limb(ctx, [16, 25], fistN, 9.5, 8.5), [8, 22, 14, 26], [[[13, 30], [11, 36], [13, 40]]]);
  rock(ctx, ell(ctx, fistN[0], fistN[1], 6.5, 6), [fistN[0] - 6.5, fistN[1] - 6, 13, 12], [[[fistN[0] - 3, fistN[1] - 1], [fistN[0] + 1, fistN[1] + 2], [fistN[0] + 4, fistN[1] + 1]]]);
  for (const dx of [-2, 1.5]) stroke(ctx, [[fistN[0] + dx, fistN[1] + 2], [fistN[0] + dx + 1, fistN[1] + 4.5]], 0.8, '#1a1932');
  // Fagulhas.
  for (let i = 0; i < (titan ? 6 : 4); i += 1) {
    const x = 6 + rand(i * 3.3) * 52;
    const y = 4 + ((rand(i * 7.1) * 30 + f * 3.5) % 30);
    fill(ctx, ell(ctx, x, y, 0.7, 0.7), i % 2 ? '#ffc825' : '#ffa214');
  }
  ctx.restore();
}

export const MONSTERS_B = {
  boar: { size: 60, elite: 68, shadow: [33, 58.5, 21, 3], paint: boar },
  spider: { size: 52, elite: 60, shadow: [34, 58.5, 24, 3], paint: spider },
  ghost: { size: 44, elite: 52, extra: [40], shadow: [33, 60, 11, 2], paint: ghost },
  werewolf: { size: 68, elite: 76, shadow: [34, 58.5, 15, 2.8], paint: werewolf },
  golem: { size: 56, elite: 64, shadow: [32, 58.5, 22, 3.2], paint: golem },
  titan: { size: 128, elite: 128, extra: [64], shadow: [32, 58.5, 24, 3.2], paint: (ctx, f, o) => golem(ctx, f, { ...o, titan: true }) }
};
