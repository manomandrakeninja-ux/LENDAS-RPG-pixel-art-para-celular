import { PixelCanvas, dither } from './pixel.js';

// "Pintor" das ilustrações: trabalha em cores contínuas (luz, névoa, brilho) e no fim
// converte para pixel art com poucos tons por canal e dither ordenado.

export function rgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (t) => t * t * (3 - 2 * t);

export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function hash2(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Ruído de valor suave (0..1). */
export function noise(x, y, seed = 0) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

/** Ruído fractal (várias camadas), 0..1. */
export function fbm(x, y, seed = 0, octaves = 4) {
  let value = 0;
  let amplitude = 0.5;
  let total = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += noise(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / total;
}

export class Painter {
  constructor(width, height, { transparent = false } = {}) {
    this.width = width;
    this.height = height;
    this.color = new Float32Array(width * height * 3);
    this.depth = new Float32Array(width * height).fill(Infinity);
    // Objetos soltos (árvores, pedras) usam fundo transparente.
    this.alpha = transparent ? new Float32Array(width * height) : null;
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x, y) {
    const index = (y * this.width + x) * 3;
    return [this.color[index], this.color[index + 1], this.color[index + 2]];
  }

  /** Pinta um pixel misturando com o que já está lá (alpha 0..1). */
  set(x, y, color, alpha = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y) || alpha <= 0) return;
    const index = (y * this.width + x) * 3;
    let a = Math.min(1, alpha);
    if (this.alpha) {
      const pixel = y * this.width + x;
      const before = this.alpha[pixel];
      this.alpha[pixel] = a + before * (1 - a);
      // Sobre o vazio, a cor entra inteira (sem escurecer misturando com preto).
      if (before <= 0) a = 1;
    }
    this.color[index] = lerp(this.color[index], color[0], a);
    this.color[index + 1] = lerp(this.color[index + 1], color[1], a);
    this.color[index + 2] = lerp(this.color[index + 2], color[2], a);
  }

  /** Luz somada (brilhos, fogo). */
  add(x, y, color, amount) {
    if (!this.inside(x, y) || amount <= 0) return;
    if (this.alpha && this.alpha[Math.floor(y) * this.width + Math.floor(x)] <= 0) return;
    const index = (y * this.width + x) * 3;
    this.color[index] += color[0] * amount;
    this.color[index + 1] += color[1] * amount;
    this.color[index + 2] += color[2] * amount;
  }

  /** Céu ou fundo em degradê vertical: stops = [[0, '#hex'], [0.6, '#hex'], [1, '#hex']]. */
  gradient(stops, top = 0, bottom = this.height) {
    const parsed = stops.map(([t, hex]) => [t, rgb(hex)]);
    for (let y = top; y < bottom; y += 1) {
      const t = (y - top) / Math.max(1, bottom - top - 1);
      let index = 0;
      while (index < parsed.length - 2 && t > parsed[index + 1][0]) index += 1;
      const [t0, c0] = parsed[index];
      const [t1, c1] = parsed[index + 1];
      const color = mixRgb(c0, c1, clamp01((t - t0) / Math.max(0.0001, t1 - t0)));
      for (let x = 0; x < this.width; x += 1) this.set(x, y, color);
    }
  }

  /** Nuvens com luz de um lado. */
  clouds({ top = 0, bottom = this.height * 0.5, scale = 60, cover = 0.5, lit = '#ffffff', shade = '#888888', seed = 1, alpha = 0.9, stretch = 3 }) {
    const litRgb = rgb(lit);
    const shadeRgb = rgb(shade);
    for (let y = top; y < bottom; y += 1) {
      const fade = Math.sin(Math.PI * ((y - top) / (bottom - top)));
      for (let x = 0; x < this.width; x += 1) {
        const n = fbm(x / (scale * stretch), y / scale, seed, 5);
        const density = clamp01((n - (1 - cover)) * 3) * fade;
        if (density <= 0) continue;
        const above = fbm(x / (scale * stretch), (y - 3) / scale, seed, 5);
        const light = clamp01(0.5 + (n - above) * 6);
        this.set(x, y, mixRgb(shadeRgb, litRgb, light), density * alpha);
      }
    }
  }

  /** Cordilheira com névoa: quanto mais longe (fog), mais some na cor do céu. */
  ridge({ base, amplitude = 40, frequency = 0.01, seed = 1, color, fogColor = null, fog = 0, rim = null, rimStrength = 0.5, sharp = 1, texture = 0.08, depth = 100 }) {
    const body = rgb(color);
    const fogRgb = fogColor ? rgb(fogColor) : body;
    const rimRgb = rim ? rgb(rim) : null;
    for (let x = 0; x < this.width; x += 1) {
      const n = fbm(x * frequency, seed * 3.1, seed, 5);
      const peak = Math.pow(n, sharp);
      const top = Math.round(base - peak * amplitude);
      for (let y = Math.max(0, top); y < this.height; y += 1) {
        if (depth > this.depth[y * this.width + x]) continue;
        const grain = (fbm(x * 0.15, y * 0.15, seed + 5, 3) - 0.5) * texture;
        let colorHere = mixRgb(body, fogRgb, fog);
        colorHere = colorHere.map((channel) => channel * (1 + grain));
        const fromTop = y - top;
        if (rimRgb && fromTop < 3) colorHere = mixRgb(colorHere, rimRgb, rimStrength * (1 - fromTop / 3));
        // Mais escuro descendo a encosta.
        colorHere = colorHere.map((channel) => channel * (1 - Math.min(0.25, fromTop / 600)));
        this.set(x, y, colorHere);
        this.depth[y * this.width + x] = depth;
      }
    }
  }

  /** Brilho circular suave (luz somada). */
  glow(cx, cy, radius, hex, intensity = 0.6, squash = 1) {
    const color = rgb(hex);
    for (let y = Math.floor(cy - radius * squash); y <= cy + radius * squash; y += 1) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x += 1) {
        const d = Math.hypot((x - cx) / radius, (y - cy) / (radius * squash));
        if (d >= 1) continue;
        this.add(x, y, color, Math.pow(1 - d, 2) * intensity);
      }
    }
  }

  /** Raios de luz saindo de um ponto (luz do sol, do Coração...). */
  rays(cx, cy, { count = 9, length = 200, width = 0.06, hex = '#fff0c0', intensity = 0.25, start = 0, spread = Math.PI * 2, seed = 3 } = {}) {
    const color = rgb(hex);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.hypot(dx, dy);
        if (distance > length || distance < 2) continue;
        let angle = Math.atan2(dy, dx) - start;
        angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (angle > spread) continue;
        const beam = Math.sin((angle / spread) * count * Math.PI + seed);
        const strength = clamp01((beam - (1 - width * 10)) * 4);
        if (strength <= 0) continue;
        this.add(x, y, color, strength * (1 - distance / length) * intensity);
      }
    }
  }

  /** Faixa de névoa horizontal. */
  fog(y, height, hex, alpha = 0.5, seed = 9) {
    const color = rgb(hex);
    for (let py = Math.floor(y - height); py < y + height; py += 1) {
      const band = 1 - Math.abs(py - y) / height;
      for (let x = 0; x < this.width; x += 1) {
        const n = fbm(x / 40, py / 12, seed, 3);
        this.set(x, py, color, clamp01(band) * alpha * (0.5 + n));
      }
    }
  }

  /** Polígono preenchido; fill pode ser cor ou função (x, y) => cor. */
  polygon(points, fill, alpha = 1) {
    const minY = Math.floor(Math.min(...points.map((point) => point[1])));
    const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));
    for (let y = minY; y <= maxY; y += 1) {
      const crossings = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        const scan = y + 0.5;
        if ((y1 <= scan && y2 > scan) || (y2 <= scan && y1 > scan)) crossings.push(x1 + ((scan - y1) * (x2 - x1)) / (y2 - y1));
      }
      crossings.sort((a, b) => a - b);
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        for (let x = Math.round(crossings[index]); x < Math.round(crossings[index + 1]); x += 1) {
          this.set(x, y, typeof fill === 'function' ? fill(x, y) : rgb(fill), alpha);
        }
      }
    }
  }

  rect(x, y, width, height, fill, alpha = 1) {
    this.polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], fill, alpha);
  }

  ellipse(cx, cy, rx, ry, fill, alpha = 1) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y += 1) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x += 1) {
        const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
        if (d <= 1) this.set(x, y, typeof fill === 'function' ? fill(x, y, d) : rgb(fill), alpha);
      }
    }
  }

  /** Esfera iluminada (lua, sol, Coração). */
  sphere(cx, cy, radius, dark, light, { lightDir = [-0.5, -0.6], highlight = '#ffffff' } = {}) {
    const darkRgb = rgb(dark);
    const lightRgb = rgb(light);
    const highlightRgb = rgb(highlight);
    this.ellipse(cx, cy, radius, radius, (x, y) => {
      const nx = (x + 0.5 - cx) / radius;
      const ny = (y + 0.5 - cy) / radius;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const shade = clamp01(-nx * lightDir[0] - ny * lightDir[1] + nz * 0.6);
      const crater = (fbm(x * 0.18, y * 0.18, 77, 3) - 0.5) * 0.25;
      let color = mixRgb(darkRgb, lightRgb, clamp01(shade + crater));
      if (shade > 0.92) color = mixRgb(color, highlightRgb, (shade - 0.92) * 8);
      return color;
    });
  }

  line(x0, y0, x1, y1, hex, thickness = 1, alpha = 1) {
    const color = rgb(hex);
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let step = 0; step <= steps; step += 1) {
      const x = lerp(x0, x1, step / steps);
      const y = lerp(y0, y1, step / steps);
      for (let dy = 0; dy < thickness; dy += 1) for (let dx = 0; dx < thickness; dx += 1) this.set(x + dx - thickness / 2, y + dy - thickness / 2, color, alpha);
    }
  }

  /**
   * Cola um desenho do jogo (PixelCanvas ou quadro de atlas) ampliado, com luz:
   * light = cor que multiplica (noite azulada, fogo alaranjado); rim = contorno de luz.
   */
  sprite(source, x, y, { scale = 2, light = '#ffffff', lightAmount = 1, flip = false, alpha = 1, anchorX = 0.5, anchorY = 1, rim = null, rimSide = 1, silhouette = null } = {}) {
    const lightRgb = rgb(light).map((channel) => channel / 255);
    const rimRgb = rim ? rgb(rim) : null;
    const silhouetteRgb = silhouette ? rgb(silhouette) : null;
    const left = Math.round(x - source.width * scale * anchorX);
    const top = Math.round(y - source.height * scale * anchorY);
    const alphaAt = (sx, sy) => (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height ? 0 : source.data[(sy * source.width + sx) * 4 + 3]);
    for (let sy = 0; sy < source.height; sy += 1) {
      for (let sx = 0; sx < source.width; sx += 1) {
        const ix = flip ? source.width - 1 - sx : sx;
        const index = (sy * source.width + ix) * 4;
        const a = source.data[index + 3] / 255;
        if (a <= 0) continue;
        let color = [source.data[index], source.data[index + 1], source.data[index + 2]];
        color = color.map((channel, c) => lerp(channel, channel * lightRgb[c], lightAmount));
        if (silhouetteRgb) color = silhouetteRgb;
        // Borda iluminada do lado da luz.
        if (rimRgb && alphaAt(ix + (flip ? rimSide : -rimSide), sy) === 0) color = mixRgb(color, rimRgb, 0.65);
        for (let py = 0; py < scale; py += 1) {
          for (let px = 0; px < scale; px += 1) this.set(left + sx * scale + px, top + sy * scale + py, color, a * alpha);
        }
      }
    }
  }

  /** Partículas (brasas, neve, vagalumes). */
  particles(count, { seed = 5, area = [0, 0, this.width, this.height], hex = '#ffffff', size = 1, alpha = 0.9, glowHex = null }) {
    const color = rgb(hex);
    const [ax, ay, aw, ah] = area;
    for (let index = 0; index < count; index += 1) {
      const x = ax + hash2(index, 1, seed) * aw;
      const y = ay + hash2(index, 2, seed) * ah;
      const big = hash2(index, 3, seed) > 0.75 ? size + 1 : size;
      for (let dy = 0; dy < big; dy += 1) for (let dx = 0; dx < big; dx += 1) this.set(x + dx, y + dy, color, alpha);
      if (glowHex) this.glow(x, y, 4 + big * 2, glowHex, 0.35);
    }
  }

  /** Escurece as bordas para concentrar o olhar no centro. */
  vignette(strength = 0.45) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const dx = (x / this.width - 0.5) * 2;
        const dy = (y / this.height - 0.5) * 2;
        const v = 1 - clamp01((dx * dx + dy * dy - 0.35) * strength);
        const index = (y * this.width + x) * 3;
        this.color[index] *= v;
        this.color[index + 1] *= v;
        this.color[index + 2] *= v;
      }
    }
  }

  /** Multiplica tudo por uma cor (noite azulada, entardecer...). */
  grade(hex, amount = 0.3) {
    const tint = rgb(hex).map((channel) => channel / 255);
    for (let index = 0; index < this.color.length; index += 3) {
      for (let c = 0; c < 3; c += 1) this.color[index + c] = lerp(this.color[index + c], this.color[index + c] * tint[c], amount);
    }
  }

  /** Converte para pixel art: poucos tons por canal com dither ordenado. */
  toPixelCanvas(levels = 18) {
    const canvas = new PixelCanvas(this.width, this.height);
    const step = 255 / (levels - 1);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = (y * this.width + x) * 3;
        const threshold = dither(x, y) - 0.5;
        const out = (y * this.width + x) * 4;
        for (let c = 0; c < 3; c += 1) {
          const value = Math.max(0, Math.min(255, this.color[index + c]));
          canvas.data[out + c] = Math.max(0, Math.min(255, Math.round(value / step + threshold * 0.9) * step));
        }
        canvas.data[out + 3] = this.alpha ? (this.alpha[y * this.width + x] > 0.5 ? 255 : 0) : 255;
      }
    }
    return canvas;
  }
}
