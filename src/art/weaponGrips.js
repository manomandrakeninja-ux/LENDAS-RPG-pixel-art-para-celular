// Ponto de empunhadura (onde fica a mão) de cada aparência de arma, no sprite 40 x 40 da arma
// (cabo embaixo à esquerda, ponta em cima à direita; 4 px de folga em volta para cabeças largas).
// Usado pelo jogo e por scripts/bake-gear.mjs.
export const WEAPON_SPRITE_SIZE = 40;
export const WEAPON_GRIPS = Object.freeze({
  sword: [11, 28], dagger: [13, 26], sabre: [11, 28], axe: [13, 29], spear: [15, 26], trident: [15, 27],
  club: [13, 29], staff: [15, 26], claw: [16, 27], bow: [19, 20], pickaxe: [13, 27], hatchet: [13, 29]
});
