// Chefes de missão da campanha: variantes pintadas dos monstros base.
// Lobo Cinzento (missão "O Uivo do Primeiro Monstro"): o lobo repintado, mais escuro, com cicatriz
// no focinho e no flanco e olhos vermelhos brilhando. Mesmo pipeline das Notas (bake-monsters.mjs).
import { P, ell, fill, glow, hexA, stroke } from './kit.mjs';
import { wolf } from './lote1.mjs';

function wolfBoss(ctx, f, o) {
  wolf(ctx, f, o);
  // Escurece só o que já foi pintado (pelagem cinza-azulada vira quase carvão).
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = hexA('#0e071b', 0.5);
  ctx.fillRect(0, 0, 64, 64);
  ctx.restore();
  // Mesma transformação do lobo base para alinhar cicatrizes e olhos.
  const at = o.attack;
  const ph = (f % 4) * Math.PI / 2;
  const bob = at ? -1.5 : Math.cos(ph * 2) * 0.8;
  ctx.save();
  ctx.translate(at ? 3 : 0, bob);
  if (at) { ctx.translate(36, 34); ctx.rotate(-0.1); ctx.translate(-36, -34); }
  // Cicatriz no flanco e no rosto.
  stroke(ctx, [[27, 25], [30, 30], [34, 36]], 1.1, '#c7cfdd');
  stroke(ctx, [[29, 25.5], [32, 31], [36, 36]], 0.7, '#c7cfdd');
  stroke(ctx, [[54.6, 14.8], [53.6, 19], [55, 23.4]], 1, '#f68187');
  stroke(ctx, [[54.6, 14.8], [53.6, 19], [55, 23.4]], 0.4, '#ffffff');
  // Olho vermelho brilhando.
  glow(ctx, 56.1, 19.5, 4, '#ff3b2a', { core: '#ffd0a0', alpha: 0.9 });
  fill(ctx, P(ctx, 'M54,19.4 C55.2,18.4 57,18.5 57.8,19.6 C56.8,20.6 55.2,20.6 54,19.4 Z'), '#ff4a2e');
  fill(ctx, ell(ctx, 56.1, 19.5, 0.6, 0.7), '#ffe27a');
  // Olho do outro lado (atrás), menor.
  glow(ctx, 50.6, 18.6, 2.4, '#ff3b2a', { alpha: 0.7 });
  ctx.restore();
}

export const MONSTERS_4 = {
  wolfBoss: { size: 112, elite: 112, shadow: [34, 58.5, 26, 3.4], paint: wolfBoss }
};
