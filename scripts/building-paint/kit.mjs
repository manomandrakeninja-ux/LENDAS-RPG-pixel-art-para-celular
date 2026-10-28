// Fase 20 G-predios: kit de pintura dos prédios em alta resolução.
// Tudo é desenhado em "pixels finais" (o bake escala o contexto 4x), então traços de 1 unidade
// viram 1 pixel do sprite. Luz de cima-esquerda; profundidade sobe para a direita (vista 3/4).

/** Cores (todas da paleta-mestre; o bake quantiza o que sobrar). */
export const C = {
  ink: '#1c121c', night: '#0e071b', deep: '#1a1932', navy: '#2a2f4e', slate: '#424c6e', slate2: '#657392', slate3: '#92a1b9', slate4: '#c7cfdd',
  g0: '#272727', g1: '#3d3d3d', g2: '#5d5d5d', g3: '#858585', g4: '#b4b4b4', white: '#ffffff',
  wg0: '#2d2e25', wg1: '#494834', wg2: '#775c5b', wg3: '#918275',
  w0: '#1c121c', w1: '#391f21', w2: '#5d2c28', w3: '#8a4836', w4: '#ad7954', w5: '#bf6f4a', w6: '#cba36f',
  sand: '#cba36f', cream: '#f6ca9f', paper: '#f9e6cf', peach: '#e69c69',
  r0: '#571c27', r1: '#891e2b', r2: '#8e251d', r3: '#c64524', r4: '#e07438', r5: '#edab50',
  wine: '#c42430', red: '#ea323c',
  f0: '#c64524', f1: '#ed7614', f2: '#ffa214', f3: '#ffc825', f4: '#ffeb57',
  m0: '#134c4c', m1: '#1e6f50', m2: '#33984b', m3: '#5ac54f', m4: '#99e65f',
  b0: '#03193f', b1: '#00396d', b2: '#0069aa', b3: '#0098dc', b4: '#00cdf9',
  olive: '#494834', gold: '#ffc825', gold2: '#edab50'
};

export const STONE = { mortar: C.wg0, deep: C.wg1, shade: C.g2, tones: [C.g3, C.wg3, C.wg2, C.g3, C.slate2], light: C.g4, hi: C.slate4 };
export const STONE_COOL = { mortar: C.deep, deep: C.navy, shade: C.slate, tones: [C.slate2, C.g3, C.slate2, C.wg3], light: C.slate3, hi: C.slate4 };
export const STONE_DARK = { mortar: C.night, deep: C.ink, shade: C.g1, tones: [C.g2, C.wg2, C.wg1], light: C.g3, hi: C.wg3 };
export const WOOD = { gap: C.w1, dark: C.w2, tones: [C.w3, C.w3, C.w4], light: C.w5, hi: C.w6 };
export const WOOD_DARK = { gap: C.w0, dark: C.w1, tones: [C.w2, C.w2, C.w3], light: C.w4, hi: C.w5 };
export const WOOD_RED = { gap: C.r0, dark: C.r1, tones: [C.r3, C.r3, C.r2], light: C.r4, hi: C.r5 };
export const ROOF_RED = { line: C.r0, dark: C.r1, tones: [C.r3, C.r3, C.r2, C.r3], light: C.r4, hi: C.r5 };
export const ROOF_SLATE = { line: C.deep, dark: C.navy, tones: [C.slate, C.slate, C.slate2, C.navy], light: C.slate3, hi: C.slate4 };
export const ROOF_BLUE = { line: C.b0, dark: C.b1, tones: [C.b2, C.b2, C.b1, C.b2], light: C.b3, hi: C.b4 };
export const ROOF_WOOD = { line: C.w1, dark: C.w2, tones: [C.w3, C.w4, C.w3], light: C.w5, hi: C.w6 };
export const THATCH = { line: C.w2, dark: C.w3, tones: [C.sand, C.r5], light: C.r5, hi: C.cream };

/** Gerador pseudoaleatório com semente (mulberry32). */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.pick = (list) => list[Math.floor(next() * list.length) % list.length];
  next.range = (lo, hi) => lo + next() * (hi - lo);
  next.int = (lo, hi) => Math.floor(lo + next() * (hi - lo + 1));
  return next;
}

export function path(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
export function fillPoly(ctx, pts, color) { path(ctx, pts); ctx.fillStyle = color; ctx.fill(); }
export function rect(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
export function px(ctx, x, y, color) { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1); }
export function line(ctx, x0, y0, x1, y1, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
export function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fill();
}
export function clip(ctx, pts, fn) { ctx.save(); path(ctx, pts); ctx.clip(); fn(); ctx.restore(); }

/** Desenha num sistema local (u, v) mapeado na tela: origem o, eixo u → vetor u, eixo v → vetor v. */
export function face(ctx, o, u, v, fn) {
  ctx.save();
  ctx.transform(u[0], u[1], v[0], v[1], o[0], o[1]);
  fn();
  ctx.restore();
}

/** Véu de luz/sombra sobre a área (gradiente linear de a até b). */
export function veil(ctx, pts, x0, y0, x1, y1, stops) {
  ctx.save(); path(ctx, pts); ctx.clip();
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [at, color] of stops) g.addColorStop(at, color);
  ctx.fillStyle = g; ctx.fillRect(-500, -500, 2000, 2000);
  ctx.restore();
}

// ---------------- Materiais (em coordenadas locais 0..w x 0..h) ----------------

/** Alvenaria de pedra irregular: blocos com luz no topo-esquerda, sombra embaixo-direita e rejunte. */
export function stones(ctx, w, h, { pal = STONE, seed = 1, rowH = [4, 5], blockW = [5, 9], moss = 0, cracks = 0, top = 0 } = {}) {
  const r = rng(seed);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  rect(ctx, -1, -1, w + 2, h + 2, pal.mortar);
  let y = top;
  let row = 0;
  while (y < h) {
    const rh = r.int(rowH[0], rowH[1]);
    let x = row % 2 ? -r.int(2, 5) : -r.int(0, 2);
    while (x < w) {
      const bw = r.int(blockW[0], blockW[1]);
      const tone = r.pick(pal.tones);
      const bx = x; const by = y; const ww = bw - 1; const hh = rh - 1;
      rect(ctx, bx, by, ww, hh, tone);
      // Volume: luz no topo e na esquerda, sombra embaixo e na direita.
      rect(ctx, bx, by, ww, 1, pal.light);
      rect(ctx, bx, by, 1, hh, mixHex(tone, pal.light, 0.5));
      rect(ctx, bx, by + hh - 1, ww, 1, pal.shade);
      rect(ctx, bx + ww - 1, by + 1, 1, hh - 1, pal.shade);
      if (r() < 0.35) px(ctx, bx + 1, by + 1, pal.hi);
      // Textura: pontinhos e lascas.
      const specks = Math.floor(ww * hh / 9);
      for (let s = 0; s < specks; s += 1) {
        const sx = bx + 1 + Math.floor(r() * Math.max(1, ww - 2));
        const sy = by + 1 + Math.floor(r() * Math.max(1, hh - 2));
        px(ctx, sx, sy, r() < 0.5 ? pal.shade : mixHex(tone, pal.light, 0.35));
      }
      if (cracks && r() < cracks && ww > 4) {
        const cx = bx + 2 + Math.floor(r() * (ww - 3));
        line(ctx, cx + 0.5, by + 1, cx + 0.5 + r.range(-1.5, 1.5), by + hh - 0.5, pal.deep, 0.7);
      }
      x += bw;
    }
    y += rh;
    row += 1;
  }
  if (moss) mossBand(ctx, 0, h, w, { seed: seed + 7, density: moss });
  ctx.restore();
}

/** Musgo crescendo de baixo para cima (e nas juntas). */
export function mossBand(ctx, x, bottom, w, { seed = 3, density = 0.5, reach = 6 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < w; i += 1) {
    if (r() > density) continue;
    const hgt = Math.floor(r() * reach * density) + 1;
    for (let k = 0; k < hgt; k += 1) {
      if (r() < 0.25 && k > 0) continue;
      px(ctx, x + i, bottom - 1 - k, k === hgt - 1 ? C.m3 : k > hgt / 2 ? C.m2 : C.m1);
    }
  }
}

/** Manchas de musgo espalhadas (telhado, topo de pedra). */
export function mossPatches(ctx, w, h, { seed = 9, count = 4, size = 3 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < count; i += 1) {
    const cx = r() * w; const cy = r() * h;
    const n = r.int(size, size * 3);
    for (let k = 0; k < n; k += 1) {
      const x = Math.round(cx + r.range(-size, size)); const y = Math.round(cy + r.range(-size / 2, size / 2));
      px(ctx, x, y, r() < 0.3 ? C.m3 : r() < 0.6 ? C.m2 : C.m1);
    }
  }
}

/** Tábuas com veios, nós e pregos. vertical: tábuas em pé. */
export function planks(ctx, w, h, { pal = WOOD, seed = 2, vertical = false, size = 4, nails = true, worn = 0.15 } = {}) {
  const r = rng(seed);
  const long = vertical ? h : w;
  const across = vertical ? w : h;
  const P = (a, b, ww, hh, color) => (vertical ? rect(ctx, b, a, hh, ww, color) : rect(ctx, a, b, ww, hh, color));
  const Q = (a, b, color) => (vertical ? px(ctx, b, a, color) : px(ctx, a, b, color));
  for (let b = 0; b < across; b += size) {
    const bs = Math.min(size, across - b);
    const tone = r.pick(pal.tones);
    P(0, b, long, bs, tone);
    P(0, b, long, 1, pal.light);
    P(0, b + bs - 1, long, 1, pal.gap);
    if (bs > 3) P(0, b + bs - 2, long, 1, pal.dark);
    // Veios: traços longos e ondulados.
    for (let g = 0; g < Math.max(1, bs - 2); g += 1) {
      const gb = b + 1 + g;
      let a = Math.floor(r() * 4);
      while (a < long) {
        const len = r.int(3, 9);
        if (r() < 0.6) P(a, gb, len, 1, r() < 0.7 ? pal.dark : mixHex(tone, pal.dark, 0.5));
        a += len + r.int(2, 6);
      }
    }
    // Nó.
    if (r() < 0.5 && bs >= 3) {
      const a = r.int(2, Math.max(2, long - 3));
      Q(a, b + 1, pal.gap); Q(a + 1, b + 1, pal.dark); Q(a - 1, b + 1, pal.light);
    }
    // Emendas das tábuas.
    if (long > 14 && r() < 0.6) {
      const a = r.int(5, long - 5);
      P(a, b, 1, bs - 1, pal.gap);
      if (nails) { Q(a - 1, b + 1, C.g1); Q(a + 1, b + 1, C.g1); }
    }
    if (nails) { Q(1, b + 1, C.g1); Q(long - 2, b + 1, C.g1); if (r() < 0.5) Q(2, b + 1, C.g4); }
    // Desgaste: lascas claras.
    for (let k = 0; k < long * worn / 3; k += 1) Q(r.int(0, long - 1), b + r.int(0, bs - 2), pal.hi);
  }
}

/** Toras horizontais (cabana): roliças, com as pontas aparecendo. */
export function logs(ctx, w, h, { pal = WOOD, seed = 4, size = 4, ends = true } = {}) {
  const r = rng(seed);
  for (let y = 0; y < h; y += size) {
    const tone = r.pick(pal.tones);
    rect(ctx, 0, y, w, size, tone);
    rect(ctx, 0, y, w, 1, pal.light);
    rect(ctx, 0, y + size - 1, w, 1, pal.gap);
    rect(ctx, 0, y + size - 2, w, 1, pal.dark);
    for (let x = r.int(0, 4); x < w; x += r.int(4, 9)) rect(ctx, x, y + 1, r.int(2, 5), 1, pal.dark);
    for (let k = 0; k < w / 8; k += 1) px(ctx, r.int(0, w - 1), y + 1, pal.hi);
    if (ends) {
      for (const ex of [-1, w - 2]) {
        ellipse(ctx, ex + 1.5, y + size / 2, 1.7, size / 2 - 0.1, pal.hi);
        px(ctx, ex + 1, y + 1, pal.light);
        px(ctx, ex + 2, y + size - 2, pal.dark);
      }
    }
  }
}

/** Telhas em fileiras (v desce do cume ao beiral): cada telha arredondada embaixo, com luz no alto
 * e a sombra da fileira de cima; algumas mais claras, quebradas ou com musgo. */
export function tiles(ctx, w, h, { pal = ROOF_RED, seed = 5, rowH = 4, tileW = 5, moss = 0, broken = 0.03, barrel = false } = {}) {
  const r = rng(seed);
  if (barrel) return barrelTiles(ctx, w, h, { pal, seed, rowH, tileW: Math.max(3, tileW - 1), moss });
  rect(ctx, -1, -1, w + 2, h + 2, pal.line);
  let row = 0;
  for (let y = 0; y < h; y += rowH) {
    const off = row % 2 ? Math.floor(tileW / 2) : 0;
    for (let x = -off; x < w; x += tileW) {
      const tone = r() < 0.1 ? pal.light : r.pick(pal.tones);
      const tw = tileW - 1;
      rect(ctx, x, y + 1, tw, rowH - 1, tone);
      // Brilho no alto da telha e borda de baixo arredondada (cantos escuros, meio claro).
      rect(ctx, x, y + 1, tw, 1, mixHex(tone, pal.light, 0.55));
      px(ctx, x, y + 1, pal.light);
      if (r() < 0.15) px(ctx, x + 1, y + 1, pal.hi);
      rect(ctx, x, y + rowH - 1, tw, 1, pal.dark);
      rect(ctx, x + 1, y + rowH - 1, tw - 2, 1, mixHex(tone, pal.dark, 0.35));
      px(ctx, x + tw - 1, y + rowH - 2, pal.dark);
      if (broken && r() < broken) rect(ctx, x + 1, y + 1, tw - 2, rowH - 2, pal.line);
    }
    row += 1;
  }
  if (moss) mossPatches(ctx, w, h, { seed: seed + 3, count: Math.round(moss * 6), size: 2 });
}

/** Telhas-canal (barro): colunas roliças com luz à esquerda e sombra à direita, fileiras com ponta redonda. */
export function barrelTiles(ctx, w, h, { pal = ROOF_RED, seed = 5, rowH = 4, tileW = 4, moss = 0 } = {}) {
  const r = rng(seed);
  rect(ctx, -1, -1, w + 2, h + 2, pal.line);
  for (let y = 0, row = 0; y < h; y += rowH, row += 1) {
    for (let x = row % 2 ? -1 : 0; x < w; x += tileW) {
      const tone = r() < 0.12 ? pal.light : r.pick(pal.tones);
      rect(ctx, x, y, tileW - 1, rowH, tone);
      rect(ctx, x, y, 1, rowH - 1, pal.light);
      if (tileW > 3) rect(ctx, x + 1, y, 1, rowH - 1, mixHex(tone, pal.light, 0.4));
      rect(ctx, x + tileW - 2, y, 1, rowH, pal.dark);
      // Ponta redonda: meio claro embaixo, cantos escuros.
      px(ctx, x, y + rowH - 1, pal.dark);
      rect(ctx, x + 1, y + rowH - 1, tileW - 3, 1, mixHex(tone, pal.hi, 0.25));
      if (r() < 0.1) px(ctx, x, y, pal.hi);
    }
    rect(ctx, 0, y, w, 1, 'rgba(14,7,27,0.55)');
  }
  if (moss) mossPatches(ctx, w, h, { seed: seed + 3, count: Math.round(moss * 6), size: 2 });
}

/** Ardósia: placas retangulares desencontradas. */
export function shingles(ctx, w, h, opts = {}) {
  tiles(ctx, w, h, { tileW: 5, rowH: 3, ...opts });
}

/** Palha: fileiras de feixes com borda franjada, fios escuros em pé e brilho no alto de cada fileira. */
export function thatch(ctx, w, h, { pal = THATCH, seed = 6 } = {}) {
  const r = rng(seed);
  rect(ctx, -1, -1, w + 2, h + 2, pal.line);
  for (let y = 0; y < h; y += 4) {
    rect(ctx, 0, y, w, 4, pal.tones[0]);
    for (let x = 0; x < w; x += 1) {
      const top = r() < 0.5 ? pal.light : pal.tones[1];
      px(ctx, x, y, top);
      if ((x + y) % 3 === 0 || r() < 0.2) rect(ctx, x, y + 1, 1, 2, pal.dark);
      else if (r() < 0.25) px(ctx, x, y + 1, pal.hi);
      // Borda franjada: uns fios descem 1 px a mais.
      px(ctx, x, y + 3, pal.line);
      if (r() < 0.4) px(ctx, x, y + 4, pal.line);
    }
  }
}

// ---------------- Peças ----------------

/** Janela com luz quente, moldura, cruzeta, peitoril e (opcional) venezianas. */
export function windowLit(ctx, x, y, w = 6, h = 7, { shutters = false, arch = false, frame = WOOD_DARK, box = false } = {}) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, frame.gap);
  if (arch) ellipse(ctx, x + w / 2, y, w / 2 + 1, 2.5, frame.gap);
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, C.f4); g.addColorStop(0.45, C.f3); g.addColorStop(1, C.f1);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (arch) { ctx.save(); ctx.beginPath(); ctx.ellipse(x + w / 2, y, w / 2, 1.8, 0, Math.PI, 0); ctx.fillStyle = C.f4; ctx.fill(); ctx.restore(); }
  // Interior: canto de baixo mais quente/escuro.
  rect(ctx, x, y + h - 2, w, 2, C.f1);
  rect(ctx, x + w - 1, y, 1, h, C.f2);
  // Cruzeta.
  rect(ctx, x + Math.floor(w / 2), y, 1, h, frame.dark);
  rect(ctx, x, y + Math.floor(h / 2), w, 1, frame.dark);
  px(ctx, x, y, C.white);
  px(ctx, x + 1, y, C.f4);
  // Peitoril.
  rect(ctx, x - 1, y + h + 1, w + 2, 1, frame.light);
  rect(ctx, x - 1, y + h + 2, w + 2, 1, frame.gap);
  if (box) {
    rect(ctx, x - 1, y + h + 2, w + 2, 2, C.w2);
    for (let i = 0; i < w + 2; i += 1) px(ctx, x - 1 + i, y + h + 1, i % 2 ? C.m3 : (i % 3 ? C.red : C.f3));
  }
  if (shutters) {
    for (const sx of [x - 3, x + w + 1]) {
      rect(ctx, sx, y - 1, 2, h + 2, frame === WOOD_DARK ? C.m1 : frame.tones[0]);
      rect(ctx, sx, y - 1, 1, h + 2, frame === WOOD_DARK ? C.m2 : frame.light);
      for (let k = 1; k < h; k += 2) px(ctx, sx + 1, y + k, C.m0);
    }
  }
}

/** Janela apagada (madeira escura e vidro azulado). */
export function windowDark(ctx, x, y, w = 5, h = 6) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, C.w1);
  rect(ctx, x, y, w, h, C.navy);
  rect(ctx, x, y, w, 1, C.slate);
  px(ctx, x, y, C.slate3);
  rect(ctx, x + Math.floor(w / 2), y, 1, h, C.w1);
}

/** Porta de tábuas com batente, dobradiças de ferro, maçaneta e degrau. */
export function door(ctx, x, y, w, h, { pal = WOOD_DARK, arch = true, step = true, seed = 11 } = {}) {
  rect(ctx, x - 1, y - 1, w + 2, h + 1, C.w0);
  if (arch) ellipse(ctx, x + w / 2, y, w / 2 + 1, 2.2, C.w0);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h);
  if (arch) ctx.ellipse(x + w / 2, y, w / 2, 1.6, 0, Math.PI, 0);
  ctx.clip();
  ctx.translate(x, y - 2);
  planks(ctx, w, h + 2, { pal, seed, vertical: true, size: 3, nails: false, worn: 0.05 });
  ctx.restore();
  for (const hy of [y + 2, y + h - 3]) { rect(ctx, x, hy, Math.ceil(w * 0.6), 1, C.g1); px(ctx, x, hy, C.g3); }
  px(ctx, x + w - 2, y + Math.floor(h / 2), C.f3);
  px(ctx, x + w - 2, y + Math.floor(h / 2) + 1, C.r2);
  if (step) { rect(ctx, x - 2, y + h, w + 4, 2, C.g3); rect(ctx, x - 2, y + h, w + 4, 1, C.g4); rect(ctx, x - 2, y + h + 1, w + 4, 1, C.g2); }
}

/** Barril de aduelas com aros. */
export function barrel(ctx, cx, base, { w = 6, h = 7, pal = WOOD } = {}) {
  const x = cx - w / 2; const y = base - h;
  ellipse(ctx, cx, base - 0.5, w / 2, 1.2, pal.gap);
  rect(ctx, x, y + 1, w, h - 1.5, pal.tones[0]);
  rect(ctx, x, y + 1, 1, h - 2, pal.light);
  rect(ctx, x + w - 1, y + 1, 1, h - 2, pal.gap);
  for (let k = 2; k < w - 1; k += 2) rect(ctx, x + k, y + 1, 1, h - 2, pal.dark);
  for (const hy of [y + 2, base - 2]) { rect(ctx, x, hy, w, 1, C.g1); px(ctx, x, hy, C.g3); }
  ellipse(ctx, cx, y + 1, w / 2, 1.2, pal.light);
  ellipse(ctx, cx, y + 1.2, w / 2 - 1, 0.7, pal.dark);
}

/** Caixote de tábuas com travessa em X. */
export function crate(ctx, x, y, s = 7, { pal = WOOD } = {}) {
  // Topo (3/4).
  const t = Math.max(2, Math.round(s * 0.3));
  fillPoly(ctx, [[x, y + t], [x + 1, y], [x + s + 1, y], [x + s, y + t]], pal.light);
  rect(ctx, x + 1, y, s, 1, pal.hi);
  rect(ctx, x, y + t, s, s - t, pal.tones[0]);
  rect(ctx, x, y + t, s, 1, pal.hi);
  rect(ctx, x, y + t, 1, s - t, pal.light);
  rect(ctx, x + s - 1, y + t, 1, s - t, pal.gap);
  rect(ctx, x, y + s - 1, s, 1, pal.gap);
  line(ctx, x + 1, y + t + 1, x + s - 1, y + s - 1, pal.dark, 1);
  line(ctx, x + s - 1, y + t + 1, x + 1, y + s - 1, pal.dark, 1);
  px(ctx, x + 1, y + t + 1, C.g1); px(ctx, x + s - 2, y + t + 1, C.g1);
}

/** Saco de grãos. */
export function sack(ctx, cx, base, { w = 5, h = 6 } = {}) {
  ellipse(ctx, cx, base - h / 2, w / 2, h / 2, C.sand);
  ellipse(ctx, cx - 0.8, base - h / 2 - 0.8, w / 2 - 1.2, h / 2 - 1.5, C.cream);
  ellipse(ctx, cx + 1, base - 1.2, w / 2 - 1, 1, C.w4);
  rect(ctx, cx - 1, base - h - 1, 2, 2, C.w4);
  px(ctx, cx - 1, base - h + 1, C.w3);
}

/** Pilha de lenha (pontas das toras de frente). */
export function woodpile(ctx, x, base, { cols = 3, rows = 2, r = 1.6 } = {}) {
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - row; col += 1) {
      const cx = x + r + col * r * 2 + row * r;
      const cy = base - r - row * r * 1.7;
      ellipse(ctx, cx, cy, r, r, C.w2);
      ellipse(ctx, cx - 0.3, cy - 0.3, r - 0.5, r - 0.5, C.w5);
      px(ctx, Math.floor(cx), Math.floor(cy), C.w4);
    }
  }
}

/** Placa pendurada num braço de madeira, com ícone desenhado por fn(ctx, x, y). */
export function hangingSign(ctx, x, y, w, h, icon) {
  rect(ctx, x - 1, y - 3, w + 3, 1, C.w2);
  rect(ctx, x - 1, y - 4, w + 3, 1, C.w4);
  line(ctx, x + 1.5, y - 3, x + 1.5, y, C.g1, 0.6);
  line(ctx, x + w - 1.5, y - 3, x + w - 1.5, y, C.g1, 0.6);
  rect(ctx, x, y, w, h, C.w4);
  rect(ctx, x, y, w, 1, C.w6);
  rect(ctx, x, y + h - 1, w, 1, C.w2);
  rect(ctx, x + w - 1, y, 1, h, C.w2);
  icon?.(ctx, x + 1, y + 1, w - 2, h - 2);
}

/** Lampião de ferro com vidro aceso. */
export function lanternBox(ctx, x, y) {
  rect(ctx, x, y, 4, 1, C.g1);
  px(ctx, x + 1, y - 1, C.g1); px(ctx, x + 2, y - 1, C.g1);
  rect(ctx, x, y + 1, 4, 4, C.f2);
  rect(ctx, x + 1, y + 1, 2, 3, C.f4);
  px(ctx, x + 1, y + 1, C.white);
  rect(ctx, x, y + 1, 1, 4, C.g1);
  rect(ctx, x + 3, y + 1, 1, 4, C.ink);
  rect(ctx, x, y + 5, 4, 1, C.g1);
}

/** Chaminé de pedra: fiadas de 2 px desencontradas, luz à esquerda, sombra à direita, capuz e boca escura. */
export function chimney(ctx, x, top, w, h, { pal = STONE, seed = 31 } = {}) {
  const r = rng(seed);
  rect(ctx, x, top, w, h, pal.mortar);
  for (let y = top + 3, row = 0; y < top + h; y += 3, row += 1) {
    for (let bx = x - (row % 2 ? 2 : 0); bx < x + w; bx += 4) {
      const tone = r.pick(pal.tones);
      const x0 = Math.max(x, bx); const x1 = Math.min(x + w, bx + 3);
      if (x1 <= x0) continue;
      rect(ctx, x0, y, x1 - x0, 2, tone);
      rect(ctx, x0, y, x1 - x0, 1, mixHex(tone, pal.light, 0.5));
    }
  }
  rect(ctx, x, top + 2, 1, h - 2, pal.light);
  rect(ctx, x + w - 2, top + 2, 2, h - 2, 'rgba(26,25,50,0.55)');
  // Capuz.
  rect(ctx, x - 1, top, w + 2, 2, pal.tones[0]);
  rect(ctx, x - 1, top, w + 2, 1, pal.hi);
  rect(ctx, x + w - 1, top, 2, 2, pal.shade);
  rect(ctx, x, top - 1, w, 1, C.ink);
  rect(ctx, x + 1, top - 1, w - 2, 1, C.g1);
}

/** Fumaça clara (fiapos) subindo de (x, y). */
export function smokeWisps(ctx, x, y, { seed = 41, n = 5 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i += 1) {
    const t = i / n;
    ellipse(ctx, x + Math.sin(t * 4 + 1) * 2 + t * 3, y - t * 14, 1.5 + t * 2, 1.2 + t * 1.5, i % 2 ? 'rgba(199,207,221,0.85)' : 'rgba(180,180,180,0.85)');
    if (r() < 0.5) px(ctx, Math.round(x + t * 3), Math.round(y - t * 14 - 1), C.white);
  }
}

/** Mistura de duas cores hex. */
export function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16); const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// ---------------- Volumes ----------------

/** Projeção 3/4: profundidade z sobe e vai um pouco para a direita. */
export const KX = 0.35;
export const KY = 0.55;

/**
 * Caixa (corpo do prédio): frente (x..x+w, base-h..base), lateral direita e topo opcional.
 * front/side/top: funções(ctx, w, h) que pintam o material em coordenadas locais.
 */
export function box(ctx, { x, base, w, h, d, front, side, top, sideShade = 0.5, kx = KX, ky = KY }) {
  const dx = d * kx; const dy = d * ky;
  const fy = base - h;
  if (side) {
    const pts = [[x + w, base], [x + w, fy], [x + w + dx, fy - dy], [x + w + dx, base - dy]];
    clip(ctx, pts, () => face(ctx, [x + w, fy], [dx / Math.max(1, Math.round(d * 0.6)), -dy / Math.max(1, Math.round(d * 0.6))], [0, 1], () => side(ctx, Math.round(d * 0.6), h)));
    veil(ctx, pts, x + w, 0, x + w + dx, 0, [[0, `rgba(26,25,50,${sideShade})`], [1, `rgba(26,25,50,${sideShade * 0.8})`]]);
    line(ctx, x + w + 0.5, fy, x + w + 0.5, base, 'rgba(14,7,27,0.35)', 1);
  }
  if (top) {
    const pts = [[x, fy], [x + w, fy], [x + w + dx, fy - dy], [x + dx, fy - dy]];
    clip(ctx, pts, () => face(ctx, [x + dx, fy - dy], [1, 0], [-dx / Math.max(1, Math.round(dy)), dy / Math.max(1, Math.round(dy))], () => top(ctx, w, Math.round(dy))));
  }
  if (front) {
    const pts = [[x, fy], [x + w, fy], [x + w, base], [x, base]];
    clip(ctx, pts, () => { ctx.save(); ctx.translate(x, fy); front(ctx, w, h); ctx.restore(); });
  }
  return { fy, dx, dy };
}

/**
 * Telhado de duas águas com cume da esquerda para a direita: a água da frente aparece inteira
 * e a empena direita mostra o triângulo da parede. Devolve pontos úteis (cume, beiral).
 */
export function gableRoof(ctx, { x, wallTop, w, d, rise, over = 2, drop = 2, roof, gable, kx = KX, ky = KY, ridgeCap = true }) {
  const rdx = (d / 2) * kx; const rdy = (d / 2) * ky;
  const ridgeY = wallTop - rise - rdy;
  const L = x - over; const R = x + w + over;
  const eaveY = wallTop + drop;
  // Empena direita (triângulo da parede).
  if (gable) {
    const gpts = [[x + w, wallTop], [x + w + d * kx, wallTop - d * ky], [x + w + rdx, ridgeY]];
    clip(ctx, gpts, () => { ctx.save(); ctx.translate(x + w, ridgeY); gable(ctx, Math.ceil(d * kx) + 1, Math.ceil(wallTop - ridgeY) + 1); ctx.restore(); });
    veil(ctx, gpts, x + w, 0, x + w + d * kx, 0, [[0, 'rgba(26,25,50,0.5)'], [1, 'rgba(26,25,50,0.4)']]);
  }
  // Água de trás aparecendo na ponta direita (beiral lateral).
  const side = [[R, eaveY], [R + rdx, ridgeY], [R + rdx + 1.5, ridgeY + 1], [R + 1.5, eaveY + 0.5]];
  fillPoly(ctx, side, roof === undefined ? C.r1 : C.ink);
  const front = [[L, eaveY], [R, eaveY], [R + rdx, ridgeY], [L + rdx, ridgeY]];
  const rows = Math.round(eaveY - ridgeY);
  clip(ctx, front, () => face(ctx, [L + rdx, ridgeY], [1, 0], [-rdx / rows, 1], () => roof(ctx, Math.ceil(R - L) + 2, rows + 1)));
  // Luz: perto do cume mais clara, beiral mais escuro; ponta direita na sombra.
  veil(ctx, front, 0, ridgeY, 0, eaveY, [[0, 'rgba(255,235,180,0.18)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.28)']]);
  veil(ctx, front, L, 0, R + rdx, 0, [[0, 'rgba(255,235,180,0.10)'], [0.7, 'rgba(0,0,0,0)'], [1, 'rgba(26,25,50,0.22)']]);
  // Beiral (tábua de borda) e cumeeira.
  line(ctx, L, eaveY + 0.5, R, eaveY + 0.5, C.ink, 1);
  line(ctx, R + 0.5, eaveY, R + rdx + 0.5, ridgeY, C.ink, 1);
  if (ridgeCap) {
    line(ctx, L + rdx, ridgeY + 0.5, R + rdx, ridgeY + 0.5, 'rgba(255,240,200,0.55)', 1);
    line(ctx, L + rdx, ridgeY - 0.5, R + rdx, ridgeY - 0.5, C.ink, 1);
  }
  return { ridgeY, eaveY, L, R, rdx, ridge: [[L + rdx, ridgeY], [R + rdx, ridgeY]] };
}

/**
 * Telhado de duas águas com a empena virada para a frente (cume entrando na cena).
 * Mostra as duas águas de cima e o frontão triangular na fachada.
 */
export function frontGable(ctx, { cx, wallTop, w, d, rise, over = 2, drop = 2, roof, pediment, kx = 0.08, ky = KY }) {
  const half = w / 2 + over;
  const apex = [cx, wallTop - rise];
  const back = [cx + d * kx, wallTop - rise - d * ky];
  const eL = [cx - half, wallTop + drop]; const eR = [cx + half, wallTop + drop];
  const bL = [eL[0] + d * kx, eL[1] - d * ky]; const bR = [eR[0] + d * kx, eR[1] - d * ky];
  // Frontão.
  if (pediment) {
    const tri = [[cx - w / 2, wallTop + 0.5], [cx, wallTop - rise + 2], [cx + w / 2, wallTop + 0.5]];
    clip(ctx, tri, () => { ctx.save(); ctx.translate(cx - w / 2, wallTop - rise + 2); pediment(ctx, w, rise - 1); ctx.restore(); });
  }
  const left = [eL, apex, back, bL];
  const right = [apex, eR, bR, back];
  const slope = (pts, o, edge) => {
    const len = Math.hypot(edge[0], edge[1]);
    const n = Math.round(len);
    clip(ctx, pts, () => face(ctx, o, [kx * d / Math.max(1, Math.round(d * 0.7)), -ky * d / Math.max(1, Math.round(d * 0.7))], [edge[0] / n, edge[1] / n], () => roof(ctx, Math.round(d * 0.7) + 2, n + 1)));
  };
  // Água direita (mais escura) e esquerda (lit).
  slope(right, apex, [eR[0] - apex[0], eR[1] - apex[1]]);
  veil(ctx, right, 0, 0, 1, 0, [[0, 'rgba(26,25,50,0.42)'], [1, 'rgba(26,25,50,0.42)']]);
  slope(left, apex, [eL[0] - apex[0], eL[1] - apex[1]]);
  veil(ctx, left, apex[0], apex[1], eL[0], eL[1], [[0, 'rgba(255,235,180,0.16)'], [1, 'rgba(26,25,50,0.12)']]);
  // Bordas e cumeeira.
  line(ctx, eL[0], eL[1], apex[0], apex[1], C.ink, 1);
  line(ctx, apex[0], apex[1], eR[0], eR[1], C.ink, 1);
  line(ctx, apex[0] + 0.5, apex[1] - 0.3, back[0] + 0.5, back[1] - 0.3, 'rgba(255,240,200,0.6)', 1);
  return { apex, back, eL, eR };
}

/** Oclusão de contato: faixa escura roxa na base de uma parede. */
export function baseShade(ctx, x, base, w, hgt = 3) {
  const g = ctx.createLinearGradient(0, base - hgt, 0, base);
  g.addColorStop(0, 'rgba(26,25,50,0)'); g.addColorStop(1, 'rgba(26,25,50,0.55)');
  ctx.fillStyle = g; ctx.fillRect(x, base - hgt, w, hgt);
}

/** Sombra suave projetada (contato) desenhada dentro do sprite antes do prédio. */
export function groundShadow(ctx, cx, cy, rx, ry) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, 'rgba(26,25,50,0.55)'); g.addColorStop(0.7, 'rgba(26,25,50,0.4)'); g.addColorStop(1, 'rgba(26,25,50,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Tufos de grama e flores na base (contam história e ligam o prédio ao chão). */
export function grassTufts(ctx, x, base, w, { seed = 12, density = 0.35, flowers = 0.1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < w; i += 1) {
    if (r() > density) continue;
    const hgt = r.int(1, 3);
    for (let k = 0; k < hgt; k += 1) px(ctx, x + i + (k === 2 ? (r() < 0.5 ? -1 : 1) : 0), base - 1 - k, k === hgt - 1 ? C.m4 : k ? C.m3 : C.m2);
    if (r() < flowers) px(ctx, x + i, base - hgt - 1, r.pick([C.f3, C.paper, C.red]));
  }
}
