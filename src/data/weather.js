import { createSeededRandom } from './harvestStructures.js';

// Cerca de 1 dia em cada 3 tem chuva durante o período claro (não chove à noite).
export const WEATHER_CONFIG = Object.freeze({
  rainChance: 0.33,
  seed: 0x5eed7a1
});

export function isRainyDay(day) {
  const random = createSeededRandom((WEATHER_CONFIG.seed + Math.max(1, Math.floor(day)) * 7919) >>> 0);
  return random() < WEATHER_CONFIG.rainChance;
}

export function isRaining({ dayCount, isNight }) {
  return !isNight && isRainyDay(dayCount);
}
