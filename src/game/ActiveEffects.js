import { BUFF_DEFINITIONS } from './BuffSystem.js';

// Lista dos efeitos ativos do herói para o painel perto da barra de vida.

const BUFF_TEXT = {
  wellRested: 'Você dormiu bem na Casa: mais ataque.',
  warmth: 'O calor da Fogueira dá mais ataque.',
  meal: 'A refeição caseira recupera vida aos poucos.',
  elixir: 'O Elixir de Força aumenta ataque e defesa em 20%.',
  dailyAttack: 'Bênção do dia: mais ataque até o fim do dia.',
  dailyDefense: 'Bênção do dia: mais defesa até o fim do dia.',
  dailyHealth: 'Bênção do dia: mais vida máxima até o fim do dia.',
  dailySpeed: 'Bênção do dia: mais velocidade até o fim do dia.'
};
const BUFF_ICON = {
  wellRested: 'Z', warmth: 'F', meal: 'C', elixir: 'E', dailyAttack: 'A', dailyDefense: 'D', dailyHealth: 'V', dailySpeed: 'S'
};

/** "1:05", "45s" ou "" (sem tempo). */
export function formatRemaining(ms) {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '';
  const total = Math.max(0, Math.ceil(ms / 1000));
  if (total >= 60) return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  return `${total}s`;
}

/**
 * Efeitos ativos. Cada item: { id, kind, icon, name, time, description }.
 * Entradas: buffs (BuffSystem.list()), blessed, paralyzedMs, hunt ({progress, label}) e dayCount.
 */
export function collectEffects({ buffs = [], blessed = false, paralyzedMs = 0, hunt = null, dayCount = 0 } = {}) {
  const effects = [];
  if (paralyzedMs > 0) {
    effects.push({ id: 'paralysis', kind: 'bad', icon: '!', name: 'Paralisado', time: formatRemaining(paralyzedMs),
      description: 'Você não anda nem ataca até o efeito passar.' });
  }
  for (const buff of buffs) {
    const definition = BUFF_DEFINITIONS[buff.id];
    if (!definition) continue;
    const time = buff.remainingMs !== null && buff.remainingMs !== undefined
      ? formatRemaining(buff.remainingMs)
      : buff.untilDay !== null && buff.untilDay !== undefined
        ? (buff.untilDay <= dayCount ? 'hoje' : `${buff.untilDay - dayCount + 1} dias`)
        : '';
    effects.push({ id: buff.id, kind: 'buff', icon: BUFF_ICON[buff.id] ?? '+', name: definition.name, time,
      description: BUFF_TEXT[buff.id] ?? definition.name });
  }
  if (blessed) {
    effects.push({ id: 'blessing', kind: 'ward', icon: '*', name: 'Bênção da Fogueira', time: '1x',
      description: 'Na próxima morte, nada da mochila fica para trás. A bênção se gasta.' });
  }
  if (hunt) {
    effects.push({ id: 'hunt', kind: 'hunt', icon: 'X', name: 'Caçada', time: hunt.progress ?? '',
      description: hunt.label ?? 'Caçada ativa.' });
  }
  return effects;
}
