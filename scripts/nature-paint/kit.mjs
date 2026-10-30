// Kit de pintura da vegetação e das pedras (alta resolução, o bake escala o contexto 4x).
// Tudo em "pixels finais". Luz do alto-esquerda; sombra roxa embaixo; luz de borda quente.
import { rng, ellipse, fillPoly, line, rect, px, mixHex, clip, path } from '../building-paint/kit.mjs';

export { rng, ellipse, fillPoly, line, rect, px, mixHex, clip, path };

/** Rampas (sombra roxa → luz quente), todas da paleta-mestre. */
export const RAMPS = {
  leaf: ['#1a1932', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'],
  oak: ['#1a1932', '#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  // Rodada 3: outono menos saturado (era a área mais viva da tela) e sombra marrom-roxa.
  autumn: ['#3b1443', '#4e2b3c', '#71413b', '#a14b33', '#c9693b', '#dd8f45', '#edb46a'],
  pine: ['#1a1932', '#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'],
  snow: ['#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#d5e8ef', '#ffffff'],
  frost: ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#9cc8e6', '#d5e8ef', '#ffffff'],
  dry: ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#edab50', '#f6ca9f'],
  ash: ['#0e071b', '#1c121c', '#391f21', '#5d2c28', '#775c5b', '#918275', '#b4b4b4'],
  bark: ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'],
  barkGray: ['#1a1932', '#3d3d3d', '#5d5d5d', '#775c5b', '#918275', '#b4b4b4', '#c7cfdd'],
  barkChar: ['#0e071b', '#1c121c', '#272727', '#3d3d3d', '#5d2c28', '#8a4836', '#bf6f4a'],
  stone: ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#858585', '#b4b4b4', '#c7cfdd'],
  sandstone: ['#391f21', '#5d2c28', '#775c5b', '#ad7954', '#cba36f', '#f6ca9f', '#f9e6cf'],
  obsidian: ['#0e071b', '#1a1932', '#2a2f4e', '#3b1443', '#622461', '#93388f', '#ca52c9'],
  seastone: ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd']
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** Cor discreta da rampa para t em 0..1. */
export const pick = (ramp, t) => ramp[clamp(Math.round(t * (ramp.length - 1)), 0, ramp.length - 1)];
export const idxOf = (ramp, t) => clamp(Math.round(t * (ramp.length - 1)), 0, ramp.length - 1);

/** Aglomerado de folhas com 3 tons: sombra embaixo, tom base e brilho em cima-esquerda. */
export function clump(ctx, x, y, rr, ramp, idx, { stretch = 1, hi = true, rnd = null } = {}) {
  const n = ramp.length - 1;
  const rx = rr * stretch; const ry = rr * 0.88;
  ellipse(ctx, x + rr * 0.12, y + rr * 0.28, rx, ry, ramp[Math.max(0, idx - 1)]);
  ellipse(ctx, x - rr * 0.1, y - rr * 0.08, rx * 0.88, ry * 0.82, ramp[idx]);
  if (hi && idx < n) ellipse(ctx, x - rx * 0.3, y - ry * 0.38, rx * 0.46, ry * 0.34, ramp[Math.min(n, idx + 1)]);
  if (rnd && rnd() < 0.5 && idx > 1) {
    // veio de folha: traço escuro curto
    const a = rnd.range(0.3, 1.2);
    line(ctx, x - Math.cos(a) * rx * 0.5, y + Math.sin(a) * ry * 0.4, x + Math.cos(a) * rx * 0.4, y - Math.sin(a) * ry * 0.4, ramp[Math.max(0, idx - 1)], 0.6);
  }
}

/** Copa volumosa: massa escura + muitos aglomerados de folhas em camadas (de cima para baixo). */
export function crown(ctx, o) {
  const { lobes, ramp, seed = 1, density = 1, rMin = 2, rMax = 3.4, bias = 0, spikes = 0.5, stretch = 1, rim = true, clusters = false, amber = '#edab50' } = o;
  const r = rng(seed);
  const n = ramp.length - 1;
  const x0 = Math.min(...lobes.map((l) => l[0] - l[2])); const x1 = Math.max(...lobes.map((l) => l[0] + l[2]));
  const y0 = Math.min(...lobes.map((l) => l[1] - l[3])); const y1 = Math.max(...lobes.map((l) => l[1] + l[3]));
  const ccx = (x0 + x1) / 2; const ccy = (y0 + y1) / 2; const hx = (x1 - x0) / 2; const hy = (y1 - y0) / 2;
  const inside = (x, y, k) => lobes.some(([cx, cy, rx, ry]) => ((x - cx) / (rx * k)) ** 2 + ((y - cy) / (ry * k)) ** 2 <= 1);
  // massa de fundo escura
  for (const [cx, cy, rx, ry] of lobes) ellipse(ctx, cx, cy, rx * 0.9, ry * 0.9, ramp[1]);
  const list = [];
  for (const lobe of lobes) {
    const [cx, cy, rx, ry] = lobe;
    // anel de borda (silhueta recortada em folhas)
    const steps = Math.max(8, Math.round((Math.PI * (rx + ry)) / (rMin * 1.35)));
    for (let i = 0; i < steps; i += 1) {
      const a = (i / steps) * Math.PI * 2 + r.range(-0.12, 0.12);
      const k = r.range(0.86, 1.02);
      const x = cx + Math.cos(a) * rx * k; const y = cy + Math.sin(a) * ry * k;
      if (inside(x, y, 0.82)) continue;
      list.push({ x, y, rr: r.range(rMin, rMax * 0.95), lobe, edge: true });
    }
    // interior
    const count = Math.round((rx * ry * density) / (rMin * rMax * 0.9));
    for (let i = 0; i < count; i += 1) {
      const a = r() * Math.PI * 2; const d = Math.sqrt(r()) * 0.88;
      list.push({ x: cx + Math.cos(a) * rx * d, y: cy + Math.sin(a) * ry * d, rr: r.range(rMin, rMax), lobe, edge: false });
    }
  }
  for (const c of list) {
    const nx = (c.x - ccx) / hx; const ny = (c.y - ccy) / hy;
    const [lcx, lcy, lrx, lry] = c.lobe;
    const lx = (c.x - lcx) / lrx; const ly = (c.y - lcy) / lry;
    let t = 0.55 - (nx * 0.55 + ny * 0.8) * 0.3 - (lx * 0.35 + ly * 0.7) * 0.24 + bias + r.range(-0.22, 0.22);
    if (ny > 0.25) t -= (ny - 0.25) * 0.5;
    c.t = clamp(t, 0.05, 1);
  }
  // Em cachos: um lobo de cada vez (o de trás primeiro), cada um com sombra própria sobre o de trás
  // e luz de borda âmbar no alto, para a copa ler como 5-7 cachos e não como uma bolha.
  const order = clusters ? [lobes[0], ...lobes.slice(1).sort((a, b) => a[1] - b[1])] : null;
  list.sort(clusters ? (a, b) => (order.indexOf(a.lobe) - order.indexOf(b.lobe)) || (a.y - b.y) : (a, b) => a.y - b.y);
  let current = null;
  for (const c of list) {
    if (clusters && c.lobe !== current) {
      current = c.lobe;
      if (current !== order[0]) {
        const [lx, ly, lrx, lry] = current;
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        // crescente de sombra só na borda (o miolo do cacho cobre o resto logo em seguida)
        ellipse(ctx, lx + 0.6, ly - 1.4, lrx * 1.02, lry * 1.04, ramp[1]);
        ellipse(ctx, lx, ly, lrx * 0.93, lry * 0.93, ramp[2]);
        ctx.restore();
      }
    }
    const idx = Math.max(1, Math.min(n - 1, idxOf(ramp, c.t)));
    clump(ctx, c.x, c.y, c.rr, ramp, idx, { stretch, rnd: r });
    if (c.edge && r() < spikes) {
      // pontas de folha na borda
      const a = Math.atan2(c.y - ccy, c.x - ccx) + r.range(-0.5, 0.5);
      const len = c.rr * r.range(0.7, 1.2);
      line(ctx, c.x, c.y, c.x + Math.cos(a) * (c.rr + len), c.y + Math.sin(a) * (c.rr + len), ramp[Math.max(1, idx - 1)], 1.1);
    }
  }
  if (clusters) {
    // luz âmbar no topo de cada cacho (só onde o topo do cacho está à mostra)
    for (const [lx, ly, lrx, lry] of lobes) {
      for (let a = -2.6; a <= -0.7; a += 0.16) {
        const x = lx + Math.cos(a) * lrx * 0.86; const y = ly + Math.sin(a) * lry * 0.86;
        const covered = lobes.some((l) => l[1] > ly && ((x - l[0]) / l[2]) ** 2 + ((y - l[1]) / l[3]) ** 2 < 0.9);
        if (covered || r() < 0.35) continue;
        ellipse(ctx, x, y, 0.9, 0.55, r() < 0.4 ? amber : ramp[n]);
      }
    }
  }
  // folhas de luz quente em cima/esquerda
  if (rim) {
    for (const c of list) {
      if (!c.edge) continue;
      const nx = (c.x - ccx) / hx; const ny = (c.y - ccy) / hy;
      if (nx * -0.6 + ny * -0.8 > 0.35 && r() < 0.75) {
        ellipse(ctx, c.x - c.rr * 0.25, c.y - c.rr * 0.45, c.rr * 0.5, c.rr * 0.3, ramp[n]);
        if (r() < 0.45) line(ctx, c.x - c.rr * 0.7, c.y - c.rr * 0.5, c.x - c.rr * 0.1, c.y - c.rr * 0.95, ramp[n], 0.8);
      }
    }
  }
}

/** Tronco com casca, luz à esquerda, sombra da copa no alto e raízes. */
export function trunk(ctx, o) {
  const { cx, top, base, wTop, wBase, lean = 0, bark = RAMPS.bark, seed = 3, roots = 3, rootSpread = 5, shade = 0.5 } = o;
  const r = rng(seed);
  const wAt = (t) => wTop + (wBase - wTop) * t ** 2.4;
  const xc = (t) => cx + lean * (1 - t);
  const L = []; const R = [];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps; const y = top + (base - top) * t;
    L.push([xc(t) - wAt(t) / 2, y]); R.push([xc(t) + wAt(t) / 2, y]);
  }
  const pts = [...L, ...R.reverse()];
  // raízes
  const rootPolys = [];
  for (let k = 0; k < roots; k += 1) {
    const side = roots === 1 ? 0 : k === 0 ? -1 : k === 1 ? 1 : r() < 0.5 ? -0.5 : 0.5;
    const x = cx + side * wBase * 0.4; const len = rootSpread * r.range(0.8, 1.3);
    const yA = base - r.range(5, 8);
    const dir = side < 0 ? -1 : 1;
    rootPolys.push([[x - 1.6, yA], [x + 1.6, yA], [x + dir * len * 0.7 + 1, base - 1.2], [x + dir * len, base + 0.4], [x + dir * len * 0.2 - 1, base + 0.5]]);
  }
  ellipse(ctx, cx, base + 0.3, wBase * 0.7 + rootSpread * 0.6, 1.2, '#1a1932');
  for (const rp of rootPolys) fillPoly(ctx, rp, bark[2]);
  fillPoly(ctx, pts, bark[3]);
  clip(ctx, pts, () => {
    const xl = Math.min(...L.map((p) => p[0])) - 2; const xr = Math.max(...R.map((p) => p[0])) + 2;
    const wTotal = xr - xl;
    // faixa de luz (esquerda) e sombra (direita)
    rect(ctx, xl, top, wTotal * 0.34, base - top + 2, bark[4]);
    rect(ctx, xl, top, wTotal * 0.12, base - top + 2, bark[5]);
    rect(ctx, xl + wTotal * 0.64, top, wTotal, base - top + 2, bark[2]);
    rect(ctx, xl + wTotal * 0.84, top, wTotal, base - top + 2, bark[1]);
    // casca: sulcos verticais e placas
    const grooves = Math.round(wBase * 1.1);
    for (let i = 0; i < grooves; i += 1) {
      const gx = xl + r() * wTotal; const gy = top + r() * (base - top) * 0.8; const len = r.range(4, 11);
      const across = (gx - xl) / wTotal;
      line(ctx, gx, gy, gx + r.range(-0.8, 0.8), gy + len, across > 0.55 ? bark[1] : bark[2], 0.9);
      if (across < 0.45 && r() < 0.6) line(ctx, gx + 1, gy + 1, gx + 1.3, gy + len * 0.7, bark[5], 0.7);
    }
    for (let i = 0; i < wBase; i += 1) {
      const gx = xl + r() * wTotal; const gy = top + r() * (base - top);
      ellipse(ctx, gx, gy, r.range(0.8, 1.6), r.range(1.2, 2.6), (gx - xl) / wTotal < 0.5 ? bark[4] : bark[2]);
    }
    // nó
    const kx = xl + wTotal * r.range(0.3, 0.6); const ky = top + (base - top) * r.range(0.45, 0.7);
    ellipse(ctx, kx, ky, 1.4, 2, bark[1]); ellipse(ctx, kx - 0.3, ky - 0.4, 0.8, 1.2, bark[2]);
    // sombra da copa no alto do tronco
    const g = ctx.createLinearGradient(0, top, 0, top + (base - top) * 0.55);
    g.addColorStop(0, `rgba(26,25,50,${shade})`); g.addColorStop(1, 'rgba(26,25,50,0)');
    ctx.fillStyle = g; ctx.fillRect(xl, top, wTotal, (base - top) * 0.6);
  });
  for (const rp of rootPolys) line(ctx, rp[0][0] + 0.5, rp[0][1] + 1, rp[3][0] + (rp[3][0] < cx ? 1 : -1) * 0.5, rp[3][1] - 1.2, bark[4], 0.8);
}

/** Galho cônico entre dois pontos. */
export function limb(ctx, x0, y0, x1, y1, w0, w1, bark = RAMPS.bark) {
  const a = Math.atan2(y1 - y0, x1 - x0); const nx = -Math.sin(a); const ny = Math.cos(a);
  fillPoly(ctx, [[x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 - nx * w0 / 2, y0 - ny * w0 / 2]], bark[3]);
  line(ctx, x0 - nx * w0 * 0.25, y0 - ny * w0 * 0.25 - 0.2, x1 - nx * w1 * 0.25, y1 - ny * w1 * 0.25 - 0.2, bark[4], Math.max(0.7, w1 * 0.35));
  line(ctx, x0 + nx * w0 * 0.32, y0 + ny * w0 * 0.32, x1 + nx * w1 * 0.32, y1 + ny * w1 * 0.32, bark[1], Math.max(0.7, w1 * 0.3));
}

/** Um andar de pinheiro: tufos de agulhas em fileiras, bainha de ramos caídos e sombra para o andar de baixo. */
export function pineTier(ctx, { cx, top, bottom, hw, ramp, seed, snow = false, dx = 0 }) {
  const r = rng(seed);
  const n = ramp.length - 1;
  const hgt = bottom - top;
  const sw = (tt) => dx * (1 - tt);
  // Andar assimétrico (nada de "bolo"): um lado mais largo, a barra inclinada e galhos que escapam.
  const skew = r.range(0.45, 1) * (r() < 0.5 ? -1 : 1);
  const hwOf = (fx) => hw * (1 + Math.sign(fx) * skew * 0.3);
  const tilt = r.range(1, 2.4) * -Math.sign(skew);
  const hem = (fx) => bottom + fx * tilt;
  // sombra do andar sobre o de baixo e massa escura
  fillPoly(ctx, [[cx + dx, top + 3], [cx - hwOf(-1) - 1, hem(-1) + 3.5], [cx + hwOf(1) + 1, hem(1) + 3.5]], ramp[0]);
  fillPoly(ctx, [[cx + dx, top - 1], [cx - hwOf(-1) * 0.85, hem(-1) - 1], [cx + hwOf(1) * 0.85, hem(1) - 1]], ramp[1]);
  const list = [];
  const step = 3.4;
  for (let row = 0; row * step <= hgt - 2; row += 1) {
    const yy = top + 2 + row * step; const tt = (yy - top) / hgt;
    const cols = Math.max(1, Math.round((hw * tt ** 0.85 * 2) / 3.8));
    for (let c = 0; c <= cols; c += 1) {
      const fx = (c / cols) * 2 - 1;
      const w = hwOf(fx) * tt ** 0.85;
      const x = cx + sw(tt) + fx * w + r.range(-0.7, 0.7);
      list.push({ x, y: yy + r.range(-0.5, 0.6) + Math.abs(fx) * 1.2 + fx * tilt * tt * 0.6, rr: 2.2 + tt * 1.1 + r.range(0, 0.6), nx: fx * tt, tt, bottom: false });
    }
  }
  // bainha: ramos grandes caídos na borda de baixo, em comprimentos diferentes
  const cnt = Math.max(3, Math.round(((hw + 1.5) * 2) / 5.4));
  for (let c = 0; c <= cnt; c += 1) {
    const fx = (c / cnt) * 2 - 1;
    const bw = hwOf(fx) + 1.5 + r.range(-1.2, 1.2);
    list.push({ x: cx + sw(1) + fx * bw + r.range(-0.5, 0.5), y: hem(fx) - 1.2 + r.range(-0.6, 1.4) + (1 - Math.abs(fx)) * 1.5 - Math.abs(fx) * 1.4, rr: 3.1 + r.range(0, 0.7), nx: fx, tt: 1, bottom: true });
  }
  // 1 a 3 pontas de galho escapando da silhueta (só de um lado por vez)
  const tips = 1 + Math.floor(r() * 3);
  for (let i = 0; i < tips; i += 1) {
    const side = i === 0 ? Math.sign(skew) : (r() < 0.5 ? -1 : 1);
    const tt = r.range(0.55, 0.95);
    list.push({ x: cx + sw(tt) + side * (hwOf(side) * tt + r.range(1.5, 3.2)), y: top + tt * hgt + r.range(0, 1.5), rr: 1.9 + r.range(0, 0.6), nx: side, tt, bottom: true });
  }
  list.sort((p, q) => p.y - q.y);
  for (const c of list) {
    const t = clamp(0.8 - (c.nx + 1) * 0.27 - c.tt * 0.12 + r.range(-0.12, 0.12) - (c.bottom ? 0.1 : 0), 0.18, 0.95);
    const idx = Math.max(1, Math.min(n - 1, idxOf(ramp, t)));
    clump(ctx, c.x, c.y, c.rr, ramp, idx, { stretch: c.bottom ? 1.2 : 1.45, rnd: r });
    if (c.bottom || r() < 0.2) {
      const d = c.x < cx ? -1 : 1;
      line(ctx, c.x, c.y + c.rr * 0.3, c.x + d * r.range(0, 1.3), c.y + c.rr + 1.6, ramp[Math.max(1, idx - 1)], 1);
    }
    if (snow && !c.bottom && c.tt < 0.95) {
      const sn = RAMPS.snow;
      ellipse(ctx, c.x - 0.3, c.y - c.rr * 0.5, c.rr * 1.15, c.rr * 0.5, sn[c.nx < 0 ? 5 : 3]);
      ellipse(ctx, c.x - c.rr * 0.4, c.y - c.rr * 0.7, c.rr * 0.55, c.rr * 0.22, sn[6]);
      ellipse(ctx, c.x + c.rr * 0.2, c.y - c.rr * 0.15, c.rr * 0.9, c.rr * 0.28, sn[2]);
    }
  }
}

/** Pedra facetada (anéis de facetas ao redor de um pico), com musgo ou neve opcionais. */
export function rock(ctx, o) {
  const { cx, base, rx, ry, pal = RAMPS.stone, seed = 1, moss = 0, snow = 0, m = 9, jag = 0.12, wet = false } = o;
  const r = rng(seed);
  const n = pal.length - 1;
  const dcy = base - ry * 0.38;
  const outer = [[cx - rx * 0.97, base - 1], [cx - rx * 1.0, dcy + ry * 0.05]];
  for (let i = 1; i < m; i += 1) {
    const a = Math.PI + (i / m) * Math.PI; const j = 1 + r.range(-jag, jag * 0.8);
    outer.push([cx + Math.cos(a) * rx * j, dcy + Math.sin(a) * ry * 1.28 * j]);
  }
  outer.push([cx + rx * 1.0, dcy + ry * 0.05], [cx + rx * 0.97, base - 1], [cx + rx * 0.45, base + 0.4], [cx - rx * 0.45, base + 0.4]);
  const peak = [cx - rx * 0.12, dcy - ry * 0.55];
  const inner = outer.map(([x, y]) => { const k = r.range(0.42, 0.62); return [peak[0] + (x - peak[0]) * k, peak[1] + (y - peak[1]) * k * (y > dcy ? 0.9 : 1)]; });
  fillPoly(ctx, outer, pal[2]);
  const L = outer.length;
  for (let i = 0; i < L; i += 1) {
    const j = (i + 1) % L;
    const mx = (outer[i][0] + outer[j][0]) / 2; const my = (outer[i][1] + outer[j][1]) / 2;
    const dx = mx - peak[0]; const dy = my - peak[1]; const len = Math.hypot(dx, dy) || 1;
    let lam = (-(dx / len) * 0.62 - (dy / len) * 0.78) * 0.5 + 0.5;
    lam = lam * 0.8 + r.range(-0.08, 0.08) - (my > dcy + ry * 0.2 ? 0.06 : 0);
    fillPoly(ctx, [outer[i], outer[j], inner[j], inner[i]], pick(pal, clamp(lam * 0.95 + 0.04, 0.12, 0.9)));
    if (lam > 0.55 && r() < 0.6) line(ctx, outer[i][0] * 0.7 + inner[i][0] * 0.3, outer[i][1] * 0.7 + inner[i][1] * 0.3, outer[j][0] * 0.7 + inner[j][0] * 0.3, outer[j][1] * 0.7 + inner[j][1] * 0.3, pal[n], 0.7);
    fillPoly(ctx, [peak, inner[i], inner[j]], pick(pal, clamp(0.5 + lam * 0.45 + r.range(-0.05, 0.1), 0.35, 0.95)));
  }
  // arestas: luz nas voltadas para a luz, sombra nas outras
  for (let i = 0; i < L; i += 1) {
    const j = (i + 1) % L;
    const up = outer[i][1] < dcy + ry * 0.1 && outer[i][0] < peak[0] + rx * 0.2;
    line(ctx, inner[i][0], inner[i][1], inner[j][0], inner[j][1], up ? pal[n - 1] : pal[1], 0.7);
    line(ctx, inner[i][0], inner[i][1], outer[i][0], outer[i][1], up ? pal[n - 1] : pal[1], 0.6);
  }
  for (let k = 0; k < 2 + Math.round(rx / 10); k += 1) {
    const x = cx + r.range(-rx * 0.6, rx * 0.5); const y = dcy + r.range(-ry * 0.5, ry * 0.5);
    line(ctx, x, y, x + r.range(-2, 2), y + r.range(1.5, 4), pal[0], 0.7);
  }
  for (let k = 0; k < rx * 0.9; k += 1) {
    const x = cx + r.range(-rx * 0.85, rx * 0.85); const y = dcy + r.range(-ry * 0.8, ry * 0.8);
    px(ctx, Math.floor(x), Math.floor(y), r() < 0.5 ? pal[1] : pal[n - 1]);
  }
  ellipse(ctx, cx, base, rx * 0.95, 1.3, pal[0]);
  if (wet) for (let k = 0; k < 6; k += 1) px(ctx, Math.floor(cx + r.range(-rx * 0.7, rx * 0.5)), Math.floor(dcy + r.range(-ry * 0.5, ry * 0.2)), '#d5e8ef');
  if (moss) mossCap(ctx, { cx, y: dcy - ry * 0.7, rx: rx * 0.85, base, seed: seed + 5, amount: moss });
  if (snow) snowCap(ctx, { cx: cx - rx * 0.05, y: dcy - ry * 0.95, rx: rx * 0.95, seed: seed + 6 });
}

/** Musgo em aglomerados no topo e nos cantos de baixo. */
export function mossCap(ctx, { cx, y, rx, base, seed, amount = 1, ramp = RAMPS.leaf }) {
  const r = rng(seed);
  const count = Math.round(rx * 1.1 * amount);
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const f = r.range(-1, 1);
    list.push({ x: cx + f * rx * 0.9, y: y + Math.abs(f) * (base - y) * 0.45 + r.range(-0.5, 2.5), rr: r.range(1.5, 2.6) });
  }
  list.sort((a, b) => a.y - b.y);
  for (const c of list) clump(ctx, c.x, c.y, c.rr, ramp, c.x < cx ? 4 : 3);
}

/** Neve no topo: massa branca em volumes com sombra azulada embaixo. */
export function snowCap(ctx, { cx, y, rx, seed }) {
  const r = rng(seed);
  const sn = RAMPS.snow;
  const list = [];
  for (let i = 0; i < rx * 1.0; i += 1) {
    const f = r.range(-1, 1);
    list.push({ x: cx + f * rx * 0.85, y: y + (1 - Math.cos(f * 1.2)) * rx * 0.55 + r.range(0, 3.2), rr: r.range(1.9, 3.1) });
  }
  list.sort((a, b) => a.y - b.y);
  for (const c of list) clump(ctx, c.x, c.y, c.rr, sn, c.x < cx - rx * 0.1 ? 5 : c.x > cx + rx * 0.3 ? 3 : 4);
}

/** Cogumelo com chapéu brilhante: haste, chapéu em cúpula com volume, verniz e manchas. */
export function mushroom(ctx, { cx, base, capRx, capRy, stemW, stemH, cap = ['#571c27', '#891e2b', '#c42430', '#ea323c', '#f5555d', '#f68187'], spots = '#f9e6cf', gills = '#3b1443', stem = ['#775c5b', '#bf6f4a', '#e69c69', '#f6ca9f'], seed = 1, glow = null }) {
  const r = rng(seed);
  const top = base - stemH;
  fillPoly(ctx, [[cx - stemW / 2, top], [cx + stemW / 2, top], [cx + stemW / 2 + 0.8, base], [cx - stemW / 2 - 0.8, base]], stem[2]);
  rect(ctx, cx - stemW / 2, top, stemW * 0.34, stemH, stem[3]);
  rect(ctx, cx + stemW * 0.12, top, stemW / 2, stemH, stem[1]);
  line(ctx, cx + stemW * 0.2, top + 1, cx + stemW * 0.3, base, stem[0], 0.7);
  ellipse(ctx, cx, base, stemW * 0.9, 1, stem[0]);
  const capY = top + 0.8;
  ellipse(ctx, cx, capY, capRx * 0.95, capRy * 0.42, gills);
  const cy = capY - 0.4;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, capRx, capRy, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + capRx * 0.96, cy + capRy * 0.14); ctx.quadraticCurveTo(cx, cy + capRy * 0.5, cx - capRx * 0.96, cy + capRy * 0.14); ctx.closePath();
  ctx.fillStyle = cap[2]; ctx.fill(); ctx.clip();
  const blob = (x, y, rx, ry, rot, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); };
  blob(cx + capRx * 0.3, cy + capRy * 0.1, capRx, capRy * 1.2, 0, cap[1]);
  blob(cx + capRx * 0.62, cy + capRy * 0.3, capRx * 0.6, capRy * 1.1, 0, cap[0]);
  blob(cx - capRx * 0.22, cy - capRy * 0.12, capRx * 0.62, capRy * 0.72, -0.2, cap[3]);
  blob(cx - capRx * 0.38, cy - capRy * 0.36, capRx * 0.34, capRy * 0.36, -0.4, cap[4]);
  ellipse(ctx, cx - capRx * 0.46, cy - capRy * 0.55, capRx * 0.16, capRy * 0.12, cap[5]);
  if (spots) {
    const k = Math.max(3, Math.round(capRx / 2.6));
    for (let i = 0; i < k; i += 1) {
      const a = Math.PI + ((i + 0.5) / k) * Math.PI; const d = r.range(0.35, 0.78);
      const sx = cx + Math.cos(a) * capRx * d; const sy = cy + Math.sin(a) * capRy * d + capRy * 0.05;
      const sr = r.range(0.7, 1.4) * (capRx / 6);
      ellipse(ctx, sx, sy, Math.max(0.8, sr), Math.max(0.6, sr * 0.7), sx < cx ? spots : mixHex(spots, cap[2], 0.35));
    }
  }
  ctx.restore();
  if (glow) ellipse(ctx, cx - capRx * 0.1, cy - capRy * 0.2, capRx * 0.2, capRy * 0.14, glow);
}
