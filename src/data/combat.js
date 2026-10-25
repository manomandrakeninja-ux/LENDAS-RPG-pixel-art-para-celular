export const COMBAT_CONFIG = {
  // Dano que inimigos, chefes e invasões causam no jogador (1 = normal, 0.5 = metade, 0.1 = 10%).
  enemyDamageToPlayer: 0.25,
  basicAttackRange: 75,
  basicAttackCooldownMs: 420,
  specialAttackRange: 125,
  specialAttackMultiplier: 2,
  combo: {
    length: 3,
    windowMs: 900,
    finisherMultiplier: 1.5,
    finisherKnockback: 1.4
  },
  specialStaminaCost: 35,
  dodgeStaminaCost: 22,
  dodgeInvulnerabilityMs: 380,
  dodgeDurationMs: 170,
  dodgeSpeed: 430,
  dodgeCooldownMs: 850,
  knockback: {
    normal: 150,
    elite: 210,
    durationMs: 150
  },
  screenShake: {
    enemyHit: { duration: 90, intensity: 0.0025 },
    playerHit: { duration: 150, intensity: 0.006 },
    enemyDefeated: { duration: 110, intensity: 0.004 }
  },
  death: {
    carriedResourceLossRatio: 0.4,
    backpackLabel: 'Mochila de morte'
  }
};
