import { FORGE_RECIPES } from '../data/buildingSystems.js';

export class EquipmentSystem {
  constructor({ saved = {}, forgeLevel = 1, unlockedRecipes = [] } = {}) {
    this.forgeLevel = Math.min(3, Math.max(1, Number(forgeLevel) || 1));
    this.crafted = {};
    this.unlockedRecipes = new Set(
      (Array.isArray(unlockedRecipes) ? unlockedRecipes : [])
        .filter((id) => FORGE_RECIPES[id]?.requiresBoss)
    );
    for (const [id, crafted] of Object.entries(saved ?? {})) {
      if (FORGE_RECIPES[id] && crafted) this.crafted[id] = true;
    }
  }

  has(id) {
    return Boolean(this.crafted[id]);
  }

  hasTool(tool) {
    return this.has(tool);
  }

  get pickaxeTier() {
    if (this.has('ironPickaxe')) return 'iron';
    if (this.has('stonePickaxe')) return 'stone';
    return null;
  }

  canCraft(recipeId) {
    const recipe = FORGE_RECIPES[recipeId];
    if (!recipe) return { ok: false, message: 'Receita desconhecida.' };
    if (recipe.requiresBoss && !this.isRecipeUnlocked(recipeId)) {
      return { ok: false, message: 'Derrote o chefe do bioma para desbloquear esta receita.' };
    }
    if (this.forgeLevel < recipe.level) return { ok: false, message: `Requer ferraria nível ${recipe.level}.` };
    if (recipe.unique && this.has(recipeId)) return { ok: false, message: 'Item já criado.' };
    if (recipe.requires && !this.has(recipe.requires)) return { ok: false, message: 'Crie o equipamento base primeiro.' };
    return { ok: true };
  }

  craft(recipeId, inventory) {
    const availability = this.canCraft(recipeId);
    if (!availability.ok) return availability;
    const recipe = FORGE_RECIPES[recipeId];
    if (!inventory.has(recipe.cost)) return { ok: false, message: 'Recursos insuficientes.' };
    inventory.remove(recipe.cost);
    this.crafted[recipeId] = true;
    return { ok: true, message: `${recipe.name} criado!`, recipe };
  }

  getBonuses() {
    const bonuses = { attack: 0, defense: 0 };
    for (const [id, crafted] of Object.entries(this.crafted)) {
      if (!crafted) continue;
      bonuses.attack += FORGE_RECIPES[id]?.effect.attack ?? 0;
      bonuses.defense += FORGE_RECIPES[id]?.effect.defense ?? 0;
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
    return { ...this.crafted };
  }
}
