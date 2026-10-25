// XP para subir: nível atual × 100. A cada nível, uma escolha entre três bônus.
export const PROGRESSION_CONFIG = Object.freeze({
  maxLevel: 20,
  xpPerLevel: 100,
  version: 2
});

export const LEVEL_CHOICES = Object.freeze({
  health: Object.freeze({ amount: 15, label: '+15 VIDA MÁXIMA' }),
  attack: Object.freeze({ amount: 3, label: '+3 ATAQUE' }),
  defense: Object.freeze({ amount: 2, label: '+2 DEFESA' })
});

export const PERK_LEVELS = Object.freeze([5, 10, 15, 20]);
export const PERK_OFFER_SIZE = 3;

export const PERKS = Object.freeze({
  vampirism: Object.freeze({ name: 'Sede de Sangue', description: 'Cada inimigo derrotado cura 4 de vida.' }),
  fleetfoot: Object.freeze({ name: 'Pés Ligeiros', description: 'Esquiva recarrega 35% mais rápido e gasta 30% menos vigor.' }),
  brute: Object.freeze({ name: 'Golpe Brutal', description: 'O golpe especial (Q) causa 3x o ataque em vez de 2x.' }),
  rhythm: Object.freeze({ name: 'Ritmo de Batalha', description: 'O 3º golpe do combo causa 2x o ataque em vez de 1,5x.' }),
  vitality: Object.freeze({ name: 'Vigor', description: '+25 de vida máxima.' }),
  scavenger: Object.freeze({ name: 'Saqueador', description: '25% de chance de dobrar os drops de inimigos.' })
});

export const PERK_EFFECTS = Object.freeze({
  vampirismHealPerKill: 4,
  fleetfootCooldownMultiplier: 0.65,
  fleetfootStaminaMultiplier: 0.7,
  bruteSpecialMultiplier: 3,
  rhythmFinisherMultiplier: 2,
  vitalityHealth: 25,
  scavengerChance: 0.25
});

export function xpRequiredForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  return normalizedLevel * PROGRESSION_CONFIG.xpPerLevel;
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
    return this.baseMaxHealth + this.legacy.health + this.healthPoints * LEVEL_CHOICES.health.amount +
      (this.hasPerk('vitality') ? PERK_EFFECTS.vitalityHealth : 0);
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
    return this.legacy.attack + this.attackPoints * LEVEL_CHOICES.attack.amount;
  }

  get defenseBonus() {
    return this.legacy.defense + this.defensePoints * LEVEL_CHOICES.defense.amount;
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
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
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
