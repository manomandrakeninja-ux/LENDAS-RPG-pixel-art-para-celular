import { WORLD } from '../game/config.js';

export const BOSS_CONFIG = Object.freeze({
  id: 'biomeBoss',
  name: 'Titã do Bioma',
  x: 360,
  y: 330,
  maxHealth: 500,
  damage: 30,
  speed: 54,
  detectionRange: 720,
  attackRange: 560,
  patternCooldownMs: 1500,
  healthBarRange: 720,
  rareItem: 'titanCore',
  rareItemAmount: 1,
  coinDrop: 50,
  recipeId: 'titanBlade',
  patterns: Object.freeze(['charge', 'slam', 'volley'])
});

export const BOSS_CAMP_DISTANCE = Math.hypot(
  BOSS_CONFIG.x - WORLD.camp.x,
  BOSS_CONFIG.y - WORLD.camp.y
);
