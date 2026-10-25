import { BUILDING_DEFS } from '../data/buildings.js';

const HOUSE = BUILDING_DEFS.house;
const CAMPFIRE = BUILDING_DEFS.campfire;

// Buffs temporários do jogador. Cada um dura um tempo (remainingMs) ou até o fim de um dia (untilDay).
export const BUFF_DEFINITIONS = Object.freeze({
  wellRested: { name: 'Bem Descansado', effects: { attackPercent: HOUSE.wellRestedBuff.attackPercent } },
  warmth: { name: 'Calor da Fogueira', effects: { attackPercent: CAMPFIRE.warmthBuff.attackPercent } },
  meal: { name: 'Refeição Caseira', effects: { regenPerSecond: HOUSE.mealBuff.regenPerSecond } },
  elixir: { name: 'Elixir de Força', effects: { attackPercent: 0.2, defensePercent: 0.2 }, durationMs: 300000 },
  dailyAttack: { name: 'Bênção: Ataque', effects: { attack: HOUSE.dailyBuffs.attack.attack } },
  dailyDefense: { name: 'Bênção: Defesa', effects: { defense: HOUSE.dailyBuffs.defense.defense } },
  dailyHealth: { name: 'Bênção: Vida', effects: { maxHealth: HOUSE.dailyBuffs.health.maxHealth } },
  dailySpeed: { name: 'Bênção: Velocidade', effects: { speedPercent: HOUSE.dailyBuffs.speed.speedPercent } }
});

export const DAILY_BUFF_IDS = Object.freeze({
  attack: 'dailyAttack',
  defense: 'dailyDefense',
  health: 'dailyHealth',
  speed: 'dailySpeed'
});

const EMPTY_EFFECTS = Object.freeze({
  attack: 0, defense: 0, attackPercent: 0, defensePercent: 0, maxHealth: 0, speedPercent: 0, regenPerSecond: 0
});

export class BuffSystem {
  constructor(saved = []) {
    this.buffs = new Map();
    for (const entry of Array.isArray(saved) ? saved : []) {
      if (!BUFF_DEFINITIONS[entry?.id]) continue;
      const remainingMs = Number(entry.remainingMs);
      const untilDay = Number(entry.untilDay);
      this.buffs.set(entry.id, {
        remainingMs: Number.isFinite(remainingMs) ? remainingMs : null,
        untilDay: Number.isFinite(untilDay) ? untilDay : null
      });
    }
  }

  /** Aplica (ou renova) um buff. Use durationMs ou untilDay. */
  apply(id, { durationMs = null, untilDay = null } = {}) {
    if (!BUFF_DEFINITIONS[id]) return false;
    const duration = durationMs ?? BUFF_DEFINITIONS[id].durationMs ?? null;
    this.buffs.set(id, { remainingMs: duration, untilDay });
    return true;
  }

  has(id) {
    return this.buffs.has(id);
  }

  remove(id) {
    return this.buffs.delete(id);
  }

  /** Avança o tempo. Devolve true quando algum buff acabou (os atributos precisam ser recalculados). */
  update(deltaMs, dayCount) {
    let changed = false;
    for (const [id, buff] of this.buffs) {
      if (buff.remainingMs !== null) buff.remainingMs -= deltaMs;
      const timedOut = buff.remainingMs !== null && buff.remainingMs <= 0;
      const dayOver = buff.untilDay !== null && dayCount > buff.untilDay;
      if (timedOut || dayOver) {
        this.buffs.delete(id);
        changed = true;
      }
    }
    return changed;
  }

  get effects() {
    const total = { ...EMPTY_EFFECTS };
    for (const id of this.buffs.keys()) {
      for (const [effect, value] of Object.entries(BUFF_DEFINITIONS[id].effects)) total[effect] += value;
    }
    return total;
  }

  list() {
    return [...this.buffs.entries()].map(([id, buff]) => ({ id, name: BUFF_DEFINITIONS[id].name, ...buff }));
  }

  serialize() {
    return [...this.buffs.entries()].map(([id, buff]) => ({
      id,
      remainingMs: buff.remainingMs === null ? null : Math.round(buff.remainingMs),
      untilDay: buff.untilDay
    }));
  }
}
