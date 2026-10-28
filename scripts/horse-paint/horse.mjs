// Montaria (Fase 23): cavalo preto-azulado pintado em 4x, no mesmo pipeline das skins, monstros e NPCs.
//
// Quadro 112 x 96, chão (cascos) na linha 90, centro em x = 56. Quatro direções reais: direita, esquerda
// (pintada de novo, com a luz sempre do alto à esquerda e o lado direito do cavalo à mostra), frente e costas.
// Cada quadro tem duas camadas: 'back' (o cavalo inteiro, atrás do herói) e 'front' (sela, estribo e botas do
// cavaleiro; de frente também pescoço e cabeça), que fica por cima do herói e esconde as pernas dele.
// Quadros por direção (16): 0-7 galope, 8-13 parado, 14 arrancada, 15 parada.
//
// Galope transverso em 4 tempos + suspensão: posterior de fora, posterior de perto, anterior de fora,
// anterior de perto (a mão que lidera) e as 4 patas no ar. Corpo sobe/desce e arfa, cabeça acena,
// crina e cauda com atraso de fase.
import { ell, poly, limb, fill, px, stroke, inside } from '../npc-paint/kit.mjs';

export const W = 112;
export const H = 96;
export const G = 90;
export const GALLOP = 8;
export const IDLE = 6;
export const FRAMES = GALLOP + IDLE + 2;
export const START = GALLOP + IDLE;
export const STOP = START + 1;

// Pelagem preto-azulada (tons da paleta), crina, cascos, couro, manta vinho, metal.
export const C = {
  coatDeep: '#0e071b', coatShadow: '#131313', coat: '#1a1932', coatLight: '#2a2f4e', coatShine: '#424c6e',
  coatSpec: '#657392', coatGlint: '#92a1b9',
  maneDeep: '#0e071b', mane: '#131313', maneMid: '#1a1932', maneLight: '#2a2f4e', maneShine: '#424c6e',
  hoof: '#272727', hoofLight: '#3d3d3d', hoofShine: '#5d5d5d',
  eye: '#0e071b', eyeIris: '#391f21', eyeGlint: '#ffffff',
  leatherDeep: '#1c121c', leatherDark: '#391f21', leather: '#5d2c28', leatherLight: '#8a4836', leatherShine: '#bf6f4a',
  stitch: '#cba36f', gold: '#edab50', goldDark: '#ad7954',
  wineDeep: '#3b1443', wineDark: '#571c27', wine: '#891e2b', wineLight: '#c42430',
  metalDark: '#3d3d3d', metal: '#858585', metalLight: '#b4b4b4',
  bootDark: '#1c121c', boot: '#391f21', bootLight: '#5d2c28', bootShine: '#8a4836',
  dust: '#858585', dustLight: '#b4b4b4', dustPale: '#f6ca9f'
};

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (v) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const frac = (v) => v - Math.floor(v);

// ------------------------------------------------------------------ pose (independente da direção)

const STANCE = 0.32;
// Início do apoio de cada pata no ciclo. near = lado da câmera.
const OFFSET = { hindFar: 0.0, hindNear: 0.1, foreFar: 0.32, foreNear: 0.42 };

/** Estado de uma pata no galope: reach (-1 atrás .. 1 à frente), lift (0..1), curl (0..1), landed (0..1). */
function legPhase(t, offset, fore) {
  const p = frac(t - offset);
  if (p < STANCE) {
    const k = p / STANCE;
    return { reach: lerp(1, -1, k), lift: 0, curl: 0, landed: p < 0.11 ? 1 - p / 0.11 : 0, ground: true };
  }
  const q = (p - STANCE) / (1 - STANCE);
  const reach = fore ? lerp(-1, 1, smooth((q - 0.18) / 0.82)) : lerp(-1, 1, smooth(q));
  const lift = Math.pow(Math.sin(Math.PI * q), fore ? 0.7 : 0.9);
  return { reach, lift, curl: Math.sin(Math.PI * Math.min(1, q * 1.15)), landed: 0, ground: false };
}

/** Pose de um quadro (0..15). */
export function horsePose(frame) {
  const legs = {};
  let bob = 0; let pitch = 0; let nod = 0; let tailLift = 0.5; let tailWave = 0; let maneWave = 0;
  let breath = 0; let blink = false; let ear = 0; let speed = 1;
  if (frame < GALLOP) {
    const t = frame / GALLOP;
    for (const [leg, off] of Object.entries(OFFSET)) legs[leg] = legPhase(t, off, leg.startsWith('fore'));
    bob = -2.2 * Math.cos(TAU * (t - 0.86));
    pitch = -0.055 * Math.cos(TAU * (t - 0.12));
    nod = 0.13 * Math.cos(TAU * (t - 0.52));
    const lag = t - 0.2;
    tailLift = 0.75 + 0.25 * Math.cos(TAU * (lag - 0.86));
    tailWave = Math.sin(TAU * lag);
    maneWave = Math.sin(TAU * (t - 0.15));
    breath = 0.5 + 0.5 * Math.cos(TAU * t);
  } else if (frame < START) {
    // Parado: 0 repouso, 1 inspira, 2 cauda p/ um lado, 3 pisca, 4 cauda p/ o outro, 5 bate o casco.
    const i = frame - GALLOP;
    speed = 0;
    const rest = { reach: 0, lift: 0, curl: 0, landed: 0, ground: true };
    for (const leg of Object.keys(OFFSET)) legs[leg] = { ...rest };
    legs.hindFar = { ...rest, reach: -0.15 };
    legs.foreFar = { ...rest, reach: 0.12 };
    breath = i === 1 ? 1 : i === 4 ? 0.5 : 0;
    bob = i === 1 ? -0.5 : 0;
    nod = i === 1 ? -0.04 : i === 5 ? 0.08 : i === 3 ? 0.02 : 0;
    tailLift = 0.05;
    tailWave = i === 2 ? -1 : i === 4 ? 1 : 0;
    maneWave = i === 2 ? -0.25 : i === 4 ? 0.25 : 0;
    blink = i === 3;
    ear = i === 2 ? 1 : i === 4 ? -1 : 0;
    if (i === 5) legs.foreNear = { reach: 0.15, lift: 0.45, curl: 0.8, landed: 0, ground: false };
  } else if (frame === START) {
    // Arrancada: posteriores sob o corpo, frente erguendo, anteriores dobrando.
    speed = 0.6;
    legs.hindNear = { reach: 0.75, lift: 0, curl: 0, landed: 0.6, ground: true };
    legs.hindFar = { reach: 0.45, lift: 0, curl: 0, landed: 0, ground: true };
    legs.foreNear = { reach: 0.1, lift: 0.75, curl: 1, landed: 0, ground: false };
    legs.foreFar = { reach: -0.3, lift: 0.4, curl: 0.7, landed: 0, ground: false };
    bob = -1.5; pitch = -0.085; nod = -0.06; tailLift = 0.55; tailWave = -0.3; maneWave = -0.6; breath = 1;
  } else {
    // Parada: anteriores travadas à frente, posteriores sob o corpo, cabeça erguida.
    speed = 0.5;
    legs.foreNear = { reach: 1.05, lift: 0, curl: 0, landed: 0.8, ground: true };
    legs.foreFar = { reach: 0.8, lift: 0, curl: 0, landed: 0.5, ground: true };
    legs.hindNear = { reach: 0.85, lift: 0, curl: 0, landed: 0.5, ground: true };
    legs.hindFar = { reach: 0.55, lift: 0, curl: 0, landed: 0, ground: true };
    bob = 1; pitch = -0.05; nod = -0.1; tailLift = 0.35; tailWave = 0.6; maneWave = 0.7; breath = 0.8;
  }
  return { legs, bob, pitch, nod, tailLift, tailWave, maneWave, breath, blink, ear, speed };
}

// ------------------------------------------------------------------ geometria

/** Transformações: corpo (pitch em torno do centro + bob) e espelho para a esquerda. */
function makeSpace(pose, mirror) {
  const pivot = [55, 56];
  const cos = Math.cos(pose.pitch); const sin = Math.sin(pose.pitch);
  const body = ([x, y]) => {
    const dx = x - pivot[0]; const dy = y - pivot[1];
    return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos + pose.bob];
  };
  const scr = ([x, y]) => [mirror ? W - x : x, y];
  return { body, scr, T: (p) => scr(body(p)) };
}

function rotAround(p, c, a) {
  const cos = Math.cos(a); const sin = Math.sin(a);
  const dx = p[0] - c[0]; const dy = p[1] - c[1];
  return [c[0] + dx * cos - dy * sin, c[1] + dx * sin + dy * cos];
}

/** Elipse como polígono suave (para passar por transformações). */
function ellPts(cx, cy, rx, ry, rot = 0, n = 20) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx; const y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}

/** Volume com luz do alto à esquerda (sempre na tela): luz, base e sombra embaixo/à direita. */
function vol(ctx, path, base, shadow, light, { d = [1.4, 1.6], h = [1, 1.1], deep = null, dd = [3, 3.4] } = {}) {
  const big = () => ctx.fillRect(-30, -30, 180, 180);
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = light; big();
  ctx.translate(h[0], h[1]); ctx.clip(path); ctx.translate(-h[0], -h[1]);
  ctx.fillStyle = shadow; big();
  ctx.translate(-d[0], -d[1]); ctx.clip(path); ctx.translate(d[0], d[1]);
  ctx.fillStyle = base; big();
  ctx.restore();
  if (deep) {
    // Oclusão funda na borda de baixo/direita.
    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = deep; big();
    ctx.translate(-dd[0] + d[0] * 0, -dd[1]); ctx.clip(path); ctx.translate(dd[0], dd[1]);
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.restore();
  }
}

/** Faixa escura só na borda de baixo (oclusão), dentro da peça. */
function rim(ctx, path, color, dx, dy) {
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = color;
  ctx.fillRect(-30, -30, 180, 180);
  ctx.translate(-dx, -dy);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fill(path);
  ctx.restore();
}

function coatVol(ctx, path, far = false) {
  if (far) vol(ctx, path, C.coatShadow, C.coatDeep, C.coat, { d: [1, 1.2], h: [0.8, 0.9] });
  else vol(ctx, path, C.coat, C.coatShadow, C.coatLight, { d: [1.5, 1.7], h: [1, 1.1] });
}

/** IK de 2 segmentos: joelho do lado indicado (bend = +1 à frente, -1 atrás, no espaço do cavalo à direita). */
function ik(a, b, l1, l2, bend) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  let d = Math.hypot(dx, dy);
  const ux = dx / (d || 1); const uy = dy / (d || 1);
  if (d > l1 + l2 - 0.01) { d = l1 + l2 - 0.01; b = [a[0] + ux * d, a[1] + uy * d]; }
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  // Normal "para a frente" (x+) do segmento.
  let nx = -uy; let ny = ux;
  if (nx * bend < 0 || (nx === 0 && bend < 0)) { nx = -nx; ny = -ny; }
  return { knee: [a[0] + ux * x + nx * h, a[1] + uy * x + ny * h], foot: b };
}

// ------------------------------------------------------------------ peças comuns

function hoofShape(ctx, fet, ang, len, w, far) {
  // Quartela + casco a partir do boleto, na direção `ang` (radianos de tela).
  const ux = Math.cos(ang); const uy = Math.sin(ang);
  const end = [fet[0] + ux * len, fet[1] + uy * len];
  fill(ctx, limb(ctx, fet, end, w * 0.85, w * 0.7), far ? C.coatDeep : C.coatShadow);
  // Casco: trapézio perpendicular à quartela.
  const nx = -uy; const ny = ux;
  const hw = w * 0.62; const hl = 2.4;
  const a = [end[0] + nx * hw, end[1] + ny * hw];
  const b = [end[0] - nx * hw, end[1] - ny * hw];
  const c = [b[0] + ux * hl - nx * 0.5, b[1] + uy * hl - ny * 0.5];
  const d = [a[0] + ux * hl + nx * 0.5, a[1] + uy * hl + ny * 0.5];
  const path = poly(ctx, [a, b, c, d]);
  fill(ctx, path, far ? C.coatDeep : C.hoof);
  if (!far) inside(ctx, path, () => { ctx.fillStyle = C.hoofLight; ctx.fillRect(Math.min(a[0], b[0], c[0], d[0]) - 1, Math.min(a[1], b[1], c[1], d[1]) - 1, 1.6, 9); });
  return end;
}

/** Tufo de pelos no boleto (pelagem frisona). */
function feather(ctx, fet, dir, far) {
  stroke(ctx, [fet, [fet[0] - dir * 1.8, fet[1] + 1.8], [fet[0] - dir * 2.2, fet[1] + 3]], 1.4, far ? C.coatDeep : C.mane);
}

// ------------------------------------------------------------------ PERFIL (direita; esquerda espelha a geometria)

const SIDE = {
  // pontos do corpo (cavalo olhando para a direita)
  seat: [55, 46],
  elbowNear: [68.5, 63], elbowFar: [66, 62.5],
  stifleNear: [45, 62], stifleFar: [42.5, 61.5],
  neckBase: [70, 50]
};

function sideLeg(ctx, sp, joint, phase, fore, far, mirror) {
  const jw = sp.body(joint);
  const fetY = G - 4;
  const reachF = fore ? 9.5 : 8;
  const reachB = fore ? 7.5 : 12;
  const jx = joint[0];
  let fx = phase.reach >= 0 ? jx + phase.reach * reachF : jx + phase.reach * reachB;
  if (fore) fx += 1; else fx -= 2.5;
  const liftH = fore ? 14 : 10;
  let fy = fetY - phase.lift * liftH;
  if (fore && !phase.ground) fx -= phase.curl * 4.5; // dobra a mão para trás antes de esticar
  const l1 = fore ? 12 : 12.5; const l2 = fore ? 10.5 : 11;
  const bend = fore ? 1 : -1;
  const { knee, foot } = ik(jw, [fx, fy], l1, l2, bend);
  // ângulo da quartela: apoio = para baixo/à frente; no ar enrola para trás.
  const ang = (fore ? 1.2 : 1.25) + phase.curl * (fore ? 1.9 : 1.2);
  const S = (p) => sp.scr(p);
  const angS = mirror ? Math.PI - ang : ang;
  const dirS = mirror ? -1 : 1;
  const col = far ? C.coatShadow : C.coat;
  // Antebraço/gaskin largo e musculoso, canela fina.
  const upper = limb(ctx, S(jw), S(knee), fore ? 6.4 : 6.8, fore ? 3.9 : 3.6);
  if (far) fill(ctx, upper, C.coatShadow); else vol(ctx, upper, C.coat, C.coatShadow, C.coatLight, { d: [1.1, 0.8], h: [0.9, 0.5] });
  const cannon = limb(ctx, S(knee), S(foot), fore ? 3.6 : 3.4, 3.2);
  if (far) fill(ctx, cannon, C.coatDeep); else vol(ctx, cannon, C.coat, C.coatShadow, C.coatLight, { d: [0.9, 0.6], h: [0.7, 0.4] });
  // Joelho/jarrete marcado.
  fill(ctx, ell(ctx, ...S(knee), fore ? 2.1 : 2.2, 1.9), col);
  if (!far) px(ctx, S(knee)[0] - 1, S(knee)[1] - 1, C.coatShine);
  feather(ctx, S(foot), dirS, far);
  hoofShape(ctx, S(foot), angS, 3.4, 3.3, far);
  if (!far && !fore) stroke(ctx, [S([knee[0] - 1, knee[1] - 2]), S([knee[0] - 1.5, knee[1] + 1])], 1, C.coatShine);
  return { foot: S(foot), hoof: S([foot[0] + Math.cos(ang) * 4, foot[1] + Math.sin(ang) * 4]) };
}

/** Fita (faixa de largura variável) ao longo de uma linha central, como polígono suave. */
function ribbon(ctx, pts, widths) {
  const left = []; const right = [];
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[Math.max(0, i - 1)]; const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l; const ny = dx / l; const w = widths[i] / 2;
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return poly(ctx, [...left, ...right.reverse()], true);
}

/** Linha central da cauda/mecha: parte de root, ângulo inicial a0 e curvatura. */
function strand(root, a0, bend, len, n, wave, phase) {
  const pts = [root];
  let ang = a0;
  for (let i = 1; i <= n; i += 1) {
    const k = i / n;
    ang += bend / n + Math.sin(k * 4 + phase) * wave * 0.22;
    const p = pts[i - 1];
    pts.push([p[0] + Math.cos(ang) * (len / n), p[1] + Math.sin(ang) * (len / n)]);
  }
  return pts;
}

function sideTail(ctx, sp, pose) {
  const root = sp.body([31.5, 47]);
  const lift = pose.tailLift;
  const wave = pose.tailWave;
  // ângulos de tela no espaço do cavalo ? direita: PI = para trás, PI/2 = para baixo.
  const a0 = lerp(Math.PI * 0.62, Math.PI * 0.93, lift);
  const bend = lerp(-0.25, -0.55, lift);
  const L = lerp(30, 27, lift);
  const S = (pts) => pts.map(sp.scr);
  // Corpo da cauda: volume cheio que alarga e afina.
  const main = strand(root, a0, bend, L, 8, 0.5 + Math.abs(wave), wave * 2);
  const wid = main.map((_, i) => { const k = i / 8; return 2.6 + 6.5 * Math.sin(Math.PI * Math.min(1, k * 0.95 + 0.08)) * (1 - k * 0.35); });
  const body = ribbon(ctx, S(main), wid);
  vol(ctx, body, C.mane, C.maneDeep, C.maneMid, { d: [1.2, 1.4], h: [1, 1] });
  // Mechas: trás pontas separadas e fios de brilho azulado.
  const tips = [[-0.18, 0.9, C.mane], [0.05, 1.05, C.maneMid], [0.26, 0.95, C.maneDeep]];
  for (const [da, k, col] of tips) {
    const s = strand(main[5], a0 + bend * 0.6 + da, bend * 0.5 + wave * 0.3, L * 0.42 * k, 4, 0.6, wave * 3 + da * 9);
    stroke(ctx, S(s), 2.2, col);
  }
  const hl1 = strand(sp.body([31, 47.5]), a0 - 0.12, bend, L * 0.7, 6, 0.4, wave * 2 + 1);
  stroke(ctx, S(hl1).slice(0, 6), 1, C.maneShine);
  const hl2 = strand(sp.body([30.5, 48.5]), a0 + 0.05, bend, L * 0.85, 6, 0.4, wave * 2 + 2);
  stroke(ctx, S(hl2).slice(1, 6), 1, C.maneLight);
}

function sideMane(ctx, sp, neck, pose, front) {
  // Crina longa: mechas que nascem na crista e esvoaçam para trás (galope) ou caem pelo pescoço (parado).
  const crest = [[82.5, 23.5], [80, 26.5], [77, 30.5], [74, 34.5], [71, 39], [68, 43]];
  const wave = pose.maneWave;
  const flow = clamp(0.25 + pose.speed * 0.75);
  crest.forEach((c, i) => {
    const base = sp.body(rotAround([c[0] + 0.6, c[1] - 0.6], SIDE.neckBase, pose.nod));
    const len = 8 + i * 1.3 + flow * 3;
    // ângulo (tela, cavalo ? direita): parado ~ para baixo e para trás; galope ~ para trás e um pouco acima.
    const a0 = lerp(1.95, 2.75, flow) + Math.sin(wave * 2.2 + i * 1.3) * 0.18;
    const s = strand(base, a0, lerp(-0.5, 0.35, flow), len, 4, 0.5, wave * 3 + i);
    const pts = s.map(sp.scr);
    if (!front) { stroke(ctx, pts, 3.4, C.maneDeep); return; }
    const w = [3.6, 3.4, 2.8, 2, 1.2];
    fill(ctx, ribbon(ctx, pts, w), i % 2 ? C.maneDeep : C.mane);
    stroke(ctx, pts.slice(0, 3), 1, i % 2 ? C.maneLight : C.maneShine);
  });
  if (front) stroke(ctx, crest.slice(0, 5).map((c) => neck([c[0] + 0.4, c[1] - 0.4])), 1, C.maneShine);
}
function paintSide(ctx, frame, layer, mirror) {
  const pose = horsePose(frame);
  const sp = makeSpace(pose, mirror);
  const { T } = sp;
  const P = (pts, smoothIt = true) => poly(ctx, pts.map(T), smoothIt);
  // Pescoço e cabeça giram juntos em torno da base do pescoço.
  const nb = SIDE.neckBase;
  const neck = (p) => T(rotAround(p, nb, pose.nod));
  const neckW = (p) => sp.body(rotAround(p, nb, pose.nod));
  const NP = (pts, smoothIt = true) => poly(ctx, pts.map(neck), smoothIt);
  const out = { seat: T(SIDE.seat), hooves: [] };

  const legNear = [];
  if (layer === 'back') {
    // Cauda atrás de tudo.
    sideTail(ctx, sp, pose);
    // Patas do lado de lá (mais escuras).
    out.hooves.push({ ...sideLeg(ctx, sp, SIDE.stifleFar, pose.legs.hindFar, false, true, mirror), landed: pose.legs.hindFar.landed });
    out.hooves.push({ ...sideLeg(ctx, sp, SIDE.elbowFar, pose.legs.foreFar, true, true, mirror), landed: pose.legs.foreFar.landed });
    // Mechas da crina do outro lado do pescoço.
    sideMane(ctx, sp, neck, pose, false);

    // Pescoço: crista arqueada, garganta, peito.
    const neckPath = NP([[64, 44], [69, 37], [74.5, 30], [80, 24], [85, 23], [87.5, 29], [86, 35], [82, 41], [78.5, 49], [77.5, 57], [70, 56]]);
    vol(ctx, neckPath, C.coat, C.coatShadow, C.coatLight, { d: [1.6, 1.4], h: [1.1, 1] });
    inside(ctx, neckPath, () => {
      // músculo do pescoço (braquiocefálico) e brilho azulado na crista
      stroke(ctx, [[72, 40], [79, 33], [84, 28]].map(neck), 1.1, C.coatShine);
      stroke(ctx, [[69, 39], [75, 32], [80, 26.5]].map(neck), 1, C.coatSpec);
      stroke(ctx, [[79, 47], [83, 38], [85, 32]].map(neck), 1.4, C.coatShadow);
      stroke(ctx, [[74, 50], [78, 42]].map(neck), 1, C.coatLight);
    });

    // Corpo: garupa, dorso, barriga e peito.
    const bodyPath = P([[29, 51], [31, 45.5], [36, 42.5], [43, 43], [50, 46], [57, 46.5], [64, 43], [70, 44], [75, 49], [78, 56], [76, 61.5], [70, 64.5], [62, 66], [53, 66.3], [47, 65], [40, 66.5], [33, 63.5], [29.5, 57.5]]);
    vol(ctx, bodyPath, C.coat, C.coatShadow, C.coatLight, { d: [1.6, 2.2], h: [1, 1.3] });
    inside(ctx, bodyPath, () => {
      // barriga em sombra funda
      fill(ctx, P(ellPts(55, 69.5, 18, 5.2)), C.coatShadow);
      fill(ctx, P(ellPts(56, 71.5, 15, 4)), C.coatDeep);
      // Posterior: músculo redondo (glúteo) com brilho azul.
      const hq = P(ellPts(39.5, 53, 10.5, 10, -0.2));
      vol(ctx, hq, C.coat, C.coatShadow, C.coatLight, { d: [1.3, 1.6], h: [1.1, 1.2] });
      stroke(ctx, [[33, 47], [37, 44.5], [42, 44.5]].map(T), 1.2, C.coatShine);
      stroke(ctx, [[34.5, 46.5], [38, 45.2]].map(T), 1, C.coatSpec);
      px(ctx, ...T([36.6, 45.6]), C.coatGlint);
      // linha do jarrete/coxa
      stroke(ctx, [[45, 51], [47, 57], [46, 63]].map(T), 1.1, C.coatShadow);
      stroke(ctx, [[31, 55], [35, 60], [40, 63]].map(T), 1.2, C.coatShadow);
      // Paleta (ombro) e braço.
      const sh = P(ellPts(70, 54, 7.5, 9, 0.35));
      vol(ctx, sh, C.coat, C.coatShadow, C.coatLight, { d: [1.2, 1.4], h: [1, 1] });
      stroke(ctx, [[66, 46], [71, 45.5], [75, 50]].map(T), 1.1, C.coatShine);
      px(ctx, ...T([71, 46.5]), C.coatSpec, 2, 1);
      stroke(ctx, [[64, 47], [65, 56], [67, 62]].map(T), 1.1, C.coatShadow);
      // costelas e flanco (sutil)
      stroke(ctx, [[52, 55], [55, 60]].map(T), 1, C.coatShadow);
      stroke(ctx, [[48, 54], [50, 59]].map(T), 1, C.coatShadow);
      // brilho do dorso
      stroke(ctx, [[45, 45.2], [50, 47]].map(T), 1, C.coatLight);
      // respiração: flanco expande
      if (pose.breath > 0.6) stroke(ctx, [[49, 61], [56, 62.5], [62, 61.5]].map(T), 1, C.coatLight);
    });

    // Cabeça: testa, chanfro, focinho, bochecha redonda.
    const head = NP([[81, 23], [85, 21.5], [89, 26], [94, 33], [98, 39], [98.5, 43], [96, 45], [92, 44.5], [88.5, 40], [84.5, 36], [82, 31]]);
    vol(ctx, head, C.coat, C.coatShadow, C.coatLight, { d: [1.3, 1.5], h: [0.9, 1] });
    inside(ctx, head, () => {
      const cheek = NP(ellPts(86, 33.5, 4.2, 4.6));
      vol(ctx, cheek, C.coat, C.coatShadow, C.coatLight, { d: [1, 1.2], h: [0.9, 0.9] });
      stroke(ctx, [[86, 23.5], [91, 29], [96, 36.5]].map(neck), 1, C.coatShine);
      px(ctx, ...neck([92, 30.8]), C.coatSpec);
      px(ctx, ...neck([84.6, 30.6]), C.coatSpec);
      // focinho macio e narina
      fill(ctx, NP(ellPts(96, 41.5, 3, 3)), C.coatLight);
      fill(ctx, NP(ellPts(96.6, 40.6, 1.3, 1)), C.coatDeep);
      stroke(ctx, [[93.5, 44], [96.5, 44.2]].map(neck), 1, C.coatDeep);
    });
    // Orelhas (uma mexe no parado).
    const earA = pose.ear > 0 ? -0.35 : 0;
    const earB = pose.ear < 0 ? -0.3 : 0;
    const ear = (bx, by, a, tip) => {
      const base = [bx, by];
      const t = rotAround([bx - 1 + tip, by - 6.5], base, a);
      return NP([[bx - 1.6, by + 0.6], t, [bx + 1.8, by + 0.4]], false);
    };
    fill(ctx, ear(82.5, 24, earA, -0.5), C.coatShadow);
    const earN = ear(85, 23.5, earB, 0.5);
    vol(ctx, earN, C.coat, C.coatShadow, C.coatLight, { d: [0.8, 0.6], h: [0.7, 0.5] });
    // Topete caindo na testa.
    stroke(ctx, [[84, 22.5], [87, 24.5], [88.5, 28]].map(neck), 2.2, C.mane);
    stroke(ctx, [[84.5, 22.5], [86.5, 24.6]].map(neck), 1, C.maneShine);
    // Olho com brilho (ou piscando).
    const eye = neck([88.6, 28.6]);
    if (pose.blink) px(ctx, eye[0] - 1, eye[1] + 0.4, C.coatDeep, 3, 1);
    else {
      px(ctx, eye[0] - 1, eye[1] - 0.6, C.eye, 3, 2);
      px(ctx, eye[0] + (mirror ? -1 : 0), eye[1] - 0.6, C.eyeIris, 1, 1);
      px(ctx, eye[0] + (mirror ? 0 : -1), eye[1] - 0.6, C.eyeGlint, 1, 1);
      stroke(ctx, [[87, 27.3], [90, 27.4]].map(neck), 0.9, C.coatShine);
    }
    // Cabeçada: faceira, focinheira, testeira, freio com argola.
    stroke(ctx, [[84.2, 25], [86.5, 33], [91.5, 41.5]].map(neck), 1.1, C.leatherDark);
    stroke(ctx, [[89.5, 38], [96.5, 37]].map(neck), 1.2, C.leatherDark);
    stroke(ctx, [[83, 25.2], [88.8, 24.5]].map(neck), 1, C.leather);
    stroke(ctx, [[84.8, 30], [86.2, 37.5]].map(neck), 1, C.leatherDark);
    px(ctx, ...neck([91.3, 41.3]), C.metalLight, 1, 1);
    // Crina do lado de cá: mechas longas.
    sideMane(ctx, sp, neck, pose, true);

    // Manta vinho sob a sela, com barra dourada.
    const blanket = P([[45, 45.6], [57, 47.3], [66, 44.2], [67.5, 56], [62, 58.2], [47.5, 58.6], [44.6, 55]], false);
    vol(ctx, blanket, C.wine, C.wineDark, C.wineLight, { d: [0.9, 1.2], h: [0.8, 0.8] });
    stroke(ctx, [[45, 57.3], [56, 57.6], [67, 55.4]].map(T), 1.1, C.goldDark);
    stroke(ctx, [[46, 55.2], [56, 55.6], [66.5, 53.6]].map(T), 0.8, C.wineDark);
    // Barrigueira.
    stroke(ctx, [[59.5, 56], [60, 66]].map(T), 1.8, C.leatherDark);
    // Rédeas do freio até o arção.
    stroke(ctx, [neckW([91.3, 41.3]), sp.body([78, 44]), sp.body([64.5, 43])].map(sp.scr), 1, C.leatherDark);

    // Patas do lado de cá.
    legNear.push({ ...sideLeg(ctx, sp, SIDE.stifleNear, pose.legs.hindNear, false, false, mirror), landed: pose.legs.hindNear.landed });
    legNear.push({ ...sideLeg(ctx, sp, SIDE.elbowNear, pose.legs.foreNear, true, false, mirror), landed: pose.legs.foreNear.landed });
    out.hooves.push(...legNear);
  }

  // Sela (camada da frente: fica por cima do quadril do herói). Também vai na de trás (some atrás dele).
  const seatPath = P([[46.5, 40], [48.8, 41.8], [54, 45.4], [59, 45], [62.4, 42], [64.6, 39.6], [66.4, 41.2], [65.3, 45.6], [62, 48.4], [50, 48.8], [46, 46.6], [45.3, 42.5]], true);
  vol(ctx, seatPath, C.leather, C.leatherDark, C.leatherLight, { d: [1, 1.2], h: [0.8, 0.8] });
  stroke(ctx, [[47, 41.2], [48.3, 43.7]].map(T), 1, C.leatherShine);
  stroke(ctx, [[64.4, 40.2], [65.5, 41.8]].map(T), 1, C.leatherShine);
  stroke(ctx, [[48, 47.4], [55, 47.8], [63, 46.8]].map(T), 0.8, C.stitch);
  // Aba de couro com pesponto.
  const flap = P([[50.5, 47.4], [61.8, 47], [62.6, 55.6], [60.6, 57], [52, 57.2], [50, 55]], true);
  vol(ctx, flap, C.leather, C.leatherDark, C.leatherLight, { d: [0.9, 1.1], h: [0.7, 0.7] });
  stroke(ctx, [[51.5, 48.8], [51.4, 55.2], [53, 56.2], [60.4, 55.8], [61.2, 49]].map(T), 0.7, C.stitch);
  // Bota do cavaleiro: joelho na aba, canela até o estribo.
  const knee = [60.5, 51.5];
  const ankle = [57.8, 61.2];
  const bootPath = poly(ctx, [T([58, 49.5]), T([63.5, 50.5]), T([60.6, 61.6]), T([60.8, 64]), T([54.2, 64]), T([55.4, 60.4])], true);
  vol(ctx, bootPath, C.boot, C.bootDark, C.bootLight, { d: [0.9, 1], h: [0.8, 0.6] });
  stroke(ctx, [T([58.4, 52.6]), T([62.2, 53.1])], 1, C.bootShine);
  stroke(ctx, [T([55.2, 63.6]), T([60.6, 63.6])], 1, C.bootDark);
  // Loro e estribo.
  stroke(ctx, [T([56.5, 48]), T([57, 59])], 1.1, C.leatherDark);
  const stir = poly(ctx, [T([54.4, 62.4]), T([61, 62.4]), T([60.4, 65]), T([55, 65])], false);
  fill(ctx, stir, C.metalDark);
  stroke(ctx, [T([54.6, 64.6]), T([60.5, 64.6])], 1, C.metal);
  void knee; void ankle;
  return out;
}

// ------------------------------------------------------------------ FRENTE e COSTAS

// Pata vista de frente/de costas: topo fixo, boleto sobe com o lift e desce/sobe com o reach (profundidade).
function frontLeg(ctx, top, phase, { far, depth, fore, view }) {
  const baseY = G - 4 - (far ? 6 : 0);
  // perto da câmera (reach positivo na frente / negativo de costas) desce na tela
  const toward = view === 'down' ? phase.reach : -phase.reach;
  const fy = baseY + toward * depth - phase.lift * (fore ? 11 : 8);
  const kx = top[0] + (top[0] < 56 ? -0.4 : 0.4) * phase.curl;
  const knee = [kx, top[1] + (fy - top[1]) * 0.5 + phase.curl * 1.5];
  const foot = [top[0] + (top[0] < 56 ? 0.4 : -0.4), fy];
  const wTop = fore ? 6.2 : 6.6;
  const upper = limb(ctx, top, knee, wTop, 3.8);
  const cannon = limb(ctx, knee, foot, 3.5, 3.1);
  if (far) { fill(ctx, upper, C.coatShadow); fill(ctx, cannon, C.coatDeep); } else {
    vol(ctx, upper, C.coat, C.coatShadow, C.coatLight, { d: [1.2, 0.6], h: [0.9, 0.4] });
    vol(ctx, cannon, C.coat, C.coatShadow, C.coatLight, { d: [1, 0.5], h: [0.7, 0.3] });
  }
  fill(ctx, ell(ctx, knee[0], knee[1], 2.2, 1.8), far ? C.coatShadow : C.coat);
  if (!far) px(ctx, knee[0] - 1, knee[1] - 1, C.coatShine);
  // tufo + casco (encolhe quando dobra)
  stroke(ctx, [[foot[0] - 1.6, foot[1] + 0.5], [foot[0] - 2.2, foot[1] + 3]], 1.2, far ? C.coatDeep : C.mane);
  stroke(ctx, [[foot[0] + 1.6, foot[1] + 0.5], [foot[0] + 2.2, foot[1] + 3]], 1.2, far ? C.coatDeep : C.mane);
  fill(ctx, limb(ctx, foot, [foot[0], foot[1] + 2.5], 3, 2.6), far ? C.coatDeep : C.coatShadow);
  const hoofH = phase.ground ? 2.6 : 1.8 + (1 - phase.curl) * 0.8;
  const hoof = poly(ctx, [[foot[0] - 2, foot[1] + 2.6], [foot[0] + 2, foot[1] + 2.6], [foot[0] + 2.5, foot[1] + 2.6 + hoofH], [foot[0] - 2.5, foot[1] + 2.6 + hoofH]]);
  fill(ctx, hoof, far ? C.coatDeep : C.hoof);
  if (!far) px(ctx, foot[0] - 2, foot[1] + 3, C.hoofLight, 1, 1);
  return { foot, hoof: [foot[0], foot[1] + 2.6 + hoofH], landed: phase.landed };
}

function paintFront(ctx, frame, layer) {
  // De frente: o cavalo vem na direção da câmera. Cabeça e pescoço ficam na frente do cavaleiro.
  const pose = horsePose(frame);
  const b = pose.bob;
  const Y = (y) => y + b;
  const nod = pose.nod * 22; // aceno: a cabeça desce na tela
  const out = { seat: [56, Y(44)], hooves: [] };
  const sway = pose.maneWave;
  const tailSway = pose.tailWave;
  const head = () => {
    // Pescoço visto de frente.
    const hy = Y(nod);
    const neckPath = poly(ctx, [[47.5, Y(46)], [64.5, Y(46)], [66, Y(58)], [62, hy + 58], [50, hy + 58], [46, Y(58)]], true);
    vol(ctx, neckPath, C.coat, C.coatShadow, C.coatLight, { d: [1.6, 1], h: [1.1, 0.8] });
    // Crina caindo do lado direito do cavalo (esquerda da tela) + mechas soltas do outro lado.
    for (let i = 0; i < 6; i += 1) {
      const x0 = 49 + i * 0.6;
      const y0 = Y(42 + i * 2.4);
      const sw = Math.sin(sway * 2 + i) * 1.6;
      stroke(ctx, [[x0, y0], [x0 - 3.5 + sw * 0.5, y0 + 4], [x0 - 4 + sw, y0 + 8]], 2.6, i % 2 ? C.mane : C.maneMid);
      if (i % 2 === 0) stroke(ctx, [[x0, y0], [x0 - 3 + sw * 0.5, y0 + 3.5]], 1, C.maneShine);
    }
    // Cabeça: testa larga, chanfro, focinho.
    const headPts = [[48.6, hy + 41], [56, hy + 38.2], [63.4, hy + 41], [62.6, hy + 49], [60.6, hy + 57], [60.2, hy + 62], [56, hy + 64.6], [51.8, hy + 62], [51.4, hy + 57], [49.4, hy + 49]];
    // separação escura entre a cabeça e o pescoço/peito
    stroke(ctx, [...headPts, headPts[0], headPts[1]], 2.2, C.coatDeep);
    const headPath = poly(ctx, headPts, true);
    vol(ctx, headPath, C.coat, C.coatShadow, C.coatLight, { d: [1.3, 1.2], h: [1.2, 0.9] });
    inside(ctx, headPath, () => {
      // chanfro com brilho azulado, bochechas, focinho claro e narinas
      fill(ctx, poly(ctx, [[53.4, hy + 41], [57, hy + 41], [56.6, hy + 58], [54.6, hy + 58]], true), C.coatLight);
      stroke(ctx, [[54.2, hy + 41.6], [54.8, hy + 51], [55.2, hy + 57]], 1, C.coatShine);
      px(ctx, 54, hy + 45, C.coatSpec, 1, 3);
      px(ctx, 54.6, hy + 52, C.coatSpec, 1, 1);
      fill(ctx, ell(ctx, 51.4, hy + 47.5, 1.8, 3.6), C.coatLight);
      fill(ctx, ell(ctx, 56, hy + 61.6, 4.4, 3.2), C.coatShine);
      fill(ctx, ell(ctx, 56, hy + 62.6, 3.6, 2.2), C.coatLight);
      px(ctx, 53.4, hy + 60.6, C.coatDeep, 2, 2);
      px(ctx, 57.6, hy + 60.6, C.coatDeep, 2, 2);
      stroke(ctx, [[60.6, hy + 44], [61.2, hy + 53]], 1.2, C.coatShadow);
    });
    // Orelhas.
    const earL = pose.ear > 0 ? -1.2 : 0;
    const earR = pose.ear < 0 ? 1.2 : 0;
    const e1 = poly(ctx, [[49.6, hy + 41.5], [48.6 + earL, hy + 34], [52.6, hy + 40]]);
    const e2 = poly(ctx, [[59.4, hy + 40], [63.4 + earR, hy + 34], [62.4, hy + 41.5]]);
    vol(ctx, e1, C.coat, C.coatShadow, C.coatLight, { d: [0.8, 0.6], h: [0.7, 0.5] });
    vol(ctx, e2, C.coat, C.coatShadow, C.coatLight, { d: [0.8, 0.6], h: [0.7, 0.5] });
    // Topete.
    stroke(ctx, [[56, hy + 39], [54.4, hy + 43], [55.6 + sway, hy + 47]], 2.6, C.mane);
    stroke(ctx, [[56.2, hy + 39.4], [55, hy + 42.4]], 1, C.maneShine);
    // Olhos nas laterais, com brilho.
    for (const [ex, side] of [[50.6, -1], [61.4, 1]]) {
      if (pose.blink) px(ctx, ex - 1, hy + 45.5, C.coatDeep, 2, 1);
      else {
        px(ctx, ex - 1, hy + 43.6, C.coatShine, 2, 1);
        px(ctx, ex - 1, hy + 44.6, C.eye, 2, 2);
        px(ctx, side < 0 ? ex - 1 : ex, hy + 44.6, C.eyeGlint, 1, 1);
      }
    }
    // Cabeçada: testeira, focinheira, argolas do freio.
    stroke(ctx, [[50, hy + 42.4], [62, hy + 42.4]], 1, C.leather);
    stroke(ctx, [[51.6, hy + 55], [60.4, hy + 55]], 1.2, C.leatherDark);
    stroke(ctx, [[50.4, hy + 43], [51.6, hy + 55]], 1, C.leatherDark);
    stroke(ctx, [[61.6, hy + 43], [60.4, hy + 55]], 1, C.leatherDark);
    px(ctx, 51, hy + 58, C.metalLight);
    px(ctx, 60, hy + 58, C.metalLight);
    // Rédeas subindo até as mãos (atrás da cabeça, sai pelos lados).
    stroke(ctx, [[51, hy + 58], [47.6, Y(50)], [50, Y(44)]], 1, C.leatherDark);
    stroke(ctx, [[60.6, hy + 58], [64.4, Y(50)], [62, Y(44)]], 1, C.leatherDark);
  };
  const saddleSides = () => {
    // Manta e abas dos dois lados, botas do cavaleiro e estribos.
    for (const s of [-1, 1]) {
      const x = 56 + s * 13.5;
      const blanket = poly(ctx, [[56 + s * 9, Y(43)], [x + s * 3.2, Y(45)], [x + s * 3.6, Y(56)], [56 + s * 10, Y(57.5)]], true);
      vol(ctx, blanket, C.wine, C.wineDark, C.wineLight, { d: [0.8, 1], h: [0.7, 0.7] });
      stroke(ctx, [[56 + s * 10.4, Y(56.8)], [x + s * 3.4, Y(55.6)]], 1, C.goldDark);
      const flap = poly(ctx, [[56 + s * 9.6, Y(44)], [x + s * 1.8, Y(45)], [x + s * 2, Y(54.5)], [56 + s * 10.4, Y(55.4)]], true);
      vol(ctx, flap, C.leather, C.leatherDark, C.leatherLight, { d: [0.7, 0.9], h: [0.6, 0.6] });
      // bota
      const boot = poly(ctx, [[x - 3, Y(45)], [x + 2.6, Y(45)], [x + 2.4, Y(58.5)], [x + s * 1.2 + 0.4, Y(62)], [x - 2.6, Y(62)], [x - 2.4, Y(58)]], true);
      vol(ctx, boot, C.boot, C.bootDark, C.bootLight, { d: [0.9, 0.8], h: [0.7, 0.5] });
      px(ctx, x - 2, Y(48), C.bootShine, 1, 3);
      stroke(ctx, [[x - 2.8, Y(61.6)], [x + 2.6, Y(61.6)]], 1, C.bootDark);
      // estribo
      stroke(ctx, [[x - 3.2, Y(60.4)], [x - 3.2, Y(63.6)], [x + 3.2, Y(63.6)], [x + 3.2, Y(60.4)]], 1, C.metal);
      px(ctx, x - 2, Y(63.4), C.metalLight, 3, 1);
    }
  };

  if (layer === 'back') {
    // Cauda balançando atrás (aparece pelos lados da garupa).
    const ts = tailSway >= 0 ? 1 : -1;
    if (frame >= GALLOP && Math.abs(tailSway) > 0.5) {
      const tx = 56 + ts * (12 + Math.abs(tailSway) * 3);
      const tail = ribbon(ctx, [[56 + ts * 6, Y(38)], [tx, Y(40 - pose.tailLift * 3)], [tx + ts * 4, Y(46 - pose.tailLift * 6)], [tx + ts * 5, Y(52 - pose.tailLift * 8)]], [3, 4, 3.4, 1.4]);
      fill(ctx, tail, C.mane);
    }
    // Posteriores (mais longe, mais acima na tela).
    out.hooves.push(frontLeg(ctx, [48.5, Y(60)], pose.legs.hindFar, { far: true, depth: 2, fore: false, view: 'down' }));
    out.hooves.push(frontLeg(ctx, [63.5, Y(60)], pose.legs.hindNear, { far: true, depth: 2, fore: false, view: 'down' }));
    // Garupa e dorso ao fundo.
    const rump = poly(ctx, [[43, Y(44)], [46, Y(36)], [52, Y(34)], [56, Y(35)], [60, Y(34)], [66, Y(36)], [69, Y(44)], [70, Y(56)], [66, Y(64)], [46, Y(64)], [42, Y(56)]], true);
    vol(ctx, rump, C.coat, C.coatShadow, C.coatLight, { d: [1.6, 1.6], h: [1.1, 1] });
    inside(ctx, rump, () => {
      stroke(ctx, [[47, Y(37)], [52, Y(35.2)]], 1, C.coatShine);
      stroke(ctx, [[60, Y(35.2)], [64, Y(36.6)]], 1, C.coatLight);
      stroke(ctx, [[44, Y(48)], [44.5, Y(58)]], 1.2, C.coatShine);
      stroke(ctx, [[67.8, Y(48)], [67.4, Y(58)]], 1.4, C.coatDeep);
    });
    // Sela de frente: arção e assento.
    const seat = poly(ctx, [[47, Y(43)], [51, Y(40)], [56, Y(39)], [61, Y(40)], [65, Y(43)], [64, Y(47)], [48, Y(47)]], true);
    vol(ctx, seat, C.leather, C.leatherDark, C.leatherLight, { d: [0.8, 1], h: [0.7, 0.7] });
    // Peito musculoso com sulco no meio.
    const chest = poly(ctx, [[45, Y(58)], [48, Y(54)], [56, Y(55)], [64, Y(54)], [67, Y(58)], [66, Y(67)], [61, Y(71)], [51, Y(71)], [46, Y(67)]], true);
    vol(ctx, chest, C.coat, C.coatShadow, C.coatLight, { d: [1.4, 1.6], h: [1, 1] });
    inside(ctx, chest, () => {
      stroke(ctx, [[56, Y(58)], [56, Y(70)]], 1.2, C.coatDeep);
      stroke(ctx, [[48, Y(60)], [51, Y(57.4)]], 1, C.coatShine);
      px(ctx, 49, Y(59.4), C.coatSpec, 1, 1);
      stroke(ctx, [[59, Y(58)], [63, Y(58.6)]], 1, C.coatLight);
    });
    // Anteriores (perto).
    out.hooves.push(frontLeg(ctx, [50, Y(66)], pose.legs.foreFar, { far: false, depth: 3, fore: true, view: 'down' }));
    out.hooves.push(frontLeg(ctx, [62, Y(66)], pose.legs.foreNear, { far: false, depth: 3, fore: true, view: 'down' }));
  }
  saddleSides();
  head();
  return out;
}

function paintBack(ctx, frame, layer) {
  // De costas: garupa e cauda perto da câmera; pescoço e cabeça ao fundo, atrás do cavaleiro.
  const pose = horsePose(frame);
  const b = pose.bob;
  const Y = (y) => y + b;
  const nod = pose.nod * 14;
  const out = { seat: [56, Y(43)], hooves: [] };
  const sway = pose.maneWave;
  const tailSway = pose.tailWave;
  if (layer === 'back') {
    // Pescoço e cabeça ao fundo (orelhas e crina aparecem acima/aos lados do cavaleiro).
    const hy = Y(-nod);
    const neckPath = poly(ctx, [[49, Y(40)], [50.5, hy + 22], [56, hy + 18], [61.5, hy + 22], [63, Y(40)]], true);
    vol(ctx, neckPath, C.coat, C.coatShadow, C.coatLight, { d: [1.4, 1], h: [1, 0.8] });
    const headPath = poly(ctx, [[51.5, hy + 22], [56, hy + 19.5], [60.5, hy + 22], [59.6, hy + 27], [52.4, hy + 27]], true);
    fill(ctx, headPath, C.coatShadow);
    const e1 = poly(ctx, [[51.5, hy + 21], [50.4 + (pose.ear > 0 ? -1 : 0), hy + 14.5], [54, hy + 19.6]]);
    const e2 = poly(ctx, [[58, hy + 19.6], [61.6 + (pose.ear < 0 ? 1 : 0), hy + 14.5], [60.5, hy + 21]]);
    vol(ctx, e1, C.coat, C.coatShadow, C.coatLight, { d: [0.8, 0.6], h: [0.7, 0.5] });
    vol(ctx, e2, C.coat, C.coatShadow, C.coatLight, { d: [0.8, 0.6], h: [0.7, 0.5] });
    // Crina na crista, esvoaçando para um lado.
    for (let i = 0; i < 7; i += 1) {
      const y0 = hy + 20 + i * 2.8;
      const sw = Math.sin(sway * 2 + i * 0.9) * 1.5;
      stroke(ctx, [[56, y0], [61 + sw, y0 + 2.5], [64 + sw * 1.4, y0 + 5.5]], 2.6, i % 2 ? C.mane : C.maneMid);
      if (i % 2 === 0) stroke(ctx, [[56.5, y0], [60.5 + sw, y0 + 2]], 1, C.maneShine);
    }
    // Rédeas.
    stroke(ctx, [[52, hy + 26], [50, Y(36)], [51, Y(40)]], 1, C.leatherDark);
    stroke(ctx, [[60, hy + 26], [62, Y(36)], [61, Y(40)]], 1, C.leatherDark);
    // Anteriores ao fundo (aparecem entre e ao lado das posteriores).
    out.hooves.push(frontLeg(ctx, [49.5, Y(62)], pose.legs.foreFar, { far: true, depth: 2, fore: true, view: 'up' }));
    out.hooves.push(frontLeg(ctx, [62.5, Y(62)], pose.legs.foreNear, { far: true, depth: 2, fore: true, view: 'up' }));
    // Dorso/costelas e manta.
    const barrel = poly(ctx, [[42, Y(42)], [56, Y(37)], [70, Y(42)], [71, Y(56)], [56, Y(60)], [41, Y(56)]], true);
    vol(ctx, barrel, C.coat, C.coatShadow, C.coatLight, { d: [1.6, 1.4], h: [1, 1] });
  }
  // Manta e abas, botas, estribos (laterais), arção traseiro.
  for (const s of [-1, 1]) {
    const x = 56 + s * 14;
    const blanket = poly(ctx, [[56 + s * 9, Y(40)], [x + s * 3, Y(41)], [x + s * 3.4, Y(53)], [56 + s * 10, Y(54)]], true);
    vol(ctx, blanket, C.wine, C.wineDark, C.wineLight, { d: [0.8, 1], h: [0.7, 0.7] });
    stroke(ctx, [[56 + s * 10.4, Y(53.4)], [x + s * 3.2, Y(52.6)]], 1, C.goldDark);
    const flap = poly(ctx, [[56 + s * 9.6, Y(41)], [x + s * 1.8, Y(42)], [x + s * 2, Y(51.5)], [56 + s * 10.4, Y(52.5)]], true);
    vol(ctx, flap, C.leather, C.leatherDark, C.leatherLight, { d: [0.7, 0.9], h: [0.6, 0.6] });
    const boot = poly(ctx, [[x - 2.8, Y(42)], [x + 2.6, Y(42)], [x + 2.4, Y(56)], [x - s * 1 + 0.2, Y(59.5)], [x - 2.6, Y(59.5)], [x - 2.4, Y(56)]], true);
    vol(ctx, boot, C.boot, C.bootDark, C.bootLight, { d: [0.9, 0.8], h: [0.7, 0.5] });
    px(ctx, x - 2, Y(45), C.bootShine, 1, 3);
    stroke(ctx, [[x - 3.2, Y(58)], [x - 3.2, Y(61)], [x + 3.2, Y(61)], [x + 3.2, Y(58)]], 1, C.metal);
  }
  const cantle = poly(ctx, [[46.5, Y(44)], [48, Y(40.5)], [56, Y(39.2)], [64, Y(40.5)], [65.5, Y(44)], [62, Y(47)], [50, Y(47)]], true);
  vol(ctx, cantle, C.leather, C.leatherDark, C.leatherLight, { d: [0.9, 1.1], h: [0.8, 0.8] });
  stroke(ctx, [[49, Y(41.6)], [56, Y(40.6)], [63, Y(41.6)]], 0.8, C.leatherShine);
  stroke(ctx, [[48.5, Y(45.6)], [63.5, Y(45.6)]], 0.8, C.stitch);
  // Garupa: dois glúteos redondos, sulco no meio, brilho azulado.
  const glutes = poly(ctx, [[41, Y(52)], [43, Y(46)], [49, Y(44.2)], [56, Y(45.6)], [63, Y(44.2)], [69, Y(46)], [71, Y(52)], [70, Y(62)], [65, Y(68)], [47, Y(68)], [42, Y(62)]], true);
  vol(ctx, glutes, C.coat, C.coatShadow, C.coatLight, { d: [1.4, 1.8], h: [1, 1.1] });
  inside(ctx, glutes, () => {
    const l = poly(ctx, ellPts(48.8, Y(54), 7.6, 9));
    const r = poly(ctx, ellPts(63.2, Y(54), 7.6, 9));
    vol(ctx, l, C.coat, C.coatShadow, C.coatLight, { d: [1.2, 1.4], h: [1.1, 1.1] });
    vol(ctx, r, C.coat, C.coatShadow, C.coatLight, { d: [1.2, 1.4], h: [1.1, 1.1] });
    stroke(ctx, [[44, Y(50)], [46.5, Y(46.4)], [50, Y(45.6)]], 1.1, C.coatShine);
    px(ctx, 46, Y(47.4), C.coatSpec, 1, 1);
    stroke(ctx, [[58.4, Y(46.4)], [62, Y(45.6)]], 1, C.coatLight);
  });
  // Posteriores (perto da câmera).
  const hindL = frontLeg(ctx, [48.5, Y(64)], pose.legs.hindFar, { far: false, depth: 3, fore: false, view: 'up' });
  const hindR = frontLeg(ctx, [63.5, Y(64)], pose.legs.hindNear, { far: false, depth: 3, fore: false, view: 'up' });
  if (layer === 'back') out.hooves.push(hindL, hindR);
  // Cauda longa caindo do centro, balançando.
  const lift = pose.tailLift;
  for (let i = 0; i < 6; i += 1) {
    const off = (i - 2.5) * 1.2;
    const end = [56 + tailSway * 7 + off * 1.6, Y(lerp(84, 70, lift))];
    const mid = [56 + tailSway * 3 + off, Y(lerp(64, 58, lift))];
    stroke(ctx, [[56 + off * 0.4, Y(46)], mid, end], i === 0 || i === 5 ? 1.8 : 2.8, [C.maneMid, C.mane, C.maneDeep, C.mane, C.maneMid, C.mane][i]);
  }
  stroke(ctx, [[55.4, Y(46.4)], [55 + tailSway * 2, Y(56)]], 1, C.maneShine);
  stroke(ctx, [[57, Y(47)], [57.6 + tailSway * 2.6, Y(60)]], 1, C.maneLight);
  return out;
}

/** Pinta um quadro: dir = right|left|down|up, layer = back|front. Devolve { seat, hooves }. */
export function paintHorse(ctx, dir, frame, layer) {
  if (dir === 'right' || dir === 'left') return paintSide(ctx, frame, layer, dir === 'left');
  // De frente/de costas o desenho é mais largo (peito e garupa de cavalo, não de pônei).
  const SX = 1.3; const SY = 1.07;
  ctx.save();
  ctx.translate(56, G); ctx.scale(SX, SY); ctx.translate(-56, -G);
  const res = dir === 'down' ? paintFront(ctx, frame, layer) : paintBack(ctx, frame, layer);
  ctx.restore();
  const map = (p) => p && [56 + (p[0] - 56) * SX, G + (p[1] - G) * SY];
  return { seat: map(res.seat), hooves: res.hooves.map((h) => ({ ...h, foot: map(h.foot), hoof: map(h.hoof) })) };
}

/** Poeira dos cascos que acabaram de tocar o chão (pintada sem contorno, numa camada à parte). */
export function paintDust(ctx, hooves, dir) {
  for (const h of hooves) {
    if (!h.landed) continue;
    const [x, y] = h.hoof ?? h.foot;
    const k = h.landed;
    const back = dir === 'right' ? -1 : dir === 'left' ? 1 : 0;
    const gy = Math.min(G + 1, y + 1);
    const puffs = [[back * 3, -1.6, 2.4], [back * 6, -2.4, 1.8], [back * 1 - 2, -0.6, 1.6], [back * 4 + 2, -3.6, 1.3]];
    for (const [dx, dy, r] of puffs) {
      const cx = x + dx * (0.8 + k * 0.8) + back * 2;
      fill(ctx, ell(ctx, cx, gy + dy * k, r * (0.55 + k * 0.4), r * 0.7 * (0.55 + k * 0.4)), C.dust);
      if (r > 1.7) fill(ctx, ell(ctx, cx - 0.5, gy + dy * k - 0.6, r * 0.45, r * 0.35), C.dustLight);
    }
  }
}
