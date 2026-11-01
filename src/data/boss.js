import { WORLD } from '../game/config.js';

export const BOSS_CONFIG = Object.freeze({
  id: 'biomeBoss',
  // O golem de lava do mapa é o Golem de Fogo das missões 96 e 97 (etiqueta "golem").
  name: 'Golem de Fogo',
  campaignTag: 'golem',
  x: 360,
  y: 330,
  maxHealth: 10000,
  // 70 por golpe, sem a redução de dano dos inimigos comuns (só a defesa reduz).
  damage: 70,
  speed: 54,
  detectionRange: 720,
  attackRange: 560,
  // Mais tempo entre um ataque e outro para compensar o dano alto.
  patternCooldownMs: 3500,
  healthBarRange: 720,
  rareItem: 'titanCore',
  rareItemAmount: 1,
  coinDrop: 50,
  recipeId: 'titanBlade',
  patterns: Object.freeze(['charge', 'slam', 'volley']),
  // Ponto fraco (estilo "mirar no olho" do Dragon's Dogma): golpes que acertarem dentro do
  // círculo no peito do golem (calculado a partir da posição dele) causam dano dobrado.
  weakPoint: Object.freeze({
    dx: 0, dy: -34, radius: 44, multiplier: 2,
    label: 'Cristal incandescente no peito'
  })
});

export const BOSS_CAMP_DISTANCE = Math.hypot(
  BOSS_CONFIG.x - WORLD.camp.x,
  BOSS_CONFIG.y - WORLD.camp.y
);
