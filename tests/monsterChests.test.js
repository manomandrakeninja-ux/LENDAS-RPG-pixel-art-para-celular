import test from 'node:test';
import assert from 'node:assert/strict';
import { CHEST_LOOT, rollMonsterChest } from '../src/data/monsterChests.js';
import { RESOURCE_TYPES } from '../src/game/config.js';
import { CRAFT_RECIPES } from '../src/data/craftRecipes.js';
import { itemUses } from '../src/data/itemCatalog.js';

const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test('baú de monstro: itens existentes, quantidades positivas e moedas por faixa', () => {
  for (const type of Object.values(CHEST_LOOT).flat()) assert.ok(RESOURCE_TYPES[type], type);
  for (let seed = 1; seed < 200; seed += 1) {
    const elite = rollMonsterChest('elite', seeded(seed));
    assert.ok(Object.keys(elite.items).length >= 2, JSON.stringify(elite));
    assert.ok(Object.values(elite.items).every((amount) => amount > 0));
    assert.ok(elite.coins >= 10 && elite.coins <= 25);
    const boss = rollMonsterChest('boss', seeded(seed));
    assert.ok(Object.keys(boss.items).some((type) => CHEST_LOOT.rare.includes(type)), 'chefe sempre tem item raro');
    assert.ok(boss.coins >= 40 && boss.coins <= 80);
  }
});

test('receitas: só usam itens do jogo e todo item tem alguma utilidade', () => {
  for (const recipe of CRAFT_RECIPES) {
    for (const type of Object.keys({ ...recipe.cost, ...recipe.yield })) {
      assert.ok(RESOURCE_TYPES[type] || type === 'xp' || type === 'coins', `${recipe.id}: ${type}`);
    }
  }
  const useless = Object.keys(RESOURCE_TYPES).filter((type) =>
    itemUses(type).filter((use) => !use.startsWith('Vender') && !use.startsWith('Pedido')).length === 0);
  assert.deepEqual(useless, []);
});
