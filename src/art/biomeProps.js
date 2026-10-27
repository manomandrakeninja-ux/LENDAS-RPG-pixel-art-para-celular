import { Painter, fbm, rgb, mixRgb, clamp01 } from './painter.js';
import { hash } from './pixel.js';

// Objetos das regiões novas (árvores, pedras, cactos, cristais...), pintados com
// luz contínua no Painter e convertidos para pixel art com contorno escuro.
// Luz do alto à esquerda, como no resto do jogo.

const LIGHT = [-0.62, -0.78];
const INK = '#120d12';

/** Cor numa rampa (lista de hex do escuro ao claro) para v em 0..1. */
function shade(palette, v) {
  const t = clamp01(v) * (palette.length - 1);
  const index = Math.min(palette.length - 2, Math.floor(t));
  return mixRgb(rgb(palette[index]), rgb(palette[index + 1]), t - index);
}

/** Tufo de folhas com volume (esfera), textura de folhas e borda recortada. */
function foliage(p, cx, cy, rx, ry, palette, seed, { edge = 0.3, grain = 2.6, bottomShade = 0.45, light = LIGHT } = {}) {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y += 1) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = Math.hypot(nx, ny);
      const ragged = fbm(x / 3.2, y / 3.2, seed, 3);
      if (d > 1 - edge * 0.4 + (ragged - 0.5) * edge * 1.6) continue;
      const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d * d)));
      const lambert = clamp01(-(nx * light[0] + ny * light[1]) * 0.55 + nz * 0.55);
      const leaves = fbm(x / grain, y / grain, seed + 7, 2);
      let v = 0.08 + lambert * 0.72 + (leaves - 0.5) * 0.5;
      if (ny > 0.3) v -= (ny - 0.3) * bottomShade;
      p.set(x, y, shade(palette, v));
    }
  }
}

/** Tronco com casca (listras verticais) e sombra do lado direito. */
function trunk(p, cx, top, bottom, widthTop, widthBottom, palette, seed, lean = 0) {
  for (let y = Math.floor(top); y <= bottom; y += 1) {
    const t = (y - top) / Math.max(1, bottom - top);
    const width = widthTop + (widthBottom - widthTop) * t;
    const center = cx + lean * (1 - t);
    for (let x = Math.floor(center - width / 2); x <= Math.ceil(center + width / 2); x += 1) {
      const across = (x - center) / (width / 2);
      if (Math.abs(across) > 1) continue;
      const bark = fbm(x / 1.4, y / 7, seed, 2);
      const v = 0.62 - across * 0.38 + (bark - 0.5) * 0.55 - (Math.abs(across) > 0.8 ? 0.15 : 0);
      p.set(x, y, shade(palette, v));
    }
  }
}

/** Galho fino entre dois pontos. */
function branch(p, x0, y0, x1, y1, width, palette, seed) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const w = Math.max(0.6, width * (1 - t * 0.6));
    for (let oy = -w; oy <= w; oy += 1) {
      for (let ox = -w; ox <= w; ox += 1) {
        if (ox * ox + oy * oy > w * w) continue;
        const v = 0.55 - (ox / Math.max(1, w)) * 0.3 - (oy / Math.max(1, w)) * 0.2 + (hash(Math.round(x + ox), Math.round(y + oy), seed) - 0.5) * 0.2;
        p.set(x + ox, y + oy, shade(palette, v));
      }
    }
  }
}

/** Pedra facetada (normais quantizadas dão o aspecto de lascas). */
function rock(p, cx, cy, rx, ry, palette, seed, { snow = false, moss = null, facets = 5 } = {}) {
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y += 1) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x += 1) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const angle = Math.atan2(ny, nx);
      const radius = 1 + (fbm(Math.cos(angle) * 2 + 9, Math.sin(angle) * 2 + 9, seed, 3) - 0.5) * 0.45;
      const d = Math.hypot(nx, ny);
      if (d > radius || (ny > 0.55 && d > radius * 0.92)) continue;
      // Facetas: normal arredondada para poucas direções.
      const facetAngle = Math.round(angle / (Math.PI * 2 / facets)) * (Math.PI * 2 / facets);
      const r = Math.min(1, d / radius);
      const fx = Math.cos(facetAngle) * r;
      const fy = Math.sin(facetAngle) * r;
      const nz = Math.sqrt(Math.max(0, 1 - r * r));
      const lambert = clamp01(-(fx * LIGHT[0] + fy * LIGHT[1]) * 0.6 + nz * 0.5);
      const grain = fbm(x / 2, y / 2, seed + 3, 2);
      let v = 0.1 + lambert * 0.75 + (grain - 0.5) * 0.3;
      if (ny > 0.35) v -= (ny - 0.35) * 0.5;
      let color = shade(palette, v);
      if (snow && ny < -0.15 + (grain - 0.5) * 0.4) color = shade(['#9cb2c8', '#d3e1ee', '#ffffff'], 0.55 + lambert * 0.5);
      if (moss && ny < 0.1 && fbm(x / 3, y / 3, seed + 5, 2) > 0.55) color = shade(moss, 0.3 + lambert * 0.6);
      p.set(x, y, color);
    }
  }
}

/** Brilho somado (lava, cristais, olhos). */
function glow(p, cx, cy, radius, hex, intensity) {
  p.glow(cx, cy, radius, hex, intensity);
}

function finish(p, { outline = 0.62, levels = 26 } = {}) {
  return p.toPixelCanvas(levels).outline({ strength: outline, ink: INK });
}

// ---------- Paletas ----------

const LEAF_DEEP = ['#0c1a10', '#163020', '#22462a', '#326034', '#4a7e40', '#6a9e50'];
const LEAF_MOSS = ['#18240f', '#26381a', '#385226', '#4e6e30', '#6e8e3e', '#94b058'];
const LEAF_JUNGLE = ['#103a18', '#1c5a22', '#2c7a2c', '#44a03a', '#6cc450', '#a6e070'];
const PINE_SNOW = ['#0e2420', '#18382e', '#24503c', '#33684a'];
const BARK = ['#1e120c', '#33201a', '#4a3020', '#644430', '#7e5a3e'];
const BARK_GRAY = ['#1c1a1c', '#2e2a2c', '#46403e', '#5e5650', '#7a7066'];
const BARK_PALM = ['#3a2614', '#5a3e22', '#7a5830', '#98744a', '#b89466'];
const STONE = ['#1e1c22', '#34323a', '#4c4a52', '#68666c', '#8c8a8a', '#b4b0a8'];
const SANDSTONE = ['#4a2e1a', '#6e4626', '#94623a', '#b8824e', '#d4a066', '#ecc48a'];
const OBSIDIAN = ['#08060c', '#141020', '#221a30', '#342844', '#4e3c62', '#7a66a0'];
const ICE = ['#3a6a9a', '#5a8ec0', '#7ab0dc', '#a6d0f0', '#d4ecfc', '#ffffff'];
const CACTUS = ['#14361e', '#1e5028', '#2c6a32', '#3e863e', '#5aa44e', '#88c46a'];

// ---------- Floresta Antiga ----------

function ancientOak(variant) {
  const p = new Painter(96, 112, { transparent: true });
  // Raízes grossas e tronco largo.
  for (const [x0, x1] of [[34, 22], [62, 76], [44, 38], [54, 62]]) branch(p, (x0 + 48) / 2, 92, x1, 108, 4, BARK, 3);
  trunk(p, 48, 52, 106, 16, 26, BARK, 11 + variant);
  branch(p, 44, 64, 22, 46, 4, BARK, 4);
  branch(p, 54, 60, 78, 40, 4, BARK, 5);
  // Copa em várias camadas (de trás para frente).
  const clumps = [[48, 30, 40, 26], [22, 46, 20, 16], [76, 42, 20, 16], [30, 22, 22, 18], [66, 20, 22, 18], [48, 14, 22, 14], [46, 40, 26, 16]];
  clumps.forEach(([x, y, rx, ry], index) => foliage(p, x, y, rx, ry, LEAF_DEEP, 30 + index + variant * 9));
  // Musgo e cogumelos no tronco.
  for (let i = 0; i < 6; i += 1) p.set(40 + hash(i, 1, 7) * 14, 80 + hash(i, 2, 7) * 20, rgb('#6a8e3a'));
  return finish(p);
}

function mossyPine(variant) {
  const p = new Painter(56, 88, { transparent: true });
  trunk(p, 28, 60, 86, 5, 8, BARK, 13);
  const tiers = [[28, 62, 25, 12], [28, 48, 21, 11], [28, 35, 17, 10], [28, 22, 12, 9], [28, 11, 7, 8]];
  tiers.forEach(([x, y, rx, ry], index) => {
    for (let yy = Math.floor(y - ry * 1.6); yy <= y + ry * 0.6; yy += 1) {
      const t = (yy - (y - ry * 1.6)) / (ry * 2.2);
      const half = rx * Math.min(1, t * 1.1) + (fbm(yy / 2, index, 17 + variant, 2) - 0.5) * 4;
      for (let xx = Math.floor(x - half); xx <= Math.ceil(x + half); xx += 1) {
        const across = (xx - x) / Math.max(1, half);
        const needles = fbm(xx / 1.6, yy / 1.2, 19 + index, 2);
        const v = 0.55 - across * 0.4 + (needles - 0.5) * 0.5 - (t > 0.85 ? 0.25 : 0) + (1 - t) * 0.1;
        p.set(xx, yy, shade(LEAF_MOSS, v));
      }
    }
  });
  return finish(p);
}

function giantMushroom() {
  const p = new Painter(40, 46, { transparent: true });
  trunk(p, 20, 20, 44, 8, 10, ['#9a8a70', '#c8b898', '#e8dcc0', '#f8f0dc'], 21);
  // Chapéu vermelho com pintas brancas.
  for (let y = 4; y <= 22; y += 1) {
    for (let x = 2; x <= 38; x += 1) {
      const nx = (x - 20) / 18;
      const ny = (y - 20) / 16;
      if (ny > 0.1 || nx * nx + ny * ny > 1) continue;
      const lambert = clamp01(-(nx * LIGHT[0] + ny * LIGHT[1]) * 0.6 + 0.4);
      p.set(x, y, shade(['#4a0c10', '#8a1a1a', '#c8302a', '#e85a40', '#ff9a7a'], 0.15 + lambert * 0.8));
    }
  }
  for (const [x, y, r] of [[12, 12, 2.2], [24, 8, 2.6], [30, 15, 1.8], [18, 17, 1.5]]) p.ellipse(x, y, r, r * 0.8, '#f4ece0');
  for (let x = 4; x <= 36; x += 1) p.set(x, 21, rgb('#3a1a14'));
  return finish(p);
}

function fern() {
  const p = new Painter(34, 26, { transparent: true });
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const angle = Math.PI + (leaf / 6) * Math.PI;
    const length = 13 + hash(leaf, 1, 23) * 4;
    for (let t = 0; t < 1; t += 0.04) {
      const x = 17 + Math.cos(angle) * length * t;
      const y = 24 + Math.sin(angle) * length * t * 1.2 + t * t * 8;
      p.set(x, y, shade(LEAF_MOSS, 0.4 + (1 - t) * 0.3 + (leaf % 2) * 0.15));
      if (t > 0.1 && Math.round(t * 25) % 2 === 0) {
        p.set(x - Math.sin(angle) * 2, y + Math.cos(angle) * 2 - 1, shade(LEAF_MOSS, 0.6));
        p.set(x + Math.sin(angle) * 2, y - Math.cos(angle) * 2 - 1, shade(LEAF_MOSS, 0.3));
      }
    }
  }
  return finish(p, { outline: 0.4 });
}

function fallenLog(mossy = true) {
  const p = new Painter(60, 30, { transparent: true });
  for (let y = 8; y <= 24; y += 1) {
    for (let x = 4; x <= 54; x += 1) {
      const across = (y - 16) / 8;
      const bark = fbm(x / 6, y / 1.3, 25, 2);
      p.set(x, y, shade(BARK, 0.6 - across * 0.45 + (bark - 0.5) * 0.4));
      if (mossy && across < -0.4 && fbm(x / 4, y / 2, 26, 2) > 0.5) p.set(x, y, shade(LEAF_MOSS, 0.55));
    }
  }
  // Ponta cortada com anéis.
  for (let y = 8; y <= 24; y += 1) {
    for (let x = 50; x <= 58; x += 1) {
      const d = Math.hypot((x - 54) / 4, (y - 16) / 8);
      if (d > 1) continue;
      p.set(x, y, shade(['#5a3a22', '#8a6440', '#b48a5a', '#d4ae7a'], Math.abs(Math.sin(d * 9)) * 0.6 + 0.3));
    }
  }
  return finish(p);
}

// ---------- Brejo ----------

function willow() {
  const p = new Painter(84, 100, { transparent: true });
  trunk(p, 42, 40, 96, 9, 18, BARK_GRAY, 31, -4);
  branch(p, 40, 50, 18, 30, 3, BARK_GRAY, 32);
  branch(p, 44, 48, 68, 26, 3, BARK_GRAY, 33);
  foliage(p, 42, 26, 34, 20, LEAF_MOSS, 34, { edge: 0.4 });
  // Galhos caídos (cortina de folhas).
  for (let strand = 0; strand < 26; strand += 1) {
    const x0 = 12 + strand * 2.4 + hash(strand, 3, 35) * 2;
    const length = 26 + hash(strand, 4, 35) * 34;
    for (let t = 0; t < length; t += 1) {
      const x = x0 + Math.sin(t / 7 + strand) * 1.5;
      const y = 26 + t;
      p.set(x, y, shade(LEAF_MOSS, 0.65 - t / length * 0.5 + (strand % 3) * 0.06));
    }
  }
  return finish(p);
}

function deadTree(palette = BARK_GRAY, charred = false) {
  const p = new Painter(60, 84, { transparent: true });
  trunk(p, 30, 22, 82, 6, 13, palette, 41, 3);
  const limbs = [[30, 40, 10, 22], [31, 34, 50, 16], [30, 28, 22, 6], [32, 26, 40, 4], [29, 52, 8, 44], [32, 48, 54, 36]];
  limbs.forEach(([x0, y0, x1, y1], index) => {
    branch(p, x0, y0, x1, y1, 2.5, palette, 42 + index);
    branch(p, x1, y1, x1 + (x1 < 30 ? -5 : 5), y1 - 6, 1.2, palette, 50 + index);
  });
  if (charred) {
    for (let i = 0; i < 9; i += 1) {
      const x = 26 + hash(i, 1, 43) * 9;
      const y = 40 + hash(i, 2, 43) * 38;
      p.set(x, y, rgb(i % 2 ? '#ff7a2a' : '#ffb03a'));
    }
  }
  return finish(p);
}

function reeds() {
  const p = new Painter(30, 32, { transparent: true });
  for (let stem = 0; stem < 9; stem += 1) {
    const x0 = 4 + stem * 2.6;
    const height = 18 + hash(stem, 1, 51) * 10;
    const bend = (hash(stem, 2, 51) - 0.5) * 6;
    for (let t = 0; t < height; t += 1) {
      const x = x0 + bend * (t / height) ** 2;
      p.set(x, 31 - t, shade(LEAF_MOSS, 0.35 + (stem % 2) * 0.25 + t / height * 0.2));
    }
    if (stem % 2 === 0) {
      // Taboa (espiga marrom).
      const x = x0 + bend;
      for (let t = 0; t < 5; t += 1) {
        p.set(x, 31 - height + t, rgb('#5a3420'));
        p.set(x + 1, 31 - height + t, rgb('#3a2014'));
      }
    }
  }
  return finish(p, { outline: 0.45 });
}

function swampShroom() {
  const p = new Painter(30, 28, { transparent: true });
  for (const [x, y, s] of [[10, 22, 1], [20, 24, 0.8], [16, 16, 1.2]]) {
    trunk(p, x, y - 6 * s, y + 3, 2.5 * s, 3 * s, ['#8a9a8a', '#c8d8c8', '#e8f4e8'], 52);
    foliage(p, x, y - 7 * s, 6 * s, 3.5 * s, ['#1a3a3a', '#2a6a5a', '#4aa08a', '#8ae0c0', '#d0fff0'], 53, { edge: 0.05 });
    p.glow(x, y - 7 * s, 7 * s, '#7affd8', 0.35);
  }
  return finish(p, { outline: 0.5 });
}

// ---------- Picos Gelados ----------

function snowPine(variant) {
  const p = new Painter(58, 92, { transparent: true });
  trunk(p, 29, 64, 90, 5, 8, BARK, 61);
  const tiers = [[29, 66, 26, 12], [29, 51, 22, 11], [29, 37, 18, 10], [29, 24, 13, 9], [29, 12, 8, 8]];
  tiers.forEach(([x, y, rx, ry], index) => {
    for (let yy = Math.floor(y - ry * 1.6); yy <= y + ry * 0.6; yy += 1) {
      const t = (yy - (y - ry * 1.6)) / (ry * 2.2);
      const half = rx * Math.min(1, t * 1.1) + (fbm(yy / 2, index, 63 + variant, 2) - 0.5) * 4;
      for (let xx = Math.floor(x - half); xx <= Math.ceil(x + half); xx += 1) {
        const across = (xx - x) / Math.max(1, half);
        const needles = fbm(xx / 1.6, yy / 1.2, 64 + index, 2);
        const snowLine = 0.45 + (fbm(xx / 3, yy / 2, 65 + variant, 2) - 0.5) * 0.5;
        if (t < snowLine && across < 0.55) {
          p.set(xx, yy, shade(['#8aa2bc', '#b8cce0', '#e0ecf6', '#ffffff'], 0.5 - across * 0.4 + (needles - 0.5) * 0.3));
        } else {
          p.set(xx, yy, shade(PINE_SNOW, 0.55 - across * 0.4 + (needles - 0.5) * 0.5 - (t > 0.85 ? 0.2 : 0)));
        }
      }
    }
  });
  return finish(p);
}

function iceCrystal(height = 44, tint = ICE, glowHex = '#a8e0ff') {
  const p = new Painter(34, height, { transparent: true });
  const shards = [[17, height - 2, 6, height - 6, 0], [9, height - 2, 4, height * 0.55, -0.35], [25, height - 2, 4, height * 0.6, 0.3], [13, height - 2, 3, height * 0.4, -0.15]];
  shards.forEach(([x, bottom, half, length, tilt], index) => {
    for (let t = 0; t < length; t += 1) {
      const y = bottom - t;
      const w = half * (t < length * 0.75 ? 1 : (length - t) / (length * 0.25));
      const cx = x + tilt * t;
      for (let xx = Math.floor(cx - w); xx <= Math.ceil(cx + w); xx += 1) {
        const across = (xx - cx) / Math.max(1, w);
        const facet = across < -0.1 ? 0.85 : across < 0.4 ? 0.55 : 0.25;
        p.set(xx, y, shade(tint, facet + (index === 0 ? 0.05 : -0.05) + (t / length) * 0.1));
      }
    }
  });
  p.glow(17, height * 0.6, 14, glowHex, 0.4);
  return finish(p, { outline: 0.55 });
}

function frozenBush() {
  const p = new Painter(34, 26, { transparent: true });
  foliage(p, 17, 15, 14, 10, ['#1a3030', '#2a4a48', '#5a7a80', '#a8c4d4', '#e8f4fc', '#ffffff'], 71, { edge: 0.35 });
  return finish(p);
}

// ---------- Deserto ----------

function cactus(small = false) {
  const height = small ? 32 : 54;
  const p = new Painter(36, height, { transparent: true });
  const body = (cx, top, bottom, half) => {
    for (let y = top; y <= bottom; y += 1) {
      const cap = y - top < half ? Math.sqrt(Math.max(0, 1 - ((half - (y - top)) / half) ** 2)) : 1;
      const w = half * cap;
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x += 1) {
        const across = (x - cx) / Math.max(1, half);
        const ribs = Math.abs(Math.sin(across * Math.PI * 1.5));
        p.set(x, y, shade(CACTUS, 0.62 - across * 0.4 - ribs * 0.15));
      }
    }
  };
  if (small) {
    body(18, 6, 31, 7);
    body(9, 14, 24, 3.5);
    for (let y = 22; y <= 25; y += 1) for (let x = 10; x <= 13; x += 1) p.set(x, y, shade(CACTUS, 0.4));
  } else {
    body(18, 4, 53, 7);
    body(7, 16, 32, 4);
    body(29, 10, 28, 4);
    for (let x = 7; x <= 13; x += 1) for (let y = 30; y <= 33; y += 1) p.set(x, y, shade(CACTUS, 0.42));
    for (let x = 22; x <= 29; x += 1) for (let y = 26; y <= 29; y += 1) p.set(x, y, shade(CACTUS, 0.42));
    // Flor no topo.
    p.ellipse(18, 4, 3, 2, '#ff6a8a');
    p.set(18, 4, rgb('#ffe08a'));
  }
  // Espinhos.
  for (let i = 0; i < 26; i += 1) {
    const x = 4 + hash(i, 1, 81) * 28;
    const y = 4 + hash(i, 2, 81) * (height - 8);
    if (p.alpha[Math.floor(y) * 36 + Math.floor(x)] > 0.5) p.set(x, y, rgb('#f4f0c8'));
  }
  return finish(p);
}

function palm(tall = false, variant = 0) {
  const height = tall ? 108 : 92;
  const p = new Painter(72, height, { transparent: true });
  // Tronco curvo em anéis.
  const lean = variant % 2 ? -10 : 10;
  for (let t = 0; t <= 1; t += 0.008) {
    const y = height - 2 - t * (height - 30);
    const x = 36 + lean * t * t;
    const w = 4.5 - t * 1.5;
    for (let xx = Math.floor(x - w); xx <= Math.ceil(x + w); xx += 1) {
      const across = (xx - x) / w;
      if (Math.abs(across) > 1) continue;
      const ring = (Math.round(y) % 5 === 0) ? -0.2 : 0;
      p.set(xx, y, shade(BARK_PALM, 0.6 - across * 0.35 + ring));
    }
  }
  const topX = 36 + lean;
  const topY = 30;
  // Folhas compridas e arqueadas.
  for (let leaf = 0; leaf < 8; leaf += 1) {
    const angle = (leaf / 8) * Math.PI * 2 + 0.2;
    const length = 26 + hash(leaf, 1, 91) * 8;
    for (let t = 0; t < 1; t += 0.02) {
      const x = topX + Math.cos(angle) * length * t;
      const y = topY + Math.sin(angle) * length * t * 0.55 + t * t * 14;
      const w = 3.2 * Math.sin(t * Math.PI);
      for (let o = -w; o <= w; o += 0.7) {
        const px = x - Math.sin(angle) * o;
        const py = y + Math.cos(angle) * o * 0.6;
        const v = 0.35 + (1 - t) * 0.25 + (o < 0 ? 0.2 : -0.05) + (Math.sin(angle) < 0 ? 0.1 : -0.1);
        p.set(px, py, shade(LEAF_JUNGLE, v));
      }
    }
  }
  // Cocos.
  for (const [dx, dy] of [[-3, 3], [2, 4], [0, 1]]) p.sphere(topX + dx, topY + dy, 2.6, '#3a2410', '#8a5a2a');
  return finish(p);
}

function desertRock() {
  const p = new Painter(60, 44, { transparent: true });
  rock(p, 30, 26, 26, 16, SANDSTONE, 101, { facets: 4 });
  rock(p, 18, 32, 12, 9, SANDSTONE, 102, { facets: 4 });
  // Estratos.
  for (let y = 18; y <= 38; y += 4) for (let x = 6; x <= 54; x += 1) if (p.alpha[y * 60 + x] > 0.5) p.set(x, y, mixRgb(p.get(x, y), rgb('#5a361e'), 0.35));
  return finish(p);
}

function skull() {
  const p = new Painter(32, 22, { transparent: true });
  p.sphere(14, 10, 8, '#8a8070', '#f4ecd8');
  p.ellipse(10, 9, 2.4, 2.6, '#1a1410');
  p.ellipse(17, 9, 2.4, 2.6, '#1a1410');
  p.rect(10, 15, 9, 4, '#e0d6bc');
  for (let x = 11; x <= 18; x += 2) p.set(x, 16, rgb('#3a3020'));
  // Chifre.
  branch(p, 21, 6, 30, 2, 1.6, ['#6a5a40', '#c8b890', '#f0e6cc'], 111);
  return finish(p);
}

function dryBush() {
  const p = new Painter(30, 22, { transparent: true });
  for (let i = 0; i < 14; i += 1) {
    const angle = Math.PI + (i / 13) * Math.PI;
    branch(p, 15, 20, 15 + Math.cos(angle) * (9 + hash(i, 1, 121) * 5), 20 + Math.sin(angle) * (8 + hash(i, 2, 121) * 6), 0.8, ['#4a3218', '#7a5a2e', '#a88a4e'], 122 + i);
  }
  return finish(p, { outline: 0.4 });
}

function ruinPillar(broken = false) {
  const height = broken ? 46 : 68;
  const p = new Painter(30, height, { transparent: true });
  const top = broken ? 12 : 6;
  for (let y = top; y < height - 4; y += 1) {
    for (let x = 7; x <= 23; x += 1) {
      const across = (x - 15) / 8;
      const flute = Math.abs(Math.sin(across * Math.PI * 2)) * 0.12;
      const crack = fbm(x / 2, y / 3, 131, 2) > 0.72 ? -0.25 : 0;
      p.set(x, y, shade(SANDSTONE, 0.68 - across * 0.4 - flute + crack));
    }
  }
  // Base e capitel.
  p.rect(4, height - 6, 22, 6, '#b8824e');
  for (let x = 4; x <= 25; x += 1) p.set(x, height - 6, rgb('#ecc48a'));
  if (!broken) {
    p.rect(4, 2, 22, 6, '#d4a066');
    for (let x = 4; x <= 25; x += 1) p.set(x, 2, rgb('#f4dca8'));
  } else {
    for (let x = 7; x <= 23; x += 1) {
      const jag = Math.round(Math.sin(x * 1.7) * 3 + 3);
      for (let y = top; y < top + jag; y += 1) p.alpha[y * 30 + x] = 0;
    }
  }
  return finish(p);
}

// ---------- Ilha Esmeralda ----------

function tropicalBush() {
  const p = new Painter(44, 34, { transparent: true });
  foliage(p, 22, 20, 18, 12, LEAF_JUNGLE, 141, { edge: 0.35 });
  for (const [x, y, c] of [[12, 16, '#ff5a7a'], [28, 12, '#ffd84a'], [34, 20, '#ff5a7a'], [20, 24, '#ffffff']]) {
    p.ellipse(x, y, 2.2, 2, c);
    p.set(x, y, rgb('#ffe08a'));
  }
  return finish(p);
}

function bigFlower() {
  const p = new Painter(28, 30, { transparent: true });
  branch(p, 14, 29, 14, 14, 1.2, LEAF_JUNGLE, 151);
  for (let petal = 0; petal < 6; petal += 1) {
    const angle = (petal / 6) * Math.PI * 2;
    p.ellipse(14 + Math.cos(angle) * 5, 11 + Math.sin(angle) * 4, 4, 3, petal % 2 ? '#ff4a6a' : '#ff6a8a');
  }
  p.sphere(14, 11, 2.6, '#c88a1a', '#ffe06a');
  p.ellipse(8, 22, 4, 2, '#2c7a2c');
  p.ellipse(20, 20, 4, 2, '#44a03a');
  return finish(p, { outline: 0.5 });
}

function shipwreck() {
  const p = new Painter(116, 70, { transparent: true });
  // Casco quebrado inclinado, metade na areia.
  for (let y = 22; y <= 60; y += 1) {
    for (let x = 6; x <= 108; x += 1) {
      const t = (x - 6) / 102;
      const keel = 60 - Math.sin(t * Math.PI) * 6;
      const deck = 26 + t * 10 + Math.sin(t * Math.PI) * -4;
      if (y < deck || y > keel) continue;
      if (x > 80 && fbm(x / 4, y / 4, 161, 2) > 0.55) continue;
      const plank = Math.floor((y - deck) / 4) % 2 === 0 ? 0.08 : -0.06;
      p.set(x, y, shade(BARK, 0.5 + plank + (fbm(x / 8, y, 162, 2) - 0.5) * 0.4 - (y - deck) / (keel - deck) * 0.35));
    }
  }
  // Mastro quebrado e vela rasgada.
  branch(p, 46, 30, 40, 4, 2.2, BARK, 163);
  for (let y = 8; y <= 22; y += 1) for (let x = 41; x <= 41 + (22 - y) * 1.2; x += 1) if (fbm(x / 2, y / 2, 164, 2) > 0.35) p.set(x, y, shade(['#8a8070', '#c8bca0', '#ece2c8'], 0.7 - (x - 41) / 20));
  return finish(p);
}

function seaRock() {
  const p = new Painter(44, 32, { transparent: true });
  rock(p, 22, 18, 19, 12, STONE, 171, { moss: ['#1e3a2a', '#2c5a3a', '#4a7a4a'] });
  return finish(p);
}

// ---------- Ilha de Brasa ----------

function obsidianRock() {
  const p = new Painter(44, 48, { transparent: true });
  rock(p, 22, 30, 18, 16, OBSIDIAN, 181, { facets: 6 });
  rock(p, 28, 16, 9, 12, OBSIDIAN, 182, { facets: 4 });
  p.glow(22, 40, 10, '#ff5a1a', 0.25);
  return finish(p);
}

function lavaVent() {
  const p = new Painter(40, 30, { transparent: true });
  rock(p, 20, 18, 17, 10, ['#140c0c', '#2a1814', '#3e241c', '#5a3424', '#7a4a30'], 191, { facets: 6 });
  p.ellipse(20, 15, 7, 3.5, '#ff7a1a');
  p.ellipse(20, 15, 4, 2, '#ffd06a');
  p.glow(20, 14, 14, '#ff8a2a', 0.6);
  return finish(p);
}

function fireCrystal() {
  return iceCrystal(40, ['#5a0c0c', '#9a1a10', '#e0401a', '#ff8a2a', '#ffc860', '#fff0c0'], '#ff7a2a');
}

// ---------- Comuns ----------

function caveEntrance(theme) {
  const palettes = {
    earth: STONE, swamp: ['#141a12', '#24301e', '#3a4a2e', '#52643c', '#6a7e4a', '#8a9a5e'],
    ice: ['#2a4a6a', '#4a7aa0', '#7aa8cc', '#a8cce4', '#d4ecfa', '#ffffff'], tomb: SANDSTONE,
    sea: STONE, fire: OBSIDIAN
  };
  const palette = palettes[theme] ?? STONE;
  const p = new Painter(104, 80, { transparent: true });
  rock(p, 52, 44, 50, 34, palette, 201, { facets: 7, snow: theme === 'ice' });
  rock(p, 22, 56, 20, 18, palette, 202, { facets: 5, snow: theme === 'ice' });
  rock(p, 84, 56, 20, 18, palette, 203, { facets: 5, snow: theme === 'ice' });
  // Boca escura com degradê para o fundo.
  for (let y = 36; y <= 76; y += 1) {
    for (let x = 30; x <= 74; x += 1) {
      const nx = (x - 52) / 20;
      const ny = (y - 70) / 32;
      if (nx * nx + ny * ny > 1 || y > 76) continue;
      p.set(x, y, mixRgb(rgb('#000000'), rgb('#2a2028'), clamp01((y - 40) / 50)));
    }
  }
  if (theme === 'tomb') {
    // Moldura de pedra lavrada da tumba.
    p.rect(28, 34, 48, 5, '#d4a066');
    p.rect(28, 34, 5, 42, '#b8824e');
    p.rect(71, 34, 5, 42, '#94623a');
    p.ellipse(52, 30, 5, 4, '#ffd84a');
  }
  if (theme === 'fire') p.glow(52, 70, 22, '#ff5a1a', 0.5);
  if (theme === 'ice') p.glow(52, 66, 18, '#8ad0ff', 0.35);
  if (theme === 'sea') {
    // Caveira pirata pintada na rocha.
    p.sphere(52, 24, 4, '#c8c0b0', '#ffffff');
    p.set(50, 24, rgb('#000000'));
    p.set(54, 24, rgb('#000000'));
  }
  return finish(p);
}

function stairs(down) {
  const p = new Painter(48, 48, { transparent: true });
  for (let step = 0; step < 6; step += 1) {
    const y = down ? 8 + step * 6 : 38 - step * 6;
    const shrink = step * 2;
    const tone = down ? 0.8 - step * 0.13 : 0.25 + step * 0.1;
    p.rect(6 + shrink, y, 36 - shrink * 2, 6, shade(STONE, tone).map(Math.round).reduce((hex, c) => hex + c.toString(16).padStart(2, '0'), '#'));
    for (let x = 6 + shrink; x < 42 - shrink; x += 1) p.set(x, y, shade(STONE, tone + 0.15));
  }
  if (down) for (let y = 38; y < 46; y += 1) for (let x = 18; x < 30; x += 1) p.set(x, y, rgb('#050406'));
  return finish(p, { outline: 0.5 });
}

function pier() {
  const p = new Painter(48, 48, { transparent: true });
  for (let plank = 0; plank < 6; plank += 1) {
    for (let y = plank * 8; y < plank * 8 + 7; y += 1) {
      for (let x = 6; x < 42; x += 1) {
        const grain = fbm(x / 6, y / 1.2 + plank * 3, 211, 2);
        p.set(x, y, shade(BARK_PALM, 0.55 + (grain - 0.5) * 0.4 - (y - plank * 8) * 0.04));
      }
    }
    p.set(9, plank * 8 + 3, rgb('#2a2a2a'));
    p.set(38, plank * 8 + 3, rgb('#2a2a2a'));
  }
  for (const x of [4, 42]) for (let y = 0; y < 48; y += 1) p.set(x, y, shade(BARK, 0.4));
  return finish(p, { outline: 0.35 });
}

function boat() {
  const p = new Painter(100, 56, { transparent: true });
  // Casco visto de lado com vela.
  for (let y = 32; y <= 50; y += 1) {
    for (let x = 6; x <= 94; x += 1) {
      const t = (x - 6) / 88;
      const bottom = 50 - Math.sin(t * Math.PI) * 4;
      const topLine = 32 + (t < 0.15 ? (0.15 - t) * -20 : 0) + (t > 0.85 ? (t - 0.85) * -24 : 0);
      if (y < topLine || y > bottom) continue;
      const plank = Math.floor((y - 32) / 3) % 2 === 0 ? 0.06 : -0.05;
      p.set(x, y, shade(BARK, 0.62 + plank - (y - 32) / 18 * 0.4));
    }
  }
  for (let x = 6; x <= 94; x += 1) p.set(x, 33, rgb('#c88a4a'));
  branch(p, 48, 34, 48, 2, 1.6, BARK, 221);
  for (let y = 4; y <= 30; y += 1) {
    const width = 4 + (y - 4) * 1.1;
    for (let x = 50; x <= 50 + width; x += 1) p.set(x, y, shade(['#a89a80', '#d8ccb0', '#f4ecd8', '#ffffff'], 0.75 - (x - 50) / 50));
  }
  // Bandeira.
  p.rect(44, 2, 4, 3, '#c8302a');
  return finish(p);
}

function signpost() {
  const p = new Painter(30, 36, { transparent: true });
  trunk(p, 15, 6, 35, 3, 3, BARK, 231);
  p.rect(3, 6, 24, 9, '#8a6440');
  for (let x = 3; x < 27; x += 1) p.set(x, 6, rgb('#b48a5a'));
  p.polygon([[27, 6], [30, 10], [27, 15]], '#8a6440');
  return finish(p, { outline: 0.55 });
}

function bossChest() {
  const p = new Painter(42, 34, { transparent: true });
  p.rect(4, 12, 34, 20, '#6a3a1e');
  for (let y = 12; y < 32; y += 1) for (let x = 4; x < 38; x += 1) p.set(x, y, shade(BARK, 0.55 - (x - 4) / 34 * 0.3 + (y % 6 === 0 ? -0.15 : 0)));
  for (let y = 4; y < 13; y += 1) {
    for (let x = 4; x < 38; x += 1) {
      const dome = Math.sqrt(Math.max(0, 1 - ((x - 21) / 17) ** 2)) * 9;
      if (13 - y > dome) continue;
      p.set(x, y, shade(BARK, 0.7 - (x - 4) / 34 * 0.3));
    }
  }
  // Ferragens douradas.
  for (const x of [8, 33]) for (let y = 5; y < 32; y += 1) p.set(x, y, shade(['#7a5a10', '#c8a030', '#ffe070', '#fff8c0'], 0.7 - y / 60));
  for (let x = 4; x < 38; x += 1) p.set(x, 13, rgb('#e0b040'));
  p.rect(18, 13, 6, 7, '#ffd84a');
  p.set(20, 16, rgb('#2a1a0a'));
  p.glow(21, 12, 16, '#ffe08a', 0.3);
  return finish(p);
}

function stalagmite(theme = 'earth') {
  const tint = { ice: ICE, fire: OBSIDIAN, tomb: SANDSTONE, swamp: ['#141a12', '#24301e', '#3a4a2e', '#52643c', '#6a7e4a'] }[theme] ?? STONE;
  const p = new Painter(26, 42, { transparent: true });
  for (const [x, height, half] of [[13, 38, 7], [6, 20, 3.5], [20, 26, 4]]) {
    for (let t = 0; t < height; t += 1) {
      const y = 41 - t;
      const w = half * (1 - t / height) + 0.6;
      for (let xx = Math.floor(x - w); xx <= Math.ceil(x + w); xx += 1) {
        const across = (xx - x) / w;
        p.set(xx, y, shade(tint, 0.62 - across * 0.4 + (fbm(xx, y / 3, 241, 2) - 0.5) * 0.3));
      }
    }
  }
  return finish(p, { outline: 0.55 });
}

function bones() {
  const p = new Painter(30, 18, { transparent: true });
  branch(p, 4, 12, 22, 8, 1.4, ['#8a8070', '#d8ceb4', '#f8f0dc'], 251);
  branch(p, 10, 4, 18, 15, 1.2, ['#8a8070', '#d8ceb4', '#f8f0dc'], 252);
  p.sphere(24, 10, 4, '#8a8070', '#f4ecd8');
  p.set(23, 10, rgb('#1a1410'));
  p.set(25, 10, rgb('#1a1410'));
  return finish(p, { outline: 0.5 });
}

/** Rocha com veios de minério (ferro, carvão, ouro, cristal, magma). */
function oreNode(ore, seed, glowHex = null) {
  const p = new Painter(34, 28, { transparent: true });
  rock(p, 17, 16, 14, 10, STONE, seed, { facets: 5 });
  for (let i = 0; i < 9; i += 1) {
    const x = 7 + hash(i, 1, seed) * 20;
    const y = 9 + hash(i, 2, seed) * 12;
    if (p.alpha[Math.floor(y) * 34 + Math.floor(x)] < 0.5) continue;
    p.ellipse(x, y, 1.6, 1.2, ore[1]);
    p.set(x - 0.5, y - 0.5, rgb(ore[0]));
  }
  if (glowHex) p.glow(17, 14, 12, glowHex, 0.35);
  return finish(p);
}

function coconuts() {
  const p = new Painter(30, 22, { transparent: true });
  for (const [x, y] of [[9, 14], [17, 12], [21, 16], [13, 17]]) p.sphere(x, y, 4, '#3a2410', '#9a6a3a');
  foliage(p, 15, 18, 13, 3, LEAF_JUNGLE, 301, { edge: 0.5 });
  return finish(p);
}

/** Nenúfares boiando no lodo (flores rosa de vez em quando). */
function lilyPads(variant) {
  const p = new Painter(30, 20, { transparent: true });
  const pads = variant ? [[9, 8, 6], [21, 13, 5]] : [[15, 10, 7], [6, 15, 3.5]];
  pads.forEach(([x, y, r], index) => {
    for (let yy = Math.floor(y - r * 0.6); yy <= y + r * 0.6; yy += 1) {
      for (let xx = Math.floor(x - r); xx <= x + r; xx += 1) {
        const nx = (xx - x) / r;
        const ny = (yy - y) / (r * 0.6);
        if (nx * nx + ny * ny > 1) continue;
        if (Math.abs(Math.atan2(ny, nx) - 0.4) < 0.25) continue;
        p.set(xx, yy, shade(['#1e4a24', '#2e6a2e', '#4a8a3a', '#6aa84a'], 0.45 - nx * 0.3 - ny * 0.2));
      }
    }
    if (index === 0 && variant === 0) {
      p.ellipse(x, y - 1, 2, 1.5, '#f2a8c8');
      p.set(x, y - 1, rgb('#ffe08a'));
    }
  });
  return finish(p, { outline: 0.35 });
}

// ---------- Árvores do Vale (substituem as antigas no atlas 'nature', mesmo tamanho) ----------

const LEAF_VALLEY = ['#10261a', '#1a3a24', '#28552e', '#3a7238', '#58924a', '#80b25e'];

/** Pinheiro do Vale (40 x 56); shift = balanço da ponta (-1, 0, 1) para a animação. */
export function valleyPine(shift = 0) {
  const p = new Painter(40, 56, { transparent: true });
  trunk(p, 20, 40, 54, 4, 6, BARK, 401);
  const tiers = [[20, 44, 18, 9], [20, 33, 15, 8], [20, 22, 12, 7], [20, 12, 8, 6]];
  tiers.forEach(([x, y, rx, ry], index) => {
    const sway = shift * (index / 3);
    for (let yy = Math.floor(y - ry * 1.7); yy <= y + ry * 0.5; yy += 1) {
      const t = (yy - (y - ry * 1.7)) / (ry * 2.2);
      const half = rx * Math.min(1, t * 1.05) + (fbm(yy / 2, index, 402, 2) - 0.5) * 3;
      const cx = x + sway * (1 - t);
      for (let xx = Math.floor(cx - half); xx <= Math.ceil(cx + half); xx += 1) {
        const across = (xx - cx) / Math.max(1, half);
        const needles = fbm(xx / 1.5, yy / 1.2, 403 + index, 2);
        p.set(xx, yy, shade(LEAF_VALLEY, 0.6 - across * 0.42 + (needles - 0.5) * 0.45 - (t > 0.85 ? 0.22 : 0) + (1 - t) * 0.08));
      }
    }
  });
  return finish(p);
}

/** Árvore de copa redonda do Vale (48 x 56): carvalho, outono ou frutífera. */
export function valleyRoundTree(base, fruit = null, seed = 0) {
  const palettes = {
    oak: LEAF_VALLEY,
    autumn: ['#3a120c', '#6a2414', '#9a3e1c', '#c8622a', '#e8904a', '#f8c070'],
    fruit: ['#122a18', '#1e4224', '#305e30', '#467c3a', '#64984a', '#88b860']
  };
  const palette = palettes[base] ?? LEAF_VALLEY;
  const p = new Painter(48, 56, { transparent: true });
  trunk(p, 24, 30, 54, 6, 9, BARK, 411 + seed);
  branch(p, 23, 36, 14, 27, 2.2, BARK, 412);
  branch(p, 26, 38, 35, 27, 2.2, BARK, 413);
  for (const [x, y, rx, ry, index] of [[24, 24, 19, 14, 0], [13, 28, 10, 8, 1], [35, 28, 10, 8, 2], [17, 14, 11, 9, 3], [31, 14, 11, 9, 4], [24, 9, 10, 7, 5]]) {
    foliage(p, x, y, rx, ry, palette, 420 + index + seed * 7);
  }
  if (fruit) {
    for (const [x, y] of [[16, 24], [30, 18], [27, 30], [20, 13], [36, 27], [11, 30]]) {
      p.sphere(x, y, 1.8, '#7a1a14', fruit);
    }
  }
  return finish(p);
}

/** Lista de objetos para o atlas 'biome' (nome, tamanho e desenho). */
export const BIOME_PROP_ENTRIES = [
  { name: 'ancient-oak-0', draw: () => ancientOak(0) },
  { name: 'ancient-oak-1', draw: () => ancientOak(1) },
  { name: 'mossy-pine-0', draw: () => mossyPine(0) },
  { name: 'mossy-pine-1', draw: () => mossyPine(1) },
  { name: 'giant-mushroom', draw: giantMushroom },
  { name: 'fern', draw: fern },
  { name: 'fallen-log', draw: () => fallenLog(true) },
  { name: 'mossy-rock', draw: () => { const p = new Painter(40, 30, { transparent: true }); rock(p, 20, 17, 17, 11, STONE, 261, { moss: LEAF_MOSS.slice(1, 5) }); return finish(p); } },
  { name: 'willow', draw: willow },
  { name: 'dead-tree', draw: () => deadTree(BARK_GRAY) },
  { name: 'reeds', draw: reeds },
  { name: 'swamp-shroom', draw: swampShroom },
  { name: 'bog-log', draw: () => fallenLog(true) },
  { name: 'snow-pine-0', draw: () => snowPine(0) },
  { name: 'snow-pine-1', draw: () => snowPine(1) },
  { name: 'ice-crystal', draw: () => iceCrystal(44) },
  { name: 'snow-rock', draw: () => { const p = new Painter(46, 34, { transparent: true }); rock(p, 23, 19, 20, 13, STONE, 271, { snow: true }); return finish(p); } },
  { name: 'frozen-bush', draw: frozenBush },
  { name: 'cactus', draw: () => cactus(false) },
  { name: 'cactus-small', draw: () => cactus(true) },
  { name: 'palm-0', draw: () => palm(false, 0) },
  { name: 'palm-1', draw: () => palm(true, 1) },
  { name: 'desert-rock', draw: desertRock },
  { name: 'skull', draw: skull },
  { name: 'dry-bush', draw: dryBush },
  { name: 'ruin-pillar', draw: () => ruinPillar(false) },
  { name: 'ruin-pillar-broken', draw: () => ruinPillar(true) },
  { name: 'tropical-bush', draw: tropicalBush },
  { name: 'big-flower', draw: bigFlower },
  { name: 'shipwreck', draw: shipwreck },
  { name: 'sea-rock', draw: seaRock },
  { name: 'charred-tree', draw: () => deadTree(['#0c0808', '#1a1010', '#2a1a16', '#3a2620', '#4a3228'], true) },
  { name: 'obsidian', draw: obsidianRock },
  { name: 'lava-vent', draw: lavaVent },
  { name: 'fire-crystal', draw: fireCrystal },
  { name: 'ash-bush', draw: () => { const p = new Painter(30, 22, { transparent: true }); foliage(p, 15, 13, 12, 8, ['#140c0c', '#2a1a16', '#3e2a22', '#5a3e30', '#7a5a44'], 281, { edge: 0.45 }); return finish(p); } },
  ...['earth', 'swamp', 'ice', 'tomb', 'sea', 'fire'].map((theme) => ({ name: `cave-${theme}`, draw: () => caveEntrance(theme) })),
  ...['earth', 'swamp', 'ice', 'tomb', 'sea', 'fire'].map((theme) => ({ name: `stalagmite-${theme}`, draw: () => stalagmite(theme) })),
  { name: 'stairs-down', draw: () => stairs(true) },
  { name: 'stairs-up', draw: () => stairs(false) },
  { name: 'pier', draw: pier },
  { name: 'boat', draw: boat },
  { name: 'signpost', draw: signpost },
  { name: 'boss-chest', draw: bossChest },
  { name: 'bones', draw: bones },
  { name: 'node-iron', draw: () => oreNode(['#f0e8e0', '#c8a088'], 311) },
  { name: 'node-coal', draw: () => oreNode(['#5a5a60', '#0a0a0c'], 312) },
  { name: 'node-gold', draw: () => oreNode(['#fff4b0', '#e8b830'], 313, '#ffe08a') },
  { name: 'node-crystal', draw: () => oreNode(['#ffffff', '#5ab8f0'], 314, '#8ad8ff') },
  { name: 'node-magmaCore', draw: () => oreNode(['#ffe08a', '#ff5a1a'], 315, '#ff7a2a') },
  { name: 'node-food', draw: coconuts },
  { name: 'lily-0', draw: () => lilyPads(0) },
  { name: 'lily-1', draw: () => lilyPads(1) },
  { name: 'cave-crystal', draw: () => iceCrystal(34, ['#3a1a5a', '#5a2a8a', '#8a4ac0', '#b47ae0', '#dcb0f8', '#ffffff'], '#c08aff') }
];
