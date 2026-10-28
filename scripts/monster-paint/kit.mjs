// Kit de pintura dos monstros (Fase 20G). Cada monstro é pintado num canvas 2D em ALTA
// resolução (4x o tamanho final), numa grade de desenho de 64 x 64 unidades, com curvas,
// volumes em degradê (luz do alto à esquerda) e detalhes. O bake (scripts/bake-monsters.mjs)
// reduz para pixel art, quantiza na paleta e aplica contorno/luz de borda de src/art/pixel.js.
//
// Convenções: as cores das rampas vão da sombra para a luz e devem ser cores da paleta-mestre
// (src/art/palette.js), para o degradê virar faixas limpas ao quantizar.

/** Caminho SVG (string) ou Path2D. */
export const P = (ctx, d) => new ctx.Path2D(d);

/** Elipse como Path2D (rot em radianos). */
export function ell(ctx, cx, cy, rx, ry, rot = 0) {
  const p = new ctx.Path2D();
  p.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  return p;
}

/**
 * Preenche `path` com volume: degradê radial com o foco de luz no alto à esquerda da caixa
 * [x, y, w, h], indo do tom mais claro ao mais escuro da rampa, e escurecimento na base (oclusão).
 */
export function shade(ctx, path, ramp, [x, y, w, h], { lx = 0.32, ly = 0.24, spread = 1, ao = 0.55, bias = 1 } = {}) {
  const fx = x + w * lx;
  const fy = y + h * ly;
  const radius = Math.hypot(w, h) * 0.78 * spread;
  const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, radius);
  const n = ramp.length;
  for (let i = 0; i < n; i += 1) {
    const t = Math.pow(i / (n - 1), bias);
    g.addColorStop(Math.min(1, t), ramp[n - 1 - i]);
  }
  ctx.fillStyle = g;
  ctx.fill(path);
  if (ao > 0) {
    ctx.save();
    ctx.clip(path);
    const lg = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
    lg.addColorStop(0, hexA(ramp[0], 0));
    lg.addColorStop(1, hexA(ramp[0], ao));
    ctx.fillStyle = lg;
    ctx.fillRect(x - 2, y, w + 4, h + 2);
    ctx.restore();
  }
}

/** Cor chapada. */
export function fill(ctx, path, color) {
  ctx.fillStyle = color;
  ctx.fill(path);
}

export function hexA(hex, alpha) {
  const v = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${v >> 16},${(v >> 8) & 255},${v & 255},${alpha})`;
}

/** Traço com pontas redondas por uma lista de pontos (curva quadrática suave entre eles). */
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

/**
 * Membro afunilado (cápsula) de a até b, com larguras wa e wb: devolve o Path2D.
 * Útil para patas, braços, ossos e chifres.
 */
export function limb(ctx, [ax, ay], [bx, by], wa, wb) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const p = new ctx.Path2D();
  const ang = Math.atan2(dy, dx);
  p.moveTo(ax + nx * wa / 2, ay + ny * wa / 2);
  p.lineTo(bx + nx * wb / 2, by + ny * wb / 2);
  p.arc(bx, by, wb / 2, ang + Math.PI / 2, ang - Math.PI / 2, true);
  p.lineTo(ax - nx * wa / 2, ay - ny * wa / 2);
  p.arc(ax, ay, wa / 2, ang - Math.PI / 2, ang + Math.PI / 2, true);
  p.closePath();
  return p;
}

/** Chifre/garra curvo: da base (largura w) até a ponta, dobrando pelo ponto de controle c. */
export function horn(ctx, [ax, ay], [cx, cy], [tx, ty], w) {
  const dx = tx - ax;
  const dy = ty - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w / 2;
  const ny = (dx / len) * w / 2;
  const p = new ctx.Path2D();
  p.moveTo(ax + nx, ay + ny);
  p.quadraticCurveTo(cx + nx * 0.6, cy + ny * 0.6, tx, ty);
  p.quadraticCurveTo(cx - nx * 0.6, cy - ny * 0.6, ax - nx, ay - ny);
  p.closePath();
  return p;
}

/** Brilho radial (olhos, lava, magia): só tinge onde já há corpo ou é desenhado sólido no centro. */
export function glow(ctx, x, y, r, color, { core = null, alpha = 1 } = {}) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(core ?? color, alpha));
  g.addColorStop(0.45, hexA(color, alpha * 0.85));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Pinta dentro de `path` (recorte) com a função `body`. */
export function inside(ctx, path, body) {
  ctx.save();
  ctx.clip(path);
  body();
  ctx.restore();
}

/** Mechas de pelo: traços curtos curvos ao longo de uma linha, apontando na direção (dx, dy). */
export function fur(ctx, from, to, count, length, color, width, { dx = -1, dy = 0.4, seed = 1, jitter = 0.5 } = {}) {
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const r = rand(seed + i * 7.31);
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t;
    const l = length * (0.7 + r * 0.6);
    stroke(ctx, [[x, y], [x + dx * l * 0.5 + jitter * (r - 0.5), y + dy * l * 0.5], [x + dx * l, y + dy * l + jitter * (r - 0.3)]], width, color);
  }
}

/** Pseudoaleatório estável em [0, 1). */
export function rand(seed) {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Ciclo do andar: fase em radianos para os quadros 0..3. */
export const phaseOf = (frame) => (frame % 4) * Math.PI / 2;

/** Rotaciona um ponto em volta de um pivô. */
export function rot([x, y], [px, py], a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
}

/** Paleta usada nos desenhos (todas as cores existem na paleta-mestre). */
export const C = {
  ink: '#0e071b',
  white: '#ffffff',
  grass: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e'],
  coolGrey: ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd'],
  grey: ['#272727', '#3d3d3d', '#5d5d5d', '#858585', '#b4b4b4'],
  ash: ['#1c121c', '#2d2e25', '#494834', '#775c5b', '#918275'],
  bone: ['#494834', '#775c5b', '#918275', '#cba36f', '#f6ca9f', '#f9e6cf'],
  brown: ['#1c121c', '#391f21', '#5d2c28', '#8a4836', '#bf6f4a', '#e69c69'],
  skin: ['#5d2c28', '#8a4836', '#bf6f4a', '#e69c69', '#f6ca9f'],
  wine: ['#3b1443', '#571c27', '#891e2b', '#c42430', '#ea323c', '#f68187'],
  violet: ['#0e071b', '#3b1443', '#622461', '#93388f', '#ca52c9'],
  night: ['#0e071b', '#1a1932', '#2a2f4e', '#424c6e'],
  water: ['#0c2e44', '#00396d', '#0069aa', '#0098dc', '#00cdf9', '#94fdff'],
  ice: ['#424c6e', '#657392', '#9cc8e6', '#d5e8ef', '#ffffff'],
  gold: ['#5d2c28', '#8a4836', '#edab50', '#ffc825', '#ffeb57'],
  lava: ['#8e251d', '#c64524', '#ff5000', '#ffa214', '#ffc825', '#ffeb57'],
  steel: ['#1a1932', '#2a2f4e', '#424c6e', '#657392', '#92a1b9', '#c7cfdd', '#ffffff'],
  wood: ['#1c121c', '#391f21', '#5d2c28', '#8a4836'],
  slime: ['#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f', '#d3fc7e']
};

// ---------------------------------------------------------------- Texturas (lote 2)
// Todas pintam DENTRO de `path` (recorte). Larguras em unidades da grade 64: para sobreviver à
// redução, um traço precisa de ~1 px final, ou seja, largura >= o.px (64 / tamanho final).

/**
 * Luz de borda quente: faixa de `width` na borda do alto/esquerda (ou do lado `side`) do volume,
 * como o contraluz âmbar das skins. `box` = [x, y, w, h] do volume.
 */
export function rimWarm(ctx, path, [x, y, w, h], color = '#edab50', width = 1.6, { side = 'tl', alpha = 1 } = {}) {
  ctx.save();
  ctx.clip(path);
  const clip = new ctx.Path2D();
  if (side === 'tl') { clip.moveTo(x - 2, y - 2); clip.lineTo(x + w * 1.05, y - 2); clip.lineTo(x - 2, y + h * 1.05); }
  else if (side === 't') { clip.rect(x - 2, y - 2, w + 4, h * 0.45); }
  else if (side === 'tr') { clip.moveTo(x - w * 0.05, y - 2); clip.lineTo(x + w + 2, y - 2); clip.lineTo(x + w + 2, y + h * 1.05); }
  clip.closePath();
  ctx.clip(clip);
  ctx.lineWidth = width * 2;
  // Meio-transparente: mistura com o tom de baixo e vira um degrau quente da rampa, não um traço amarelo.
  ctx.strokeStyle = hexA(color, alpha * 0.5);
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Escamas: fileiras de meias-luas (arcos) dentro de `path`, deslocadas a cada fileira.
 * `r` = raio da escama; `dark` é a sombra embaixo de cada escama e `light` o brilho no topo.
 */
export function scales(ctx, path, [x, y, w, h], r, dark, light, { lw = 0.7, lightW = null, tilt = 0 } = {}) {
  inside(ctx, path, () => {
    let row = 0;
    for (let yy = y - r; yy < y + h + r; yy += r * 1.25, row += 1) {
      for (let xx = x - r + (row % 2) * r; xx < x + w + r; xx += r * 2) {
        const cx = xx + tilt * (yy - y);
        stroke(ctx, [[cx - r * 0.95, yy], [cx, yy + r * 0.95], [cx + r * 0.95, yy]], lw, dark);
        if (light) stroke(ctx, [[cx - r * 0.5, yy - r * 0.35], [cx + r * 0.3, yy - r * 0.45]], lightW ?? lw * 0.8, light);
      }
    }
  });
}

/** Textura de pelo dentro de `path`: mechas curtas em fileiras, alternando dois tons. */
export function furTex(ctx, path, [x, y, w, h], colors, { len = 2.4, lw = 0.8, step = 2.6, dx = -0.6, dy = 1, seed = 3 } = {}) {
  inside(ctx, path, () => {
    let i = 0;
    for (let yy = y; yy < y + h + len; yy += step) {
      for (let xx = x + ((i * 1.7) % step); xx < x + w + len; xx += step * 1.15) {
        const r = rand(seed + i * 3.7);
        i += 1;
        const c = colors[i % colors.length];
        stroke(ctx, [[xx, yy], [xx + dx * len * 0.5 + (r - 0.5) * 0.6, yy + dy * len * 0.55], [xx + dx * len, yy + dy * len]], lw, c);
      }
    }
  });
}

/** Brilho especular de metal/olho/unha: um traço curto claro com um ponto mais claro na ponta. */
export function glint(ctx, x, y, len, color = '#ffffff', { lw = 0.8, angle = -0.6 } = {}) {
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  stroke(ctx, [[x, y], [ex, ey]], lw, color);
}

/** Olho expressivo: esclera/brilho, pupila e pálpebra (sobrancelha franzida em `brow`). */
export function eye(ctx, x, y, r, { iris = '#ea323c', glowC = null, brow = '#0e071b', browTilt = 0.5, lid = true, pupil = '#0e071b' } = {}) {
  if (glowC) glow(ctx, x, y, r * 2.2, glowC, { core: iris, alpha: 0.85 });
  fill(ctx, ell(ctx, x, y, r, r * 0.85), iris);
  fill(ctx, ell(ctx, x + r * 0.25, y + r * 0.1, r * 0.45, r * 0.6), pupil);
  fill(ctx, ell(ctx, x - r * 0.35, y - r * 0.35, r * 0.3, r * 0.3), '#ffffff');
  if (lid && brow) stroke(ctx, [[x - r * 1.3, y - r * (0.6 + browTilt)], [x + r * 1.2, y - r * (0.9 - browTilt)]], r * 0.75, brow);
}
