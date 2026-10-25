// Catálogo central dos itens: o que é, para que serve e onde conseguir.
// As fontes e usos são lidos dos próprios dados do jogo (coleta, inimigos, mercado,
// fazenda, ferreiro, missões...). Assim o painel nunca promete algo que não existe.
import { RESOURCE_TYPES } from '../game/config.js';
import { BOSS_CONFIG } from './boss.js';
import { ANIMAL_PRODUCTS, FARM_CROPS, FORGE_RECIPES, MINE_CONFIG } from './buildingSystems.js';
import { BUILDING_DEFS, BUILDING_ORDER } from './buildings.js';
import { LEATHER_DROP, MISSIONS, RARE_SHOP, SITES } from './campaign.js';
import { CONSUMABLES } from './consumables.js';
import { MARKET_CATALOG, TRAVELER_CATALOG, sellPriceOf } from './economy.js';
import { ENEMY_TYPES } from './enemies.js';
import { CHEST_LOOT_RECIPES, HARVEST_STRUCTURE_TYPES } from './harvestStructures.js';
import { NIGHT_RESOURCES } from './nightResources.js';
import { RESOURCE_NODES } from './resources.js';
import { TRAVELER_GOODS, TRAVELER_QUESTS } from './travelers.js';

/** Descrição curta de cada item (uma só, usada em todas as telas). */
export const ITEM_DESCRIPTIONS = Object.freeze({
  wood: 'Toras cortadas de árvores. O material básico de quase toda construção.',
  stone: 'Pedra bruta para fundações, muralhas e ferramentas.',
  herbs: 'Folhas medicinais colhidas em arbustos e na fazenda.',
  food: 'Cogumelos, carne e colheitas. Mata a fome e recupera um pouco de vida.',
  seeds: 'Sementes para plantar nos canteiros da Fazenda.',
  iron: 'Minério de ferro para armas, armaduras e melhorias.',
  coal: 'Carvão que alimenta a forja nas receitas mais fortes.',
  gold: 'Ouro bruto, raro e valioso. Usado nas peças lendárias.',
  potion: 'Poção vermelha que recupera muita vida de uma vez.',
  torch: 'Tocha de mão que ilumina mais longe durante a noite.',
  egg: 'Ovo fresco das galinhas da Fazenda.',
  wool: 'Lã tosquiada da ovelha da Fazenda.',
  milk: 'Leite fresco da vaca da Fazenda.',
  moonherb: 'Erva que brilha e só brota à noite.',
  ectoplasm: 'Resto gelatinoso deixado por fantasmas.',
  bone: 'Ossos de esqueletos e criaturas.',
  silk: 'Fio resistente tecido pelas aranhas gigantes.',
  titanCore: 'Coração de pedra do Titã do Bioma. Muito raro.',
  staminaPotion: 'Poção verde que enche todo o vigor.',
  trap: 'Armadilha de ferro que prende e fere quem pisa nela.',
  elixir: 'Elixir que aumenta ataque e defesa por um tempo.',
  water: 'Água limpa, pedida pelos moradores em várias missões.',
  fabric: 'Tecido grosso para tochas e roupas.',
  leather: 'Couro curtido de lobos e javalis.',
  fish: 'Peixe pescado no Lago Cristalino.',
  crystal: 'Cristal azul das cavernas geladas do norte.',
  magmaCore: 'Núcleo ardente arrancado dos veios de magma.',
  book: 'Livro antigo com segredos do Primeiro Mundo.',
  mapPiece: 'Pedaço de um mapa antigo. Junte as partes.'
});

/** Receita da tocha da Fogueira (a mesma usada pela cena e pelo menu). */
export const TORCH_RECIPE = Object.freeze({ cost: Object.freeze({ wood: 2, fabric: 1 }), yield: Object.freeze({ torch: 1 }) });

export const NO_SOURCE_MESSAGE = 'Fonte de obtenção ainda não disponível.';

const BUILDING_NAME = (key) => BUILDING_DEFS[key]?.name ?? key;
const label = (type) => RESOURCE_TYPES[type]?.label ?? type;
const percent = (chance) => `${Math.round(chance * 100)}%`;
const range = (value) => (Array.isArray(value) ? (value[0] === value[1] ? `${value[0]}` : `${value[0]}–${value[1]}`) : `${value}`);

/** Primeiro nível em que um valor por nível (array) fica "ligado". */
function firstLevelWhere(values, test) {
  if (!Array.isArray(values)) return null;
  const index = values.findIndex(test);
  return index >= 0 ? index + 1 : null;
}

// ---------- Fontes ----------

/**
 * Lista de fontes reais de um item.
 * Cada fonte: { kind, text, target? } — target diz para onde o botão "Ir até a fonte" leva:
 *   { building, tab }            abre um menu de prédio
 *   { map: 'structure', type }   marca a estrutura mais próxima no mapa
 *   { map: 'point', x, y, name } marca um ponto fixo no mapa
 *   { map: 'site', id }          marca um local de missão (só quando ativo)
 */
export function itemSources(type) {
  const sources = [];
  const add = (kind, text, target = null) => sources.push({ kind, text, ...(target ? { target } : {}) });

  // Coleta no mapa.
  for (const [nodeType, node] of Object.entries(RESOURCE_NODES)) {
    if (nodeType !== type) continue;
    add('gather', `Coletar no mapa (${range(node.amount)} por vez)${node.requiresPickaxe ? ' • precisa de picareta' : ''}.`);
  }
  for (const [structureType, structure] of Object.entries(HARVEST_STRUCTURE_TYPES)) {
    if (structure.rewardType !== type) continue;
    const inMine = structure.count === 0;
    const where = inMine ? 'na Mina' : structure.nightOnly ? 'no mapa, só à noite' : 'no mapa';
    const tool = structure.requiresPickaxe ? ' • segure E com picareta' : '';
    const regrow = structure.regrowDays > 0 ? ` • renasce em ${structure.regrowDays} dia${structure.regrowDays > 1 ? 's' : ''}` : '';
    add('gather', `${structure.label} ${where} (${range(structure.rewardAmount)})${tool}${regrow}.`, { map: 'structure', type: structureType });
  }
  if (['iron', 'coal', 'gold'].includes(type)) {
    add('gather', 'Mina a nordeste: veios de ferro, carvão e ouro.', { map: 'point', x: MINE_CONFIG.x, y: MINE_CONFIG.y, name: 'Mina' });
  }
  for (const [nightType, resource] of Object.entries(NIGHT_RESOURCES)) {
    if (nightType === type) add('gather', `Brota no mapa à noite (${range(resource.amount)} por vez).`);
  }
  if (CHEST_LOOT_RECIPES.some((loot) => loot[type])) add('chest', 'Baús espalhados pelo mapa.', { map: 'structure', type: 'chest' });

  // Inimigos.
  for (const enemy of Object.values(ENEMY_TYPES)) {
    const drop = enemy.drops?.find((entry) => entry.type === type);
    if (drop) add('enemy', `Derrotar ${enemy.name} (${percent(drop.chance)} de chance, ${range([drop.min, drop.max])}).`);
  }
  if (type === 'leather') {
    const names = LEATHER_DROP.enemies.map((id) => ENEMY_TYPES[id]?.name ?? id).join(' e ');
    add('enemy', `Derrotar ${names} (${percent(LEATHER_DROP.chance)} de chance).`);
  }
  if (type === BOSS_CONFIG.rareItem) add('enemy', `Derrotar o ${BOSS_CONFIG.name}.`, { map: 'point', x: BOSS_CONFIG.x, y: BOSS_CONFIG.y, name: BOSS_CONFIG.name });

  // Fazenda.
  for (const crop of Object.values(FARM_CROPS)) {
    if (!crop.yield[type]) continue;
    const level = crop.rare ? BUILDING_DEFS.farm.unlocks?.rareSeeds : 1;
    add('farm', `Plantar ${crop.name} na Fazenda (${range(crop.yield[type])}${level > 1 ? ` • nível ${level}` : ''}).`, { building: 'farm', tab: 'planting' });
  }
  for (const [animal, product] of Object.entries(ANIMAL_PRODUCTS)) {
    if (product.type !== type) continue;
    const level = BUILDING_DEFS.farm.animals?.[animal];
    add('farm', `${product.animal} da Fazenda (${product.amount} a cada ${product.seconds}s${level ? ` • nível ${level}` : ''}).`, { building: 'farm', tab: 'animals' });
  }

  // Fogueira.
  const cook = BUILDING_DEFS.campfire.cookRecipe;
  if (cook?.yield?.[type]) {
    add('craft', `Cozinhar na Fogueira: ${bundleText(cook.cost)} → ${bundleText(cook.yield)} (nível ${BUILDING_DEFS.campfire.unlocks.cook}).`, { building: 'campfire', tab: 'fire' });
  }
  if (type === 'torch') add('craft', `Fabricar na Fogueira: ${bundleText(TORCH_RECIPE.cost)} → 1 tocha.`, { building: 'campfire', tab: 'fire' });

  // Comércio.
  for (const entry of MARKET_CATALOG) {
    if (!entry.yield[type]) continue;
    add('market', `Mercado: ${entry.name} por ${entry.price} moedas (${bundleText(entry.yield)}${entry.level > 1 ? ` • nível ${entry.level}` : ''}).`, { building: 'market', tab: 'buy' });
  }
  const marketTravelerLevel = firstLevelWhere(BUILDING_DEFS.market.stats?.travelerEveryDays, (value) => value > 0);
  for (const [rarity, entries] of Object.entries(TRAVELER_CATALOG)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      if (!entry.yield[type]) continue;
      const level = rarity === 'epic' ? BUILDING_DEFS.market.unlocks.epicTraveler : marketTravelerLevel;
      add('market', `Mercador viajante do Mercado: ${entry.name} por ${entry.price} moedas (nível ${level}, em dias de visita).`, { building: 'market', tab: 'traveler' });
    }
  }
  for (const good of TRAVELER_GOODS) {
    if (!good.yield[type]) continue;
    add('market', `Viajante da Fogueira: ${good.name} por ${good.price} moedas (Fogueira nível ${BUILDING_DEFS.campfire.unlocks.travelers}).`, { building: 'campfire', tab: 'traveler' });
  }
  for (const offer of RARE_SHOP) {
    if (offer.items[type]) add('market', `Mercador das Sombras (campanha): ${offer.name} por ${offer.price} moedas.`);
  }

  // Missões.
  const questRewards = TRAVELER_QUESTS.filter((quest) => quest.reward.items?.[type]);
  if (questRewards.length > 0) add('quest', `Recompensa de missão do viajante: ${questRewards.map((quest) => quest.text.replace(/\.$/, '')).join(' • ')}.`, { building: 'campfire', tab: 'traveler' });
  const missionRewards = MISSIONS.filter((mission) => mission.rewards.items?.[type]);
  if (missionRewards.length > 0) {
    const names = missionRewards.slice(0, 3).map((mission) => `“${mission.title}”`).join(', ');
    add('quest', `Recompensa ${missionRewards.length === 1 ? 'da missão' : 'das missões'} ${names}${missionRewards.length > 3 ? ` e mais ${missionRewards.length - 3}` : ''}.`);
  }
  for (const [id, site] of Object.entries(SITES)) {
    if (!site.gives?.[type]) continue;
    add('site', `${site.name}: ${site.kind === 'source' ? 'local de coleta' : 'achado único'} que aparece quando uma missão pede ${label(type).toLowerCase()}.`, { map: 'site', id });
  }

  return sources;
}

function bundleText(bundle = {}) {
  return Object.entries(bundle).map(([type, amount]) => `${amount} ${type === 'coins' ? 'moedas' : label(type).toLowerCase()}`).join(' + ');
}

// ---------- Usos ----------

/** Para que serve: efeito ao usar, receitas, construções, plantio e venda. */
export function itemUses(type) {
  const uses = [];
  const consumable = CONSUMABLES[type];
  if (consumable) {
    if (consumable.heal) uses.push(`Usar: recupera ${consumable.heal} de vida (tecla ${consumable.hotkey}).`);
    if (consumable.stamina) uses.push(`Usar: enche o vigor (tecla ${consumable.hotkey}).`);
    if (consumable.durationMs) uses.push(`Usar: amplia a luz por ${Math.round(consumable.durationMs / 60000)} min (tecla ${consumable.hotkey}).`);
    if (consumable.trap) uses.push(`Usar: arma uma armadilha que causa ${consumable.damage} de dano (tecla ${consumable.hotkey}).`);
    if (consumable.buff) uses.push(`Usar: +20% de ataque e defesa por um tempo (tecla ${consumable.hotkey}).`);
  }
  const recipes = Object.values(FORGE_RECIPES).filter((recipe) => recipe.cost?.[type]);
  if (recipes.length > 0) {
    const names = recipes.slice(0, 4).map((recipe) => recipe.name).join(', ');
    uses.push(`Ferreiro: ${names}${recipes.length > 4 ? ` e mais ${recipes.length - 4}` : ''}.`);
  }
  if (TORCH_RECIPE.cost[type]) uses.push('Fogueira: fabricar tochas.');
  if (BUILDING_DEFS.campfire.cookRecipe?.cost?.[type]) uses.push('Fogueira: cozinhar poções de vida.');
  const buildings = BUILDING_ORDER.filter((key) => Object.values(BUILDING_DEFS[key].costs ?? {}).some((cost) => cost?.[type]));
  if (buildings.length > 0) uses.push(`Construir e melhorar: ${buildings.map(BUILDING_NAME).join(', ')}.`);
  const crops = Object.values(FARM_CROPS).filter((crop) => crop.cost[type]);
  if (crops.length > 0) uses.push(`Fazenda: plantar ${crops.map((crop) => crop.name).join(', ')}.`);
  const missions = MISSIONS.filter((mission) => mission.objectives.some((objective) => objective.type === 'deliver' && objective.target === type));
  if (missions.length > 0) uses.push(`Pedido em ${missions.length} ${missions.length === 1 ? 'missão' : 'missões'} da campanha.`);
  const price = sellPriceOf(type);
  if (price > 0) uses.push(`Vender no Mercado: ${price} ${price === 1 ? 'moeda' : 'moedas'} cada (nível ${BUILDING_DEFS.market.unlocks.sell}).`);
  return uses;
}

/** Tudo que o painel precisa sobre um item (sem estado do jogador). */
export function itemInfo(type) {
  if (!RESOURCE_TYPES[type]) return null;
  return {
    type,
    name: label(type),
    description: ITEM_DESCRIPTIONS[type] ?? '',
    uses: itemUses(type),
    sources: itemSources(type),
    market: MARKET_CATALOG.filter((entry) => entry.yield[type])
  };
}

/** Itens sem nenhuma fonte implementada (para o relatório e os testes). */
export function itemsWithoutSource() {
  return Object.keys(RESOURCE_TYPES).filter((type) => itemSources(type).length === 0);
}

/** "Você possui 3 de 10 — faltam 7". */
export function needText(have, need) {
  if (!Number.isFinite(need) || need <= 0) return null;
  const missing = Math.max(0, need - have);
  return missing > 0 ? `Você possui ${have} de ${need} — faltam ${missing}` : `Você possui ${have} de ${need} — suficiente!`;
}
