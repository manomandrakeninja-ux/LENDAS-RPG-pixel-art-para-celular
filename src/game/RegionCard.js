import { ENEMY_TYPES } from '../data/enemies.js';
import { CAVES, DOCKS, OVERWORLD, REGION_INFO, REGION_SPAWNS, VALLEY_EXTRA_SPAWNS, regionAt } from '../data/worldRegions.js';
import { SPAWN_ZONES } from '../data/biomes.js';

// Cartão da região no mapa grande: nome, faixa de nível, monstros, cavernas e portos.

function monsterKinds(region) {
  if (region === 'vale') {
    const kinds = [...VALLEY_EXTRA_SPAWNS.day, ...VALLEY_EXTRA_SPAWNS.night];
    for (const zone of Object.values(SPAWN_ZONES)) kinds.push(...(zone.enemies.day ?? []), ...(zone.enemies.night ?? []));
    return kinds;
  }
  const spawns = REGION_SPAWNS[region];
  return spawns ? [...spawns.day, ...spawns.night] : [];
}

/** Dados do cartão de uma região (ou null para o mar e o subterrâneo). */
export function regionCard(region) {
  const info = REGION_INFO[region];
  if (!info || region === 'mar' || region === 'caverna') return null;
  const monsters = [...new Set(monsterKinds(region))]
    .filter((kind) => ENEMY_TYPES[kind])
    .map((kind) => ENEMY_TYPES[kind].name ?? kind);
  return {
    region,
    name: info.name,
    levels: info.levels,
    banner: info.banner,
    monsters,
    caves: CAVES.filter((cave) => cave.region === region).map((cave) => cave.name),
    docks: DOCKS.filter((dock) => dock.region === region).map((dock) => dock.name)
  };
}

/** Cartão do ponto (x, y) do mundo, ou null se for mar. */
export function regionCardAt(x, y) {
  if (y >= OVERWORLD.height) return null;
  return regionCard(regionAt(x, y));
}
