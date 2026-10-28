// Biblioteca de pixel art usada pelo gerador de imagens (Node) e pelos inimigos
// desenhados no navegador. Trabalha num buffer RGBA; as cores terminam na paleta-mestre (palette.js).
import { paletteRamp, quantizePixels } from './palette.js';

// Tons da sombra de contato (paleta-mestre): núcleo roxo-escuro e borda azul-ardósia.
const SHADOW_CORE = '#1a1932';
const SHADOW_EDGE = '#2a2f4e';

export function hexToRgb(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16)
  ];
}

export function rgbToHex([red, green, blue]) {
  const part = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  return `#${part(red)}${part(green)}${part(blue)}`;
}

/** Mistura duas cores: t = 0 devolve `a`, t = 1 devolve `b`. */
export function mix(a, b, t) {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex(from.map((value, index) => value + (to[index] - value) * t));
}

// Sombras puxam para o roxo e luzes para o amarelo: dá mais vida que só escurecer.
export const darken = (hex, amount = 0.25) => mix(hex, '#1c1426', amount);
export const lighten = (hex, amount = 0.25) => mix(hex, '#fff6d8', amount);

/** Rampa de 4 tons da paleta-mestre (sombra roxa, base, luz âmbar, brilho) a partir de uma cor base. */
export function ramp(hex) {
  return paletteRamp(hex);
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

/** Ruído determinístico 0..1 por coordenada (mesmo resultado em toda geração). */
export function hash(x, y, seed = 0) {
  let value = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul((seed | 0) + 0x9e3779b9, 0x85ebca6b)) | 0;
  // Mistura final do MurmurHash3: evita listras em linhas e colunas.
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

export const dither = (x, y) => (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;

function colorDistance(a, b) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.hypot(ar - br, ag - bg, ab - bb);
}

/** Saturação simples (máx - mín do RGB, 0..1): separa cinza neutro de cor. */
function satOf(hex) {
  const [red, green, blue] = hexToRgb(hex);
  return (Math.max(red, green, blue) - Math.min(red, green, blue)) / 255;
}

function lumaOf(hex) {
  const [red, green, blue] = hexToRgb(hex);
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
}

export class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  /** Leva todos os pixels para a paleta-mestre (último passo de cada sprite). */
  quantize() {
    quantizePixels(this);
    return this;
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  alphaAt(x, y) {
    return this.inside(x, y) ? this.data[(y * this.width + x) * 4 + 3] : 0;
  }

  colorAt(x, y) {
    const index = (y * this.width + x) * 4;
    return rgbToHex([this.data[index], this.data[index + 1], this.data[index + 2]]);
  }

  pixel(x, y, hex, alpha = 255) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y) || alpha <= 0) return;
    const [red, green, blue] = hexToRgb(hex);
    const index = (y * this.width + x) * 4;
    const destinationAlpha = this.data[index + 3];
    if (alpha >= 255 || destinationAlpha === 0) {
      this.data[index] = red;
      this.data[index + 1] = green;
      this.data[index + 2] = blue;
      this.data[index + 3] = Math.min(255, alpha);
      return;
    }
    const outAlpha = alpha + destinationAlpha * (255 - alpha) / 255;
    const blend = (source, destination) =>
      Math.round((source * alpha + destination * destinationAlpha * (255 - alpha) / 255) / outAlpha);
    this.data[index] = blend(red, this.data[index]);
    this.data[index + 1] = blend(green, this.data[index + 1]);
    this.data[index + 2] = blend(blue, this.data[index + 2]);
    this.data[index + 3] = Math.round(outAlpha);
  }

  clearPixel(x, y) {
    if (!this.inside(x, y)) return;
    this.data.fill(0, (y * this.width + x) * 4, (y * this.width + x) * 4 + 4);
  }

  rect(x, y, width, height, hex, alpha = 255) {
    for (let py = y; py < y + height; py += 1) {
      for (let px = x; px < x + width; px += 1) this.pixel(px, py, hex, alpha);
    }
  }

  line(x0, y0, x1, y1, hex, alpha = 255) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      this.pixel(x0, y0, hex, alpha);
      if (x0 === x1 && y0 === y1) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x0 += sx; }
      if (twice <= dx) { error += dx; y0 += sy; }
    }
  }

  ellipse(cx, cy, rx, ry, hex, alpha = 255) {
    this.forEllipse(cx, cy, rx, ry, (x, y) => this.pixel(x, y, hex, alpha));
  }

  forEllipse(cx, cy, rx, ry, callback) {
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) callback(x, y, nx, ny);
      }
    }
  }

  /**
   * Elipse com volume: luz vindo do alto à esquerda, quatro tons e dither
   * nas transições. `colors` = [sombra, base, luz, brilho].
   */
  shadedEllipse(cx, cy, rx, ry, colors, options = {}) {
    const { light = [-0.55, -0.75], highlight = true } = options;
    const [lx, ly] = light;
    const length = Math.hypot(lx, ly, 0.6);
    this.forEllipse(cx, cy, rx, ry, (x, y, nx, ny) => {
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const value = (-(nx * lx) - (ny * ly) + nz * 0.6) / length;
      const shifted = value + (dither(x, y) - 0.5) * 0.16;
      let tone = 1;
      if (shifted < 0.18) tone = 0;
      else if (shifted > 0.92 && highlight) tone = 3;
      else if (shifted > 0.62) tone = 2;
      this.pixel(x, y, colors[tone]);
    });
  }

  polygon(points, hex, alpha = 255) {
    this.forPolygon(points, (x, y) => this.pixel(x, y, hex, alpha));
  }

  forPolygon(points, callback) {
    const minY = Math.floor(Math.min(...points.map((point) => point[1])));
    const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));
    for (let y = minY; y <= maxY; y += 1) {
      const scan = y + 0.5;
      const crossings = [];
      for (let index = 0; index < points.length; index += 1) {
        const [x1, y1] = points[index];
        const [x2, y2] = points[(index + 1) % points.length];
        if ((y1 <= scan && y2 > scan) || (y2 <= scan && y1 > scan)) {
          crossings.push(x1 + ((scan - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      crossings.sort((a, b) => a - b);
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        for (let x = Math.round(crossings[index]); x < Math.round(crossings[index + 1]); x += 1) callback(x, y);
      }
    }
  }

  /** Sombra suave no chão (semitransparente, não recebe contorno). */
  /**
   * Sombra de contato: elipse de 2 tons roxo-azulados (núcleo mais escuro e opaco, borda mais clara
   * e fraca), da paleta-mestre. Fica sob os pés e a base de personagens, monstros e objetos.
   */
  shadow(cx, cy, rx, ry, alpha = 90) {
    this.forEllipse(cx, cy, rx, ry, (x, y, nx, ny) => {
      const edge = nx * nx + ny * ny > 0.55;
      this.pixel(x, y, edge ? SHADOW_EDGE : SHADOW_CORE, edge ? Math.round(alpha * 0.62) : alpha);
    });
  }

  /**
   * Oclusão na base: escurece as 3 linhas mais baixas de cada coluna que toca o chão (só colunas
   * cuja base está na faixa de baixo do objeto, para copas e beirais suspensos ficarem de fora).
   * O tom vem da sombra da rampa (puxada para roxo), não de preto.
   */
  baseOcclusion({ rows = 3, band = 0.2, solid = 200, strength = [0.85, 0.5, 0.22] } = {}) {
    let top = this.height;
    let bottom = -1;
    const lowest = new Array(this.width).fill(-1);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.alphaAt(x, y) < solid) continue;
        top = Math.min(top, y);
        bottom = y;
        lowest[x] = y;
      }
    }
    if (bottom < 0 || bottom - top < 10) return this;
    const limit = bottom - Math.max(rows, (bottom - top) * band);
    for (let x = 0; x < this.width; x += 1) {
      const base = lowest[x];
      if (base < limit) continue;
      for (let step = 0; step < rows; step += 1) {
        const y = base - step;
        if (this.alphaAt(x, y) < solid) break;
        const color = this.colorAt(x, y);
        this.pixel(x, y, mix(color, ramp(color)[0], strength[step] ?? 0.2));
      }
    }
    return this;
  }

  blit(source, x, y, { flipX = false } = {}) {
    for (let py = 0; py < source.height; py += 1) {
      for (let px = 0; px < source.width; px += 1) {
        const sx = flipX ? source.width - 1 - px : px;
        const from = (py * source.width + sx) * 4;
        const alpha = source.data[from + 3];
        if (alpha === 0) continue;
        const tx = x + px;
        const ty = y + py;
        if (!this.inside(tx, ty)) continue;
        const to = (ty * this.width + tx) * 4;
        if (alpha === 255) {
          this.data.set(source.data.subarray(from, from + 4), to);
        } else {
          this.pixel(tx, ty, rgbToHex([source.data[from], source.data[from + 1], source.data[from + 2]]), alpha);
        }
      }
    }
  }

  /**
   * Contorno seletivo + luz de borda (padrão de todos os sprites).
   * `rim: false` pula a luz de borda (efeitos, peças finas); `rim: 'strong'` reforça a luz nas cores
   * escuras (monstros escuros sobre chão escuro).
   */
  outline({ strength = 0.72, solid = 200, ink = '#140f14', rim = true } = {}) {
    if (rim) this.rimLight({ solid, strong: rim === 'strong' });
    return this.selectiveOutline({ strength, solid, ink });
  }

  /**
   * Contorno de 1 px só na silhueta externa. Embaixo e à direita (lado da sombra) é escuro, o tom
   * vizinho puxado para `ink`; em cima e à esquerda (lado da luz) usa a sombra da rampa local,
   * sem preto, para a forma não parecer recortada.
   */
  selectiveOutline({ strength = 0.72, solid = 200, ink = '#140f14' } = {}) {
    const marks = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.alphaAt(x, y) >= solid) continue;
        // Objeto acima ou à esquerda deste pixel: ele está no lado da sombra.
        const dark = [[0, -1], [-1, 0]].find(([dx, dy]) => this.alphaAt(x + dx, y + dy) >= solid);
        const lit = [[0, 1], [1, 0]].find(([dx, dy]) => this.alphaAt(x + dx, y + dy) >= solid);
        if (dark) {
          marks.push([x, y, mix(this.colorAt(x + dark[0], y + dark[1]), ink, strength)]);
        } else if (lit) {
          const shadow = ramp(this.colorAt(x + lit[0], y + lit[1]))[0];
          marks.push([x, y, mix(shadow, ink, Math.max(0, strength - 0.55))]);
        }
      }
    }
    for (const [x, y, hex] of marks) {
      const index = (y * this.width + x) * 4;
      const [red, green, blue] = hexToRgb(hex);
      this.data[index] = red;
      this.data[index + 1] = green;
      this.data[index + 2] = blue;
      this.data[index + 3] = 255;
    }
    return this;
  }

  /**
   * Luz de borda: 1 px do tom claro da rampa na borda de cima e da esquerda (luz do alto à
   * esquerda), só onde a peça tem 2 px ou mais de espessura. Com `strong`, cores escuras sobem um
   * degrau a mais, para silhuetas escuras se lerem sobre chão escuro.
   */
  rimLight({ solid = 200, strong = false } = {}) {
    const depth = Math.max(1, Math.round(Math.max(this.width, this.height) / 56));
    const marks = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        if (this.alphaAt(x, y) < solid) continue;
        // Sprites grandes (desenhados em grade lógica) ganham borda mais grossa.
        let top = false;
        let left = false;
        for (let step = 1; step <= depth; step += 1) {
          top ||= this.alphaAt(x, y - step) < solid && this.alphaAt(x, y + 1) >= solid;
          left ||= this.alphaAt(x - step, y) < solid && this.alphaAt(x + 1, y) >= solid;
        }
        if (!top && !left) continue;
        // Base: o tom mais claro da área logo para dentro (a borda costuma estar na sombra do desenho).
        const own = this.colorAt(x, y);
        let color = own;
        let luma = lumaOf(color);
        if (luma > 0.82) continue;
        for (let step = 1; step <= 3; step += 1) {
          for (const [dx, dy] of [[step, 0], [0, step], [step, step]]) {
            if (this.alphaAt(x + dx, y + dy) < solid) continue;
            const inner = this.colorAt(x + dx, y + dy);
            const value = lumaOf(inner);
            // Só tons da mesma área (brasas, olhos e detalhes de outra cor ficam de fora).
            if (value > luma && value <= 0.82 && colorDistance(own, inner) < 100) { color = inner; luma = value; }
          }
        }
        const tones = ramp(color);
        let hex = top && left ? tones[3] : tones[2];
        // Muito escuro: a luz da rampa ainda some no chão; sobe mais um degrau.
        if (strong && luma < 0.25) hex = ramp(tones[3])[top && left ? 3 : 2];
        // Rampas de verdes/azuis escuros terminam em cinza neutro: a luz de borda não pode
        // acinzentar uma cor saturada (copas do carvalho antigo e do salgueiro).
        if (satOf(hex) < 0.06 && satOf(color) > 0.12) hex = satOf(tones[2]) >= 0.06 ? tones[2] : color;
        marks.push([x, y, hex]);
      }
    }
    for (const [x, y, hex] of marks) this.pixel(x, y, hex);
    return this;
  }
}
