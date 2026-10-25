import test from 'node:test';
import assert from 'node:assert/strict';
import { RESOURCE_TYPES } from '../src/game/config.js';
import { ITEM_DESCRIPTIONS, TORCH_RECIPE, itemInfo, itemSources, itemUses, itemsWithoutSource, needText } from '../src/data/itemCatalog.js';
import { FORGE_RECIPES, MINE_CONFIG } from '../src/data/buildingSystems.js';
import { BUILDING_DEFS } from '../src/data/buildings.js';
import { MARKET_CATALOG } from '../src/data/economy.js';
import { SITES } from '../src/data/campaign.js';

test('catálogo: todo item do jogo tem nome, descrição e pelo menos uma fonte real', () => {
  for (const type of Object.keys(RESOURCE_TYPES)) {
    const info = itemInfo(type);
    assert.ok(info, type);
    assert.equal(info.name, RESOURCE_TYPES[type].label);
    assert.ok(ITEM_DESCRIPTIONS[type]?.length > 10, `descrição de ${type}`);
  }
  assert.deepEqual(itemsWithoutSource(), []);
  assert.equal(itemInfo('naoExiste'), null);
});

test('catálogo: fontes vêm dos dados do jogo (mercado, mina, inimigos, fazenda, missões)', () => {
  const iron = itemSources('iron');
  assert.ok(iron.some((source) => source.target?.map === 'structure' && source.target.type === 'oreVein'));
  assert.ok(iron.some((source) => source.target?.map === 'point' && source.target.x === MINE_CONFIG.x));
  const ironOffer = MARKET_CATALOG.find((entry) => entry.yield.iron);
  assert.ok(iron.some((source) => source.kind === 'market' && source.text.includes(`${ironOffer.price} moedas`)));

  assert.ok(itemSources('bone').some((source) => source.kind === 'enemy' && source.text.includes('Esqueleto')));
  assert.ok(itemSources('egg').some((source) => source.kind === 'farm' && source.target?.building === 'farm'));
  assert.ok(itemSources('torch').some((source) => source.kind === 'craft' && source.target?.building === 'campfire'));
  const water = itemSources('water');
  assert.ok(water.length > 0 && water.every((source) => source.kind === 'site' && SITES[source.target.id]?.gives?.water));
  // Itens só de missão não aparecem como coletáveis no mapa nem à venda no Mercado.
  assert.ok(!water.some((source) => ['gather', 'market'].includes(source.kind)));
});

test('catálogo: usos acompanham receitas e construções reais', () => {
  const ironRecipes = Object.values(FORGE_RECIPES).filter((recipe) => recipe.cost?.iron);
  assert.ok(ironRecipes.length > 0);
  assert.ok(itemUses('iron').some((use) => use.startsWith('Ferreiro:') && use.includes(ironRecipes[0].name)));
  const woodBuildings = Object.values(BUILDING_DEFS).filter((building) => Object.values(building.costs ?? {}).some((cost) => cost.wood));
  assert.ok(itemUses('wood').some((use) => use.includes(woodBuildings[0].name)));
  assert.ok(itemUses('potion').some((use) => use.startsWith('Usar: recupera')));
  assert.deepEqual({ ...TORCH_RECIPE.cost }, { wood: 2, fabric: 1 });
  assert.ok(itemUses('fabric').includes('Fogueira: fabricar tochas.'));
});

test('catálogo: texto de quantidade necessária', () => {
  assert.equal(needText(3, 10), 'Você possui 3 de 10 — faltam 7');
  assert.equal(needText(12, 10), 'Você possui 12 de 10 — suficiente!');
  assert.equal(needText(3, null), null);
});
