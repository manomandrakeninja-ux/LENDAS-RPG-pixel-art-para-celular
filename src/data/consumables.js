// Itens que podem ser usados a partir da mochila (teclas 1–5 ou toque no slot).
export const CONSUMABLES = Object.freeze({
  potion: Object.freeze({ heal: 50, hotkey: '1' }),
  // Poções mais fortes pedem nível mínimo (como no Berion).
  potionStrong: Object.freeze({ heal: 120, hotkey: '1', level: 8 }),
  potionGreat: Object.freeze({ heal: 250, hotkey: '1', level: 15 }),
  food: Object.freeze({ heal: 12, hotkey: '2' }),
  milk: Object.freeze({ heal: 10, hotkey: '2' }),
  egg: Object.freeze({ heal: 8, hotkey: '2' }),
  torch: Object.freeze({ lightRadiusBonus: 54, durationMs: 120000, hotkey: '3' }),
  staminaPotion: Object.freeze({ stamina: 100, hotkey: '4' }),
  trap: Object.freeze({ trap: true, damage: 40, rootMs: 2500, hotkey: '4' }),
  elixir: Object.freeze({ buff: 'elixir', hotkey: '5' })
});

// Ordem de preferência quando a tecla agrupa vários itens (ex.: "2" = comida).
export const HOTKEY_ITEMS = Object.freeze({
  1: Object.freeze(['potion', 'potionStrong', 'potionGreat']),
  2: Object.freeze(['food', 'milk', 'egg']),
  3: Object.freeze(['torch']),
  4: Object.freeze(['staminaPotion', 'trap']),
  5: Object.freeze(['elixir'])
});

export function isConsumable(type) {
  return Object.hasOwn(CONSUMABLES, type);
}

/** Tempo mínimo entre duas poções de vida (ms). */
export const POTION_COOLDOWN_MS = 1500;

/**
 * Item da tecla. Na tecla 1 (poções) escolhe a menor poção que cura o que falta;
 * se nenhuma basta, a mais forte que o nível permite.
 */
export function itemForHotkey(hotkey, items = {}, { level = Infinity, missingHealth = Infinity } = {}) {
  const usable = (HOTKEY_ITEMS[hotkey] ?? []).filter((type) => (items[type] ?? 0) > 0 && (CONSUMABLES[type]?.level ?? 1) <= level);
  if (String(hotkey) === '1' && usable.length > 1) {
    const sorted = [...usable].sort((a, b) => CONSUMABLES[a].heal - CONSUMABLES[b].heal);
    return sorted.find((type) => CONSUMABLES[type].heal >= missingHealth) ?? sorted[sorted.length - 1];
  }
  return usable[0] ?? null;
}

/**
 * Aplica um consumível. `player` precisa de health, maxHealth, stamina e torchTimer.
 * Não consome o item quando ele não teria efeito (vida ou vigor cheios).
 * Armadilha e elixir são consumidos aqui; o efeito no mundo fica a cargo da cena.
 */
export function useConsumable(type, inventory, player) {
  const definition = CONSUMABLES[type];
  if (!definition) return { ok: false, reason: 'not-consumable' };
  if ((inventory.items[type] ?? 0) < 1) return { ok: false, reason: 'missing' };
  if ((definition.level ?? 1) > (player.level ?? Infinity)) return { ok: false, reason: 'level', level: definition.level };

  if (definition.heal) {
    if (player.health >= player.maxHealth) return { ok: false, reason: 'full-health' };
    const before = player.health;
    player.health = Math.min(player.maxHealth, player.health + definition.heal);
    inventory.remove({ [type]: 1 });
    return { ok: true, type, healed: player.health - before };
  }

  if (definition.stamina) {
    if (player.stamina >= 100) return { ok: false, reason: 'full-stamina' };
    player.stamina = Math.min(100, player.stamina + definition.stamina);
    inventory.remove({ [type]: 1 });
    return { ok: true, type, stamina: definition.stamina };
  }

  if (definition.durationMs) {
    player.torchTimer = definition.durationMs;
    inventory.remove({ [type]: 1 });
    return { ok: true, type, durationMs: definition.durationMs };
  }

  if (definition.trap || definition.buff) {
    inventory.remove({ [type]: 1 });
    return { ok: true, type, trap: Boolean(definition.trap), buff: definition.buff ?? null };
  }

  return { ok: false, reason: 'not-consumable' };
}
