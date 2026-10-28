// Ajustes do esqueleto da mão (heroRig.js) para o cavaleiro e a heroína pintados (scripts/bake-heroes.mjs).
// O balanço do andar está pintado nos quadros (1 px no corpo); as mãos caem nos pontos padrão do rig.
const WALK = { down: { walkBob: [0, -1, 0, -1] }, left: { walkBob: [0, -1, 0, -1] }, right: { walkBob: [0, -1, 0, -1] }, up: { walkBob: [0, -1, 0, -1] } };
export const PAINTED_RIGS = { player: WALK, 'player-female': WALK };
