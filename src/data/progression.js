// XP para subir: nível atual × 100 até o 20; depois a curva sobe mais (até o 150).
// A cada nível, uma escolha entre três bônus.
export const PROGRESSION_CONFIG = Object.freeze({
  maxLevel: 150,
  xpPerLevel: 100,
  version: 2
});

export const LEVEL_CHOICES = Object.freeze({
  health: Object.freeze({ amount: 15, label: '+15 VIDA MÁXIMA' }),
  attack: Object.freeze({ amount: 3, label: '+3 ATAQUE' }),
  defense: Object.freeze({ amount: 2, label: '+2 DEFESA' })
});

export const PERK_LEVELS = Object.freeze([5, 10, 15, 20, 30, 45, 60, 80, 100, 125, 150]);
/** Nível da aura dourada no pé do personagem. */
export const LEGEND_AURA_LEVEL = 150;
export const PERK_OFFER_SIZE = 3;

export const PERKS = Object.freeze({
  vampirism: Object.freeze({ name: 'Sede de Sangue', description: 'Cada inimigo derrotado cura 4 de vida.' }),
  fleetfoot: Object.freeze({ name: 'Pés Ligeiros', description: 'Esquiva recarrega 35% mais rápido e gasta 30% menos vigor.' }),
  brute: Object.freeze({ name: 'Golpe Brutal', description: 'O golpe especial (Q) causa 3x o ataque em vez de 2x.' }),
  rhythm: Object.freeze({ name: 'Ritmo de Batalha', description: 'O 3º golpe do combo causa 2x o ataque em vez de 1,5x.' }),
  vitality: Object.freeze({ name: 'Vigor', description: '+25 de vida máxima.' }),
  scavenger: Object.freeze({ name: 'Saqueador', description: '25% de chance de dobrar os drops de inimigos.' }),
  giant: Object.freeze({ name: 'Colosso', description: '+12% de vida máxima.' }),
  fortress: Object.freeze({ name: 'Fortaleza', description: '+15 de defesa.' }),
  warlord: Object.freeze({ name: 'Senhor da Guerra', description: '+15 de ataque.' }),
  titan: Object.freeze({ name: 'Titã', description: '+60 de vida máxima.' }),
  critical: Object.freeze({ name: 'Crítico', description: '12% de chance de causar dano dobrado.' }),
  fury: Object.freeze({ name: 'Fúria', description: 'Abaixo de 40% de vida, causa 40% mais dano.' }),
  goldfinder: Object.freeze({ name: 'Mão de Ouro', description: 'Inimigos deixam 30% mais moedas.' }),
  scholar: Object.freeze({ name: 'Sábio', description: '+15% de XP ganho.' })
});

export const PERK_EFFECTS = Object.freeze({
  vampirismHealPerKill: 4,
  fleetfootCooldownMultiplier: 0.65,
  fleetfootStaminaMultiplier: 0.7,
  bruteSpecialMultiplier: 3,
  rhythmFinisherMultiplier: 2,
  vitalityHealth: 25,
  scavengerChance: 0.25,
  giantHealthMultiplier: 1.12,
  fortressDefense: 15,
  warlordAttack: 15,
  titanHealth: 60,
  criticalChance: 0.12,
  criticalMultiplier: 2,
  furyThreshold: 0.4,
  furyMultiplier: 1.4,
  goldfinderMultiplier: 1.3,
  scholarXpMultiplier: 1.15
});

/** Refazer talentos: nível x 50 moedas, mínimo 100. */
export function respecCost(level) {
  return Math.max(100, Math.floor(Number(level) || 1) * 50);
}

export function xpRequiredForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  // Até o 20 é linear (como sempre foi); depois cresce para o fim de jogo durar.
  const lateGame = 1 + Math.max(0, normalizedLevel - 20) / 30;
  return Math.round(normalizedLevel * PROGRESSION_CONFIG.xpPerLevel * lateGame);
}

export class PlayerProgression {
  constructor(saved = {}) {
    this.baseMaxHealth = Math.max(1, Number(saved.baseMaxHealth) || 100);
    this.level = Math.min(
      PROGRESSION_CONFIG.maxLevel,
      Math.max(1, Math.floor(Number(saved.level) || 1))
    );
    this.xp = Math.max(0, Math.floor(Number(saved.xp) || 0));
    const points = (value) => Math.max(0, Math.floor(Number(value) || 0));
    this.attackPoints = points(saved.attackPoints);
    this.defensePoints = points(saved.defensePoints);
    this.healthPoints = points(saved.healthPoints);
    // Saves antigos: +10 de vida automático por nível e +2 por ponto de ATQ/DEF.
    // Esses bônus são preservados como "legado" para ninguém perder atributos.
    this.legacy = {
      health: points(saved.legacy?.health),
      attack: points(saved.legacy?.attack),
      defense: points(saved.legacy?.defense)
    };
    if (Number(saved.version) !== PROGRESSION_CONFIG.version && Object.keys(saved).length > 0) {
      this.legacy = {
        health: (this.level - 1) * 10,
        attack: this.attackPoints * 2,
        defense: this.defensePoints * 2
      };
      this.attackPoints = 0;
      this.defensePoints = 0;
      this.healthPoints = 0;
    }
    this.pendingLevels = Array.isArray(saved.pendingLevels)
      ? saved.pendingLevels
        .map((level) => Math.floor(Number(level)))
        .filter((level) => Number.isFinite(level) && level > 1 && level <= PROGRESSION_CONFIG.maxLevel)
      : [];
    this.perks = Array.isArray(saved.perks)
      ? [...new Set(saved.perks.filter((perk) => Object.hasOwn(PERKS, perk)))]
      : [];
    // Saves anteriores aos talentos recebem as escolhas dos marcos que já passaram.
    const pendingPerks = Array.isArray(saved.pendingPerks)
      ? saved.pendingPerks
      : Array.isArray(saved.perks) ? [] : PERK_LEVELS.filter((level) => level <= this.level);
    this.pendingPerks = pendingPerks
      .map((level) => Math.floor(Number(level)))
      .filter((level) => PERK_LEVELS.includes(level))
      .slice(0, Math.max(0, PERK_LEVELS.length - this.perks.length));
  }

  get maxHealth() {
    const flat = this.baseMaxHealth + this.legacy.health + this.healthPoints * LEVEL_CHOICES.health.amount +
      (this.hasPerk('vitality') ? PERK_EFFECTS.vitalityHealth : 0) +
      (this.hasPerk('titan') ? PERK_EFFECTS.titanHealth : 0);
    return this.hasPerk('giant') ? Math.round(flat * PERK_EFFECTS.giantHealthMultiplier) : flat;
  }

  /** Multiplicador de dano dos talentos Crítico e Fúria para um golpe. */
  damageMultiplier(healthRatio = 1, random = Math.random) {
    let multiplier = 1;
    if (this.hasPerk('fury') && healthRatio < PERK_EFFECTS.furyThreshold) multiplier *= PERK_EFFECTS.furyMultiplier;
    if (this.hasPerk('critical') && random() < PERK_EFFECTS.criticalChance) multiplier *= PERK_EFFECTS.criticalMultiplier;
    return multiplier;
  }

  get coinMultiplier() {
    return this.hasPerk('goldfinder') ? PERK_EFFECTS.goldfinderMultiplier : 1;
  }

  get hasLegendAura() {
    return this.level >= LEGEND_AURA_LEVEL;
  }

  hasPerk(perk) {
    return this.perks.includes(perk);
  }

  get hasPendingPerk() {
    return this.pendingPerks.length > 0;
  }

  /** Três talentos ainda não obtidos, em ordem determinística pelo nível do marco. */
  perkOffer(level = this.pendingPerks[0]) {
    const available = Object.keys(PERKS).filter((perk) => !this.hasPerk(perk));
    if (available.length <= PERK_OFFER_SIZE) return available;
    const start = Math.max(0, Math.floor(Number(level) || 0)) % available.length;
    return Array.from({ length: PERK_OFFER_SIZE }, (_, index) => available[(start + index) % available.length]);
  }

  choosePerk(perk) {
    // O atributo do nível é escolhido antes do talento do marco.
    if (!this.hasPendingPerk || this.hasPendingAttribute || !this.perkOffer().includes(perk)) {
      return { applied: false, perk: null };
    }
    this.perks.push(perk);
    this.pendingPerks.shift();
    return { applied: true, perk };
  }

  get xpToNext() {
    if (this.level >= PROGRESSION_CONFIG.maxLevel) return 0;
    return xpRequiredForLevel(this.level);
  }

  get xpRatio() {
    if (this.level >= PROGRESSION_CONFIG.maxLevel) return 1;
    return Math.min(1, this.xp / this.xpToNext);
  }

  get attackBonus() {
    return this.legacy.attack + this.attackPoints * LEVEL_CHOICES.attack.amount +
      (this.hasPerk('warlord') ? PERK_EFFECTS.warlordAttack : 0);
  }

  get defenseBonus() {
    return this.legacy.defense + this.defensePoints * LEVEL_CHOICES.defense.amount +
      (this.hasPerk('fortress') ? PERK_EFFECTS.fortressDefense : 0);
  }

  get hasPendingAttribute() {
    return this.pendingLevels.length > 0;
  }

  get hasPendingChoice() {
    return this.hasPendingAttribute || this.hasPendingPerk;
  }

  get nextChoiceLevel() {
    return this.pendingLevels[0] ?? null;
  }

  addXp(amount) {
    const scholar = this.hasPerk('scholar') ? PERK_EFFECTS.scholarXpMultiplier : 1;
    const gained = Math.max(0, Math.round((Number(amount) || 0) * scholar));
    if (gained === 0 || this.level >= PROGRESSION_CONFIG.maxLevel) {
      return { gained: 0, levelsGained: 0, leveledUp: false };
    }

    this.xp += gained;
    let levelsGained = 0;
    while (this.level < PROGRESSION_CONFIG.maxLevel && this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.pendingLevels.push(this.level);
      if (PERK_LEVELS.includes(this.level)) this.pendingPerks.push(this.level);
      levelsGained += 1;
    }
    if (this.level >= PROGRESSION_CONFIG.maxLevel) this.xp = 0;
    return { gained, levelsGained, leveledUp: levelsGained > 0 };
  }

  choose(attribute) {
    if (!this.hasPendingAttribute) return { applied: false, attribute: null };
    if (!Object.hasOwn(LEVEL_CHOICES, attribute)) {
      return { applied: false, attribute: null };
    }
    if (attribute === 'attack') this.attackPoints += 1;
    else if (attribute === 'defense') this.defensePoints += 1;
    else this.healthPoints += 1;
    this.pendingLevels.shift();
    return { applied: true, attribute };
  }

  /** Custo de refazer talentos e atributos na Fogueira: nível x 50, no mínimo 100 moedas. */
  get respecCost() {
    return respecCost(this.level);
  }

  /** Pontos de atributo e talentos já escolhidos (e que voltariam). */
  get spentChoices() {
    return this.attackPoints + this.defensePoints + this.healthPoints + this.perks.length;
  }

  /**
   * Refaz as escolhas: os pontos de atributo e os talentos voltam para escolha.
   * O bônus legado (saves antigos) e o nível não mudam.
   */
  respec() {
    const attributePoints = this.attackPoints + this.defensePoints + this.healthPoints;
    const total = attributePoints + this.pendingLevels.length;
    this.attackPoints = 0;
    this.defensePoints = 0;
    this.healthPoints = 0;
    // Cada escolha vale um dos níveis já alcançados (2 em diante); nenhum ponto se perde.
    this.pendingLevels = Array.from({ length: total }, (_, index) => (index % Math.max(1, this.level - 1)) + 2);
    this.perks = [];
    this.pendingPerks = PERK_LEVELS.filter((level) => level <= this.level);
    return { refunded: attributePoints, perks: this.pendingPerks.length };
  }

  serialize() {
    return {
      version: PROGRESSION_CONFIG.version,
      baseMaxHealth: this.baseMaxHealth,
      level: this.level,
      xp: this.xp,
      attackPoints: this.attackPoints,
      defensePoints: this.defensePoints,
      healthPoints: this.healthPoints,
      legacy: { ...this.legacy },
      pendingLevels: [...this.pendingLevels],
      perks: [...this.perks],
      pendingPerks: [...this.pendingPerks]
    };
  }
}
