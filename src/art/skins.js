// Skins novas do herói: Espadachim e Guerreira (capa vinho, azul, verde e preta).
// Os sprites saem das referências do autor por scripts/skins/extract-skins.mjs (recorte, redução por
// moda, paleta própria, contorno e retoques à mão) e ficam em public/assets/characters/player-<id>-sheet.png.
// Folha: 4 direções (baixo, esquerda, direita, cima) x 4 quadros (andando; o quadro 1 é o "parado").

/** Quadro das skins novas: 56 x 64, maior que o cavaleiro (32 x 40), pés na linha 62. */
export const SKIN_FRAME = Object.freeze({ width: 56, height: 64, feet: 62, scale: 1 });

/** Cores da capa da guerreira (as mesmas da folha de referência). */
export const CAPE_COLORS = Object.freeze({
  wine: '#8e1a34',
  blue: '#2e5cc0',
  green: '#3e7a34',
  black: '#2a2a32'
});

/** Definição das skins novas. `id` vira o sufixo da textura (player-<id>). Desde a Fase 22 nenhuma traz arma no desenho. */
export const SKINS = Object.freeze([
  { id: 'swordsman', label: 'Espadachim' },
  ...Object.keys(CAPE_COLORS).map((key) => ({
    id: key === 'wine' ? 'warrior' : `warrior-${key}`,
    label: { wine: 'Guerreira Vinho', blue: 'Guerreira Azul', green: 'Guerreira Verde', black: 'Guerreira Negra' }[key],
    cape: key
  }))
]);

/** Tamanho do quadro da folha de uma textura do herói (skins antigas: 32 x 40). */
export function heroFrameSize(textureKey) {
  void textureKey; // Fase 22: cavaleiro e heroína também são 56 x 64.
  return SKIN_FRAME;
}
