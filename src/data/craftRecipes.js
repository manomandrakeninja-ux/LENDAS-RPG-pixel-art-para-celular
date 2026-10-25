// Receitas de itens (aba "Receitas" da Fogueira, Casa, Ferreiro e Fazenda).
// Dão uso a materiais que antes ficavam parados (couro, peixe, livro, núcleos, ossos...).
// cost: pago da mochila, do armazém e das moedas. yield: itens; "xp" e "coins" são especiais.

export const CRAFT_STATIONS = Object.freeze({
  campfire: 'Fogueira',
  house: 'Casa',
  forge: 'Ferreiro',
  farm: 'Fazenda'
});

export const CRAFT_RECIPES = Object.freeze([
  // Fogueira: cozinha.
  { id: 'roastFish', station: 'campfire', level: 1, name: 'Peixe Assado', description: 'Peixe na brasa: rende bastante comida.', cost: { fish: 1, wood: 1 }, yield: { food: 3 } },
  { id: 'omelet', station: 'campfire', level: 1, name: 'Omelete com Leite', description: 'Ovos e leite da Fazenda viram uma refeição farta.', cost: { egg: 2, milk: 1 }, yield: { food: 4 } },
  { id: 'herbTea', station: 'campfire', level: 2, name: 'Chá de Ervas', description: 'Água fervida com ervas: recupera o vigor.', cost: { herbs: 3, water: 1 }, yield: { staminaPotion: 1 } },
  { id: 'hunterStew', station: 'campfire', level: 3, name: 'Ensopado do Caçador', description: 'Caldo forte que cura como poção.', cost: { food: 2, herbs: 2, fish: 1 }, yield: { potion: 2 } },

  // Casa: tear e alquimia.
  { id: 'spinWool', station: 'house', level: 1, name: 'Fiar Lã', description: 'Transforma lã em tecido para tochas e roupas.', cost: { wool: 2 }, yield: { fabric: 1 } },
  { id: 'silkCloth', station: 'house', level: 1, name: 'Tecido de Seda', description: 'A seda das aranhas vira tecido resistente.', cost: { silk: 3 }, yield: { fabric: 2 } },
  { id: 'studyBook', station: 'house', level: 1, name: 'Estudar Livro Antigo', description: 'Ler os segredos do Primeiro Mundo dá experiência.', cost: { book: 1 }, yield: { xp: 60 } },
  { id: 'treasureMap', station: 'house', level: 1, name: 'Decifrar Mapa do Tesouro', description: 'Duas partes do mapa levam a um esconderijo de ouro.', cost: { mapPiece: 2 }, yield: { gold: 2, coins: 30 } },
  { id: 'vigorBrew', station: 'house', level: 2, name: 'Poção de Vigor Lunar', description: 'Erva lunar destilada com ervas comuns.', cost: { moonherb: 1, herbs: 2 }, yield: { staminaPotion: 1 } },
  { id: 'spiritPotion', station: 'house', level: 2, name: 'Poção Espectral', description: 'Ectoplasma estabilizado com leite: duas poções de vida.', cost: { ectoplasm: 1, herbs: 2, milk: 1 }, yield: { potion: 2 } },
  { id: 'strengthElixir', station: 'house', level: 4, name: 'Elixir de Força', description: 'Cristal, erva lunar e ectoplasma num elixir poderoso.', cost: { crystal: 1, moonherb: 2, ectoplasm: 1 }, yield: { elixir: 1 } },

  // Ferreiro: oficina de materiais.
  { id: 'charcoal', station: 'forge', level: 1, name: 'Carvão Vegetal', description: 'Queima lenta de madeira para alimentar a forja.', cost: { wood: 4 }, yield: { coal: 1 } },
  { id: 'leatherTorch', station: 'forge', level: 1, name: 'Tochas de Couro', description: 'Couro enrolado em madeira: queima por bastante tempo.', cost: { leather: 1, wood: 2 }, yield: { torch: 2 } },
  { id: 'boneTrap', station: 'forge', level: 1, name: 'Armadilha de Ossos', description: 'Mandíbula de ossos presa num gatilho de ferro.', cost: { iron: 1, bone: 2 }, yield: { trap: 1 } },
  { id: 'leatherTrap', station: 'forge', level: 2, name: 'Laço de Couro', description: 'Laços de couro e seda que prendem os inimigos.', cost: { leather: 2, silk: 1 }, yield: { trap: 2 } },
  { id: 'smeltMagma', station: 'forge', level: 3, name: 'Fundir Núcleo de Magma', description: 'O calor do núcleo derrete pedra e libera ferro e carvão.', cost: { magmaCore: 1, stone: 4 }, yield: { iron: 4, coal: 2 } },
  { id: 'crystalGold', station: 'forge', level: 5, name: 'Transmutar Cristal', description: 'Cristal azul aquecido no carvão vira ouro.', cost: { crystal: 2, coal: 2 }, yield: { gold: 2 } },
  { id: 'titanSmelt', station: 'forge', level: 6, name: 'Fundir Núcleo do Titã', description: 'Um núcleo extra do Titã rende muito ouro e ferro.', cost: { titanCore: 1 }, yield: { gold: 6, iron: 6 } },

  // Fazenda: adubo.
  { id: 'boneMeal', station: 'farm', level: 1, name: 'Farinha de Osso', description: 'Adubo de ossos e ervas que rende sementes.', cost: { bone: 2, herbs: 1 }, yield: { seeds: 3 } },
  { id: 'fishFertilizer', station: 'farm', level: 2, name: 'Adubo de Peixe', description: 'Restos de peixe enterrados geram novas mudas.', cost: { fish: 1 }, yield: { seeds: 2 } }
]);

export const CRAFT_RECIPES_BY_ID = Object.freeze(Object.fromEntries(CRAFT_RECIPES.map((recipe) => [recipe.id, recipe])));

/** Itens de verdade que a receita entrega (sem XP e moedas). */
export function recipeItems(recipe) {
  return Object.fromEntries(Object.entries(recipe.yield).filter(([type]) => type !== 'xp' && type !== 'coins'));
}

export function recipesFor(station) {
  return CRAFT_RECIPES.filter((recipe) => recipe.station === station);
}
