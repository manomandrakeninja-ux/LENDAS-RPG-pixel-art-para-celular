// Faróis (Waylights) de cada região — inspirado nos Waylights do Rowanmark:
// acender o farol de uma região dá bônus de XP nela e afasta encontros de estrada.
// Lógica pura (roda no Node).

import { OVERWORLD, REGION_CENTERS, REGION_INFO, terrainAt, BLOCKING, TILE } from './worldRegions.js';

export const WAYLIGHT_BONUS_XP = 0.10;      // +10% XP na região com farol aceso
export const WAYLIGHT_ENCOUNTER_MULT = 0.5; // metade da chance de encontro na estrada

function landSpot(x, y) {
  if (!BLOCKING.has(terrainAt(x, y))) return { x: Math.round(x), y: Math.round(y) };
  for (let i = 1; i <= 20; i += 1) {
    const nx = Math.round(x + i * TILE);
    if (!BLOCKING.has(terrainAt(nx, y))) return { x: nx, y: Math.round(y) };
  }
  return { x: Math.round(x), y: Math.round(y) };
}

function buildWaylights() {
  const regions = ['vale', ...Object.keys(REGION_CENTERS)];
  return Object.freeze(regions.map((region) => {
    const center = region === 'vale'
      ? { x: OVERWORLD.width * 0.13, y: OVERWORLD.height * 0.16 }
      : REGION_CENTERS[region];
    const minLevel = REGION_INFO[region]?.levelRange?.[0] ?? 1;
    const spot = landSpot(center.x + TILE * 2, center.y + TILE);
    return Object.freeze({
      region,
      name: `Farol de ${REGION_INFO[region]?.name ?? region}`,
      x: spot.x,
      y: spot.y,
      cost: Object.freeze({ wood: 10 + minLevel * 2, stone: 6 + minLevel, herbs: 4 })
    });
  }));
}

export const WAYLIGHTS = buildWaylights();
export const WAYLIGHTS_BY_REGION = Object.freeze(Object.fromEntries(WAYLIGHTS.map((w) => [w.region, w])));

export class WaylightTracker {
  constructor(saved = {}) {
    this.lit = new Set(Array.isArray(saved?.lit) ? saved.lit.filter((r) => WAYLIGHTS_BY_REGION[r]) : []);
  }

  isLit(region) { return this.lit.has(region); }

  light(region) {
    if (!WAYLIGHTS_BY_REGION[region] || this.lit.has(region)) return false;
    this.lit.add(region);
    return true;
  }

  get count() { return this.lit.size; }
  get total() { return WAYLIGHTS.length; }

  /** Multiplicador de XP na região (1 ou 1 + bônus). */
  xpMultiplier(region) { return this.isLit(region) ? 1 + WAYLIGHT_BONUS_XP : 1; }

  /** Multiplicador de chance de encontro na estrada da região. */
  encounterMultiplier(region) { return this.isLit(region) ? WAYLIGHT_ENCOUNTER_MULT : 1; }

  serialize() { return { lit: [...this.lit] }; }
}
