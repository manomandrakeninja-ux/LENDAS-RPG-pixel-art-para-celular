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

// ---------- Clima por região (mapa grande) ----------
// No mesmo dia chuvoso, cada bioma tem seu próprio clima: neve no gelo, poeira no
// deserto, cinzas na ilha de brasa; caverna fica sempre limpa. À noite, sempre limpo.
export const WEATHER_ICONS = Object.freeze({ rain: '🌧️', snow: '❄️', dust: '🌪️', ash: '🌋', clear: '' });

export function weatherAt(region, { dayCount, isNight }) {
  if (isNight) return 'clear';
  const rainy = isRainyDay(dayCount);
  switch (region) {
    case 'gelo': return rainy ? 'snow' : 'clear';
    case 'areia': return rainy ? 'dust' : 'clear';
    case 'brasa': return rainy ? 'ash' : 'clear';
    case 'caverna': return 'clear';
    default: return rainy ? 'rain' : 'clear'; // vale, antiga, brejo, esmeralda, mar
  }
}
