// Quadros 4-11 das skins (respira, mão a caminho, mão no ombro, preparar, golpe, retorno, dano, pisca)
// a partir de uma figura SEM espada. O braço da mão de arma é refeito (osso duplo + contorno) com as
// cores da própria skin; tronco e cabeça deslocam; as pernas ficam fixas (ou dão um passo no golpe).

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(255);

/** Braço de dois ossos: ombro J, mão H; o cotovelo dobra para fora (outward = -1 esquerda, +1 direita). */
export function drawLimb(im, k, J, H, style, outward) {
  const { put, px } = k;
  const { U, L, ru, rf, rh, up, fore, hand, line } = style;
  const dx = H[0] - J[0], dy = H[1] - J[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const ux = dx / d, uy = dy / d;
  let E;
  if (d >= U + L - 0.3) { d = U + L; E = [J[0] + ux * U, J[1] + uy * U]; }
  else {
    const a = (U * U - L * L + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, U * U - a * a));
    const p1 = [J[0] + ux * a - uy * h, J[1] + uy * a + ux * h];
    const p2 = [J[0] + ux * a + uy * h, J[1] + uy * a - ux * h];
    E = (p1[0] - J[0]) * outward >= (p2[0] - J[0]) * outward ? p1 : p2;
  }
  const seg = (p, a, b) => {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy || 1)));
    const cx = a[0] + vx * t, cy = a[1] + vy * t;
    const dist = Math.hypot(p[0] - cx, p[1] - cy);
    const cross = (vx * (p[1] - a[1]) - vy * (p[0] - a[0])) / (Math.hypot(vx, vy) || 1);
    return { dist, side: cross, nx: -vy / (Math.hypot(vx, vy) || 1), ny: vx / (Math.hypot(vx, vy) || 1), t };
  };
  const Hc = [H[0], H[1]];
  const classify = (x, y) => {
    const p = [x + 0.5, y + 0.5];
    const hd = Math.hypot(p[0] - Hc[0], p[1] - Hc[1]);
    const s1 = seg(p, J, E), s2 = seg(p, E, Hc);
    let best = null;
    if (s1.dist <= ru) best = { part: 'up', s: s1, r: ru };
    if (s2.dist <= rf && (!best || s2.dist / rf < best.s.dist / best.r)) best = { part: 'fore', s: s2, r: rf };
    if (hd <= rh) best = { part: 'hand', s: { dist: hd, side: 0, nx: 0, ny: 0 }, r: rh, hx: p[0] - Hc[0], hy: p[1] - Hc[1] };
    return best;
  };
  const minX = Math.floor(Math.min(J[0], E[0], H[0]) - 5), maxX = Math.ceil(Math.max(J[0], E[0], H[0]) + 5);
  const minY = Math.floor(Math.min(J[1], E[1], H[1]) - 5), maxY = Math.ceil(Math.max(J[1], E[1], H[1]) + 5);
  const cells = new Map();
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    const c = classify(x, y);
    if (c) cells.set(`${x},${y}`, c);
  }
  // contorno: vizinhos de 4 que não fazem parte do braço
  for (const key of cells.keys()) {
    const [x, y] = key.split(',').map(Number);
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!cells.has(`${x + ox},${y + oy}`)) put(im, x + ox, y + oy, line);
  }
  for (const [key, c] of cells) {
    const [x, y] = key.split(',').map(Number);
    const set = c.part === 'up' ? up : c.part === 'fore' ? fore : hand;
    let f = 0;
    if (c.part === 'hand') f = -(c.hx * 0.7 + c.hy * 0.7) / c.r; // luz de cima-esquerda
    else { const t = c.s.side / c.r; f = t * (c.s.nx * -0.6 + c.s.ny * -0.8) * -1; }
    put(im, x, y, f > 0.32 ? set[2] : f < -0.32 ? set[0] : set[1]);
  }
  return { elbow: E };
}

/** Coloca `src` (recorte) em `dst` na posição (ox, oy), com deslocamento por linha. */
const place = (k, dst, src, ox, oy, shift) => {
  const { put, px } = k;
  for (let y = 0; y < src.h; y += 1) for (let x = 0; x < src.w; x += 1) {
    const c = px(src, x, y);
    if (c[3] < 128) continue;
    const [sx, sy] = shift(x, y);
    put(dst, ox + x + sx, oy + y + sy, c);
  }
};

/**
 * cfg: { hip, J, hang, hurtHead, neckY, outward, style, cover, rel: {coluna: [dx, dy]}, body: {coluna: [dx, dy]},
 *        headShift: {coluna: [dx, dy]}, stride: {coluna: [front, back]}, mid, eyes: { closed: [[x, y, cor]] } }
 * Retorna { frames: {coluna: imagem}, hands: {coluna: [x, y]} } em coordenadas do quadro.
 */
export function buildPoses({ base, armless, cfg, ox, oy, k, FW, FH }) {
  const { blank, put, px, clone } = k;
  const frames = {}, hands = {};
  const eyed = (img, mode) => {
    if (!mode || !cfg.eyes?.[mode]) return img;
    const out = clone(img);
    for (const [x, y, col] of cfg.eyes[mode]) put(out, x, y, hexRgb(col));
    return out;
  };
  for (let col = 4; col <= 11; col += 1) {
    const frame = blank(FW, FH);
    const rel = cfg.rel[col] ?? null;
    const [bdx, bdy] = cfg.body[col] ?? [0, 0];
    const [hdx, hdy] = cfg.headShift?.[col] ?? [0, 0];
    const eyeMode = col === 10 ? 'squint' : col === 11 ? 'closed' : null;
    const src = eyed(rel ? armless : base, eyeMode);
    const [stF, stB] = cfg.stride?.[col] ?? [0, 0];
    // pernas (fixas, ou com passo)
    const legsOnly = { w: src.w, h: src.h, d: new Uint8ClampedArray(src.d) };
    for (let y = 0; y < cfg.hip; y += 1) for (let x = 0; x < src.w; x += 1) put(legsOnly, x, y, [0, 0, 0, 0]);
    place(k, frame, legsOnly, ox, oy, (x, y) => (y >= cfg.hip ? [x >= cfg.mid ? stF : stB, 0] : [0, 0]));
    // pernas: o corpo cobre o topo
    const bodyImg = { w: src.w, h: src.h, d: new Uint8ClampedArray(src.d) };
    for (let y = cfg.hip; y < src.h; y += 1) for (let x = 0; x < src.w; x += 1) put(bodyImg, x, y, [0, 0, 0, 0]);
    // limpa a faixa do quadril onde o passo abriu buraco (repete a linha do quadril)
    // Capa e cabelo atrasados (rodada 3): no golpe o tronco vai à frente e eles ficam para trás.
    const lag = cfg.trail?.[col] ?? 0;
    if (lag && cfg.isTrail) {
      const trail = { w: src.w, h: src.h, d: new Uint8ClampedArray(bodyImg.d) };
      const rest = { w: src.w, h: src.h, d: new Uint8ClampedArray(bodyImg.d) };
      for (let y = 0; y < src.h; y += 1) for (let x = 0; x < src.w; x += 1) {
        const c = px(bodyImg, x, y);
        if (c[3] < 128) continue;
        if (y > cfg.neckY - 6 && cfg.isTrail(c)) put(rest, x, y, [0, 0, 0, 0]); else put(trail, x, y, [0, 0, 0, 0]);
      }
      // Primeiro no lugar (fecha os buracos), depois a cópia atrasada por cima e o corpo por último.
      place(k, frame, trail, ox, oy, () => [bdx, bdy]);
      place(k, frame, trail, ox, oy, () => [bdx + lag, bdy]);
      place(k, frame, rest, ox, oy, (x, y) => [bdx + (y <= cfg.neckY ? hdx : 0), bdy + (y <= cfg.neckY ? hdy : 0)]);
    } else {
      place(k, frame, bodyImg, ox, oy, (x, y) => [bdx + (y <= cfg.neckY ? hdx : 0), bdy + (y <= cfg.neckY ? hdy : 0)]);
    }
    if (rel) {
      const J = [ox + cfg.J[0] + bdx + 0.5, oy + cfg.J[1] + bdy + 0.5];
      const H = [J[0] + rel[0], J[1] + rel[1]];
      const behind = cfg.behind?.includes(col);
      let under = null;
      if (behind) under = clone(frame);
      drawLimb(frame, k, J, H, cfg.style, cfg.outward);
      // ombreira por cima do braço (o braço sai de baixo dela)
      if (cfg.cover) {
        const [x0, y0, x1, y1] = cfg.cover;
        for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
          const c = px(src, x, y);
          if (c[3] > 127) put(frame, ox + x + bdx, oy + y + bdy, c);
        }
      }
      if (behind) {
        for (let y = 0; y < FH; y += 1) for (let x = 0; x < FW; x += 1) if (px(under, x, y)[3] > 127 && px(frame, x, y)[3] > 127) put(frame, x, y, px(under, x, y));
      }
      hands[col] = [Math.round(H[0] - 0.5), Math.round(H[1] - 0.5)];
    } else {
      hands[col] = [ox + cfg.hang[0] + bdx, oy + cfg.hang[1] + bdy];
    }
    frames[col] = frame;
  }
  return { frames, hands };
}
