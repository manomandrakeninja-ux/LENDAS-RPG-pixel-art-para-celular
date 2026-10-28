// Prédios do acampamento (atlas "buildings"): casa, ferreiro, fazenda e mercado em 3 estágios,
// fogueira (3 estágios x 4 quadros), cerca e lampião. Tamanhos e bases iguais aos antigos:
// 64 x 64 com a base da parede em y≈55 e 80 x 80 com a base em y≈69 (origem 0.5, 0.84).
import {
  C, STONE, STONE_COOL, STONE_DARK, WOOD, WOOD_DARK, WOOD_RED, ROOF_RED, ROOF_SLATE, ROOF_BLUE, ROOF_WOOD, THATCH,
  rng, rect, px, line, ellipse, fillPoly, clip, veil, stones, planks, logs, tiles, thatch, mossBand, mossPatches,
  windowLit, windowDark, door, barrel, crate, sack, woodpile, hangingSign, lanternBox, chimney, box, gableRoof, frontGable,
  baseShade, grassTufts, mixHex, KX, KY
} from './kit.mjs';

// ---------- Materiais compostos ----------

/** Reboco claro com manchas, rachaduras e reboco caído mostrando tijolo/pedra. */
function plaster(ctx, w, h, { seed = 21, tone = C.cream } = {}) {
  const r = rng(seed);
  rect(ctx, 0, 0, w, h, tone);
  for (let i = 0; i < w * h / 6; i += 1) px(ctx, r.int(0, w - 1), r.int(0, h - 1), r() < 0.6 ? C.peach : C.paper);
  for (let i = 0; i < 2; i += 1) {
    const x = r.int(2, w - 6); const y = r.int(2, h - 4);
    rect(ctx, x, y, 4, 2, C.w5); rect(ctx, x, y, 4, 1, C.w4); px(ctx, x + 2, y + 1, C.w3);
  }
  rect(ctx, 0, h - 1, w, 1, C.peach);
}

/** Enxaimel: vigas de madeira escura sobre o reboco. */
function timber(ctx, w, h, posts, { diag = true, beam = 2 } = {}) {
  const P = WOOD_DARK;
  rect(ctx, 0, 0, w, beam, P.tones[0]); rect(ctx, 0, 0, w, 1, P.light);
  rect(ctx, 0, h - beam, w, beam, P.tones[0]); rect(ctx, 0, h - beam, w, 1, P.light); rect(ctx, 0, h - 1, w, 1, P.gap);
  for (const x of posts) { rect(ctx, x, 0, 2, h, P.tones[0]); rect(ctx, x, 0, 1, h, P.light); rect(ctx, x + 2, 0, 1, h, 'rgba(28,18,28,0.35)'); }
  if (diag) {
    for (let i = 0; i < posts.length - 1; i += 1) {
      const a = posts[i] + 2; const b = posts[i + 1];
      if (b - a < 8) continue;
      line(ctx, a, beam, a + 4, h - beam, P.tones[0], 1.6);
      line(ctx, b, beam, b - 4, h - beam, P.tones[0], 1.6);
    }
  }
}

function stonePainter(opts) { return (ctx, w, h) => stones(ctx, w, h, opts); }
function roofPainter(opts) { return (ctx, w, h) => tiles(ctx, w, h, opts); }

/** Parede da frente: base de pedra até `stoneH` e o resto por `upper`. */
function mixedWall(stoneOpts, stoneH, upper) {
  return (ctx, w, h) => {
    if (upper) { upper(ctx, w, h - stoneH); }
    ctx.save(); ctx.translate(0, h - stoneH); stones(ctx, w, stoneH, stoneOpts); ctx.restore();
    rect(ctx, 0, h - stoneH, w, 1, C.g4);
  };
}

/** Luz geral na fachada: um pouco mais clara à esquerda, escurece embaixo. */
function frontLight(ctx, x, fy, w, base) {
  veil(ctx, [[x, fy], [x + w, fy], [x + w, base], [x, base]], x, fy, x + w, base,
    [[0, 'rgba(255,236,190,0.10)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.22)']]);
  baseShade(ctx, x, base, w, 3);
}

/** Sombra do beiral sobre a parede. */
function eaveShadow(ctx, x, y, w) {
  rect(ctx, x, y, w, 2, 'rgba(26,25,50,0.45)');
  rect(ctx, x, y + 2, w, 1, 'rgba(26,25,50,0.2)');
}

// ---------- Casa ----------

function house1(ctx) {
  // Cabana de toras com telhado de palha em "A", lenha e toco com machado.
  const x = 19; const base = 55; const w = 26; const h = 11; const d = 15;
  const { fy } = box(ctx, { x, base, w, h, d, kx: 0.08, front: (c, ww, hh) => logs(c, ww, hh, { seed: 3 }), side: (c, ww, hh) => logs(c, ww, hh, { seed: 4, ends: false }) });
  eaveShadow(ctx, x, fy, w);
  frontGable(ctx, { cx: x + w / 2, wallTop: fy, w, d, rise: 17, over: 3, drop: 3,
    roof: (c, ww, hh) => thatch(c, ww, hh, { seed: 7 }),
    pediment: (c, ww, hh) => logs(c, ww, hh, { seed: 9, ends: false }) });
  // Janelinha no frontão e porta.
  windowLit(ctx, x + w / 2 - 1.5, fy - 7, 3, 3);
  door(ctx, x + 10, base - 9, 6, 9, { arch: false, step: false });
  windowLit(ctx, x + 3, base - 8, 3, 3);
  frontLight(ctx, x, fy, w, base);
  woodpile(ctx, x + w + 1, base + 1, { cols: 3, rows: 2, r: 1.5 });
  // Toco com machado.
  ellipse(ctx, x - 4, base - 1, 2.6, 1.3, C.w5); rect(ctx, x - 6.5, base - 1, 5, 2, C.w3);
  line(ctx, x - 4, base - 2, x - 2, base - 6, C.w4, 1); rect(ctx, x - 3, base - 7, 2, 2, C.g3); px(ctx, x - 3, base - 7, C.g4);
  grassTufts(ctx, x - 8, base + 1, w + 16, { seed: 6 });
}

function house4(ctx) {
  const x = 12; const base = 55; const w = 36; const h = 19; const d = 16;
  const wall = mixedWall({ seed: 12, moss: 0.35 }, 8, (c, ww, hh) => { plaster(c, ww, hh, { seed: 4 }); timber(c, ww, hh, [0, 11, 23, ww - 2]); });
  const { fy, dx, dy } = box(ctx, { x, base, w, h, d, front: wall,
    side: mixedWall({ seed: 13, pal: STONE }, 8, (c, ww, hh) => { plaster(c, ww, hh, { seed: 5 }); timber(c, ww, hh, [0, ww - 2], { diag: false }); }) });
  // Chaminé atrás do telhado.
  chimney(ctx, x + w - 6, fy - 27, 5, 16, { seed: 3 });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 13, over: 3, drop: 2, roof: roofPainter({ seed: 7, moss: 0.5, barrel: true }), gable: (c, ww, hh) => { plaster(c, ww, hh, { seed: 9 }); } });
  // Lucarna na frente do telhado (empena para a frente) com janela redonda.
  frontGable(ctx, { cx: x + 17, wallTop: fy + 1, w: 14, d: 10, rise: 12, over: 1.5, drop: 1, roof: roofPainter({ seed: 9, pal: ROOF_RED, barrel: true }),
    pediment: (c, ww, hh) => { plaster(c, ww, hh, { seed: 2 }); rect(c, 0, hh - 2, ww, 2, C.w2); } });
  ellipse(ctx, x + 17, fy - 3.5, 2.6, 2.6, C.w1);
  ellipse(ctx, x + 17, fy - 3.5, 1.8, 1.8, C.f3); px(ctx, x + 16, fy - 5, C.f4); rect(ctx, x + 16.5, fy - 5.5, 1, 4, C.w2); rect(ctx, x + 15, fy - 4, 4, 1, C.w2);
  // Fachada: janelas, porta, lampião, floreira.
  windowLit(ctx, x + 4, fy + 4, 5, 5, { box: true });
  windowLit(ctx, x + 27, fy + 4, 5, 5, { box: true });
  door(ctx, x + 15, base - 11, 6, 11, { seed: 3 });
  lanternBox(ctx, x + 22, base - 12);
  frontLight(ctx, x, fy, w, base);
  // Janela na lateral.
  fillPoly(ctx, [[x + w + 2, fy + 6], [x + w + 4, fy + 4.6], [x + w + 4, fy + 9.6], [x + w + 2, fy + 11]], C.f2);
  // Em volta: barril de chuva, caixotes, flores.
  barrel(ctx, x + w + 3, base + 1, { w: 6, h: 7 });
  crate(ctx, x - 7, base - 6, 6);
  grassTufts(ctx, x - 8, base + 1, w + 18, { seed: 8, flowers: 0.2 });
}

function house8(ctx) {
  const x = 10; const base = 69; const w = 54; const h = 32; const d = 18;
  const front = (c, ww, hh) => {
    // Térreo de pedra e andar de enxaimel com beiral entre os dois.
    plaster(c, ww, 16, { seed: 31 });
    timber(c, ww, 16, [0, 12, 26, 40, ww - 2]);
    c.save(); c.translate(0, 16); stones(c, ww, hh - 16, { seed: 33, moss: 0.4, cracks: 0.2 }); c.restore();
    rect(c, 0, 16, ww, 2, C.w2); rect(c, 0, 16, ww, 1, C.w5);
  };
  const side = (c, ww, hh) => { plaster(c, ww, 16, { seed: 35 }); timber(c, ww, 16, [0, ww - 2], { diag: false }); c.save(); c.translate(0, 16); stones(c, ww, hh - 16, { seed: 34 }); c.restore(); };
  const { fy } = box(ctx, { x, base, w, h, d, front, side });
  chimney(ctx, x + 6, fy - 29, 6, 20, { seed: 5 });
  chimney(ctx, x + w - 7, fy - 31, 6, 22, { seed: 6 });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 13, over: 3, drop: 2, roof: roofPainter({ seed: 17, pal: ROOF_SLATE, moss: 0.6, tileW: 6 }), gable: (c, ww, hh) => plaster(c, ww, hh, { seed: 3 }) });
  // Duas lucarnas.
  for (const cx of [x + 15, x + 39]) {
    frontGable(ctx, { cx, wallTop: fy + 1, w: 12, d: 10, rise: 11, over: 1.5, drop: 1, roof: roofPainter({ seed: cx, pal: ROOF_SLATE, tileW: 5 }),
      pediment: (c, ww, hh) => { plaster(c, ww, hh, { seed: cx }); } });
    windowLit(ctx, cx - 2, fy - 4, 4, 4, { arch: true });
  }
  // Andar de cima: 3 janelas com venezianas; térreo: porta dupla e 2 janelas grandes.
  for (const wx of [x + 4, x + 31, x + 45]) windowLit(ctx, wx, fy + 4, 5, 6, { box: true });
  windowLit(ctx, x + 16, fy + 4, 5, 6, { box: true });
  windowLit(ctx, x + 5, base - 13, 7, 7, { shutters: true });
  windowLit(ctx, x + 41, base - 13, 7, 7, { shutters: true });
  door(ctx, x + 23, base - 14, 9, 14, { seed: 8 });
  // Placa com o brasão da casa (lua dourada).
  hangingSign(ctx, x + 34, base - 15, 5, 5, (c, sx, sy) => { ellipse(c, sx + 1.5, sy + 1.5, 1.5, 1.5, C.f3); ellipse(c, sx + 2.2, sy + 1.1, 1.2, 1.2, C.w4); });
  lanternBox(ctx, x + 20, base - 15);
  frontLight(ctx, x, fy, w, base);
  barrel(ctx, x + w + 4, base + 1, { w: 6, h: 8 });
  barrel(ctx, x + w + 8, base + 2, { w: 5, h: 6 });
  crate(ctx, x - 7, base - 7, 7);
  sack(ctx, x - 2, base + 1);
  grassTufts(ctx, x - 8, base + 2, w + 22, { seed: 18, flowers: 0.25 });
}

// ---------- Ferreiro ----------

function anvil(ctx, cx, base) {
  rect(ctx, cx - 2, base - 3, 4, 3, C.w2); rect(ctx, cx - 2, base - 3, 1, 3, C.w3);
  fillPoly(ctx, [[cx - 5, base - 6], [cx + 4, base - 6], [cx + 3, base - 4], [cx - 3, base - 4]], C.g1);
  rect(ctx, cx - 5, base - 7, 9, 1, C.g3); px(ctx, cx - 5, base - 7, C.g4);
  fillPoly(ctx, [[cx - 7, base - 7], [cx - 5, base - 7], [cx - 5, base - 5.5]], C.g2);
}

function hammerIcon(c, x, y, w, h) {
  rect(c, x + w / 2 - 0.5, y + 1, 1, h - 1, C.w2);
  rect(c, x, y, w, 2, C.g1); px(c, x, y, C.g3);
}

function forge1(ctx) {
  // Telheiro: 4 esteios, cobertura de tábuas, fornalha baixa de pedra e bigorna.
  const x = 13; const base = 55; const w = 38; const top = 30;
  const roofPts = [[x - 3, top + 2], [x + w + 3, top + 2], [x + w + 3 + 5, top - 6], [x + 2, top - 6]];
  for (const px0 of [x + w - 1 + 4, x + 5]) { rect(ctx, px0, top - 4, 2, base - top - 2, C.w2); }
  // Fornalha (fundo).
  ctx.save(); ctx.translate(x + 2, base - 12); stones(ctx, 12, 12, { seed: 3, rowH: [3, 4], blockW: [3, 5] }); ctx.restore();
  rect(ctx, x + 5, base - 7, 6, 5, C.ink); rect(ctx, x + 6, base - 5, 4, 3, C.f1); rect(ctx, x + 7, base - 5, 2, 2, C.f3); px(ctx, x + 7, base - 4, C.f4);
  ctx.save(); ctx.translate(x + 6, top - 12); stones(ctx, 5, 12, { seed: 4, rowH: [3, 3], blockW: [3, 4] }); ctx.restore();
  rect(ctx, x + 5, top - 13, 7, 2, C.g4);
  // Cobertura.
  clip(ctx, roofPts, () => { ctx.save(); ctx.translate(x - 3, top - 6); tiles(ctx, w + 12, 9, { pal: ROOF_WOOD, seed: 4, tileW: 5 }); ctx.restore(); });
  veil(ctx, roofPts, 0, top - 6, 0, top + 2, [[0, 'rgba(255,235,180,0.15)'], [1, 'rgba(26,25,50,0.25)']]);
  line(ctx, x - 3, top + 2.5, x + w + 3, top + 2.5, C.ink);
  rect(ctx, x - 3, top + 3, w + 6, 1, 'rgba(26,25,50,0.5)');
  for (const px0 of [x, x + w - 2]) { rect(ctx, px0, top + 2, 2, base - top - 2, C.w3); rect(ctx, px0, top + 2, 1, base - top - 2, C.w5); }
  line(ctx, x + 2, top + 8, x + 7, top + 3, C.w3, 1.2);
  line(ctx, x + w - 2, top + 8, x + w - 7, top + 3, C.w3, 1.2);
  // Bigorna, balde e ferramentas penduradas.
  anvil(ctx, x + 22, base);
  barrel(ctx, x + 31, base, { w: 5, h: 5 });
  rect(ctx, x + 29.5, base - 5, 4, 1, C.b2);
  for (const [tx, len] of [[x + 15, 5], [x + 18, 6]]) { line(ctx, tx + 0.5, top + 4, tx + 0.5, top + 4 + len, C.w2); rect(ctx, tx - 0.5, top + 3 + len, 3, 2, C.g2); }
  grassTufts(ctx, x - 4, base + 1, w + 10, { seed: 2 });
}

function forgeFront(seed) {
  return (c, w, h) => stones(c, w, h, { seed, moss: 0.3, cracks: 0.25, pal: STONE });
}

function forge4(ctx) {
  const x = 11; const base = 55; const w = 36; const h = 19; const d = 16;
  const { fy } = box(ctx, { x, base, w, h, d, front: forgeFront(41), side: (c, ww, hh) => stones(c, ww, hh, { seed: 42 }) });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 12, over: 3, drop: 2, roof: roofPainter({ seed: 43, pal: ROOF_SLATE, tileW: 5, moss: 0.3 }), gable: (c, ww, hh) => stones(c, ww, hh, { seed: 44 }) });
  // Chaminé alta de pedra à direita (fumaça animada sai do topo: x≈49, y≈11).
  chimney(ctx, x + 35, 12, 7, 32, { seed: 45 });
  rect(ctx, x + 35, 12, 7, 2, C.g1); rect(ctx, x + 36, 11, 5, 1, C.ink);
  // Boca da forja em arco com fogo.
  const fx = x + 5; const fw = 13; const ftop = base - 13;
  ellipse(ctx, fx + fw / 2, ftop + 1, fw / 2 + 1.5, 3.5, C.g4);
  rect(ctx, fx - 1.5, ftop + 1, fw + 3, 12, C.g4);
  ellipse(ctx, fx + fw / 2, ftop + 1, fw / 2, 2.6, C.ink);
  rect(ctx, fx, ftop + 1, fw, 12, C.ink);
  const g = ctx.createRadialGradient(fx + fw / 2, base - 3, 0, fx + fw / 2, base - 3, 9);
  g.addColorStop(0, C.f4); g.addColorStop(0.3, C.f3); g.addColorStop(0.6, C.f1); g.addColorStop(1, C.r1);
  ctx.fillStyle = g; ctx.fillRect(fx + 1, ftop + 3, fw - 2, 10);
  for (let i = 0; i < 5; i += 1) px(ctx, fx + 2 + i * 2.3, base - 2 - (i % 2), C.f4);
  rect(ctx, fx, base - 1, fw, 1, C.r1);
  // Luz da forja espalhando na parede.
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(fx + fw / 2, base - 4, 2, fx + fw / 2, base - 4, 14);
  glow.addColorStop(0, 'rgba(255,140,40,0.35)'); glow.addColorStop(1, 'rgba(255,140,40,0)');
  ctx.fillStyle = glow; ctx.fillRect(x, fy, w, h); ctx.restore();
  // Janela, placa com martelo, porta lateral.
  windowLit(ctx, x + 23, fy + 5, 4, 5);
  door(ctx, x + 28, base - 11, 6, 11, { seed: 9 });
  hangingSign(ctx, x + 21, base - 9, 5, 5, hammerIcon);
  frontLight(ctx, x, fy, w, base);
  // Pátio: bigorna, tina d'água, lenha/carvão e espadas encostadas.
  anvil(ctx, x - 1, base + 2);
  barrel(ctx, x + w + 5, base + 2, { w: 6, h: 6 });
  rect(ctx, x + w + 2.5, base - 4, 5, 1, C.b2); px(ctx, x + w + 3, base - 4, C.b4);
  for (let i = 0; i < 3; i += 1) { line(ctx, x + w + 9 + i * 1.6, base + 1, x + w + 10 + i * 1.6, base - 7, C.g4, 0.8); px(ctx, x + w + 10 + i * 1.6, base - 3, C.w2); }
  grassTufts(ctx, x - 6, base + 2, w + 18, { seed: 4 });
}

function forge8(ctx) {
  const x = 8; const base = 69; const w = 56; const h = 30; const d = 16;
  const { fy } = box(ctx, { x, base, w, h, d, front: forgeFront(51), side: (c, ww, hh) => stones(c, ww, hh, { seed: 52 }) });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 13, over: 3, drop: 2, roof: roofPainter({ seed: 53, pal: ROOF_SLATE, tileW: 5, moss: 0.3 }), gable: (c, ww, hh) => stones(c, ww, hh, { seed: 54 }) });
  // Chaminé larga (fumaça em x≈61, y≈5).
  chimney(ctx, x + 49, 6, 9, 36, { seed: 55 });
  rect(ctx, x + 49, 6, 9, 2, C.g1); rect(ctx, x + 50, 5, 7, 1, C.ink);
  chimney(ctx, x + 6, fy - 27, 6, 18, { seed: 56 });
  // Duas bocas de forja grandes com grade de ferro.
  for (const fx of [x + 5, x + 34]) {
    const fw = 15; const ftop = base - 16;
    ellipse(ctx, fx + fw / 2, ftop + 1, fw / 2 + 1.5, 4, C.g4);
    rect(ctx, fx - 1.5, ftop + 1, fw + 3, 15, C.g4);
    ellipse(ctx, fx + fw / 2, ftop + 1, fw / 2, 3, C.ink);
    rect(ctx, fx, ftop + 1, fw, 15, C.ink);
    const g = ctx.createRadialGradient(fx + fw / 2, base - 3, 0, fx + fw / 2, base - 3, 11);
    g.addColorStop(0, C.f4); g.addColorStop(0.3, C.f3); g.addColorStop(0.6, C.f1); g.addColorStop(1, C.r1);
    ctx.fillStyle = g; ctx.fillRect(fx + 1, ftop + 3, fw - 2, 13);
    for (let k = 2; k < fw - 1; k += 3) rect(ctx, fx + k, ftop + 2, 1, 14, 'rgba(28,18,28,0.75)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(fx + fw / 2, base - 5, 2, fx + fw / 2, base - 5, 16);
    glow.addColorStop(0, 'rgba(255,140,40,0.35)'); glow.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = glow; ctx.fillRect(x, fy, w, h); ctx.restore();
  }
  // Brasão: estandarte vermelho com martelo dourado no meio.
  rect(ctx, x + 24, fy + 3, 7, 13, C.r1); rect(ctx, x + 24, fy + 3, 1, 13, C.r3);
  fillPoly(ctx, [[x + 24, fy + 16], [x + 27.5, fy + 19], [x + 31, fy + 16]], C.r1);
  rect(ctx, x + 23, fy + 2, 9, 1, C.w4);
  rect(ctx, x + 27, fy + 7, 1, 7, C.f3); rect(ctx, x + 25, fy + 6, 5, 2, C.f3); px(ctx, x + 25, fy + 6, C.f4);
  windowLit(ctx, x + 4, fy + 4, 4, 5); windowLit(ctx, x + 47, fy + 4, 4, 5);
  door(ctx, x + 24, base - 12, 7, 12, { seed: 4 });
  frontLight(ctx, x, fy, w, base);
  // Pátio: bigorna grande, armas num cavalete, carvão e barril.
  anvil(ctx, x - 1, base + 2);
  rect(ctx, x + w + 2, base - 10, 1, 11, C.w2); rect(ctx, x + w + 9, base - 10, 1, 11, C.w2); rect(ctx, x + w + 1, base - 9, 10, 1, C.w4);
  for (let i = 0; i < 4; i += 1) { line(ctx, x + w + 3 + i * 2, base + 1, x + w + 3 + i * 2, base - 12, i % 2 ? C.g4 : C.slate3, 0.9); rect(ctx, x + w + 2.5 + i * 2, base - 8, 2, 1, C.w2); }
  barrel(ctx, x + 18, base + 3, { w: 5, h: 5 });
  for (let i = 0; i < 6; i += 1) ellipse(ctx, x + 10 + (i % 3) * 2, base + 2 - Math.floor(i / 3) * 1.5, 1.2, 1, C.g1);
  grassTufts(ctx, x - 6, base + 3, w + 22, { seed: 14 });
}

// ---------- Fazenda ----------

function crops(ctx, x, y, cols, rows, kind = 'wheat', seed = 1) {
  const r = rng(seed);
  for (let row = 0; row < rows; row += 1) {
    const ry = y + row * 4;
    rect(ctx, x, ry, cols * 4, 3, C.w2);
    rect(ctx, x, ry, cols * 4, 1, C.w3);
    for (let col = 0; col < cols; col += 1) {
      const cx = x + col * 4 + 1;
      if (kind === 'wheat') {
        for (let k = 0; k < 3; k += 1) { rect(ctx, cx + k, ry - 3, 1, 3, C.r5); px(ctx, cx + k, ry - 4, C.cream); }
        px(ctx, cx + 1, ry - 1, C.w5);
      } else if (kind === 'cabbage') {
        ellipse(ctx, cx + 1.2, ry - 1, 2, 1.6, C.m2); ellipse(ctx, cx + 0.8, ry - 1.5, 1, 0.8, C.m4);
      } else {
        rect(ctx, cx, ry - 3, 1, 3, C.m2); rect(ctx, cx + 2, ry - 2, 1, 2, C.m2); px(ctx, cx, ry - 4, C.m4);
        if (r() < 0.5) px(ctx, cx + 1, ry - 1, C.red);
      }
    }
  }
}

function fenceRun(ctx, x, y, len, { pal = WOOD } = {}) {
  rect(ctx, x, y + 2, len, 1, pal.light); rect(ctx, x, y + 3, len, 1, pal.dark);
  rect(ctx, x, y + 5, len, 1, pal.tones[0]); rect(ctx, x, y + 6, len, 1, pal.dark);
  for (let px0 = x; px0 <= x + len - 2; px0 += 6) {
    rect(ctx, px0, y, 2, 9, pal.tones[0]); rect(ctx, px0, y, 1, 9, pal.light); px(ctx, px0, y, pal.hi); px(ctx, px0 + 1, y + 8, pal.gap);
  }
}

function scarecrow(ctx, x, base) {
  rect(ctx, x, base - 13, 1, 13, C.w2);
  rect(ctx, x - 4, base - 10, 9, 1, C.w3);
  rect(ctx, x - 2, base - 10, 5, 5, C.r1); rect(ctx, x - 2, base - 10, 1, 5, C.r3);
  ellipse(ctx, x + 0.5, base - 12, 1.8, 1.8, C.sand);
  rect(ctx, x - 2.5, base - 15, 6, 1, C.w4); rect(ctx, x - 1, base - 17, 3, 2, C.w4);
  px(ctx, x, base - 12, C.ink); px(ctx, x + 1, base - 12, C.ink);
  for (const hx of [x - 5, x + 5]) px(ctx, hx, base - 10, C.r5);
}

function barnFront(seed) {
  return (c, w, h) => { planks(c, w, h, { pal: WOOD_RED, vertical: true, seed, size: 3, worn: 0.08 }); rect(c, 0, h - 4, w, 4, 'rgba(26,25,50,0.0)'); };
}

function barnDoors(ctx, x, y, w, h) {
  rect(ctx, x - 1, y - 1, w + 2, h + 1, C.paper);
  ctx.save(); ctx.translate(x, y); planks(ctx, w, h, { pal: WOOD_RED, vertical: true, seed: 2, size: 3, nails: false }); ctx.restore();
  rect(ctx, x + w / 2 - 0.5, y, 1, h, C.paper);
  for (const sx of [x, x + w / 2 + 0.5]) { line(ctx, sx + 0.5, y + 0.5, sx + w / 2 - 1, y + h - 0.5, C.paper, 1); line(ctx, sx + w / 2 - 1, y + 0.5, sx + 0.5, y + h - 0.5, C.paper, 1); }
}

function silo(ctx, x, base, w, h) {
  const top = base - h;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.g3); g.addColorStop(0.3, C.slate4); g.addColorStop(0.6, C.g3); g.addColorStop(1, C.g1);
  ctx.fillStyle = g; ctx.fillRect(x, top, w, h);
  for (let y = top + 3; y < base; y += 4) rect(ctx, x, y, w, 1, 'rgba(28,18,28,0.35)');
  for (let y = top + 2; y < base; y += 8) for (let k = 1; k < w; k += 3) px(ctx, x + k, y, C.g4);
  ellipse(ctx, x + w / 2, top, w / 2 + 0.5, 3, C.r1);
  fillPoly(ctx, [[x - 0.5, top], [x + w / 2, top - 5], [x + w + 0.5, top]], C.r3);
  fillPoly(ctx, [[x + w / 2, top - 5], [x + w + 0.5, top], [x + w / 2 + 1, top]], C.r1);
  line(ctx, x, top + 0.5, x + w / 2, top - 4.5, C.r4, 1);
  baseShade(ctx, x, base, w, 3);
  rect(ctx, x + w / 2 - 1, top + 4, 2, 3, C.ink);
}

function farm1(ctx) {
  // Galpão de tábuas, horta com cerca e espantalho.
  const x = 10; const base = 44; const w = 18; const h = 11; const d = 10;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => planks(c, ww, hh, { vertical: true, seed: 6, size: 3 }), side: (c, ww, hh) => planks(c, ww, hh, { vertical: true, seed: 7, size: 3 }) });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 9, over: 2, drop: 2, roof: roofPainter({ seed: 3, pal: ROOF_WOOD, tileW: 5 }), gable: (c, ww, hh) => planks(c, ww, hh, { seed: 8, vertical: true, size: 3 }) });
  door(ctx, x + 6, base - 8, 6, 8, { arch: false, step: false, seed: 2 });
  frontLight(ctx, x, fy, w, base);
  // Ferramentas encostadas.
  line(ctx, x - 1.5, base, x - 0.5, base - 10, C.w4, 1); rect(ctx, x - 3, base - 11, 3, 1, C.g3);
  line(ctx, x + w + 1.5, base, x + w + 0.5, base - 9, C.w4, 1); rect(ctx, x + w, base - 10, 2, 3, C.g3);
  // Horta.
  crops(ctx, 33, 42, 5, 3, 'sprout', 3);
  fenceRun(ctx, 30, 49, 26);
  scarecrow(ctx, 47, 40);
  sack(ctx, 26, 56);
  crops(ctx, 12, 52, 3, 1, 'cabbage', 4);
  grassTufts(ctx, 6, 58, 52, { seed: 9, flowers: 0.15 });
}

function farm4(ctx) {
  // Celeiro vermelho com portas em X, palheiro, silo e trigo.
  const x = 20; const base = 50; const w = 26; const h = 18; const d = 13;
  silo(ctx, 8, 50, 9, 30);
  const { fy } = box(ctx, { x, base, w, h, d, front: barnFront(4), side: barnFront(5) });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 12, over: 2, drop: 2, roof: roofPainter({ seed: 6, pal: ROOF_SLATE, tileW: 5, moss: 0.4 }), gable: barnFront(7) });
  // Frontão com o palheiro (portinhola aberta com feno).
  rect(ctx, x + 10, fy + 2, 6, 4, C.w1); rect(ctx, x + 11, fy + 4, 4, 2, C.r5); px(ctx, x + 12, fy + 3, C.cream);
  rect(ctx, x + 9, fy + 1, 8, 1, C.paper); rect(ctx, x + 12.5, fy - 2, 1, 3, C.g1);
  barnDoors(ctx, x + 7, base - 10, 12, 10);
  rect(ctx, x, fy + h - 1, w, 1, C.paper);
  frontLight(ctx, x, fy, w, base);
  // Fardos de feno e trigo na frente.
  for (const [bx, by] of [[x + w + 2, base - 5], [x + w + 6, base - 2]]) {
    rect(ctx, bx, by, 6, 4, C.r5); rect(ctx, bx, by, 6, 1, C.cream); rect(ctx, bx + 2, by, 1, 4, C.w4); rect(ctx, bx, by + 3, 6, 1, C.w4);
  }
  crops(ctx, 10, 58, 11, 1, 'wheat', 5);
  fenceRun(ctx, 6, 52, 14);
  grassTufts(ctx, 4, 62, 56, { seed: 11, flowers: 0.12 });
}

function windmill(ctx, cx, base) {
  // Torre de pedra cônica com pás de lona.
  const top = base - 30;
  fillPoly(ctx, [[cx - 6, base], [cx - 4, top], [cx + 4, top], [cx + 6, base]], C.g3);
  clip(ctx, [[cx - 6, base], [cx - 4, top], [cx + 4, top], [cx + 6, base]], () => { ctx.save(); ctx.translate(cx - 6, top); stones(ctx, 12, 30, { seed: 3, rowH: [3, 4], blockW: [3, 5], pal: STONE }); ctx.restore(); });
  veil(ctx, [[cx - 6, base], [cx - 4, top], [cx + 4, top], [cx + 6, base]], cx - 6, 0, cx + 6, 0, [[0, 'rgba(255,236,190,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.45)']]);
  fillPoly(ctx, [[cx - 6, top + 1], [cx, top - 6], [cx + 6, top + 1]], C.r3);
  fillPoly(ctx, [[cx, top - 6], [cx + 6, top + 1], [cx + 1, top + 1]], C.r1);
  rect(ctx, cx - 1.5, base - 7, 3, 7, C.w1);
  windowLit(ctx, cx - 1, top + 9, 2, 3);
  // Pás.
  const hub = [cx, top + 2];
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const ex = hub[0] + Math.cos(a) * 15; const ey = hub[1] + Math.sin(a) * 15;
    line(ctx, hub[0], hub[1], ex, ey, C.w2, 1);
    const nx = -Math.sin(a) * 3; const ny = Math.cos(a) * 3;
    fillPoly(ctx, [[hub[0] + Math.cos(a) * 4, hub[1] + Math.sin(a) * 4], [ex, ey], [ex + nx, ey + ny], [hub[0] + Math.cos(a) * 4 + nx, hub[1] + Math.sin(a) * 4 + ny]], i % 2 ? C.paper : C.cream);
    line(ctx, hub[0] + Math.cos(a) * 9 + nx * 0.1, hub[1] + Math.sin(a) * 9, hub[0] + Math.cos(a) * 9 + nx, hub[1] + Math.sin(a) * 9 + ny, C.w4, 0.6);
  }
  ellipse(ctx, hub[0], hub[1], 1.6, 1.6, C.w1); px(ctx, hub[0] - 1, hub[1] - 1, C.w5);
}

function farm8(ctx) {
  const x = 30; const base = 58; const w = 34; const h = 22; const d = 15;
  windmill(ctx, 14, 58);
  silo(ctx, 66, 58, 10, 36);
  const { fy } = box(ctx, { x, base, w, h, d, front: barnFront(14), side: barnFront(15) });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 13, over: 2, drop: 2, roof: roofPainter({ seed: 16, pal: ROOF_SLATE, tileW: 5, moss: 0.4 }), gable: barnFront(17) });
  frontGable(ctx, { cx: x + 17, wallTop: fy + 1, w: 14, d: 8, rise: 9, over: 1.5, drop: 1, roof: roofPainter({ seed: 18, pal: ROOF_SLATE, tileW: 5 }), pediment: barnFront(19) });
  rect(ctx, x + 14.5, fy - 5, 5, 4, C.w1); rect(ctx, x + 15.5, fy - 3, 3, 2, C.r5);
  rect(ctx, x + 16.5, fy - 9, 1, 4, C.g1);
  barnDoors(ctx, x + 10, base - 13, 14, 13);
  windowLit(ctx, x + 3, fy + 6, 4, 4); windowLit(ctx, x + 27, fy + 6, 4, 4);
  rect(ctx, x, fy + h - 1, w, 1, C.paper);
  frontLight(ctx, x, fy, w, base);
  // Campos e cerca branca; galinheiro de caixotes e abóboras.
  crops(ctx, 4, 70, 9, 1, 'wheat', 7);
  crops(ctx, 44, 70, 8, 1, 'cabbage', 8);
  for (const [px0, py0] of [[x - 6, base - 1], [x - 3, base + 1]]) { ellipse(ctx, px0, py0, 2, 1.6, C.r4); px(ctx, px0, py0 - 2, C.m2); px(ctx, px0 - 1, py0 - 1, C.r5); }
  fenceRun(ctx, 2, 63, 76, { pal: { gap: C.g2, dark: C.g4, tones: [C.slate4], light: C.white, hi: C.white } });
  crate(ctx, x + w + 4, base - 6, 6);
  grassTufts(ctx, 2, 76, 76, { seed: 19, flowers: 0.12 });
}

// ---------- Mercado ----------

function awning(ctx, x, y, w, depth, colors = [C.red, C.paper]) {
  // Toldo listrado inclinado com franja ondulada.
  const pts = [[x, y + depth], [x + 2, y], [x + w - 2, y], [x + w, y + depth]];
  clip(ctx, pts, () => { for (let k = 0; k < w; k += 3) rect(ctx, x + k, y, 3, depth, colors[(k / 3) % 2]); });
  veil(ctx, pts, 0, y, 0, y + depth, [[0, 'rgba(255,240,200,0.18)'], [1, 'rgba(26,25,50,0.2)']]);
  for (let k = 0; k < w; k += 3) { ellipse(ctx, x + k + 1.5, y + depth, 1.5, 1.2, colors[(k / 3) % 2]); px(ctx, x + k + 1, y + depth + 1, 'rgba(26,25,50,0.4)'); }
  rect(ctx, x, y + depth + 2, w, 1, 'rgba(26,25,50,0.45)');
}

function produce(ctx, x, y, w) {
  const r = rng(x * 7 + y);
  for (let i = 0; i < w; i += 2) {
    const color = r.pick([C.red, C.f2, C.m3, C.f3, C.r4]);
    ellipse(ctx, x + i + 1, y, 1.1, 1, color); px(ctx, x + i, y - 1, C.white);
  }
}

function stall(ctx, x, base, w, colors) {
  rect(ctx, x + 1, base - 14, 1, 14, C.w2); rect(ctx, x + w - 2, base - 14, 1, 14, C.w2);
  ctx.save(); ctx.translate(x, base - 6); planks(ctx, w, 6, { seed: x, size: 3 }); ctx.restore();
  rect(ctx, x - 1, base - 7, w + 2, 2, C.w5); rect(ctx, x - 1, base - 7, w + 2, 1, C.w6);
  produce(ctx, x + 1, base - 8, w - 2);
  awning(ctx, x - 2, base - 17, w + 4, 5, colors);
}

function store1(ctx) {
  // Barraca de feira: toldo listrado, bancada com frutas, caixotes e sacos.
  stall(ctx, 16, 53, 30, [C.red, C.paper]);
  crate(ctx, 7, 46, 7);
  crate(ctx, 47, 47, 6);
  sack(ctx, 12, 56);
  barrel(ctx, 52, 57, { w: 5, h: 6 });
  rect(ctx, 47, 24, 2, 26, C.w2); rect(ctx, 47, 24, 1, 26, C.w4); rect(ctx, 37, 23, 12, 1, C.w3);
  hangingSign(ctx, 37, 27, 10, 5, (c, sx, sy, sw) => { ellipse(c, sx + 4, sy + 1.5, 1.5, 1.5, C.f3); px(c, sx + 3, sy + 1, C.f4); });
  grassTufts(ctx, 4, 58, 56, { seed: 21, flowers: 0.15 });
}

function store4(ctx) {
  const x = 12; const base = 55; const w = 38; const h = 20; const d = 13;
  const { fy } = box(ctx, { x, base, w, h, d, front: (c, ww, hh) => planks(c, ww, hh, { seed: 61, size: 3, pal: WOOD }), side: (c, ww, hh) => planks(c, ww, hh, { seed: 62, size: 3 }) });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 13, over: 3, drop: 2, roof: roofPainter({ seed: 63, moss: 0.3, barrel: true }), gable: (c, ww, hh) => planks(c, ww, hh, { seed: 64, size: 3, vertical: true }) });
  frontGable(ctx, { cx: x + 19, wallTop: fy + 1, w: 16, d: 10, rise: 13, over: 1.5, drop: 1, roof: roofPainter({ seed: 65, barrel: true }),
    pediment: (c, ww, hh) => planks(c, ww, hh, { seed: 66, size: 3, vertical: true }) });
  // Placa grande no frontão (moeda).
  rect(ctx, x + 15, fy - 6, 8, 5, C.w1); rect(ctx, x + 15.5, fy - 5.5, 7, 4, C.w5);
  ellipse(ctx, x + 19, fy - 3.5, 1.6, 1.6, C.f3); px(ctx, x + 18, fy - 4.5, C.f4);
  // Balcão com toldo e mercadorias.
  rect(ctx, x + 3, fy + 4, 32, 9, C.w1);
  windowLit(ctx, x + 5, fy + 5, 6, 5); windowLit(ctx, x + 27, fy + 5, 6, 5);
  door(ctx, x + 16, fy + 6, 6, h - 6, { seed: 6 });
  awning(ctx, x - 1, fy + 1, w + 2, 4, [C.b2, C.paper]);
  ctx.save(); ctx.translate(x + 1, base - 5); planks(ctx, 13, 5, { seed: 2, size: 3 }); ctx.restore();
  ctx.save(); ctx.translate(x + 24, base - 5); planks(ctx, 13, 5, { seed: 3, size: 3 }); ctx.restore();
  produce(ctx, x + 2, base - 6, 11); produce(ctx, x + 25, base - 6, 11);
  frontLight(ctx, x, fy, w, base);
  crate(ctx, x - 7, base - 6, 6); sack(ctx, x + w + 3, base + 1); barrel(ctx, x + w + 8, base + 2, { w: 5, h: 6 });
  grassTufts(ctx, x - 8, base + 2, w + 20, { seed: 22, flowers: 0.2 });
}

function store8(ctx) {
  // Casa de comércio de dois andares + barracas coloridas na frente + bandeiras.
  const x = 14; const base = 56; const w = 52; const h = 28; const d = 14;
  const front = (c, ww, hh) => { plaster(c, ww, 14, { seed: 71 }); timber(c, ww, 14, [0, 12, 24, 38, ww - 2]); c.save(); c.translate(0, 14); planks(c, ww, hh - 14, { seed: 72, size: 3 }); c.restore(); rect(c, 0, 14, ww, 1, C.w5); };
  const side = (c, ww, hh) => { plaster(c, ww, 14, { seed: 73 }); c.save(); c.translate(0, 14); planks(c, ww, hh - 14, { seed: 74, size: 3 }); c.restore(); };
  const { fy } = box(ctx, { x, base, w, h, d, front, side });
  chimney(ctx, x + w - 8, fy - 27, 5, 17, { seed: 75 });
  eaveShadow(ctx, x, fy, w);
  gableRoof(ctx, { x, wallTop: fy, w, d, rise: 13, over: 3, drop: 2, roof: roofPainter({ seed: 76, moss: 0.4, barrel: true }), gable: (c, ww, hh) => plaster(c, ww, hh, { seed: 77 }) });
  frontGable(ctx, { cx: x + 26, wallTop: fy + 1, w: 16, d: 10, rise: 13, over: 1.5, drop: 1, roof: roofPainter({ seed: 78, barrel: true }), pediment: (c, ww, hh) => plaster(c, ww, hh, { seed: 79 }) });
  ellipse(ctx, x + 26, fy - 3.5, 3, 3, C.w1); ellipse(ctx, x + 26, fy - 3.5, 2.2, 2.2, C.f3); px(ctx, x + 25, fy - 5, C.white);
  for (const wx of [x + 4, x + 16, x + 31, x + 43]) windowLit(ctx, wx, fy + 4, 5, 6, { box: true });
  door(ctx, x + 23, base - 12, 7, 12, { seed: 7 });
  frontLight(ctx, x, fy, w, base);
  // Bandeiras no cume.
  for (const [fx, color] of [[x + 6, C.b2], [x + 46, C.red]]) {
    rect(ctx, fx, fy - 26, 1, 12, C.w2);
    fillPoly(ctx, [[fx + 1, fy - 26], [fx + 7, fy - 24], [fx + 1, fy - 21]], color);
    px(ctx, fx + 2, fy - 25, C.white);
  }
  // Barracas na frente.
  stall(ctx, 3, 72, 20, [C.m1, C.paper]);
  stall(ctx, 57, 72, 20, [C.r1, C.paper]);
  crate(ctx, 27, 66, 6); barrel(ctx, 52, 73, { w: 5, h: 6 }); sack(ctx, 33, 73);
  grassTufts(ctx, 2, 75, 76, { seed: 24, flowers: 0.2 });
}

// ---------- Fogueira ----------

function flame(ctx, cx, base, height, width, frame, seed = 1) {
  const r = rng(seed + frame * 13);
  // Línguas de fogo (deslocamento x, altura relativa, largura relativa), mudando a cada quadro.
  const sets = [
    [[-0.75, 0.5, 0.35], [-0.1, 1, 0.5], [0.55, 0.68, 0.38], [-0.4, 0.8, 0.35], [0.25, 0.6, 0.35]],
    [[-0.7, 0.66, 0.35], [0.1, 0.86, 0.5], [0.7, 0.5, 0.33], [0.4, 0.95, 0.35], [-0.3, 0.55, 0.35]],
    [[-0.8, 0.58, 0.33], [-0.15, 1.05, 0.48], [0.5, 0.8, 0.36], [-0.45, 0.66, 0.35], [0.15, 0.62, 0.4]],
    [[-0.6, 0.78, 0.35], [0.0, 0.84, 0.5], [0.75, 0.6, 0.33], [0.35, 1.0, 0.33], [-0.35, 0.5, 0.4]]
  ][frame % 4];
  const layers = [[1, C.r3], [0.8, C.f0], [0.68, C.f1], [0.5, C.f2], [0.32, C.f3], [0.16, C.f4]];
  for (const [k, color] of layers) {
    ctx.fillStyle = color;
    for (const [ox, hf, wf] of sets) {
      const hgt = height * hf * (0.25 + 0.75 * k);
      const wid = width * wf * (0.3 + 0.7 * k) + 0.4;
      const x0 = cx + ox * width * (0.4 + 0.6 * k);
      const lean = ox * 1.5 + (frame % 2 ? 0.6 : -0.6);
      ctx.beginPath();
      ctx.moveTo(x0 - wid, base);
      ctx.bezierCurveTo(x0 - wid * 1.2, base - hgt * 0.4, x0 - wid * 0.4 + lean * 0.4, base - hgt * 0.75, x0 + lean, base - hgt);
      ctx.bezierCurveTo(x0 + wid * 0.5 + lean * 0.3, base - hgt * 0.65, x0 + wid * 1.2, base - hgt * 0.35, x0 + wid, base);
      ctx.closePath(); ctx.fill();
    }
  }
  for (let i = 0; i < 3; i += 1) px(ctx, Math.round(cx + r.range(-width, width)), Math.round(base - height - 1 - r() * 5), r() < 0.5 ? C.f3 : C.f2);
}

function stoneRing(ctx, cx, cy, rx, ry, n, size = 2.2, pal = STONE) {
  const back = []; const frontS = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    (Math.sin(a) < 0 ? back : frontS).push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, i]);
  }
  const rock = ([sx, sy, i]) => {
    const tone = [pal.tones[0], pal.tones[1], pal.tones[2]][i % 3];
    ellipse(ctx, sx, sy, size, size * 0.78, pal.shade);
    ellipse(ctx, sx - 0.3, sy - 0.4, size - 0.5, size * 0.78 - 0.5, tone);
    ellipse(ctx, sx - 0.7, sy - 0.9, size * 0.4, size * 0.3, pal.light);
  };
  return { back: () => back.forEach(rock), front: () => frontS.forEach(rock) };
}

function campfire(ctx, frame, { w, h, base, rx, ry, n, flameH, flameW, logsN = 3, size = 2.2, extra }) {
  const cx = w / 2;
  const ring = stoneRing(ctx, cx, base - ry, rx, ry, n, size);
  ring.back();
  // Brasas e cinza.
  ellipse(ctx, cx, base - ry, rx - 1.5, ry - 1, C.g1);
  ellipse(ctx, cx, base - ry, rx - 3, ry - 2, C.r1);
  for (let i = 0; i < 6; i += 1) px(ctx, Math.round(cx - rx + 3 + i * (rx - 2) / 3), Math.round(base - ry + (i % 2 ? 0 : -1)), i % 2 ? C.f1 : C.r3);
  // Toras cruzadas.
  for (let i = 0; i < logsN; i += 1) {
    const a = -0.5 + i * (1 / Math.max(1, logsN - 1));
    const lx = Math.cos(a * 2.4) * (rx - 1); const ly = Math.sin(a * 2.4) * (ry - 1);
    line(ctx, cx - lx, base - ry + ly * 0.5, cx + lx * 0.4, base - ry - 2 - ly * 0.3, C.w2, 2.2);
    line(ctx, cx - lx, base - ry + ly * 0.5 - 0.6, cx + lx * 0.4, base - ry - 2.6 - ly * 0.3, C.w4, 0.8);
    ellipse(ctx, cx - lx, base - ry + ly * 0.5, 1.1, 1.1, C.w5);
  }
  flame(ctx, cx, base - ry + 1, flameH, flameW, frame, w);
  ring.front();
  extra?.(ctx, frame);
}

function brazier(ctx, cx, base, frame, s = 1) {
  // Braseiro de ferro com tigela e pés (estágio 8, nas laterais).
  rect(ctx, cx - 0.5, base - 6 * s, 1, 6 * s, C.g1);
  line(ctx, cx, base - 3 * s, cx - 2.5 * s, base, C.g1, 1); line(ctx, cx, base - 3 * s, cx + 2.5 * s, base, C.g1, 1);
  fillPoly(ctx, [[cx - 3 * s, base - 9 * s], [cx + 3 * s, base - 9 * s], [cx + 2 * s, base - 6 * s], [cx - 2 * s, base - 6 * s]], C.g2);
  rect(ctx, cx - 3 * s, base - 9 * s, 6 * s, 1, C.g4);
  flame(ctx, cx, base - 9 * s, 6 * s, 2 * s, (frame + 1) % 4, 7);
}

// ---------- Cerca e lampião ----------

function fence(ctx) {
  // Cerca rústica: 3 mourões e 2 travessas, com grama na base.
  const P = WOOD;
  for (const y of [5, 9]) {
    rect(ctx, 0, y, 32, 2, P.tones[0]); rect(ctx, 0, y, 32, 1, P.light); rect(ctx, 0, y + 2, 32, 1, 'rgba(26,25,50,0.35)');
    for (let x = 3; x < 32; x += 7) px(ctx, x, y + 1, P.dark);
  }
  for (const x of [1, 15, 29]) {
    rect(ctx, x, 2, 3, 13, P.tones[0]); rect(ctx, x, 2, 1, 13, P.light); rect(ctx, x + 2, 2, 1, 13, P.dark);
    rect(ctx, x, 2, 3, 1, P.hi); px(ctx, x + 1, 7, C.g1); px(ctx, x + 1, 11, C.g1);
    rect(ctx, x, 13, 3, 2, 'rgba(26,25,50,0.4)');
  }
  grassTufts(ctx, 0, 16, 32, { seed: 3, density: 0.4, flowers: 0.05 });
}

function lamp(ctx) {
  // Poste de ferro com braço, lanterna acesa e base de pedra.
  const cx = 10;
  rect(ctx, cx - 3, 31, 6, 3, C.g3); rect(ctx, cx - 3, 31, 6, 1, C.g4); rect(ctx, cx - 3, 33, 6, 1, C.g2);
  rect(ctx, cx - 1, 9, 2, 22, C.g1); rect(ctx, cx - 1, 9, 1, 22, C.g2);
  rect(ctx, cx - 2, 28, 4, 1, C.g2);
  ellipse(ctx, cx, 8, 1.6, 1.4, C.g1);
  // Lanterna.
  rect(ctx, cx - 3, 10, 6, 1, C.g1); rect(ctx, cx - 2, 9, 4, 1, C.g2);
  rect(ctx, cx - 3, 11, 6, 7, C.f2);
  rect(ctx, cx - 2, 12, 4, 5, C.f3); rect(ctx, cx - 1, 13, 2, 3, C.f4); px(ctx, cx - 2, 12, C.white);
  rect(ctx, cx - 3, 11, 1, 7, C.g1); rect(ctx, cx + 2, 11, 1, 7, C.ink); rect(ctx, cx - 0.5, 11, 1, 7, 'rgba(28,18,28,0.6)');
  rect(ctx, cx - 4, 18, 8, 1, C.g1); rect(ctx, cx - 4, 18, 8, 0.5, C.g3);
  fillPoly(ctx, [[cx - 4, 10], [cx, 6], [cx + 4, 10]], C.g1);
  line(ctx, cx - 3.5, 9.8, cx, 6.5, C.g3, 0.7);
  px(ctx, cx, 5, C.g2);
  mossBand(ctx, cx - 3, 31, 6, { seed: 2, density: 0.5, reach: 2 });
  grassTufts(ctx, cx - 7, 35, 14, { seed: 5, density: 0.5 });
}

// ---------- Registro ----------

const P64 = (paint, shadow) => ({ w: 64, h: 64, paint, shadow });
const P80 = (paint, shadow) => ({ w: 80, h: 80, paint, shadow });

export const CAMP_PIECES = {
  'house-1': P64(house1, [32, 57, 24, 3.5]),
  house: P64(house4, [32, 57, 27, 4]),
  'house-8': P80(house8, [38, 71, 36, 4.5]),
  'forge-1': P64(forge1, [32, 57, 24, 3.5]),
  forge: P64(forge4, [32, 57, 27, 4]),
  'forge-8': P80(forge8, [38, 71, 36, 4.5]),
  'farm-1': P64(farm1, [22, 46, 14, 2.5]),
  farm: P64(farm4, [33, 52, 18, 3]),
  'farm-8': P80(farm8, [46, 60, 22, 3.5]),
  'store-1': P64(store1, [31, 55, 22, 3]),
  store: P64(store4, [31, 57, 26, 4]),
  'store-8': P80(store8, [40, 73, 36, 4]),
  campfire: { w: 24, h: 30, frames: 4, shadow: [12, 26, 10, 2.5], paint: (ctx, f) => campfire(ctx, f, { w: 24, h: 30, base: 27, rx: 7, ry: 3.2, n: 9, flameH: 16, flameW: 4.2, size: 1.9 }) },
  campfire4: { w: 32, h: 32, frames: 4, shadow: [16, 28, 13, 3], paint: (ctx, f) => campfire(ctx, f, { w: 32, h: 32, base: 29, rx: 10, ry: 4.2, n: 11, flameH: 19, flameW: 5.6, logsN: 4, size: 2.3 }) },
  campfire8: { w: 40, h: 40, frames: 4, shadow: [20, 36, 17, 3.5], paint: (ctx, f) => campfire(ctx, f, { w: 40, h: 40, base: 36, rx: 11, ry: 4.6, n: 12, flameH: 23, flameW: 6.4, logsN: 5, size: 2.6, extra: (c, fr) => { brazier(c, 4, 38, fr, 0.9); brazier(c, 36, 38, fr, 0.9); } }) },
  fence: { w: 32, h: 16, paint: fence },
  lamp: { w: 20, h: 36, shadow: [10, 34, 5, 1.5], paint: lamp }
};
