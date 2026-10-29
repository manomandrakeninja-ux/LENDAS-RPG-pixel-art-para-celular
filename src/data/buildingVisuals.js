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
// smoke: posição da fumaça da chaminé (relativa ao ponto de apoio do prédio), ou null;
// light: onde fica a luz da noite (porta/janela acesa), relativa ao ponto de apoio;
// labelTop: quantos px abaixo do topo do quadro começa o telhado (o nome fica logo acima da arte).
// Item 19: prédios na escala do herói — estágio 1 144x150, 4 168x176, 8 200x200 (base em 0.84 da altura).
export const BUILDING_VISUALS = Object.freeze({
  campfire: {
    1: { frame: 'campfire-0', animation: 'campfire-loop' },
    4: { frame: 'campfire4-0', animation: 'campfire-loop-4' },
    8: { frame: 'campfire8-0', animation: 'campfire-loop-8' }
  },
  house: {
    1: { frame: 'house-1', light: { x: -8, y: -36 }, labelTop: 0 },
    4: { frame: 'house', light: { x: 0, y: -40 }, labelTop: 4 },
    8: { frame: 'house-8', light: { x: -25, y: -40 }, labelTop: 2 }
  },
  forge: {
    1: { frame: 'forge-1', smoke: { x: -26, y: -124 }, light: { x: -28, y: -20 }, labelTop: 2 },
    4: { frame: 'forge', smoke: { x: 36, y: -144 }, light: { x: -40, y: -20 }, labelTop: 4 },
    8: { frame: 'forge-8', smoke: { x: 51, y: -166 }, light: { x: -12, y: -22 }, labelTop: 2 }
  },
  farm: {
    1: { frame: 'farm-1', light: { x: -30, y: -36 }, labelTop: 17 },
    4: { frame: 'farm', light: { x: 6, y: -40 }, labelTop: 15 },
    8: { frame: 'farm-8', light: { x: 20, y: -44 }, labelTop: 11 }
  },
  market: {
    1: { frame: 'store-1', light: { x: 0, y: -50 }, labelTop: 29 },
    4: { frame: 'store', light: { x: -5, y: -44 }, labelTop: 22 },
    8: { frame: 'store-8', light: { x: 0, y: -44 }, labelTop: 1 }
  },
  // Muralha octogonal: paliçada de toras → pedra com ameias e torres → castelo com torres de telhado azul.
  wall: {
    1: { gate: 'gate-1', segment: 'wallseg-1', corner: 'wallcorner-1' },
    4: { gate: 'gate-4', segment: 'wallseg-4', corner: 'wallcorner-4' },
    8: { gate: 'gate-8', segment: 'wallseg-8', corner: 'wallcorner-8' }
  },
  // Torre de Vigia: plataforma de madeira → torre reforçada → torre imponente com telhado.
  tower: {
    1: { texture: 'tower-1', top: 120 },
    4: { texture: 'tower-stone', top: 156 },
    8: { texture: 'tower-8', top: 138 }
  }
});

/** Aparência de um prédio no nível atual (null se não construído). */
export function buildingVisual(key, level) {
  const stage = visualStage(level);
  return stage === 0 ? null : { stage, ...BUILDING_VISUALS[key]?.[stage] };
}
