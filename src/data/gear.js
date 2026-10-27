// Equipamento por espaço (elmo, peitoral, calças, botas, arma, escudo, anel, amuleto),
// conjuntos de 4 peças com bônus, raridade e nível mínimo. Vem de monstros (cada região
// tem os seus), dos chefes das cavernas e da loja do Ferreiro.

export const GEAR_SLOTS = Object.freeze(['weapon', 'shield', 'helmet', 'chest', 'legs', 'boots', 'ring', 'amulet']);
export const SLOT_NAMES = Object.freeze({
  weapon: 'Arma', shield: 'Escudo', helmet: 'Elmo', chest: 'Peitoral', legs: 'Calças', boots: 'Botas', ring: 'Anel', amulet: 'Amuleto'
});
/** Espaços que substituem a peça da Forja quando ocupados. */
export const FORGE_SLOT = Object.freeze({ weapon: 'weapon', chest: 'armor', shield: 'shield' });

export const RARITIES = Object.freeze({
  common: { name: 'Comum', multiplier: 1, color: '#e8e0cc' },
  uncommon: { name: 'Incomum', multiplier: 1.2, color: '#6ad86a' },
  rare: { name: 'Raro', multiplier: 1.45, color: '#5ab0ff' },
  legendary: { name: 'Lendário', multiplier: 1, color: '#d08aff' }
});

export const GEAR_BAG_SIZE = 30;
const STATS = ['attack', 'defense', 'maxHealth', 'speedPercent', 'fireResistance'];

/** Conjuntos: 4 peças da mesma região; vestir as 4 liga o bônus. */
export const GEAR_SETS = Object.freeze({
  couro: { name: 'Couro do Viajante', region: 'vale', bonus: { maxHealth: 20 }, colors: ['#8a5a32', '#c98d55'] },
  bosque: { name: 'Guardião do Bosque', region: 'antiga', bonus: { attack: 4 }, colors: ['#2e5a2c', '#7aa84a'] },
  brejo: { name: 'Pele do Brejo', region: 'brejo', bonus: { maxHealth: 50 }, colors: ['#3a4a2e', '#8a9a5e'] },
  corsario: { name: 'Corsário', region: 'esmeralda', bonus: { speedPercent: 0.08 }, colors: ['#8a2a2a', '#e8c15a'] },
  glacial: { name: 'Glacial', region: 'gelo', bonus: { defense: 6 }, colors: ['#5a8ec0', '#d4ecfc'] },
  faraonico: { name: 'Faraônico', region: 'areia', bonus: { attack: 8 }, colors: ['#c8a030', '#2a5aa0'] },
  vulcanico: { name: 'Vulcânico', region: 'brasa', bonus: { maxHealth: 80, fireResistance: 0.2 }, colors: ['#3a1a14', '#ff7a2a'] }
});

const piece = (set, slot, name, level, stats, extra = {}) => ({
  id: `${set}-${slot}`, name, slot, set, level, region: GEAR_SETS[set].region, colors: GEAR_SETS[set].colors, ...stats, ...extra
});

const SET_PIECES = [
  piece('couro', 'helmet', 'Capuz de Couro', 1, { defense: 1 }, { price: 12, shop: true }),
  piece('couro', 'chest', 'Gibão de Couro', 1, { defense: 2 }, { price: 20, shop: true }),
  piece('couro', 'legs', 'Calças de Couro', 1, { defense: 1 }, { price: 15, shop: true }),
  piece('couro', 'boots', 'Botas de Couro', 1, { defense: 1 }, { price: 10, shop: true }),
  piece('bosque', 'helmet', 'Elmo de Casca', 6, { defense: 3 }),
  piece('bosque', 'chest', 'Couraça do Bosque', 6, { defense: 5, attack: 1 }),
  piece('bosque', 'legs', 'Perneiras de Raiz', 6, { defense: 4 }),
  piece('bosque', 'boots', 'Botas de Musgo', 6, { defense: 2 }),
  piece('brejo', 'helmet', 'Capuz do Brejo', 8, { defense: 3, maxHealth: 8 }),
  piece('brejo', 'chest', 'Manto de Lodo', 8, { defense: 6, maxHealth: 10 }),
  piece('brejo', 'legs', 'Calças de Junco', 8, { defense: 4, maxHealth: 8 }),
  piece('brejo', 'boots', 'Botas de Sapo', 8, { defense: 3 }),
  piece('corsario', 'helmet', 'Tricórnio', 10, { defense: 4 }),
  piece('corsario', 'chest', 'Casaca de Corsário', 10, { defense: 6, attack: 2 }),
  piece('corsario', 'legs', 'Calções de Marujo', 10, { defense: 5 }),
  piece('corsario', 'boots', 'Botas de Convés', 10, { defense: 3, speedPercent: 0.04 }),
  piece('glacial', 'helmet', 'Elmo Glacial', 12, { defense: 5 }),
  piece('glacial', 'chest', 'Peitoral Glacial', 12, { defense: 9 }),
  piece('glacial', 'legs', 'Grevas Glaciais', 12, { defense: 6 }),
  piece('glacial', 'boots', 'Botas de Gelo Eterno', 12, { defense: 4 }),
  piece('faraonico', 'helmet', 'Coroa do Deserto', 14, { defense: 5, attack: 2 }),
  piece('faraonico', 'chest', 'Túnica Faraônica', 14, { defense: 9, attack: 2 }),
  piece('faraonico', 'legs', 'Saiote Dourado', 14, { defense: 7, attack: 1 }),
  piece('faraonico', 'boots', 'Sandálias do Sol', 14, { defense: 4, attack: 1 }),
  piece('vulcanico', 'helmet', 'Elmo de Magma', 18, { defense: 7, fireResistance: 0.05 }),
  piece('vulcanico', 'chest', 'Couraça Vulcânica', 18, { defense: 12, fireResistance: 0.05 }),
  piece('vulcanico', 'legs', 'Grevas de Obsidiana', 18, { defense: 9, fireResistance: 0.05 }),
  piece('vulcanico', 'boots', 'Botas de Brasa', 18, { defense: 6, fireResistance: 0.05 })
];

// look: forma do ícone/sprite (sword, dagger, axe, spear, trident, sabre, club, staff, claw, shield, ring, amulet).
// sword: cor da espada que aparece na mão do cavaleiro.
const OTHER_ITEMS = [
  { id: 'rustyDagger', name: 'Adaga Enferrujada', slot: 'weapon', look: 'dagger', level: 1, attack: 4, region: 'vale', price: 15, shop: true, sword: 'rusty', colors: ['#6f6a62', '#c4bdb0'] },
  { id: 'huntingSpear', name: 'Lança de Caça', slot: 'weapon', look: 'spear', level: 3, attack: 7, region: 'vale', sword: 'iron', colors: ['#6e4628', '#c4c8cc'] },
  { id: 'goblinKnife', name: 'Faca Goblin', slot: 'weapon', look: 'dagger', level: 6, attack: 11, region: 'antiga', sword: 'iron', colors: ['#4a5a2a', '#b8c0a0'] },
  { id: 'orcAxe', name: 'Machado Orc', slot: 'weapon', look: 'axe', level: 8, attack: 15, region: 'antiga', sword: 'steel', colors: ['#5a3a22', '#a7b0b8'] },
  { id: 'drownedTrident', name: 'Tridente do Afogado', slot: 'weapon', look: 'trident', level: 9, attack: 16, region: 'brejo', sword: 'steel', colors: ['#2a4a3a', '#8ad0b0'] },
  { id: 'pirateSabre', name: 'Sabre Pirata', slot: 'weapon', look: 'sabre', level: 10, attack: 18, region: 'esmeralda', sword: 'steel', colors: ['#8a6a14', '#e4eaee'] },
  { id: 'frostSpear', name: 'Lança Glacial', slot: 'weapon', look: 'spear', level: 12, attack: 22, region: 'gelo', sword: 'steel', colors: ['#3a5a7a', '#bfe6ff'] },
  { id: 'desertScimitar', name: 'Cimitarra do Deserto', slot: 'weapon', look: 'sabre', level: 14, attack: 26, region: 'areia', sword: 'legendary', colors: ['#8a6a14', '#ffe08a'] },
  { id: 'magmaBlade', name: 'Lâmina de Magma', slot: 'weapon', look: 'sword', level: 18, attack: 33, fireResistance: 0.05, region: 'brasa', sword: 'dragon', colors: ['#3a1a14', '#ff8a2a'] },

  { id: 'woodBuckler', name: 'Broquel de Madeira', slot: 'shield', look: 'shield', level: 1, defense: 1, region: 'vale', price: 14, shop: true, colors: ['#6e4628', '#b48a5a'] },
  { id: 'barkShield', name: 'Escudo de Casca', slot: 'shield', look: 'shield', level: 6, defense: 4, region: 'antiga', colors: ['#3a2a1a', '#6a9a4a'] },
  { id: 'turtleShield', name: 'Escudo de Carapaça', slot: 'shield', look: 'shield', level: 10, defense: 6, region: 'esmeralda', colors: ['#2a5a3a', '#c8a060'] },
  { id: 'iceShield', name: 'Escudo de Gelo', slot: 'shield', look: 'shield', level: 12, defense: 8, region: 'gelo', colors: ['#3a6a9a', '#d4ecfc'] },
  { id: 'sunShield', name: 'Escudo do Sol', slot: 'shield', look: 'shield', level: 15, defense: 9, region: 'areia', colors: ['#c8a030', '#fff0a0'] },
  { id: 'magmaAegis', name: 'Égide de Magma', slot: 'shield', look: 'shield', level: 18, defense: 12, fireResistance: 0.1, region: 'brasa', colors: ['#2a1414', '#ff6a1a'] },

  { id: 'copperRing', name: 'Anel de Cobre', slot: 'ring', look: 'ring', level: 1, attack: 1, region: 'vale', price: 40, shop: true, colors: ['#b8703a', '#e8a060'] },
  { id: 'bogRing', name: 'Anel do Pântano', slot: 'ring', look: 'ring', level: 8, maxHealth: 25, region: 'brejo', colors: ['#5a6a3a', '#8ad860'] },
  { id: 'pearlRing', name: 'Anel de Pérola', slot: 'ring', look: 'ring', level: 10, speedPercent: 0.06, region: 'esmeralda', colors: ['#c8c0b0', '#ffffff'] },
  { id: 'frostRing', name: 'Anel do Inverno', slot: 'ring', look: 'ring', level: 12, defense: 3, region: 'gelo', colors: ['#7aa8cc', '#d4ecfc'] },
  { id: 'sandRing', name: 'Anel do Escaravelho', slot: 'ring', look: 'ring', level: 14, attack: 4, region: 'areia', colors: ['#c8a030', '#3a8ac8'] },
  { id: 'emberRing', name: 'Anel de Brasa', slot: 'ring', look: 'ring', level: 18, attack: 5, fireResistance: 0.1, region: 'brasa', colors: ['#c8a030', '#ff5a1a'] },

  {
    id: 'wardAmulet', name: 'Amuleto de Proteção', slot: 'amulet', look: 'amulet', level: 1, region: 'vale', price: 300, shop: true, deathWard: true, noDrop: true,
    colors: ['#c8a030', '#7ad8ff'], description: 'Se você morrer com ele, não perde nada da mochila. Ele se quebra no lugar.'
  },
  { id: 'woodAmulet', name: 'Amuleto de Raiz', slot: 'amulet', look: 'amulet', level: 6, maxHealth: 20, region: 'antiga', colors: ['#6e4628', '#7ac04a'] },
  { id: 'coralAmulet', name: 'Amuleto de Coral', slot: 'amulet', look: 'amulet', level: 10, defense: 2, maxHealth: 20, region: 'esmeralda', colors: ['#c8a030', '#ff7a6a'] },
  { id: 'iceAmulet', name: 'Amuleto Gélido', slot: 'amulet', look: 'amulet', level: 12, maxHealth: 40, region: 'gelo', colors: ['#8a96a0', '#8ad8ff'] },
  { id: 'scarabAmulet', name: 'Escaravelho Sagrado', slot: 'amulet', look: 'amulet', level: 15, attack: 3, maxHealth: 30, region: 'areia', colors: ['#c8a030', '#2a8a5a'] },

  // Lendários: só caem dos chefes das cavernas.
  { id: 'grokkAxe', name: 'Machado de Grokk', slot: 'weapon', look: 'axe', level: 8, attack: 20, boss: 'orcChief', sword: 'steel', colors: ['#3a2a1a', '#e0e4e8'] },
  { id: 'hydraFang', name: 'Presa da Hidra', slot: 'weapon', look: 'dagger', level: 10, attack: 22, maxHealth: 20, boss: 'hydra', sword: 'steel', colors: ['#2a5a2a', '#e8f0c8'] },
  { id: 'captainSabre', name: 'Sabre do Capitão', slot: 'weapon', look: 'sabre', level: 11, attack: 24, speedPercent: 0.05, boss: 'ghostCaptain', sword: 'steel', colors: ['#2a6a6a', '#aaffee'] },
  { id: 'giantClub', name: 'Clava do Gigante', slot: 'weapon', look: 'club', level: 14, attack: 30, boss: 'frostGiant', sword: 'legendary', colors: ['#3a5a7a', '#d4ecfc'] },
  { id: 'pharaohStaff', name: 'Cetro do Faraó', slot: 'weapon', look: 'staff', level: 16, attack: 30, maxHealth: 40, boss: 'pharaoh', sword: 'legendary', colors: ['#c8a030', '#3aa0ff'] },
  { id: 'dragonClaw', name: 'Garra do Dragão', slot: 'weapon', look: 'claw', level: 19, attack: 42, fireResistance: 0.15, boss: 'dragon', sword: 'dragon', colors: ['#5a0c0c', '#ffb04a'] },
  { id: 'dragonHeart', name: 'Coração de Dragão', slot: 'amulet', look: 'amulet', level: 19, maxHealth: 80, fireResistance: 0.1, boss: 'dragon', colors: ['#5a0c0c', '#ff4a2a'] },
  { id: 'kingRing', name: 'Anel do Faraó', slot: 'ring', look: 'ring', level: 16, attack: 6, defense: 3, boss: 'pharaoh', colors: ['#c8a030', '#3aa0ff'] }
];

export const GEAR_ITEMS = Object.freeze(Object.fromEntries([...SET_PIECES, ...OTHER_ITEMS].map((item) => {
  const look = item.look ?? item.slot;
  // Preço de venda: cresce com o nível; lendários valem mais.
  const price = item.price ?? Math.round((10 + item.level * item.level * 1.6) * (item.boss ? 3 : 1));
  return [item.id, Object.freeze({ ...item, look, price })];
})));

/** Atributos finais de uma peça com a raridade dela. */
export function gearStats(id, rarity = 'common') {
  const item = GEAR_ITEMS[id];
  if (!item) return {};
  const multiplier = RARITIES[rarity]?.multiplier ?? 1;
  const stats = {};
  for (const stat of STATS) {
    const base = item[stat] ?? 0;
    if (!base) continue;
    if (stat === 'speedPercent' || stat === 'fireResistance') stats[stat] = Math.round(base * multiplier * 100) / 100;
    else stats[stat] = Math.max(base + (multiplier > 1 ? 1 : 0), Math.round(base * multiplier));
  }
  return stats;
}

/** Moedas ao vender (metade do valor, ajustado pela raridade). */
export function gearSellPrice(id, rarity = 'common') {
  const item = GEAR_ITEMS[id];
  if (!item) return 0;
  return Math.max(1, Math.round(item.price * 0.5 * (RARITIES[rarity]?.multiplier ?? 1)));
}

/** Texto curto dos atributos ("ATQ +12 • VIDA +20"). */
export function describeStats(stats = {}) {
  const parts = [];
  if (stats.attack) parts.push(`ATQ +${stats.attack}`);
  if (stats.defense) parts.push(`DEF +${stats.defense}`);
  if (stats.maxHealth) parts.push(`VIDA +${stats.maxHealth}`);
  if (stats.speedPercent) parts.push(`VELOC. +${Math.round(stats.speedPercent * 100)}%`);
  if (stats.fireResistance) parts.push(`FOGO +${Math.round(stats.fireResistance * 100)}%`);
  return parts.join(' • ');
}

// ---------- Queda de equipamento ----------

export const GEAR_DROP = Object.freeze({
  normalChance: 0.035,
  eliteChance: 0.2,
  rareChance: { normal: 0.08, elite: 0.25 },
  uncommonChance: { normal: 0.27, elite: 0.4 }
});

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function rollRarity(elite, random) {
  const roll = random();
  if (roll < GEAR_DROP.rareChance[elite ? 'elite' : 'normal']) return 'rare';
  if (roll < GEAR_DROP.rareChance[elite ? 'elite' : 'normal'] + GEAR_DROP.uncommonChance[elite ? 'elite' : 'normal']) return 'uncommon';
  return 'common';
}

/** Peças que podem cair numa região (fora as lendárias, as de loja exclusiva e o amuleto). */
export function regionGearPool(region) {
  return Object.values(GEAR_ITEMS).filter((item) => item.region === region && !item.boss && !item.noDrop);
}

/**
 * Sorteia o equipamento deixado por um inimigo. Devolve uma lista de { id, rarity }.
 * boss: tipo do chefe da caverna (sempre deixa 2 peças, com chance de uma lendária dele).
 */
export function rollGearDrop({ region, elite = false, boss = null } = {}, random = Math.random) {
  if (boss) {
    const drops = [];
    const legendary = Object.values(GEAR_ITEMS).filter((item) => item.boss === boss);
    if (legendary.length && random() < 0.6) drops.push({ id: pick(legendary, random).id, rarity: 'legendary' });
    const pool = regionGearPool(region);
    while (drops.length < 2 && pool.length) drops.push({ id: pick(pool, random).id, rarity: random() < 0.5 ? 'rare' : 'uncommon' });
    return drops;
  }
  if (random() >= (elite ? GEAR_DROP.eliteChance : GEAR_DROP.normalChance)) return [];
  const pool = regionGearPool(region);
  if (!pool.length) return [];
  return [{ id: pick(pool, random).id, rarity: rollRarity(elite, random) }];
}

// ---------- Bênção (Fogueira) ----------

/** Preço da bênção: protege a mochila na próxima morte. */
export function blessingPrice(level = 1) {
  return Math.max(60, 25 * Math.max(1, Math.floor(level)));
}
