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
//   level     {count}                            nível do personagem (estado)
//   delve     {target: caverna/torre, floor}     chegar ao andar (0 = primeiro) da caverna ou torre

import { BOSS_CONFIG } from './boss.js';
import { AURELIAN_ECHOES, MISSION_STORY, STORY_LORE } from './story.js';

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
  { number: 10, title: 'O Destino de Eldoria', region: 'montanha' },
  { number: 11, title: 'Brejos e Mares Perdidos', region: 'brejoMar' },
  { number: 12, title: 'O Vento dos Picos Gelados', region: 'picos' },
  { number: 13, title: 'Os Reis da Areia', region: 'grandeDeserto' },
  { number: 14, title: 'A Ilha que Respira Fogo', region: 'ilhaBrasa' },
  { number: 15, title: 'As Portas do Abismo', region: 'abismo' },
  { number: 16, title: 'O Fim do Abismo de Brasa', region: 'abismo' }
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

// Regiões do mundo aberto (sem tinta nem perigo: só dão o nome nas missões dos capítulos 11–16).
Object.assign(REGIONS, {
  brejoMar: { name: 'Brejo Sombrio e Ilha Esmeralda', x: 0, y: 0, radius: 0 },
  picos: { name: 'Picos Gelados', x: 0, y: 0, radius: 0 },
  grandeDeserto: { name: 'Grande Deserto', x: 0, y: 0, radius: 0 },
  ilhaBrasa: { name: 'Ilha de Brasa', x: 0, y: 0, radius: 0 },
  abismo: { name: 'Abismo de Brasa', x: 0, y: 0, radius: 0 }
});

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
  covil: { name: 'Covil do Lobo Cinzento', ...at(720, 520), kind: 'boss', art: 'den', boss: { kind: 'wolf', visual: 'wolfBoss', name: 'Lobo Cinzento', tag: 'loboCinzento', health: 7, damage: 1.4, scale: 1 } },
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

// Ecos do Rei (opcionais): memórias de Aurelian que aparecem depois de certas missões.
for (const echo of AURELIAN_ECHOES) {
  SITES[echo.id] = { name: echo.name, ...inRegion(echo.region, echo.offset[0], echo.offset[1]), kind: 'echo', art: 'altar', echo: echo.id };
}

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
  residents: (count) => ({ type: 'residents', target: 'any', count }),
  level: (count) => ({ type: 'level', target: 'any', count }),
  delve: (target, floor = 0) => ({ type: 'delve', target, floor, count: 1 })
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
    [o.deliver('wood', 30), o.deliver('stone', 20), o.talk('vigia')], { coins: 800, setsFlag: 'postGame', outro: 'Eldoria renasce. E o seu nome agora é uma lenda.' }),

  // Capítulos 11–16 — depois do final: o mundo aberto, do nível 30 ao 150
  mission(101, 'capitao', 'Além das Cinzas', 'Eldoria respira, mas o mundo é maior que o vale. Chegue ao nível 30 e prepare-se para o Brejo Sombrio e a Ilha Esmeralda.',
    [o.level(30)], { xp: 2400, coins: 170 }),
  mission(102, 'cacador', 'Lama até os Joelhos', 'Bruxas e mortos-vivos rondam o Brejo Sombrio, a sudoeste. Derrote as bruxas e os zumbis.',
    [o.kill('witch', 8), o.kill('zombie', 12)], { xp: 2592, coins: 187 }),
  mission(103, 'curandeira', 'Ervas do Pântano', 'Lia precisa de ectoplasma e ervas do brejo para um antídoto contra a névoa.',
    [o.gather('ectoplasm', 6), o.gather('herbs', 10)], { xp: 2784, coins: 204 }),
  mission(104, 'ferreiro', 'Metal Afogado', 'A Gruta Afogada guarda ferro antigo. Desça até o segundo andar e traga minério.',
    [o.delve('gruta-afogada', 1), o.gather('iron', 20)], { xp: 2976, coins: 221 }),
  mission(105, 'capitao', 'A Torre Afogada', 'Suba a Torre Afogada, no Brejo: cada andar é mais forte que o anterior. Chegue ao terceiro andar.',
    [o.delve('torre-brejo', 2)], { xp: 3168, coins: 238 }),
  mission(106, 'cacador', 'Piratas sem Descanso', 'Piratas esqueleto tomaram as praias da Ilha Esmeralda. Embarque e limpe a ilha.',
    [o.kill('pirate', 15), o.kill('crab', 10)], { xp: 3360, coins: 255 }),
  mission(107, 'mercador', 'O Tesouro do Farol', 'Zeno ouviu falar de um tesouro na Gruta dos Piratas. Alcance o último andar e traga ouro.',
    [o.delve('gruta-piratas', 1), o.gather('gold', 10)], { xp: 3552, coins: 272 }),
  mission(108, 'capitao', 'O Farol da Ilha', 'Suba a Torre do Farol, na Ilha Esmeralda, até o topo.',
    [o.delve('torre-esmeralda', 2)], { xp: 3744, coins: 289 }),
  mission(109, 'curandeira', 'Hidra do Brejo', 'Uma hidra ronda os pântanos. Derrote-a antes que a névoa chegue ao vale.',
    [o.kill('hydra', 1), o.kill('ghost', 12)], { xp: 3936, coins: 306 }),
  mission(110, 'capitao', 'Pronto para o Gelo', 'Os Picos Gelados chamam. Chegue ao nível 45 e leve poções fortes para a viagem.',
    [o.level(45), o.deliver('potionStrong', 3)], { xp: 4128, coins: 323 }),
  mission(111, 'capitao', 'O Vento dos Picos', 'Nos Picos Gelados, o vento corta como lâmina. Chegue ao nível 50 e conheça a região.',
    [o.level(50)], { xp: 7000, coins: 300 }),
  mission(112, 'cacador', 'Lobos do Vento Branco', 'Lobos do gelo caçam em matilhas. Derrote-os antes que desçam aos vilarejos.',
    [o.kill('frostWolf', 15), o.kill('snowOwl', 8)], { xp: 7560, coins: 330 }),
  mission(113, 'ferreiro', 'Couro para o Frio', 'Roupas melhores para quem sobe os Picos: leve couro e tecido ao Ferreiro.',
    [o.deliver('leather', 20), o.deliver('fabric', 10)], { xp: 8120, coins: 360 }),
  mission(114, 'curandeira', 'A Fúria do Yeti', 'Yetis atacam os viajantes nas encostas. Derrote-os.',
    [o.kill('yeti', 10)], { xp: 8680, coins: 390 }),
  mission(115, 'capitao', 'A Caverna de Cristal', 'Desça até o último andar da Caverna de Cristal e traga cristais.',
    [o.delve('caverna-cristal', 2), o.gather('crystal', 10)], { xp: 9240, coins: 420 }),
  mission(116, 'cacador', 'Gigantes de Gelo', 'Elementais de gelo e mamutes bloqueiam a passagem. Abra caminho.',
    [o.kill('iceElemental', 12), o.kill('mammoth', 8)], { xp: 9800, coins: 450 }),
  mission(117, 'ferreiro', 'Núcleo de Titã', 'O gelo esconde peças de titã. Derrote o Gigante de Gelo e traga um núcleo.',
    [o.kill('frostGiant', 1), o.gather('titanCore', 1)], { xp: 10360, coins: 480 }),
  mission(118, 'capitao', 'A Torre de Gelo', 'Suba a Torre de Gelo, o ponto mais alto dos Picos.',
    [o.delve('torre-gelo', 2)], { xp: 10920, coins: 510 }),
  mission(119, 'curandeira', 'O Capitão Fantasma', 'Um navio fantasma encalhou no gelo. Derrote o Capitão e os espectros.',
    [o.kill('ghostCaptain', 1), o.kill('ghost', 15)], { xp: 11480, coins: 540 }),
  mission(120, 'capitao', 'Rumo às Dunas', 'O deserto é o próximo. Chegue ao nível 70 e leve água para a travessia.',
    [o.level(70), o.deliver('water', 20)], { xp: 12040, coins: 570 }),
  mission(121, 'capitao', 'Areia Sem Fim', 'O Grande Deserto engole quem anda sem rumo. Chegue ao nível 75.',
    [o.level(75)], { xp: 13000, coins: 420 }),
  mission(122, 'cacador', 'Ferrões e Presas', 'Escorpiões e cobras dominam as dunas. Limpe a região.',
    [o.kill('scorpion', 15), o.kill('cobra', 12)], { xp: 14040, coins: 462 }),
  mission(123, 'mercador', 'Água Vale Ouro', 'As caravanas pagam muito por água fresca. Traga peixe e água para o mercado.',
    [o.deliver('water', 30), o.deliver('fish', 10)], { xp: 15080, coins: 504 }),
  mission(124, 'ferreiro', 'Escaravelhos Brilhantes', 'Escaravelhos carregam fragmentos de cristal na carapaça. Derrote-os e colete cristais.',
    [o.kill('scarab', 15), o.gather('crystal', 15)], { xp: 16120, coins: 546 }),
  mission(125, 'capitao', 'A Tumba do Faraó', 'Entre na Tumba do Faraó e chegue ao último andar.',
    [o.delve('tumba-farao', 2)], { xp: 17160, coins: 588 }),
  mission(126, 'cacador', 'Vermes da Areia', 'Vermes gigantes sobem das dunas. Derrote-os e as múmias que os acompanham.',
    [o.kill('sandworm', 10), o.kill('mummy', 12)], { xp: 18200, coins: 630 }),
  mission(127, 'curandeira', 'Maldição do Djinn', 'Djinns e golens de areia guardam um velho altar. Quebre a maldição.',
    [o.kill('djinn', 10), o.kill('sandGolem', 8)], { xp: 19240, coins: 672 }),
  mission(128, 'capitao', 'A Torre dos Ventos', 'Suba os quatro andares da Torre dos Ventos.',
    [o.delve('torre-areia', 3)], { xp: 20280, coins: 714 }),
  mission(129, 'capitao', 'O Faraó Sem Descanso', 'O Faraó desperta no coração do deserto. Derrote-o.',
    [o.kill('pharaoh', 1)], { xp: 21320, coins: 756 }),
  mission(130, 'ferreiro', 'Ferro para o Fogo', 'A Ilha de Brasa está próxima. Chegue ao nível 90 e traga carvão e ferro para a forja.',
    [o.level(90), o.deliver('coal', 30), o.deliver('iron', 30)], { xp: 22360, coins: 798 }),
  mission(131, 'capitao', 'O Vulcão Desperta', 'A Ilha de Brasa respira fogo. Chegue ao nível 95 e desembarque.',
    [o.level(95)], { xp: 22000, coins: 560 }),
  mission(132, 'cacador', 'Diabretes e Salamandras', 'Criaturas de fogo cercam o porto. Derrote os diabretes e as salamandras.',
    [o.kill('imp', 15), o.kill('salamander', 12)], { xp: 23760, coins: 616 }),
  mission(133, 'curandeira', 'Cães de Lava', 'Cães de lava e lesmas de magma queimam as trilhas. Limpe a ilha.',
    [o.kill('lavaHound', 12), o.kill('magmaSlime', 12)], { xp: 25520, coins: 672 }),
  mission(134, 'ferreiro', 'Núcleo de Magma', 'Dentro do Coração do Vulcão há núcleos de magma. Desça ao último andar e traga um.',
    [o.delve('coracao-vulcao', 2), o.gather('magmaCore', 1)], { xp: 27280, coins: 728 }),
  mission(135, 'capitao', 'A Torre de Cinzas', 'Suba os quatro andares da Torre de Cinzas.',
    [o.delve('torre-brasa', 3)], { xp: 29040, coins: 784 }),
  mission(136, 'cacador', 'Elementais de Fogo', 'Elementais e cavaleiros de obsidiana guardam o topo do vulcão. Derrote-os.',
    [o.kill('fireElemental', 12), o.kill('obsidianKnight', 10)], { xp: 30800, coins: 840 }),
  mission(137, 'curandeira', 'A Fênix Cinzenta', 'A Fênix Cinzenta renasce das brasas. Derrote-a e a horda de demônios.',
    [o.kill('phoenix', 5), o.kill('demon', 12)], { xp: 32560, coins: 896 }),
  mission(138, 'capitao', 'O Dragão da Ilha', 'O dragão da Ilha de Brasa acordou. Derrote-o.',
    [o.kill('dragon', 1)], { xp: 34320, coins: 952 }),
  mission(139, 'mercador', 'O Preço das Brasas', 'Zeno compra tudo o que brilha na ilha: traga ouro e venda o que puder.',
    [o.deliver('gold', 20), o.sell(10)], { xp: 36080, coins: 1008 }),
  mission(140, 'capitao', 'A Boca do Abismo', 'No fim da ilha abre-se o Abismo de Brasa. Chegue ao nível 115 e leve elixires.',
    [o.level(115), o.deliver('elixir', 3)], { xp: 37840, coins: 1064 }),
  mission(141, 'capitao', 'Os Degraus do Abismo', 'O Abismo de Brasa é a cova mais funda de Eldoria. Entre no primeiro andar e chegue ao nível 118.',
    [o.delve('abismo-brasa', 0), o.level(118)], { xp: 36000, coins: 720 }),
  mission(142, 'cacador', 'Espectros de Cinzas', 'Espectros e gárgulas infernais vigiam as escadas. Derrote-os.',
    [o.kill('ashWraith', 12), o.kill('gargoyle', 10)], { xp: 38880, coins: 792 }),
  mission(143, 'curandeira', 'O Sussurro das Cinzas', 'A cura exige coragem: derrote as serpentes de ossos e colete ossos e seda.',
    [o.kill('boneWyrm', 10), o.gather('bone', 20), o.gather('silk', 10)], { xp: 41760, coins: 864 }),
  mission(144, 'ferreiro', 'Forja de Obsidiana', 'Para enfrentar o fundo, só armas novas. Traga núcleos de magma e de titã.',
    [o.deliver('magmaCore', 2), o.deliver('titanCore', 2)], { xp: 44640, coins: 936 }),
  mission(145, 'capitao', 'O Segundo Andar', 'Desça até o segundo andar do Abismo de Brasa.',
    [o.delve('abismo-brasa', 1), o.level(122)], { xp: 47520, coins: 1008 }),
  mission(146, 'cacador', 'Espreitadores do Vazio', 'Criaturas do vazio rondam o segundo andar. Derrote-as.',
    [o.kill('voidStalker', 12), o.kill('cinderGiant', 6)], { xp: 50400, coins: 1080 }),
  mission(147, 'curandeira', 'Poções para o Fundo', 'Lia prepara o que puder para a descida. Entregue poções e poções de vigor.',
    [o.deliver('potionGreat', 5), o.deliver('staminaPotion', 5)], { xp: 53280, coins: 1152 }),
  mission(148, 'capitao', 'O Terceiro Andar', 'Desça até o terceiro andar do Abismo de Brasa.',
    [o.delve('abismo-brasa', 2), o.level(128)], { xp: 56160, coins: 1224 }),
  mission(149, 'cacador', 'Os Carcereiros', 'Carcereiros infernais guardam as celas do Abismo. Derrote-os.',
    [o.kill('hellWarden', 8), o.kill('lavaWorm', 8)], { xp: 59040, coins: 1296 }),
  mission(150, 'capitao', 'Antes da Última Escada', 'O fundo do Abismo espera. Chegue ao nível 135 e prepare-se.',
    [o.level(135)], { xp: 61920, coins: 1368 }),
  mission(151, 'capitao', 'O Andar Final', 'Desça ao quarto e último andar do Abismo de Brasa.',
    [o.delve('abismo-brasa', 3), o.level(138)], { xp: 52000, coins: 900 }),
  mission(152, 'cacador', 'Ceifadores de Almas', 'Ceifadores colhem almas no fundo do Abismo. Derrote-os.',
    [o.kill('soulReaper', 10), o.kill('hellWarden', 8)], { xp: 56160, coins: 990 }),
  mission(153, 'curandeira', 'Cães do Abismo', 'Os cães do Abismo guardam o trono. Derrote-os um a um.',
    [o.kill('abyssHound', 10)], { xp: 60320, coins: 1080 }),
  mission(154, 'ferreiro', 'A Última Lâmina', 'Entregue ferro, carvão e cristais: a última forja de Eldoria.',
    [o.deliver('iron', 50), o.deliver('coal', 50), o.deliver('crystal', 20)], { xp: 64480, coins: 1170 }),
  mission(155, 'mercador', 'O Preço da Vitória', 'Zeno ofereceu tudo o que tinha. Compre e venda pela última vez.',
    [o.buy(10), o.sell(10)], { xp: 68640, coins: 1260 }),
  mission(156, 'cacador', 'Elites do Trono', 'Elites do Abismo cercam o trono. Derrote-as.',
    [o.kill('elite', 10), o.level(142)], { xp: 72800, coins: 1350 }),
  mission(157, 'capitao', 'Diante do Trono', 'Chegue ao nível 145 e converse com a capitã antes do duelo final.',
    [o.level(145), o.talk('capitao')], { xp: 76960, coins: 1440 }),
  mission(158, 'curandeira', 'O Senhor do Abismo', 'O Senhor do Abismo ergue-se do trono. Derrote-o.',
    [o.kill('abyssLord', 1)], { xp: 81120, coins: 1530 }),
  mission(159, 'vigia', 'A Calma Depois do Fogo', 'Bram ouviu o silêncio onde havia gritos. Volte e conte a ele o que viu.',
    [o.talk('vigia')], { xp: 85280, coins: 1620 }),
  mission(160, 'construtor', 'Uma Lenda Sem Fim', 'Chegue ao nível 150, o ápice de um herói de Eldoria, e celebre com o acampamento.',
    [o.level(150), o.talk('vigia')], { xp: 89440, coins: 1710, setsFlag: 'abyssClosed', outro: 'O Abismo de Brasa está em silêncio. Seu nome é cantado em todas as ilhas de Eldoria.' })
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
