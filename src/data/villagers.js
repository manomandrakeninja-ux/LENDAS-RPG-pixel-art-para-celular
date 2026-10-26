// Moradores que chegam quando um prédio muda de visual (nível 4: ele; nível 8: ela).
// Andam só dentro do acampamento, falam em balões (história e dicas) e ajudam nas invasões.
// O jogador não pode atacá-los: eles não entram na lista de inimigos.

export const VILLAGER_STATS = Object.freeze({ health: 50, attack: 10, attackCooldownMs: 900, range: 26, speed: 34, sight: 170 });

// palette: cores do desenho (src/art/person.js). prop: ferramenta na mão. size: 'dwarf' | 'child'.
export const VILLAGERS = Object.freeze([
  {
    id: 'tiao', building: 'campfire', level: 4, name: 'Tião, o Contador de Histórias',
    palette: { tunic: '#7a4a2a', scarf: '#c0483b', hair: '#d8d8d8', skin: '#d9a070', beard: true }, prop: 'staff',
    lines: [
      'Dizem que Eldoria tinha rios que curavam doenças...',
      'Na Noite das Cinzas, o céu ficou vermelho por três dias.',
      'Dica: descansar junto à fogueira cura e salva o jogo.',
      'Cinco guardiões, cinco selos. Lembre-se disso, jovem.'
    ]
  },
  {
    id: 'nina', building: 'campfire', level: 8, name: 'Nina, a Cozinheira',
    palette: { tunic: '#a0503a', scarf: '#f0e0c0', hair: '#5a3020', skin: '#e8b080', longHair: true, dress: true }, prop: 'ladle',
    lines: [
      'Dica: na aba Receitas da Fogueira dá para assar peixe e fazer chá.',
      'Comida quente espanta o medo. E o frio também.',
      'Bram não dorme direito desde que você chegou. Ele se preocupa.',
      'Dica: tecla 2 come na hora, até no meio da luta.'
    ]
  },
  {
    id: 'joaquim', building: 'farm', level: 4, name: 'Joaquim, o Fazendeiro',
    palette: { tunic: '#6a8a3a', scarf: '#c8a050', hair: '#6b4a2a', skin: '#d9a070', hat: '#c8a050' }, prop: 'pitchfork',
    lines: [
      'Dica: dias de chuva fazem as plantas crescerem mais rápido.',
      'Ossos viram adubo! Farinha de osso rende sementes.',
      'A terra aqui é boa. Boa demais para ser só sorte.',
      'Dica: a Planta Mágica precisa de Erva Lunar, que nasce à noite.'
    ]
  },
  {
    id: 'rosa', building: 'farm', level: 8, name: 'Rosa, a Fazendeira',
    palette: { tunic: '#c06a8a', scarf: '#f0d8a0', hair: '#a0602a', skin: '#f0c08a', longHair: true, dress: true, hat: '#d8b860' }, prop: 'basket',
    lines: [
      'As galinhas ficam agitadas quando a luz vermelha aparece.',
      'Dica: no nível 7 a Fazenda coleta ovos e leite sozinha.',
      'Meu avô contava que antes da Noite das Cinzas nevava trigo dourado.',
      'Dica: ovos e leite viram omelete na Fogueira.'
    ]
  },
  {
    id: 'borin', building: 'forge', level: 4, name: 'Borin, o Anão Ferreiro',
    palette: { tunic: '#5a3a2a', scarf: '#3a3a3a', hair: '#b0502a', skin: '#d99a6a', beard: true }, prop: 'hammer', size: 'dwarf',
    lines: [
      'Ferro, carvão e paciência. É tudo que uma lâmina pede.',
      'Dica: armas gastas perdem força. Repare no Ferreiro nível 4.',
      'Os selos foram forjados numa montanha de fogo. Eu daria a barba para ver aquela bigorna.',
      'Dica: núcleo de magma derrete pedra e solta ferro e carvão.'
    ]
  },
  {
    id: 'hilda', building: 'forge', level: 8, name: 'Hilda, a Anã Ferreira',
    palette: { tunic: '#7a3a2a', scarf: '#d9b45c', hair: '#e0c050', skin: '#e0a676', longHair: true }, prop: 'hammer', size: 'dwarf',
    lines: [
      'Martelo leve, mão firme. Assim se faz um encantamento.',
      'Dica: no nível 8 do Ferreiro dá para melhorar armas até +5.',
      'Cristal azul no carvão vira ouro. Não conte para o Zeno.',
      'O mestre do Doran sumiu para não forjar armas para o Eclipse. Gente de coragem.'
    ]
  },
  {
    id: 'marta', building: 'house', level: 4, name: 'Marta, a Dona da Casa',
    palette: { tunic: '#4a6a9a', scarf: '#f0e0c0', hair: '#3a2418', skin: '#e0a676', longHair: true, dress: true }, prop: 'none',
    lines: [
      'Dica: guarde tudo na Casa antes da noite. Mochila cheia não carrega nada.',
      'Dormir pula a noite. Mas as invasões não esperam o sol.',
      'Lia anota os nomes de todos. Ela tem medo que a gente seja esquecido.',
      'Dica: o baú secreto da Casa guarda o que é valioso.'
    ]
  },
  {
    id: 'pipo', building: 'house', level: 8, name: 'Pipo, o Menino',
    palette: { tunic: '#c0483b', scarf: '#f0d070', hair: '#6b4a2a', skin: '#f0c08a' }, prop: 'none', size: 'child',
    lines: [
      'Eu sonhei com cinco símbolos e uma cidade pegando fogo!',
      'Quando eu crescer vou ter uma espada igual a sua!',
      'Dica: monstro com brilho dourado deixa um baú cheio de coisas!',
      'O Bram rasgou meu desenho. Por quê?'
    ]
  },
  {
    id: 'otavio', building: 'market', level: 4, name: 'Otávio, o Mercador',
    palette: { tunic: '#5a3a7a', scarf: '#e8c15a', hair: '#2a1a12', skin: '#e0a676', hat: '#3a2a5a' }, prop: 'coins',
    lines: [
      'Dica: o estoque do Mercado muda todo dia. Volte amanhã!',
      'Gente de preto comprando pedras antigas... isso não é comércio honesto.',
      'Dica: no nível 2 dá para vender o que sobra na mochila.',
      'Um sol negro bordado no peito. Já viu um desses?'
    ]
  },
  {
    id: 'selma', building: 'market', level: 8, name: 'Selma, a Mercadora',
    palette: { tunic: '#2a7a6a', scarf: '#f0d070', hair: '#1a1a2a', skin: '#c98a5a', longHair: true, dress: true }, prop: 'coins',
    lines: [
      'Dica: no nível 8 do Mercado dá para encomendar e receber no armazém.',
      'Dica: o leilão aparece no nível 9. Lance alto, sorriso educado.',
      'O Mercado das Miragens some ao meio-dia. Dizem.',
      'Dica: partes do mapa, juntas, levam a ouro. Decifre na Casa.'
    ]
  },
  {
    id: 'rui', building: 'wall', level: 4, name: 'Rui, o Sentinela',
    palette: { tunic: '#6a6a7a', scarf: '#8a2a2a', hair: '#3a2a1a', skin: '#c98a5a', hat: '#8d8d8d' }, prop: 'spear',
    lines: [
      'Dica: repare a muralha depois de cada invasão. Cinco madeiras a cada 10%.',
      'A cada dez dias eles vêm. Sempre à noite.',
      'Dica: as torres atiram sozinhas. Melhore para ter mais arqueiros.',
      'Os saqueadores marcham como soldados. Alguém treinou essa gente.'
    ]
  },
  {
    id: 'iara', building: 'wall', level: 8, name: 'Iara, a Sentinela',
    palette: { tunic: '#4a5a4a', scarf: '#c0a050', hair: '#1a1a1a', skin: '#a0704a', longHair: true, hat: '#6a6a6a' }, prop: 'spear',
    lines: [
      'Dica: armadilhas (tecla 4) prendem inimigos na frente do portão.',
      'Eu vi uma luz vermelha na mata. Igual à do seu fragmento.',
      'Dica: o Golem de Fogo só pode ser enfrentado depois da missão 95.',
      'Ninguém passa por esta muralha sem eu ver.'
    ]
  }
]);
