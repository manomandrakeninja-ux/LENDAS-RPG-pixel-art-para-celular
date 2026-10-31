// Gera um pôster da aba "Skills" do diário (L → Registros) para a pasta SUPER ATUALIZAÇÃO.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILLS, SKILL_MAX_LEVEL, skillLevelForXp, skillXpForLevel } from '../../src/data/skills.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'SUPER ATUALIZAÇÃO');
fs.mkdirSync(outDir, { recursive: true });
const outName = process.argv[2] ?? '05-skills-por-uso.png';

// Níveis de exemplo (como um jogador de meio de jogo ficaria).
const demoXp = { blade: 50 * 12 * 12 + 300, archery: 50 * 7 * 7 + 120, dodge: 50 * 9 * 9, block: 50 * 4 * 4 + 80 };

const width = 900;
const height = 560;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fundo pergaminho escuro
ctx.fillStyle = '#1d1712';
ctx.fillRect(0, 0, width, height);
const grad = ctx.createLinearGradient(0, 0, 0, height);
grad.addColorStop(0, '#2a2118');
grad.addColorStop(1, '#1d1712');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, width, height);

ctx.fillStyle = '#c9a76b';
ctx.fillRect(40, 36, width - 80, 3);
ctx.fillStyle = '#f6ca9f';
ctx.font = 'bold 26px sans-serif';
ctx.textAlign = 'left';
ctx.fillText('DIÁRIO (L) → REGISTROS → SKILLS', 40, 30 + 42);
ctx.font = '14px sans-serif';
ctx.fillStyle = '#cbb489';
ctx.fillText('Treinam com o uso em combate — estilo Skyrim', 40, 104);

let y = 150;
for (const [key, def] of Object.entries(SKILLS)) {
  const xp = demoXp[key];
  const level = skillLevelForXp(xp);
  const maxed = level >= SKILL_MAX_LEVEL;
  const current = skillXpForLevel(level);
  const next = skillXpForLevel(level + 1);
  const pct = maxed ? 1 : (xp - current) / Math.max(1, next - current);

  ctx.fillStyle = '#f4e6c6';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`${def.icon}  ${def.name}`, 60, y);
  ctx.fillStyle = '#ffd76b';
  ctx.textAlign = 'right';
  ctx.fillText(maxed ? `Nv ${level} (MÁX)` : `Nv ${level}  •  ${xp}/${next} XP`, width - 60, y);
  ctx.textAlign = 'left';

  // barra
  ctx.fillStyle = 'rgba(20,16,14,0.8)';
  ctx.fillRect(60, y + 10, width - 120, 16);
  const barGrad = ctx.createLinearGradient(60, 0, width - 60, 0);
  barGrad.addColorStop(0, '#8a5fd0');
  barGrad.addColorStop(1, '#c86bff');
  ctx.fillStyle = barGrad;
  ctx.fillRect(60, y + 10, (width - 120) * Math.max(0, Math.min(1, pct)), 16);
  ctx.strokeStyle = '#6b4a2a';
  ctx.strokeRect(60.5, y + 10.5, width - 121, 15);

  ctx.fillStyle = '#cbb489';
  ctx.font = '13px sans-serif';
  ctx.fillText(def.desc, 60, y + 48);
  y += 92;
}

ctx.fillStyle = '#c9a76b';
ctx.fillRect(40, height - 46, width - 80, 2);
ctx.fillStyle = '#cbb489';
ctx.font = '12px sans-serif';
ctx.fillText('Bônus: Lâmina +2%/nv dano • Arco +2%/nv • Esquiva −vigor/+iframes • Bloqueio +1 DEF/nv', 40, height - 24);

const file = path.join(outDir, outName);
fs.writeFileSync(file, canvas.toBuffer('image/png'));
console.log(`Foto salva: ${file} (${width}×${height})`);
