// Diretor de encontros de estrada (inspirado no "the road has opinions" do Rowanmark:
// uma pequena aventura a cada 2-4 minutos de estrada, nunca perto de portões/POIs).
// Lógica pura (roda no Node): a cena só spawna inimigos/baús e mostra mensagens.

import { ROADS, pointOnRoad, TILE } from './worldRegions.js';

export const ROAD_ENCOUNTER_FIRST_MS = Object.freeze([55000, 85000]);
export const ROAD_ENCOUNTER_NEXT_MS = Object.freeze([120000, 240000]);
const ROAD_HALF_WIDTH = TILE * 0.8;

export const ROAD_ENCOUNTER_DEFS = Object.freeze([
  Object.freeze({ id: 'ambush', name: 'Emboscada', weight: 3, minLevel: 1 }),
  Object.freeze({ id: 'wounded', name: 'Viajante ferido', weight: 2, minLevel: 1 }),
  Object.freeze({ id: 'guardedChest', name: 'Baú guardado', weight: 2, minLevel: 3 })
]);

export const ROAD_ENCOUNTER_DEFS_BY_ID = Object.freeze(
  Object.fromEntries(ROAD_ENCOUNTER_DEFS.map((d) => [d.id, d]))
);

/**
 * O encontro pode ser disparado?
 * Só na estrada do overworld, longe de POIs/acampamento, fora de caverna/raid,
 * respeitado o cooldown. Se o farol da região está aceso, a chance cai pela metade.
 */
export function shouldFire({ onRoad, nearFeature, nearCamp, underground, raidActive, elapsedMs, nextInMs, regionLit, rng = Math.random }) {
  if (!onRoad || nearFeature || nearCamp || underground || raidActive) return false;
  if (elapsedMs < nextInMs) return false;
  if (regionLit && rng() < 0.5) return false;
  return true;
}

/** Sorteia um tipo de encontro permitido para o nível. */
export function pickDef(playerLevel, rng = Math.random) {
  const level = Math.max(1, Number(playerLevel) || 1);
  const pool = ROAD_ENCOUNTER_DEFS.filter((d) => level >= d.minLevel);
  const total = pool.reduce((sum, d) => sum + d.weight, 0);
  let roll = rng() * total;
  for (const def of pool) {
    roll -= def.weight;
    if (roll <= 0) return def;
  }
  return pool[pool.length - 1];
}

/** Estrada mais próxima do ponto (x, y): { road, t, dist } ou null. */
export function nearestRoad(px, py) {
  let best = null;
  for (const road of ROADS) {
    const points = road.points;
    let total = 0;
    const lengths = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const len = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
      lengths.push(len);
      total += len;
    }
    if (total <= 0) continue;
    let target = 0;
    let bestLocal = Infinity;
    let bestT = 0;
    for (let i = 0; i < lengths.length; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      const lenSq = lengths[i] * lengths[i];
      let t = lenSq === 0 ? 0 : ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const d = Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
      if (d < bestLocal) {
        bestLocal = d;
        bestT = total > 0 ? (target + t * lengths[i]) / total : 0;
      }
      target += lengths[i];
    }
    if (bestLocal < ROAD_HALF_WIDTH && (!best || bestLocal < best.dist)) {
      best = { road, t: bestT, dist: bestLocal };
    }
  }
  return best;
}

/** Ponto da estrada um pouco à frente do parâmetro t (para o encontro acontecer "logo ali"). */
export function spawnPointOnRoad(road, t, ahead = 0.035) {
  return pointOnRoad(road, Math.max(0, Math.min(1, t + ahead)));
}

/** Recompensa de cada tipo de encontro, proporcional ao nível do herói. */
export function rewardsFor(defId, playerLevel, rng = Math.random) {
  const level = Math.max(1, Number(playerLevel) || 1);
  if (defId === 'wounded') {
    return { coins: 10 + Math.floor(rng() * 16) + level, xp: 15 + level * 2, needsFood: true };
  }
  if (defId === 'guardedChest') {
    return { coins: 20 + Math.floor(rng() * 40) + level * 3, xp: 10 + level, guardians: 2 };
  }
  // ambush: a recompensa vem do loot dos inimigos; dá um bônus de XP.
  return { coins: 0, xp: 25 + level * 3, enemies: 2 + Math.min(4, Math.floor(level / 6)) };
}
