import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { PALETTE } from '../src/art/palette.js';

// Valida o atlas de decoração do Vale (flores, pedras, folhas, tufos) SEM alterar arquivo nenhum.
// Regras: art-pro/incoming/vale-decor/README.md. Uso: node scripts/validate-vale-decor.mjs <atlas.png> <atlas.json>
const [pngArg, jsonArg] = process.argv.slice(2);
const errors = [];
const warnings = [];
const stats = {};
const CATEGORIES = { 'flor-': { size: [16, 16], min: 12 }, 'pedra-': { sizes: [[16, 12], [24, 16]], min: 8 }, 'folha-': { size: [16, 16], min: 8 }, 'tufo-': { size: [24, 16], min: 8 } };
const MAX_COLORS = 6;

function finish() {
  for (const message of warnings) console.log(`AVISO  ${message}`);
  for (const message of errors) console.log(`ERRO   ${message}`);
  console.log(JSON.stringify(stats));
  console.log(errors.length ? `REPROVADO: ${errors.length} erro(s), ${warnings.length} aviso(s).` : `APROVADO no validador (${warnings.length} aviso(s)).`);
  process.exit(errors.length ? 1 : 0);
}

if (!pngArg || !jsonArg) {
  console.error('Uso: node scripts/validate-vale-decor.mjs <atlas.png> <atlas.json>');
  process.exit(2);
}
for (const file of [pngArg, jsonArg]) {
  if (!fs.existsSync(path.resolve(file))) errors.push(`Arquivo ausente: ${file} (a arte da decoração ainda não chegou).`);
}
if (errors.length) finish();

const png = PNG.sync.read(fs.readFileSync(path.resolve(pngArg)));
const atlas = JSON.parse(fs.readFileSync(path.resolve(jsonArg), 'utf8'));
const frames = atlas.frames ?? {};
const names = Object.keys(frames);
stats.frames = names.length;
stats.image = `${png.width}x${png.height}`;
if (atlas.meta?.image && atlas.meta.image !== path.basename(pngArg)) warnings.push(`meta.image é "${atlas.meta.image}", mas o arquivo é "${path.basename(pngArg)}".`);

const palette = new Set(PALETTE.map((hex) => hex.toLowerCase().slice(1)));
const counts = {};
const seenKeys = new Map();

for (const name of names) {
  const frame = frames[name].frame;
  const category = Object.keys(CATEGORIES).find((prefix) => name.startsWith(prefix));
  if (!category) { errors.push(`${name}: nome fora das categorias (flor-, pedra-, folha-, tufo-).`); continue; }
  counts[category] = (counts[category] ?? 0) + 1;
  const rule = CATEGORIES[category];
  const allowed = rule.sizes ?? [rule.size];
  if (!allowed.some(([w, h]) => frame.w === w && frame.h === h)) {
    errors.push(`${name}: tamanho ${frame.w}x${frame.h}; o esperado é ${allowed.map(([w, h]) => `${w}x${h}`).join(' ou ')}.`);
    continue;
  }
  if (frame.x < 0 || frame.y < 0 || frame.x + frame.w > png.width || frame.y + frame.h > png.height) {
    errors.push(`${name}: retângulo fora da imagem.`);
    continue;
  }
  const colors = new Set();
  let semi = 0;
  let opaque = 0;
  let offPalette = 0;
  const key = [];
  for (let y = 0; y < frame.h; y += 1) {
    for (let x = 0; x < frame.w; x += 1) {
      const i = ((frame.y + y) * png.width + frame.x + x) * 4;
      const alpha = png.data[i + 3];
      if (alpha !== 0 && alpha !== 255) semi += 1;
      if (alpha === 255) {
        opaque += 1;
        const hex = [png.data[i], png.data[i + 1], png.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
        colors.add(hex);
        if (!palette.has(hex)) offPalette += 1;
      }
      key.push(alpha === 0 ? '-' : [png.data[i], png.data[i + 1], png.data[i + 2], alpha].join(','));
    }
  }
  if (semi) errors.push(`${name}: ${semi} pixel(s) semitransparente(s); a transparência precisa ser binária (0 ou 255).`);
  if (opaque === 0) errors.push(`${name}: sprite totalmente transparente.`);
  if (colors.size > MAX_COLORS) errors.push(`${name}: ${colors.size} cores; o máximo é ${MAX_COLORS} (sem contar a transparência).`);
  if (offPalette) errors.push(`${name}: ${offPalette} pixel(s) fora da paleta-mestre.`);
  const signature = key.join('|');
  if (seenKeys.has(signature)) errors.push(`${name} é idêntico a ${seenKeys.get(signature)}.`);
  else seenKeys.set(signature, name);
}

stats.counts = counts;
for (const [prefix, rule] of Object.entries(CATEGORIES)) {
  const have = counts[prefix] ?? 0;
  if (have < rule.min) errors.push(`Categoria ${prefix}: ${have} sprite(s); o mínimo é ${rule.min}.`);
}
const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
if (total < 36) errors.push(`Total de ${total} sprite(s); o mínimo é 36.`);

finish();
