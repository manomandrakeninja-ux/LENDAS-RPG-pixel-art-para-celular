// Regras de produção dos prédios. Custos e efeitos por nível ficam em buildings.json;
// preços do mercado ficam em economy.json.

export const FARM_CROPS = {
  wheat: {
    name: 'Trigo',
    seconds: 60,
    cost: { seeds: 1 },
    yield: { food: [2, 3] },
    color: '#d8b75d'
  },
  pumpkin: {
    name: 'Abóbora',
    seconds: 90,
    cost: { seeds: 1 },
    yield: { food: [3, 5] },
    color: '#d97932'
  },
  herb: {
    name: 'Erva',
    seconds: 45,
    cost: { seeds: 1 },
    yield: { herbs: [2, 3] },
    color: '#79b85a'
  },
  magic: {
    name: 'Planta Mágica',
    seconds: 120,
    cost: { seeds: 2, moonherb: 1 },
    yield: { herbs: [2, 3], food: [3, 4] },
    color: '#a98bf0',
    rare: true
  }
};

// type: recurso entregue. Galinha = 2 galinhas, por isso 2 ovos.
export const ANIMAL_PRODUCTS = {
  egg: { name: 'Ovo', animal: 'Galinhas', seconds: 120, type: 'egg', amount: 2 },
  wool: { name: 'Lã', animal: 'Ovelha', seconds: 120, type: 'wool', amount: 1 },
  milk: { name: 'Leite', animal: 'Vaca', seconds: 120, type: 'milk', amount: 1 },
  pork: { name: 'Carne', animal: 'Porco', seconds: 150, type: 'food', amount: 2 }
};

// Animais cujos produtos são coletados sozinhos a partir da Fazenda nível 7.
export const AUTO_ANIMAL_PRODUCTS = Object.freeze(['egg', 'milk']);

export const ENCHANTMENTS = Object.freeze({
  fire: Object.freeze({ name: 'Fogo', burnDamagePerSecond: 4, burnMs: 3000 }),
  ice: Object.freeze({ name: 'Gelo', slowRatio: 0.4, slowMs: 2000 }),
  vampire: Object.freeze({ name: 'Vampirismo', lifeStealRatio: 0.15 })
});

// category: weapon/armor/shield usam durabilidade e melhorias; tool/bow/enchant não.
export const FORGE_RECIPES = {
  stonePickaxe: {
    name: 'Picareta Básica', category: 'tool', tool: 'stonePickaxe', level: 1,
    description: 'Permite minerar rochas e veios.',
    cost: { stone: 3, wood: 2 }
  },
  simpleSword: {
    name: 'Espada Simples', category: 'weapon', level: 1, attack: 5, durability: 120,
    description: 'ATQ +5.',
    cost: { iron: 2 }
  },
  shield: {
    name: 'Escudo', category: 'shield', level: 2, defense: 2, durability: 120,
    description: 'DEF +2.',
    cost: { wood: 3, iron: 1 }
  },
  axe: {
    name: 'Machado de Ferro', category: 'tool', tool: 'axe', level: 2,
    description: 'Coletas de plantas e minérios rendem +1 unidade.',
    cost: { iron: 2, wood: 2 }
  },
  ironSword: {
    name: 'Espada de Ferro', category: 'weapon', level: 3, attack: 10, durability: 160,
    description: 'ATQ +10.',
    cost: { iron: 5 }
  },
  ironArmor: {
    name: 'Armadura de Ferro', category: 'armor', level: 3, defense: 5, durability: 160,
    description: 'DEF +5.',
    cost: { iron: 6, stone: 2 }
  },
  ironPickaxe: {
    name: 'Picareta de Ferro', category: 'tool', tool: 'ironPickaxe', level: 5,
    description: 'Minera 2x mais rápido e rende +1 por veio.',
    cost: { iron: 5, coal: 1 }
  },
  steelSword: {
    name: 'Espada de Aço', category: 'weapon', level: 5, attack: 18, durability: 200,
    description: 'ATQ +18.',
    cost: { iron: 8, coal: 3, wood: 1 }
  },
  fireEnchant: {
    name: 'Encantamento de Fogo', category: 'enchant', enchant: 'fire', level: 6,
    description: 'Golpes causam queimadura: 4 de dano/s por 3s.',
    cost: { coal: 4, gold: 1, herbs: 2 }
  },
  iceEnchant: {
    name: 'Encantamento de Gelo', category: 'enchant', enchant: 'ice', level: 6,
    description: 'Golpes reduzem a velocidade do inimigo em 40% por 2s.',
    cost: { silk: 2, gold: 1, moonherb: 2 }
  },
  steelArmor: {
    name: 'Armadura de Aço', category: 'armor', level: 7, defense: 10, durability: 220,
    description: 'DEF +10.',
    cost: { iron: 12, coal: 4 }
  },
  longbow: {
    name: 'Arco Longo', category: 'bow', level: 7,
    description: 'Ataque à distância: sem inimigo por perto, o ataque dispara uma flecha (alcance 280).',
    cost: { wood: 8, silk: 3, iron: 2 }
  },
  vampireEnchant: {
    name: 'Encantamento Vampirismo', category: 'enchant', enchant: 'vampire', level: 8,
    description: 'Cada golpe recupera 15% do dano causado.',
    cost: { ectoplasm: 4, bone: 4, gold: 2 }
  },
  legendarySword: {
    name: 'Espada Lendária', category: 'weapon', level: 9, attack: 30, durability: 300,
    description: 'ATQ +30.',
    cost: { iron: 20, coal: 10, gold: 4 }
  },
  mythicArmor: {
    name: 'Armadura Mítica', category: 'armor', level: 9, defense: 20, durability: 300,
    description: 'DEF +20.',
    cost: { iron: 24, gold: 4, ectoplasm: 4 }
  },
  dragonBlade: {
    name: 'Lâmina da Forja do Dragão', category: 'weapon', level: 10, attack: 40, fireResistance: 0.15, durability: 400,
    description: 'ATQ +40 e resistência ao fogo +15%.',
    cost: { iron: 30, coal: 15, gold: 6, bone: 8 }
  },
  dragonScaleArmor: {
    name: 'Armadura de Escamas', category: 'armor', level: 10, defense: 28, fireResistance: 0.25, durability: 400,
    description: 'DEF +28 e resistência ao fogo +25%.',
    cost: { iron: 30, gold: 6, silk: 10, ectoplasm: 6 }
  },
  titanBlade: {
    name: 'Lâmina do Titã', category: 'weapon', level: 1, attack: 22, durability: 260, requiresBoss: 'biomeBoss',
    description: 'Espada rara forjada com o Núcleo do Titã. ATQ +22.',
    cost: { titanCore: 1, iron: 4, gold: 1 }
  }
};

// Acessórios lendários: só vêm do leilão e do mercador viajante; não são forjados.
export const ACCESSORIES = Object.freeze({
  kingAmulet: Object.freeze({ name: 'Amuleto do Rei', description: 'ATQ +6 e DEF +6.', attack: 6, defense: 6 }),
  phoenixRing: Object.freeze({ name: 'Anel da Fênix', description: 'Resistência ao fogo +20% e +30 de vida máxima.', fireResistance: 0.2, maxHealth: 30 }),
  stormCharm: Object.freeze({ name: 'Talismã da Tempestade', description: 'ATQ +4 e velocidade +10%.', attack: 4, speedPercent: 0.1 })
});

// Ferreiro nível 4: reparo e desmontagem; nível 8: melhorias +1 a +5.
export const FORGE_SERVICES = Object.freeze({
  repairLevel: 4,
  dismantleLevel: 4,
  upgradeLevel: 8,
  maxUpgrade: 5,
  brokenBonusRatio: 0.5,
  dismantleReturnRatio: 0.5,
  upgradeBonusRatio: 0.1
});

export function repairCostFor(missing) {
  if (missing <= 0) return {};
  return { iron: Math.max(1, Math.ceil(missing / 40)) };
}

export function upgradeCostFor(nextUpgrade) {
  const cost = { iron: 3 * nextUpgrade, coal: 2 * nextUpgrade, coins: 20 * nextUpgrade };
  if (nextUpgrade >= 3) cost.gold = nextUpgrade - 2;
  return cost;
}

export const MINE_CONFIG = {
  x: 2380,
  y: 760,
  radius: 130,
  ironVeins: [6, 10],
  coalVeins: [2, 3],
  goldVeins: 1,
  safeCampDistance: 650
};
