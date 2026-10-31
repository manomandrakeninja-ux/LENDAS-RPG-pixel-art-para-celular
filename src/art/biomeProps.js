import { Painter, fbm, rgb, mixRgb, clamp01 } from './painter.js';
import { hash } from './pixel.js';
import { bakedNature, hasBakedNature } from './bakedNature.js';

// Objetos das regiões novas (árvores, pedras, cactos, cristais...), pintados com
// luz contínua no Painter e convertidos para pixel art com contorno escuro.
// Luz do alto à esquerda, como no resto do jogo.

const LIGHT = [-0.62, -0.78];
// Tinta do contorno puxada para roxo (sombra fria), como a sombra de contato.
const INK = '#0e071b';

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
  return p.toPixelCanvas(levels).baseOcclusion().outline({ strength: outline, ink: INK });
}

// ---------- Paletas ----------

// Verdes direto da paleta-mestre: os tons antigos caíam no cinza-quente/oliva (#2d2e25, #494834) e a
// luz de borda das copas saía acinzentada.
const LEAF_DEEP = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
const LEAF_MOSS = ['#1c121c', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
// Agulhas de pinheiro: o tom mais escuro é azul-petróleo (#0c2e44), não o vinho-escuro #1c121c,
// que deixava pontas avermelhadas no lado da sombra.
const PINE_MOSS = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f', '#99e65f'];
const PINE_VALLEY = ['#0c2e44', '#134c4c', '#1e6f50', '#33984b', '#5ac54f'];
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
        p.set(xx, yy, shade(PINE_MOSS, v));
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

/** Casinha de vilarejo: paredes de tábuas claras, telhado escuro, porta e janela. */
function villageHouse() {
  const p = new Painter(48, 42, { transparent: true });
  const walls = ['#8a6f4d', '#a8895f', '#c4a276', '#e0c49a'];
  const roof = ['#4a2c1c', '#6a4028', '#8a5636', '#a86a42'];
  // Paredes.
  p.rect(6, 18, 36, 22, walls[1]);
  for (let y = 18; y < 40; y += 1) {
    for (let x = 6; x < 42; x += 1) {
      if ((y % 5 === 0)) p.set(x, y, walls[0]);
      else if (fbm(x / 3, y / 9, 331, 2) > 0.62) p.set(x, y, shade(walls, 0.75));
    }
  }
  // Telhado (triângulo com beiral).
  for (let y = 2; y <= 20; y += 1) {
    const half = (20 - y) * 0.95 + 4;
    for (let x = Math.floor(24 - half); x <= Math.ceil(24 + half); x += 1) {
      const t = (x - (24 - half)) / Math.max(1, half * 2);
      p.set(x, y, shade(roof, 0.35 + t * 0.4 + (y % 3 === 0 ? 0.12 : 0)));
    }
  }
  p.rect(2, 19, 44, 3, roof[0]); // beiral
  // Chaminé.
  p.rect(34, 4, 5, 9, '#7a5a4a');
  p.rect(33, 3, 7, 2, '#5a4038');
  // Porta e janela.
  p.rect(20, 28, 9, 12, '#5a3a22');
  p.set(27, 34, '#e0b040');
  p.rect(9, 24, 7, 7, '#2a3a4a');
  p.set(12, 27, '#8ac8e8');
  p.rect(32, 24, 7, 7, '#2a3a4a');
  p.set(35, 27, '#8ac8e8');
  return finish(p, { outline: 0.5 });
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

const LEAF_VALLEY = ['#0e071b', '#1c121c', '#134c4c', '#1e6f50', '#33984b', '#5ac54f'];

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
        p.set(xx, yy, shade(PINE_VALLEY, 0.6 - across * 0.42 + (needles - 0.5) * 0.45 - (t > 0.85 ? 0.22 : 0) + (1 - t) * 0.08));
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

/** Tufo baixo de grama (chão, sem colisão) — dá vida ao gramado entre as árvores. */
function grassTuft(seed = 401) {
  const p = new Painter(16, 10, { transparent: true });
  const greens = ['#1e3a14', '#2e5220', '#3f6e2c', '#559040', '#6fae52'];
  for (let blade = 0; blade < 9; blade += 1) {
    const bx = 3 + blade * 1.3 + (hash(blade, seed, 1) - 0.5) * 2;
    const height = 5 + hash(blade, seed, 2) * 4;
    const lean = (hash(blade, seed, 3) - 0.5) * 3;
    for (let t = 0; t <= 1; t += 0.12) {
      const x = bx + lean * t * t;
      const y = 9 - height * t;
      p.set(x, y, shade(greens, 0.35 + (1 - t) * 0.5 + hash(blade, Math.round(t * 9), seed) * 0.2));
    }
  }
  return finish(p, { outline: 0.35 });
}

/** Toque de flores silvestres (3 florzinhas) no chão. */
function flowerTuft(seed = 402) {
  const p = new Painter(16, 12, { transparent: true });
  const petals = ['#e8b8d8', '#f4e6a0', '#c8a8e8', '#f0f0f0'];
  for (let flower = 0; flower < 3; flower += 1) {
    const fx = 4 + flower * 4.5 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 4 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#2e5220', '#3f6e2c'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#ffe08a');
  }
  return finish(p, { outline: 0.3 });
}

/** Arbusto de floresta com flor amarela. */
function yellowForestBush(seed = 1627) {
  const p = new Painter(18, 12, { transparent: true });
  p.sphere(9, 7, 6, shade(['#2e5a24', '#4a7a3a'], 0.5), '#3f6e2c');
  p.set(7, 5, '#57a050');
  p.set(11, 8, '#ffd840');
  return finish(p, { outline: 0.35 });
}

/** Pedrinha verde de praia. */
function greenBeachPebble(seed = 1631) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#7a9a80', '#9ab8a0');
  p.set(4, 3, '#c0d8c8');
  return finish(p, { outline: 0.35 });
}

/** Gelo estilhaçado (neve). */
function shatteredIce(seed = 1637) {
  const p = new Painter(18, 9, { transparent: true });
  p.sphere(9, 5, 5, '#b8d8f0', '#dceefc');
  p.rect(6, 3, 1, 4, '#8ab8e0');
  p.rect(10, 2, 1, 5, '#8ab8e0');
  p.rect(8, 6, 4, 1, '#8ab8e0');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo laranja (floresta). */
function orangeShroom(seed = 1641) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e8d8c0');
  p.sphere(5, 5, 3.2, '#d87830', '#f09850');
  p.set(4, 4, '#ffe8d0');
  return finish(p, { outline: 0.35 });
}

/** Pedra de duna escura arredondada. */
function darkRoundDuneRock(seed = 1647) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#9a8050', '#b89a68');
  p.set(6, 4, '#d0b888');
  return finish(p, { outline: 0.35 });
}

/** Flor do brejo verde-água. */
/** Flor da duna verde clara. */
function lightGreenDuneFlower(seed = 2227) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8e080');
  p.set(5, 5, '#f4fff0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde-água escura. */
function darkSeaGreenBeachStone(seed = 2231) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#5a8a7e', '#78a89c');
  p.set(5, 3, '#a8d0c4');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor verde clara (neve). */
function lightGreenFloweredSnow(seed = 2237) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#a8e080');
  p.set(6, 5, '#a8e080');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo verde-água escuro (brejo). */
function darkSeaGreenSwampShroom(seed = 2241) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#d8e4de');
  p.sphere(5, 5, 3.2, '#3a8a7c', '#58a89a');
  p.set(4, 4, '#e8f6f2');
  return finish(p, { outline: 0.35 });
}

/** Flor de selva verde clara. */
function lightGreenJungleFlower(seed = 2247) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8e080');
  p.set(5, 5, '#f4fff0');
  return finish(p, { outline: 0.3 });
}

/** Flor da praia verde clara. */
function lightGreenBeachFlower(seed = 2257) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a8a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8e080');
  p.set(5, 5, '#f4fff0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de duna verde-água. */
function seaGreenDuneStone(seed = 2261) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#6a9a8c', '#8ab8ac');
  p.set(5, 3, '#c0e0d8');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde claro claro (neve). */
function paleGreenIce(seed = 2267) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d0e8c8', '#e8f8e0');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo verde claro do brejo. */
function lightGreenSwampShroom(seed = 2271) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e4ecd8');
  p.sphere(5, 5, 3.2, '#8ab868', '#aad488');
  p.set(4, 4, '#f4fce8');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza verde-água clara. */
function lightSeaGreenAshFlower(seed = 2277) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#8ae8d4');
  p.set(5, 5, '#f4fffc');
  return finish(p, { outline: 0.3 });
}

/** Flor do brejo verde clara. */
function lightGreenSwampFlower(seed = 2287) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8e080');
  p.set(5, 5, '#f4fff0');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia verde-água clara. */
function lightSeaGreenBeachPebble(seed = 2291) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#8ac4b8', '#aadcd2');
  p.set(4, 3, '#dcf4ee');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde-água claro (neve). */
function lightSeaGreenIce(seed = 2297) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#a8d8cc', '#ccece2');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de selva musgoso. */
function mossyJungleLog(seed = 2301) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#4e3e28', '#665138'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#382c1c'); p.set(23, 7, '#382c1c');
  p.set(10, 5, '#4e7e3a'); p.set(14, 6, '#5f9448');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza verde clara clara. */
function paleGreenAshFlower(seed = 2307) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c8f0a8');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Flor da praia verde clara clara. */
function paleGreenBeachFlower(seed = 2317) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a8a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c8f0a8');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de duna verde clara. */
function lightGreenDuneStone(seed = 2321) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#a0b878', '#c0d898');
  p.set(5, 3, '#e4f4c8');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor verde clara clara (neve). */
function paleGreenFloweredSnow(seed = 2327) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#c8f0a8');
  p.set(6, 5, '#c8f0a8');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo verde-água claro do brejo. */
function lightSeaGreenSwampShroom(seed = 2331) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e8f0ec');
  p.sphere(5, 5, 3.2, '#6fc8b8', '#90e0d0');
  p.set(4, 4, '#f4fcf8');
  return finish(p, { outline: 0.35 });
}

/** Flor de selva verde clara clara. */
function paleGreenJungleFlower(seed = 2337) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c8f0a8');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Flor da duna verde clara clara. */
function paleGreenDuneFlower(seed = 2347) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c8f0a8');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde clara clara. */
function paleGreenBeachStone(seed = 2351) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b0d0a0', '#d0e8c0');
  p.set(5, 3, '#eefae0');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde claro claro (neve). */
function paleGreenIce2(seed = 2357) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d8ecc8', '#eef8e4');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de brejo claro. */
function paleSwampLog(seed = 2361) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#7a6a4a', '#8f7f5e'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#5a4c34'); p.set(23, 7, '#5a4c34');
  return finish(p, { outline: 0.35 });
}

/** Flor de floresta verde clara clara. */
function paleGreenForestFlower(seed = 2367) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c8f0a8');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Flor lilás clara do brejo. */
function paleLilacSwampFlower(seed = 2377) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d8b8f0');
  p.set(5, 5, '#fbf4ff');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha lilás clara de praia. */
function paleLilacBeachPebble(seed = 2381) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#c0b0d8', '#dcd0ec');
  p.set(4, 3, '#f4ecfa');
  return finish(p, { outline: 0.35 });
}

/** Gelo lilás claro (neve). */
function paleLilacIce(seed = 2387) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d0c0e8', '#e8dcf4');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco lilás de duna (madeira clara tingida). */
function lilacDuneLog(seed = 2391) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#a898b8', '#c0b4d0'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#887aa0'); p.set(23, 7, '#887aa0');
  return finish(p, { outline: 0.35 });
}

/** Flor lilás clara da floresta. */
function paleLilacForestFlower(seed = 2397) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d8b8f0');
  p.set(5, 5, '#fbf4ff');
  return finish(p, { outline: 0.3 });
}

/** Flor coral clara do brejo. */
function paleCoralSwampFlower(seed = 2407) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffb8a8');
  p.set(5, 5, '#fff4f0');
  return finish(p, { outline: 0.3 });
}

/** Pedra coral clara de praia. */
function paleCoralBeachStone(seed = 2411) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d89880', '#f0bcac');
  p.set(5, 3, '#ffe4dc');
  return finish(p, { outline: 0.35 });
}

/** Gelo coral claro (neve). */
function paleCoralIce(seed = 2417) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#f0ccc0', '#f8e6de');
  p.set(5, 3, '#fff4ee');
  return finish(p, { outline: 0.35 });
}

/** Tronco coral de duna. */
function coralDuneLog(seed = 2421) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#c09878', '#d8b494'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#a07858'); p.set(23, 7, '#a07858');
  return finish(p, { outline: 0.35 });
}

/** Flor coral clara da floresta. */
function paleCoralForestFlower(seed = 2427) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffb8a8');
  p.set(5, 5, '#fff4f0');
  return finish(p, { outline: 0.3 });
}

/** Flor turquesa clara do brejo. */
function paleTurquoiseSwampFlower(seed = 2437) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#88e8e0');
  p.set(5, 5, '#f4fffe');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha turquesa clara de praia. */
function paleTurquoiseBeachPebble(seed = 2441) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#88c8c0', '#aadcd4');
  p.set(4, 3, '#dcf6f2');
  return finish(p, { outline: 0.35 });
}

/** Gelo turquesa claro (neve). */
function paleTurquoiseIce(seed = 2447) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b0e0da', '#d4f0ec');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco turquesa de duna. */
function turquoiseDuneLog(seed = 2451) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#88a898', '#a8c4b8'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#687a70'); p.set(23, 7, '#687a70');
  return finish(p, { outline: 0.35 });
}

/** Flor turquesa clara da floresta. */
function paleTurquoiseForestFlower(seed = 2457) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#88e8e0');
  p.set(5, 5, '#f4fffe');
  return finish(p, { outline: 0.3 });
}

/** Flor verde-água clara clara do brejo. */
function paleSeaGreenSwampFlower(seed = 2467) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8ecd8');
  p.set(5, 5, '#f8fffc');
  return finish(p, { outline: 0.3 });
}

/** Pedra verde-água clara clara de praia. */
function paleSeaGreenBeachStone(seed = 2471) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#a8d0c4', '#c8e8e0');
  p.set(5, 3, '#e8f8f4');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde-água claro claro (neve). */
function paleSeaGreenIce(seed = 2477) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c8e8e0', '#e4f6f2');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco verde-água de duna. */
function seaGreenDuneLog(seed = 2481) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#98b8a8', '#b4d0c0'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#78988a'); p.set(23, 7, '#78988a');
  return finish(p, { outline: 0.35 });
}

/** Flor verde-água clara clara da floresta. */
function paleSeaGreenForestFlower(seed = 2487) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8ecd8');
  p.set(5, 5, '#f8fffc');
  return finish(p, { outline: 0.3 });
}

/** Flor dourada clara do brejo. */
function paleGoldSwampFlower(seed = 2497) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffe89a');
  p.set(5, 5, '#fffce8');
  return finish(p, { outline: 0.3 });
}

/** Pedra dourada clara de praia. */
function paleGoldBeachStone(seed = 2501) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#e0c878', '#f4e0a8');
  p.set(5, 3, '#fcf0d0');
  return finish(p, { outline: 0.35 });
}

/** Gelo dourado claro (neve). */
function paleGoldIce(seed = 2507) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#f0e0b0', '#f8eed0');
  p.set(5, 3, '#fff8e0');
  return finish(p, { outline: 0.35 });
}

/** Tronco dourado de duna. */
function goldDuneLog(seed = 2511) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#c8a860', '#e0c888'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#a08848'); p.set(23, 7, '#a08848');
  return finish(p, { outline: 0.35 });
}

/** Flor dourada clara da floresta. */
function paleGoldForestFlower(seed = 2517) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffe89a');
  p.set(5, 5, '#fffce8');
  return finish(p, { outline: 0.3 });
}

/** Flor rosa clara do brejo. */
function palePinkSwampFlower(seed = 2527) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffc8e0');
  p.set(5, 5, '#fff4fa');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha rosa clara de praia. */
function palePinkBeachPebble(seed = 2531) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e0b0c8', '#f2d0e0');
  p.set(4, 3, '#fae8f2');
  return finish(p, { outline: 0.35 });
}

/** Gelo rosa claro (neve). */
function palePinkIce(seed = 2537) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#f0d0e0', '#f8e8f0');
  p.set(5, 3, '#fff6fa');
  return finish(p, { outline: 0.35 });
}

/** Tronco rosa de duna. */
function pinkDuneLog(seed = 2541) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#c898a8', '#e0b8c8'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#a87888'); p.set(23, 7, '#a87888');
  return finish(p, { outline: 0.35 });
}

/** Flor rosa clara da floresta. */
function palePinkForestFlower(seed = 2547) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffc8e0');
  p.set(5, 5, '#fff4fa');
  return finish(p, { outline: 0.3 });
}

/** Flor laranja clara do brejo. */
function paleOrangeSwampFlower(seed = 2557) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffd0a8');
  p.set(5, 5, '#fff8f0');
  return finish(p, { outline: 0.3 });
}

/** Pedra laranja clara de praia. */
function paleOrangeBeachStone(seed = 2561) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#e0b088', '#f2cdb0');
  p.set(5, 3, '#fce8da');
  return finish(p, { outline: 0.35 });
}

/** Gelo laranja claro (neve). */
function paleOrangeIce(seed = 2567) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#f2d8c0', '#f8e8dc');
  p.set(5, 3, '#fff2e8');
  return finish(p, { outline: 0.35 });
}

/** Tronco laranja de duna. */
function orangeDuneLog(seed = 2571) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#c09068', '#dcac88'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#a07050'); p.set(23, 7, '#a07050');
  return finish(p, { outline: 0.35 });
}

/** Flor laranja clara da floresta. */
function paleOrangeForestFlower(seed = 2577) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffd0a8');
  p.set(5, 5, '#fff8f0');
  return finish(p, { outline: 0.3 });
}

/** Flor azul clara do brejo. */
function paleBlueSwampFlower(seed = 2587) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8d4ff');
  p.set(5, 5, '#f4faff');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha azul clara de praia. */
function paleBlueBeachPebble(seed = 2591) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#a8c0e0', '#c8d8f2');
  p.set(4, 3, '#e8f0fa');
  return finish(p, { outline: 0.35 });
}

/** Gelo azul-céu claro (neve). */
function skyBlueIce(seed = 2597) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c8dcf2', '#e4eefc');
  p.set(5, 3, '#f8fbff');
  return finish(p, { outline: 0.35 });
}

/** Tronco azul de duna. */
function blueDuneLog(seed = 2601) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#98a8c0', '#b4c4d8'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#7888a0'); p.set(23, 7, '#7888a0');
  return finish(p, { outline: 0.35 });
}

/** Flor azul clara da floresta. */
function paleBlueForestFlower(seed = 2607) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8d4ff');
  p.set(5, 5, '#f4faff');
  return finish(p, { outline: 0.3 });
}

/** Flor verde-limão clara do brejo. */
function paleLimeSwampFlower(seed = 2617) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d8f08a');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Pedra verde-limão clara de praia. */
function paleLimeBeachStone(seed = 2621) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b8cc78', '#d8e4a8');
  p.set(5, 3, '#eef4d0');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde-limão claro (neve). */
function paleLimeIce(seed = 2627) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d8e8b0', '#ecf4d4');
  p.set(5, 3, '#f8fce8');
  return finish(p, { outline: 0.35 });
}

/** Tronco verde-limão de duna. */
function limeDuneLog(seed = 2631) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#a8b868', '#c4d48c'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#889848'); p.set(23, 7, '#889848');
  return finish(p, { outline: 0.35 });
}

/** Flor verde-limão clara da floresta. */
function paleLimeForestFlower(seed = 2637) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d8f08a');
  p.set(5, 5, '#fafff0');
  return finish(p, { outline: 0.3 });
}

/** Flor menta clara do brejo. */
function paleMintSwampFlower(seed = 2647) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8f0d0');
  p.set(5, 5, '#f4fffa');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha menta clara de praia. */
function paleMintBeachPebble(seed = 2651) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#a8d8c8', '#c8ecdf');
  p.set(4, 3, '#e8f8f2');
  return finish(p, { outline: 0.35 });
}

/** Gelo menta claro (neve). */
function paleMintIce(seed = 2657) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c8ecdf', '#e2f6ee');
  p.set(5, 3, '#f6fffb');
  return finish(p, { outline: 0.35 });
}

/** Tronco menta de duna. */
function mintDuneLog(seed = 2661) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#a0c0b0', '#bcd8ca'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#809f90'); p.set(23, 7, '#809f90');
  return finish(p, { outline: 0.35 });
}

/** Flor menta clara da floresta. */
function paleMintForestFlower(seed = 2667) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8f0d0');
  p.set(5, 5, '#f4fffa');
  return finish(p, { outline: 0.3 });
}

/** Flor cinza clara do brejo. */
function paleGraySwampFlower(seed = 2677) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d8d8e0');
  p.set(5, 5, '#f8f8fc');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha cinza clara de praia. */
function paleGrayBeachPebble(seed = 2681) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#b8b8c0', '#d4d4dc');
  p.set(4, 3, '#ececf2');
  return finish(p, { outline: 0.35 });
}

/** Gelo cinza claro (neve). */
function paleGrayIce(seed = 2687) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d0d4dc', '#e6e9f0');
  p.set(5, 3, '#f4f6fa');
  return finish(p, { outline: 0.35 });
}

/** Tronco cinza de duna. */
function grayDuneLog(seed = 2691) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#b0b0b8', '#c8c8d0'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#909098'); p.set(23, 7, '#909098');
  return finish(p, { outline: 0.35 });
}

/** Flor cinza clara da floresta. */
function paleGrayForestFlower(seed = 2697) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d8d8e0');
  p.set(5, 5, '#f8f8fc');
  return finish(p, { outline: 0.3 });
}

/** Flor lavanda clara do brejo. */
function paleLavenderSwampFlower(seed = 2707) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d0b8f0');
  p.set(5, 5, '#f8f2ff');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha lavanda clara de praia. */
function paleLavenderBeachPebble(seed = 2711) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#c0b0d8', '#dcd0ec');
  p.set(4, 3, '#f2ecfa');
  return finish(p, { outline: 0.35 });
}

/** Gelo lavanda claro (neve). */
function paleLavenderIce(seed = 2717) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#d8ccec', '#ece2f8');
  p.set(5, 3, '#f8f4fe');
  return finish(p, { outline: 0.35 });
}

/** Tronco lavanda de duna. */
function lavenderDuneLog(seed = 2721) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#b0a0c8', '#c8bcdf'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#9084ac'); p.set(23, 7, '#9084ac');
  return finish(p, { outline: 0.35 });
}

/** Flor lavanda clara da floresta. */
function paleLavenderForestFlower(seed = 2727) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d0b8f0');
  p.set(5, 5, '#f8f2ff');
  return finish(p, { outline: 0.3 });
}

/** Flor marfim clara do brejo. */
function paleIvorySwampFlower(seed = 2737) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f8f0dc');
  p.set(5, 5, '#fffcf4');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha marfim clara de praia. */
function paleIvoryBeachPebble(seed = 2741) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e0d8c0', '#f0e8d4');
  p.set(4, 3, '#faf4e4');
  return finish(p, { outline: 0.35 });
}

/** Gelo marfim claro (neve). */
function paleIvoryIce(seed = 2747) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#eee6d0', '#f8f2e2');
  p.set(5, 3, '#fdfaf0');
  return finish(p, { outline: 0.35 });
}

/** Tronco marfim de duna. */
function ivoryDuneLog(seed = 2751) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#d8ccb0', '#ece0c8'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#b8ac90'); p.set(23, 7, '#b8ac90');
  return finish(p, { outline: 0.35 });
}

/** Flor marfim clara da floresta. */
function paleIvoryForestFlower(seed = 2757) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f8f0dc');
  p.set(5, 5, '#fffcf4');
  return finish(p, { outline: 0.3 });
}

/** Flor pêssego clara do brejo. */
function palePeachSwampFlower(seed = 2767) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffd8b8');
  p.set(5, 5, '#fff4ea');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha pêssego clara de praia. */
function palePeachBeachPebble(seed = 2771) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e8c8a8', '#f6ddc4');
  p.set(4, 3, '#fceee2');
  return finish(p, { outline: 0.35 });
}

/** Gelo pêssego claro (neve). */
function palePeachIce(seed = 2777) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#f4e0cc', '#faecdc');
  p.set(5, 3, '#fdf4ea');
  return finish(p, { outline: 0.35 });
}

/** Tronco pêssego de duna. */
function peachDuneLog(seed = 2781) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#d0b090', '#e6ccb0'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#b09070'); p.set(23, 7, '#b09070');
  return finish(p, { outline: 0.35 });
}

/** Flor pêssego clara da floresta. */
function palePeachForestFlower(seed = 2787) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffd8b8');
  p.set(5, 5, '#fff4ea');
  return finish(p, { outline: 0.3 });
}

function seaGreenSwampFlower(seed = 2197) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#6ad8c0');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia verde clara. */
function lightGreenBeachPebble(seed = 2201) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#9ab87a', '#b8d898');
  p.set(4, 3, '#e0f0c8');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde claro (neve). */
function lightGreenIce(seed = 2207) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c0e0b0', '#e0f4d8');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de praia enlameado. */
function muddyBeachLog(seed = 2211) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#7a6a4a', '#8f7e5e'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#5a4c34'); p.set(23, 7, '#5a4c34');
  p.set(12, 6, '#6a8a5a');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza verde clara. */
function lightGreenAshFlower(seed = 2217) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8e080');
  p.set(5, 5, '#f4fff0');
  return finish(p, { outline: 0.3 });
}

/** Flor da praia verde-água. */
function seaGreenBeachFlower(seed = 2167) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a8a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#6ad8c0');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Pedra de duna verde. */
function greenDuneStone(seed = 2171) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8aa060', '#aac080');
  p.set(5, 3, '#d8ecc0');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor verde-água (neve). */
function seaGreenFloweredSnow(seed = 2177) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#6ad8c0');
  p.set(6, 5, '#6ad8c0');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo verde-água claro (brejo). */
function seaGreenSwampShroom(seed = 2181) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e0ece8');
  p.sphere(5, 5, 3.2, '#5cb8a8', '#7ed0c0');
  p.set(4, 4, '#f0faf6');
  return finish(p, { outline: 0.35 });
}

/** Flor de selva verde-água. */
function seaGreenJungleFlower(seed = 2187) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#6ad8c0');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Flor da duna verde-água. */
function seaGreenDuneFlower(seed = 2137) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#6ad8c0');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde-água clara. */
function seaGreenBeachStone(seed = 2141) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8ab8ac', '#aad8cc');
  p.set(5, 3, '#d8f0ea');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde-água escuro (neve). */
function darkTealIce(seed = 2147) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#6a9a90', '#8ab8b0');
  p.set(5, 3, '#c8e0da');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo verde claro (floresta). */
function lightGreenShroom(seed = 2151) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e0e8d8');
  p.sphere(5, 5, 3.2, '#7ab060', '#9ac880');
  p.set(4, 4, '#f0f8e8');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza verde-água. */
function seaGreenAshFlower(seed = 2157) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#6ad8c0');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Flor do brejo verde. */
function greenSwampFlower(seed = 2107) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#8ad86a');
  p.set(5, 5, '#f0ffe8');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia lilás clara. */
function lightLilacBeachPebble(seed = 2111) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#b8a8d0', '#d4c8e8');
  p.set(4, 3, '#f0e8fa');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde (neve). */
function greenIce(seed = 2117) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b8e0c0', '#d8f4e0');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de brejo enlameado. */
function muddySwampLog(seed = 2121) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#5a4a30', '#6e5c40'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#3a2e1e'); p.set(23, 7, '#3a2e1e');
  p.set(12, 6, '#4e6e3a');
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta verde clara. */
function lightGreenForestFlower(seed = 2127) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8e080');
  p.set(5, 5, '#f4fff0');
  return finish(p, { outline: 0.3 });
}

/** Flor de duna coral clara. */
function lightCoralDuneFlower(seed = 2077) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffb098');
  p.set(5, 5, '#fff4ec');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde clara. */
function lightGreenBeachStone(seed = 2081) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8aa878', '#aac898');
  p.set(5, 3, '#d0e8c0');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor coral (neve). */
function coralFloweredSnow(seed = 2087) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#ff9a88');
  p.set(6, 5, '#ff9a88');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo verde-água (brejo). */
function tealSwampShroom(seed = 2091) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#dce8e4');
  p.sphere(5, 5, 3.2, '#4aa898', '#6ac8b8');
  p.set(4, 4, '#e8f8f6');
  return finish(p, { outline: 0.35 });
}

/** Arbusto florido de duna. */
function floweredDuneBush(seed = 2097) {
  const p = new Painter(18, 12, { transparent: true });
  p.sphere(9, 7, 6, shade(['#b09a5a', '#c8b478'], 0.5), '#9a8a4a');
  p.set(7, 5, '#d8c898');
  p.set(11, 8, '#f0a0c0');
  p.set(9, 4, '#ffd8e8');
  return finish(p, { outline: 0.35 });
}

/** Flor da praia verde. */
function greenBeachFlower(seed = 2047) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a8a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#7ac86a');
  p.set(5, 5, '#f0ffe8');
  return finish(p, { outline: 0.3 });
}

/** Pedra de duna lilás. */
function lilacDuneStone(seed = 2051) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b0a0c8', '#ccc0e0');
  p.set(5, 3, '#ece4f8');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde-água claro (neve). */
function paleTealIce(seed = 2057) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c0e0d8', '#e0f4ee');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo lilás (floresta). */
function lilacShroom(seed = 2061) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e8e0f0');
  p.sphere(5, 5, 3.2, '#a878c8', '#c898e0');
  p.set(4, 4, '#f8f0ff');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza verde. */
function greenAshFlower(seed = 2067) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#8ad86a');
  p.set(5, 5, '#f0ffe8');
  return finish(p, { outline: 0.3 });
}

/** Flor da duna turquesa. */
function turquoiseDuneFlower(seed = 2017) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40d0c8');
  p.set(5, 5, '#f0fffc');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia lilás-escura. */
function darkLilacBeachStone(seed = 2021) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8a78a8', '#a898c8');
  p.set(5, 3, '#d0c4e8');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor lilás (neve). */
function lilacFloweredSnow(seed = 2027) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#c090e8');
  p.set(6, 5, '#c090e8');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo turquesa (brejo). */
function turquoiseShroom(seed = 2031) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#d8e8e4');
  p.sphere(5, 5, 3.2, '#3aa89c', '#5cc8bc');
  p.set(4, 4, '#e8f8f6');
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta lilás. */
function lilacForestFlower(seed = 2037) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c090e8');
  p.set(5, 5, '#f8f0ff');
  return finish(p, { outline: 0.3 });
}

/** Flor do brejo lilás. */
function lilacSwampFlower(seed = 1987) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c090e8');
  p.set(5, 5, '#f8f0ff');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia turquesa. */
function turquoiseBeachPebble(seed = 1991) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#7ab8b0', '#9ad8d0');
  p.set(4, 3, '#d0ece8');
  return finish(p, { outline: 0.35 });
}

/** Gelo lilás-escuro (neve). */
function darkLilacIce(seed = 1997) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#9078b8', '#b8a0d8');
  p.set(5, 3, '#e8dcf8');
  return finish(p, { outline: 0.35 });
}

/** Tronco de cinza (madeira morta clara). */
function paleAshLog(seed = 2001) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#8a8288', '#a89ea4'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#6a6268'); p.set(23, 7, '#6a6268');
  return finish(p, { outline: 0.35 });
}

/** Flor de selva turquesa. */
function turquoiseJungleFlower(seed = 2007) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40d0c8');
  p.set(5, 5, '#f0fffc');
  return finish(p, { outline: 0.3 });
}

/** Flor da praia lilás. */
function lilacBeachFlower(seed = 1957) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a8a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c090e8');
  p.set(5, 5, '#f8f0ff');
  return finish(p, { outline: 0.3 });
}

/** Pedra de duna turquesa. */
function turquoiseDuneStone(seed = 1961) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#7ab0a8', '#9ac8c0');
  p.set(5, 3, '#c8e8e4');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor turquesa (neve). */
function turquoiseFloweredSnow(seed = 1967) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#50d8d0');
  p.set(6, 5, '#50d8d0');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo violeta (floresta). */
function violetShroom(seed = 1971) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#e0d8e8');
  p.sphere(5, 5, 3.2, '#8a50b0', '#a870c8');
  p.set(4, 4, '#f0e8f8');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza coral. */
function coralAshFlower(seed = 1977) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff8a70');
  p.set(5, 5, '#fff0e8');
  return finish(p, { outline: 0.3 });
}

/** Flor do brejo turquesa. */
function turquoiseSwampFlower(seed = 1927) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40d0c8');
  p.set(5, 5, '#f0fffc');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de duna coral. */
function coralDunePebble(seed = 1931) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#d8a078', '#f0c098');
  p.set(4, 3, '#ffe0d0');
  return finish(p, { outline: 0.35 });
}

/** Gelo turquesa (neve). */
function turquoiseIce(seed = 1937) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b0e0dc', '#d8f4f0');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de floresta podre. */
function rottenForestLog(seed = 1941) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#4e4230', '#6a5a44'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(8, 5, '#3a3020');
  p.set(16, 6, '#8a9a58');
  return finish(p, { outline: 0.35 });
}

/** Flor de selva dourada. */
function goldJungleFlower(seed = 1947) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f4d040');
  p.set(5, 5, '#8a5a18');
  return finish(p, { outline: 0.3 });
}

/** Flor da floresta turquesa. */
function turquoiseForestFlower(seed = 1897) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40d0c8');
  p.set(5, 5, '#f0fffc');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia coral. */
function coralBeachPebble(seed = 1901) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e08070', '#f4a898');
  p.set(4, 3, '#ffd0c8');
  return finish(p, { outline: 0.35 });
}

/** Gelo coral (neve quente). */
function coralIce(seed = 1907) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#f0c0b0', '#f8ddd4');
  p.set(5, 3, '#fff0ea');
  return finish(p, { outline: 0.35 });
}

/** Cascalho de praia verde. */
function greenBeachGravel(seed = 1911) {
  const p = new Painter(18, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#7a9a80', '#9ab8a0');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor de cinza verde-água. */
function tealAshFlower(seed = 1917) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40d0b8');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Flor do deserto coral. */
function coralDuneFlower(seed = 1867) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff7a60');
  p.set(5, 5, '#fff0d8');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia coral. */
function coralBeachStone(seed = 1871) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c07060', '#e09080');
  p.set(5, 3, '#f0b8a8');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor verde (neve). */
function greenFloweredSnow(seed = 1877) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#8ad86a');
  p.set(6, 5, '#8ad86a');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo coral (floresta). */
function coralShroom(seed = 1881) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#f0e8e0');
  p.sphere(5, 5, 3.2, '#e06850', '#f09070');
  p.set(4, 4, '#ffe8e0');
  return finish(p, { outline: 0.35 });
}

/** Arbusto de brejo com flor branca. */
function whiteFloweredSwampBush(seed = 1887) {
  const p = new Painter(18, 12, { transparent: true });
  p.sphere(9, 7, 6, shade(['#3a5230', '#4e6e42'], 0.5), '#2e4426');
  p.set(7, 5, '#6a8a58');
  p.set(11, 8, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Flor do brejo coral. */
function coralSwampFlower(seed = 1837) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff7a60');
  p.set(5, 5, '#fff0d8');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde-água. */
function tealBeachStone(seed = 1841) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#6a9a90', '#8ab8b0');
  p.set(5, 3, '#b8d8d0');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor amarela (neve). */
function yellowFloweredSnow(seed = 1847) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#f4d040');
  p.set(6, 5, '#f4d040');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Tronco de duna (madeira clara seca). */
function paleDuneLog(seed = 1851) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#c0a878', '#d8c898'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#a08a58'); p.set(23, 7, '#a08a58');
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta pink. */
function hotPinkFlower(seed = 1857) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff4898');
  p.set(5, 5, '#fff0f8');
  return finish(p, { outline: 0.3 });
}

/** Flor da selva coral. */
function coralJungleFlower(seed = 1807) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff7a60');
  p.set(5, 5, '#fff0d8');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia dourada. */
function goldBeachPebble(seed = 1811) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#d8b860', '#f0d890');
  p.set(4, 3, '#fff4c0');
  return finish(p, { outline: 0.35 });
}

/** Gelo verde-água (neve). */
function tealIce(seed = 1817) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#a8d8cc', '#d0ece4');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Cascalho de duna lilás. */
function lilacDuneGravel(seed = 1821) {
  const p = new Painter(18, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#b0a0c8', '#ccc0e0');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor de cinza amarela. */
function yellowAshFlower(seed = 1827) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f4d040');
  p.set(5, 5, '#8a5a18');
  return finish(p, { outline: 0.3 });
}

/** Flor coral da praia (areia). */
function coralBeachFlower(seed = 1777) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a8a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff7a60');
  p.set(5, 5, '#fff0d8');
  return finish(p, { outline: 0.3 });
}

/** Pedra lavanda de duna. */
function lavenderDuneStone(seed = 1781) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#a898c0', '#c4b8dc');
  p.set(5, 3, '#e4dcf4');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor rosa (neve). */
function pinkFloweredSnow(seed = 1787) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#f090b8');
  p.set(6, 5, '#f090b8');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo azul-marinho (brejo). */
function navyShroom(seed = 1791) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#c0c8d8');
  p.sphere(5, 5, 3.2, '#2a4a7a', '#4a6a9a');
  p.set(4, 4, '#d8e8f8');
  return finish(p, { outline: 0.35 });
}

/** Arbusto florido de cinza. */
function floweredAshBush(seed = 1797) {
  const p = new Painter(18, 12, { transparent: true });
  p.sphere(9, 7, 6, shade(['#5a5258', '#6e666e'], 0.5), '#4a4248');
  p.set(7, 5, '#8a828a');
  p.set(11, 8, '#ffb060');
  p.set(9, 4, '#ffd8a0');
  return finish(p, { outline: 0.35 });
}

/** Flor do brejo roxa escura. */
function darkPurpleSwampFlower(seed = 1747) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#8a4ac0');
  p.set(5, 5, '#f0e0ff');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde escura. */
function darkGreenBeachStone(seed = 1751) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#4a6a50', '#628a68');
  p.set(5, 3, '#88aa90');
  return finish(p, { outline: 0.35 });
}

/** Neve com pedrinha escura. */
function darkPebbledSnow(seed = 1757) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.sphere(10, 5, 1.8, '#5a6068', '#7a828a');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo rosa (floresta). */
function pinkShroom(seed = 1761) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#f0e0e8');
  p.sphere(5, 5, 3.2, '#d86a90', '#f090b0');
  p.set(4, 4, '#ffe8f0');
  return finish(p, { outline: 0.35 });
}

/** Arbusto de duna seco. */
function dryDuneBush(seed = 1767) {
  const p = new Painter(16, 10, { transparent: true });
  const c = ['#b09a5a', '#c8b478'];
  for (const [bx, h] of [[4, 8], [8, 6], [12, 7]]) {
    for (let y = 9; y > 9 - h; y -= 2) p.rect(bx, y, 1, 2, shade([c[0], c[1]], 0.5));
  }
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta verde-água. */
function tealForestFlower(seed = 1717) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40d0b8');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de duna cinza. */
function grayDunePebble(seed = 1721) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#9a9088', '#b8b0a8');
  p.set(4, 3, '#d8d0c8');
  return finish(p, { outline: 0.35 });
}

/** Gelo lilás (neve). */
function lilacIce(seed = 1727) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c8b0e0', '#e4d8f4');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de praia escuro. */
function darkBeachLog(seed = 1731) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#6e5a40', '#8a745a'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#4a3a28'); p.set(23, 7, '#4a3a28');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza rosa. */
function pinkAshFlower(seed = 1737) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f090b8');
  p.set(5, 5, '#fff0d0');
  return finish(p, { outline: 0.3 });
}

/** Flor do deserto rosa-escuro. */
function magentaDuneFlower(seed = 1687) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d84a90');
  p.set(5, 5, '#fff0a0');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia azul. */
function blueBeachPebble(seed = 1691) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#6a8ab0', '#8ab0d8');
  p.set(4, 3, '#bcd8f0');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor azul (neve). */
function blueFloweredSnow(seed = 1697) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 3, '#a8d0f0');
  p.set(6, 5, '#a8d0f0');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cogumelo verde (brejo). */
function greenShroom(seed = 1701) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#d8e0d0');
  p.sphere(5, 5, 3.2, '#4a8a3a', '#6aa858');
  p.set(4, 4, '#e8f8e0');
  return finish(p, { outline: 0.35 });
}

/** Pedra de selva musgosa. */
function mossyJungleStone(seed = 1707) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#3a4a2c', '#4e6238');
  p.sphere(9, 7, 2, '#3f6e2c', '#57a050');
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta azul. */
function blueForestFlower(seed = 1657) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#60a8f0');
  p.set(5, 5, '#eaf4ff');
  return finish(p, { outline: 0.3 });
}

/** Cascalho de neve. */
function snowGravel(seed = 1661) {
  const p = new Painter(18, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#b8c8d8', '#dceaf6');
  }
  return finish(p, { outline: 0.3 });
}

/** Concha grande (praia). */
function bigShell(seed = 1667) {
  const p = new Painter(14, 10, { transparent: true });
  p.sphere(7, 6, 5, '#e8d8c0', '#f8efe0');
  for (let i = 0; i < 4; i += 1) p.rect(4 + i, 3, 1, 4, '#d0b89a');
  p.set(7, 7, '#c8a880');
  return finish(p, { outline: 0.35 });
}

/** Arbusto seco de cinza. */
function dryAshBush(seed = 1671) {
  const p = new Painter(16, 10, { transparent: true });
  const c = ['#6e666e', '#8a828a'];
  for (const [bx, h] of [[4, 8], [8, 6], [12, 7]]) {
    for (let y = 9; y > 9 - h; y -= 2) p.rect(bx, y, 1, 2, shade([c[0], c[1]], 0.5));
  }
  return finish(p, { outline: 0.35 });
}

/** Pedrinha de selva escura. */
function darkJunglePebble(seed = 1677) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#2e4020', '#42582e');
  p.set(4, 3, '#5a7440');
  return finish(p, { outline: 0.35 });
}

/** Flor do brejo dourada. */
function goldSwampFlower(seed = 1597) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f0c840');
  p.set(5, 5, '#8a5a18');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia lilás. */
function lilacBeachStone(seed = 1601) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#9a8ab0', '#b8aad0');
  p.set(5, 3, '#d8d0e8');
  return finish(p, { outline: 0.35 });
}

/** Gelo rosa (neve). */
function pinkIce(seed = 1607) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#e8c8d8', '#f8e4ec');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Galho de floresta (seco). */
function forestBranch(seed = 1611) {
  const p = new Painter(18, 10, { transparent: true });
  const wood = ['#5a4630', '#6e5a3e'];
  p.rect(2, 5, 12, 2, shade([wood[0], wood[1]], 0.5));
  p.rect(12, 3, 4, 2, wood[1]);
  p.set(5, 4, '#3a2c1e');
  return finish(p, { outline: 0.35 });
}

/** Flor de duna branca. */
function whiteDuneFlower(seed = 1617) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffffff');
  p.set(5, 5, '#f0c040');
  return finish(p, { outline: 0.3 });
}

/** Flor da selva rosa. */
function pinkJungleFlower(seed = 1567) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff88b8');
  p.set(5, 5, '#fff0f8');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de duna dourada. */
function goldDunePebble(seed = 1571) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e0c060', '#f8e090');
  p.set(4, 3, '#fff8c8');
  return finish(p, { outline: 0.35 });
}

/** Neve com pedrinha. */
function pebbledSnow(seed = 1577) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.sphere(6, 5, 1.8, '#8a9098', '#a8b0b8');
  return finish(p, { outline: 0.3 });
}

/** Cascalho de praia colorido. */
function colorfulBeachGravel(seed = 1581) {
  const p = new Painter(18, 8, { transparent: true });
  const cols = ['#c08a90', '#8aa890', '#c0a878', '#7a8a9a', '#a89ac0'];
  const spots = [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6]];
  spots.forEach(([gx, gy], i) => p.sphere(gx, gy, 1.6, cols[i % cols.length], '#ffffff'));
  return finish(p, { outline: 0.3 });
}

/** Flor de cinza laranja. */
function orangeAshFlower(seed = 1587) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffa050');
  p.set(5, 5, '#fff0d0');
  return finish(p, { outline: 0.3 });
}

/** Arbusto de praia com flor rosa. */
function pinkSeaBush(seed = 1537) {
  const p = new Painter(16, 12, { transparent: true });
  const c = ['#5a8a6a', '#7aa888'];
  for (const [bx, h] of [[4, 9], [9, 7], [13, 8]]) {
    for (let y = 11; y > 11 - h; y -= 2) p.rect(bx, y, 1, 2, shade([c[0], c[1]], 0.5));
  }
  p.set(9, 3, '#ff90b8');
  return finish(p, { outline: 0.35 });
}

/** Pedra de neve cinza. */
function graySnowRock(seed = 1541) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8a9098', '#a8b0b8');
  p.set(5, 3, '#c8d0d8');
  return finish(p, { outline: 0.35 });
}

/** Tronco de praia (madeira clara longa). */
function longBeachLog(seed = 1547) {
  const p = new Painter(30, 9, { transparent: true });
  const wood = ['#b8a888', '#d0c4a8'];
  p.rect(2, 3, 26, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 3, '#9a8a6c'); p.set(27, 6, '#9a8a6c');
  return finish(p, { outline: 0.35 });
}

/** Flor do brejo verde-água. */
function tealSwampFlower(seed = 1551) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#40c8b0');
  p.set(5, 5, '#f0fffa');
  return finish(p, { outline: 0.3 });
}

/** Pedregulho de cinza avermelhado. */
function redAshRock(seed = 1557) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#6e5050', '#8a6868');
  p.set(6, 4, '#a88888');
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta laranja clara. */
function peachForestFlower(seed = 1507) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffc090');
  p.set(5, 5, '#a04818');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de praia branca. */
function whiteBeachPebble(seed = 1511) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e8e4dc', '#ffffff');
  p.set(4, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Gelo azul claro plano (neve). */
function paleBlueIce(seed = 1517) {
  const p = new Painter(16, 8, { transparent: true });
  p.sphere(8, 5, 5, '#cfe4f8', '#eef6ff');
  p.set(6, 3, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Cascalho de floresta. */
function forestGravel(seed = 1521) {
  const p = new Painter(18, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#6e7a6e', '#8a968a');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor do deserto vermelha. */
function redDuneFlower(seed = 1527) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#e84838');
  p.set(5, 5, '#ffe8a0');
  return finish(p, { outline: 0.3 });
}

/** Flor laranja do brejo. */
function orangeSwampFlower(seed = 1477) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff9040');
  p.set(5, 5, '#fff0c0');
  return finish(p, { outline: 0.3 });
}

/** Pedra escura de duna. */
function darkDuneStone(seed = 1481) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8a744a', '#a8905e');
  p.set(5, 3, '#c8b088');
  return finish(p, { outline: 0.35 });
}

/** Neve com flor branca. */
function floweredSnow(seed = 1487) {
  const p = new Painter(16, 9, { transparent: true });
  p.sphere(8, 6, 5.5, '#dceaf6', '#f4faff');
  p.set(8, 4, '#ffffff');
  p.set(6, 3, '#f8f0ff');
  p.set(10, 5, '#f8f0ff');
  return finish(p, { outline: 0.3 });
}

/** Casca de cinza (madeira queimada). */
function ashBark(seed = 1491) {
  const p = new Painter(14, 8, { transparent: true });
  p.rect(2, 3, 10, 3, '#3a3238');
  p.set(3, 2, '#544a50');
  p.set(8, 4, '#241f22');
  return finish(p, { outline: 0.35 });
}

/** Pedra rosa de praia. */
function roseBeachStone(seed = 1497) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c08a90', '#d8a8b0');
  p.set(5, 3, '#f0c8d0');
  return finish(p, { outline: 0.35 });
}

/** Pedrinha rosa de duna. */
function pinkDunePebble(seed = 1447) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#e0b0a0', '#f4d0c0');
  p.set(4, 3, '#ffe8dc');
  return finish(p, { outline: 0.35 });
}

/** Flor do brejo azul. */
function blueSwampFlower(seed = 1451) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#60a8e8');
  p.set(5, 5, '#f0f8ff');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia verde-clara. */
function paleGreenStone(seed = 1457) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8aa890', '#aac4b0');
  p.set(5, 3, '#cfe4d8');
  return finish(p, { outline: 0.35 });
}

/** Tronco de cinza (madeira morta). */
function ashLog(seed = 1461) {
  const p = new Painter(24, 9, { transparent: true });
  const wood = ['#4a4248', '#5e565c'];
  p.rect(2, 3, 20, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 3, '#332e32');
  p.set(10, 4, '#6e666c');
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta roxa clara. */
function lightPurpleFlower(seed = 1467) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c8a0f0');
  p.set(5, 5, '#fff8e0');
  return finish(p, { outline: 0.3 });
}

/** Flor da selva amarela. */
function yellowJungleFlower(seed = 1417) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffd840');
  p.set(5, 5, '#a04818');
  return finish(p, { outline: 0.3 });
}

/** Pedra de rio clara (brejo). */
function lightRiverStone(seed = 1421) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#8a95a0', '#a8b4be');
  p.set(5, 3, '#c8d4dc');
  return finish(p, { outline: 0.35 });
}

/** Gelo azul profundo (neve). */
function deepBlueIce(seed = 1427) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#4a7ab8', '#6a9ad8');
  p.set(5, 3, '#9ac0ec');
  return finish(p, { outline: 0.35 });
}

/** Casca clara de praia. */
function lightBeachBark(seed = 1431) {
  const p = new Painter(16, 7, { transparent: true });
  p.rect(2, 3, 12, 2, '#d8ccb0');
  p.set(3, 2, '#f0e8d4');
  return finish(p, { outline: 0.35 });
}

/** Flor de cinza branca (cinzas). */
function whiteAshFlower(seed = 1437) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#5a5450');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f0ece8');
  p.set(5, 5, '#c8a040');
  return finish(p, { outline: 0.3 });
}

/** Flor do gelo verde-água. */
function mintIceFlower(seed = 1387) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#7aa8a0');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#8ae8c8');
  p.set(5, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia amarelada. */
function yellowBeachStone(seed = 1391) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#c0a878', '#d8c898');
  p.set(5, 3, '#f0e0b0');
  return finish(p, { outline: 0.35 });
}

/** Tronco musgoso (floresta). */
function mossyLog(seed = 1397) {
  const p = new Painter(24, 9, { transparent: true });
  const wood = ['#5a4630', '#6e5a3e'];
  p.rect(2, 3, 20, 4, shade([wood[0], wood[1]], 0.5));
  p.sphere(8, 4, 2.4, '#3f6e2c', '#57a050');
  p.set(2, 3, '#3a2c1e');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo azul claro (brejo). */
function lightBlueShroom(seed = 1401) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#c8d8e0');
  p.sphere(5, 5, 3.2, '#5a8ac0', '#7aa8e0');
  p.set(4, 4, '#e8f4ff');
  return finish(p, { outline: 0.35 });
}

/** Pedregulho de duna arredondado. */
function roundDuneRock(seed = 1407) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#c8a878', '#e0c898');
  p.set(6, 4, '#f4e4b8');
  return finish(p, { outline: 0.35 });
}

/** Cascalho de cinza claro (cinzas). */
function lightAshGravel(seed = 1357) {
  const p = new Painter(16, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [13, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#8a848a', '#a8a2a8');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor branca do brejo. */
function whiteSwampFlower(seed = 1361) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffffff');
  p.set(5, 5, '#f4d040');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha de duna clara. */
function lightDunePebble(seed = 1367) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#d0b878', '#e8d09a');
  p.set(4, 3, '#fff0c0');
  return finish(p, { outline: 0.35 });
}

/** Arbusto seco de praia. */
function drySeaBush(seed = 1371) {
  const p = new Painter(16, 10, { transparent: true });
  const c = ['#a8955a', '#c0ae72'];
  for (const [bx, h] of [[4, 8], [8, 6], [12, 7]]) {
    for (let y = 9; y > 9 - h; y -= 2) p.rect(bx, y, 1, 2, shade([c[0], c[1]], 0.5));
  }
  return finish(p, { outline: 0.35 });
}

/** Flor da floresta branca-rosada. */
function blushForestFlower(seed = 1377) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f8c8d8');
  p.set(5, 5, '#ffe8a0');
  return finish(p, { outline: 0.3 });
}

/** Flor do deserto lilás (deserto). */
function lilacDuneFlower(seed = 1327) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c090e8');
  p.set(5, 5, '#fff8d0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de praia esverdeada. */
function greenBeachStone(seed = 1331) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#6a8a70', '#8aa890');
  p.set(5, 3, '#b0d0b8');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo cinza (brejo). */
function grayShroom(seed = 1337) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#b8b0a8');
  p.sphere(5, 5, 3.2, '#7a7468', '#9a9488');
  p.set(4, 4, '#d8d0c8');
  return finish(p, { outline: 0.35 });
}

/** Neve soprada (pequena onda de neve). */
function windSnow(seed = 1341) {
  const p = new Painter(20, 7, { transparent: true });
  p.sphere(10, 4, 5, '#dceaf6', '#f4faff');
  p.set(8, 2, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Flor da selva laranja. */
function orangeJungleFlower(seed = 1347) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#2e5a24');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffa040');
  p.set(5, 5, '#fff0b0');
  return finish(p, { outline: 0.3 });
}

/** Flor do brejo rosa (brejo). */
function pinkSwampFlower(seed = 1297) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f080a8');
  p.set(5, 5, '#fff0c0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de rio escura (brejo). */
function darkRiverStone(seed = 1301) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#3a4046', '#4e565e');
  p.set(5, 3, '#6a747e');
  return finish(p, { outline: 0.35 });
}

/** Gelo rachado (neve). */
function crackedIce(seed = 1307) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 6, '#b8d8f0', '#dceefc');
  p.set(6, 4, '#ffffff');
  p.rect(8, 2, 1, 6, '#7aa8cc');
  p.rect(5, 6, 5, 1, '#7aa8cc');
  return finish(p, { outline: 0.3 });
}

/** Casca escura (floresta). */
function darkBark(seed = 1311) {
  const p = new Painter(14, 8, { transparent: true });
  p.rect(2, 3, 10, 3, '#4a3a26');
  p.set(3, 2, '#6e5836');
  p.set(8, 4, '#33261​4');
  return finish(p, { outline: 0.35 });
}

/** Pedra de praia cinza-azulada. */
function blueGrayStone(seed = 1317) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#6a7480', '#8a95a0');
  p.set(5, 3, '#a8b2bc');
  return finish(p, { outline: 0.35 });
}

/** Flor de areia rosa (deserto). */
function pinkDuneFlower(seed = 1267) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#9a8a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f090b8');
  p.set(5, 5, '#ffe8a0');
  return finish(p, { outline: 0.3 });
}

/** Graveto de brejo. */
function swampGravel(seed = 1273) {
  const p = new Painter(16, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [13, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#5e6a50', '#7a8a68');
  }
  return finish(p, { outline: 0.3 });
}

/** Tronco de gelo (neve). */
function iceLog(seed = 1279) {
  const p = new Painter(26, 10, { transparent: true });
  const ice = ['#a8c8e8', '#d0e4f4'];
  p.rect(2, 4, 22, 4, shade([ice[0], ice[1]], 0.5));
  p.set(2, 4, '#7a9cc0'); p.set(23, 7, '#7a9cc0');
  p.set(10, 5, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Arbusto de praia (grama marinha). */
function seaGrass(seed = 1283) {
  const p = new Painter(16, 12, { transparent: true });
  const g = ['#4a8a6a', '#6aa888'];
  for (const [bx, h] of [[3, 10], [7, 8], [11, 9], [14, 7]]) {
    for (let y = 11; y > 11 - h; y -= 2) p.rect(bx, y, 1, 2, shade([g[0], g[1]], 0.5));
  }
  return finish(p, { outline: 0.3 });
}

/** Pedra vulcânica pequena (cinzas). */
function smallLavaRock(seed = 1289) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#241c20', '#38303a');
  p.set(4, 3, '#4e464e');
  return finish(p, { outline: 0.35 });
}

/** Flor de gelo lilás (neve). */
function lilacIceFlower(seed = 1237) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8aa8a0');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#d0a8f0');
  p.set(5, 5, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha rosa (praia). */
function pinkPebble(seed = 1243) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#d8a8b0', '#f0c8d0');
  p.set(4, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Galho seco (deserto). */
function dryBranch(seed = 1249) {
  const p = new Painter(18, 10, { transparent: true });
  const wood = ['#8a7048', '#a88c60'];
  p.rect(2, 5, 12, 2, shade([wood[0], wood[1]], 0.5));
  p.rect(12, 3, 4, 2, wood[1]);
  p.set(5, 4, '#6e5836');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo bege (floresta). */
function tanShroom(seed = 1255) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#d8c8b0');
  p.sphere(5, 5, 3.2, '#a8895a', '#c8a878');
  p.set(4, 4, '#efe0c8');
  return finish(p, { outline: 0.35 });
}

/** Pedregulho de cinza claro (cinzas). */
function paleAshRock(seed = 1259) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#6e686e', '#8a848a');
  p.set(6, 4, '#a8a2a8');
  return finish(p, { outline: 0.35 });
}

/** Cristal de cinza (roxo fumê). */
function ashCrystal(seed = 1201) {
  const p = new Painter(10, 14, { transparent: true });
  const c = ['#5a4a7a', '#7a68a0'];
  for (let y = 12; y >= 2; y -= 2) {
    const w = 1 + (12 - y) * 0.4;
    p.rect(5 - w / 2, y, w, 2, shade([c[0], c[1]], 0.5));
  }
  p.set(5, 2, '#b8a8e0');
  return finish(p, { outline: 0.35 });
}

/** Flor amarela do brejo. */
function yellowSwampFlower(seed = 1209) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f4d040');
  p.set(5, 5, '#a06818');
  return finish(p, { outline: 0.3 });
}

/** Pedra coberta de neve. */
function snowCoveredRock(seed = 1211) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#7a8a98', '#9aa8b4');
  p.sphere(8, 4, 4, '#e8f2fc', '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Cascalho de duna. */
function duneGravel(seed = 1217) {
  const p = new Painter(18, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6]]) {
    p.sphere(gx, gy, 1.6, '#c8a878', '#e0c898');
  }
  return finish(p, { outline: 0.3 });
}

/** Pedra molhada (praia). */
function wetStone(seed = 1223) {
  const p = new Painter(14, 8, { transparent: true });
  p.sphere(7, 5, 4.5, '#4e5a64', '#6a7880');
  p.set(5, 3, '#8aa0ac');
  return finish(p, { outline: 0.35 });
}

/** Cinza quente (brasa viva no chão). */
function hotAsh(seed = 1171) {
  const p = new Painter(12, 8, { transparent: true });
  p.sphere(6, 5, 4, '#2a2026', '#3e3038');
  p.set(5, 4, '#ff8030');
  p.set(7, 6, '#ffb050');
  return finish(p, { outline: 0.3 });
}

/** Pedra de gelo clara (neve). */
function clearIceRock(seed = 1177) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b8d8f0', '#dceefc');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco de naufrágio (praia). */
function wreckLog(seed = 1181) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#6e5a40', '#8a745a'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#4a3a28'); p.set(23, 7, '#4a3a28');
  p.set(10, 5, '#9a8468');
  return finish(p, { outline: 0.35 });
}

/** Arbusto denso de selva. */
function jungleBush(seed = 1187) {
  const p = new Painter(20, 14, { transparent: true });
  p.sphere(10, 8, 7, shade(['#1e3a14', '#3f6e2c'], 0.5), '#2e5a24');
  p.set(7, 5, '#57a050');
  p.set(13, 10, '#1a2e10');
  return finish(p, { outline: 0.35 });
}

/** Pedra do deserto (ocre). */
function desertStone(seed = 1193) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#b89a5e', '#d0b878');
  p.set(5, 3, '#e8d09a');
  return finish(p, { outline: 0.35 });
}

/** Pedra avermelhada (cinzas). */
function redStone(seed = 1139) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#7a3a30', '#9a5040');
  p.set(5, 3, '#b87060');
  return finish(p, { outline: 0.35 });
}

/** Flor azul clara (neve). */
function blueSnowFlower(seed = 1147) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#7a9a8a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a8d8f8');
  p.set(5, 5, '#fff8d0');
  return finish(p, { outline: 0.3 });
}

/** Casca de praia (madeira clara). */
function paleBark(seed = 1151) {
  const p = new Painter(16, 7, { transparent: true });
  p.rect(2, 3, 12, 2, '#c8b89a');
  p.set(3, 2, '#e0d4bc');
  return finish(p, { outline: 0.35 });
}

/** Arbusto de duna com flor. */
function duneBloom(seed = 1157) {
  const p = new Painter(16, 12, { transparent: true });
  const c = ['#a08a4a', '#c0a868'];
  for (const [bx, h] of [[4, 9], [9, 7], [13, 8]]) {
    for (let y = 11; y > 11 - h; y -= 2) p.rect(bx, y, 1, 2, shade([c[0], c[1]], 0.5));
  }
  p.set(9, 3, '#f8e890');
  p.set(4, 1, '#ff88c0');
  return finish(p, { outline: 0.35 });
}

/** Pedrinha verde do brejo. */
function swampPebble(seed = 1163) {
  const p = new Painter(10, 7, { transparent: true });
  p.sphere(5, 4, 3.4, '#5e7050', '#7a8a68');
  p.set(4, 3, '#9ab088');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo roxo (selva). */
function purpleShroom(seed = 1109) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#d8c8e8');
  p.sphere(5, 5, 3.4, '#6a3a9a', '#8a5ac0');
  p.set(4, 4, '#f0e8ff');
  return finish(p, { outline: 0.35 });
}

/** Flor branca do deserto. */
function whiteDesertFlower(seed = 1117) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a9a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ffffff');
  p.set(5, 5, '#f0c040');
  return finish(p, { outline: 0.3 });
}

/** Cascalho de praia. */
function beachGravel(seed = 1121) {
  const p = new Painter(18, 8, { transparent: true });
  for (const [gx, gy] of [[3, 4], [7, 3], [11, 5], [14, 3], [5, 6], [12, 6]]) {
    p.sphere(gx, gy, 1.6, '#a89a88', '#c0b4a4');
  }
  return finish(p, { outline: 0.3 });
}

/** Neve empilhada pequena. */
function snowPile(seed = 1123) {
  const p = new Painter(14, 8, { transparent: true });
  p.sphere(7, 5, 4.5, '#cfe0f0', '#eef6fc');
  p.set(6, 3, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Raiz de brejo emergindo. */
function swampRoot(seed = 1129) {
  const p = new Painter(14, 10, { transparent: true });
  const bark = ['#3a2c18', '#4a3a22'];
  p.rect(6, 2, 3, 6, shade([bark[0], bark[1]], 0.5));
  p.rect(3, 6, 3, 2, bark[1]);
  p.rect(9, 5, 3, 2, bark[0]);
  return finish(p, { outline: 0.35 });
}

/** Graveto na praia. */
function driftwood(seed = 1071) {
  const p = new Painter(18, 6, { transparent: true });
  const wood = ['#a89a80', '#c0b49a'];
  p.rect(2, 2, 14, 3, shade([wood[0], wood[1]], 0.5));
  p.set(2, 2, '#8a7c64');
  return finish(p, { outline: 0.35 });
}

/** Flor do pântano lilás. */
function lilacFlower(seed = 1079) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a6a34');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#c090e8');
  p.set(5, 5, '#f8f0ff');
  return finish(p, { outline: 0.3 });
}

/** Pedregulho cinza na floresta. */
function forestBoulder(seed = 1081) {
  const p = new Painter(18, 12, { transparent: true });
  p.sphere(9, 7, 6.5, '#707a70', '#909a90');
  p.set(6, 4, '#a8b2a8');
  return finish(p, { outline: 0.35 });
}

/** Estalagmite de cinza. */
function ashSpike(seed = 1087) {
  const p = new Painter(10, 18, { transparent: true });
  const ob = ['#3a3438', '#4e464e'];
  for (let y = 16; y >= 2; y -= 2) {
    const w = 1 + (16 - y) * 0.4;
    p.rect(5 - w / 2, y, w, 2, shade([ob[0], ob[1]], 0.5));
  }
  p.set(5, 2, '#6a626e');
  return finish(p, { outline: 0.35 });
}

/** Toquinha de neve (buraco na neve). */
function snowHollow(seed = 1091) {
  const p = new Painter(16, 8, { transparent: true });
  p.sphere(8, 5, 6, '#b8cfe4', '#d8e8f4');
  p.sphere(8, 5, 3.5, '#8aa8c4', '#a8c4dc');
  return finish(p, { outline: 0.3 });
}

/** Pedra esverdeada (brejo). */
function greenStone(seed = 1041) {
  const p = new Painter(14, 9, { transparent: true });
  p.sphere(7, 5, 5, '#5e7050', '#7a8a68');
  p.set(5, 3, '#9ab088');
  p.sphere(10, 7, 2, '#3f6e2c', '#57a050');
  return finish(p, { outline: 0.35 });
}

/** Flor laranja pequena (cinzas). */
function orangeFlower(seed = 1049) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#6a5a3a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff9030');
  p.set(5, 5, '#ffe080');
  return finish(p, { outline: 0.3 });
}

/** Raiz retorcida de duna. */
function duneRoot(seed = 1051) {
  const p = new Painter(18, 8, { transparent: true });
  const bark = ['#8a6c3a', '#a8895a', '#6e5628'];
  p.rect(2, 5, 6, 2, shade([bark[0], bark[1]], 0.5));
  p.rect(8, 3, 5, 2, bark[1]);
  p.rect(13, 5, 3, 2, bark[2]);
  return finish(p, { outline: 0.35 });
}

/** Gelo esculpido (bloco decorativo). */
function carvedIce(seed = 1057) {
  const p = new Painter(14, 14, { transparent: true });
  const ice = ['#cfe8ff', '#a8d0f0', '#e8f4ff'];
  p.rect(2, 2, 10, 10, shade([ice[0], ice[2]], 0.5));
  p.rect(4, 4, 6, 6, ice[1]);
  p.set(6, 6, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Tronco caído seco (deserto). */
function dryLog(seed = 1061) {
  const p = new Painter(24, 9, { transparent: true });
  const wood = ['#9a8258', '#b89a6c'];
  p.rect(2, 3, 20, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 3, '#7a6240'); p.set(21, 6, '#7a6240');
  p.set(8, 4, '#c8b088');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo vermelho grande (floresta). */
function redCap(seed = 1009) {
  const p = new Painter(14, 12, { transparent: true });
  p.rect(6, 7, 2, 4, '#e8dcc8');
  p.sphere(7, 6, 5, '#a82818', '#d84030');
  p.set(4, 4, '#f8e8e0'); p.set(9, 3, '#f8e8e0'); p.set(7, 2, '#f8e8e0');
  return finish(p, { outline: 0.35 });
}

/** Pedra gravada (deserto). */
function carvedPebble(seed = 1013) {
  const p = new Painter(12, 8, { transparent: true });
  p.sphere(6, 5, 4, '#b09468', '#c8ac7c');
  p.rect(4, 4, 4, 1, '#7a5c34');
  p.set(5, 6, '#8a6c42');
  return finish(p, { outline: 0.35 });
}

/** Galho flutuando na água parada (lodo). */
function floatingBranch(seed = 1019) {
  const p = new Painter(20, 8, { transparent: true });
  const wood = ['#5a4326', '#6e543a'];
  p.rect(3, 4, 14, 2, shade([wood[0], wood[1]], 0.5));
  p.rect(15, 3, 3, 2, wood[1]);
  p.set(6, 3, '#4a3820');
  return finish(p, { outline: 0.3 });
}

/** Galho coberto de neve (neve). */
function snowBranch(seed = 1021) {
  const p = new Painter(22, 12, { transparent: true });
  const wood = ['#4a3a22', '#5e4c2e'];
  p.rect(2, 6, 16, 3, shade([wood[0], wood[1]], 0.5));
  p.rect(16, 4, 4, 2, wood[1]);
  p.rect(2, 5, 16, 1, '#e8f2fc');
  p.rect(16, 3, 4, 1, '#f4faff');
  return finish(p, { outline: 0.35 });
}

/** Concha rosa (praia). */
function pinkShell(seed = 1031) {
  const p = new Painter(10, 10, { transparent: true });
  p.sphere(5, 5, 3.6, '#d88aa8', '#f0b8cc');
  p.set(5, 5, '#f8dce8');
  p.set(3, 4, '#c87898');
  return finish(p, { outline: 0.35 });
}

/** Pedra de granito (cinzas). */
function granite(seed = 961) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#6a6e78', '#8a8e98');
  p.set(5, 4, '#a8acb6');
  p.set(10, 7, '#4a4e58');
  return finish(p, { outline: 0.35 });
}

/** Flor branca do deserto. */
function desertBloom(seed = 967) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#8a9a5a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f8f4e8');
  p.set(5, 5, '#e8c840');
  return finish(p, { outline: 0.3 });
}

/** Tronco de selva caída. */
function jungleLog(seed = 971) {
  const p = new Painter(28, 10, { transparent: true });
  const wood = ['#4a3a22', '#5e4c2e'];
  p.rect(2, 4, 24, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#33261​4'); p.set(25, 7, '#332614');
  p.set(9, 5, '#6e5a3a'); p.set(18, 6, '#3a2c18');
  p.set(12, 3, '#3f7a2e');
  return finish(p, { outline: 0.35 });
}

/** Neve pisada (rastro raso na neve). */
function snowTrack(seed = 977) {
  const p = new Painter(16, 8, { transparent: true });
  p.sphere(5, 4, 2.4, '#b8cfe4', '#cfe0f0');
  p.sphere(11, 4, 2.4, '#b8cfe4', '#cfe0f0');
  return finish(p, { outline: 0.3 });
}

/** Pedra de maré molhada (praia). */
function tideRock(seed = 983) {
  const p = new Painter(14, 8, { transparent: true });
  p.sphere(7, 5, 4.5, '#5e6a70', '#7a8890');
  p.set(5, 3, '#9ab0b8');
  return finish(p, { outline: 0.35 });
}

/** Junco alto (brejo). */
function reed(seed = 907) {
  const p = new Painter(12, 20, { transparent: true });
  const g = ['#5a7a30', '#7a9a44'];
  for (const [bx, h] of [[3, 18], [6, 14], [9, 16]]) {
    for (let y = 19; y > 19 - h; y -= 2) p.rect(bx, y, 1, 2, shade([g[0], g[1]], 0.5));
  }
  p.sphere(6, 4, 1.8, '#6a4a20', '#8a6c3a');
  return finish(p, { outline: 0.3 });
}

/** Flor roxa (selva). */
function purpleFlower(seed = 911) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#3f6a2e');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#a060d8');
  p.set(5, 5, '#f0e0ff');
  return finish(p, { outline: 0.3 });
}

/** Lâmina de gelo azul fina (neve). */
function blueIce(seed = 919) {
  const p = new Painter(14, 8, { transparent: true });
  p.sphere(7, 5, 5, '#9cc8ee', '#d0e8fa');
  p.set(5, 3, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Segundo arbusto seco (duna). */
function dryBush2(seed = 929) {
  const p = new Painter(18, 10, { transparent: true });
  const c = ['#a08a4a', '#c0a868'];
  for (const [bx, h] of [[3, 8], [8, 6], [13, 7]]) {
    for (let y = 9; y > 9 - h; y -= 2) p.rect(bx, y, 1, 2, shade([c[0], c[1]], 0.5));
  }
  return finish(p, { outline: 0.35 });
}

/** Pedra clara de praia. */
function paleStone(seed = 937) {
  const p = new Painter(12, 8, { transparent: true });
  p.sphere(6, 5, 4, '#c8c4b8', '#e0dcd0');
  p.set(4, 3, '#f4f0e8');
  return finish(p, { outline: 0.35 });
}

/** Flor silvestre rosa (floresta). */
function pinkFlower(seed = 877) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#3f7a2e');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f078b0');
  p.set(5, 5, '#fff0a0');
  return finish(p, { outline: 0.3 });
}

/** Tronco podre pequeno (floresta). */
function rottenLog(seed = 881) {
  const p = new Painter(26, 10, { transparent: true });
  const wood = ['#5a4326', '#6e543a'];
  p.rect(2, 4, 22, 4, shade([wood[0], wood[1]], 0.5));
  p.set(2, 4, '#3a2c18'); p.set(23, 7, '#3a2c18');
  p.set(8, 5, '#8a7050'); p.set(16, 6, '#4a3a20');
  return finish(p, { outline: 0.35 });
}

/** Pedregulho na praia. */
function beachBoulder(seed = 883) {
  const p = new Painter(18, 12, { transparent: true });
  p.sphere(9, 7, 6.5, '#9a9284', '#b8b0a0');
  p.set(6, 4, '#c8c0b0');
  return finish(p, { outline: 0.35 });
}

/** Cacto alto (deserto). */
function tallCactus(seed = 887) {
  const p = new Painter(14, 24, { transparent: true });
  const green = ['#2e6a2e', '#3f8a3a'];
  p.rect(6, 2, 3, 20, shade([green[0], green[1]], 0.5));
  p.rect(2, 8, 4, 2, green[0]);
  p.rect(2, 8, 2, 5, green[1]);
  p.rect(9, 5, 3, 2, green[1]);
  p.set(7, 1, '#57a850');
  return finish(p, { outline: 0.35 });
}

/** Ondinha na água do mar (praia, rasa). */
function seaFoam(seed = 893) {
  const p = new Painter(22, 6, { transparent: true });
  p.rect(2, 2, 18, 2, '#cfeef8');
  p.set(6, 2, '#ffffff'); p.set(14, 3, '#e8f8ff');
  return finish(p, { outline: 0.3 });
}

/** Pedrinha com musgo (brejo). */
function mossPebble(seed = 839) {
  const p = new Painter(12, 8, { transparent: true });
  p.sphere(6, 5, 4, '#7a7a70', '#9a9a90');
  p.sphere(4, 4, 2, '#3f6e2c', '#57a050');
  return finish(p, { outline: 0.35 });
}

/** Florzinha branca (neve). */
function whiteFlower(seed = 841) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#7a9a6a');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f4f8ff');
  p.set(5, 5, '#e8d060');
  return finish(p, { outline: 0.3 });
}

/** Casca caída no chão da floresta. */
function barkScrap(seed = 853) {
  const p = new Painter(16, 8, { transparent: true });
  p.rect(2, 3, 12, 3, '#6a5030');
  p.rect(3, 2, 10, 1, '#8a6c42');
  p.set(5, 4, '#4a3820');
  return finish(p, { outline: 0.35 });
}

/** Concha espiral (praia). */
function spiralShell(seed = 857) {
  const p = new Painter(12, 12, { transparent: true });
  p.sphere(6, 6, 4.4, '#d8b898', '#f0d8c0');
  p.set(6, 6, '#a87858');
  p.set(5, 5, '#c89878');
  p.set(7, 7, '#b88868');
  return finish(p, { outline: 0.35 });
}

/** Pedra vulcânica arredondada (cinzas). */
function lavaRock(seed = 863) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#2a2026', '#3e3038');
  p.set(6, 4, '#4a3a44');
  p.set(10, 7, '#1a1418');
  return finish(p, { outline: 0.35 });
}

/** Cogumelo azul do brejo. */
function blueMushroom(seed = 797) {
  const p = new Painter(10, 10, { transparent: true });
  p.rect(4, 6, 2, 3, '#c8d8e0');
  p.sphere(5, 5, 3.4, '#3a5a9a', '#5a7ac0');
  p.set(4, 4, '#e8f4ff');
  p.set(6, 3, '#e8f4ff');
  return finish(p, { outline: 0.35 });
}

/** Flor de brasa (laranja vivo) nas cinzas. */
function emberFlower(seed = 809) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#4a5a3a');
  for (const [dx, dy] of [[-3, -1], [3, -1], [-2, 2], [2, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#ff7020');
  p.set(5, 5, '#ffd050');
  return finish(p, { outline: 0.3 });
}

/** Grama alta dourada (duna). */
function tallGrass(seed = 811) {
  const p = new Painter(16, 14, { transparent: true });
  const g = ['#a8a040', '#c8c860'];
  for (const [bx, h] of [[2, 12], [5, 10], [8, 13], [11, 9], [14, 11]]) {
    for (let y = 13; y > 13 - h; y -= 2) p.rect(bx, y, 1, 2, shade([g[0], g[1]], 0.5));
  }
  p.set(8, 1, '#e0e890');
  return finish(p, { outline: 0.3 });
}

/** Âncora quebrada na praia. */
function brokenAnchor(seed = 821) {
  const p = new Painter(16, 16, { transparent: true });
  const iron = ['#5a5e66', '#3a3e46'];
  p.rect(7, 2, 2, 10, shade([iron[0], iron[1]], 0.5));
  p.rect(3, 10, 10, 2, iron[0]);
  p.rect(2, 8, 2, 4, iron[1]);
  // um braço quebrado
  p.rect(12, 7, 2, 3, iron[1]);
  p.set(7, 1, '#8a9098');
  return finish(p, { outline: 0.35 });
}

/** Raiz de selva retorcida. */
function jungleRoot(seed = 827) {
  const p = new Painter(20, 10, { transparent: true });
  const bark = ['#4a3a20', '#5e4c30', '#3a2c18'];
  p.rect(2, 6, 7, 3, shade([bark[0], bark[1]], 0.5));
  p.rect(9, 4, 5, 3, bark[1]);
  p.rect(14, 6, 4, 2, bark[2]);
  p.set(11, 3, bark[0]);
  return finish(p, { outline: 0.35 });
}

/** Pedrinha cinza na duna. */
function smallRock(seed = 761) {
  const p = new Painter(12, 8, { transparent: true });
  p.sphere(6, 5, 4, '#8a8578', '#a8a498');
  p.set(4, 3, '#c0bcae');
  return finish(p, { outline: 0.35 });
}

/** Lírio aquático grande (lodo). */
function bigWaterLily(seed = 769) {
  const p = new Painter(22, 14, { transparent: true });
  p.sphere(11, 8, 8, '#3f7a3a', '#57a050');
  p.sphere(11, 7, 5, '#4f8a44', '#6ab060');
  p.set(8, 5, '#ff88d0');
  p.set(9, 4, '#ffb0e0');
  p.set(11, 6, '#f060b0');
  p.set(13, 5, '#ff88d0');
  return finish(p, { outline: 0.3 });
}

/** Espeto de gelo no chão (neve). */
function iceSpike(seed = 773) {
  const p = new Painter(8, 14, { transparent: true });
  const ice = ['#cfe8ff', '#a8d0f0', '#e8f4ff'];
  for (let y = 12; y >= 1; y -= 2) {
    const w = 1 + (12 - y) * 0.35;
    p.rect(4 - w / 2, y, w, 2, shade([ice[0], ice[2]], 0.5));
  }
  p.set(4, 1, '#ffffff');
  return finish(p, { outline: 0.35 });
}

/** Segunda ondulação de duna. */
function duneWave(seed = 779) {
  const p = new Painter(26, 10, { transparent: true });
  p.rect(2, 4, 22, 2, '#e0c898');
  p.rect(5, 6, 16, 2, '#d0b888');
  p.set(8, 4, '#f0e0b0');
  p.set(16, 6, '#c8a878');
  return finish(p, { outline: 0.3 });
}

/** Florzinha amarela (floresta). */
function yellowFlower(seed = 787) {
  const p = new Painter(10, 12, { transparent: true });
  p.rect(4, 6, 2, 5, '#3f7a2e');
  for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2], [0, -4]]) p.set(5 + dx, 5 + dy, '#f4c030');
  p.set(5, 5, '#a06018');
  return finish(p, { outline: 0.3 });
}

/** Estrela-do-mar na areia. */
function starfish(seed = 701) {
  const p = new Painter(14, 12, { transparent: true });
  const c = '#e8905a';
  p.rect(6, 5, 3, 3, c);
  p.rect(3, 4, 3, 2, c); p.rect(9, 4, 3, 2, c);
  p.rect(5, 1, 2, 3, c); p.rect(5, 8, 2, 3, c);
  p.set(7, 6, '#f4b888');
  return finish(p, { outline: 0.35 });
}

/** Liana pendurada (selva). */
function vine(seed = 709) {
  const p = new Painter(10, 22, { transparent: true });
  const leaf = ['#2e6024', '#3f8a3a'];
  for (let y = 0; y < 20; y += 2) {
    const x = 5 + Math.sin(y * 0.5 + seed) * 2;
    p.rect(x, y, 2, 2, shade([leaf[0], leaf[1]], 0.5));
  }
  p.rect(3, 8, 2, 2, leaf[1]);
  p.rect(6, 14, 2, 2, leaf[1]);
  return finish(p, { outline: 0.35 });
}

/** Fragmento de obsidiana (cinzas). */
function obsidianShard(seed = 719) {
  const p = new Painter(10, 14, { transparent: true });
  const ob = ['#1a1020', '#2e2040', '#0c0810'];
  for (let y = 12; y >= 2; y -= 2) {
    const w = 1 + (12 - y) * 0.45;
    p.rect(5 - w / 2, y, w, 2, shade([ob[0], ob[1]], 0.5));
  }
  p.set(5, 2, '#5a4a8a');
  return finish(p, { outline: 0.35 });
}

/** Poça rasa na areia da praia. */
function tidePuddle(seed = 727) {
  const p = new Painter(20, 8, { transparent: true });
  p.sphere(10, 5, 7, '#8ab8d0', '#b8dcef');
  p.set(8, 4, '#e8f6ff');
  return finish(p, { outline: 0.3 });
}

/** Pedra lisa de rio (brejo). */
function riverStone(seed = 733) {
  const p = new Painter(16, 10, { transparent: true });
  p.sphere(8, 6, 5.5, '#6a7068', '#8a9088');
  p.set(6, 4, '#a8b0a4');
  return finish(p, { outline: 0.35 });
}

/** Aglomerado de cogumelos pequenos. */
function mushroomCluster(seed = 641) {
  const p = new Painter(18, 12, { transparent: true });
  for (let i = 0; i < 3; i += 1) {
    const mx = 3 + i * 5 + (hash(i, seed, 1) - 0.5) * 2;
    const my = 8 - hash(i, seed, 2) * 3;
    p.rect(mx, my, 2, 3, '#d8c8a8');
    p.sphere(mx + 1, my, 2.2, '#a04838', '#c86048');
    p.set(mx, my - 1, '#f0d8c8');
  }
  return finish(p, { outline: 0.3 });
}

/** Arbusto com frutinhos vermelhos. */
function berryBush(seed = 643) {
  const p = new Painter(18, 14, { transparent: true });
  p.sphere(9, 8, 6, shade(['#1e3a14', '#3f6e2c'], 0.5), '#3f6e2c');
  for (const [bx, by] of [[5, 6], [9, 4], [13, 7], [7, 10], [12, 10]]) p.set(bx, by, '#d83028');
  return finish(p, { outline: 0.35 });
}

/** Fragmento de gelo pontudo. */
function iceShard(seed = 647) {
  const p = new Painter(12, 16, { transparent: true });
  const ice = ['#cfe8ff', '#a8d0f0', '#e8f4ff'];
  for (let y = 14; y >= 2; y -= 2) {
    const w = 2 + (14 - y) * 0.5;
    p.rect(6 - w / 2, y, w, 2, shade([ice[0], ice[2]], 0.5));
  }
  p.set(6, 2, '#ffffff');
  p.rect(5, 14, 2, 2, ice[1]);
  return finish(p, { outline: 0.35 });
}

/** Ondulação de areia na praia. */
function sandRipple(seed = 653) {
  const p = new Painter(24, 8, { transparent: true });
  p.rect(2, 3, 20, 2, '#d8c090');
  p.rect(4, 5, 16, 1, '#c8b080');
  p.set(6, 3, '#e8d8a8');
  return finish(p, { outline: 0.3 });
}

/** Raiz retorcida saindo da lama. */
function twistedRoot(seed = 659) {
  const p = new Painter(20, 12, { transparent: true });
  const bark = ['#4a3420', '#5e4530', '#3a2818'];
  p.rect(2, 8, 6, 3, shade([bark[0], bark[1]], 0.5));
  p.rect(8, 6, 5, 3, bark[1]);
  p.rect(13, 8, 5, 2, bark[2]);
  p.set(10, 5, bark[0]);
  return finish(p, { outline: 0.35 });
}

/** Poça de lama no brejo. */
function mudPuddle(seed = 613) {
  const p = new Painter(22, 10, { transparent: true });
  p.sphere(11, 6, 8, '#3a2e1a', '#5a4a28');
  p.sphere(9, 5, 3, '#6a5a34', '#7a6a3e');
  p.set(11, 4, '#8a7a4a');
  return finish(p, { outline: 0.3 });
}

/** Pegada na areia. */
function footprint(seed = 619) {
  const p = new Painter(10, 12, { transparent: true });
  p.sphere(5, 5, 2.6, '#c8a878', '#b89868');
  p.rect(3, 8, 4, 2, '#b89868');
  return finish(p, { outline: 0.35 });
}

/** Cacto florido (rosa no topo). */
function bloomingCactus(seed = 631) {
  const p = new Painter(14, 20, { transparent: true });
  const green = ['#2e6a2e', '#3f8a3a', '#57a850'];
  p.rect(6, 4, 3, 14, shade([green[0], green[2]], 0.5));
  p.rect(2, 8, 4, 2, green[1]);
  p.rect(9, 6, 3, 2, green[1]);
  p.set(7, 3, '#f060a0');
  p.set(6, 3, '#ff88c0');
  p.set(8, 3, '#e04088');
  return finish(p, { outline: 0.35 });
}

/** Brasa brilhante nas cinzas (pontinho quente). */
function emberGlow(seed = 599) {
  const p = new Painter(10, 8, { transparent: true });
  p.sphere(5, 5, 2.6, '#7a2010', '#ff8030');
  p.set(5, 5, '#ffd080');
  p.set(4, 4, '#ffb050');
  return finish(p, { outline: 0.3 });
}

/** Montinho de neve fofa no chão gelado. */
function snowMound(seed = 587) {
  const p = new Painter(20, 10, { transparent: true });
  p.sphere(10, 7, 6, '#cfe0f0', '#f4faff');
  p.sphere(7, 8, 3, '#c0d4e8', '#e8f2fc');
  p.set(10, 4, '#ffffff');
  return finish(p, { outline: 0.3 });
}

/** Conchinha na areia da praia (detalhe pequeno). */
function shell(seed = 577) {
  const p = new Painter(10, 8, { transparent: true });
  p.sphere(5, 5, 3, '#e8d8c8', '#f4e8dc');
  p.set(5, 5, '#fff4e8');
  p.set(4, 4, '#d8c0b0');
  p.set(6, 6, '#d8c0b0');
  return finish(p, { outline: 0.35 });
}

/** Pedrinhas espalhadas no chão (detalhe de chão, sem colisão). */
function pebbles(seed = 563) {
  const p = new Painter(18, 8, { transparent: true });
  const stones = ['#8a8a92', '#6a6a72', '#9a9aa2'];
  for (let i = 0; i < 4; i += 1) {
    const sx = 2 + hash(i, seed, 1) * 13;
    const sy = 2 + hash(i, seed, 2) * 4;
    const r = 1.2 + hash(i, seed, 3) * 1.2;
    const c = stones[Math.floor(hash(i, seed, 4) * stones.length) % stones.length];
    p.sphere(sx, sy, r, shade([c, '#ffffff'], 0.72), c);
  }
  return finish(p, { outline: 0.35 });
}

/** Flor dourada do vale (pradaria). */
function valleyFlower(seed = 547) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#f4d03f', '#ffe08a', '#f0c020'];
  for (let flower = 0; flower < 3; flower += 1) {
    const fx = 3 + flower * 4 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#4a7a24', '#5a8a30'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#fff4b0');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor silvestre azul-clara na floresta. */
function forestFlower(seed = 531) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#a8c8f0', '#8ab0e8', '#c8e0ff'];
  for (let flower = 0; flower < 3; flower += 1) {
    const fx = 3 + flower * 4 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#2e5220', '#3f6e2c'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#e8f4ff');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor de praia (branca/amarela) na areia da costa. */
function beachFlower(seed = 515) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#ffffff', '#f4e6a0', '#ffe8c0'];
  for (let flower = 0; flower < 2; flower += 1) {
    const fx = 4 + flower * 6 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#8a9a4a', '#9aaa5a'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#f4d03f');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor tropical (rosa vivo) na selva. */
function jungleFlower(seed = 499) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#f060a0', '#e04088', '#ff88c0'];
  for (let flower = 0; flower < 2; flower += 1) {
    const fx = 4 + flower * 6 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#1e4a1a', '#2e6024'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#ffe08a');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor vulcânica (laranja/vermelho) nas cinzas quentes. */
function ashFlower(seed = 483) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#f07830', '#e04020', '#f4a040'];
  for (let flower = 0; flower < 2; flower += 1) {
    const fx = 4 + flower * 6 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#3a2620', '#4a3228'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#ffe08a');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor do brejo (lilás) na lama rasa. */
function swampFlower(seed = 467) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#c8a8e8', '#b48ad8', '#d8c8f0'];
  for (let flower = 0; flower < 2; flower += 1) {
    const fx = 4 + flower * 6 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#2a4a1a', '#3a5e24'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#e8d8ff');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor do deserto (amarela/rosa) na areia. */
function duneFlower(seed = 451) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#f4d03f', '#f0a0c8', '#f4e6a0'];
  for (let flower = 0; flower < 2; flower += 1) {
    const fx = 4 + flower * 6 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#6a8a3a', '#7a9a4a'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#fff4b0');
  }
  return finish(p, { outline: 0.3 });
}

/** Flor de neve (branca/azul) no chão gelado. */
function snowFlower(seed = 433) {
  const p = new Painter(14, 11, { transparent: true });
  const petals = ['#eaf4ff', '#cfe4ff', '#ffffff'];
  for (let flower = 0; flower < 2; flower += 1) {
    const fx = 4 + flower * 6 + (hash(flower, seed, 5) - 0.5) * 2;
    const fy = 3 + hash(flower, seed, 6) * 3;
    const color = petals[Math.floor(hash(flower, seed, 7) * petals.length) % petals.length];
    for (let t = 0; t <= 1; t += 0.2) p.set(fx, fy + 6 * t, shade(['#4a6a8a', '#5a7a9a'], 0.5));
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(fx + ox, fy + oy, color);
    p.set(fx, fy, '#cfe8ff');
  }
  return finish(p, { outline: 0.3 });
}

const PAINTED_ENTRIES = [
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
  { name: 'grass-tuft-0', draw: () => grassTuft(401) },
  { name: 'grass-tuft-1', draw: () => grassTuft(417) },
  { name: 'flower-tuft-0', draw: () => flowerTuft(402) },
  { name: 'flower-tuft-1', draw: () => flowerTuft(419) },
  { name: 'snow-flower-0', draw: () => snowFlower(433) },
  { name: 'snow-flower-1', draw: () => snowFlower(441) },
  { name: 'dune-flower-0', draw: () => duneFlower(451) },
  { name: 'dune-flower-1', draw: () => duneFlower(459) },
  { name: 'swamp-flower-0', draw: () => swampFlower(467) },
  { name: 'swamp-flower-1', draw: () => swampFlower(475) },
  { name: 'ash-flower-0', draw: () => ashFlower(483) },
  { name: 'ash-flower-1', draw: () => ashFlower(491) },
  { name: 'jungle-flower-0', draw: () => jungleFlower(499) },
  { name: 'jungle-flower-1', draw: () => jungleFlower(507) },
  { name: 'beach-flower-0', draw: () => beachFlower(515) },
  { name: 'beach-flower-1', draw: () => beachFlower(523) },
  { name: 'forest-flower-0', draw: () => forestFlower(531) },
  { name: 'forest-flower-1', draw: () => forestFlower(541) },
  { name: 'valley-flower-0', draw: () => valleyFlower(547) },
  { name: 'valley-flower-1', draw: () => valleyFlower(557) },
  { name: 'pebbles-0', draw: () => pebbles(563) },
  { name: 'pebbles-1', draw: () => pebbles(571) },
  { name: 'frozen-log', draw: () => fallenLog(true) },
  { name: 'shell-0', draw: () => shell(577) },
  { name: 'shell-1', draw: () => shell(583) },
  { name: 'snow-mound-0', draw: () => snowMound(587) },
  { name: 'snow-mound-1', draw: () => snowMound(593) },
  { name: 'ember-0', draw: () => emberGlow(599) },
  { name: 'ember-1', draw: () => emberGlow(607) },
  { name: 'mud-puddle-0', draw: () => mudPuddle(613) },
  { name: 'mud-puddle-1', draw: () => mudPuddle(617) },
  { name: 'footprint-0', draw: () => footprint(619) },
  { name: 'footprint-1', draw: () => footprint(623) },
  { name: 'blooming-cactus', draw: () => bloomingCactus(631) },
  { name: 'mushroom-cluster-0', draw: () => mushroomCluster(641) },
  { name: 'mushroom-cluster-1', draw: () => mushroomCluster(643) },
  { name: 'berry-bush-0', draw: () => berryBush(647) },
  { name: 'berry-bush-1', draw: () => berryBush(653) },
  { name: 'ice-shard-0', draw: () => iceShard(659) },
  { name: 'ice-shard-1', draw: () => iceShard(661) },
  { name: 'sand-ripple-0', draw: () => sandRipple(673) },
  { name: 'sand-ripple-1', draw: () => sandRipple(677) },
  { name: 'twisted-root-0', draw: () => twistedRoot(683) },
  { name: 'twisted-root-1', draw: () => twistedRoot(691) },
  { name: 'starfish-0', draw: () => starfish(701) },
  { name: 'starfish-1', draw: () => starfish(705) },
  { name: 'vine-0', draw: () => vine(709) },
  { name: 'vine-1', draw: () => vine(719) },
  { name: 'obsidian-shard-0', draw: () => obsidianShard(727) },
  { name: 'obsidian-shard-1', draw: () => obsidianShard(733) },
  { name: 'tide-puddle-0', draw: () => tidePuddle(739) },
  { name: 'tide-puddle-1', draw: () => tidePuddle(743) },
  { name: 'river-stone-0', draw: () => riverStone(751) },
  { name: 'river-stone-1', draw: () => riverStone(757) },
  { name: 'small-rock-0', draw: () => smallRock(761) },
  { name: 'small-rock-1', draw: () => smallRock(767) },
  { name: 'big-water-lily-0', draw: () => bigWaterLily(769) },
  { name: 'big-water-lily-1', draw: () => bigWaterLily(771) },
  { name: 'ice-spike-0', draw: () => iceSpike(773) },
  { name: 'ice-spike-1', draw: () => iceSpike(775) },
  { name: 'dune-wave-0', draw: () => duneWave(779) },
  { name: 'dune-wave-1', draw: () => duneWave(783) },
  { name: 'yellow-flower-0', draw: () => yellowFlower(787) },
  { name: 'yellow-flower-1', draw: () => yellowFlower(793) },
  { name: 'blue-mushroom-0', draw: () => blueMushroom(797) },
  { name: 'blue-mushroom-1', draw: () => blueMushroom(803) },
  { name: 'ember-flower-0', draw: () => emberFlower(809) },
  { name: 'ember-flower-1', draw: () => emberFlower(815) },
  { name: 'tall-grass-0', draw: () => tallGrass(811) },
  { name: 'tall-grass-1', draw: () => tallGrass(817) },
  { name: 'broken-anchor', draw: () => brokenAnchor(821) },
  { name: 'jungle-root-0', draw: () => jungleRoot(827) },
  { name: 'jungle-root-1', draw: () => jungleRoot(829) },
  { name: 'moss-pebble-0', draw: () => mossPebble(839) },
  { name: 'moss-pebble-1', draw: () => mossPebble(843) },
  { name: 'white-flower-0', draw: () => whiteFlower(841) },
  { name: 'white-flower-1', draw: () => whiteFlower(847) },
  { name: 'bark-scrap-0', draw: () => barkScrap(853) },
  { name: 'bark-scrap-1', draw: () => barkScrap(859) },
  { name: 'spiral-shell', draw: () => spiralShell(857) },
  { name: 'lava-rock-0', draw: () => lavaRock(863) },
  { name: 'lava-rock-1', draw: () => lavaRock(867) },
  { name: 'pink-flower-0', draw: () => pinkFlower(877) },
  { name: 'pink-flower-1', draw: () => pinkFlower(879) },
  { name: 'rotten-log', draw: () => rottenLog(881) },
  { name: 'beach-boulder-0', draw: () => beachBoulder(883) },
  { name: 'beach-boulder-1', draw: () => beachBoulder(885) },
  { name: 'tall-cactus', draw: () => tallCactus(887) },
  { name: 'sea-foam-0', draw: () => seaFoam(893) },
  { name: 'sea-foam-1', draw: () => seaFoam(897) },
  { name: 'reed-0', draw: () => reed(907) },
  { name: 'reed-1', draw: () => reed(911) },
  { name: 'purple-flower-0', draw: () => purpleFlower(919) },
  { name: 'purple-flower-1', draw: () => purpleFlower(923) },
  { name: 'blue-ice-0', draw: () => blueIce(929) },
  { name: 'blue-ice-1', draw: () => blueIce(937) },
  { name: 'dry-bush-2', draw: () => dryBush2(941) },
  { name: 'pale-stone-0', draw: () => paleStone(947) },
  { name: 'pale-stone-1', draw: () => paleStone(953) },
  { name: 'granite-0', draw: () => granite(961) },
  { name: 'granite-1', draw: () => granite(963) },
  { name: 'desert-bloom-0', draw: () => desertBloom(967) },
  { name: 'desert-bloom-1', draw: () => desertBloom(971) },
  { name: 'jungle-log', draw: () => jungleLog(977) },
  { name: 'snow-track-0', draw: () => snowTrack(983) },
  { name: 'snow-track-1', draw: () => snowTrack(989) },
  { name: 'tide-rock-0', draw: () => tideRock(991) },
  { name: 'tide-rock-1', draw: () => tideRock(997) },
  { name: 'red-cap-0', draw: () => redCap(1009) },
  { name: 'red-cap-1', draw: () => redCap(1011) },
  { name: 'carved-pebble-0', draw: () => carvedPebble(1013) },
  { name: 'carved-pebble-1', draw: () => carvedPebble(1015) },
  { name: 'floating-branch-0', draw: () => floatingBranch(1019) },
  { name: 'floating-branch-1', draw: () => floatingBranch(1021) },
  { name: 'snow-branch', draw: () => snowBranch(1031) },
  { name: 'pink-shell', draw: () => pinkShell(1033) },
  { name: 'green-stone-0', draw: () => greenStone(1041) },
  { name: 'green-stone-1', draw: () => greenStone(1043) },
  { name: 'orange-flower-0', draw: () => orangeFlower(1049) },
  { name: 'orange-flower-1', draw: () => orangeFlower(1051) },
  { name: 'dune-root', draw: () => duneRoot(1057) },
  { name: 'carved-ice', draw: () => carvedIce(1061) },
  { name: 'dry-log', draw: () => dryLog(1063) },
  { name: 'driftwood', draw: () => driftwood(1071) },
  { name: 'lilac-flower-0', draw: () => lilacFlower(1079) },
  { name: 'lilac-flower-1', draw: () => lilacFlower(1081) },
  { name: 'forest-boulder', draw: () => forestBoulder(1087) },
  { name: 'ash-spike-0', draw: () => ashSpike(1091) },
  { name: 'ash-spike-1', draw: () => ashSpike(1093) },
  { name: 'snow-hollow-0', draw: () => snowHollow(1097) },
  { name: 'snow-hollow-1', draw: () => snowHollow(1099) },
  { name: 'purple-shroom-0', draw: () => purpleShroom(1109) },
  { name: 'purple-shroom-1', draw: () => purpleShroom(1111) },
  { name: 'white-desert-flower-0', draw: () => whiteDesertFlower(1117) },
  { name: 'white-desert-flower-1', draw: () => whiteDesertFlower(1119) },
  { name: 'beach-gravel', draw: () => beachGravel(1121) },
  { name: 'snow-pile-0', draw: () => snowPile(1123) },
  { name: 'snow-pile-1', draw: () => snowPile(1127) },
  { name: 'swamp-root', draw: () => swampRoot(1129) },
  { name: 'red-stone-0', draw: () => redStone(1139) },
  { name: 'red-stone-1', draw: () => redStone(1141) },
  { name: 'blue-snow-flower-0', draw: () => blueSnowFlower(1147) },
  { name: 'blue-snow-flower-1', draw: () => blueSnowFlower(1149) },
  { name: 'pale-bark', draw: () => paleBark(1151) },
  { name: 'dune-bloom', draw: () => duneBloom(1157) },
  { name: 'swamp-pebble-0', draw: () => swampPebble(1163) },
  { name: 'swamp-pebble-1', draw: () => swampPebble(1167) },
  { name: 'hot-ash-0', draw: () => hotAsh(1171) },
  { name: 'hot-ash-1', draw: () => hotAsh(1173) },
  { name: 'clear-ice-rock-0', draw: () => clearIceRock(1177) },
  { name: 'clear-ice-rock-1', draw: () => clearIceRock(1179) },
  { name: 'wreck-log', draw: () => wreckLog(1181) },
  { name: 'jungle-bush-0', draw: () => jungleBush(1187) },
  { name: 'jungle-bush-1', draw: () => jungleBush(1189) },
  { name: 'desert-stone-0', draw: () => desertStone(1193) },
  { name: 'desert-stone-1', draw: () => desertStone(1197) },
  { name: 'ash-crystal-0', draw: () => ashCrystal(1201) },
  { name: 'ash-crystal-1', draw: () => ashCrystal(1203) },
  { name: 'yellow-swamp-flower-0', draw: () => yellowSwampFlower(1209) },
  { name: 'yellow-swamp-flower-1', draw: () => yellowSwampFlower(1211) },
  { name: 'snow-covered-rock', draw: () => snowCoveredRock(1217) },
  { name: 'dune-gravel', draw: () => duneGravel(1223) },
  { name: 'wet-stone-0', draw: () => wetStone(1229) },
  { name: 'wet-stone-1', draw: () => wetStone(1231) },
  { name: 'lilac-ice-flower-0', draw: () => lilacIceFlower(1237) },
  { name: 'lilac-ice-flower-1', draw: () => lilacIceFlower(1241) },
  { name: 'pink-pebble', draw: () => pinkPebble(1243) },
  { name: 'dry-branch', draw: () => dryBranch(1249) },
  { name: 'tan-shroom-0', draw: () => tanShroom(1255) },
  { name: 'tan-shroom-1', draw: () => tanShroom(1257) },
  { name: 'pale-ash-rock', draw: () => paleAshRock(1259) },
  { name: 'pink-dune-flower-0', draw: () => pinkDuneFlower(1267) },
  { name: 'pink-dune-flower-1', draw: () => pinkDuneFlower(1271) },
  { name: 'swamp-gravel', draw: () => swampGravel(1273) },
  { name: 'ice-log', draw: () => iceLog(1279) },
  { name: 'sea-grass-0', draw: () => seaGrass(1283) },
  { name: 'sea-grass-1', draw: () => seaGrass(1285) },
  { name: 'small-lava-rock-0', draw: () => smallLavaRock(1289) },
  { name: 'small-lava-rock-1', draw: () => smallLavaRock(1291) },
  { name: 'pink-swamp-flower-0', draw: () => pinkSwampFlower(1297) },
  { name: 'pink-swamp-flower-1', draw: () => pinkSwampFlower(1299) },
  { name: 'dark-river-stone', draw: () => darkRiverStone(1301) },
  { name: 'cracked-ice-0', draw: () => crackedIce(1307) },
  { name: 'cracked-ice-1', draw: () => crackedIce(1309) },
  { name: 'dark-bark', draw: () => darkBark(1311) },
  { name: 'blue-gray-stone', draw: () => blueGrayStone(1317) },
  { name: 'lilac-dune-flower-0', draw: () => lilacDuneFlower(1327) },
  { name: 'lilac-dune-flower-1', draw: () => lilacDuneFlower(1329) },
  { name: 'green-beach-stone', draw: () => greenBeachStone(1331) },
  { name: 'gray-shroom-0', draw: () => grayShroom(1337) },
  { name: 'gray-shroom-1', draw: () => grayShroom(1339) },
  { name: 'wind-snow-0', draw: () => windSnow(1341) },
  { name: 'wind-snow-1', draw: () => windSnow(1343) },
  { name: 'orange-jungle-flower-0', draw: () => orangeJungleFlower(1347) },
  { name: 'orange-jungle-flower-1', draw: () => orangeJungleFlower(1349) },
  { name: 'light-ash-gravel', draw: () => lightAshGravel(1357) },
  { name: 'white-swamp-flower-0', draw: () => whiteSwampFlower(1361) },
  { name: 'white-swamp-flower-1', draw: () => whiteSwampFlower(1363) },
  { name: 'light-dune-pebble', draw: () => lightDunePebble(1367) },
  { name: 'dry-sea-bush-0', draw: () => drySeaBush(1371) },
  { name: 'dry-sea-bush-1', draw: () => drySeaBush(1373) },
  { name: 'blush-forest-flower-0', draw: () => blushForestFlower(1377) },
  { name: 'blush-forest-flower-1', draw: () => blushForestFlower(1379) },
  { name: 'mint-ice-flower-0', draw: () => mintIceFlower(1387) },
  { name: 'mint-ice-flower-1', draw: () => mintIceFlower(1389) },
  { name: 'yellow-beach-stone', draw: () => yellowBeachStone(1391) },
  { name: 'mossy-log', draw: () => mossyLog(1397) },
  { name: 'light-blue-shroom-0', draw: () => lightBlueShroom(1401) },
  { name: 'light-blue-shroom-1', draw: () => lightBlueShroom(1403) },
  { name: 'round-dune-rock', draw: () => roundDuneRock(1407) },
  { name: 'yellow-jungle-flower-0', draw: () => yellowJungleFlower(1417) },
  { name: 'yellow-jungle-flower-1', draw: () => yellowJungleFlower(1419) },
  { name: 'light-river-stone', draw: () => lightRiverStone(1421) },
  { name: 'deep-blue-ice-0', draw: () => deepBlueIce(1427) },
  { name: 'deep-blue-ice-1', draw: () => deepBlueIce(1429) },
  { name: 'light-beach-bark', draw: () => lightBeachBark(1431) },
  { name: 'white-ash-flower-0', draw: () => whiteAshFlower(1437) },
  { name: 'white-ash-flower-1', draw: () => whiteAshFlower(1439) },
  { name: 'pink-dune-pebble', draw: () => pinkDunePebble(1447) },
  { name: 'blue-swamp-flower-0', draw: () => blueSwampFlower(1451) },
  { name: 'blue-swamp-flower-1', draw: () => blueSwampFlower(1453) },
  { name: 'pale-green-stone', draw: () => paleGreenStone(1457) },
  { name: 'ash-log', draw: () => ashLog(1461) },
  { name: 'light-purple-flower-0', draw: () => lightPurpleFlower(1467) },
  { name: 'light-purple-flower-1', draw: () => lightPurpleFlower(1469) },
  { name: 'orange-swamp-flower-0', draw: () => orangeSwampFlower(1477) },
  { name: 'orange-swamp-flower-1', draw: () => orangeSwampFlower(1479) },
  { name: 'dark-dune-stone', draw: () => darkDuneStone(1481) },
  { name: 'flowered-snow', draw: () => floweredSnow(1487) },
  { name: 'ash-bark', draw: () => ashBark(1491) },
  { name: 'rose-beach-stone', draw: () => roseBeachStone(1497) },
  { name: 'peach-forest-flower-0', draw: () => peachForestFlower(1507) },
  { name: 'peach-forest-flower-1', draw: () => peachForestFlower(1509) },
  { name: 'white-beach-pebble', draw: () => whiteBeachPebble(1511) },
  { name: 'pale-blue-ice', draw: () => paleBlueIce(1517) },
  { name: 'forest-gravel', draw: () => forestGravel(1521) },
  { name: 'red-dune-flower-0', draw: () => redDuneFlower(1527) },
  { name: 'red-dune-flower-1', draw: () => redDuneFlower(1529) },
  { name: 'pink-sea-bush-0', draw: () => pinkSeaBush(1537) },
  { name: 'pink-sea-bush-1', draw: () => pinkSeaBush(1539) },
  { name: 'gray-snow-rock', draw: () => graySnowRock(1541) },
  { name: 'long-beach-log', draw: () => longBeachLog(1547) },
  { name: 'teal-swamp-flower-0', draw: () => tealSwampFlower(1551) },
  { name: 'teal-swamp-flower-1', draw: () => tealSwampFlower(1553) },
  { name: 'red-ash-rock', draw: () => redAshRock(1557) },
  { name: 'pink-jungle-flower-0', draw: () => pinkJungleFlower(1567) },
  { name: 'pink-jungle-flower-1', draw: () => pinkJungleFlower(1569) },
  { name: 'gold-dune-pebble', draw: () => goldDunePebble(1571) },
  { name: 'pebbled-snow', draw: () => pebbledSnow(1577) },
  { name: 'colorful-beach-gravel', draw: () => colorfulBeachGravel(1581) },
  { name: 'orange-ash-flower-0', draw: () => orangeAshFlower(1587) },
  { name: 'orange-ash-flower-1', draw: () => orangeAshFlower(1589) },
  { name: 'gold-swamp-flower-0', draw: () => goldSwampFlower(1597) },
  { name: 'gold-swamp-flower-1', draw: () => goldSwampFlower(1599) },
  { name: 'lilac-beach-stone', draw: () => lilacBeachStone(1601) },
  { name: 'pink-ice', draw: () => pinkIce(1607) },
  { name: 'forest-branch', draw: () => forestBranch(1611) },
  { name: 'white-dune-flower-0', draw: () => whiteDuneFlower(1617) },
  { name: 'white-dune-flower-1', draw: () => whiteDuneFlower(1619) },
  { name: 'yellow-forest-bush-0', draw: () => yellowForestBush(1627) },
  { name: 'yellow-forest-bush-1', draw: () => yellowForestBush(1629) },
  { name: 'green-beach-pebble', draw: () => greenBeachPebble(1631) },
  { name: 'shattered-ice', draw: () => shatteredIce(1637) },
  { name: 'orange-shroom-0', draw: () => orangeShroom(1641) },
  { name: 'orange-shroom-1', draw: () => orangeShroom(1643) },
  { name: 'dark-round-dune-rock', draw: () => darkRoundDuneRock(1647) },
  { name: 'blue-forest-flower-0', draw: () => blueForestFlower(1657) },
  { name: 'blue-forest-flower-1', draw: () => blueForestFlower(1659) },
  { name: 'snow-gravel', draw: () => snowGravel(1661) },
  { name: 'big-shell', draw: () => bigShell(1667) },
  { name: 'dry-ash-bush-0', draw: () => dryAshBush(1671) },
  { name: 'dry-ash-bush-1', draw: () => dryAshBush(1673) },
  { name: 'dark-jungle-pebble', draw: () => darkJunglePebble(1677) },
  { name: 'magenta-dune-flower-0', draw: () => magentaDuneFlower(1687) },
  { name: 'magenta-dune-flower-1', draw: () => magentaDuneFlower(1689) },
  { name: 'blue-beach-pebble', draw: () => blueBeachPebble(1691) },
  { name: 'blue-flowered-snow', draw: () => blueFloweredSnow(1697) },
  { name: 'green-shroom-0', draw: () => greenShroom(1701) },
  { name: 'green-shroom-1', draw: () => greenShroom(1703) },
  { name: 'mossy-jungle-stone', draw: () => mossyJungleStone(1707) },
  { name: 'teal-forest-flower-0', draw: () => tealForestFlower(1717) },
  { name: 'teal-forest-flower-1', draw: () => tealForestFlower(1719) },
  { name: 'gray-dune-pebble', draw: () => grayDunePebble(1721) },
  { name: 'lilac-ice', draw: () => lilacIce(1727) },
  { name: 'dark-beach-log', draw: () => darkBeachLog(1731) },
  { name: 'pink-ash-flower-0', draw: () => pinkAshFlower(1737) },
  { name: 'pink-ash-flower-1', draw: () => pinkAshFlower(1739) },
  { name: 'dark-purple-swamp-flower-0', draw: () => darkPurpleSwampFlower(1747) },
  { name: 'dark-purple-swamp-flower-1', draw: () => darkPurpleSwampFlower(1749) },
  { name: 'dark-green-beach-stone', draw: () => darkGreenBeachStone(1751) },
  { name: 'dark-pebbled-snow', draw: () => darkPebbledSnow(1757) },
  { name: 'pink-shroom-0', draw: () => pinkShroom(1761) },
  { name: 'pink-shroom-1', draw: () => pinkShroom(1763) },
  { name: 'dry-dune-bush-0', draw: () => dryDuneBush(1767) },
  { name: 'dry-dune-bush-1', draw: () => dryDuneBush(1769) },
  { name: 'coral-beach-flower-0', draw: () => coralBeachFlower(1777) },
  { name: 'coral-beach-flower-1', draw: () => coralBeachFlower(1779) },
  { name: 'lavender-dune-stone', draw: () => lavenderDuneStone(1781) },
  { name: 'pink-flowered-snow', draw: () => pinkFloweredSnow(1787) },
  { name: 'navy-shroom-0', draw: () => navyShroom(1791) },
  { name: 'navy-shroom-1', draw: () => navyShroom(1793) },
  { name: 'flowered-ash-bush-0', draw: () => floweredAshBush(1797) },
  { name: 'flowered-ash-bush-1', draw: () => floweredAshBush(1799) },
  { name: 'coral-jungle-flower-0', draw: () => coralJungleFlower(1807) },
  { name: 'coral-jungle-flower-1', draw: () => coralJungleFlower(1809) },
  { name: 'gold-beach-pebble', draw: () => goldBeachPebble(1811) },
  { name: 'teal-ice', draw: () => tealIce(1817) },
  { name: 'lilac-dune-gravel', draw: () => lilacDuneGravel(1821) },
  { name: 'yellow-ash-flower-0', draw: () => yellowAshFlower(1827) },
  { name: 'yellow-ash-flower-1', draw: () => yellowAshFlower(1829) },
  { name: 'coral-swamp-flower-0', draw: () => coralSwampFlower(1837) },
  { name: 'coral-swamp-flower-1', draw: () => coralSwampFlower(1839) },
  { name: 'teal-beach-stone', draw: () => tealBeachStone(1841) },
  { name: 'yellow-flowered-snow', draw: () => yellowFloweredSnow(1847) },
  { name: 'pale-dune-log', draw: () => paleDuneLog(1851) },
  { name: 'hot-pink-flower-0', draw: () => hotPinkFlower(1857) },
  { name: 'hot-pink-flower-1', draw: () => hotPinkFlower(1859) },
  { name: 'coral-dune-flower-0', draw: () => coralDuneFlower(1867) },
  { name: 'coral-dune-flower-1', draw: () => coralDuneFlower(1869) },
  { name: 'coral-beach-stone', draw: () => coralBeachStone(1871) },
  { name: 'green-flowered-snow', draw: () => greenFloweredSnow(1877) },
  { name: 'coral-shroom-0', draw: () => coralShroom(1881) },
  { name: 'coral-shroom-1', draw: () => coralShroom(1883) },
  { name: 'white-flowered-swamp-bush-0', draw: () => whiteFloweredSwampBush(1887) },
  { name: 'white-flowered-swamp-bush-1', draw: () => whiteFloweredSwampBush(1889) },
  { name: 'turquoise-forest-flower-0', draw: () => turquoiseForestFlower(1897) },
  { name: 'turquoise-forest-flower-1', draw: () => turquoiseForestFlower(1899) },
  { name: 'coral-beach-pebble', draw: () => coralBeachPebble(1901) },
  { name: 'coral-ice', draw: () => coralIce(1907) },
  { name: 'green-beach-gravel', draw: () => greenBeachGravel(1911) },
  { name: 'teal-ash-flower-0', draw: () => tealAshFlower(1917) },
  { name: 'teal-ash-flower-1', draw: () => tealAshFlower(1919) },
  { name: 'turquoise-swamp-flower-0', draw: () => turquoiseSwampFlower(1927) },
  { name: 'turquoise-swamp-flower-1', draw: () => turquoiseSwampFlower(1929) },
  { name: 'coral-dune-pebble', draw: () => coralDunePebble(1931) },
  { name: 'turquoise-ice', draw: () => turquoiseIce(1937) },
  { name: 'rotten-forest-log', draw: () => rottenForestLog(1941) },
  { name: 'gold-jungle-flower-0', draw: () => goldJungleFlower(1947) },
  { name: 'gold-jungle-flower-1', draw: () => goldJungleFlower(1949) },
  { name: 'lilac-beach-flower-0', draw: () => lilacBeachFlower(1957) },
  { name: 'lilac-beach-flower-1', draw: () => lilacBeachFlower(1959) },
  { name: 'turquoise-dune-stone', draw: () => turquoiseDuneStone(1961) },
  { name: 'turquoise-flowered-snow', draw: () => turquoiseFloweredSnow(1967) },
  { name: 'violet-shroom-0', draw: () => violetShroom(1971) },
  { name: 'violet-shroom-1', draw: () => violetShroom(1973) },
  { name: 'coral-ash-flower-0', draw: () => coralAshFlower(1977) },
  { name: 'coral-ash-flower-1', draw: () => coralAshFlower(1979) },
  { name: 'lilac-swamp-flower-0', draw: () => lilacSwampFlower(1987) },
  { name: 'lilac-swamp-flower-1', draw: () => lilacSwampFlower(1989) },
  { name: 'turquoise-beach-pebble', draw: () => turquoiseBeachPebble(1991) },
  { name: 'dark-lilac-ice', draw: () => darkLilacIce(1997) },
  { name: 'pale-ash-log', draw: () => paleAshLog(2001) },
  { name: 'turquoise-jungle-flower-0', draw: () => turquoiseJungleFlower(2007) },
  { name: 'turquoise-jungle-flower-1', draw: () => turquoiseJungleFlower(2009) },
  { name: 'turquoise-dune-flower-0', draw: () => turquoiseDuneFlower(2017) },
  { name: 'turquoise-dune-flower-1', draw: () => turquoiseDuneFlower(2019) },
  { name: 'dark-lilac-beach-stone', draw: () => darkLilacBeachStone(2021) },
  { name: 'lilac-flowered-snow', draw: () => lilacFloweredSnow(2027) },
  { name: 'turquoise-shroom-0', draw: () => turquoiseShroom(2031) },
  { name: 'turquoise-shroom-1', draw: () => turquoiseShroom(2033) },
  { name: 'lilac-forest-flower-0', draw: () => lilacForestFlower(2037) },
  { name: 'lilac-forest-flower-1', draw: () => lilacForestFlower(2039) },
  { name: 'green-beach-flower-0', draw: () => greenBeachFlower(2047) },
  { name: 'green-beach-flower-1', draw: () => greenBeachFlower(2049) },
  { name: 'lilac-dune-stone', draw: () => lilacDuneStone(2051) },
  { name: 'pale-teal-ice', draw: () => paleTealIce(2057) },
  { name: 'lilac-shroom-0', draw: () => lilacShroom(2061) },
  { name: 'lilac-shroom-1', draw: () => lilacShroom(2063) },
  { name: 'green-ash-flower-0', draw: () => greenAshFlower(2067) },
  { name: 'green-ash-flower-1', draw: () => greenAshFlower(2069) },
  { name: 'light-coral-dune-flower-0', draw: () => lightCoralDuneFlower(2077) },
  { name: 'light-coral-dune-flower-1', draw: () => lightCoralDuneFlower(2079) },
  { name: 'light-green-beach-stone', draw: () => lightGreenBeachStone(2081) },
  { name: 'coral-flowered-snow', draw: () => coralFloweredSnow(2087) },
  { name: 'teal-swamp-shroom-0', draw: () => tealSwampShroom(2091) },
  { name: 'teal-swamp-shroom-1', draw: () => tealSwampShroom(2093) },
  { name: 'flowered-dune-bush-0', draw: () => floweredDuneBush(2097) },
  { name: 'flowered-dune-bush-1', draw: () => floweredDuneBush(2099) },
  { name: 'green-swamp-flower-0', draw: () => greenSwampFlower(2107) },
  { name: 'green-swamp-flower-1', draw: () => greenSwampFlower(2109) },
  { name: 'light-lilac-beach-pebble', draw: () => lightLilacBeachPebble(2111) },
  { name: 'green-ice', draw: () => greenIce(2117) },
  { name: 'muddy-swamp-log', draw: () => muddySwampLog(2121) },
  { name: 'light-green-forest-flower-0', draw: () => lightGreenForestFlower(2127) },
  { name: 'light-green-forest-flower-1', draw: () => lightGreenForestFlower(2129) },
  { name: 'sea-green-dune-flower-0', draw: () => seaGreenDuneFlower(2137) },
  { name: 'sea-green-dune-flower-1', draw: () => seaGreenDuneFlower(2139) },
  { name: 'sea-green-beach-stone', draw: () => seaGreenBeachStone(2141) },
  { name: 'dark-teal-ice', draw: () => darkTealIce(2147) },
  { name: 'light-green-shroom-0', draw: () => lightGreenShroom(2151) },
  { name: 'light-green-shroom-1', draw: () => lightGreenShroom(2153) },
  { name: 'sea-green-ash-flower-0', draw: () => seaGreenAshFlower(2157) },
  { name: 'sea-green-ash-flower-1', draw: () => seaGreenAshFlower(2159) },
  { name: 'sea-green-beach-flower-0', draw: () => seaGreenBeachFlower(2167) },
  { name: 'sea-green-beach-flower-1', draw: () => seaGreenBeachFlower(2169) },
  { name: 'green-dune-stone', draw: () => greenDuneStone(2171) },
  { name: 'sea-green-flowered-snow', draw: () => seaGreenFloweredSnow(2177) },
  { name: 'sea-green-swamp-shroom-0', draw: () => seaGreenSwampShroom(2181) },
  { name: 'sea-green-swamp-shroom-1', draw: () => seaGreenSwampShroom(2183) },
  { name: 'sea-green-jungle-flower-0', draw: () => seaGreenJungleFlower(2187) },
  { name: 'sea-green-jungle-flower-1', draw: () => seaGreenJungleFlower(2189) },
  { name: 'sea-green-swamp-flower-0', draw: () => seaGreenSwampFlower(2197) },
  { name: 'sea-green-swamp-flower-1', draw: () => seaGreenSwampFlower(2199) },
  { name: 'light-green-beach-pebble', draw: () => lightGreenBeachPebble(2201) },
  { name: 'light-green-ice', draw: () => lightGreenIce(2207) },
  { name: 'muddy-beach-log', draw: () => muddyBeachLog(2211) },
  { name: 'light-green-ash-flower-0', draw: () => lightGreenAshFlower(2217) },
  { name: 'light-green-ash-flower-1', draw: () => lightGreenAshFlower(2219) },
  { name: 'light-green-dune-flower-0', draw: () => lightGreenDuneFlower(2227) },
  { name: 'light-green-dune-flower-1', draw: () => lightGreenDuneFlower(2229) },
  { name: 'dark-sea-green-beach-stone', draw: () => darkSeaGreenBeachStone(2231) },
  { name: 'light-green-flowered-snow', draw: () => lightGreenFloweredSnow(2237) },
  { name: 'dark-sea-green-swamp-shroom-0', draw: () => darkSeaGreenSwampShroom(2241) },
  { name: 'dark-sea-green-swamp-shroom-1', draw: () => darkSeaGreenSwampShroom(2243) },
  { name: 'light-green-jungle-flower-0', draw: () => lightGreenJungleFlower(2247) },
  { name: 'light-green-jungle-flower-1', draw: () => lightGreenJungleFlower(2249) },
  { name: 'light-green-beach-flower-0', draw: () => lightGreenBeachFlower(2257) },
  { name: 'light-green-beach-flower-1', draw: () => lightGreenBeachFlower(2259) },
  { name: 'sea-green-dune-stone', draw: () => seaGreenDuneStone(2261) },
  { name: 'pale-green-ice', draw: () => paleGreenIce(2267) },
  { name: 'light-green-swamp-shroom-0', draw: () => lightGreenSwampShroom(2271) },
  { name: 'light-green-swamp-shroom-1', draw: () => lightGreenSwampShroom(2273) },
  { name: 'light-sea-green-ash-flower-0', draw: () => lightSeaGreenAshFlower(2277) },
  { name: 'light-sea-green-ash-flower-1', draw: () => lightSeaGreenAshFlower(2279) },
  { name: 'light-green-swamp-flower-0', draw: () => lightGreenSwampFlower(2287) },
  { name: 'light-green-swamp-flower-1', draw: () => lightGreenSwampFlower(2289) },
  { name: 'light-sea-green-beach-pebble', draw: () => lightSeaGreenBeachPebble(2291) },
  { name: 'light-sea-green-ice', draw: () => lightSeaGreenIce(2297) },
  { name: 'mossy-jungle-log', draw: () => mossyJungleLog(2301) },
  { name: 'pale-green-ash-flower-0', draw: () => paleGreenAshFlower(2307) },
  { name: 'pale-green-ash-flower-1', draw: () => paleGreenAshFlower(2309) },
  { name: 'pale-green-beach-flower-0', draw: () => paleGreenBeachFlower(2317) },
  { name: 'pale-green-beach-flower-1', draw: () => paleGreenBeachFlower(2319) },
  { name: 'light-green-dune-stone', draw: () => lightGreenDuneStone(2321) },
  { name: 'pale-green-flowered-snow', draw: () => paleGreenFloweredSnow(2327) },
  { name: 'light-sea-green-swamp-shroom-0', draw: () => lightSeaGreenSwampShroom(2331) },
  { name: 'light-sea-green-swamp-shroom-1', draw: () => lightSeaGreenSwampShroom(2333) },
  { name: 'pale-green-jungle-flower-0', draw: () => paleGreenJungleFlower(2337) },
  { name: 'pale-green-jungle-flower-1', draw: () => paleGreenJungleFlower(2339) },
  { name: 'pale-green-dune-flower-0', draw: () => paleGreenDuneFlower(2347) },
  { name: 'pale-green-dune-flower-1', draw: () => paleGreenDuneFlower(2349) },
  { name: 'pale-green-beach-stone', draw: () => paleGreenBeachStone(2351) },
  { name: 'pale-green-ice-2', draw: () => paleGreenIce2(2357) },
  { name: 'pale-swamp-log', draw: () => paleSwampLog(2361) },
  { name: 'pale-green-forest-flower-0', draw: () => paleGreenForestFlower(2367) },
  { name: 'pale-green-forest-flower-1', draw: () => paleGreenForestFlower(2369) },
  { name: 'pale-lilac-swamp-flower-0', draw: () => paleLilacSwampFlower(2377) },
  { name: 'pale-lilac-swamp-flower-1', draw: () => paleLilacSwampFlower(2379) },
  { name: 'pale-lilac-beach-pebble', draw: () => paleLilacBeachPebble(2381) },
  { name: 'pale-lilac-ice', draw: () => paleLilacIce(2387) },
  { name: 'lilac-dune-log', draw: () => lilacDuneLog(2391) },
  { name: 'pale-lilac-forest-flower-0', draw: () => paleLilacForestFlower(2397) },
  { name: 'pale-lilac-forest-flower-1', draw: () => paleLilacForestFlower(2399) },
  { name: 'pale-coral-swamp-flower-0', draw: () => paleCoralSwampFlower(2407) },
  { name: 'pale-coral-swamp-flower-1', draw: () => paleCoralSwampFlower(2409) },
  { name: 'pale-coral-beach-stone', draw: () => paleCoralBeachStone(2411) },
  { name: 'pale-coral-ice', draw: () => paleCoralIce(2417) },
  { name: 'coral-dune-log', draw: () => coralDuneLog(2421) },
  { name: 'pale-coral-forest-flower-0', draw: () => paleCoralForestFlower(2427) },
  { name: 'pale-coral-forest-flower-1', draw: () => paleCoralForestFlower(2429) },
  { name: 'pale-turquoise-swamp-flower-0', draw: () => paleTurquoiseSwampFlower(2437) },
  { name: 'pale-turquoise-swamp-flower-1', draw: () => paleTurquoiseSwampFlower(2439) },
  { name: 'pale-turquoise-beach-pebble', draw: () => paleTurquoiseBeachPebble(2441) },
  { name: 'pale-turquoise-ice', draw: () => paleTurquoiseIce(2447) },
  { name: 'turquoise-dune-log', draw: () => turquoiseDuneLog(2451) },
  { name: 'pale-turquoise-forest-flower-0', draw: () => paleTurquoiseForestFlower(2457) },
  { name: 'pale-turquoise-forest-flower-1', draw: () => paleTurquoiseForestFlower(2459) },
  { name: 'pale-sea-green-swamp-flower-0', draw: () => paleSeaGreenSwampFlower(2467) },
  { name: 'pale-sea-green-swamp-flower-1', draw: () => paleSeaGreenSwampFlower(2469) },
  { name: 'pale-sea-green-beach-stone', draw: () => paleSeaGreenBeachStone(2471) },
  { name: 'pale-sea-green-ice', draw: () => paleSeaGreenIce(2477) },
  { name: 'sea-green-dune-log', draw: () => seaGreenDuneLog(2481) },
  { name: 'pale-sea-green-forest-flower-0', draw: () => paleSeaGreenForestFlower(2487) },
  { name: 'pale-sea-green-forest-flower-1', draw: () => paleSeaGreenForestFlower(2489) },
  { name: 'pale-gold-swamp-flower-0', draw: () => paleGoldSwampFlower(2497) },
  { name: 'pale-gold-swamp-flower-1', draw: () => paleGoldSwampFlower(2499) },
  { name: 'pale-gold-beach-stone', draw: () => paleGoldBeachStone(2501) },
  { name: 'pale-gold-ice', draw: () => paleGoldIce(2507) },
  { name: 'gold-dune-log', draw: () => goldDuneLog(2511) },
  { name: 'pale-gold-forest-flower-0', draw: () => paleGoldForestFlower(2517) },
  { name: 'pale-gold-forest-flower-1', draw: () => paleGoldForestFlower(2519) },
  { name: 'pale-pink-swamp-flower-0', draw: () => palePinkSwampFlower(2527) },
  { name: 'pale-pink-swamp-flower-1', draw: () => palePinkSwampFlower(2529) },
  { name: 'pale-pink-beach-pebble', draw: () => palePinkBeachPebble(2531) },
  { name: 'pale-pink-ice', draw: () => palePinkIce(2537) },
  { name: 'pink-dune-log', draw: () => pinkDuneLog(2541) },
  { name: 'pale-pink-forest-flower-0', draw: () => palePinkForestFlower(2547) },
  { name: 'pale-pink-forest-flower-1', draw: () => palePinkForestFlower(2549) },
  { name: 'pale-orange-swamp-flower-0', draw: () => paleOrangeSwampFlower(2557) },
  { name: 'pale-orange-swamp-flower-1', draw: () => paleOrangeSwampFlower(2559) },
  { name: 'pale-orange-beach-stone', draw: () => paleOrangeBeachStone(2561) },
  { name: 'pale-orange-ice', draw: () => paleOrangeIce(2567) },
  { name: 'orange-dune-log', draw: () => orangeDuneLog(2571) },
  { name: 'pale-orange-forest-flower-0', draw: () => paleOrangeForestFlower(2577) },
  { name: 'pale-orange-forest-flower-1', draw: () => paleOrangeForestFlower(2579) },
  { name: 'pale-blue-swamp-flower-0', draw: () => paleBlueSwampFlower(2587) },
  { name: 'pale-blue-swamp-flower-1', draw: () => paleBlueSwampFlower(2589) },
  { name: 'pale-blue-beach-pebble', draw: () => paleBlueBeachPebble(2591) },
  { name: 'sky-blue-ice', draw: () => skyBlueIce(2597) },
  { name: 'blue-dune-log', draw: () => blueDuneLog(2601) },
  { name: 'pale-blue-forest-flower-0', draw: () => paleBlueForestFlower(2607) },
  { name: 'pale-blue-forest-flower-1', draw: () => paleBlueForestFlower(2609) },
  { name: 'pale-lime-swamp-flower-0', draw: () => paleLimeSwampFlower(2617) },
  { name: 'pale-lime-swamp-flower-1', draw: () => paleLimeSwampFlower(2619) },
  { name: 'pale-lime-beach-stone', draw: () => paleLimeBeachStone(2621) },
  { name: 'pale-lime-ice', draw: () => paleLimeIce(2627) },
  { name: 'lime-dune-log', draw: () => limeDuneLog(2631) },
  { name: 'pale-lime-forest-flower-0', draw: () => paleLimeForestFlower(2637) },
  { name: 'pale-lime-forest-flower-1', draw: () => paleLimeForestFlower(2639) },
  { name: 'pale-mint-swamp-flower-0', draw: () => paleMintSwampFlower(2647) },
  { name: 'pale-mint-swamp-flower-1', draw: () => paleMintSwampFlower(2649) },
  { name: 'pale-mint-beach-pebble', draw: () => paleMintBeachPebble(2651) },
  { name: 'pale-mint-ice', draw: () => paleMintIce(2657) },
  { name: 'mint-dune-log', draw: () => mintDuneLog(2661) },
  { name: 'pale-mint-forest-flower-0', draw: () => paleMintForestFlower(2667) },
  { name: 'pale-mint-forest-flower-1', draw: () => paleMintForestFlower(2669) },
  { name: 'pale-gray-swamp-flower-0', draw: () => paleGraySwampFlower(2677) },
  { name: 'pale-gray-swamp-flower-1', draw: () => paleGraySwampFlower(2679) },
  { name: 'pale-gray-beach-pebble', draw: () => paleGrayBeachPebble(2681) },
  { name: 'pale-gray-ice', draw: () => paleGrayIce(2687) },
  { name: 'gray-dune-log', draw: () => grayDuneLog(2691) },
  { name: 'pale-gray-forest-flower-0', draw: () => paleGrayForestFlower(2697) },
  { name: 'pale-gray-forest-flower-1', draw: () => paleGrayForestFlower(2699) },
  { name: 'pale-lavender-swamp-flower-0', draw: () => paleLavenderSwampFlower(2707) },
  { name: 'pale-lavender-swamp-flower-1', draw: () => paleLavenderSwampFlower(2709) },
  { name: 'pale-lavender-beach-pebble', draw: () => paleLavenderBeachPebble(2711) },
  { name: 'pale-lavender-ice', draw: () => paleLavenderIce(2717) },
  { name: 'lavender-dune-log', draw: () => lavenderDuneLog(2721) },
  { name: 'pale-lavender-forest-flower-0', draw: () => paleLavenderForestFlower(2727) },
  { name: 'pale-lavender-forest-flower-1', draw: () => paleLavenderForestFlower(2729) },
  { name: 'pale-ivory-swamp-flower-0', draw: () => paleIvorySwampFlower(2737) },
  { name: 'pale-ivory-swamp-flower-1', draw: () => paleIvorySwampFlower(2739) },
  { name: 'pale-ivory-beach-pebble', draw: () => paleIvoryBeachPebble(2741) },
  { name: 'pale-ivory-ice', draw: () => paleIvoryIce(2747) },
  { name: 'ivory-dune-log', draw: () => ivoryDuneLog(2751) },
  { name: 'pale-ivory-forest-flower-0', draw: () => paleIvoryForestFlower(2757) },
  { name: 'pale-ivory-forest-flower-1', draw: () => paleIvoryForestFlower(2759) },
  { name: 'pale-peach-swamp-flower-0', draw: () => palePeachSwampFlower(2767) },
  { name: 'pale-peach-swamp-flower-1', draw: () => palePeachSwampFlower(2769) },
  { name: 'pale-peach-beach-pebble', draw: () => palePeachBeachPebble(2771) },
  { name: 'pale-peach-ice', draw: () => palePeachIce(2777) },
  { name: 'peach-dune-log', draw: () => peachDuneLog(2781) },
  { name: 'pale-peach-forest-flower-0', draw: () => palePeachForestFlower(2787) },
  { name: 'pale-peach-forest-flower-1', draw: () => palePeachForestFlower(2789) },
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
  { name: 'village-house', draw: villageHouse },
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

/**
 * Lista de objetos para o atlas 'biome' (nome, tamanho e desenho). Árvores, arbustos, pedras, cogumelos,
 * troncos, cactos e palmeiras vêm da arte pintada em alta resolução (scripts/bake-nature.mjs); o resto
 * (cristais, cavernas, ruínas...) continua no Painter acima.
 */
export const BIOME_PROP_ENTRIES = PAINTED_ENTRIES.map((entry) => (hasBakedNature(entry.name) ? { name: entry.name, draw: () => bakedNature(entry.name) } : entry));
