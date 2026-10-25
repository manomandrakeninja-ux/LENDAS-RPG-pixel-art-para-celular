import { PixelCanvas } from './pixel.js';

// Equipamento visível no personagem: espada (cor pela arma forjada) e picareta.
// Desenhados com a lâmina/cabeça para cima; o ponto de empunhadura fica embaixo.

export const SWORD_TIERS = {
  rusty: { blade: ['#6f6a62', '#9a9488', '#c4bdb0'], guard: '#6e4628', grip: '#4a2f1e', gem: null },
  iron: { blade: ['#6c7480', '#a7b0b8', '#e4eaee'], guard: '#5a5f66', grip: '#5a3b26', gem: null },
  steel: { blade: ['#5d7590', '#9fc0dc', '#eef6ff'], guard: '#8a96a0', grip: '#2f3e5a', gem: '#5fb8e8' },
  legendary: { blade: ['#8a6a14', '#e8c13a', '#fff6c8'], guard: '#c99a2b', grip: '#5a2f12', gem: '#e05a4f' },
  dragon: { blade: ['#7a1f14', '#d8462b', '#ffb04a'], guard: '#3a2a2a', grip: '#2a1414', gem: '#ffd76b' },
  titan: { blade: ['#5a3d29', '#c86a3a', '#ffd38a'], guard: '#4a3d38', grip: '#2e2624', gem: '#ff8a3d' }
};

/** Espada 8 x 22: lâmina com fio claro, guarda, cabo e pomo. */
export function drawSword(tier = 'rusty') {
  const palette = SWORD_TIERS[tier] ?? SWORD_TIERS.rusty;
  const canvas = new PixelCanvas(8, 22);
  const [dark, mid, light] = palette.blade;
  canvas.rect(3, 1, 2, 14, mid);
  canvas.rect(3, 1, 1, 14, light);
  canvas.rect(5, 2, 1, 13, dark);
  canvas.pixel(3, 0, light);
  canvas.pixel(4, 0, mid);
  canvas.rect(0, 15, 8, 2, palette.guard);
  canvas.rect(0, 15, 8, 1, '#d9c8a0');
  if (palette.gem) canvas.pixel(4, 15, palette.gem);
  canvas.rect(3, 17, 2, 3, palette.grip);
  canvas.rect(2, 20, 4, 2, palette.guard);
  return canvas.outline({ strength: 0.6 });
}

/** Picareta 16 x 18: cabeça curva de metal e cabo de madeira. */
export function drawPickaxe(tier = 'stone') {
  const head = tier === 'iron' ? ['#5d7590', '#9fc0dc', '#eef6ff'] : ['#55595f', '#8d9298', '#cfd0c4'];
  const canvas = new PixelCanvas(16, 18);
  canvas.line(8, 4, 8, 17, '#6e4628');
  canvas.line(9, 4, 9, 17, '#94633a');
  canvas.polygon([[1, 5], [4, 2], [8, 1], [12, 2], [15, 5], [12, 4], [8, 3], [4, 4]], head[1]);
  canvas.line(3, 3, 8, 2, head[2]);
  canvas.line(8, 2, 13, 3, head[2]);
  canvas.pixel(1, 5, head[0]);
  canvas.pixel(15, 5, head[0]);
  canvas.rect(7, 2, 4, 3, '#4a2f1e');
  return canvas.outline({ strength: 0.6 });
}

/** Qual espada mostrar para a arma equipada (receitas do Ferreiro). */
export function swordTierFor(weaponId) {
  if (!weaponId || weaponId === 'simpleSword') return weaponId ? 'iron' : 'rusty';
  if (weaponId === 'ironSword') return 'iron';
  if (weaponId === 'steelSword') return 'steel';
  if (weaponId === 'legendarySword') return 'legendary';
  if (weaponId === 'dragonBlade') return 'dragon';
  if (weaponId === 'titanBlade') return 'titan';
  return 'iron';
}
