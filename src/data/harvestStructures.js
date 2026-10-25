import { MINE_CONFIG } from './buildingSystems.js';

export const HARVEST_STRUCTURE_TYPES = {
  tree: {
    label: 'Árvore',
    count: 32,
    rewardType: 'wood',
    rewardAmount: [2, 4],
    regrowDays: 2,
    nightOnly: false
  },
  rock: {
    label: 'Rocha',
    count: 22,
    rewardType: 'stone',
    rewardAmount: [2, 3],
    regrowDays: 3,
    nightOnly: false,
    requiresPickaxe: true
  },
  stone: {
    label: 'Pedra',
    count: 24,
    rewardType: 'stone',
    rewardAmount: [2, 4],
    regrowDays: 2,
    nightOnly: false,
    requiresPickaxe: false
  },
  herbBush: {
    label: 'Arbusto de ervas',
    count: 26,
    rewardType: 'herbs',
    rewardAmount: [1, 2],
    regrowDays: 1,
    nightOnly: false
  },
  mushroom: {
    label: 'Cogumelo',
    count: 16,
    rewardType: 'food',
    rewardAmount: [1, 3],
    regrowDays: 0,
    nightOnly: true
  },
  chest: {
    label: 'Baú',
    count: 8,
    rewardType: null,
    rewardAmount: null,
    regrowDays: 0,
    nightOnly: false
  },
  oreVein: {
    label: 'Veio de ferro',
    count: 18,
    rewardType: 'iron',
    rewardAmount: [2, 4],
    regrowDays: 4,
    nightOnly: false,
    requiresPickaxe: true,
    minCampDistance: 600,
    maxCampDistance: 1300
  },
  coalVein: {
    label: 'Veio de carvão',
    count: 0,
    rewardType: 'coal',
    rewardAmount: [2, 4],
    regrowDays: 3,
    nightOnly: false,
    requiresPickaxe: true
  },
  goldVein: {
    label: 'Veio de ouro',
    count: 0,
    rewardType: 'gold',
    rewardAmount: [1, 2],
    regrowDays: 5,
    nightOnly: false,
    requiresPickaxe: true
  },
  mineMarker: {
    label: 'Mina',
    count: 1,
    rewardType: null,
    rewardAmount: null,
    regrowDays: 0,
    nightOnly: false,
    poi: true
  }
};

export const CHEST_LOOT_RECIPES = [
  { wood: 5, stone: 3 },
  { herbs: 4, food: 3 },
  { moonherb: 2, herbs: 3 },
  { bone: 3, stone: 4 },
  { ectoplasm: 2, wood: 4 },
  { silk: 2, herbs: 3 },
  { food: 6, wood: 3 },
  { stone: 6, bone: 2 }
];

export const HARVEST_STRUCTURE_INTERACTION_RANGE = 72;
export const HARVEST_STRUCTURE_SEED = 0x8f31a27c;

export function createSeededRandom(seed = HARVEST_STRUCTURE_SEED) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInteger(random, minimum, maximum) {
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInteger(random, 0, index);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function sanitizeLoot(loot) {
  if (!loot || typeof loot !== 'object' || Array.isArray(loot)) return null;
  const sanitized = {};
  for (const [type, amount] of Object.entries(loot)) {
    const normalized = Math.max(0, Math.floor(Number(amount) || 0));
    if (normalized > 0) sanitized[type] = normalized;
  }
  return Object.keys(sanitized).length > 0 ? sanitized : null;
}

export class HarvestStructureState {
  constructor({
    saved = [],
    dayCount = 1,
    rewardRandom = Math.random,
    world
  } = {}) {
    this.rewardRandom = rewardRandom;
    this.world = world;
    this.structures = [];
    this.generate();
    this.applySaved(saved);
    this.refreshAvailability(dayCount);
  }

  generate() {
    const random = createSeededRandom();
    const recipes = shuffle(CHEST_LOOT_RECIPES, random);
    for (const [type, definition] of Object.entries(HARVEST_STRUCTURE_TYPES)) {
      for (let index = 0; index < definition.count; index += 1) {
        const position = type === 'mineMarker'
          ? { x: MINE_CONFIG.x, y: MINE_CONFIG.y }
          : this.findPosition(random, definition);
        this.structures.push({
          id: `${type}-${index}`,
          type,
          x: position.x,
          y: position.y,
          available: true,
          readyDay: null,
          harvestedDay: null,
          collected: false,
          discovered: false,
          loot: type === 'chest' ? { ...recipes[index % recipes.length] } : null
        });
      }
    }
    this.generateMineVeins(random);
  }

  generateMineVeins(random) {
    const ironCount = randomInteger(random, MINE_CONFIG.ironVeins[0], MINE_CONFIG.ironVeins[1]);
    const coalCount = randomInteger(random, MINE_CONFIG.coalVeins[0], MINE_CONFIG.coalVeins[1]);
    // O sorteio é mantido para não mudar a posição dos outros veios em saves antigos.
    random();
    const goldCount = MINE_CONFIG.goldVeins;
    const groups = [
      { type: 'oreVein', count: ironCount },
      { type: 'coalVein', count: coalCount },
      { type: 'goldVein', count: goldCount }
    ];
    for (const group of groups) {
      for (let index = 0; index < group.count; index += 1) {
        const position = this.findMinePosition(random);
        this.structures.push({
          id: `mine-${group.type}-${index}`,
          type: group.type,
          x: position.x,
          y: position.y,
          available: true,
          readyDay: null,
          harvestedDay: null,
          collected: false,
          discovered: false,
          loot: null
        });
      }
    }
  }

  findMinePosition(random) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 34 + random() * (MINE_CONFIG.radius - 34);
      const x = MINE_CONFIG.x + Math.cos(angle) * radius;
      const y = MINE_CONFIG.y + Math.sin(angle) * radius;
      if (this.structures.some((structure) => Math.hypot(x - structure.x, y - structure.y) < 28)) continue;
      return { x, y };
    }
    return { x: MINE_CONFIG.x + 48, y: MINE_CONFIG.y + 48 };
  }

  findPosition(random, definition = {}) {
    const width = this.world?.width ?? 2880;
    const height = this.world?.height ?? 2160;
    const camp = this.world?.camp ?? { x: 1440, y: 1080 };
    const minimumDistance = definition.minCampDistance ?? 240;
    const maximumDistance = definition.maxCampDistance ?? Infinity;
    let fallback = { x: camp.x + minimumDistance, y: camp.y + 120 };
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = minimumDistance + random() * Math.max(1, maximumDistance - minimumDistance);
      const x = Math.max(64, Math.min(width - 64, camp.x + Math.cos(angle) * distance));
      const y = Math.max(82, Math.min(height - 82, camp.y + Math.sin(angle) * distance));
      const campDistance = Math.hypot(x - camp.x, y - camp.y);
      if (campDistance < minimumDistance || campDistance > maximumDistance) continue;
      if (this.structures.some((structure) => Math.hypot(x - structure.x, y - structure.y) < 64)) {
        continue;
      }
      return { x, y };
    }
    fallback.x = Math.min(width - 64, fallback.x);
    fallback.y = Math.min(height - 82, fallback.y);
    return fallback;
  }

  applySaved(saved) {
    if (!Array.isArray(saved)) return;
    const savedById = new Map(saved.map((entry) => [entry?.id, entry]));
    for (const structure of this.structures) {
      const persisted = savedById.get(structure.id);
      if (!persisted || persisted.type !== structure.type) continue;
      if (Number.isFinite(Number(persisted.x))) structure.x = Number(persisted.x);
      if (Number.isFinite(Number(persisted.y))) structure.y = Number(persisted.y);
      structure.collected = Boolean(persisted.collected);
      structure.discovered = Boolean(persisted.discovered);
      structure.harvestedDay = Number.isFinite(Number(persisted.harvestedDay))
        ? Math.max(1, Math.floor(Number(persisted.harvestedDay)))
        : null;
      structure.readyDay = Number.isFinite(Number(persisted.readyDay))
        ? Math.max(1, Math.floor(Number(persisted.readyDay)))
        : null;
      structure.available = persisted.available !== false;
      const loot = sanitizeLoot(persisted.loot);
      if (loot) structure.loot = loot;
    }
  }

  refreshAvailability(dayCount) {
    const currentDay = Math.max(1, Math.floor(Number(dayCount) || 1));
    for (const structure of this.structures) {
      const definition = HARVEST_STRUCTURE_TYPES[structure.type];
      if (definition.poi) {
        structure.available = true;
        continue;
      }
      if (structure.type === 'chest') {
        structure.available = !structure.collected;
        continue;
      }
      if (definition.nightOnly) {
        structure.available = !(structure.harvestedDay !== null && structure.harvestedDay >= currentDay);
        continue;
      }
      structure.available = structure.readyDay === null || currentDay >= structure.readyDay;
    }
  }

  handleDayChange(dayCount) {
    const currentDay = Math.max(1, Math.floor(Number(dayCount) || 1));
    const regenerated = [];
    for (const structure of this.structures) {
      const wasAvailable = structure.available;
      const definition = HARVEST_STRUCTURE_TYPES[structure.type];
      if (definition.poi) {
        structure.available = true;
      } else if (structure.type === 'chest') {
        structure.available = !structure.collected;
      } else if (definition.nightOnly) {
        structure.available = true;
        structure.harvestedDay = null;
      } else if (structure.readyDay !== null && currentDay >= structure.readyDay) {
        structure.available = true;
      }
      if (!wasAvailable && structure.available) regenerated.push(structure);
    }
    return regenerated;
  }

  rollReward(structure) {
    const definition = HARVEST_STRUCTURE_TYPES[structure.type];
    if (structure.type === 'chest') {
      return { loot: { ...(structure.loot ?? {}) } };
    }
    return {
      type: definition.rewardType,
      amount: randomInteger(this.rewardRandom, definition.rewardAmount[0], definition.rewardAmount[1])
    };
  }

  collect(id, dayCount) {
    const structure = this.structures.find((entry) => entry.id === id);
    if (!structure || !structure.available || structure.collected) return null;
    const currentDay = Math.max(1, Math.floor(Number(dayCount) || 1));
    const definition = HARVEST_STRUCTURE_TYPES[structure.type];
    if (definition.poi) return null;
    structure.available = false;
    structure.harvestedDay = currentDay;
    structure.readyDay = definition.regrowDays > 0 ? currentDay + definition.regrowDays : null;
    if (structure.type === 'chest') structure.collected = true;
    return structure;
  }

  nearest(x, y, range = HARVEST_STRUCTURE_INTERACTION_RANGE, isNight = false) {
    let closest = null;
    let closestDistance = range;
    for (const structure of this.structures) {
      const definition = HARVEST_STRUCTURE_TYPES[structure.type];
      if (!structure.available || structure.collected || structure.collecting) continue;
      if (definition.poi || definition.nightOnly && !isNight) continue;
      const distance = Math.hypot(x - structure.x, y - structure.y);
      if (distance < closestDistance) {
        closest = structure;
        closestDistance = distance;
      }
    }
    return closest;
  }

  nearestOfType(type, x, y, range = HARVEST_STRUCTURE_INTERACTION_RANGE, isNight = false) {
    let closest = null;
    let closestDistance = range;
    for (const structure of this.byType(type)) {
      const definition = HARVEST_STRUCTURE_TYPES[structure.type];
      if (!structure.available || structure.collected || structure.collecting) continue;
      if (definition.poi || definition.nightOnly && !isNight) continue;
      const distance = Math.hypot(x - structure.x, y - structure.y);
      if (distance < closestDistance) {
        closest = structure;
        closestDistance = distance;
      }
    }
    return closest;
  }

  byType(type) {
    return this.structures.filter((structure) => structure.type === type);
  }

  serialize() {
    return this.structures.map((structure) => ({
      id: structure.id,
      type: structure.type,
      x: structure.x,
      y: structure.y,
      available: structure.available,
      readyDay: structure.readyDay,
      harvestedDay: structure.harvestedDay,
      collected: structure.collected,
      discovered: structure.discovered,
      loot: structure.loot ? { ...structure.loot } : null
    }));
  }
}
