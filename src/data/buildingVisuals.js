// Evolução visual dos prédios: cada construção tem 3 aparências.
//   níveis 1–3 → estágio 1 (simples), 4–7 → estágio 4 (melhorado), 8+ → estágio 8 (avançado).
// As artes ficam em public/assets/buildings/camp-atlas (geradas por scripts/generate-assets.js);
// as da Muralha e da Torre são desenhadas no jogo (src/game/CampDefense.js).

export const VISUAL_STAGES = Object.freeze([1, 4, 8]);

/** Estágio visual de um nível (0 = não construído). */
export function visualStage(level) {
  const value = Math.floor(Number(level) || 0);
  if (value <= 0) return 0;
  if (value >= 8) return 8;
  if (value >= 4) return 4;
  return 1;
}

// frame: quadro do atlas "buildings"; animation: animação usada no lugar do quadro;
// smoke: posição da fumaça da chaminé (relativa ao ponto de apoio do prédio), ou null.
export const BUILDING_VISUALS = Object.freeze({
  campfire: {
    1: { frame: 'campfire-0', animation: 'campfire-loop' },
    4: { frame: 'campfire4-0', animation: 'campfire-loop-4' },
    8: { frame: 'campfire8-0', animation: 'campfire-loop-8' }
  },
  house: {
    1: { frame: 'house-1' },
    4: { frame: 'house' },
    8: { frame: 'house-8' }
  },
  forge: {
    1: { frame: 'forge-1', smoke: { x: -10, y: -37 } },
    4: { frame: 'forge', smoke: { x: 17, y: -43 } },
    8: { frame: 'forge-8', smoke: { x: 21, y: -62 } }
  },
  farm: {
    1: { frame: 'farm-1' },
    4: { frame: 'farm' },
    8: { frame: 'farm-8' }
  },
  market: {
    1: { frame: 'store-1' },
    4: { frame: 'store' },
    8: { frame: 'store-8' }
  },
  // Muralha octogonal: paliçada de toras → pedra com ameias e torres → castelo com torres de telhado azul.
  wall: {
    1: { gate: 'gate-1', segment: 'wallseg-1', corner: 'wallcorner-1' },
    4: { gate: 'gate-4', segment: 'wallseg-4', corner: 'wallcorner-4' },
    8: { gate: 'gate-8', segment: 'wallseg-8', corner: 'wallcorner-8' }
  },
  // Torre de Vigia: plataforma de madeira → torre reforçada → torre imponente com telhado.
  tower: {
    1: { texture: 'tower-1', top: 40 },
    4: { texture: 'tower-stone', top: 52 },
    8: { texture: 'tower-8', top: 46 }
  }
});

/** Aparência de um prédio no nível atual (null se não construído). */
export function buildingVisual(key, level) {
  const stage = visualStage(level);
  return stage === 0 ? null : { stage, ...BUILDING_VISUALS[key]?.[stage] };
}
