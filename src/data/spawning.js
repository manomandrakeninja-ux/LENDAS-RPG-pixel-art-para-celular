export const SPAWNING_CONFIG = {
  safeZoneRadius: 300,
  activeLimit: {
    day: 18,
    night: 32
  },
  spawnIntervalMs: {
    day: 2200,
    night: 850
  },
  initialCount: {
    day: 8,
    night: 14
  },
  despawnDistance: {
    day: 1500,
    night: 1900
  },
  distanceRings: [
    { min: 340, max: 680, weight: 5 },
    { min: 680, max: 1080, weight: 3 },
    { min: 1080, max: 1320, weight: 1.5 }
  ],
  nightScaling: {
    healthMultiplier: 1.1,
    damageMultiplier: 1.18,
    speedMultiplier: 0.95,
    dropMultiplier: 1.35
  }
};
