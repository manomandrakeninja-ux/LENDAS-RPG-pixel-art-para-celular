// G-armas: materiais (rampas da paleta, sombra → luz) e ajudantes de pintura dos equipamentos.
// Luz do alto à esquerda. Nas armas, o desenho é feito "em pé" no referencial local (cabo embaixo,
// ponta para cima, y negativo) e o bake gira 45 graus para a diagonal do ícone.

export const R = {
  rust: ['#391f21', '#5d2c28', '#775c5b', '#918275', '#b4b4b4'],
  iron: ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'],
  steel: ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#ffffff'],
  silver: ['#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#d5e8ef', '#ffffff'],
  mithril: ['#00396d', '#657392', '#9cc8e6', '#d5e8ef', '#ffffff'],
  gold: ['#5d2c28', '#8a4836', '#edab50', '#ffc825', '#ffeb57'],
  bronze: ['#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#edab50', '#f6ca9f'],
  wood: ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a'],
  paleWood: ['#391f21', '#5d2c28', '#ad7954', '#cba36f', '#f6ca9f'],
  leather: ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69'],
  bone: ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'],
  ice: ['#424c6e', '#0069aa', '#0098dc', '#00cdf9', '#94fdff', '#ffffff'],
  obsidian: ['#0e071b', '#1c121c', '#1a1932', '#2a2f4e', '#424c6e', '#657392'],
  lava: ['#8e251d', '#c64524', '#ff5000', '#ffa214', '#ffc825', '#ffeb57'],
  abyss: ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9', '#fdd2ed'],
  demon: ['#1c121c', '#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'],
  coral: ['#571c27', '#c42430', '#f5555d', '#f68187', '#fdd2ed'],
  shell: ['#775c5b', '#cba36f', '#f6ca9f', '#fdd2ed', '#f9e6cf', '#ffffff'],
  teal: ['#0c2e44', '#134c4c', '#0069aa', '#0098dc', '#00cdf9'],
  bog: ['#1c121c', '#2d2e25', '#494834', '#1e6f50', '#33984b', '#99e65f'],
  leaf: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'],
  red: ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'],
  blue: ['#03193f', '#00396d', '#0069aa', '#0098dc', '#00cdf9'],
  lapis: ['#03193f', '#00396d', '#0069aa', '#0098dc', '#94fdff'],
  white: ['#657392', '#92a1b9', '#c7cfdd', '#d5e8ef', '#ffffff'],
  linen: ['#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'],
  indigo: ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9'],
  gunmetal: ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9'],
  violet: ['#3b1443', '#622461', '#93388f', '#ca52c9', '#fdd2ed'],
  void: ['#0e071b', '#1a1932', '#3b1443', '#622461', '#93388f'],
  green: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  rune: ['#0069aa', '#00cdf9', '#94fdff', '#ffffff']
};

export const hexA = (hex, alpha) => {
  const v = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${alpha})`;
};

export function path(ctx, pts, close = true) {
  const p = new ctx.Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  if (close) p.closePath();
  return p;
}

export function ellipse(ctx, cx, cy, rx, ry, rot = 0) {
  const p = new ctx.Path2D();
  p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  return p;
}

export function fill(ctx, p, color) { ctx.fillStyle = color; ctx.fill(p); }

/** Degradê linear de `ramp` (luz em (x0,y0), sombra em (x1,y1)). */
export function lin(ctx, x0, y0, x1, y1, ramp) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  const n = ramp.length;
  for (let i = 0; i < n; i += 1) g.addColorStop(i / (n - 1), ramp[n - 1 - i]);
  return g;
}

/** Volume: degradê radial com luz no alto à esquerda da caixa e oclusão embaixo. */
export function vol(ctx, p, ramp, [x, y, w, h], { lx = 0.3, ly = 0.25, spread = 1, ao = 0.45 } = {}) {
  const fx = x + w * lx; const fy = y + h * ly;
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.hypot(w, h) * 0.8 * spread);
  const n = ramp.length;
  for (let i = 0; i < n; i += 1) g.addColorStop(i / (n - 1), ramp[n - 1 - i]);
  ctx.fillStyle = g;
  ctx.fill(p);
  if (ao > 0) {
    ctx.save(); ctx.clip(p);
    const lg = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
    lg.addColorStop(0, hexA(ramp[0], 0)); lg.addColorStop(1, hexA(ramp[0], ao));
    ctx.fillStyle = lg; ctx.fillRect(x - 1, y, w + 2, h + 1);
    ctx.restore();
  }
}

/** Traço (linha poligonal) com pontas redondas. */
export function line(ctx, pts, width, color, cap = 'round') {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

export function clip(ctx, p, body) { ctx.save(); ctx.clip(p); body(); ctx.restore(); }

/** Gema facetada: base escura, faceta clara no alto à esquerda e ponto de brilho. */
export function gem(ctx, cx, cy, r, ramp) {
  fill(ctx, ellipse(ctx, cx, cy, r, r), ramp[0]);
  vol(ctx, ellipse(ctx, cx - r * 0.08, cy - r * 0.08, r * 0.82, r * 0.82), ramp, [cx - r, cy - r, 2 * r, 2 * r], { ao: 0.2 });
  fill(ctx, path(ctx, [[cx - r * 0.6, cy - r * 0.05], [cx - r * 0.1, cy - r * 0.62], [cx + r * 0.05, cy - r * 0.1]]), ramp[ramp.length - 1]);
  if (r >= 1.4) fill(ctx, ellipse(ctx, cx - r * 0.35, cy - r * 0.38, Math.max(0.5, r * 0.28), Math.max(0.5, r * 0.28)), '#ffffff');
}

/** Pequena semente determinística. */
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const ring = (ctx, x, y, r, w, c) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };

/** Glifos dos 18 conjuntos (centro x,y; raio r; cor clara c e escura d). Mesmos desenhos dos ícones antigos. */
export const GLYPHS = {
  couro: (ctx, x, y, r, c) => { line(ctx, [[x - r, y + r], [x + r, y - r]], r * 0.42, c); line(ctx, [[x - r, y - r], [x + r, y + r]], r * 0.42, c); },
  bosque: (ctx, x, y, r, c, d) => { fill(ctx, path(ctx, [[x, y - r * 1.2], [x + r * 0.8, y - r * 0.1], [x, y + r], [x - r * 0.8, y - r * 0.1]]), c); line(ctx, [[x, y - r * 0.8], [x, y + r * 1.2]], r * 0.24, d); },
  ferro: (ctx, x, y, r, c) => { fill(ctx, path(ctx, [[x - r * 1.1, y - r * 0.8], [x + r, y - r * 0.8], [x + r * 0.6, y - r * 0.1], [x + r * 0.3, y - r * 0.1], [x + r * 0.5, y + r * 0.9], [x - r * 0.5, y + r * 0.9], [x - r * 0.3, y - r * 0.1], [x - r * 0.8, y - r * 0.25]]), c); },
  malha: (ctx, x, y, r, c) => { for (const [dx, dy] of [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]]) ring(ctx, x + dx * r, y + dy * r, r * 0.36, r * 0.24, c); },
  brejo: (ctx, x, y, r, c, d) => { fill(ctx, ellipse(ctx, x, y + r * 0.25, r, r * 0.72), c); for (const s of [-1, 1]) { fill(ctx, ellipse(ctx, x + s * r * 0.5, y - r * 0.4, r * 0.34, r * 0.34), c); fill(ctx, ellipse(ctx, x + s * r * 0.5, y - r * 0.4, r * 0.15, r * 0.15), d); } },
  prata: (ctx, x, y, r, c, d) => { const p = ellipse(ctx, x, y, r, r); clip(ctx, p, () => { fill(ctx, p, c); fill(ctx, ellipse(ctx, x + r * 0.6, y - r * 0.3, r * 0.85, r * 0.85), d); }); },
  corsario: (ctx, x, y, r, c, d) => { line(ctx, [[x - r * 1.1, y + r * 1.15], [x + r * 1.1, y + r * 0.6]], r * 0.24, c); line(ctx, [[x + r * 1.1, y + r * 1.15], [x - r * 1.1, y + r * 0.6]], r * 0.24, c); fill(ctx, ellipse(ctx, x, y - r * 0.25, r * 0.78, r * 0.72), c); fill(ctx, path(ctx, [[x - r * 0.42, y + r * 0.25], [x + r * 0.42, y + r * 0.25], [x + r * 0.32, y + r * 0.7], [x - r * 0.32, y + r * 0.7]]), c); for (const s of [-1, 1]) fill(ctx, ellipse(ctx, x + s * r * 0.32, y - r * 0.22, r * 0.21, r * 0.23), d); },
  coral: (ctx, x, y, r, c) => { line(ctx, [[x, y + r * 1.1], [x, y - r * 0.1], [x - r * 0.8, y - r * 0.9]], r * 0.3, c); line(ctx, [[x, y + r * 0.25], [x + r * 0.85, y - r * 0.95]], r * 0.3, c); line(ctx, [[x, y - r * 0.1], [x, y - r * 1.1]], r * 0.26, c); },
  glacial: (ctx, x, y, r, c) => { for (let i = 0; i < 3; i += 1) { const a = Math.PI / 2 + (i * Math.PI) / 3; line(ctx, [[x - Math.cos(a) * r, y - Math.sin(a) * r], [x + Math.cos(a) * r, y + Math.sin(a) * r]], r * 0.26, c); } },
  runico: (ctx, x, y, r, c) => { line(ctx, [[x - r * 0.45, y + r], [x - r * 0.45, y - r], [x + r * 0.55, y - r * 0.4], [x - r * 0.45, y + r * 0.1], [x + r * 0.6, y + r * 0.95]], r * 0.27, c); },
  mithril: (ctx, x, y, r, c, d) => { fill(ctx, path(ctx, [[x, y - r * 1.15], [x + r * 0.8, y], [x, y + r * 1.15], [x - r * 0.8, y]]), c); fill(ctx, path(ctx, [[x, y - r * 0.5], [x + r * 0.35, y], [x, y + r * 0.5], [x - r * 0.35, y]]), d); },
  faraonico: (ctx, x, y, r, c) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = r * 0.3; ctx.beginPath(); ctx.ellipse(x, y - r * 0.5, r * 0.42, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); line(ctx, [[x, y], [x, y + r * 1.1]], r * 0.32, c); line(ctx, [[x - r * 0.8, y + r * 0.25], [x + r * 0.8, y + r * 0.25]], r * 0.32, c); },
  adamante: (ctx, x, y, r, c, d) => { fill(ctx, path(ctx, [[x - r * 0.85, y - r * 0.3], [x, y - r * 1.1], [x + r * 0.85, y - r * 0.3], [x, y + r * 1.1]]), c); line(ctx, [[x - r * 0.8, y - r * 0.3], [x + r * 0.8, y - r * 0.3]], r * 0.16, d); line(ctx, [[x, y - r * 0.3], [x, y + r]], r * 0.16, d); },
  vulcanico: (ctx, x, y, r) => { fill(ctx, path(ctx, [[x, y - r * 1.2], [x + r * 0.5, y - r * 0.3], [x + r * 0.85, y + r * 0.5], [x, y + r * 1.0], [x - r * 0.85, y + r * 0.5], [x - r * 0.4, y - r * 0.2]]), '#ff5000'); fill(ctx, path(ctx, [[x, y - r * 0.3], [x + r * 0.4, y + r * 0.5], [x, y + r * 0.85], [x - r * 0.4, y + r * 0.5]]), '#ffeb57'); },
  demoniaco: (ctx, x, y, r, c) => { fill(ctx, path(ctx, [[x - r * 1.05, y - r * 1.1], [x - r * 0.45, y - r * 0.35], [x + r * 0.45, y - r * 0.35], [x + r * 1.05, y - r * 1.1], [x + r * 0.75, y + r * 0.4], [x, y + r * 1.0], [x - r * 0.75, y + r * 0.4]]), c); for (const s of [-1, 1]) fill(ctx, ellipse(ctx, x + s * r * 0.35, y + r * 0.05, r * 0.18, r * 0.18), '#ffeb57'); },
  celestial: (ctx, x, y, r, c) => { for (const s of [-1, 1]) fill(ctx, path(ctx, [[x + s * r * 0.15, y + r * 0.2], [x + s * r * 1.15, y - r * 0.9], [x + s * r * 0.95, y - r * 0.2], [x + s * r * 1.1, y + r * 0.1], [x + s * r * 0.6, y + r * 0.7]]), c); fill(ctx, ellipse(ctx, x, y - r * 0.05, r * 0.3, r * 0.3), '#ffeb57'); },
  abissal: (ctx, x, y, r, c) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = r * 0.3; ctx.lineCap = 'round'; ctx.beginPath(); for (let t = 0; t <= 1.0001; t += 0.02) { const a = t * Math.PI * 3.2; const rr = r * (0.15 + t * 0.9); const px = x + Math.cos(a) * rr; const py = y + Math.sin(a) * rr; if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); ctx.restore(); },
  titanico: (ctx, x, y, r, c) => { const pts = []; for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r * 1.15; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } fill(ctx, path(ctx, pts), c); }
};
