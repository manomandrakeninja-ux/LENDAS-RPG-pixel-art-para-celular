export const FARM_CROPS = {
  wheat: {
    name: 'Trigo',
    seconds: 60,
    seedCost: 1,
    yieldType: 'food',
    yieldAmount: [2, 3],
    color: '#d8b75d'
  },
  pumpkin: {
    name: 'Abóbora',
    seconds: 90,
    seedCost: 1,
    yieldType: 'food',
    yieldAmount: [3, 5],
    color: '#d97932'
  },
  herb: {
    name: 'Erva',
    seconds: 45,
    seedCost: 1,
    yieldType: 'herbs',
    yieldAmount: [2, 3],
    color: '#79b85a'
  }
};

export const FARM_PLOT_COUNTS = { 1: 4, 2: 6, 3: 8 };

export const ANIMAL_PRODUCTS = {
  egg: { name: 'Ovo', animal: 'Galinha', seconds: 120, amount: 1, color: '#ead8b5' },
  wool: { name: 'Lã', animal: 'Ovelha', seconds: 120, amount: 1, color: '#eee9d8' },
  milk: { name: 'Leite', animal: 'Vaca', seconds: 120, amount: 1, color: '#f2ead4' }
};

export const FORGE_RECIPES = {
  stonePickaxe: {
    name: 'Picareta de Pedra',
    description: 'Permite minerar rochas e veios.',
    level: 1,
    cost: { stone: 3, wood: 2 },
    unique: true,
    effect: { tool: 'stonePickaxe' }
  },
  ironSword: {
    name: 'Espada de Ferro',
    description: 'Aumenta o ataque em +5.',
    level: 1,
    cost: { iron: 3, wood: 1 },
    unique: true,
    effect: { attack: 5 }
  },
  ironArmor: {
    name: 'Armadura de Ferro',
    description: 'Aumenta a defesa em +3.',
    level: 1,
    cost: { iron: 5, stone: 2 },
    unique: true,
    effect: { defense: 3 }
  },
  axe: {
    name: 'Machado',
    description: 'Coletas de plantas e minérios rendem +1 unidade.',
    level: 1,
    cost: { iron: 2, wood: 2 },
    unique: true,
    effect: { tool: 'axe' }
  },
  ironPickaxe: {
    name: 'Picareta de Ferro',
    description: 'Minera 40% mais rápido e rende +1 unidade.',
    level: 1,
    cost: { iron: 5 },
    unique: true,
    effect: { tool: 'ironPickaxe' }
  },
  steelSword: {
    name: 'Espada de Aço',
    description: 'Aumenta o ataque em +9.',
    level: 2,
    cost: { iron: 6, coal: 2, wood: 1 },
    unique: true,
    effect: { attack: 9 }
  },
  steelChestplate: {
    name: 'Peitoral de Aço',
    description: 'Aumenta a defesa em +6.',
    level: 2,
    cost: { iron: 8, stone: 3 },
    unique: true,
    effect: { defense: 6 }
  },
  sharpnessEnchantment: {
    name: 'Encantamento de Nitidez',
    description: 'Adiciona +2 de ataque à arma equipada.',
    level: 3,
    cost: { gold: 1, moonherb: 2, iron: 2 },
    unique: true,
    requires: 'ironSword',
    effect: { attack: 2 }
  },
  barrierEnchantment: {
    name: 'Encantamento de Barreira',
    description: 'Adiciona +2 de defesa à armadura equipada.',
    level: 3,
    cost: { gold: 1, ectoplasm: 2, iron: 2 },
    unique: true,
    requires: 'ironArmor',
    effect: { defense: 2 }
  },
  titanBlade: {
    name: 'Lâmina do Titã',
    description: 'Espada rara forjada com o Núcleo do Titã. Aumenta o ataque em +12.',
    level: 1,
    cost: { titanCore: 1, iron: 4, gold: 1 },
    unique: true,
    requiresBoss: 'biomeBoss',
    effect: { attack: 12 }
  }
};

export const MARKET_CATALOG = [
  { id: 'seeds', name: 'Sementes', price: 3, yield: { seeds: 1 }, maxStock: 3 },
  { id: 'healthPotion', name: 'Poção de Vida', price: 8, yield: { potion: 1 }, maxStock: 2 },
  { id: 'torch', name: 'Tocha', price: 2, yield: { torch: 1 }, maxStock: 3 },
  { id: 'ironBundle', name: 'Pacote de Ferro', price: 10, yield: { iron: 1 }, maxStock: 2 },
  { id: 'coalBundle', name: 'Pacote de Carvão', price: 6, yield: { coal: 1 }, maxStock: 2 },
  { id: 'goldBundle', name: 'Ouro Bruto', price: 15, yield: { gold: 1 }, maxStock: 1 },
  { id: 'herbBundle', name: 'Pacote de Ervas', price: 4, yield: { herbs: 2 }, maxStock: 3 },
  { id: 'stoneBundle', name: 'Pacote de Pedra', price: 5, yield: { stone: 2 }, maxStock: 3 },
  { id: 'woodBundle', name: 'Pacote de Madeira', price: 4, yield: { wood: 2 }, maxStock: 3 }
];

export const MARKET_STOCK_SIZE = 6;

// Moedas por unidade vendida. Recursos básicos valem 1; itens raros ou noturnos valem mais,
// sempre abaixo do preço de compra do mercado para não gerar lucro de revenda.
export const MARKET_SELL_PRICES = Object.freeze({
  wood: 1,
  stone: 1,
  herbs: 1,
  food: 1,
  seeds: 1,
  torch: 1,
  coal: 2,
  egg: 2,
  milk: 2,
  bone: 2,
  potion: 3,
  wool: 3,
  silk: 3,
  iron: 4,
  moonherb: 4,
  ectoplasm: 4,
  gold: 6,
  titanCore: 25
});

export function sellPriceOf(type) {
  return MARKET_SELL_PRICES[type] ?? 1;
}

export const MINE_CONFIG = {
  x: 2380,
  y: 760,
  radius: 130,
  ironVeins: [6, 10],
  coalVeins: [2, 3],
  goldChance: 0.45,
  safeCampDistance: 650
};

export const BUILDING_STORAGE_CAPACITY = { 1: 320, 2: 480, 3: 640 };

export const EQUIPMENT_COST_LABEL_ORDER = ['wood', 'stone', 'herbs', 'seeds', 'iron', 'coal', 'gold', 'food'];
