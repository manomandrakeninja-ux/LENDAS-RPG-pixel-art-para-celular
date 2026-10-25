import {
  ACCESSORIES,
  ENCHANTMENTS,
  FORGE_RECIPES,
  FORGE_SERVICES,
  repairCostFor,
  upgradeCostFor
} from '../data/buildingSystems.js';
import { clampLevel } from '../data/buildings.js';

const DURABLE = new Set(['weapon', 'armor', 'shield']);

// Saves antigos (Ferraria de 3 níveis) usavam outros nomes de item.
const LEGACY_IDS = Object.freeze({
  ironSword: 'simpleSword',
  steelChestplate: 'steelArmor'
});
const LEGACY_UPGRADES = Object.freeze({
  sharpnessEnchantment: 'weapon',
  barrierEnchantment: 'armor'
});

function noopPay() {
  return false;
}

export class EquipmentSystem {
  /**
   * saved: formato novo { version: 2, items: { id: { durability, upgrade } }, activeEnchant, accessories }
   *        ou formato antigo { id: true }.
   */
  constructor({ saved = {}, forgeLevel = 1, unlockedRecipes = [] } = {}) {
    this.forgeLevel = clampLevel('forge', forgeLevel);
    this.items = {};
    this.activeEnchant = null;
    this.accessories = new Set();
    this.unlockedRecipes = new Set(
      (Array.isArray(unlockedRecipes) ? unlockedRecipes : [])
        .filter((id) => FORGE_RECIPES[id]?.requiresBoss)
    );
    if (Number(saved?.version) >= 2) this.restore(saved);
    else this.migrateLegacy(saved ?? {});
  }

  restore(saved) {
    for (const [id, state] of Object.entries(saved.items ?? {})) {
      const recipe = FORGE_RECIPES[id];
      if (!recipe || !state) continue;
      this.items[id] = this.normalizeState(recipe, state);
    }
    if (ENCHANTMENTS[saved.activeEnchant] && this.hasEnchant(saved.activeEnchant)) {
      this.activeEnchant = saved.activeEnchant;
    }
    for (const id of Array.isArray(saved.accessories) ? saved.accessories : []) {
      if (ACCESSORIES[id]) this.accessories.add(id);
    }
  }

  migrateLegacy(saved) {
    const upgrades = [];
    for (const [legacyId, crafted] of Object.entries(saved)) {
      if (!crafted) continue;
      if (LEGACY_UPGRADES[legacyId]) {
        upgrades.push(LEGACY_UPGRADES[legacyId]);
        continue;
      }
      const id = LEGACY_IDS[legacyId] ?? legacyId;
      const recipe = FORGE_RECIPES[id];
      if (recipe) this.items[id] = this.normalizeState(recipe, {});
    }
    // Os antigos encantamentos simples viram melhoria +1 na peça correspondente.
    for (const category of upgrades) {
      const best = this.bestOf(category);
      if (best) this.items[best].upgrade = Math.min(FORGE_SERVICES.maxUpgrade, this.items[best].upgrade + 1);
    }
  }

  normalizeState(recipe, state) {
    const durable = DURABLE.has(recipe.category);
    const durability = Number(state.durability);
    return {
      durability: durable
        ? Math.max(0, Math.min(recipe.durability, Number.isFinite(durability) ? durability : recipe.durability))
        : null,
      upgrade: durable ? Math.max(0, Math.min(FORGE_SERVICES.maxUpgrade, Math.floor(Number(state.upgrade) || 0))) : 0
    };
  }

  has(id) {
    return Boolean(this.items[id]);
  }

  hasTool(tool) {
    return Object.keys(this.items).some((id) => FORGE_RECIPES[id].tool === tool);
  }

  get pickaxeTier() {
    if (this.hasTool('ironPickaxe')) return 'iron';
    if (this.hasTool('stonePickaxe')) return 'stone';
    return null;
  }

  get hasBow() {
    return Object.keys(this.items).some((id) => FORGE_RECIPES[id].category === 'bow');
  }

  hasEnchant(enchant) {
    return Object.keys(this.items).some((id) => FORGE_RECIPES[id].enchant === enchant);
  }

  get ownedEnchants() {
    return Object.keys(ENCHANTMENTS).filter((enchant) => this.hasEnchant(enchant));
  }

  setActiveEnchant(enchant) {
    if (enchant !== null && !this.hasEnchant(enchant)) return false;
    this.activeEnchant = enchant;
    return true;
  }

  /** Bônus atual de uma peça, contando melhoria e desgaste. */
  itemValue(id) {
    const recipe = FORGE_RECIPES[id];
    const state = this.items[id];
    if (!recipe || !state) return 0;
    const base = recipe.attack ?? recipe.defense ?? 0;
    const upgrade = state.upgrade > 0
      ? Math.max(state.upgrade, Math.round(base * FORGE_SERVICES.upgradeBonusRatio * state.upgrade))
      : 0;
    const total = base + upgrade;
    return state.durability === 0 ? Math.floor(total * FORGE_SERVICES.brokenBonusRatio) : total;
  }

  bestOf(category) {
    let best = null;
    let bestValue = -1;
    for (const id of Object.keys(this.items)) {
      if (FORGE_RECIPES[id].category !== category) continue;
      const value = this.itemValue(id);
      if (value > bestValue) {
        best = id;
        bestValue = value;
      }
    }
    return best;
  }

  get equipped() {
    return { weapon: this.bestOf('weapon'), armor: this.bestOf('armor'), shield: this.bestOf('shield') };
  }

  canCraft(recipeId) {
    const recipe = FORGE_RECIPES[recipeId];
    if (!recipe) return { ok: false, message: 'Receita desconhecida.' };
    if (recipe.requiresBoss && !this.isRecipeUnlocked(recipeId)) {
      return { ok: false, message: 'Derrote o chefe do bioma para desbloquear esta receita.' };
    }
    if (this.forgeLevel < recipe.level) return { ok: false, message: `Requer ferreiro nível ${recipe.level}.` };
    if (this.has(recipeId)) return { ok: false, message: 'Item já criado.' };
    return { ok: true };
  }

  /** pay(cost) cobra o custo (mochila, armazém e moedas) e devolve true se conseguiu. */
  craft(recipeId, pay = noopPay) {
    const availability = this.canCraft(recipeId);
    if (!availability.ok) return availability;
    const recipe = FORGE_RECIPES[recipeId];
    if (!pay(recipe.cost)) return { ok: false, message: 'Recursos insuficientes.' };
    this.items[recipeId] = this.normalizeState(recipe, {});
    if (recipe.enchant && !this.activeEnchant) this.activeEnchant = recipe.enchant;
    return { ok: true, message: `${recipe.name} criado!`, recipe };
  }

  /** Desgaste: arma ao acertar, armadura e escudo ao receber golpes. */
  wear(category, amount = 1) {
    const id = this.equipped[category];
    if (!id) return false;
    const state = this.items[id];
    if (state.durability === null || state.durability === 0) return false;
    state.durability = Math.max(0, state.durability - amount);
    return state.durability === 0;
  }

  repairCost(id) {
    const recipe = FORGE_RECIPES[id];
    const state = this.items[id];
    if (!recipe || !state || state.durability === null) return null;
    return repairCostFor(recipe.durability - state.durability);
  }

  repair(id, pay = noopPay) {
    if (this.forgeLevel < FORGE_SERVICES.repairLevel) return { ok: false, message: `Reparo requer ferreiro nível ${FORGE_SERVICES.repairLevel}.` };
    const cost = this.repairCost(id);
    if (!cost || Object.keys(cost).length === 0) return { ok: false, message: 'Este item não precisa de reparo.' };
    if (!pay(cost)) return { ok: false, message: 'Recursos insuficientes para o reparo.' };
    this.items[id].durability = FORGE_RECIPES[id].durability;
    return { ok: true, message: `${FORGE_RECIPES[id].name} reparado.` };
  }

  dismantleReturn(id) {
    const recipe = FORGE_RECIPES[id];
    if (!recipe) return {};
    const result = {};
    for (const [type, amount] of Object.entries(recipe.cost)) {
      const returned = Math.floor(amount * FORGE_SERVICES.dismantleReturnRatio);
      if (returned > 0) result[type] = returned;
    }
    return result;
  }

  /** Remove o item e devolve metade dos materiais via `give(bundle)`. */
  dismantle(id, give = () => true) {
    if (this.forgeLevel < FORGE_SERVICES.dismantleLevel) return { ok: false, message: `Desmontar requer ferreiro nível ${FORGE_SERVICES.dismantleLevel}.` };
    if (!this.has(id)) return { ok: false, message: 'Item ausente.' };
    const recipe = FORGE_RECIPES[id];
    const returned = this.dismantleReturn(id);
    if (!give(returned)) return { ok: false, message: 'Sem espaço para os materiais.' };
    delete this.items[id];
    if (recipe.enchant && this.activeEnchant === recipe.enchant) this.activeEnchant = this.ownedEnchants[0] ?? null;
    return { ok: true, message: `${recipe.name} desmontado.`, returned };
  }

  upgradeCost(id) {
    const state = this.items[id];
    if (!state || state.durability === null || state.upgrade >= FORGE_SERVICES.maxUpgrade) return null;
    return upgradeCostFor(state.upgrade + 1);
  }

  upgrade(id, pay = noopPay) {
    if (this.forgeLevel < FORGE_SERVICES.upgradeLevel) return { ok: false, message: `Melhorias requerem ferreiro nível ${FORGE_SERVICES.upgradeLevel}.` };
    const cost = this.upgradeCost(id);
    if (!cost) return { ok: false, message: 'Este item não pode ser melhorado.' };
    if (!pay(cost)) return { ok: false, message: 'Recursos insuficientes para a melhoria.' };
    this.items[id].upgrade += 1;
    return { ok: true, message: `${FORGE_RECIPES[id].name} +${this.items[id].upgrade}!` };
  }

  addAccessory(id) {
    if (!ACCESSORIES[id] || this.accessories.has(id)) return false;
    this.accessories.add(id);
    return true;
  }

  getBonuses() {
    const bonuses = { attack: 0, defense: 0, fireResistance: 0, maxHealth: 0, speedPercent: 0 };
    const { weapon, armor, shield } = this.equipped;
    if (weapon) bonuses.attack += this.itemValue(weapon);
    if (armor) bonuses.defense += this.itemValue(armor);
    if (shield) bonuses.defense += this.itemValue(shield);
    for (const id of [weapon, armor]) {
      if (id) bonuses.fireResistance += FORGE_RECIPES[id].fireResistance ?? 0;
    }
    for (const id of this.accessories) {
      const accessory = ACCESSORIES[id];
      bonuses.attack += accessory.attack ?? 0;
      bonuses.defense += accessory.defense ?? 0;
      bonuses.fireResistance += accessory.fireResistance ?? 0;
      bonuses.maxHealth += accessory.maxHealth ?? 0;
      bonuses.speedPercent += accessory.speedPercent ?? 0;
    }
    return bonuses;
  }

  isRecipeUnlocked(recipeId) {
    return !FORGE_RECIPES[recipeId]?.requiresBoss || this.unlockedRecipes.has(recipeId);
  }

  unlockRecipe(recipeId) {
    if (!FORGE_RECIPES[recipeId]?.requiresBoss) return false;
    this.unlockedRecipes.add(recipeId);
    return true;
  }

  serializeUnlocks() {
    return [...this.unlockedRecipes];
  }

  serialize() {
    return {
      version: 2,
      items: Object.fromEntries(Object.entries(this.items).map(([id, state]) => [id, { ...state }])),
      activeEnchant: this.activeEnchant,
      accessories: [...this.accessories]
    };
  }
}
