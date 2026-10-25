export const SPAWN_ZONES = {
  field: {
    name: 'Campinas',
    rect: { x: 900, y: 680, width: 1080, height: 820 },
    enemies: {
      day: ['slime', 'boar'],
      night: ['skeleton', 'ghost']
    }
  },
  forest: {
    name: 'Floresta densa',
    rect: { x: 90, y: 90, width: 1120, height: 980 },
    enemies: {
      day: ['slime', 'wolf'],
      night: ['werewolf', 'spider']
    }
  },
  quarry: {
    name: 'Pedreira',
    rect: { x: 1740, y: 430, width: 1040, height: 920 },
    enemies: {
      day: ['boar', 'wolf'],
      night: ['skeleton', 'werewolf']
    }
  },
  mine: {
    name: 'Mina de Ferro',
    rect: { x: 2110, y: 510, width: 540, height: 500 },
    enemies: {
      day: ['boar', 'boar', 'wolf'],
      night: ['werewolf', 'werewolf', 'skeleton']
    }
  },
  swamp: {
    name: 'Pântano',
    rect: { x: 960, y: 1370, width: 1260, height: 710 },
    enemies: {
      day: ['slime', 'boar'],
      night: ['ghost', 'spider']
    }
  }
};

export const SPAWN_ZONE_NAMES = Object.keys(SPAWN_ZONES);
