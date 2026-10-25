// Ataques ao acampamento: no início dos dias 10, 20, 30... um aviso de 30 s e depois as ondas.
export const RAID_CONFIG = Object.freeze({
  everyDays: 10,
  warningSeconds: 30,
  spawnRadius: Object.freeze([470, 580]),
  waves: 3,
  waveIntervalMs: 15000,
  coinsPerTier: 60,
  xpMultiplier: 2,
  buildingAttackRange: 30,
  playerAggroRange: 130,
  warningText: 'ATAQUE IMINENTE! Prepare o acampamento!'
});

export function isRaidDay(day) {
  return day > 0 && day % RAID_CONFIG.everyDays === 0;
}

export function raidTier(day) {
  return Math.max(1, Math.floor(day / RAID_CONFIG.everyDays));
}

/** Composição do ataque: dia 10 e 20 fixos (especificação); do 30 em diante escala com o dia. */
export function raidComposition(day) {
  const tier = raidTier(day);
  if (tier === 1) return { slime: 10, wolf: 5 };
  if (tier === 2) return { skeleton: 15, ghost: 8, werewolf: 3 };
  const extra = tier - 2;
  return {
    skeleton: 15 + 4 * extra,
    ghost: 8 + 2 * extra,
    werewolf: 3 + 2 * extra,
    spider: 3 * extra,
    boar: 2 * extra,
    wolf: 3 + extra
  };
}

/** Chance de cada invasor ser elite: começa no dia 30 e cresce até 50%. */
export function raidEliteChance(day) {
  const tier = raidTier(day);
  return tier < 3 ? 0 : Math.min(0.5, 0.08 * (tier - 2));
}

/** Divide a composição em ondas, alternando os tipos para cada onda ter de tudo um pouco. */
export function splitIntoWaves(composition, waves = RAID_CONFIG.waves) {
  const kinds = [];
  const remaining = { ...composition };
  let added = true;
  while (added) {
    added = false;
    for (const kind of Object.keys(remaining)) {
      if (remaining[kind] > 0) {
        kinds.push(kind);
        remaining[kind] -= 1;
        added = true;
      }
    }
  }
  const result = Array.from({ length: waves }, () => []);
  kinds.forEach((kind, index) => result[index % waves].push(kind));
  return result.filter((wave) => wave.length > 0);
}

export function raidReward(day, raidXp) {
  return {
    coins: RAID_CONFIG.coinsPerTier * raidTier(day),
    xp: Math.round(raidXp * RAID_CONFIG.xpMultiplier)
  };
}
