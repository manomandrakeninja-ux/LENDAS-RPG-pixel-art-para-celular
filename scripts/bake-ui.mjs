// Fase 20H: pinta a pele da interface (molduras 9-slice de metal envelhecido e madeira, botões com
// estado pressionado, encaixes, botões redondos de toque, joystick) e os ícones do HUD no pipeline 4x.
// Grava PNGs em src/ui-skin/ (o Vite empacota pelo CSS e por new URL). As molduras saem em 2x (cada pixel da arte = 2x2 na tela),
// prontas para `border-image` no CSS e para `nineslice` no Phaser; os ícones saem em 1x (16 x 16).
// Uso: node scripts/bake-ui.mjs [--preview arquivo.png]
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { PixelCanvas, mix, hash } from '../src/art/pixel.js';
import { bake, twinkle } from './gear-paint/pipeline.mjs';
import { R, path as poly, ellipse, fill, vol, line, lin, gem, clip, hexA } from './gear-paint/kit.mjs';

const OUT = path.resolve('src/ui-skin');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const previewFile = args.includes('--preview') ? args[args.indexOf('--preview') + 1] : null;

// Cores da pele: ouro velho/bronze (paleta-mestre) e o fundo escuro azulado da referência.
const INK = '#0b0a10';
const GOLD = ['#391f21', '#5d2c28', '#8a4836', '#ad7954', '#cba36f', '#f6ca9f'];
const BG = '#14161e';
const BG_DEEP = '#0e0f15';
const WOOD = ['#1c121c', '#2c1a14', '#391f21', '#4e2f22', '#5d3a28', '#6e4630', '#86573a'];
const WINE = ['#1c0e14', '#3b1420', '#571c27', '#6e2230', '#891e2b', '#a8343c'];

/** Escreve um PixelCanvas como PNG, ampliado `scale` vezes sem suavizar. */
function save(name, c, scale = 1) {
  const canvas = createCanvas(c.width * scale, c.height * scale);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(c.width * scale, c.height * scale);
  for (let y = 0; y < img.height; y += 1) {
    for (let x = 0; x < img.width; x += 1) {
      const s = (((y / scale) | 0) * c.width + ((x / scale) | 0)) * 4;
      const d = (y * img.width + x) * 4;
      for (let k = 0; k < 4; k += 1) img.data[d + k] = c.data[s + k];
    }
  }
  ctx.putImageData(img, 0, 0);
  fs.writeFileSync(path.join(OUT, `${name}.png`), canvas.toBuffer('image/png'));
  return { name, c, scale };
}

/** Distância até a borda mais próxima e qual lado é (para luz de cima/esquerda). */
function edgeInfo(x, y, w, h) {
  const d = Math.min(x, y, w - 1 - x, h - 1 - y);
  const lit = (y === d && y <= w - 1 - x) || (x === d && x <= h - 1 - y);
  return { d, lit };
}

/** Cantos arredondados de raio 2 (pixels fora ficam transparentes). */
function cornerCut(x, y, w, h, r = 2) {
  const cx = x < r ? r - x : x > w - 1 - r ? x - (w - 1 - r) : 0;
  const cy = y < r ? r - y : y > h - 1 - r ? y - (h - 1 - r) : 0;
  return cx + cy > r;
}

/** Losango (◆) dourado com contorno, centrado em (cx, cy), raio r. */
function diamond(c, cx, cy, r) {
  for (let y = -r - 1; y <= r + 1; y += 1) {
    for (let x = -r - 1; x <= r + 1; x += 1) {
      const m = Math.abs(x) + Math.abs(y);
      if (m === r + 1) c.pixel(cx + x, cy + y, INK);
      else if (m <= r) {
        const lit = x + y < 0;
        c.pixel(cx + x, cy + y, m === r ? (lit ? GOLD[4] : GOLD[2]) : lit ? GOLD[5] : GOLD[3]);
      }
    }
  }
  c.pixel(cx, cy, '#5d2c28');
  c.pixel(cx - 1, cy - 1, '#fff6d8');
}

/** Moldura dos painéis: metal envelhecido em duas linhas, losangos nos cantos, fundo escuro. */
function panelFrame() {
  const W = 32;
  const c = new PixelCanvas(W, W);
  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (cornerCut(x, y, W, W, 3)) continue;
      const { d, lit } = edgeInfo(x, y, W, W);
      const n = hash(x, y, 7);
      let col;
      if (d === 0) col = INK;
      else if (d === 1) col = lit ? GOLD[3] : GOLD[1];
      else if (d === 2) col = lit ? (n > 0.86 ? GOLD[4] : GOLD[5]) : (n > 0.8 ? GOLD[2] : GOLD[3]);
      else if (d === 3) col = lit ? GOLD[2] : GOLD[1];
      else if (d === 4) col = INK;
      else if (d === 5) col = BG_DEEP;
      else if (d === 6) col = lit ? '#6b5236' : '#4a3828';
      else col = d === 7 ? BG_DEEP : BG;
      // Desgaste: manchas escuras e um toque de pátina no metal.
      if (d >= 1 && d <= 3 && n < 0.07) col = mix(col, '#2d3a2e', 0.45);
      c.pixel(x, y, col);
    }
  }
  for (const [cx, cy] of [[4, 4], [W - 5, 4], [4, W - 5], [W - 5, W - 5]]) diamond(c, cx, cy, 3);
  return c;
}

/** Placa do título: faixa escura com fio dourado e losango à esquerda (como "◆ DETALHES"). */
function titlePlate() {
  const W = 24; const H = 14;
  const c = new PixelCanvas(W, H);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (cornerCut(x, y, W, H, 2)) continue;
      const { d, lit } = edgeInfo(x, y, W, H);
      const col = d === 0 ? INK : d === 1 ? (lit ? GOLD[4] : GOLD[2]) : d === 2 ? '#0f1016' : y < H / 2 ? '#1b1d27' : '#16171f';
      c.pixel(x, y, col);
    }
  }
  return c;
}

/** Botão de madeira com cantoneiras de metal: normal, pressionado ou "primário" (couro vinho). */
function button({ pressed = false, material = 'wood' } = {}) {
  const W = 24;
  const c = new PixelCanvas(W, W);
  const ramp = material === 'wine' ? WINE : material === 'slate' ? ['#0b0c12', '#12131a', '#191b25', '#20232f', '#282b39', '#32364a'] : WOOD;
  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (cornerCut(x, y, W, W, 2)) continue;
      const { d, lit } = edgeInfo(x, y, W, W);
      const n = hash(x, y, 3);
      let col;
      if (d === 0) col = INK;
      else if (d === 1) col = pressed ? (lit ? GOLD[1] : GOLD[3]) : lit ? GOLD[4] : GOLD[2];
      else if (d === 2) col = pressed ? INK : lit ? GOLD[2] : GOLD[1];
      else {
        // Tábuas: veio horizontal contínuo (repete sem emenda) e nós raros.
        const row = y % 8;
        let k = 4;
        if (row === 0) k = 2;
        else if (row === 3 || row === 6) k = n > 0.5 ? 3 : 4;
        else if (row === 1) k = 5;
        if (material !== 'wood') k = row === 0 ? 3 : row === 1 ? 5 : 4;
        if (pressed) k -= 1;
        if (n > 0.95 && material === 'wood') k -= 1;
        col = ramp[Math.max(0, Math.min(ramp.length - 1, k))];
        if (d === 3) col = pressed ? ramp[1] : y < W / 2 ? ramp[6] ?? ramp[5] : ramp[1];
        if (d === 3 && (x === d || x === W - 1 - d) && !pressed) col = x === d ? ramp[5] : ramp[2];
      }
      c.pixel(x, y, col);
    }
  }
  // Cantoneiras: placa de 3x3 em ouro velho com rebite claro.
  for (const [ox, oy] of [[1, 1], [W - 4, 1], [1, W - 4], [W - 4, W - 4]]) {
    for (let y = 0; y < 3; y += 1) for (let x = 0; x < 3; x += 1) c.pixel(ox + x, oy + y, (x + y) < 2 ? GOLD[4] : GOLD[2]);
    c.pixel(ox + 1, oy + 1, pressed ? GOLD[3] : '#fff6d8');
  }
  return c;
}

/** Encaixe dos itens (afundado, com fio de bronze). */
function slot() {
  const W = 16;
  const c = new PixelCanvas(W, W);
  for (let y = 0; y < W; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (cornerCut(x, y, W, W, 1)) continue;
      const { d, lit } = edgeInfo(x, y, W, W);
      const col = d === 0 ? (lit ? '#2a1a12' : GOLD[2]) : d === 1 ? (lit ? INK : '#3a2a20') : d === 2 && lit ? '#0a0a0f' : BG_DEEP;
      c.pixel(x, y, col);
    }
  }
  return c;
}

/** Botão redondo de toque: aro de bronze, miolo pintado (cor) e brilho; versão apertada mais funda. */
function roundButton(ramp, pressed = false, size = 40) {
  const c = new PixelCanvas(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - r; const dy = y + 0.5 - r;
      const dist = Math.hypot(dx, dy);
      if (dist > r) continue;
      const litSide = dx + dy < 0;
      const e = r - dist;
      let col;
      if (e < 1) col = INK;
      else if (e < 2) col = pressed ? (litSide ? GOLD[1] : GOLD[3]) : litSide ? GOLD[5] : GOLD[2];
      else if (e < 3) col = pressed ? GOLD[2] : litSide ? GOLD[4] : GOLD[1];
      else if (e < 4) col = INK;
      else {
        // Miolo: degradê radial com luz no alto à esquerda.
        const t = Math.hypot(dx + r * 0.32, dy + r * 0.38) / (r * 1.25);
        let k = Math.round((1 - Math.min(1, t)) * (ramp.length - 1));
        if (pressed) k = Math.max(0, k - 2);
        col = ramp[Math.max(0, Math.min(ramp.length - 1, k))];
        if (e < 5.2) col = mix(col, INK, pressed ? 0.6 : 0.35);
      }
      c.pixel(x, y, col);
    }
  }
  // Rebites no aro (4 pontos cardeais).
  for (const [ax, ay] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const px = Math.round(r - 0.5 + ax * (r - 2.5)); const py = Math.round(r - 0.5 + ay * (r - 2.5));
    c.pixel(px, py, pressed ? GOLD[3] : '#fff6d8');
  }
  return c;
}

/** Base do joystick (anel com marcas das 4 direções) e o botão do polegar. */
function stickBase(size = 56) {
  const c = new PixelCanvas(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x + 0.5 - r; const dy = y + 0.5 - r;
      const dist = Math.hypot(dx, dy);
      if (dist > r) continue;
      const e = r - dist; const litSide = dx + dy < 0;
      let col; let a = 255;
      if (e < 1) col = INK;
      else if (e < 2) col = litSide ? GOLD[4] : GOLD[2];
      else if (e < 3) col = litSide ? GOLD[2] : GOLD[1];
      else if (e < 4) col = INK;
      else { col = '#0e0f15'; a = 150; }
      c.pixel(x, y, col, a);
    }
  }
  // Setas gravadas.
  for (const [ax, ay] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    for (let k = 0; k < 4; k += 1) {
      const along = r - 7 - k;
      for (let s = -k; s <= k; s += 1) {
        const px = Math.round(r - 0.5 + ax * along + ay * s); const py = Math.round(r - 0.5 + ay * along + ax * s);
        c.pixel(px, py, k === 0 ? GOLD[5] : GOLD[3], 230);
      }
    }
  }
  return c;
}

// ---------- Ícones do HUD (16 x 16, pintados em 4x) ----------
const ICONS = {
  heart(ctx) {
    const p = new ctx.Path2D('M8 14.2 C3.2 10.6 1.2 8 1.6 5.2 C2 2.6 4.6 1.4 6.6 2.8 C7.3 3.3 7.7 3.9 8 4.5 C8.3 3.9 8.7 3.3 9.4 2.8 C11.4 1.4 14 2.6 14.4 5.2 C14.8 8 12.8 10.6 8 14.2 Z');
    vol(ctx, p, R.red, [1.5, 2, 13, 12.5], { lx: 0.28, ly: 0.22, ao: 0.5 });
    fill(ctx, ellipse(ctx, 4.8, 5, 1.4, 1), '#f9c0c4');
    fill(ctx, ellipse(ctx, 4.3, 4.6, 0.6, 0.5), '#ffffff');
  },
  sword(ctx) {
    ctx.save(); ctx.translate(8, 8); ctx.rotate(Math.PI / 4);
    const blade = poly(ctx, [[-1.3, 3], [-1.3, -6], [0, -8.2], [1.3, -6], [1.3, 3]]);
    vol(ctx, blade, R.steel, [-1.4, -8, 2.8, 11], { lx: 0.2, ly: 0.3, ao: 0.2 });
    line(ctx, [[0, 2.5], [0, -6.8]], 0.5, '#ffffff');
    fill(ctx, poly(ctx, [[-4, 3], [4, 3], [4, 4.4], [-4, 4.4]]), R.gold[2]);
    fill(ctx, poly(ctx, [[-4, 3], [4, 3], [4, 3.5], [-4, 3.5]]), R.gold[4]);
    fill(ctx, poly(ctx, [[-0.9, 4.4], [0.9, 4.4], [0.9, 7.2], [-0.9, 7.2]]), R.leather[3]);
    fill(ctx, ellipse(ctx, 0, 7.9, 1.3, 1.1), R.gold[3]);
    ctx.restore();
  },
  shield(ctx) {
    const p = poly(ctx, [[2, 2.2], [8, 1], [14, 2.2], [13.6, 8], [8, 15], [2.4, 8]]);
    vol(ctx, p, R.iron, [2, 1, 12, 14], { ao: 0.35 });
    const inner = poly(ctx, [[4, 3.6], [8, 2.8], [12, 3.6], [11.7, 8], [8, 12.8], [4.3, 8]]);
    vol(ctx, inner, R.blue, [4, 3, 8, 10], { ao: 0.3 });
    line(ctx, [[8, 3.2], [8, 12]], 1.1, R.gold[3]);
    line(ctx, [[4.6, 6.6], [11.4, 6.6]], 1.1, R.gold[3]);
    fill(ctx, ellipse(ctx, 8, 6.6, 1, 1), R.gold[4]);
  },
  coin(ctx) {
    fill(ctx, ellipse(ctx, 8, 8.6, 6.4, 6.2), R.gold[1]);
    vol(ctx, ellipse(ctx, 7.6, 8, 6, 5.9), R.gold, [1.6, 2, 12, 12], { ao: 0.3 });
    fill(ctx, ellipse(ctx, 7.6, 8, 3.9, 3.8), R.gold[2]);
    vol(ctx, ellipse(ctx, 7.8, 8.2, 3.3, 3.3), R.gold, [4.4, 4.8, 6.6, 6.6], { lx: 0.7, ly: 0.75, ao: 0 });
    line(ctx, [[7.6, 5.8], [7.6, 10.4]], 1.2, R.gold[1]);
    fill(ctx, ellipse(ctx, 5, 4.8, 1, 0.8), '#fff6d8');
  },
  ore(ctx) {
    const rock = poly(ctx, [[1.5, 12], [3, 6], [7, 3.2], [11.5, 4.5], [14.5, 9], [13.5, 14], [3.5, 14.6]]);
    vol(ctx, rock, R.gunmetal, [1.5, 3, 13, 11.6], { ao: 0.4 });
    gem(ctx, 6, 8.2, 2, R.lapis);
    gem(ctx, 10.4, 10.4, 1.6, R.gold);
    gem(ctx, 9.6, 6.2, 1.2, R.silver);
  },
  star(ctx) {
    const pts = [];
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI / 5; const rr = i % 2 ? 2.9 : 7;
      pts.push([8 + Math.cos(a) * rr, 8.4 + Math.sin(a) * rr]);
    }
    vol(ctx, poly(ctx, pts), R.violet, [1, 1.4, 14, 14], { ao: 0.3 });
    fill(ctx, ellipse(ctx, 6.8, 6.8, 1.2, 1), '#fdd2ed');
  },
  stamina(ctx) {
    const bolt = poly(ctx, [[9.6, 1], [3.4, 9], [7.4, 9], [6, 15], [12.6, 6.4], [8.6, 6.4]]);
    vol(ctx, bolt, R.gold, [3.4, 1, 9.2, 14], { ao: 0.25 });
  },
  bag(ctx) {
    const body = new ctx.Path2D('M2.5 7 C2.5 5 4 4.2 8 4.2 C12 4.2 13.5 5 13.5 7 L13.8 13 C13.8 14.4 13 15 11.8 15 L4.2 15 C3 15 2.2 14.4 2.2 13 Z');
    vol(ctx, body, R.leather, [2.2, 4.2, 11.6, 10.8], { ao: 0.45 });
    line(ctx, [[5.2, 4.4], [5.4, 2], [10.6, 2], [10.8, 4.4]], 1.1, R.leather[1]);
    fill(ctx, poly(ctx, [[2.6, 6.4], [13.4, 6.4], [12.6, 9.6], [3.4, 9.6]]), R.leather[2]);
    fill(ctx, poly(ctx, [[2.6, 6.4], [13.4, 6.4], [13.2, 7.2], [2.8, 7.2]]), R.leather[4]);
    fill(ctx, poly(ctx, [[7, 8.4], [9, 8.4], [9, 10.8], [7, 10.8]]), R.gold[3]);
    fill(ctx, poly(ctx, [[7.6, 9.2], [8.4, 9.2], [8.4, 10], [7.6, 10]]), R.gold[1]);
  },
  journal(ctx) {
    const cover = poly(ctx, [[3, 1.5], [13, 1.5], [13, 14.5], [3, 14.5]]);
    vol(ctx, cover, R.red, [3, 1.5, 10, 13], { ao: 0.3 });
    fill(ctx, poly(ctx, [[13, 2.4], [14.2, 2.8], [14.2, 14.8], [13, 14.5]]), R.linen[3]);
    fill(ctx, poly(ctx, [[3, 1.5], [4.6, 1.5], [4.6, 14.5], [3, 14.5]]), R.red[1]);
    fill(ctx, poly(ctx, [[6.4, 4.4], [11.4, 4.4], [11.4, 8.4], [6.4, 8.4]]), R.gold[2]);
    fill(ctx, poly(ctx, [[6.9, 4.9], [10.9, 4.9], [10.9, 7.9], [6.9, 7.9]]), R.red[2]);
    fill(ctx, ellipse(ctx, 8.9, 6.4, 1, 1), R.gold[4]);
    line(ctx, [[10, 14.5], [10, 16]], 1, R.gold[3], 'butt');
  },
  map(ctx) {
    const sheet = poly(ctx, [[1.5, 3.5], [5.6, 2], [10.4, 3.5], [14.5, 2], [14.5, 12.5], [10.4, 14], [5.6, 12.5], [1.5, 14]]);
    vol(ctx, sheet, R.linen, [1.5, 2, 13, 12], { ao: 0.3 });
    fill(ctx, poly(ctx, [[5.6, 2], [10.4, 3.5], [10.4, 14], [5.6, 12.5]]), hexA('#cba36f', 0.7));
    line(ctx, [[3, 11], [5, 8.6], [7.4, 9.6], [9.6, 6.6], [12.4, 6]], 0.9, R.red[3]);
    line(ctx, [[11.6, 4.6], [13.2, 6.4]], 0.9, R.red[4]);
    line(ctx, [[13.2, 4.6], [11.6, 6.4]], 0.9, R.red[4]);
  },
  gear(ctx) {
    const pts = [];
    for (let i = 0; i < 16; i += 1) {
      const a = i * Math.PI / 8; const rr = (i % 2 === 0) ? 7 : 5.4;
      pts.push([8 + Math.cos(a - 0.12) * rr, 8 + Math.sin(a - 0.12) * rr], [8 + Math.cos(a + 0.12) * rr, 8 + Math.sin(a + 0.12) * rr]);
    }
    vol(ctx, poly(ctx, pts), R.gold, [1, 1, 14, 14], { ao: 0.35 });
    fill(ctx, ellipse(ctx, 8, 8, 2.4, 2.4), R.gold[0]);
    fill(ctx, ellipse(ctx, 8.4, 8.4, 1.6, 1.6), '#1c121c');
  },
  tent(ctx) {
    const tent = poly(ctx, [[1, 14], [8, 2], [15, 14]]);
    vol(ctx, tent, R.linen, [1, 2, 14, 12], { ao: 0.3 });
    fill(ctx, poly(ctx, [[8, 2], [15, 14], [10.6, 14]]), R.linen[1]);
    fill(ctx, poly(ctx, [[8, 7], [10.4, 14], [5.6, 14]]), R.leather[1]);
    line(ctx, [[8, 2], [8, 0.6]], 0.9, R.wood[3]);
    fill(ctx, poly(ctx, [[8, 0.6], [11, 1.4], [8, 2.2]]), R.red[4]);
  },
  expand(ctx) {
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const cx = 8 - sx * 5; const cy = 8 - sy * 5;
      fill(ctx, poly(ctx, [[cx, cy], [cx + sx * 4.4, cy], [cx + sx * 4.4, cy + sy * 1.6], [cx + sx * 1.6, cy + sy * 1.6], [cx + sx * 1.6, cy + sy * 4.4], [cx, cy + sy * 4.4]]), R.gold[3]);
    }
    fill(ctx, poly(ctx, [[6, 6], [10, 6], [10, 10], [6, 10]]), R.gold[1]);
  },
  boot(ctx) {
    const boot = poly(ctx, [[5, 1.5], [10, 1.5], [10, 9.5], [14.5, 11.2], [14.5, 14.5], [3.6, 14.5], [4.4, 9]]);
    vol(ctx, boot, R.leather, [3.6, 1.5, 11, 13], { ao: 0.35 });
    fill(ctx, poly(ctx, [[4.8, 1.5], [10.2, 1.5], [10.2, 3.6], [4.8, 3.6]]), R.leather[4]);
    fill(ctx, poly(ctx, [[3.6, 13], [14.5, 13], [14.5, 14.5], [3.6, 14.5]]), R.leather[1]);
    for (const y of [5, 7.4, 10]) line(ctx, [[0.6, y + 1], [3, y]], 0.8, '#d5e8ef');
  },
  burst(ctx) {
    const pts = [];
    for (let i = 0; i < 16; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI / 8; const rr = i % 2 ? 3 : (i % 4 ? 5.6 : 7.4);
      pts.push([8 + Math.cos(a) * rr, 8 + Math.sin(a) * rr]);
    }
    vol(ctx, poly(ctx, pts), R.lava, [0.6, 0.6, 14.8, 14.8], { lx: 0.5, ly: 0.5, ao: 0 });
    fill(ctx, ellipse(ctx, 8, 8, 2.6, 2.6), '#ffeb57');
    fill(ctx, ellipse(ctx, 8, 8, 1.3, 1.3), '#ffffff');
  },
  potion(ctx) {
    const flask = new ctx.Path2D('M6.4 1.6 L9.6 1.6 L9.6 5.4 C12.6 6.4 14 8.6 14 10.6 C14 13.4 11.4 15 8 15 C4.6 15 2 13.4 2 10.6 C2 8.6 3.4 6.4 6.4 5.4 Z');
    fill(ctx, flask, R.white[1]);
    clip(ctx, flask, () => {
      vol(ctx, poly(ctx, [[0, 8], [16, 8], [16, 16], [0, 16]]), R.red, [2, 8, 12, 7], { ao: 0.3 });
      fill(ctx, poly(ctx, [[0, 7.6], [16, 7.6], [16, 8.6], [0, 8.6]]), R.red[5]);
    });
    fill(ctx, poly(ctx, [[6, 0.6], [10, 0.6], [10, 2.2], [6, 2.2]]), R.wood[3]);
    fill(ctx, ellipse(ctx, 4.8, 9.4, 0.8, 1.6), hexA('#ffffff', 0.85));
  },
  food(ctx) {
    const meat = new ctx.Path2D('M3 9 C2 5.6 4.6 2.4 8.4 2.6 C12 2.8 13.8 5.8 12.6 9 C11.6 11.6 9 12.6 6.4 12.2 C4.6 11.9 3.5 10.6 3 9 Z');
    vol(ctx, meat, ['#3b1420', '#571c27', '#891e2b', '#bf6f4a', '#e69c69'], [2, 2.6, 11.6, 9.6], { ao: 0.35 });
    line(ctx, [[10.6, 10.6], [13.6, 13.6]], 2, R.bone[4]);
    fill(ctx, ellipse(ctx, 14, 13, 1.3, 1.3), R.bone[5]);
    fill(ctx, ellipse(ctx, 13, 14.2, 1.3, 1.3), R.bone[5]);
    fill(ctx, ellipse(ctx, 6, 5.4, 1.4, 0.9), '#f6ca9f');
  },
  cave(ctx) {
    const hill = new ctx.Path2D('M0.6 15 C1 8 4 3 8 2.6 C12 3 15 8 15.4 15 Z');
    vol(ctx, hill, R.gunmetal, [0.6, 2.6, 14.8, 12.4], { ao: 0.3 });
    const mouth = new ctx.Path2D('M4.4 15 C4.4 10.6 6 8 8 8 C10 8 11.6 10.6 11.6 15 Z');
    fill(ctx, mouth, '#0e071b');
    line(ctx, [[3.6, 15], [4.2, 10], [6.4, 7.4], [9.6, 7.4], [11.8, 10], [12.4, 15]], 0.9, R.gunmetal[5]);
    fill(ctx, poly(ctx, [[1.6, 9], [4, 4.6], [5.4, 6.4]]), hexA('#99e65f', 0.7));
  },
  tower(ctx) {
    const body = poly(ctx, [[4.4, 15], [5, 5], [11, 5], [11.6, 15]]);
    vol(ctx, body, R.bone, [4.4, 5, 7.2, 10], { ao: 0.35 });
    fill(ctx, poly(ctx, [[3.4, 3], [12.6, 3], [12.6, 6], [3.4, 6]]), R.bone[3]);
    for (const x of [3.4, 6.8, 10.2]) fill(ctx, poly(ctx, [[x, 1], [x + 2.4, 1], [x + 2.4, 3.2], [x, 3.2]]), R.bone[4]);
    fill(ctx, poly(ctx, [[7, 10.6], [9, 10.6], [9, 15], [7, 15]]), '#1c121c');
    fill(ctx, poly(ctx, [[7.4, 7], [8.6, 7], [8.6, 8.8], [7.4, 8.8]]), '#ffc825');
  },
  anchor(ctx) {
    line(ctx, [[8, 3.4], [8, 14]], 1.6, R.iron[4]);
    line(ctx, [[2.6, 9.4], [3.6, 12.6], [8, 14.2], [12.4, 12.6], [13.4, 9.4]], 1.5, R.iron[4]);
    line(ctx, [[5, 6], [11, 6]], 1.4, R.iron[3]);
    ctx.save(); ctx.strokeStyle = R.iron[5]; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(8, 2.6, 1.6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    fill(ctx, poly(ctx, [[1.4, 9.8], [3.8, 9], [2.6, 7.6]]), R.iron[4]);
    fill(ctx, poly(ctx, [[14.6, 9.8], [12.2, 9], [13.4, 7.6]]), R.iron[4]);
  },
  skull(ctx) {
    const head = new ctx.Path2D('M2.6 7.4 C2.6 3.6 5 1.6 8 1.6 C11 1.6 13.4 3.6 13.4 7.4 C13.4 9.4 12.4 10.4 11.4 10.8 L11.4 13.6 L4.6 13.6 L4.6 10.8 C3.6 10.4 2.6 9.4 2.6 7.4 Z');
    vol(ctx, head, R.bone, [2.6, 1.6, 10.8, 12], { ao: 0.3 });
    fill(ctx, ellipse(ctx, 5.8, 7.4, 1.6, 1.8), '#1c121c');
    fill(ctx, ellipse(ctx, 10.2, 7.4, 1.6, 1.8), '#1c121c');
    fill(ctx, ellipse(ctx, 5.8, 7.4, 0.6, 0.6), '#ea323c');
    fill(ctx, ellipse(ctx, 10.2, 7.4, 0.6, 0.6), '#ea323c');
    for (const x of [6, 8, 10]) line(ctx, [[x, 11.4], [x, 13.4]], 0.6, '#1c121c', 'butt');
  },
  pick(ctx) {
    line(ctx, [[3, 14], [11.4, 4.6]], 1.6, R.wood[3]);
    const head = new ctx.Path2D('M4.6 3.2 C8 0.6 13 1.6 15 5.6 C12.4 3.8 9.6 3.6 7.4 5 Z');
    vol(ctx, head, R.iron, [4.6, 1, 10.4, 4.6], { ao: 0.2 });
  },
  chest(ctx) {
    const box = poly(ctx, [[1.6, 7], [14.4, 7], [14.4, 14.4], [1.6, 14.4]]);
    vol(ctx, box, R.wood, [1.6, 7, 12.8, 7.4], { ao: 0.35 });
    const lid = new ctx.Path2D('M1.6 7.4 C1.6 3.4 4 2 8 2 C12 2 14.4 3.4 14.4 7.4 Z');
    vol(ctx, lid, R.wood, [1.6, 2, 12.8, 5.4], { ao: 0.2 });
    for (const x of [3.6, 11.4]) fill(ctx, poly(ctx, [[x, 2.6], [x + 1.2, 2.6], [x + 1.2, 14.4], [x, 14.4]]), R.gold[2]);
    fill(ctx, poly(ctx, [[6.8, 6.4], [9.2, 6.4], [9.2, 9.6], [6.8, 9.6]]), R.gold[3]);
    fill(ctx, poly(ctx, [[7.6, 7.6], [8.4, 7.6], [8.4, 8.6], [7.6, 8.6]]), '#1c121c');
  },
  flag(ctx) {
    line(ctx, [[4, 1.4], [4, 15]], 1.3, R.wood[4]);
    const cloth = new ctx.Path2D('M4.6 1.8 C7.6 3.2 9.4 0.8 13.6 2.4 L13.6 8.6 C9.6 7.2 7.6 9.4 4.6 8 Z');
    vol(ctx, cloth, R.red, [4.6, 1, 9, 8.4], { ao: 0.25 });
    fill(ctx, ellipse(ctx, 9, 5, 1.3, 1.3), R.gold[4]);
    fill(ctx, ellipse(ctx, 4, 15, 2.4, 0.8), hexA('#1c121c', 0.6));
  },
  compass(ctx) {
    fill(ctx, ellipse(ctx, 8, 8, 7, 7), R.gold[1]);
    vol(ctx, ellipse(ctx, 8, 8, 6.2, 6.2), R.linen, [1.8, 1.8, 12.4, 12.4], { ao: 0.2 });
    fill(ctx, poly(ctx, [[8, 2.2], [9.6, 8], [6.4, 8]]), R.red[4]);
    fill(ctx, poly(ctx, [[8, 13.8], [9.6, 8], [6.4, 8]]), R.white[2]);
    fill(ctx, ellipse(ctx, 8, 8, 1, 1), R.gold[3]);
  }
};

const results = [];
results.push(save('panel', panelFrame(), 2));
results.push(save('title', titlePlate(), 2));
results.push(save('btn', button(), 2));
results.push(save('btn-down', button({ pressed: true }), 2));
results.push(save('btn-primary', button({ material: 'wine' }), 2));
results.push(save('btn-primary-down', button({ material: 'wine', pressed: true }), 2));
results.push(save('btn-slate', button({ material: 'slate' }), 2));
results.push(save('btn-slate-down', button({ material: 'slate', pressed: true }), 2));
results.push(save('slot', slot(), 2));
const STEEL = ['#0c1626', '#13243a', '#1c3552', '#28496c', '#3a6288', '#5683a8'];
const EMBER = ['#1c0e14', '#3b1420', '#5a1a20', '#7c2420', '#a8381e', '#d0602a'];
results.push(save('round-attack', roundButton(WINE), 2));
results.push(save('round-attack-down', roundButton(WINE, true), 2));
results.push(save('round-dodge', roundButton(STEEL), 2));
results.push(save('round-dodge-down', roundButton(STEEL, true), 2));
results.push(save('round-special', roundButton(EMBER), 2));
results.push(save('round-special-down', roundButton(EMBER, true), 2));
results.push(save('stick-base', stickBase(), 2));
results.push(save('stick-knob', roundButton(['#20232f', '#282b39', '#32364a', '#424c6e', '#657392', '#92a1b9'], false, 24), 2));
results.push(save('diamond', (() => { const c = new PixelCanvas(9, 9); diamond(c, 4, 4, 3); return c; })(), 2));

for (const [name, paint] of Object.entries(ICONS)) {
  const sprite = bake(16, paint);
  if (name === 'coin' || name === 'star') twinkle(sprite, name === 'coin' ? 4 : 6, name === 'coin' ? 4 : 5);
  results.push(save(`icon-${name}`, sprite, 1));
}

if (previewFile) {
  const S = 4; const pad = 8;
  let x = pad; let y = pad; let rowH = 0; const W = 1100;
  const placed = results.map((r) => {
    const w = r.c.width * r.scale * (r.scale === 1 ? S : S / 2); const h = r.c.height * r.scale * (r.scale === 1 ? S : S / 2);
    if (x + w > W) { x = pad; y += rowH + pad; rowH = 0; }
    const at = { r, x, y, w, h }; x += w + pad; rowH = Math.max(rowH, h);
    return at;
  });
  const canvas = createCanvas(W, y + rowH + pad);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a5a3a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const { r, x: px, y: py, w } of placed) {
    const k = w / r.c.width;
    for (let yy = 0; yy < r.c.height; yy += 1) for (let xx = 0; xx < r.c.width; xx += 1) {
      const i = (yy * r.c.width + xx) * 4;
      if (!r.c.data[i + 3]) continue;
      ctx.fillStyle = `rgba(${r.c.data[i]},${r.c.data[i + 1]},${r.c.data[i + 2]},${r.c.data[i + 3] / 255})`;
      ctx.fillRect(px + xx * k, py + yy * k, k, k);
    }
  }
  fs.writeFileSync(path.resolve(previewFile), canvas.toBuffer('image/png'));
}
console.log(`UI: ${results.length} PNGs em ${path.relative(process.cwd(), OUT)}`);
