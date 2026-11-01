export const AUXILIARY_BUILDINGS = Object.freeze({
  sawmill: {
    name: 'Serraria', icon: 'SR', position: { x: -260, y: -155 },
    levels: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), i < 3 ? 'Corta madeira e organiza toras.' : i < 7 ? 'Aumenta a produção de madeira.' : 'Serraria lendária com produção máxima.']))
  },
  mine: {
    name: 'Mina', icon: 'MN', position: { x: 260, y: -155 },
    levels: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i + 1), i < 3 ? 'Extrai pedra e minério comum.' : i < 7 ? 'Abre novos veios e melhora a extração.' : 'Complexo mineiro lendário com cristais.']))
  }
});

export const AUXILIARY_ORDER = Object.freeze(Object.keys(AUXILIARY_BUILDINGS));
export const auxiliaryLevelDescription = (key, level) => AUXILIARY_BUILDINGS[key]?.levels?.[String(level)] ?? '';

export function auxiliaryUpgradeCost(key, nextLevel) {
  if (!AUXILIARY_BUILDINGS[key] || nextLevel < 1 || nextLevel > 10) return null;
  const wood = 20 + (nextLevel - 1) * 12;
  const stone = 10 + (nextLevel - 1) * 9;
  const iron = nextLevel >= 4 ? 4 + (nextLevel - 4) * 5 : 0;
  return { wood, stone, ...(iron ? { iron } : {}), coins: 15 + (nextLevel - 1) * 12 };
}
