// Equipamento por espaço (elmo, peitoral, calças, botas, arma, escudo, anel, amuleto),
// conjuntos de 4 peças com bônus, raridade e nível mínimo. As peças são GERADAS por uma tabela
// de tiers (material x espaço): 18 tiers, do nível 1 ao 150. Vêm de monstros (pelo nível deles),
// dos chefes das cavernas (lendários) e da loja do Ferreiro (só os tiers baixos, até o nível 30).

import { REGION_INFO } from './worldRegions.js';

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
export const MAX_GEAR_LEVEL = 150;
/** A loja do Ferreiro só vende os tiers até este nível. */
export const SHOP_MAX_LEVEL = 30;
const STATS = ['attack', 'defense', 'maxHealth', 'speedPercent', 'fireResistance'];

// ---------- Tabela de tiers ----------
// key: id do conjunto; level: nível do tier; colors: [principal, detalhe] (paleta do material);
// perk: atributo extra das peças de armadura; bonus: atributos do bônus de conjunto (4 peças);
// armor: [elmo, peitoral, calças, botas]; weapons: [[id|null, nome, forma], ...]; shield/ring/amulet: [id|null, nome].
const TIERS = [
  { key: 'couro', name: 'Couro do Viajante', level: 1, colors: ['#8a5a32', '#c98d55'], perk: null, bonus: ['maxHealth'],
    armor: ['Capuz de Couro', 'Gibão de Couro', 'Calças de Couro', 'Botas de Couro'],
    weapons: [['rustyDagger', 'Adaga Enferrujada', 'dagger'], ['huntingSpear', 'Lança de Caça', 'spear']],
    shield: ['woodBuckler', 'Broquel de Madeira'], ring: ['copperRing', 'Anel de Cobre'], amulet: [null, 'Amuleto de Madeira'] },
  { key: 'bosque', name: 'Guardião do Bosque', level: 8, colors: ['#2e5a2c', '#7aa84a'], perk: 'attack', bonus: ['attack'],
    armor: ['Elmo de Casca', 'Couraça do Bosque', 'Perneiras de Raiz', 'Botas de Musgo'],
    weapons: [['goblinKnife', 'Faca Goblin', 'dagger'], ['orcAxe', 'Machado Orc', 'axe']],
    shield: ['barkShield', 'Escudo de Casca'], ring: [null, 'Anel de Folha'], amulet: ['woodAmulet', 'Amuleto de Raiz'] },
  { key: 'ferro', name: 'Ferro Forjado', level: 15, colors: ['#5a6068', '#b8c0c8'], perk: null, bonus: ['defense'],
    armor: ['Elmo de Ferro', 'Cota de Ferro', 'Grevas de Ferro', 'Botas de Ferro'],
    weapons: [[null, 'Espada de Ferro', 'sword'], [null, 'Maça de Ferro', 'club']],
    shield: [null, 'Escudo de Ferro'], ring: [null, 'Anel de Ferro'], amulet: [null, 'Amuleto de Ferro'] },
  { key: 'malha', name: 'Malha de Aço', level: 22, colors: ['#6a7a8c', '#dce6f0'], perk: 'maxHealth', bonus: ['maxHealth', 'defense'],
    armor: ['Coifa de Malha', 'Cota de Malha', 'Calças de Malha', 'Botas de Malha'],
    weapons: [[null, 'Espada de Aço', 'sword'], [null, 'Machado de Guerra', 'axe']],
    shield: [null, 'Escudo de Aço'], ring: [null, 'Anel de Aço'], amulet: [null, 'Amuleto de Aço'] },
  { key: 'brejo', name: 'Pele do Brejo', level: 28, colors: ['#3a4a2e', '#8a9a5e'], perk: 'maxHealth', bonus: ['maxHealth'],
    armor: ['Capuz do Brejo', 'Manto de Lodo', 'Calças de Junco', 'Botas de Sapo'],
    weapons: [['drownedTrident', 'Tridente do Afogado', 'trident'], [null, 'Cajado do Pântano', 'staff']],
    shield: [null, 'Escudo de Lodo'], ring: ['bogRing', 'Anel do Pântano'], amulet: [null, 'Amuleto do Pântano'] },
  { key: 'prata', name: 'Prata Lunar', level: 34, colors: ['#9aa4b4', '#e8f0ff'], perk: 'attack', bonus: ['attack'],
    armor: ['Elmo de Prata', 'Peitoral de Prata', 'Grevas de Prata', 'Botas de Prata'],
    weapons: [[null, 'Sabre de Prata', 'sabre'], [null, 'Adaga Lunar', 'dagger']],
    shield: [null, 'Escudo de Prata'], ring: [null, 'Anel Lunar'], amulet: [null, 'Amuleto Lunar'] },
  { key: 'corsario', name: 'Corsário', level: 40, colors: ['#8a2a2a', '#e8c15a'], perk: 'speedPercent', bonus: ['speedPercent'],
    armor: ['Tricórnio', 'Casaca de Corsário', 'Calções de Marujo', 'Botas de Convés'],
    weapons: [['pirateSabre', 'Sabre Pirata', 'sabre'], [null, 'Machadinha de Abordagem', 'axe']],
    shield: ['turtleShield', 'Escudo de Carapaça'], ring: ['pearlRing', 'Anel de Pérola'], amulet: ['coralAmulet', 'Amuleto de Coral'] },
  { key: 'coral', name: 'Maré Viva', level: 46, colors: ['#2a7a8a', '#ff8a7a'], perk: 'maxHealth', bonus: ['maxHealth'],
    armor: ['Elmo de Coral', 'Couraça de Coral', 'Perneiras de Coral', 'Botas de Maré'],
    weapons: [[null, 'Tridente de Coral', 'trident'], [null, 'Lâmina de Concha', 'sword']],
    shield: [null, 'Escudo de Concha'], ring: [null, 'Anel de Maré'], amulet: [null, 'Amuleto de Maré'] },
  { key: 'glacial', name: 'Glacial', level: 56, colors: ['#5a8ec0', '#d4ecfc'], perk: null, bonus: ['defense'],
    armor: ['Elmo Glacial', 'Peitoral Glacial', 'Grevas Glaciais', 'Botas de Gelo Eterno'],
    weapons: [['frostSpear', 'Lança Glacial', 'spear'], [null, 'Espada de Geada', 'sword']],
    shield: ['iceShield', 'Escudo de Gelo'], ring: ['frostRing', 'Anel do Inverno'], amulet: ['iceAmulet', 'Amuleto Gélido'] },
  { key: 'runico', name: 'Rúnico', level: 64, colors: ['#4a3a8a', '#9ad0ff'], perk: 'attack', bonus: ['attack', 'maxHealth'],
    armor: ['Elmo Rúnico', 'Couraça Rúnica', 'Grevas Rúnicas', 'Botas Rúnicas'],
    weapons: [[null, 'Lâmina Rúnica', 'sword'], [null, 'Cetro Rúnico', 'staff']],
    shield: [null, 'Escudo Rúnico'], ring: [null, 'Anel Rúnico'], amulet: [null, 'Amuleto Rúnico'] },
  { key: 'mithril', name: 'Mithril', level: 72, colors: ['#7aa8c8', '#e8fbff'], perk: 'maxHealth', bonus: ['defense'],
    armor: ['Elmo de Mithril', 'Couraça de Mithril', 'Grevas de Mithril', 'Botas de Mithril'],
    weapons: [[null, 'Espada de Mithril', 'sword'], [null, 'Lança de Mithril', 'spear']],
    shield: [null, 'Escudo de Mithril'], ring: [null, 'Anel de Mithril'], amulet: [null, 'Amuleto de Mithril'] },
  { key: 'faraonico', name: 'Faraônico', level: 80, colors: ['#c8a030', '#2a5aa0'], perk: 'attack', bonus: ['attack'],
    armor: ['Coroa do Deserto', 'Túnica Faraônica', 'Saiote Dourado', 'Sandálias do Sol'],
    weapons: [['desertScimitar', 'Cimitarra do Deserto', 'sabre'], [null, 'Khopesh Dourado', 'sabre']],
    shield: ['sunShield', 'Escudo do Sol'], ring: ['sandRing', 'Anel do Escaravelho'], amulet: ['scarabAmulet', 'Escaravelho Sagrado'] },
  { key: 'adamante', name: 'Adamante', level: 88, colors: ['#3a3a4a', '#c05aff'], perk: 'maxHealth', bonus: ['maxHealth', 'attack'],
    armor: ['Elmo de Adamante', 'Couraça de Adamante', 'Grevas de Adamante', 'Botas de Adamante'],
    weapons: [[null, 'Machado de Adamante', 'axe'], [null, 'Espada de Adamante', 'sword']],
    shield: [null, 'Escudo de Adamante'], ring: [null, 'Anel de Adamante'], amulet: [null, 'Amuleto de Adamante'] },
  { key: 'vulcanico', name: 'Vulcânico', level: 100, colors: ['#3a1a14', '#ff7a2a'], perk: 'fireResistance', bonus: ['maxHealth', 'fireResistance'],
    armor: ['Elmo de Magma', 'Couraça Vulcânica', 'Grevas de Obsidiana', 'Botas de Brasa'],
    weapons: [['magmaBlade', 'Lâmina de Magma', 'sword'], [null, 'Machado de Obsidiana', 'axe']],
    shield: ['magmaAegis', 'Égide de Magma'], ring: ['emberRing', 'Anel de Brasa'], amulet: [null, 'Amuleto de Magma'] },
  { key: 'demoniaco', name: 'Demoníaco', level: 110, colors: ['#5a0a1a', '#ff3a5a'], perk: 'fireResistance', bonus: ['attack', 'fireResistance'],
    armor: ['Elmo Demoníaco', 'Couraça Demoníaca', 'Grevas Demoníacas', 'Botas Demoníacas'],
    weapons: [[null, 'Garra Demoníaca', 'claw'], [null, 'Tridente Infernal', 'trident']],
    shield: [null, 'Escudo Demoníaco'], ring: [null, 'Anel Demoníaco'], amulet: [null, 'Amuleto Demoníaco'] },
  { key: 'celestial', name: 'Celestial', level: 120, colors: ['#d8c060', '#ffffff'], perk: 'maxHealth', bonus: ['defense', 'maxHealth'],
    armor: ['Elmo Celestial', 'Couraça Celestial', 'Grevas Celestiais', 'Botas Celestiais'],
    weapons: [[null, 'Espada Celestial', 'sword'], [null, 'Cetro Celestial', 'staff']],
    shield: [null, 'Escudo Celestial'], ring: [null, 'Anel Celestial'], amulet: [null, 'Amuleto Celestial'] },
  { key: 'abissal', name: 'Abissal', level: 135, colors: ['#1a1030', '#8a3aff'], perk: 'attack', bonus: ['attack', 'maxHealth'],
    armor: ['Elmo Abissal', 'Couraça Abissal', 'Grevas Abissais', 'Botas Abissais'],
    weapons: [[null, 'Lâmina Abissal', 'sword'], [null, 'Cimitarra Abissal', 'sabre']],
    shield: [null, 'Escudo Abissal'], ring: [null, 'Anel Abissal'], amulet: [null, 'Amuleto Abissal'] },
  { key: 'titanico', name: 'Titânico', level: 150, colors: ['#5a3d29', '#ffd38a'], perk: 'maxHealth', bonus: ['attack', 'defense', 'maxHealth'],
    armor: ['Elmo Titânico', 'Couraça Titânica', 'Grevas Titânicas', 'Botas Titânicas'],
    weapons: [[null, 'Espada Titânica', 'sword'], [null, 'Martelo Titânico', 'club']],
    shield: [null, 'Escudo Titânico'], ring: [null, 'Anel Titânico'], amulet: [null, 'Amuleto Titânico'] }
];

/** Região onde o tier "mora" (a que contém o nível dele; acima da última, a Ilha de Brasa). */
const REGION_ORDER = ['vale', 'antiga', 'brejo', 'esmeralda', 'gelo', 'areia', 'brasa'];
export function regionForLevel(level) {
  return REGION_ORDER.find((id) => level >= REGION_INFO[id].levelRange[0] && level <= REGION_INFO[id].levelRange[1]) ?? 'brasa';
}

// ---------- Fórmulas de atributos (escalam com o nível do tier) ----------
const PIECE_FACTOR = { helmet: 0.6, chest: 1, legs: 0.75, boots: 0.5 };
const ARMOR_NAME_INDEX = { helmet: 0, chest: 1, legs: 2, boots: 3 };
const SLOT_VALUE = { weapon: 1.5, shield: 1.2, helmet: 1, chest: 1.3, legs: 1, boots: 1, ring: 2.5, amulet: 2.5 };

export const weaponAttack = (level) => Math.round(3 + level * 1.8);

function armorStats(tier, slot) {
  const f = PIECE_FACTOR[slot];
  const stats = { defense: Math.max(1, Math.round(f * (1 + tier.level * 0.62))) };
  if (tier.perk === 'maxHealth') stats.maxHealth = Math.round((3 + tier.level * 0.4) * f);
  else if (tier.perk === 'attack') stats.attack = Math.max(1, Math.round((1 + tier.level * 0.07) * f));
  else if (tier.perk === 'fireResistance') stats.fireResistance = 0.05;
  else if (tier.perk === 'speedPercent' && slot === 'boots') stats.speedPercent = 0.04;
  return stats;
}

function ringStats(tier, index) {
  const L = tier.level;
  return [{ attack: Math.round(1 + L * 0.2) }, { maxHealth: Math.round(8 + L * 1.1) }, { defense: Math.round(1 + L * 0.18) },
    { speedPercent: Math.round(Math.min(0.12, 0.03 + L * 0.0006) * 100) / 100, attack: Math.round(1 + L * 0.1) }][index % 4];
}

function amuletStats(tier, index) {
  const L = tier.level;
  return [{ maxHealth: Math.round(10 + L * 1.2) }, { maxHealth: Math.round(6 + L * 0.7), defense: Math.round(1 + L * 0.12) },
    { attack: Math.round(1 + L * 0.15), maxHealth: Math.round(5 + L * 0.5) }][index % 3];
}

/** Bônus de conjunto: cada atributo cresce com o nível do tier. */
const BONUS_FORMULA = {
  maxHealth: (L) => Math.round(20 + (L - 1) * 1.4),
  attack: (L) => Math.round(2 + L * 0.3),
  defense: (L) => Math.round(2 + L * 0.28),
  speedPercent: (L) => Math.round(Math.min(0.2, 0.06 + L * 0.001) * 100) / 100,
  fireResistance: (L) => Math.round(Math.min(0.3, 0.1 + L * 0.002) * 100) / 100
};

function swordLook(level) {
  if (level < 8) return 'rusty';
  if (level < 30) return 'iron';
  if (level < 60) return 'steel';
  if (level < 100) return 'legendary';
  if (level < 130) return 'dragon';
  return 'titan';
}

/** Conjuntos: 4 peças do mesmo tier; vestir as 4 liga o bônus (que cresce com o tier). */
export const GEAR_SETS = Object.freeze(Object.fromEntries(TIERS.map((tier) => [tier.key, Object.freeze({
  name: tier.name,
  region: regionForLevel(tier.level),
  level: tier.level,
  bonus: Object.freeze(Object.fromEntries(tier.bonus.map((stat) => [stat, BONUS_FORMULA[stat](tier.level)]))),
  colors: tier.colors
})])));

// ---------- Geração das peças ----------
const generated = [];
TIERS.forEach((tier, index) => {
  const base = { tierKey: tier.key, level: tier.level, region: GEAR_SETS[tier.key].region, colors: tier.colors };
  for (const slot of ['helmet', 'chest', 'legs', 'boots']) {
    generated.push({ ...base, id: `${tier.key}-${slot}`, name: tier.armor[ARMOR_NAME_INDEX[slot]], slot, set: tier.key, ...armorStats(tier, slot) });
  }
  tier.weapons.forEach(([id, name, look], n) => {
    const level = Math.min(MAX_GEAR_LEVEL, tier.level + (n ? 2 : 0));
    generated.push({
      ...base, level, id: id ?? `${tier.key}-weapon-${n ? 'b' : 'a'}`, name, slot: 'weapon', look,
      attack: weaponAttack(level), sword: swordLook(level),
      ...(tier.perk === 'fireResistance' && !n ? { fireResistance: 0.05 } : {})
    });
  });
  generated.push({
    ...base, id: tier.shield[0] ?? `${tier.key}-shield`, name: tier.shield[1], slot: 'shield', look: 'shield',
    defense: Math.round(1 + tier.level * 0.45), ...(tier.perk === 'fireResistance' ? { fireResistance: 0.1 } : {})
  });
  generated.push({ ...base, id: tier.ring[0] ?? `${tier.key}-ring`, name: tier.ring[1], slot: 'ring', look: 'ring', ...ringStats(tier, index) });
  generated.push({ ...base, id: tier.amulet[0] ?? `${tier.key}-amulet`, name: tier.amulet[1], slot: 'amulet', look: 'amulet', ...amuletStats(tier, index) });
});

// Lança de arremesso (ideia 21): alcance de 4 quadrados; pode quebrar ao acertar.
const THROWN = [
  { id: 'throwSpear1', name: 'Lança de Arremesso', level: 5, breakChance: 0.15, colors: ['#6e4628', '#c4c8cc'] },
  { id: 'throwSpear2', name: 'Lança de Arremesso Reforçada', level: 45, breakChance: 0.1, colors: ['#4a3a28', '#b8d0e8'] },
  { id: 'throwSpear3', name: 'Lança de Arremesso de Mithril', level: 95, breakChance: 0.06, colors: ['#3a4a6a', '#e8fbff'] }
];
for (const spear of THROWN) {
  generated.push({
    ...spear, slot: 'weapon', look: 'spear', region: regionForLevel(spear.level), attack: Math.round(weaponAttack(spear.level) * 0.85),
    sword: swordLook(spear.level), thrown: true, range: 4,
    description: `Arremesso: alcance de 4 quadrados. ${Math.round(spear.breakChance * 100)}% de chance de quebrar ao acertar.`
  });
}

// Lendários: só caem dos chefes das cavernas (nível do chefe).
const legendaryAttack = (level) => Math.round(weaponAttack(level) * 1.3);
const LEGENDARY = [
  { id: 'grokkAxe', name: 'Machado de Grokk', slot: 'weapon', look: 'axe', level: 30, attack: legendaryAttack(30), boss: 'orcChief', sword: 'steel', colors: ['#3a2a1a', '#e0e4e8'] },
  { id: 'hydraFang', name: 'Presa da Hidra', slot: 'weapon', look: 'dagger', level: 45, attack: legendaryAttack(45), maxHealth: 60, boss: 'hydra', sword: 'steel', colors: ['#2a5a2a', '#e8f0c8'] },
  { id: 'captainSabre', name: 'Sabre do Capitão', slot: 'weapon', look: 'sabre', level: 55, attack: legendaryAttack(55), speedPercent: 0.05, boss: 'ghostCaptain', sword: 'steel', colors: ['#2a6a6a', '#aaffee'] },
  { id: 'giantClub', name: 'Clava do Gigante', slot: 'weapon', look: 'club', level: 75, attack: legendaryAttack(75), boss: 'frostGiant', sword: 'legendary', colors: ['#3a5a7a', '#d4ecfc'] },
  { id: 'pharaohStaff', name: 'Cetro do Faraó', slot: 'weapon', look: 'staff', level: 95, attack: legendaryAttack(95), maxHealth: 120, boss: 'pharaoh', sword: 'legendary', colors: ['#c8a030', '#3aa0ff'] },
  { id: 'dragonClaw', name: 'Garra do Dragão', slot: 'weapon', look: 'claw', level: 120, attack: legendaryAttack(120), fireResistance: 0.15, boss: 'dragon', sword: 'dragon', colors: ['#5a0c0c', '#ffb04a'] },
  { id: 'dragonHeart', name: 'Coração de Dragão', slot: 'amulet', look: 'amulet', level: 120, maxHealth: 250, fireResistance: 0.1, boss: 'dragon', colors: ['#5a0c0c', '#ff4a2a'] },
  { id: 'abyssBlade', name: 'Lâmina do Abismo', slot: 'weapon', look: 'sword', level: 150, attack: legendaryAttack(150), fireResistance: 0.2, boss: 'abyssLord', sword: 'titan', colors: ['#240a14', '#ff3a4a'] },
  { id: 'kingRing', name: 'Anel do Faraó', slot: 'ring', look: 'ring', level: 95, attack: 20, defense: 12, boss: 'pharaoh', colors: ['#c8a030', '#3aa0ff'] }
].map((item) => ({ ...item, region: regionForLevel(item.level) }));

const WARD_AMULET = {
  id: 'wardAmulet', name: 'Amuleto de Proteção', slot: 'amulet', look: 'amulet', level: 1, region: 'vale', price: 300, deathWard: true, noDrop: true,
  colors: ['#c8a030', '#7ad8ff'], description: 'Se você morrer com ele, não perde nada da mochila. Ele se quebra no lugar.'
};

/** A loja do Ferreiro vende os tiers baixos (até o nível 30): armadura, escudo e a 1ª arma; anéis e amuletos só até o nível 15. */
function inShop(item) {
  if (item.boss || item.noDrop || item.level > SHOP_MAX_LEVEL) return false;
  if (item.slot === 'weapon') return item.id.endsWith('-weapon-a') || ['rustyDagger', 'goblinKnife', 'drownedTrident', 'throwSpear1'].includes(item.id);
  if (item.slot === 'ring' || item.slot === 'amulet') return item.level <= 15;
  return true;
}

export const GEAR_ITEMS = Object.freeze(Object.fromEntries([...generated, ...LEGENDARY, WARD_AMULET].map((item) => {
  const look = item.look ?? item.slot;
  // Preço de venda: cresce com o nível e com o espaço; lendários valem mais.
  const price = item.price ?? Math.round((10 + item.level * item.level * 1.6) * (SLOT_VALUE[item.slot] ?? 1) * (item.boss ? 3 : 1));
  const shop = item.id === 'wardAmulet' || inShop(item);
  return [item.id, Object.freeze({ ...item, look, price, shop })];
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

/** Nível usado no sorteio: o do monstro; sem ele, o topo da faixa da região. */
export function dropLevel(region, level = null) {
  const range = REGION_INFO[region]?.levelRange;
  const base = Number.isFinite(Number(level)) && level !== null ? Number(level) : (range ? range[1] : 1);
  return Math.min(MAX_GEAR_LEVEL, Math.max(1, Math.floor(base)));
}

/**
 * Peças que podem cair para um monstro de nível `level` (fora lendárias, o amuleto de proteção):
 * nível da peça entre minRatio * nível e o nível do monstro. Se faltar peça, a janela se abre.
 */
export function gearPoolForLevel(level, minRatio = 0.55) {
  const all = Object.values(GEAR_ITEMS).filter((item) => !item.boss && !item.noDrop);
  let ratio = minRatio;
  for (;;) {
    const pool = all.filter((item) => item.level <= level && item.level >= Math.floor(level * ratio));
    if (pool.length >= 4 || ratio <= 0) return pool.length ? pool : all.filter((item) => item.level <= level);
    ratio = Math.max(0, ratio - 0.15);
  }
}

/** Peças que podem cair numa região (pelo nível dela, ou pelo nível do monstro se informado). */
export function regionGearPool(region, level = null) {
  return gearPoolForLevel(dropLevel(region, level));
}

/**
 * Sorteia o equipamento deixado por um inimigo. Devolve uma lista de { id, rarity }.
 * level: nível do monstro. boss: tipo do chefe da caverna (sempre deixa 2 peças do nível dele,
 * com chance de uma lendária dele).
 */
export function rollGearDrop({ region, level = null, elite = false, boss = null, chanceMultiplier = 1, guaranteed = false } = {}, random = Math.random) {
  const lvl = dropLevel(region, level);
  if (boss) {
    const drops = [];
    const legendary = Object.values(GEAR_ITEMS).filter((item) => item.boss === boss);
    if (legendary.length && random() < 0.6) drops.push({ id: pick(legendary, random).id, rarity: 'legendary' });
    const pool = gearPoolForLevel(lvl, 0.75);
    while (drops.length < 2 && pool.length) drops.push({ id: pick(pool, random).id, rarity: random() < 0.5 ? 'rare' : 'uncommon' });
    return drops;
  }
  if (!guaranteed && random() >= Math.min(1, (elite ? GEAR_DROP.eliteChance : GEAR_DROP.normalChance) * chanceMultiplier)) return [];
  const pool = gearPoolForLevel(lvl);
  if (!pool.length) return [];
  return [{ id: pick(pool, random).id, rarity: rollRarity(elite, random) }];
}

// ---------- Bênção (Fogueira) ----------

/** Preço da bênção: protege a mochila na próxima morte. */
export function blessingPrice(level = 1) {
  return Math.max(60, 25 * Math.max(1, Math.floor(level)));
}
