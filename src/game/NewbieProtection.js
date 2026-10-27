// Proteção de novato: até o nível 5, morrer não tira nada da mochila.
// No nível 6 aparece uma explicação da Bênção e do Amuleto de Proteção.

export const NEWBIE_MAX_LEVEL = 5;
export const NEWBIE_TIP_LEVEL = 6;

export function isNewbieProtected(level) {
  return Math.floor(Number(level) || 1) <= NEWBIE_MAX_LEVEL;
}

/** A dica aparece uma vez, quando o herói passa a ter o nível 6 (vindo de nível menor). */
export function shouldShowWardTip(previousLevel, level) {
  return Math.floor(Number(previousLevel) || 1) < NEWBIE_TIP_LEVEL && Math.floor(Number(level) || 1) >= NEWBIE_TIP_LEVEL;
}

export const WARD_TIP_TITLE = 'FIM DA PROTEÇÃO DE NOVATO';
export const WARD_TIP_TEXT = 'Agora, ao morrer, parte da mochila fica no local. A Bênção da Fogueira ou o Amuleto de Proteção guardam tudo.';
