// Aparência do herói: masculino (cavaleiro) ou feminino (heroína). Guardada no save em `hero.gender`.
// Os dois têm as mesmas animações; muda só a folha de sprites.

export const HERO_GENDERS = Object.freeze(['male', 'female']);
export const HERO_LABELS = Object.freeze({ male: 'Cavaleiro', female: 'Heroína' });

export function normalizeGender(value) {
  return HERO_GENDERS.includes(value) ? value : 'male';
}

/** Chave da textura do herói no Phaser. */
export function heroTexture(gender) {
  return normalizeGender(gender) === 'female' ? 'player-female' : 'player';
}

/** Prefixo das animações (player-walk-down ou player-female-walk-down). */
export function heroAnimPrefix(gender) {
  return heroTexture(gender);
}
