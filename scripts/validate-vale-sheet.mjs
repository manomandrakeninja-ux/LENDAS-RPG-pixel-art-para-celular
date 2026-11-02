import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PALETTE } from '../src/art/palette.js';

// Valida uma folha de grama/caminho do Vale (384x384, 8x8 quadros de 48 px) SEM alterar arquivo nenhum.
// Layout e regras: art-pro/incoming/vale/README.md. Uso: node scripts/validate-vale-sheet.mjs <folha.png> [--json]
const file = process.argv[2] ?? 'public/assets/tiles/grass-sheet.png';
const asJson = process.argv.includes('--json');
const S = 48;
const COLS = 8;
const USED = 60;
const errors = [];
const warnings = [];
const stats = {};
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const png = PNG.sync.read(fs.readFileSync(path.resolve(file)));
if (png.width !== 384 || png.height !== 384) fail(`Tamanho ${png.width}x${png.height}; o esperado é 384x384 (8x8 quadros de 48 px).`);
function px(frame, x, y) {
  const fx = (frame % COLS) * S + x;
  const fy = Math.floor(frame / COLS) * S + y;
  const i = (fy * png.width + fx) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
}
const diff = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3;

// Linha/coluna de borda de um quadro: edge('top'|'bottom'|'left'|'right').
function edge(frame, side) {
  const out = [];
  for (let k = 0; k < S; k += 1) {
    if (side === 'top') out.push(px(frame, k, 0));
    else if (side === 'bottom') out.push(px(frame, k, S - 1));
    else if (side === 'left') out.push(px(frame, 0, k));
    else out.push(px(frame, S - 1, k));
  }
  return out;
}
const edgeDiff = (a, b) => a.reduce((sum, pixel, k) => sum + diff(pixel, b[k]), 0) / S;

function run() {
  // 1. Opacidade dos quadros usados.
  for (let frame = 0; frame < USED; frame += 1) {
    let clear = 0;
    for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) if (px(frame, x, y)[3] < 255) clear += 1;
    if (clear) fail(`Quadro ${frame}: ${clear} pixels transparentes (grama e caminho precisam ser opacos).`);
  }

  // 2. Referência de continuidade: diferença média entre pixels vizinhos DENTRO dos quadros.
  let inner = 0;
  let count = 0;
  for (let frame = 0; frame < USED; frame += 1) {
    for (let y = 0; y < S; y += 1) {
      for (let x = 0; x < S - 1; x += 1) { inner += diff(px(frame, x, y), px(frame, x + 1, y)); count += 1; }
    }
    for (let y = 0; y < S - 1; y += 1) {
      for (let x = 0; x < S; x += 1) { inner += diff(px(frame, x, y), px(frame, x, y + 1)); count += 1; }
    }
  }
  const baseline = inner / count;
  const limit = Math.max(baseline * 1.6, baseline + 6);
  stats.baseline = Number(baseline.toFixed(2));
  stats.limit = Number(limit.toFixed(2));
  const worst = [];
  const seam = (name, a, aSide, b, bSide) => {
    const score = edgeDiff(edge(a, aSide), edge(b, bSide));
    worst.push({ name, score });
    return score;
  };
  const check = (name, a, aSide, b, bSide) => {
    const score = seam(name, a, aSide, b, bSide);
    if (score > limit) fail(`Emenda ${name}: diferença ${score.toFixed(1)} > limite ${limit.toFixed(1)} (referência interna ${baseline.toFixed(1)}).`);
  };

  // 3. Emendas Wang: dois quadros vizinhos cujos cantos em comum coincidem precisam emendar.
  const corners = (frame) => { const m = frame % 16; return { tl: m & 1, tr: (m >> 1) & 1, bl: (m >> 2) & 1, br: (m >> 3) & 1 }; };
  const wang = [...Array(48).keys()];
  let pairs = 0;
  for (const a of wang) {
    for (const b of wang) {
      const ca = corners(a);
      const cb = corners(b);
      if (ca.tr === cb.tl && ca.br === cb.bl) { check(`Wang horizontal ${a}→${b}`, a, 'right', b, 'left'); pairs += 1; }
      if (ca.bl === cb.tl && ca.br === cb.tr) { check(`Wang vertical ${a}↓${b}`, a, 'bottom', b, 'top'); pairs += 1; }
    }
  }
  stats.wangPairs = pairs;

  // 4. Mesma borda entre miolos: para a mesma máscara, os 3 miolos precisam ter bordas parecidas.
  for (let mask = 0; mask < 16; mask += 1) {
    for (const side of ['top', 'bottom', 'left', 'right']) {
      for (let core = 1; core < 3; core += 1) {
        const score = edgeDiff(edge(mask, side), edge(mask + 16 * core, side));
        if (score > limit) fail(`Máscara ${mask}: borda ${side} do miolo ${core} difere do miolo 0 (${score.toFixed(1)}).`);
      }
    }
  }

  // 5. Caminho: [48..51] esquerdo e [52..55] direito retos; [56..57] e [58..59] fins.
  const straight = (side) => [0, 1, 2, 3].map((v) => 48 + side * 4 + v);
  const ends = (side) => [56 + side * 2, 57 + side * 2];
  const grass0 = [0, 16, 32];
  for (const side of [0, 1]) {
    for (const a of straight(side)) {
      for (const b of straight(side)) check(`Caminho lado ${side} ${a}↓${b}`, a, 'bottom', b, 'top');
      for (const b of ends(side)) check(`Caminho→fim lado ${side} ${a}↓${b}`, a, 'bottom', b, 'top');
    }
    for (const a of ends(side)) for (const g of grass0) check(`Fim lado ${side} ${a}↓grama ${g}`, a, 'bottom', g, 'top');
    for (const a of straight(side).concat(ends(side))) {
      for (const g of grass0) {
        if (side === 0) check(`Grama ${g}→caminho esquerdo ${a}`, g, 'right', a, 'left');
        else check(`Caminho direito ${a}→grama ${g}`, a, 'right', g, 'left');
      }
    }
  }
  // Na mesma linha os dois lados são ambos retos ou ambos fim (o jogo decide por linha).
  for (const a of straight(0)) for (const b of straight(1)) check(`Caminho meio ${a}→${b}`, a, 'right', b, 'left');
  for (const a of ends(0)) for (const b of ends(1)) check(`Caminho meio ${a}→${b}`, a, 'right', b, 'left');

  // 6. Repetição: quadros idênticos entre si reduzem a variação.
  const keys = new Map();
  for (let frame = 0; frame < USED; frame += 1) {
    let key = '';
    for (let y = 0; y < S; y += 1) for (let x = 0; x < S; x += 1) key += px(frame, x, y).join(',') + ';';
    if (keys.has(key)) warn(`Quadros ${keys.get(key)} e ${frame} são idênticos.`); else keys.set(key, frame);
  }

  // 7. Pixel art e paleta: pouca cor por quadro, sem cores fora da paleta-mestre.
  const palette = new Set(PALETTE.map((hex) => hex.toLowerCase()));
  const all = new Set();
  let offPalette = 0;
  let total = 0;
  for (let frame = 0; frame < USED; frame += 1) {
    const colors = new Set();
    for (let y = 0; y < S; y += 1) {
      for (let x = 0; x < S; x += 1) {
        const [r, g, b] = px(frame, x, y);
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        colors.add(hex); all.add(hex); total += 1;
        if (!palette.has(hex)) offPalette += 1;
      }
    }
    if (colors.size > 48) warn(`Quadro ${frame}: ${colors.size} cores (muito para pixel art; esperado até 48).`);
  }
  stats.colors = all.size;
  stats.offPalettePercent = Number(((offPalette / total) * 100).toFixed(1));
  if (all.size > 128) warn(`A folha tem ${all.size} cores; acima de 128 costuma indicar degradê ou blur.`);
  // Contraste de brilho entre a classe 0 e a classe 1 (alvo da v05: 25 a 35). Aviso, não erro: é julgamento visual.
  {
    const tone = (frame, x0, y0) => { let t = 0; for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) { const [r, g, b] = px(frame, x0 + x, y0 + y); t += (r + g + b) / 3; } return t / 64; };
    const avg = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
    const dark = avg([tone(0, 0, 0), tone(0, 40, 0), tone(0, 0, 40), tone(0, 40, 40)]);
    const light = avg([tone(15, 0, 0), tone(15, 40, 0), tone(15, 0, 40), tone(15, 40, 40)]);
    stats.contrast = Number((light - dark).toFixed(1));
    if (stats.contrast < 25 || stats.contrast > 35) warn(`Contraste entre classes Wang é ${stats.contrast} (alvo 25 a 35).`);
  }
  if (stats.offPalettePercent > 0) warn(`${stats.offPalettePercent}% dos pixels fora da paleta-mestre (o importador vai reduzir para ela).`);

  worst.sort((x, y) => y.score - x.score);
  stats.worstSeams = worst.slice(0, 5).map((w) => `${w.name}=${w.score.toFixed(1)}`);
}

function report() {
  if (asJson) {
    console.log(JSON.stringify({ file, ok: errors.length === 0, errors, warnings, stats }, null, 2));
  } else {
    console.log(`Folha: ${file} (${png.width}x${png.height})`);
    for (const [key, value] of Object.entries(stats)) console.log(`  ${key}: ${Array.isArray(value) ? value.join(' | ') : value}`);
    for (const message of warnings) console.log(`AVISO  ${message}`);
    for (const message of errors.slice(0, 40)) console.log(`ERRO   ${message}`);
    if (errors.length > 40) console.log(`ERRO   … e mais ${errors.length - 40}`);
    console.log(errors.length ? `REPROVADA: ${errors.length} erro(s), ${warnings.length} aviso(s).` : `APROVADA no validador (${warnings.length} aviso(s)).`);
  }
  process.exit(errors.length ? 1 : 0);
}

if (!errors.length) run();
report();
