// Defesas do acampamento (CampDefense.js): muralha (paliçada → pedra → castelo), portões, torres de
// canto, torres de vigia, porta, tocha do portão e placa de obra. Mesmos tamanhos e bases dos antigos
// (origem 0.5, 1: a última linha é o chão).
import {
  C, STONE, STONE_COOL, WOOD, WOOD_DARK, ROOF_RED, ROOF_BLUE, ROOF_WOOD,
  rng, rect, px, line, ellipse, fillPoly, clip, veil, stones, planks, logs, tiles, mossBand,
  windowLit, door, barrel, crate, lanternBox, baseShade, grassTufts, mixHex, enlarge
} from './kit.mjs';

// ---------- Peças básicas ----------

/** Tora de paliçada em pé com ponta afiada (luz à esquerda). */
function stake(ctx, x, top, base, w = 5, seed = 1) {
  const r = rng(seed);
  const tip = top; const body = top + 4;
  fillPoly(ctx, [[x, body], [x + w / 2, tip], [x + w, body]], C.w4);
  fillPoly(ctx, [[x + w / 2, tip], [x + w, body], [x + w / 2 + 0.5, body]], C.w3);
  px(ctx, Math.floor(x + w / 2), tip, C.w6);
  rect(ctx, x, body, w, base - body, C.w3);
  rect(ctx, x, body, 1, base - body, C.w5);
  rect(ctx, x + 1, body, 1, base - body, C.w4);
  rect(ctx, x + w - 1, body, 1, base - body, C.w2);
  for (let y = body + 2; y < base - 1; y += r.int(3, 5)) px(ctx, x + r.int(1, w - 2), y, C.w2);
  ellipse(ctx, x + w / 2, body + 0.5, w / 2 - 0.2, 0.9, C.w5);
}

/** Amarração de corda atravessando as toras. */
function rope(ctx, x, y, w) {
  rect(ctx, x, y, w, 2, C.sand); rect(ctx, x, y, w, 1, C.cream); rect(ctx, x, y + 2, w, 1, 'rgba(28,18,28,0.45)');
  for (let k = x + 1; k < x + w; k += 3) px(ctx, k, y + 1, C.w4);
}

/** Muro de pedra com face, topo (passarela) e ameia opcional. */
function stoneWall(ctx, { w, base, faceTop, depth = 4, pal = STONE, seed = 1, merlons = [], merlonH = 5, ashlar = false, moss = 0.4 }) {
  const opts = ashlar ? { pal, seed, rowH: [4, 4], blockW: [7, 8], moss, cracks: 0.1 } : { pal, seed, moss, cracks: 0.25 };
  // Face.
  ctx.save(); ctx.translate(0, faceTop); stones(ctx, w, base - faceTop, opts); ctx.restore();
  veil(ctx, [[0, faceTop], [w, faceTop], [w, base], [0, base]], 0, faceTop, 0, base, [[0, 'rgba(255,236,190,0.06)'], [1, 'rgba(26,25,50,0.3)']]);
  baseShade(ctx, 0, base, w, 3);
  // Topo (capeamento visto de cima).
  rect(ctx, 0, faceTop - depth, w, depth, pal.light);
  for (let x = 0; x < w; x += 4) { rect(ctx, x + 3, faceTop - depth, 1, depth, pal.shade); px(ctx, x, faceTop - depth, pal.hi); }
  rect(ctx, 0, faceTop - 1, w, 1, pal.tones[0]);
  rect(ctx, 0, faceTop, w, 1, pal.deep);
  // Ameias.
  for (const [mx, mw] of merlons) {
    const mt = faceTop - depth - merlonH;
    ctx.save(); ctx.translate(mx, mt + 2); stones(ctx, mw, merlonH, { pal, seed: seed + mx, rowH: [3, 3], blockW: [4, 5] }); ctx.restore();
    rect(ctx, mx, mt, mw, 2, pal.light); rect(ctx, mx, mt, mw, 1, pal.hi); rect(ctx, mx + mw - 1, mt, 1, merlonH + 2, pal.shade);
  }
}

// ---------- Muralha ----------

function wallseg1(ctx) {
  // Paliçada: 3 toras pontudas amarradas, grama e pedras na base.
  for (const [x, top, seed] of [[0, 1, 1], [5, 0, 2], [10, 2, 3]]) stake(ctx, x + 0.5, top, 30, 5.2, seed);
  rope(ctx, 0, 12, 16); rope(ctx, 0, 22, 16);
  baseShade(ctx, 0, 30, 16, 3);
  grassTufts(ctx, 0, 30, 16, { seed: 4, density: 0.5 });
}

function wallcorner1(ctx) {
  // Poste de canto: tora grossa com plataforma e tocha apagada.
  stake(ctx, 4, 0, 40, 14, 5);
  for (const y of [12, 22, 31]) rope(ctx, 4, y, 14);
  rect(ctx, 2, 8, 18, 2, C.w4); rect(ctx, 2, 8, 18, 1, C.w6); rect(ctx, 2, 10, 18, 1, C.w2);
  // Escudo pendurado.
  ellipse(ctx, 11, 17, 3.3, 3.8, C.r1); ellipse(ctx, 10.6, 16.5, 2.5, 3, C.r3); rect(ctx, 10.5, 14, 1, 6, C.f3); rect(ctx, 8.5, 16, 5, 1, C.f3);
  baseShade(ctx, 4, 40, 14, 3);
  grassTufts(ctx, 2, 40, 18, { seed: 6, density: 0.5 });
}

function wallseg4(ctx) {
  stoneWall(ctx, { w: 16, base: 30, faceTop: 10, depth: 3, seed: 21, merlons: [[0, 8]] });
}

function wallcorner4(ctx) {
  // Torre de canto de pedra: corpo, topo com ameias, seteiras.
  const w = 26; const x = 2;
  ctx.save(); ctx.translate(x, 0);
  stoneWall(ctx, { w, base: 54, faceTop: 14, depth: 4, seed: 31, merlons: [[0, 5], [7, 5], [14, 5], [21, 5]], merlonH: 6 });
  ctx.restore();
  // Cinta de pedra e seteiras.
  rect(ctx, x - 1, 14, w + 2, 2, C.g4); rect(ctx, x - 1, 15, w + 2, 1, C.g2);
  for (const y of [22, 36]) { rect(ctx, x + 11, y, 3, 8, C.ink); rect(ctx, x + 12, y + 1, 1, 6, C.night); rect(ctx, x + 10, y + 8, 5, 1, C.g4); }
  veil(ctx, [[x + w - 7, 14], [x + w, 14], [x + w, 54], [x + w - 7, 54]], x + w - 7, 0, x + w, 0, [[0, 'rgba(26,25,50,0)'], [1, 'rgba(26,25,50,0.45)']]);
  veil(ctx, [[x, 14], [x + 6, 14], [x + 6, 54], [x, 54]], x, 0, x + 6, 0, [[0, 'rgba(255,236,190,0.18)'], [1, 'rgba(255,236,190,0)']]);
  grassTufts(ctx, x, 54, w, { seed: 8, density: 0.4 });
}

function wallseg8(ctx) {
  stoneWall(ctx, { w: 16, base: 36, faceTop: 12, depth: 3, pal: STONE_COOL, seed: 41, merlons: [[0, 8]], merlonH: 6, ashlar: true, moss: 0.3 });
  // Pilastra no meio do bloco.
  rect(ctx, 10, 13, 5, 23, C.slate3); rect(ctx, 10, 13, 1, 23, C.slate4); rect(ctx, 14, 13, 1, 23, C.slate);
  for (let y = 17; y < 36; y += 5) rect(ctx, 10, y, 5, 1, C.slate);
  baseShade(ctx, 0, 36, 16, 3);
}

function wallcorner8(ctx) {
  // Torre do castelo: corpo de cantaria, cinta, telhado cônico azul com bandeira, estandarte e janela acesa.
  const x = 4; const w = 28; const base = 76; const bodyTop = 30;
  ctx.save(); ctx.translate(x, 0);
  stoneWall(ctx, { w, base, faceTop: bodyTop, depth: 3, pal: STONE_COOL, seed: 51, ashlar: true, moss: 0.4 });
  ctx.restore();
  veil(ctx, [[x + w - 8, bodyTop], [x + w, bodyTop], [x + w, base], [x + w - 8, base]], x + w - 8, 0, x + w, 0, [[0, 'rgba(26,25,50,0)'], [1, 'rgba(26,25,50,0.5)']]);
  veil(ctx, [[x, bodyTop], [x + 7, bodyTop], [x + 7, base], [x, base]], x, 0, x + 7, 0, [[0, 'rgba(255,236,190,0.2)'], [1, 'rgba(255,236,190,0)']]);
  // Mata-cães (balcão de pedra) sob o telhado.
  rect(ctx, x - 2, bodyTop - 4, w + 4, 4, C.slate3); rect(ctx, x - 2, bodyTop - 4, w + 4, 1, C.slate4);
  for (let k = x - 1; k < x + w + 2; k += 4) { rect(ctx, k, bodyTop, 2, 2, C.slate2); px(ctx, k, bodyTop + 2, C.slate); }
  // Telhado cônico de telhas azuis.
  const apex = [x + w / 2, 3]; const eL = [x - 3, bodyTop - 3]; const eR = [x + w + 3, bodyTop - 3];
  const cone = [eL, apex, eR, [eR[0] - 2, eR[1] + 1.5], [eL[0] + 2, eL[1] + 1.5]];
  clip(ctx, cone, () => {
    for (let y = 3, row = 0; y < bodyTop; y += 3, row += 1) {
      for (let k = -20 + (row % 2) * 2; k < 60; k += 4) {
        const tone = (k + row) % 3 ? C.b2 : C.b1;
        rect(ctx, k, y, 3, 3, tone); px(ctx, k, y, C.b3); rect(ctx, k, y + 2, 3, 1, C.b0);
      }
    }
  });
  veil(ctx, cone, eL[0], 0, eR[0], 0, [[0, 'rgba(255,240,200,0.25)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(14,7,27,0.55)']]);
  line(ctx, apex[0], apex[1], eL[0], eL[1], C.b4, 0.8);
  line(ctx, eL[0], eL[1] + 0.5, eR[0], eR[1] + 0.5, C.ink, 1);
  // Mastro e flâmula.
  rect(ctx, apex[0] - 0.5, 0, 1, 5, C.w2);
  fillPoly(ctx, [[apex[0] + 0.5, 0], [apex[0] + 8, 1.5], [apex[0] + 0.5, 3.5]], C.f3);
  px(ctx, apex[0] + 1, 1, C.f4);
  // Estandarte azul com emblema e janela acesa.
  rect(ctx, x + 9, bodyTop + 6, 10, 18, C.b1); rect(ctx, x + 9, bodyTop + 6, 1, 18, C.b2); rect(ctx, x + 18, bodyTop + 6, 1, 18, C.b0);
  fillPoly(ctx, [[x + 9, bodyTop + 24], [x + 14, bodyTop + 28], [x + 19, bodyTop + 24]], C.b1);
  rect(ctx, x + 8, bodyTop + 5, 12, 1, C.f3);
  rect(ctx, x + 13, bodyTop + 10, 2, 9, C.f3); rect(ctx, x + 11, bodyTop + 12, 6, 2, C.f3); px(ctx, x + 13, bodyTop + 10, C.f4);
  windowLit(ctx, x + 12, base - 12, 4, 6, { arch: true, frame: { gap: C.deep, dark: C.slate, light: C.slate3, tones: [C.slate2] } });
  grassTufts(ctx, x, base, w, { seed: 9, density: 0.35 });
}

// ---------- Portões ----------

function gate1(ctx) {
  // Pórtico de toras com viga, crânio de troféu e tochas acesas em cima.
  for (const x of [3, 47]) { stake(ctx, x, 0, 36, 6, x); rope(ctx, x, 14, 6); rope(ctx, x, 26, 6); }
  rect(ctx, 3, 3, 50, 4, C.w3); rect(ctx, 3, 3, 50, 1, C.w5); rect(ctx, 3, 6, 50, 1, C.w1);
  for (let x = 8; x < 48; x += 6) px(ctx, x, 4, C.w2);
  // Placa de boas-vindas.
  rect(ctx, 21, 7, 14, 5, C.w4); rect(ctx, 21, 7, 14, 1, C.w6); rect(ctx, 21, 11, 14, 1, C.w2);
  for (let k = 0; k < 4; k += 1) rect(ctx, 23 + k * 3, 8.5, 2, 2, C.w1);
  baseShade(ctx, 3, 36, 6, 3); baseShade(ctx, 47, 36, 6, 3);
  grassTufts(ctx, 0, 36, 12, { seed: 2 }); grassTufts(ctx, 44, 36, 12, { seed: 3 });
}

function gate4(ctx) {
  // Portaria de madeira: duas torrinhas de toras com plataforma e paliçada, viga com estandarte.
  for (const x of [2, 48]) { rect(ctx, x, 46, 3, 4, C.w3); rect(ctx, x + 11, 46, 3, 4, C.w2); }
  ctx.save(); ctx.translate(0, 4); gate4Body(ctx); ctx.restore();
  grassTufts(ctx, 0, 50, 18, { seed: 5 }); grassTufts(ctx, 46, 50, 18, { seed: 6 });
}

function gate4Body(ctx) {
  for (const x of [2, 48]) {
    for (const [px0, s] of [[x, 1], [x + 11, 2]]) { rect(ctx, px0, 17, 3, 29, C.w3); rect(ctx, px0, 17, 1, 29, C.w5); rect(ctx, px0 + 2, 17, 1, 29, C.w2); }
    line(ctx, x + 2, 22, x + 12, 40, C.w2, 1.4); line(ctx, x + 12, 22, x + 2, 40, C.w2, 1.4);
    ctx.save(); ctx.translate(x - 1, 12); planks(ctx, 16, 5, { seed: x, size: 3 }); ctx.restore();
    for (let k = 0; k < 4; k += 1) stake(ctx, x - 1 + k * 4, 3, 13, 4, x + k);
    rope(ctx, x - 1, 8, 16);
    lanternBox(ctx, x + 6, 19);
    baseShade(ctx, x, 46, 14, 3);
  }
  // Viga e estandarte vermelho do acampamento.
  rect(ctx, 16, 17, 32, 4, C.w3); rect(ctx, 16, 17, 32, 1, C.w5); rect(ctx, 16, 20, 32, 1, C.w1);
  rect(ctx, 28, 21, 8, 6, C.r1); rect(ctx, 28, 21, 1, 6, C.r3);
  fillPoly(ctx, [[28, 27], [32, 29], [36, 27]], C.r1);
  ellipse(ctx, 32, 24, 1.8, 1.8, C.f3); px(ctx, 31, 23, C.f4);
}

function gate8(ctx) {
  // Casa do portão do castelo: duas torres de cantaria, arco com grade levantada, brasão e flâmulas.
  for (const x of [1, 53]) {
    ctx.save(); ctx.translate(x, 0);
    stoneWall(ctx, { w: 18, base: 56, faceTop: 16, depth: 3, pal: STONE_COOL, seed: 61 + x, ashlar: true, merlons: [[0, 4], [7, 4], [14, 4]], merlonH: 5 });
    ctx.restore();
    veil(ctx, [[x + 12, 16], [x + 18, 16], [x + 18, 56], [x + 12, 56]], x + 12, 0, x + 18, 0, [[0, 'rgba(26,25,50,0)'], [1, 'rgba(26,25,50,0.45)']]);
    windowLit(ctx, x + 7, 26, 4, 6, { arch: true, frame: { gap: C.deep, dark: C.slate, light: C.slate3, tones: [C.slate2] } });
    rect(ctx, x + 8.5, 0, 1, 9, C.w2);
    fillPoly(ctx, [[x + 9.5, 0], [x + 17, 2], [x + 9.5, 4.5]], C.b2);
    px(ctx, x + 10, 1, C.b4);
  }
  // Arco sobre a passagem (a passagem fica aberta).
  const L = 19; const R = 53;
  ctx.save(); ctx.beginPath(); ctx.rect(L, 14, R - L, 14); ctx.ellipse((L + R) / 2, 28, (R - L) / 2 - 2, 7, 0, Math.PI, 0, true); ctx.clip('evenodd');
  ctx.translate(L, 14); stones(ctx, R - L, 14, { pal: STONE_COOL, seed: 70, rowH: [4, 4], blockW: [5, 7] }); ctx.restore();
  // Aduelas do arco.
  for (let i = 0; i <= 8; i += 1) {
    const a = Math.PI + (i / 8) * Math.PI;
    const ax = (L + R) / 2 + Math.cos(a) * ((R - L) / 2 - 1.5); const ay = 28 + Math.sin(a) * 7.5;
    rect(ctx, ax - 1, ay - 1, 2.5, 2.5, i % 2 ? C.slate3 : C.slate4);
  }
  rect(ctx, L - 1, 12, R - L + 2, 3, C.slate3); rect(ctx, L - 1, 12, R - L + 2, 1, C.slate4); rect(ctx, L - 1, 14, R - L + 2, 1, C.slate);
  for (let k = L; k < R; k += 6) { ctx.save(); ctx.translate(k, 7); stones(ctx, 4, 5, { pal: STONE_COOL, seed: k, rowH: [3, 3], blockW: [4, 4] }); ctx.restore(); rect(ctx, k, 7, 4, 1, C.slate4); }
  // Grade levantada (pontas aparecendo sob o arco).
  for (let k = L + 4; k < R - 3; k += 3) { rect(ctx, k, 21, 1, 5, C.g1); px(ctx, k, 26, C.g3); }
  rect(ctx, L + 3, 22, R - L - 6, 1, C.g1);
  // Brasão no alto do arco.
  fillPoly(ctx, [[32, 14], [40, 14], [40, 19], [36, 22], [32, 19]], C.b1);
  fillPoly(ctx, [[32, 14], [36, 14], [36, 22], [32, 19]], C.b2);
  rect(ctx, 35.5, 15, 1, 5, C.f3); rect(ctx, 33.5, 16.5, 5, 1, C.f3);
  rect(ctx, 31, 13, 10, 1, C.f2);
  grassTufts(ctx, 0, 56, 20, { seed: 7 }); grassTufts(ctx, 52, 56, 20, { seed: 8 });
}

function wallDoor(ctx) {
  // Folha do portão: tábuas grossas, cravos e duas faixas de ferro.
  ctx.save(); planks(ctx, 18, 24, { vertical: true, seed: 3, size: 4, nails: false, pal: WOOD }); ctx.restore();
  rect(ctx, 0, 0, 18, 1, C.w1); rect(ctx, 0, 0, 1, 24, C.w1); rect(ctx, 17, 0, 1, 24, C.w1);
  for (const y of [4, 17]) {
    rect(ctx, 0, y, 18, 3, C.g2); rect(ctx, 0, y, 18, 1, C.g4); rect(ctx, 0, y + 2, 18, 1, C.g1);
    for (let x = 2; x < 18; x += 4) { px(ctx, x, y + 1, C.ink); px(ctx, x - 1, y, C.white); }
  }
  ellipse(ctx, 13, 12, 1.6, 1.6, C.f2); ellipse(ctx, 13, 12, 0.8, 0.8, C.w1);
  rect(ctx, 0, 21, 18, 3, 'rgba(26,25,50,0.35)');
}

function gateTorch(ctx) {
  // Tocha de ferro num poste com base de pedra, chama viva.
  rect(ctx, 3, 21, 4, 3, C.g3); rect(ctx, 3, 21, 4, 1, C.g4);
  rect(ctx, 4, 9, 2, 12, C.w3); rect(ctx, 4, 9, 1, 12, C.w5);
  fillPoly(ctx, [[2, 7], [8, 7], [7, 10], [3, 10]], C.g1); rect(ctx, 2, 7, 6, 1, C.g3);
  const layers = [[C.r3, 3.2, 8], [C.f1, 2.5, 6.5], [C.f3, 1.6, 4.5], [C.f4, 0.8, 2.6]];
  for (const [color, wdt, hgt] of layers) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(5 - wdt, 7.5);
    ctx.bezierCurveTo(5 - wdt, 7.5 - hgt * 0.5, 4.6, 7.5 - hgt * 0.8, 5.3, 7.5 - hgt);
    ctx.bezierCurveTo(5.6, 7.5 - hgt * 0.6, 5 + wdt, 7.5 - hgt * 0.45, 5 + wdt, 7.5); ctx.fill();
  }
}

function buildSite(ctx) {
  // Obra: placa com martelo, estacas com fita, tábuas empilhadas.
  rect(ctx, 10, 9, 2, 17, C.w3); rect(ctx, 10, 9, 1, 17, C.w5);
  ctx.save(); ctx.translate(1, 2); planks(ctx, 20, 10, { seed: 4, size: 5, pal: { gap: C.w2, dark: C.w3, tones: [C.sand, C.w6], light: C.cream, hi: C.paper } }); ctx.restore();
  rect(ctx, 1, 2, 20, 1, C.paper); rect(ctx, 1, 11, 20, 1, C.w2); rect(ctx, 20, 2, 1, 10, C.w3);
  line(ctx, 6, 10, 12, 4.5, C.w2, 1.2); rect(ctx, 11, 3, 5, 3, C.g2); rect(ctx, 11, 3, 5, 1, C.g4);
  for (let k = 0; k < 3; k += 1) { rect(ctx, 2 + k * 6, 22 - k, 7, 2, C.w4); rect(ctx, 2 + k * 6, 22 - k, 7, 1, C.w6); }
  for (let x = 0; x < 22; x += 2) px(ctx, x, 19, x % 4 ? C.f3 : C.ink);
  grassTufts(ctx, 0, 26, 22, { seed: 3, density: 0.4 });
}

// ---------- Arqueiro e canhão das torres (escala do herói, atrás do parapeito) ----------

function towerArcher(ctx) {
  // Busto do arqueiro: elmo de couro, rosto, gola, ombros verdes, arco em pé e aljava.
  ellipse(ctx, 10, 25, 9, 6, C.m1); rect(ctx, 1, 20, 18, 8, C.m1); rect(ctx, 2, 20, 6, 8, C.m2); rect(ctx, 15, 20, 3, 8, C.m0);
  rect(ctx, 6, 17, 8, 4, C.w3); rect(ctx, 6, 17, 8, 1, C.w5);
  ellipse(ctx, 10, 11, 5, 5.5, C.peach); ellipse(ctx, 9, 10, 3.5, 4, C.cream);
  px(ctx, 8, 11, C.ink); px(ctx, 12, 11, C.ink); rect(ctx, 9, 14, 3, 1, C.r2);
  ellipse(ctx, 10, 7, 6, 4, C.w3); rect(ctx, 4, 7, 12, 2, C.w2); rect(ctx, 5, 5, 4, 1, C.w5);
  line(ctx, 3, 18, 1, 26, C.w4, 1.4); rect(ctx, 0, 17, 3, 3, C.w2);
  ctx.strokeStyle = C.w3; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(19, 14, 12, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
  line(ctx, 14.6, 3, 14.6, 25, C.paper, 0.6);
}

function towerCannon(ctx) {
  // Canhão de bronze num reparo de madeira, boca para a direita.
  ctx.save(); ctx.translate(2, 4); planks(ctx, 18, 8, { seed: 3, size: 4 }); ctx.restore();
  for (const cx of [6, 16]) { ellipse(ctx, cx, 13, 4, 4, C.w1); ellipse(ctx, cx, 13, 3, 3, C.w4); ellipse(ctx, cx, 13, 1, 1, C.g1); }
  const g = ctx.createLinearGradient(0, 1, 0, 9); g.addColorStop(0, C.r5); g.addColorStop(0.4, C.f2); g.addColorStop(1, C.r2);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(30, 3); ctx.lineTo(30, 8); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
  rect(ctx, 30, 2, 4, 7, C.f2); rect(ctx, 30, 2, 4, 1, C.f4); ellipse(ctx, 34, 5.5, 1.2, 2.2, C.ink);
  for (const bx of [10, 18, 25]) rect(ctx, bx, 2, 2, 7, C.r5);
  ellipse(ctx, 4, 5.5, 2.5, 3.5, C.r2);
}

// ---------- Torres de vigia ----------

function tower1(ctx) {
  // Plataforma de madeira sobre 4 esteios, escada e parapeito de tábuas (arqueiros em y≈10).
  for (const [x, shade] of [[5, 0], [22, 1]]) { rect(ctx, x, 14, 3, 36, shade ? C.w2 : C.w3); rect(ctx, x, 14, 1, 36, shade ? C.w3 : C.w5); }
  line(ctx, 7, 20, 23, 44, C.w2, 1.3); line(ctx, 23, 20, 7, 44, C.w2, 1.3);
  rect(ctx, 6, 32, 18, 2, C.w3); rect(ctx, 6, 32, 18, 1, C.w4);
  // Escada.
  for (const lx of [12, 17]) rect(ctx, lx, 18, 1, 32, C.w4);
  for (let y = 21; y < 50; y += 4) rect(ctx, 12, y, 6, 1, C.w5);
  // Piso e parapeito.
  ctx.save(); ctx.translate(1, 10); planks(ctx, 28, 5, { seed: 6, size: 3 }); ctx.restore();
  rect(ctx, 1, 10, 28, 1, C.w6);
  for (let x = 2; x < 28; x += 4) { rect(ctx, x, 4, 2, 7, C.w3); px(ctx, x, 4, C.w5); }
  rect(ctx, 1, 6, 28, 1, C.w4);
  rect(ctx, 1, 15, 28, 1, 'rgba(26,25,50,0.5)');
  baseShade(ctx, 4, 50, 22, 3);
  grassTufts(ctx, 2, 50, 26, { seed: 4, density: 0.4 });
}

function towerWood(ctx) {
  // Torre de toras fechada (ícone do menu e alternativa): corpo de toras, plataforma com ameias de tábua.
  ctx.save(); ctx.translate(7, 17); logs(ctx, 16, 39, { seed: 3, size: 4 }); ctx.restore();
  rect(ctx, 13, 21, 4, 7, C.ink); rect(ctx, 14, 22, 2, 5, C.w1);
  door(ctx, 11, 32, 8, 24, { arch: false, step: false });
  ctx.save(); ctx.translate(1, 9); planks(ctx, 28, 8, { seed: 4, size: 4 }); ctx.restore();
  for (let x = 1; x < 29; x += 6) { ctx.save(); ctx.translate(x, 3); planks(ctx, 4, 6, { seed: x, size: 2, vertical: true, nails: false }); ctx.restore(); }
  rect(ctx, 1, 16, 28, 1, 'rgba(26,25,50,0.5)');
  rect(ctx, 26, 0, 1, 9, C.w2); fillPoly(ctx, [[27, 0], [30, 2], [27, 4]], C.red);
  baseShade(ctx, 7, 56, 16, 3);
}

function towerStone(ctx) {
  // Torre de pedra (estágio 4): corpo, seteira, porta, plataforma de pedra com ameias (arqueiros em y≈6).
  ctx.save(); ctx.translate(6, 0);
  stoneWall(ctx, { w: 18, base: 58, faceTop: 18, depth: 2, seed: 81, moss: 0.4 });
  ctx.restore();
  veil(ctx, [[18, 18], [24, 18], [24, 58], [18, 58]], 18, 0, 24, 0, [[0, 'rgba(26,25,50,0)'], [1, 'rgba(26,25,50,0.45)']]);
  rect(ctx, 13, 21, 4, 7, C.ink); rect(ctx, 14, 22, 2, 5, C.night);
  door(ctx, 11, 34, 8, 24, { step: false });
  // Plataforma em balanço com mísulas.
  ctx.save(); ctx.translate(1, 6); stones(ctx, 28, 9, { seed: 82, rowH: [4, 5], blockW: [5, 7] }); ctx.restore();
  rect(ctx, 1, 6, 28, 2, C.g4); rect(ctx, 1, 6, 28, 1, C.slate4);
  for (let x = 3; x < 28; x += 5) { rect(ctx, x, 15, 2, 3, C.g3); px(ctx, x, 17, C.g2); }
  for (const x of [1, 12, 23]) { ctx.save(); ctx.translate(x, 0); stones(ctx, 6, 6, { seed: x + 9, rowH: [3, 3], blockW: [3, 4] }); ctx.restore(); rect(ctx, x, 0, 6, 1, C.g4); }
  rect(ctx, 6, 15, 18, 1, 'rgba(26,25,50,0.55)');
  rect(ctx, 28, 0, 1, 7, C.w2);
}

function tower8(ctx) {
  // Torre imponente: corpo de cantaria com janelas acesas, sacada (arqueiros em y≈24) e telhado cônico vermelho.
  const x = 7; const w = 22; const base = 70; const deck = 24;
  ctx.save(); ctx.translate(x, 0);
  stoneWall(ctx, { w, base, faceTop: deck + 6, depth: 2, pal: STONE_COOL, seed: 91, ashlar: true, moss: 0.35 });
  ctx.restore();
  veil(ctx, [[x + w - 7, deck], [x + w, deck], [x + w, base], [x + w - 7, base]], x + w - 7, 0, x + w, 0, [[0, 'rgba(26,25,50,0)'], [1, 'rgba(26,25,50,0.5)']]);
  windowLit(ctx, x + 9, 35, 4, 5, { arch: true, frame: { gap: C.deep, dark: C.slate, light: C.slate3, tones: [C.slate2] } });
  door(ctx, x + 6, base - 24, 10, 24, { step: false, seed: 5 });
  // Sacada.
  rect(ctx, 3, deck, 30, 6, C.slate3); rect(ctx, 3, deck, 30, 1, C.slate4); rect(ctx, 3, deck + 5, 30, 1, C.slate);
  for (let k = 4; k < 32; k += 4) { rect(ctx, k, deck + 1, 2, 4, C.slate2); }
  for (let k = 5; k < 32; k += 5) { rect(ctx, k, deck + 6, 2, 2, C.slate2); px(ctx, k, deck + 8, C.slate); }
  // Pilares e telhado cônico.
  for (const px0 of [5, 29]) { rect(ctx, px0, deck - 8, 2, 8, C.w2); rect(ctx, px0, deck - 8, 1, 8, C.w4); }
  const apex = [18, 2]; const eL = [1, deck - 7]; const eR = [35, deck - 7];
  const cone = [eL, apex, eR, [eR[0] - 2, eR[1] + 1.5], [eL[0] + 2, eL[1] + 1.5]];
  clip(ctx, cone, () => {
    for (let y = 2, row = 0; y < deck; y += 3, row += 1) {
      for (let k = -10 + (row % 2) * 2; k < 50; k += 4) {
        const tone = (k + row) % 3 ? C.r3 : C.r2;
        rect(ctx, k, y, 3, 3, tone); px(ctx, k, y, C.r4); rect(ctx, k, y + 2, 3, 1, C.r0);
      }
    }
  });
  veil(ctx, cone, eL[0], 0, eR[0], 0, [[0, 'rgba(255,240,200,0.25)'], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(14,7,27,0.5)']]);
  line(ctx, apex[0], apex[1], eL[0], eL[1], C.r5, 0.8);
  line(ctx, eL[0], eL[1] + 0.5, eR[0], eR[1] + 0.5, C.ink, 1);
  rect(ctx, 17.5, 0, 1, 3, C.w2);
  fillPoly(ctx, [[18.5, 0], [25, 1.5], [18.5, 3]], C.f3);
  // Sombra do telhado sobre a sacada.
  rect(ctx, 5, deck - 2, 26, 2, 'rgba(26,25,50,0.35)');
  grassTufts(ctx, x - 2, base, w + 4, { seed: 9, density: 0.35 });
}

// Item 19: muralha, portões, porta, tocha e obra 2,6x; torres 3x (porta ~72 px). Arqueiro e canhão já em pixels finais.
export const WALL_SCALE = 2.6;
export const TOWER_SCALE = 3;
const BASE_PIECES = {
  'wallseg-1': { w: 16, h: 30, paint: wallseg1 },
  'wallcorner-1': { w: 22, h: 40, shadow: [11, 39, 9, 1.6], paint: wallcorner1 },
  'wallseg-4': { w: 16, h: 30, paint: wallseg4 },
  'wallcorner-4': { w: 30, h: 54, shadow: [15, 53, 13, 2], paint: wallcorner4 },
  'wallseg-8': { w: 16, h: 36, paint: wallseg8 },
  'wallcorner-8': { w: 36, h: 76, shadow: [18, 75, 16, 2.4], paint: wallcorner8 },
  'gate-1': { w: 56, h: 36, shadow: [28, 35, 24, 1.6], paint: gate1 },
  'gate-4': { w: 64, h: 50, shadow: [32, 49, 28, 2], paint: gate4 },
  'gate-8': { w: 72, h: 56, shadow: [36, 55, 32, 2.2], paint: gate8 },
  'wall-door': { w: 18, h: 24, paint: wallDoor },
  'gate-torch': { w: 10, h: 24, shadow: [5, 23, 3, 1], paint: gateTorch },
  'build-site': { w: 22, h: 26, shadow: [11, 25, 7, 1.4], paint: buildSite }
};
const TOWER_PIECES = {
  'tower-1': { w: 30, h: 50, shadow: [15, 48, 11, 2], paint: tower1 },
  'tower-wood': { w: 30, h: 58, shadow: [15, 56, 12, 2], paint: towerWood },
  'tower-stone': { w: 30, h: 58, shadow: [15, 56, 12, 2], paint: towerStone },
  'tower-8': { w: 36, h: 70, shadow: [18, 68, 14, 2.4], paint: tower8 }
};
export const DEFENSE_PIECES = {
  ...Object.fromEntries(Object.entries(BASE_PIECES).map(([k, v]) => [k, enlarge(v, WALL_SCALE)])),
  ...Object.fromEntries(Object.entries(TOWER_PIECES).map(([k, v]) => [k, enlarge(v, TOWER_SCALE)])),
  'tower-archer': { w: 22, h: 28, paint: towerArcher },
  'tower-cannon': { w: 36, h: 18, paint: towerCannon }
};
