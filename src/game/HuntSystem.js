// Caçadas do Mestre de Caça (quadro da Fogueira): "Derrote 20 Lobos". Uma ativa por vez.
// Lógica pura (roda no Node); a cena só liga os abates, o save e a tela.
import { ENEMY_TYPES } from '../data/enemies.js';
import { scaleEnemy } from '../data/enemyScaling.js';
import { REGION_INFO, REGION_SPAWNS } from '../data/worldRegions.js';

const VALE_SPECIES = ['rat', 'slime', 'snake', 'bat', 'wolf', 'boar', 'skeleton', 'ghost', 'spider', 'werewolf'];

/** Espécies caçáveis por região (sem chefes). */
export const HUNT_SPECIES = Object.freeze({
  vale: VALE_SPECIES,
  ...Object.fromEntries(Object.entries(REGION_SPAWNS).map(([region, pools]) => [region, [...new Set([...pools.day, ...pools.night])]]))
});

/** Quanto a repetição paga: 100%, 60%, 40% e no mínimo 25%. */
export function repeatMultiplier(times) {
  return Math.max(0.25, [1, 0.6, 0.4][times] ?? 0.25);
}

export function huntId(region, kind) {
  return `${region}:${kind}`;
}

/** Todas as caçadas possíveis: { id, region, kind, level, count }. */
export const HUNTS = Object.freeze(
  Object.entries(HUNT_SPECIES).flatMap(([region, kinds]) => kinds
    .filter((kind) => ENEMY_TYPES[kind])
    .map((kind) => {
      const level = ENEMY_TYPES[kind].level ?? 1;
      return Object.freeze({ id: huntId(region, kind), region, kind, level, count: 8 + Math.min(17, Math.floor(level / 8)) });
    }))
    .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))
);
export const HUNTS_BY_ID = Object.freeze(Object.fromEntries(HUNTS.map((hunt) => [hunt.id, hunt])));

/** Recompensa base (1ª vez), proporcional ao nível da espécie. */
export function huntReward(hunt, times = 0) {
  const scaled = scaleEnemy(ENEMY_TYPES[hunt.kind], hunt.level);
  const multiplier = repeatMultiplier(times);
  return {
    xp: Math.max(1, Math.round(hunt.count * scaled.xp * 0.8 * multiplier)),
    coins: Math.max(1, Math.round(hunt.count * (4 + hunt.level * 1.2) * multiplier))
  };
}

/** Caçadas oferecidas a quem está no nível dado: nem muito fortes, nem triviais. */
export function availableHunts(playerLevel) {
  const level = Math.max(1, Number(playerLevel) || 1);
  const list = HUNTS.filter((hunt) => hunt.level <= level + 6 && hunt.level >= level - 40);
  return list.length > 0 ? list : HUNTS.filter((hunt) => hunt.level <= level + 6).slice(-3);
}

export class HuntSystem {
  constructor(saved) {
    this.active = null; // { id, progress }
    this.done = {}; // id -> vezes entregue
    if (saved && typeof saved === 'object') {
      const hunt = HUNTS_BY_ID[saved.active?.id];
      if (hunt) this.active = { id: hunt.id, progress: Math.max(0, Math.min(hunt.count, Math.floor(Number(saved.active.progress) || 0))) };
      for (const [id, times] of Object.entries(saved.done ?? {})) {
        if (HUNTS_BY_ID[id] && Number(times) > 0) this.done[id] = Math.floor(Number(times));
      }
    }
  }

  get hunt() {
    return this.active ? HUNTS_BY_ID[this.active.id] : null;
  }

  get complete() {
    return Boolean(this.hunt && this.active.progress >= this.hunt.count);
  }

  timesDone(id) {
    return this.done[id] ?? 0;
  }

  accept(id, playerLevel) {
    const hunt = HUNTS_BY_ID[id];
    if (!hunt) return { ok: false, message: 'Caçada desconhecida.' };
    if (this.active) return { ok: false, message: 'Termine ou abandone a caçada atual primeiro.' };
    if (hunt.level > playerLevel + 6) return { ok: false, message: `Muito perigosa: exige nível ${hunt.level - 6}.` };
    this.active = { id, progress: 0 };
    return { ok: true, message: `Caçada aceita: ${this.label()}.` };
  }

  abandon() {
    if (!this.active) return false;
    this.active = null;
    return true;
  }

  /** Um inimigo morreu; devolve true se o contador andou. */
  onKill(kind) {
    const hunt = this.hunt;
    if (!hunt || hunt.kind !== kind || this.complete) return false;
    this.active.progress += 1;
    return true;
  }

  /** Entrega: devolve { ok, xp, coins } e libera para a próxima caçada. */
  turnIn() {
    if (!this.complete) return { ok: false, message: 'A caçada ainda não terminou.' };
    const hunt = this.hunt;
    const reward = huntReward(hunt, this.timesDone(hunt.id));
    this.done[hunt.id] = this.timesDone(hunt.id) + 1;
    this.active = null;
    return { ok: true, ...reward, message: `Caçada entregue: +${reward.xp} XP, +${reward.coins} moedas.` };
  }

  /** "Caçada: Lobo 7/20". */
  label() {
    const hunt = this.hunt;
    if (!hunt) return '';
    return `Caçada: ${ENEMY_TYPES[hunt.kind].name} ${this.active.progress}/${hunt.count}`;
  }

  regionName() {
    return this.hunt ? REGION_INFO[this.hunt.region]?.name ?? this.hunt.region : '';
  }

  serialize() {
    return { active: this.active ? { ...this.active } : null, done: { ...this.done } };
  }
}
