export const INVENTORY_CONFIG = Object.freeze({
  maxSlots: 12,
  unitsPerSlot: 12,
  capacityVersion: 3,
  fullMessage: 'Mochila cheia! Volte ao acampamento'
});

export const WORLD = {
  width: 2880,
  height: 2160,
  tileSize: 48,
  camp: { x: 1440, y: 1080 }
};

export const RESOURCE_TYPES = {
  wood: { label: 'Madeira', color: 0x9d633b, accent: 0xd79a56, icon: 0 },
  stone: { label: 'Pedra', color: 0x87918b, accent: 0xc5c8ad, icon: 1 },
  herbs: { label: 'Ervas', color: 0x75b56a, accent: 0xd7d77c, icon: 2 },
  food: { label: 'Comida', color: 0xd87854, accent: 0xf2c778, icon: 3 },
  seeds: { label: 'Sementes', color: 0x8daa45, accent: 0xd6d66a, icon: null, codeIcon: 'seeds' },
  iron: { label: 'Ferro', color: 0x69757d, accent: 0xc1cbd0, icon: null, codeIcon: 'iron' },
  coal: { label: 'Carvão', color: 0x25272a, accent: 0x62666a, icon: null, codeIcon: 'coal' },
  gold: { label: 'Ouro', color: 0xb88b24, accent: 0xffdc5a, icon: null, codeIcon: 'gold' },
  potion: { label: 'Poção de Vida', color: 0xb13f57, accent: 0xff7b8f, icon: null, codeIcon: 'potion' },
  torch: { label: 'Tocha', color: 0x8d4d27, accent: 0xffa53d, icon: null, codeIcon: 'torch' },
  egg: { label: 'Ovo', color: 0xc9b994, accent: 0xf4e8c8, icon: null, codeIcon: 'egg' },
  wool: { label: 'Lã', color: 0xbdb9a8, accent: 0xf1eddf, icon: null, codeIcon: 'wool' },
  milk: { label: 'Leite', color: 0xaebfd0, accent: 0xf2f4e8, icon: null, codeIcon: 'milk' },
  moonherb: { label: 'Erva Lunar', color: 0x879bd8, accent: 0xc8d5ff, icon: 4 },
  ectoplasm: { label: 'Ectoplasma', color: 0x58b8b0, accent: 0x9ef0df, icon: 5 },
  bone: { label: 'Ossos', color: 0xd1c9aa, accent: 0xf4edcf, icon: 6 },
  silk: { label: 'Seda', color: 0xa28ab8, accent: 0xdac6e5, icon: 7 },
  titanCore: { label: 'Núcleo do Titã', color: 0x8e4939, accent: 0xf0a05d, icon: null, codeIcon: 'titanCore' },
  staminaPotion: { label: 'Poção de Vigor', color: 0x3f8f5b, accent: 0x9be08f, icon: null, codeIcon: 'staminaPotion' },
  trap: { label: 'Armadilha', color: 0x6b6f73, accent: 0xc9ced1, icon: null, codeIcon: 'trap' },
  elixir: { label: 'Elixir de Força', color: 0x8b3fb1, accent: 0xf0a6ff, icon: null, codeIcon: 'elixir' }
};
