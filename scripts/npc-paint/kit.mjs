// Kit de pintura dos NPCs, animais e mascotes (Fase 20 G-npcs). Mesmo pipeline dos monstros e prédios:
// cada quadro é pintado num canvas 2D 4x maior que o final, em "pixels finais" (o contexto já vem
// escalado), e o bake (scripts/bake-npcs.mjs) reduz, leva à paleta, limpa e aplica contorno e luz de borda.
//
// Volumes em "cel": a peça recebe a cor base, um crescente de sombra embaixo/à direita e um crescente de
// luz em cima/à esquerda (máscara deslocada), que ao reduzir vira faixas limpas de 1 px.
// Detalhes de rosto (olhos, sobrancelha, boca) são pintados alinhados à grade (retângulos inteiros),
// então chegam ao pixel final sem borrar.
import { paletteRamp } from '../../src/art/palette.js';

export const W = 56;
export const H = 64;

const rampCache = new Map();
/** [sombra profunda, sombra, base, luz, brilho] da paleta a partir de uma cor qualquer. */
export function R(hex) {
  if (rampCache.has(hex)) return rampCache.get(hex);
  const [sh, base, li, shine] = paletteRamp(hex);
  const deep = paletteRamp(sh)[0];
  const out = [deep, sh, base, li, shine];
  rampCache.set(hex, out);
  return out;
}

export function ell(ctx, cx, cy, rx, ry, rot = 0) {
  const p = new ctx.Path2D();
  p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  return p;
}

/** Polígono (lista de pontos) com cantos opcionais arredondados por curvas quadráticas. */
export function poly(ctx, pts, smooth = false) {
  const p = new ctx.Path2D();
  if (!smooth) {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) p.lineTo(pts[i][0], pts[i][1]);
    p.closePath();
    return p;
  }
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  p.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i += 1) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  p.closePath();
  return p;
}

/** Cápsula afunilada de a até b (larguras wa e wb). */
export function limb(ctx, [ax, ay], [bx, by], wa, wb) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ang = Math.atan2(dy, dx);
  const p = new ctx.Path2D();
  p.moveTo(ax + nx * wa / 2, ay + ny * wa / 2);
  p.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
  p.arc(bx, by, wb / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
  p.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
  p.arc(ax, ay, wa / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
  p.closePath();
  return p;
}

export function fill(ctx, path, color) {
  ctx.fillStyle = color;
  ctx.fill(path);
}

/** Pixel(s) alinhados à grade final. */
export function px(ctx, x, y, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Traço com pontas redondas por pontos (curvas quadráticas suaves). */
export function stroke(ctx, pts, width, color, { cap = 'round' } = {}) {
  ctx.save();
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) ctx.lineTo(pts[1][0], pts[1][1]);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const last = i === pts.length - 2;
    ctx.quadraticCurveTo(x0, y0, last ? x1 : (x0 + x1) / 2, last ? y1 : (y0 + y1) / 2);
  }
  ctx.stroke();
  ctx.restore();
}

/** Recorta pelo caminho enquanto `draw` roda. */
export function inside(ctx, path, draw) {
  ctx.save();
  ctx.clip(path);
  draw();
  ctx.restore();
}

/**
 * Volume em cel: luz (crescente em cima/à esquerda), sombra (crescente embaixo/à direita), base no meio.
 * `color` é a cor base (qualquer hex; vira rampa da paleta). `d` = largura da sombra, `h` = da luz.
 */
export function cel(ctx, path, color, { d = [1.2, 1.1], h = [0.8, 0.8], light = true } = {}) {
  const [, sh, base, li] = R(color);
  const big = () => ctx.fillRect(-20, -20, 140, 140);
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = light ? li : base; big();
  ctx.translate(h[0], h[1]); ctx.clip(path); ctx.translate(-h[0], -h[1]);
  ctx.fillStyle = sh; big();
  ctx.translate(-d[0], -d[1]); ctx.clip(path); ctx.translate(d[0], d[1]);
  ctx.fillStyle = base; big();
  ctx.restore();
}

/** Faixa de sombra só embaixo (oclusão), recortada na peça. */
export function shadeBottom(ctx, path, color, y0, y1, alpha = 1) {
  ctx.save();
  ctx.clip(path);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(-20, y0, 140, y1 - y0);
  ctx.restore();
}
