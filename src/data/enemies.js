import ENEMY_DATA from './enemies.json' with { type: 'json' };
import { scaleEnemy } from './enemyScaling.js';

// Atributos, drops e XP de cada espécie ficam em enemies.json.
export const ELITE_CONFIG = {
  chance: {
    day: 0.025,
    night: 0.14
  },
  healthMultiplier: 1.75,
  damageMultiplier: 1.35,
  speedMultiplier: 1.08,
  dropMultiplier: 2,
  xpMultiplier: ENEMY_DATA.eliteXpMultiplier,
  auraColor: 0xffd56b,
  label: 'Elite'
};

export const ENEMY_TYPES = ENEMY_DATA.enemies;

export const ENEMY_TYPE_NAMES = Object.keys(ENEMY_TYPES);

/** XP de um inimigo derrotado: elite vale o dobro. */
export function enemyXp(type, isElite = false, level) {
  const def = ENEMY_TYPES[type];
  const base = def ? scaleEnemy(def, level ?? def.level ?? 1).xp : 0;
  return isElite ? base * ELITE_CONFIG.xpMultiplier : base;
}
