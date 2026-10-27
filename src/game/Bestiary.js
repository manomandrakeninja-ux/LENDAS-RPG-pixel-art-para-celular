import { ENEMY_TYPES } from '../data/enemies.js';
import { DUNGEONS, REGION_INFO, REGION_SPAWNS, VALLEY_EXTRA_SPAWNS } from '../data/worldRegions.js';
import { SPAWN_ZONES } from '../data/biomes.js';

// Bestiário: registra cada espécie derrotada e mostra vida, dano, XP, onde vive e o que deixa cair.

/** Onde cada espécie aparece (nomes das regiões e cavernas). */
export function habitatsOf(kind) {
  const places = [];
  const valley = Object.values(SPAWN_ZONES).some((zone) => [...zone.enemies.day, ...zone.enemies.night].includes(kind)) ||
    [...VALLEY_EXTRA_SPAWNS.day, ...VALLEY_EXTRA_SPAWNS.night].includes(kind);
  if (valley) places.push(REGION_INFO.vale.name);
  for (const [region, spawns] of Object.entries(REGION_SPAWNS)) {
    if ([...spawns.day, ...spawns.night].includes(kind)) places.push(REGION_INFO[region].name);
  }
  for (const cave of DUNGEONS) {
    if (cave.monsters.includes(kind)) places.push(cave.name);
    if (cave.boss === kind) places.push(`${cave.name} (último andar)`);
  }
  return [...new Set(places)];
}

/** Ordem do bestiário: comuns primeiro (por nível de perigo), chefes no fim. */
export const BESTIARY_ORDER = Object.keys(ENEMY_TYPES).sort((a, b) => {
  const left = ENEMY_TYPES[a];
  const right = ENEMY_TYPES[b];
  return (left.boss ? 1 : 0) - (right.boss ? 1 : 0) || left.tier - right.tier || left.health - right.health;
});

export class Bestiary {
  constructor(saved = {}) {
    this.kills = {};
    for (const [kind, count] of Object.entries(saved?.kills ?? {})) {
      if (ENEMY_TYPES[kind]) this.kills[kind] = Math.max(0, Math.floor(Number(count) || 0));
    }
  }

  /** Conta um abate; devolve true na primeira vez (espécie nova no bestiário). */
  recordKill(kind) {
    if (!ENEMY_TYPES[kind]) return false;
    const first = !this.kills[kind];
    this.kills[kind] = (this.kills[kind] ?? 0) + 1;
    return first;
  }

  known(kind) {
    return (this.kills[kind] ?? 0) > 0;
  }

  get progress() {
    return { known: BESTIARY_ORDER.filter((kind) => this.known(kind)).length, total: BESTIARY_ORDER.length };
  }

  serialize() {
    return { kills: { ...this.kills } };
  }
}

