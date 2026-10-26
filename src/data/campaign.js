// LENDAS RPG — As Cinzas do Primeiro Mundo.
// Dados da campanha: regiões, locais de missão, personagens, as 100 missões,
// registros da história e missões diárias. A lógica fica em src/game/CampaignSystem.js.
//
// Tipos de objetivo (type):
//   gather    {target: item, count}             recursos obtidos de verdade (coleta, baús, abates, colheita...)
//   structure {target: tipo de estrutura, count} estruturas coletadas (ex.: 'mushroom', 'chest')
//   kill      {target: espécie | tag | 'any', count, region?}
//   boss      {target: tag}                      chefe de missão derrotado
//   bossPhase {target: tag, ratio}               chefe levado até uma fração da vida
//   owns      {target: [receitas]}               ter fabricado no Ferreiro (estado)
//   craft     {target: 'torch', count}           fabricação na Fogueira
//   building  {target: prédio, level}            nível do prédio (estado)
//   animal    {target: produto}                  animal liberado na Fazenda (estado)
//   plant / harvest {target: cultura | 'any', count}
//   buy / sell {count}
//   deliver   {target: item, count}              entregue (consumido) ao concluir
//   reach     {target: local}                    chegar ao local
//   interact  {target: local}                    investigar/ativar com E
//   rescue    {target: local | grupo, count}     resgatar com E
//   talk      {target: personagem}               conversar com E
//   puzzle    {target: grupo}                    acender os pilares na ordem certa
//   defend    {target: local, count: segundos}   resistir no local enquanto inimigos atacam
//   flag      {target: marca}                    marca da campanha (estado)
//   seals     {count}                            selos elementais recuperados (estado)
//   choice    {target: 'golem'}                  decisão do jogador
//   residents {count}                            moradores no acampamento (estado)

import { BOSS_CONFIG } from './boss.js';
import { MISSION_STORY, STORY_LORE } from './story.js';

export const CAMPAIGN_VERSION = 1;
export const CAMPAIGN_TITLE = 'As Cinzas do Primeiro Mundo';

export const CHAPTERS = [
  { number: 1, title: 'O Viajante sem Memória', region: 'acampamento' },
  { number: 2, title: 'A Vila Começa a Viver', region: 'acampamento' },
  { number: 3, title: 'Ferro, Comércio e Muralhas', region: 'acampamento' },
  { number: 4, title: 'Os Mistérios da Floresta', region: 'floresta' },
  { number: 5, title: 'O Reino Perdido', region: 'valdora' },
  { number: 6, title: 'A Terra Congelada', region: 'norte' },
  { number: 7, title: 'O Deserto dos Ossos', region: 'deserto' },
  { number: 8, title: 'A Guerra das Cinzas', region: 'acampamento' },
  { number: 9, title: 'A Montanha das Cinzas', region: 'montanha' },
  { number: 10, title: 'O Destino de Eldoria', region: 'montanha' }
];

// Regiões: área tingida no chão, nome ao entrar e, em algumas, um perigo que exige preparo.
export const REGIONS = {
  acampamento: { name: 'Acampamento', x: 1440, y: 1080, radius: 0 },
  floresta: { name: 'Floresta Profunda', x: 520, y: 900, radius: 380, tint: 0x173a22, alpha: 0.35 },
  valdora: { name: 'Ruínas de Valdora', x: 400, y: 1760, radius: 330, tint: 0x6b6450, alpha: 0.32 },
  norte: {
    name: 'Terra Congelada', x: 1500, y: 330, radius: 340, tint: 0xe4f2fa, alpha: 0.5,
    hazard: { flag: 'warmClothes', damage: 3, message: 'Um frio cortante! Você precisa de roupas quentes (missão 51).' }
  },
  deserto: {
    name: 'Deserto dos Ossos', x: 2540, y: 1330, radius: 300, tint: 0xe0c27a, alpha: 0.45,
    hazard: { flag: 'desertSupplies', damage: 3, message: 'O calor do deserto drena suas forças! Prepare suprimentos (missão 61).' }
  },
  montanha: {
    name: 'Montanha das Cinzas', x: 2330, y: 1900, radius: 300, tint: 0x3a1f1c, alpha: 0.45,
    hazard: { flag: 'ashMasks', damage: 4, message: 'As cinzas queimam seus pulmões! Fabrique máscaras (missão 82).' }
  }
};

// Personagens. home = posição relativa à fogueira quando estão no acampamento.
export const NPCS = {
  vigia: {
    name: 'Bram, o Vigia', role: 'Vigia', home: { x: -96, y: 150 }, startsInCamp: true,
    palette: { tunic: '#6b5a3a', scarf: '#8a6a3a', hair: '#8d8d8d', skin: '#d9a070', hat: '#4a3a2a' },
    lines: [
      'Fique perto do fogo à noite. A escuridão daqui tem dentes.',
      'Desde que você chegou, o acampamento voltou a respirar.',
      'Eldoria já foi bonita, sabia? Antes do ritual dos reis.'
    ]
  },
  curandeira: {
    name: 'Lia, a Curandeira', role: 'Curandeira', home: { x: 96, y: 200 },
    palette: { tunic: '#3f8a6a', scarf: '#e8d6ab', hair: '#c46a3a', skin: '#f0c08a' },
    lines: [
      'Ervas frescas salvam vidas. Traga o que encontrar.',
      'Seu fragmento vermelho pulsa quando você se aproxima do fogo.',
      'Os feridos dormem melhor agora que temos muralhas.'
    ]
  },
  ferreiro: {
    name: 'Doran, o Ferreiro', role: 'Ferreiro', home: { x: -140, y: -10 },
    palette: { tunic: '#5a3a2a', scarf: '#3a3a3a', hair: '#2a1a12', skin: '#c98a5a', beard: true },
    lines: [
      'Ferro bom canta quando bate na bigorna.',
      'Traga minério e eu transformo em lenda.',
      'Meu mestre dizia: toda lâmina guarda um juramento.'
    ]
  },
  cacador: {
    name: 'Kael, o Caçador', role: 'Caçador', home: { x: 160, y: 110 },
    palette: { tunic: '#3a5a2a', scarf: '#6b4a2a', hair: '#3a2a1a', skin: '#d9a070', hat: '#2f4a22' },
    lines: [
      'A floresta fala. Basta saber ouvir os galhos quebrando.',
      'Lobos caçam em bando. Nunca fique cercado.',
      'Vi pegadas enormes perto das raízes antigas...'
    ]
  },
  construtor: {
    name: 'Tobias, o Construtor', role: 'Construtor', home: { x: -40, y: 240 },
    palette: { tunic: '#b8862f', scarf: '#5a3a2a', hair: '#6b4a2a', skin: '#e0a676', hat: '#d9b45c' },
    lines: [
      'Madeira e pedra: com isso eu levanto qualquer coisa.',
      'Uma muralha bem feita vale mais que cem espadas.',
      'Precisamos de mais casas. Gente nova chega toda semana!'
    ]
  },
  capitao: {
    name: 'Capitã Mirela', role: 'Capitã', home: { x: 40, y: -190 },
    palette: { tunic: '#7a2a2a', scarf: '#d9b45c', hair: '#1a1a2a', skin: '#c98a5a', hat: '#8d8d8d' },
    lines: [
      'Soldados sem rei, mas não sem honra.',
      'A guerra das cinzas está chegando. Precisamos estar prontos.',
      'Você luta como os antigos guardiões contavam.'
    ]
  },
  mercador: {
    name: 'Zeno, o Mercador', role: 'Mercador', home: { x: 150, y: -60 },
    palette: { tunic: '#5a3a7a', scarf: '#e8c15a', hair: '#2a1a12', skin: '#e0a676', hat: '#3a2a5a' },
    lines: [
      'Tudo tem preço, amigo. Até a esperança.',
      'Rotas seguras significam bons negócios para todos.',
      'Ouvi dizer que no deserto há um mercado que aparece e some.'
    ]
  }
};

const C = REGIONS.acampamento;
const at = (dx, dy) => ({ x: C.x + dx, y: C.y + dy });
const inRegion = (key, dx, dy) => ({ x: REGIONS[key].x + dx, y: REGIONS[key].y + dy, region: key });

// Locais de missão. Só aparecem enquanto a missão que os usa está ativa.
// kind: marker (chegar), source (E dá itens), loot (E dá itens uma vez), investigate (E),
//       rescue (E resgata), talk (E conversa), enemies (grupo de inimigos), boss, pillar, defend, assault.
// art: desenho do local (CampaignSystem.ensureSiteTextures).
// Lojas de comerciantes raros (mercador das sombras, miragens e eventos).
export const RARE_SHOP = [
  { id: 'elixir', name: 'Elixir de Força', price: 60, items: { elixir: 1 } },
  { id: 'vigor', name: 'Poção de Vigor', price: 25, items: { staminaPotion: 1 } },
  { id: 'crystal', name: 'Cristal Azul', price: 30, items: { crystal: 1 } },
  { id: 'fabric', name: 'Tecido', price: 12, items: { fabric: 2 } },
  { id: 'magma', name: 'Núcleo de Magma', price: 70, items: { magmaCore: 1 } }
];

// Couro: lobos e javalis às vezes deixam couro ao serem derrotados.
export const LEATHER_DROP = Object.freeze({ enemies: Object.freeze(['wolf', 'boar']), chance: 0.45 });

export const SITES = {
  // Capítulo 1 (arredores do acampamento)
  cogumelos: { name: 'Clareira de Cogumelos', ...at(-520, -260), kind: 'source', art: 'mushrooms', gives: { food: 1 }, emits: { type: 'structure', target: 'mushroom' }, uses: 3 },
  poco: { name: 'Poço Antigo', ...at(-470, 230), kind: 'source', art: 'well', gives: { water: 1 }, uses: 8 },
  deposito: { name: 'Depósito Infestado', ...at(560, -380), kind: 'enemies', art: 'crates', enemies: { kind: 'slime', visual: 'rat', name: 'Rato Gigante', tag: 'rato', count: 2, scale: 0.9 } },
  // Dois baús da missão 6 perto da carroça (marcados no mapa enquanto a missão está ativa).
  'bau-estrada': { name: 'Baú da Estrada', ...at(470, 380), kind: 'loot', art: 'chestSmall', gives: { wood: 3, food: 2 }, emits: { type: 'structure', target: 'chest' } },
  'bau-ruina': { name: 'Baú da Ruína', ...at(760, 220), kind: 'loot', art: 'chestSmall', gives: { herbs: 2, potion: 1 }, emits: { type: 'structure', target: 'chest' } },
  carroca: { name: 'Carroça Abandonada', ...at(620, 300), kind: 'loot', art: 'cart', gives: { fabric: 3 } },
  sobrevivente: { name: 'Sobrevivente Ferido', ...at(-620, 520), kind: 'rescue', art: 'tent', recruits: 'curandeira' },
  cristal: { name: 'Cristal Vermelho', ...at(380, 560), kind: 'investigate', art: 'redCrystal', lore: 'fragmento' },
  covil: { name: 'Covil do Lobo Cinzento', ...at(720, 520), kind: 'boss', art: 'den', boss: { kind: 'wolf', name: 'Lobo Cinzento', tag: 'loboCinzento', health: 7, damage: 1.4, scale: 1.6, tint: 0xb9c0c8 } },
  // Capítulo 2
  'ovelha-1': { name: 'Ovelha Perdida', ...at(-700, -80), kind: 'rescue', art: 'sheep', group: 'ovelhas' },
  'ovelha-2': { name: 'Ovelha Perdida', ...at(-560, 640), kind: 'rescue', art: 'sheep', group: 'ovelhas' },
  'ovelha-3': { name: 'Ovelha Perdida', ...at(700, -120), kind: 'rescue', art: 'sheep', group: 'ovelhas' },
  'refugiado-1': { name: 'Família de Refugiados', ...at(-760, 340), kind: 'rescue', art: 'tent', group: 'refugiados', residents: 2 },
  'refugiado-2': { name: 'Família de Refugiados', ...at(760, 160), kind: 'rescue', art: 'tent', group: 'refugiados', residents: 2 },
  festival: { name: 'Festival da Fogueira', ...at(0, 50), kind: 'investigate', art: 'banner' },
  // Capítulo 3
  'ferreiro-perdido': { name: 'Ferreiro Desaparecido', x: 2260, y: 900, kind: 'rescue', art: 'tent', recruits: 'ferreiro' },
  saqueadores: { name: 'Noite dos Saqueadores', ...at(0, 0), kind: 'assault', enemies: { kind: 'skeleton', visual: 'bandit', name: 'Saqueador', tag: 'saqueador', count: 6 } },
  // Capítulo 4 — Floresta Profunda
  'floresta-profunda': { name: 'Coração da Floresta', ...inRegion('floresta', 0, 0), kind: 'marker', art: 'sign' },
  cacador: { name: 'Acampamento do Caçador', ...inRegion('floresta', 140, 160), kind: 'talk', art: 'tent', recruits: 'cacador' },
  circulo: { name: 'Círculo de Cogumelos', ...inRegion('floresta', -170, 90), kind: 'investigate', art: 'mushrooms', lore: 'circulo' },
  cabana: { name: 'Cabana Esquecida', ...inRegion('floresta', 200, -150), kind: 'loot', art: 'cabin', gives: { book: 1 }, lore: 'diario' },
  raizes: { name: 'Raízes Antigas', ...inRegion('floresta', -60, -220), kind: 'boss', art: 'roots', boss: { kind: 'werewolf', visual: 'treant', name: 'Guardião das Raízes', tag: 'guardiaoRaizes', health: 6, damage: 1.3, scale: 1.5 } },
  fonte: { name: 'Fonte Azul', ...inRegion('floresta', 230, 60), kind: 'investigate', art: 'fountain' },
  'templo-terra': { name: 'Ruínas Cobertas', ...inRegion('floresta', -250, -40), kind: 'marker', art: 'ruins' },
  'pilar-terra-1': { name: 'Pilar de Pedra (raiz)', ...inRegion('floresta', -320, 40), kind: 'pillar', art: 'pillar', group: 'pilares-terra', order: 1 },
  'pilar-terra-2': { name: 'Pilar de Pedra (folha)', ...inRegion('floresta', -250, 90), kind: 'pillar', art: 'pillar', group: 'pilares-terra', order: 2 },
  'pilar-terra-3': { name: 'Pilar de Pedra (fruto)', ...inRegion('floresta', -180, 40), kind: 'pillar', art: 'pillar', group: 'pilares-terra', order: 3 },
  'memoria-terra': { name: 'Eco dos Guardiões', ...inRegion('floresta', -250, -110), kind: 'investigate', art: 'altar', lore: 'guardioes' },
  'selo-terra': { name: 'Altar do Selo da Terra', ...inRegion('floresta', -250, -40), kind: 'investigate', art: 'altar', seal: 'terra' },
  // Capítulo 5 — Ruínas de Valdora
  'mapa-1': { name: 'Parte do Mapa (estrada)', ...at(-820, 420), kind: 'loot', art: 'chestSmall', gives: { mapPiece: 1 } },
  'mapa-2': { name: 'Parte do Mapa (rio)', ...inRegion('valdora', 250, -260), kind: 'loot', art: 'chestSmall', gives: { mapPiece: 1 } },
  'mapa-3': { name: 'Parte do Mapa (torre)', ...inRegion('valdora', -180, -220), kind: 'loot', art: 'chestSmall', gives: { mapPiece: 1 } },
  'estrada-valdora': { name: 'Estrada para Valdora', ...inRegion('valdora', 260, -120), kind: 'enemies', art: 'sign', enemies: { kind: 'skeleton', visual: 'bandit', name: 'Bandido da Estrada', tag: 'bandido', count: 4 } },
  ponte: { name: 'Ponte Quebrada', ...inRegion('valdora', 160, 40), kind: 'investigate', art: 'bridge' },
  'guarda-1': { name: 'Guarda Ferido', ...inRegion('valdora', -60, 120), kind: 'rescue', art: 'soldier', group: 'guardas', residents: 1 },
  'guarda-2': { name: 'Guarda Ferido', ...inRegion('valdora', 60, 200), kind: 'rescue', art: 'soldier', group: 'guardas', residents: 1 },
  'guarda-3': { name: 'Guarda Ferido', ...inRegion('valdora', -200, 140), kind: 'rescue', art: 'soldier', group: 'guardas', residents: 1 },
  capita: { name: 'Posto da Capitã', ...inRegion('valdora', 0, 0), kind: 'talk', art: 'banner', recruits: 'capitao' },
  biblioteca: { name: 'Biblioteca Soterrada', ...inRegion('valdora', -120, -60), kind: 'source', art: 'books', gives: { book: 1 }, uses: 5 },
  mural: { name: 'Mural da Catástrofe', ...inRegion('valdora', -40, -150), kind: 'investigate', art: 'mural', lore: 'catastrofe' },
  'mercador-sombras': { name: 'Mercador das Sombras', ...inRegion('valdora', 200, 200), kind: 'talk', art: 'merchantTent', flag: 'shadowMerchant' },
  cripta: { name: 'Cripta Real', ...inRegion('valdora', -230, 40), kind: 'enemies', art: 'crypt', enemies: { kind: 'skeleton', visual: 'knight', name: 'Cavaleiro Corrompido', tag: 'cavaleiro', count: 4, elite: true } },
  'tumulo-rei': { name: 'Túmulo do Último Rei', ...inRegion('valdora', -260, -40), kind: 'investigate', art: 'tomb', lore: 'reis' },
  // Capítulo 6 — Terra Congelada
  'norte-entrada': { name: 'Passagem do Norte', ...inRegion('norte', 0, 300), kind: 'marker', art: 'sign' },
  'viajante-1': { name: 'Viajante Congelado', ...inRegion('norte', -200, 120), kind: 'rescue', art: 'tent', group: 'viajantes', residents: 1 },
  'viajante-2': { name: 'Viajante Congelado', ...inRegion('norte', 220, 140), kind: 'rescue', art: 'tent', group: 'viajantes', residents: 1 },
  lago: { name: 'Lago Cristalino', ...inRegion('norte', 120, -40), kind: 'source', art: 'pond', gives: { fish: 1 }, uses: 8 },
  'caverna-gelo': { name: 'Caverna de Gelo', ...inRegion('norte', -260, -60), kind: 'source', art: 'iceCave', gives: { crystal: 1 }, uses: 6 },
  urso: { name: 'Toca do Urso Branco', ...inRegion('norte', 280, -120), kind: 'boss', art: 'den', boss: { kind: 'boar', visual: 'bear', name: 'Urso Branco', tag: 'ursoBranco', health: 7, damage: 1.5, scale: 1.6 } },
  vilarejo: { name: 'Vilarejo Silencioso', ...inRegion('norte', -60, 60), kind: 'investigate', art: 'cabin', lore: 'vilarejo' },
  'santuario-agua': { name: 'Santuário das Águas', ...inRegion('norte', 0, -200), kind: 'investigate', art: 'fountain' },
  'guardiao-adormecido': { name: 'Templo Aquático', ...inRegion('norte', 0, -260), kind: 'boss', art: 'ruins', boss: { kind: 'ghost', visual: 'waterSpirit', name: 'Guardião Adormecido', tag: 'guardiaoAgua', health: 8, damage: 1.4, scale: 1.7 } },
  'selo-agua': { name: 'Altar do Selo da Água', ...inRegion('norte', 0, -200), kind: 'investigate', art: 'altar', seal: 'agua' },
  // Capítulo 7 — Deserto dos Ossos
  caravana: { name: 'Caravana Perdida', ...inRegion('deserto', -200, 60), kind: 'rescue', art: 'cart', residents: 2 },
  oasis: { name: 'Oásis dos Nômades', ...inRegion('deserto', 0, 180), kind: 'talk', art: 'merchantTent' },
  'ninho-escorpioes': { name: 'Ninho de Escorpiões', ...inRegion('deserto', 200, 60), kind: 'enemies', art: 'bones', enemies: { kind: 'spider', visual: 'scorpion', name: 'Escorpião Gigante', tag: 'escorpiao', count: 8 } },
  'mina-abandonada': { name: 'Mina Abandonada', ...inRegion('deserto', 160, -160), kind: 'source', art: 'mine', gives: { gold: 1 }, uses: 4 },
  'mercado-miragens': { name: 'Mercado das Miragens', ...inRegion('deserto', -120, -120), kind: 'marker', art: 'merchantTent', flag: 'mirageMarket' },
  esconderijo: { name: 'Esconderijo do Contrabandista', ...inRegion('deserto', -230, -40), kind: 'boss', art: 'crates', boss: { kind: 'skeleton', visual: 'bandit', name: 'Contrabandista', tag: 'contrabandista', health: 4, damage: 1.2, scale: 1.2 } },
  'pilar-vento-1': { name: 'Pilar do Vento (brisa)', ...inRegion('deserto', 0, -40), kind: 'pillar', art: 'pillar', group: 'pilares-vento', order: 1 },
  'pilar-vento-2': { name: 'Pilar do Vento (rajada)', ...inRegion('deserto', 70, -100), kind: 'pillar', art: 'pillar', group: 'pilares-vento', order: 2 },
  'pilar-vento-3': { name: 'Pilar do Vento (tempestade)', ...inRegion('deserto', -70, -100), kind: 'pillar', art: 'pillar', group: 'pilares-vento', order: 3 },
  grifo: { name: 'Ninho do Grifo', ...inRegion('deserto', 0, -200), kind: 'boss', art: 'nest', boss: { kind: 'wolf', visual: 'griffin', name: 'Grifo Guardião', tag: 'grifo', health: 10, damage: 1.6, scale: 1.7 } },
  'selo-vento': { name: 'Altar do Selo do Vento', ...inRegion('deserto', 0, -140), kind: 'investigate', art: 'altar', seal: 'vento' },
  // Capítulo 8 — A Guerra das Cinzas
  'coluna-fumaca': { name: 'Coluna de Fumaça', ...at(-300, -700), kind: 'marker', art: 'smoke' },
  'acampamento-inimigo': { name: 'Acampamento Corrompido', ...at(-420, -820), kind: 'enemies', art: 'banner', enemies: { kind: 'werewolf', visual: 'knight', name: 'Soldado das Cinzas', tag: 'patrulha', count: 6 } },
  documentos: { name: 'Mesa de Comando Inimiga', ...at(-480, -760), kind: 'loot', art: 'crates', gives: { book: 1 }, lore: 'documentos' },
  'aliados-norte': { name: 'Chefes do Norte', ...inRegion('norte', -120, 220), kind: 'talk', art: 'banner', residents: 3 },
  'torres-chamas': { name: 'Ataque às Torres', ...at(0, 0), kind: 'assault', enemies: { kind: 'werewolf', visual: 'knight', name: 'Incendiário', tag: 'incendiario', count: 8 } },
  'mestre-ferreiro': { name: 'Forja do Mestre', ...inRegion('norte', 300, 220), kind: 'rescue', art: 'anvil', residents: 1 },
  'templo-luz': { name: 'Templo da Luz', ...at(900, -760), kind: 'marker', art: 'ruins' },
  'selo-luz': { name: 'Altar do Selo da Luz', ...at(960, -820), kind: 'investigate', art: 'altar', seal: 'luz' },
  // Capítulo 9 — Montanha das Cinzas
  'passagem-vulcanica': { name: 'Passagem Vulcânica', ...inRegion('montanha', -260, -200), kind: 'marker', art: 'sign' },
  'ponte-lava': { name: 'Rio de Lava', ...inRegion('montanha', -150, -100), kind: 'investigate', art: 'lavaBridge' },
  'mineiro-1': { name: 'Mineiro Preso', ...inRegion('montanha', -220, 20), kind: 'rescue', art: 'tent', group: 'mineiros', residents: 1 },
  'mineiro-2': { name: 'Mineiro Preso', ...inRegion('montanha', -60, 120), kind: 'rescue', art: 'tent', group: 'mineiros', residents: 1 },
  'mineiro-3': { name: 'Mineiro Preso', ...inRegion('montanha', 80, -40), kind: 'rescue', art: 'tent', group: 'mineiros', residents: 1 },
  'veio-magma': { name: 'Veio de Magma', ...inRegion('montanha', 40, 60), kind: 'source', art: 'magma', gives: { magmaCore: 1 }, uses: 5 },
  'fortaleza-negra': { name: 'Fortaleza Negra', ...inRegion('montanha', 140, -160), kind: 'enemies', art: 'fortress', enemies: { kind: 'skeleton', visual: 'knight', name: 'Guarda da Fortaleza', tag: 'guardaFortaleza', count: 4, elite: true } },
  'cavaleiro-brasas': { name: 'Salão do Comandante', ...inRegion('montanha', 200, -200), kind: 'boss', art: 'fortress', boss: { kind: 'skeleton', visual: 'emberKnight', name: 'Cavaleiro das Brasas', tag: 'cavaleiroBrasas', health: 9, damage: 1.6, scale: 1.6 } },
  'selo-fogo': { name: 'Altar do Selo do Fogo', ...inRegion('montanha', 220, -120), kind: 'investigate', art: 'altar', seal: 'fogo' },
  'mural-golem': { name: 'Inscrições do Golem', ...inRegion('montanha', 100, 140), kind: 'investigate', art: 'mural', lore: 'golem' },
  // Capítulo 10 — O Destino de Eldoria
  'trilha-final': { name: 'A Última Trilha', ...inRegion('montanha', 0, 230), kind: 'marker', art: 'sign' },
  'mecanismo-1': { name: 'Encaixe da Terra', ...inRegion('montanha', -120, 180), kind: 'pillar', art: 'pillar', group: 'mecanismo', order: 1 },
  'mecanismo-2': { name: 'Encaixe da Água', ...inRegion('montanha', -60, 220), kind: 'pillar', art: 'pillar', group: 'mecanismo', order: 2 },
  'mecanismo-3': { name: 'Encaixe do Vento', ...inRegion('montanha', 0, 250), kind: 'pillar', art: 'pillar', group: 'mecanismo', order: 3 },
  'mecanismo-4': { name: 'Encaixe da Luz', ...inRegion('montanha', 60, 220), kind: 'pillar', art: 'pillar', group: 'mecanismo', order: 4 },
  'mecanismo-5': { name: 'Encaixe do Fogo', ...inRegion('montanha', 120, 180), kind: 'pillar', art: 'pillar', group: 'mecanismo', order: 5 },
  'portao-nucleo': { name: 'Portas do Núcleo', ...inRegion('montanha', 0, 120), kind: 'enemies', art: 'portal', enemies: { kind: 'skeleton', visual: 'emberKnight', name: 'Sentinela das Brasas', tag: 'sentinela', count: 3, elite: true } },
  'coracao-adormecido': { name: 'Coração Adormecido', ...inRegion('montanha', 0, 40), kind: 'investigate', art: 'redCrystal', lore: 'coracao' },
  'altar-escolha': { name: 'Altar da Escolha', ...inRegion('montanha', 0, 40), kind: 'choice', art: 'altar' },
  // O Golem de Fogo é o golem de lava do mapa (BiomeBoss): o local só marca onde ele está.
  nucleo: { name: 'Núcleo de Eldoria', x: BOSS_CONFIG.x, y: BOSS_CONFIG.y + 60, kind: 'boss', art: 'portal', boss: { kind: 'werewolf', visual: 'golem', name: 'Golem de Fogo', tag: 'golem', worldBoss: true } },
  estabilizar: { name: 'Estabilização do Núcleo', ...inRegion('montanha', 0, -20), kind: 'defend', art: 'portal', enemies: { kind: 'skeleton', visual: 'emberKnight', name: 'Brasa Viva', tag: 'brasa', count: 2 } },
  ritual: { name: 'Ritual do Amanhecer', ...inRegion('montanha', 0, -20), kind: 'investigate', art: 'altar', lore: 'amanhecer' }
};

// Registros da história, liberados ao longo da campanha (aba Registros do Diário).
export const LORE = {
  despertar: { title: 'O despertar', text: 'Você acorda junto a um acampamento abandonado, sem memória, com um fragmento vermelho preso ao pescoço. O fragmento está morno, como se tivesse um coração.' },
  fragmento: { title: 'O Fragmento Vermelho', text: 'O cristal na clareira brilhou ao tocar seu fragmento. Por um instante você viu cinco luzes girando ao redor de uma montanha em chamas.' },
  circulo: { title: 'O Círculo de Cogumelos', text: 'Os cogumelos formam um selo antigo. Sussurros falam de cinco guardiões: Terra, Água, Vento, Luz e Fogo.' },
  diario: { title: 'Diário do Explorador', text: '"Dia 40. As criaturas não eram assim. Algo mudou quando a montanha acendeu. Os reis prometeram poder eterno; trouxeram cinzas."' },
  guardioes: { title: 'O Eco dos Guardiões', text: 'Uma voz de pedra ecoa: "Fomos chamados para servir e acorrentados para obedecer. Liberte os selos e lembre-se de nós."' },
  catastrofe: { title: 'A Origem da Catástrofe', text: 'O mural mostra os antigos reis cercando os cinco guardiões. O ritual rompeu, e o céu de Eldoria se encheu de fogo.' },
  reis: { title: 'O Juramento Quebrado', text: 'O último rei confessa em sua lápide: "Quisemos dominar o que deveríamos proteger. Que o Golem nos perdoe pelo que deixamos dentro dele."' },
  vilarejo: { title: 'O Vilarejo Silencioso', text: 'Os moradores fugiram quando o lago congelou em uma noite. Rastros levam ao santuário das águas, onde o guardião dorme.' },
  documentos: { title: 'Mensagens Interceptadas', text: 'Ordens do Exército Corrompido: "Recuperem os selos antes do viajante. O Mestre precisa sair da montanha."' },
  golem: { title: 'A Verdade do Golem', text: 'O Golem de Fogo não é o inimigo. Ele foi criado para aprisionar uma entidade ancestral, o Devorador de Mundos, que os reis despertaram.' },
  coracao: { title: 'O Coração Adormecido', text: 'Com os cinco selos, o núcleo pode ser estabilizado. Mas o Golem, enfraquecido por séculos, perdeu o controle e ataca tudo ao redor.' },
  amanhecer: { title: 'O Amanhecer de Eldoria', text: 'O ritual se completa. As cinzas assentam, e o sol volta a nascer sobre Eldoria.' }
};

export const SEALS = {
  terra: { name: 'Selo da Terra', icon: 'sealEarth' },
  agua: { name: 'Selo da Água', icon: 'sealWater' },
  vento: { name: 'Selo do Vento', icon: 'sealWind' },
  luz: { name: 'Selo da Luz', icon: 'sealLight' },
  fogo: { name: 'Selo do Fogo', icon: 'sealFire' }
};

// ---------- Missões ----------

const o = {
  gather: (target, count) => ({ type: 'gather', target, count }),
  structure: (target, count) => ({ type: 'structure', target, count }),
  kill: (target, count, region) => ({ type: 'kill', target, count, ...(region ? { region } : {}) }),
  boss: (target) => ({ type: 'boss', target, count: 1 }),
  bossPhase: (target, ratio) => ({ type: 'bossPhase', target, ratio, count: 1 }),
  owns: (target) => ({ type: 'owns', target, count: 1 }),
  craft: (target, count) => ({ type: 'craft', target, count }),
  building: (target, level) => ({ type: 'building', target, level, count: 1 }),
  animal: (target) => ({ type: 'animal', target, count: 1 }),
  plant: (target, count) => ({ type: 'plant', target, count }),
  harvest: (target, count) => ({ type: 'harvest', target, count }),
  buy: (count) => ({ type: 'buy', target: 'any', count }),
  sell: (count) => ({ type: 'sell', target: 'any', count }),
  deliver: (target, count) => ({ type: 'deliver', target, count }),
  reach: (target) => ({ type: 'reach', target, count: 1 }),
  interact: (target) => ({ type: 'interact', target, count: 1 }),
  rescue: (target, count = 1) => ({ type: 'rescue', target, count }),
  talk: (target) => ({ type: 'talk', target, count: 1 }),
  puzzle: (target) => ({ type: 'puzzle', target, count: 1 }),
  defend: (target, seconds) => ({ type: 'defend', target, count: seconds }),
  flag: (target) => ({ type: 'flag', target, count: 1 }),
  seals: (count) => ({ type: 'seals', target: 'any', count }),
  choice: (target) => ({ type: 'choice', target, count: 1 }),
  residents: (count) => ({ type: 'residents', target: 'any', count })
};

function mission(number, npc, title, description, objectives, extra = {}) {
  const chapter = Math.ceil(number / 10);
  return {
    id: `m${String(number).padStart(3, '0')}`,
    number,
    chapter,
    region: extra.region ?? CHAPTERS[chapter - 1].region,
    npc,
    title,
    description,
    objectives,
    rewards: {
      xp: extra.xp ?? 30 + number * 8,
      coins: extra.coins ?? 10 + chapter * 6,
      items: extra.items ?? {}
    },
    ...(extra.lore ? { lore: extra.lore } : {}),
    ...(extra.setsFlag ? { setsFlag: extra.setsFlag } : {}),
    ...(extra.outro ? { outro: extra.outro } : {}),
    ...(extra.autoAccept ? { autoAccept: true } : {})
  };
}

export const MISSIONS = [
  // Capítulo 1 — O Viajante sem Memória
  mission(1, 'vigia', 'Uma Fogueira na Escuridão', 'Bram precisa de lenha para manter o fogo aceso esta noite. Colete madeira nas árvores e tocos ao redor.',
    [o.gather('wood', 5)], { lore: 'despertar', items: { food: 2 } }),
  mission(2, 'vigia', 'O Preço da Fome', 'Sem comida ninguém aguenta. Vá até a Clareira de Cogumelos, a noroeste do acampamento (losango no minimapa), e colha com E três vezes. À noite, os cogumelos do mapa também contam.',
    [o.structure('mushroom', 3)], { items: { iron: 2, stone: 3, wood: 2 }, outro: 'Leve este ferro ao Ferreiro do acampamento. Uma lâmina simples já ajuda.' }),
  mission(3, 'vigia', 'Uma Arma Enferrujada', 'Forje a Espada Simples no Ferreiro e limpe o depósito infestado de ratos gigantes a nordeste.',
    [o.owns(['simpleSword', 'ironSword', 'steelSword', 'legendarySword', 'dragonBlade', 'titanBlade']), o.kill('rato', 2)]),
  mission(4, 'vigia', 'Pegadas na Lama', 'Gosmas estão rondando o acampamento. Derrote três delas.',
    [o.kill('slime', 3)]),
  mission(5, 'vigia', 'Água para Todos', 'Busque água no Poço Antigo, a sudoeste, e entregue ao vigia.',
    [o.deliver('water', 5)], { items: { potion: 1 } }),
  mission(6, 'vigia', 'A Carroça Abandonada', 'Abra dois baús (Baú da Estrada e Baú da Ruína, marcados no mapa a sudeste) e recupere os tecidos da carroça abandonada.',
    [o.structure('chest', 2), o.gather('fabric', 3)]),
  mission(7, 'vigia', 'Luz na Floresta', 'Fabrique uma tocha na Fogueira (2 madeiras + 1 tecido) e resgate o sobrevivente ferido a sudoeste.',
    [o.craft('torch', 1), o.rescue('sobrevivente')], { items: { herbs: 2 } }),
  mission(8, 'curandeira', 'O Vigia Ferido', 'Bram se feriu protegendo o acampamento. Leve ervas medicinais para Lia.',
    [o.deliver('herbs', 4)], { items: { potion: 2 } }),
  mission(9, 'vigia', 'O Fragmento Vermelho', 'Um cristal vermelho apareceu a sudeste. Investigue-o com o seu fragmento.',
    [o.interact('cristal')], { lore: 'fragmento' }),
  mission(10, 'vigia', 'O Uivo do Primeiro Monstro', 'O Lobo Cinzento comanda as matilhas. Vá ao covil a sudeste e derrote-o.',
    [o.boss('loboCinzento')], { coins: 40, items: { leather: 2 }, outro: 'Com o Lobo Cinzento caído, o acampamento pode crescer em paz. Por enquanto.' }),

  // Capítulo 2 — A Vila Começa a Viver
  mission(11, 'construtor', 'Terra Fértil', 'Prepare novos canteiros: melhore a Fazenda para o nível 2.',
    [o.building('farm', 2)], { items: { seeds: 6 } }),
  mission(12, 'construtor', 'As Primeiras Sementes', 'Plante trigo nos canteiros da Fazenda.',
    [o.plant('wheat', 5)], { items: { seeds: 3 } }),
  mission(13, 'construtor', 'A Primeira Colheita', 'Espere o trigo crescer e faça a colheita.',
    [o.harvest('wheat', 5)]),
  mission(14, 'construtor', 'O Galinheiro', 'Melhore a Fazenda até liberar as galinhas.',
    [o.animal('egg')]),
  mission(15, 'curandeira', 'Ovos para o Café', 'Recolha ovos no galinheiro da Fazenda.',
    [o.gather('egg', 5)]),
  mission(16, 'construtor', 'O Rebanho Perdido', 'Três ovelhas fugiram durante a tempestade. Encontre-as pelos arredores e traga de volta.',
    [o.rescue('ovelhas', 3)], { items: { wool: 2 } }),
  mission(17, 'construtor', 'O Leite da Esperança', 'Construa o estábulo (libere as vacas na Fazenda) e colete leite.',
    [o.animal('milk'), o.gather('milk', 3)]),
  mission(18, 'curandeira', 'A Cozinha Comunitária', 'Lia vai preparar refeições para todos. Entregue comida e ovos.',
    [o.deliver('food', 5), o.deliver('egg', 2)], { items: { potion: 2 } }),
  mission(19, 'construtor', 'Um Lugar para Dormir', 'Melhore a Casa para o nível 2 e abrigue as famílias de refugiados.',
    [o.building('house', 2), o.rescue('refugiados', 2), o.residents(4)]),
  mission(20, 'vigia', 'O Festival da Fogueira', 'O acampamento merece uma celebração. Acenda o festival junto à fogueira.',
    [o.interact('festival')], { coins: 60, outro: 'Música, risadas e cheiro de pão. Pela primeira vez, isto parece um lar.' }),

  // Capítulo 3 — Ferro, Comércio e Muralhas
  mission(21, 'vigia', 'O Ferreiro Desaparecido', 'Doran, o ferreiro, sumiu perto da mina a nordeste. Encontre-o.',
    [o.rescue('ferreiro-perdido')]),
  mission(22, 'ferreiro', 'A Forja Precisa de Fogo', 'Melhore o Ferreiro para o nível 2 para Doran voltar a trabalhar.',
    [o.building('forge', 2)], { items: { coal: 2 } }),
  mission(23, 'ferreiro', 'Ferro nas Montanhas', 'Minere veios de ferro (precisa de picareta).',
    [o.gather('iron', 8)]),
  mission(24, 'ferreiro', 'A Primeira Lâmina', 'Forje uma Espada de Ferro no Ferreiro (nível 3).',
    [o.owns(['ironSword', 'steelSword', 'legendarySword', 'dragonBlade', 'titanBlade'])]),
  mission(25, 'cacador', 'Couro para a Batalha', 'Lobos e javalis deixam couro. Cace até juntar o suficiente.',
    [o.gather('leather', 5)]),
  mission(26, 'mercador', 'O Mercado de Valdora', 'Melhore o Mercado para o nível 2 e abra a banca comercial.',
    [o.building('market', 2)]),
  mission(27, 'mercador', 'Um Negócio Justo', 'Movimente o comércio: venda e compre no Mercado.',
    [o.sell(10), o.buy(5)], { coins: 50 }),
  mission(28, 'construtor', 'Pedras para a Muralha', 'Tobias precisa de muita pedra para a muralha.',
    [o.gather('stone', 30)]),
  mission(29, 'construtor', 'A Defesa do Portão', 'Construa a Muralha até ter portões (nível 2) e levante a Torre de Vigia.',
    [o.building('wall', 2), o.building('tower', 1)]),
  mission(30, 'capitao', 'A Noite dos Saqueadores', 'Saqueadores atacam quando a noite cai. Defenda o acampamento e derrote todos.',
    [o.kill('saqueador', 6)], { coins: 80, outro: 'Os saqueadores fugiram. Eles falavam de um "Mestre" na montanha...' }),

  // Capítulo 4 — Os Mistérios da Floresta
  mission(31, 'cacador', 'Além das Árvores', 'Explore a Floresta Profunda, a oeste.',
    [o.reach('floresta-profunda')]),
  mission(32, 'cacador', 'A Trilha dos Caçadores', 'Encontre o acampamento de Kael na floresta e cace criaturas da Floresta Profunda.',
    [o.talk('cacador'), o.kill('any', 5, 'floresta')], { items: { leather: 2 } }),
  mission(33, 'cacador', 'O Círculo de Cogumelos', 'Um círculo de cogumelos brilha na floresta. Investigue.',
    [o.interact('circulo')], { lore: 'circulo' }),
  mission(34, 'cacador', 'A Cabana Esquecida', 'Recupere o diário de um explorador na cabana esquecida.',
    [o.gather('book', 1)], { lore: 'diario' }),
  mission(35, 'cacador', 'O Guardião das Raízes', 'Uma criatura ancestral protege as raízes antigas. Derrote-a.',
    [o.boss('guardiaoRaizes')], { coins: 70 }),
  mission(36, 'curandeira', 'A Fonte Azul', 'A fonte da floresta está envenenada. Purifique-a com ervas.',
    [o.interact('fonte'), o.deliver('herbs', 3)]),
  mission(37, 'cacador', 'As Ruínas Cobertas', 'Descubra o templo perdido coberto pela mata.',
    [o.reach('templo-terra')]),
  mission(38, 'cacador', 'A Chave de Pedra', 'Ative os três pilares na ordem da vida: RAIZ, FOLHA, FRUTO.',
    [o.puzzle('pilares-terra')]),
  mission(39, 'cacador', 'O Eco do Passado', 'Toque o altar do eco e ouça a memória dos guardiões.',
    [o.interact('memoria-terra')], { lore: 'guardioes' }),
  mission(40, 'vigia', 'O Primeiro Selo', 'Recupere o Selo da Terra no altar das ruínas.',
    [o.interact('selo-terra')], { coins: 100, outro: 'O Selo da Terra pulsa em sintonia com o seu fragmento.' }),

  // Capítulo 5 — O Reino Perdido
  mission(41, 'mercador', 'O Mapa Rasgado', 'Reúna as três partes do mapa de Valdora.',
    [o.gather('mapPiece', 3)]),
  mission(42, 'mercador', 'Estrada para Valdora', 'Abra uma rota segura derrotando os bandidos da estrada, a sudoeste.',
    [o.kill('bandido', 4)]),
  mission(43, 'construtor', 'A Ponte Quebrada', 'Reconstrua a ponte de Valdora com madeira e pedra.',
    [o.interact('ponte'), o.deliver('wood', 15), o.deliver('stone', 6)]),
  mission(44, 'capitao', 'Os Últimos Soldados', 'Resgate os guardas feridos nas ruínas.',
    [o.rescue('guardas', 3)]),
  mission(45, 'capitao', 'O Capitão sem Exército', 'Converse com a capitã em seu posto nas ruínas e recrute-a.',
    [o.talk('capitao')]),
  mission(46, 'capitao', 'A Biblioteca Soterrada', 'Recupere livros da biblioteca soterrada.',
    [o.gather('book', 5)]),
  mission(47, 'capitao', 'A História Proibida', 'Leia o mural da catástrofe.',
    [o.interact('mural')], { lore: 'catastrofe' }),
  mission(48, 'mercador', 'O Mercador das Sombras', 'Encontre o mercador raro que vive nas ruínas.',
    [o.talk('mercador-sombras')], { setsFlag: 'shadowMerchant' }),
  mission(49, 'capitao', 'A Cripta Real', 'Derrote os cavaleiros corrompidos da cripta real.',
    [o.kill('cavaleiro', 4)], { coins: 90 }),
  mission(50, 'capitao', 'O Juramento Quebrado', 'Leia a confissão no túmulo do último rei.',
    [o.interact('tumulo-rei')], { lore: 'reis', coins: 100 }),

  // Capítulo 6 — A Terra Congelada
  mission(51, 'construtor', 'Rumo ao Norte', 'Prepare roupas quentes (lã e tecido) e chegue à passagem do norte.',
    [o.deliver('wool', 3), o.deliver('fabric', 2), o.reach('norte-entrada')], { setsFlag: 'warmClothes' }),
  mission(52, 'capitao', 'O Acampamento Congelado', 'Resgate os viajantes presos na neve.',
    [o.rescue('viajantes', 2)]),
  mission(53, 'construtor', 'Lenha sob a Neve', 'Junte lenha para aquecer os resgatados.',
    [o.gather('wood', 15)]),
  mission(54, 'cacador', 'O Lago Cristalino', 'Pesque no lago cristalino.',
    [o.gather('fish', 5)]),
  mission(55, 'ferreiro', 'A Caverna de Gelo', 'Encontre cristais azuis na caverna de gelo.',
    [o.gather('crystal', 4)]),
  mission(56, 'cacador', 'O Urso Branco', 'A fera branca ataca os viajantes. Derrote o Urso Branco.',
    [o.boss('ursoBranco')], { coins: 110 }),
  mission(57, 'capitao', 'O Vilarejo Silencioso', 'Descubra por que o vilarejo foi abandonado.',
    [o.interact('vilarejo')], { lore: 'vilarejo' }),
  mission(58, 'curandeira', 'A Canção das Águas', 'Ative o santuário das águas.',
    [o.interact('santuario-agua')]),
  mission(59, 'capitao', 'O Guardião Adormecido', 'O guardião do templo aquático despertou furioso. Derrote-o.',
    [o.boss('guardiaoAgua')], { coins: 130 }),
  mission(60, 'vigia', 'O Selo da Água', 'Recupere o Selo da Água.',
    [o.interact('selo-agua')], { coins: 140 }),

  // Capítulo 7 — O Deserto dos Ossos
  mission(61, 'mercador', 'Areias sem Fim', 'Prepare suprimentos para o deserto: água e comida.',
    [o.deliver('water', 5), o.deliver('food', 5)], { setsFlag: 'desertSupplies' }),
  mission(62, 'mercador', 'A Caravana Perdida', 'Localize a caravana perdida no deserto, a leste.',
    [o.rescue('caravana')]),
  mission(63, 'mercador', 'Água por Ouro', 'Negocie com os nômades do oásis: eles trocam ouro por água.',
    [o.talk('oasis'), o.deliver('water', 3)], { items: { gold: 3 } }),
  mission(64, 'cacador', 'Os Escorpiões Gigantes', 'Derrote os escorpiões gigantes do ninho.',
    [o.kill('escorpiao', 8)], { coins: 120 }),
  mission(65, 'ferreiro', 'A Mina Abandonada', 'Extraia minério raro (ouro) da mina abandonada.',
    [o.gather('gold', 3)]),
  mission(66, 'mercador', 'O Mercado das Miragens', 'Encontre a cidade comercial que surge entre as dunas.',
    [o.reach('mercado-miragens')], { setsFlag: 'mirageMarket' }),
  mission(67, 'mercador', 'O Contrabandista', 'Recupere o artefato roubado derrotando o contrabandista.',
    [o.boss('contrabandista')], { coins: 130 }),
  mission(68, 'capitao', 'O Templo do Vento', 'Ative os pilares do vento na ordem da tempestade: BRISA, RAJADA, TEMPESTADE.',
    [o.puzzle('pilares-vento')]),
  mission(69, 'cacador', 'As Asas da Tempestade', 'Derrote o grifo guardião do templo.',
    [o.boss('grifo')], { coins: 160 }),
  mission(70, 'vigia', 'O Selo do Vento', 'Recupere o Selo do Vento.',
    [o.interact('selo-vento')], { coins: 170 }),

  // Capítulo 8 — A Guerra das Cinzas
  mission(71, 'vigia', 'Cinzas no Horizonte', 'Uma coluna de fumaça sobe ao norte do acampamento. Investigue.',
    [o.reach('coluna-fumaca')]),
  mission(72, 'capitao', 'O Exército Corrompido', 'Elimine as patrulhas do exército corrompido.',
    [o.kill('patrulha', 6)], { coins: 150 }),
  mission(73, 'capitao', 'Mensagens Interceptadas', 'Recupere os documentos da mesa de comando inimiga.',
    [o.interact('documentos')], { lore: 'documentos' }),
  mission(74, 'capitao', 'A Aliança do Norte', 'Convença os chefes do norte a se juntarem à luta.',
    [o.talk('aliados-norte')]),
  mission(75, 'construtor', 'A Grande Muralha', 'Reforce a muralha: melhore a Muralha para o nível 2 ou mais.',
    [o.building('wall', 2)]),
  mission(76, 'capitao', 'Torres em Chamas', 'Incendiários atacam as torres quando anoitece. Defenda-as.',
    [o.building('tower', 1), o.kill('incendiario', 8)], { coins: 180 }),
  mission(77, 'ferreiro', 'O Ferreiro Lendário', 'Encontre o mestre de Doran na forja escondida do norte.',
    [o.rescue('mestre-ferreiro')]),
  mission(78, 'ferreiro', 'A Arma dos Antigos', 'Forje uma arma mágica: um encantamento ou uma lâmina rara.',
    [o.owns(['fireEnchant', 'iceEnchant', 'vampireEnchant', 'titanBlade', 'legendarySword', 'dragonBlade'])]),
  mission(79, 'capitao', 'O Templo da Luz', 'Explore o santuário da luz, a nordeste.',
    [o.reach('templo-luz')]),
  mission(80, 'vigia', 'O Selo da Luz', 'Recupere o Selo da Luz.',
    [o.interact('selo-luz')], { coins: 200 }),

  // Capítulo 9 — A Montanha das Cinzas
  mission(81, 'capitao', 'O Caminho do Fogo', 'Encontre a passagem vulcânica a sudeste.',
    [o.reach('passagem-vulcanica')]),
  mission(82, 'ferreiro', 'Máscaras contra as Cinzas', 'Fabrique máscaras de proteção com tecido e cristal.',
    [o.deliver('fabric', 3), o.deliver('crystal', 1)], { setsFlag: 'ashMasks' }),
  mission(83, 'construtor', 'O Rio de Lava', 'Construa uma ponte resistente ao calor sobre o rio de lava.',
    [o.interact('ponte-lava'), o.deliver('stone', 20), o.deliver('iron', 6)]),
  mission(84, 'capitao', 'Os Mineiros Perdidos', 'Resgate os mineiros presos na montanha.',
    [o.rescue('mineiros', 3)]),
  mission(85, 'ferreiro', 'O Coração de Magma', 'Extraia núcleos de magma do veio vulcânico.',
    [o.gather('magmaCore', 5)]),
  mission(86, 'capitao', 'A Fortaleza Negra', 'Infiltre-se na fortaleza negra e derrote os guardas.',
    [o.kill('guardaFortaleza', 4)], { coins: 220 }),
  mission(87, 'capitao', 'O Cavaleiro das Brasas', 'Derrote o comandante inimigo.',
    [o.boss('cavaleiroBrasas')], { coins: 260 }),
  mission(88, 'vigia', 'O Último Fragmento', 'Recupere o Selo do Fogo, o quinto selo.',
    [o.interact('selo-fogo')], { coins: 260 }),
  mission(89, 'curandeira', 'A Verdade do Golem', 'Leia as inscrições sobre o Golem de Fogo.',
    [o.interact('mural-golem')], { lore: 'golem' }),
  mission(90, 'capitao', 'Preparativos para o Fim', 'Reúna os cinco selos, poções e converse com a capitã.',
    [o.seals(5), o.deliver('potion', 3), o.talk('capitao')], { items: { elixir: 2, staminaPotion: 2 } }),

  // Capítulo 10 — O Destino de Eldoria
  mission(91, 'capitao', 'A Subida Final', 'Atravesse a última trilha da montanha.',
    [o.reach('trilha-final')]),
  mission(92, 'vigia', 'As Portas do Núcleo', 'Encaixe os selos no mecanismo na ordem dos guardiões: TERRA, ÁGUA, VENTO, LUZ, FOGO.',
    [o.puzzle('mecanismo')]),
  mission(93, 'capitao', 'Guardiões das Brasas', 'Derrote as três sentinelas das portas do núcleo.',
    [o.kill('sentinela', 3)], { coins: 280 }),
  mission(94, 'curandeira', 'O Coração Adormecido', 'Examine o coração da montanha e descubra como enfraquecer o Golem.',
    [o.interact('coracao-adormecido')], { lore: 'coracao' }),
  mission(95, 'vigia', 'A Última Escolha', 'Decida o destino do guardião: destruí-lo ou restaurá-lo.',
    [o.choice('golem')]),
  mission(96, 'capitao', 'O Golem de Fogo', 'Enfrente o Golem de Fogo no Núcleo de Eldoria, a noroeste: reduza a vida dele à metade.',
    [o.bossPhase('golem', 0.5)]),
  mission(97, 'capitao', 'O Colosso Desperto', 'O Golem desperta em fúria. Sobreviva à segunda fase e derrote-o.',
    [o.boss('golem')], { coins: 400, autoAccept: true }),
  mission(98, 'curandeira', 'O Último Sacrifício', 'Proteja os aliados no núcleo enquanto ele se estabiliza: fique perto do núcleo por 45 segundos.',
    [o.defend('estabilizar', 45)], { autoAccept: true }),
  mission(99, 'vigia', 'O Amanhecer de Eldoria', 'Conclua o ritual no núcleo.',
    [o.interact('ritual')], { lore: 'amanhecer', coins: 500, autoAccept: true }),
  mission(100, 'construtor', 'Uma Nova Lenda', 'Ajude a reconstruir a vila e celebre com todos os moradores.',
    [o.deliver('wood', 30), o.deliver('stone', 20), o.talk('vigia')], { coins: 800, setsFlag: 'postGame', outro: 'Eldoria renasce. E o seu nome agora é uma lenda.' })
];

// História (src/data/story.js): falas extras, desfechos e registros. Objetivos e recompensas não mudam.
for (const entry of MISSIONS) {
  const story = MISSION_STORY[entry.number];
  if (!story) continue;
  if (story.intro) entry.intro = story.intro;
  if (story.outro) entry.outro = story.outro;
  if (story.lore) entry.storyLore = [...story.lore];
}
Object.assign(LORE, STORY_LORE);

export const MISSIONS_BY_ID = Object.fromEntries(MISSIONS.map((entry) => [entry.id, entry]));

// ---------- Missões diárias (repetíveis, separadas da campanha) ----------

export const DAILY_TEMPLATES = [
  { id: 'lenha', title: 'Lenha para o dia', objective: o.gather('wood', 15), rewards: { xp: 60, coins: 25 } },
  { id: 'pedreira', title: 'Pedras para reparos', objective: o.gather('stone', 10), rewards: { xp: 60, coins: 25 } },
  { id: 'ervas', title: 'Estoque da curandeira', objective: o.gather('herbs', 6), rewards: { xp: 60, coins: 30 } },
  { id: 'caca', title: 'Caçada do dia', objective: o.kill('any', 8), rewards: { xp: 90, coins: 35 } },
  { id: 'gosmas', title: 'Limpar as gosmas', objective: o.kill('slime', 5), rewards: { xp: 70, coins: 25 } },
  { id: 'lobos', title: 'Afastar os lobos', objective: o.kill('wolf', 3), rewards: { xp: 80, coins: 30 } },
  { id: 'vendas', title: 'Dia de feira', objective: o.sell(6), rewards: { xp: 50, coins: 30 } },
  { id: 'plantio', title: 'Mãos na terra', objective: o.plant('any', 3), rewards: { xp: 60, coins: 25 } },
  { id: 'colheita', title: 'Colheita do dia', objective: o.harvest('any', 3), rewards: { xp: 60, coins: 25 } },
  { id: 'ajuda', title: 'Ajudar os moradores', objective: o.deliver('food', 4), rewards: { xp: 70, coins: 35 } },
  { id: 'baus', title: 'Explorador do dia', objective: o.structure('chest', 1), rewards: { xp: 80, coins: 30 } },
  { id: 'vigilia', title: 'Vigília noturna', objective: o.kill('any', 4, 'noite'), rewards: { xp: 90, coins: 40 } }
];

// Depois da campanha: desafios lendários entram no sorteio das diárias.
export const LEGENDARY_DAILY_TEMPLATES = [
  { id: 'elites', title: 'Desafio lendário: elites', objective: o.kill('elite', 3), rewards: { xp: 200, coins: 120 } },
  { id: 'grande-caca', title: 'Desafio lendário: grande caçada', objective: o.kill('any', 20), rewards: { xp: 220, coins: 120 } }
];

export const DAILY_UNLOCK_MISSION = 10;
export const DAILY_COUNT = 3;
