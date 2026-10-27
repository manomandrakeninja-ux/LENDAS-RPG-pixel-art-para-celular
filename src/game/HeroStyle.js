// Aparência do herói: masculino (cavaleiro) ou feminino (heroína). Guardada no save em `hero.gender`.
// Os dois têm as mesmas animações; muda só a folha de sprites.

export const HERO_GENDERS = Object.freeze(['male', 'female']);
// Skins: as duas primeiras são as da escolha inicial; as demais são as novas (src/art/skins.js).
export const HERO_SKINS = Object.freeze(['male', 'female', 'swordsman', 'warrior', 'warrior-blue', 'warrior-green', 'warrior-black']);
export const HERO_LABELS = Object.freeze({
  male: 'Cavaleiro',
  female: 'Heroína',
  swordsman: 'Espadachim',
  warrior: 'Guerreira Vinho',
  'warrior-blue': 'Guerreira Azul',
  'warrior-green': 'Guerreira Verde',
  'warrior-black': 'Guerreira Negra'
});

export function normalizeGender(value) {
  return HERO_SKINS.includes(value) ? value : 'male';
}

/** Chave da textura do herói no Phaser. */
export function heroTexture(gender) {
  const skin = normalizeGender(gender);
  return skin === 'male' ? 'player' : `player-${skin}`;
}

/** Prefixo das animações (player-walk-down ou player-female-walk-down). */
export function heroAnimPrefix(gender) {
  return heroTexture(gender);
}
