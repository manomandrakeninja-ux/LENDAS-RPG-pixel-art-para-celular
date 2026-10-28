// Monta as folhas das skins a partir das figuras reduzidas por extract-skins.mjs:
// rostos retocados à mão (mapas de caracteres), lados em 3/4, costas e quadros de andar.

const RED_CAPE = (c) => {
  const [h, s, v] = hsv(c);
  return s > 0.42 && v > 0.16 && (h >= 328 || h <= 6);
};

function hsv([r, g, b]) {
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, d = max - min;
  let h = 0;
  if (d) {
    if (max === r / 255) h = ((g - b) / 255 / d) % 6;
    else if (max === g / 255) h = (b - r) / 255 / d + 2;
    else h = (r - g) / 255 / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

export function compose(parts, k) {
  const { blank, put, px, alpha, clone, flipX, blit, paint, outline, cleanup, walkFrames, legBand, sheetOf, finalPalette, trim, crop, lum, dist, parse, dbg, FW, FH } = k;
  const each = (im, fn) => { for (let y = 0; y < im.h; y += 1) for (let x = 0; x < im.w; x += 1) fn(x, y, px(im, x, y)); };

  /** Caixa dos pixels de pele na cabeça (para ancorar o rosto desenhado). */
  function faceBox(im, skinRef, maxRow, minCol = 0) {
    let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
    each(im, (x, y, c) => {
      if (y > maxRow || x < minCol || c[3] < 128 || dist(c, skinRef) > 46) return;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    });
    return { x0, y0, x1, y1 };
  }

  /** Troca as cores da capa (vermelhas) pelas da variação, casando por luminância (quantis). */
  function capeRecolor(base, variant) {
    const vb = trim(variant), bb = trim(base);
    const target = [];
    each(bb, (x, y, c) => {
      if (c[3] < 128 || !RED_CAPE(c)) return;
      // Só o miolo da capa (vizinhos também de capa) para não pegar borda desalinhada.
      const core = [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => { const n = px(bb, x + dx, y + dy); return n[3] > 127 && RED_CAPE(n); });
      if (!core || x >= vb.w || y >= vb.h) return;
      const v = px(vb, x, y);
      if (v[3] > 127) target.push(v);
    });
    target.sort((a, b) => lum(a) - lum(b));
    const source = [];
    each(bb, (x, y, c) => { if (c[3] > 127 && RED_CAPE(c)) source.push(lum(c)); });
    source.sort((a, b) => a - b);
    const cache = new Map();
    return (c) => {
      if (!RED_CAPE(c)) return c;
      const key = c.join();
      if (cache.has(key)) return cache.get(key);
      let i = source.findIndex((l) => l >= lum(c));
      if (i < 0) i = source.length - 1;
      const q = i / Math.max(1, source.length - 1);
      const j = Math.round(q * (target.length - 1));
      const win = target.slice(Math.max(0, j - 3), j + 4);
      const out = [0, 1, 2].map((ch) => Math.round(win.reduce((s, p) => s + p[ch], 0) / win.length)).concat(255);
      cache.set(key, out);
      return out;
    };
  }
  const recolor = (im, fn) => { const out = clone(im); each(im, (x, y, c) => { if (c[3] > 127) put(out, x, y, fn(c)); }); return out; };

  const sheets = {};

  // ================= Guerreira =================
  const W = parts.warrior;
  const WSKIN = [210, 112, 78];
  const wf = {
    S: parse('#d2704e'), L: parse('#e8916a'), s: parse('#a2523c'), E: parse('#0c0710'), W: parse('#f4e6d6'),
    M: parse('#8a2438'), B: parse('#1e131c'), h: parse('#352027'), H: parse('#4d3032')
  };
  // Rosto de frente (olhando um pouco para a direita): 7 x 6, ancorado no queixo/lado direito da pele.
  const FACE_FRONT = [
    '..hSSSSh',
    '.hSLSSSs',
    '.SBBSBBs',
    '.SWESWEs',
    '.SSSSsSs',
    '..SSMMs.',
    '...sss..'
  ];
  // Rosto de perfil (olhando para a direita).
  const FACE_SIDE = [
    '.hSSS.',
    '.hSLSS',
    'hSSBBS',
    'hSSWES',
    '.sSSSS',
    '.sSSMs',
    '..sSs.'
  ];
  function warriorFront(im) {
    const out = clone(im);
    const box = faceBox(im, WSKIN, 15, Math.floor(im.w * 0.45));
    paint(out, box.x1 - 7, box.y1 - 6, FACE_FRONT, wf);
    return out;
  }
  function warriorSide(im) {
    const out = clone(im);
    const box = faceBox(im, WSKIN, 15, Math.floor(im.w * 0.6));
    paint(out, box.x1 - 5, box.y1 - 6, FACE_SIDE, wf);
    return out;
  }
  /** Costas: pernas e espada da frente (espelhadas) com o cabelo e a capa vistos de trás por cima. */
  function warriorBack(front, top) {
    const base = flipX(front);
    const out = clone(base);
    // Centro da cabeça (linhas de cima) na frente espelhada e na vista de trás.
    const headCenter = (im, rows) => {
      let x0 = 99, x1 = -1;
      each(im, (x, y, c) => { if (y < rows && c[3] > 127) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); } });
      return (x0 + x1) / 2;
    };
    // O rosto da frente some: a cabeça de trás cobre a mesma área.
    const ox = Math.round(headCenter(base, 10) - headCenter(top, 8));
    blit(out, top, ox, 1);
    return out;
  }

  const capes = { warrior: 'original', 'warrior-blue': 'blue', 'warrior-green': 'green', 'warrior-black': 'black' };
  const sideBase = warriorSide(W.side);
  for (const [id, color] of Object.entries(capes)) {
    const fn = color === 'original' ? (c) => c : capeRecolor(W.down.original, W.down[color]);
    const down = warriorFront(W.down[color]);
    const side = recolor(sideBase, fn);
    const back = recolor(warriorBack(W.down.original, W.backTop), fn);
    const rows = [
      walkFrames(down, legBand(down, 0.64)),
      walkFrames(flipX(side), legBand(flipX(side), 0.64)),
      walkFrames(side, legBand(side, 0.64)),
      walkFrames(back, legBand(back, 0.64))
    ];
    sheets[`warrior${id === 'warrior' ? '' : id.slice(7)}`] = finalPalette(sheetOf(rows.map((r) => r.map((f) => outline(f)))), 24);
    dbg(`c-${id}-down`, down);
  }

  // ================= Espadachim =================
  const front0 = clone(parts.swordsman.front);
  // Fundo branco preso entre as pernas e o braço.
  each(front0, (x, y, c) => { if (c[3] > 127 && dist(c, [255, 255, 255]) < 6) put(front0, x, y, [0, 0, 0, 0]); });
  // Sombra cinza-azulada do chão da referência (o jogo desenha a própria sombra).
  each(front0, (x, y, c) => {
    const [h, s, v] = hsv(c);
    if (c[3] > 127 && y >= front0.h - 2 && h > 200 && h < 260 && v > 0.3 && s < 0.4) put(front0, x, y, [0, 0, 0, 0]);
  });
  const sf = {
    T: parse('#fdbf79'), F: parse('#d66b3e'), K: parse('#0b030c'), W: parse('#f7faf9'), e: parse('#461522'),
    g: parse('#8d3d2d'), h: parse('#a7563c'), c: parse('#5f1f2e'), M: parse('#8d3d2d'), P: parse('#e89a5c')
  };
  // Rosto de frente: colunas 14-26, linhas 8-14 da figura.
  const SW_FACE = [
    'Kcegghgcgecc.',
    'KcTgTTgTTcTcK',
    'KTTTTTTTTTTFK',
    'KTKKTTTTKKTFK',
    'KTKWTTTTKWTFK',
    'KFTTTTPTTTFFK',
    '.KFTTMMTTFFK.'
  ];
  const swFront = clone(front0);
  paint(swFront, 14, 8, SW_FACE, sf);
  // Lado (3/4 olhando para a direita): rosto deslocado, olho de trás menor.
  const SW_FACE_SIDE = [
    'Kccegghgcgecc',
    'KcgTgTTgTTcTK',
    'KcTTTTTTTTTTK',
    'KcFTTTKKTTKKT',
    'KcFTTTKWTTKWT',
    'KcFFTTTTTPTTK',
    '.KKFFTTMMTTK.'
  ];
  const swSide = clone(front0);
  paint(swSide, 14, 8, SW_FACE_SIDE, sf);
  // Costas: espelha e cobre a cabeça com cabelo; a espada nas costas cruza o tronco.
  const swBack = flipX(front0);
  const HAIR_BACK = [
    '.cegghgcgecgK',
    'KcghhgcgehgcK',
    'KcegghgcghgcK',
    'KcghgcehgcgcK',
    'KeccgcgcccgeK',
    'KccecgcecgceK',
    '.KcceccecccK.'
  ];
  paint(swBack, front0.w - 1 - 26, 8, HAIR_BACK, sf);
  // Lâmina nas costas: do cabo (canto de cima, à direita) até a ponta (embaixo, à esquerda).
  const steel = [parse('#949cab'), parse('#c7d4da'), parse('#3b2f46')];
  for (let t = 0; t <= 1; t += 0.02) {
    const xh = front0.w - 1 - 4, xt = front0.w - 1 - 34;
    const x = Math.round(xh + (xt - xh) * t);
    const y = Math.round(11 + (48 - 11) * t);
    if (y < 15 || y > 44) continue;
    put(swBack, x, y, steel[1]); put(swBack, x + 1, y, steel[0]); put(swBack, x - 1, y, steel[2]);
  }
  const rows = [
    walkFrames(swFront, legBand(swFront, 0.7)),
    walkFrames(flipX(swSide), legBand(flipX(swSide), 0.7)),
    walkFrames(swSide, legBand(swSide, 0.7)),
    walkFrames(swBack, legBand(swBack, 0.7))
  ];
  sheets.swordsman = finalPalette(sheetOf(rows.map((r) => r.map((f) => outline(f)))), 24);
  dbg('c-sw-front', swFront);
  dbg('c-sw-side', swSide);
  dbg('c-sw-back', swBack);
  return sheets;
}
