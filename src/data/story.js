// LENDAS RPG — história principal (textos). Só dados: a lógica fica em CampaignSystem.js.
// Mil anos atrás, o rei Aurelian abriu o Coração de Eldoria para salvar o povo de uma praga.
// O ritual falhou (a Noite das Cinzas); os guardiões dividiram o Coração em cinco selos e
// prenderam o resto no Golem de Fogo. Hoje, a Ordem do Eclipse quer reunir os selos.

/** Abertura de cada capítulo (ilustração em public/assets/story/capitulo-N.png). */
export const CHAPTER_STORY = Object.freeze({
  1: {
    kicker: 'Mil anos depois da queda de Eldoria',
    text: 'Você desperta perto de uma fogueira, sem memória, com um fragmento vermelho preso ao pescoço. Bram, o Vigia, mantém o fogo aceso para um punhado de sobreviventes. Ninguém espera que você salve o mundo. Primeiro, é preciso sobreviver à noite.'
  },
  2: {
    kicker: 'A esperança nasce entre refugiados',
    text: 'O acampamento cresce. A fazenda produz, famílias chegam e as noites ficam menos frias. Mas, entre as brincadeiras das crianças, alguém desenha cinco símbolos que ninguém deveria conhecer.'
  },
  3: {
    kicker: 'Ferro, comércio e a primeira guerra',
    text: 'Doran desaparece perto da mina, muralhas sobem e os Saqueadores atacam. Os ataques parecem organizados demais para bandidos comuns. Alguém quer o povo reunido num só lugar.'
  },
  4: {
    kicker: 'O primeiro selo e a memória da Terra',
    text: 'Na Floresta Profunda, raízes antigas guardam ruínas cobertas de musgo. O fragmento vermelho pulsa mais forte a cada passo. Ali, a Terra guarda a lembrança da noite em que Eldoria caiu.'
  },
  5: {
    kicker: 'O reino que foi apagado da história',
    text: 'As ruínas de Valdora escondem soldados sem rei, uma biblioteca soterrada e o túmulo de Aurelian, o Último Rei. A história oficial diz que ele foi um tirano. As pedras dizem outra coisa.'
  },
  6: {
    kicker: 'A Água guarda o que todos esqueceram',
    text: 'Na Terra Congelada, até as lembranças parecem presas no gelo. Um vilarejo inteiro esqueceu os próprios nomes, e um guardião adormecido protege memórias que ninguém mais quer ouvir.'
  },
  7: {
    kicker: 'O Vento revela a conspiração',
    text: 'O Deserto dos Ossos guarda a antiga rota de comércio de Eldoria. Alguém vem comprando artefatos dos templos, um por um. O sol negro que aparecia nos documentos finalmente ganha um nome.'
  },
  8: {
    kicker: 'A Guerra das Cinzas',
    text: 'O inimigo deixa as sombras. Um exército corrompido marcha contra o acampamento e a Ordem do Eclipse quer os selos — e você. Nesta guerra, até os amigos guardam segredos.'
  },
  9: {
    kicker: 'A verdade sob a montanha',
    text: 'Na Montanha das Cinzas fica a forja original dos selos. O Golem de Fogo ruge nas profundezas: não como um monstro, mas como uma prisão que está começando a rachar.'
  },
  10: {
    kicker: 'O destino de Eldoria',
    text: 'A última trilha leva ao núcleo. Os cinco selos brilham juntos pela primeira vez em mil anos. Lá dentro espera a verdade sobre a sua origem e uma escolha que o rei Aurelian nunca conseguiu fazer.'
  }
});

/** Registros da história (aba Registros do Diário). Substituem e ampliam os registros antigos. */
export const STORY_LORE = Object.freeze({
  despertar: { title: 'O despertar', text: 'Você acorda junto a um acampamento de sobreviventes, sem memória. Preso ao pescoço, um fragmento vermelho está morno, como se tivesse um coração.' },
  eldoria: { title: 'Eldoria, a joia do continente', text: 'Há mil anos existia Eldoria, onde as colheitas cresciam no inverno e os rios curavam doenças. No centro de tudo pulsava o Coração de Eldoria, uma consciência viva protegida por cinco guardiões: Terra, Água, Vento, Luz e Fogo.' },
  presagio: { title: 'A noite em que as fogueiras se apagaram', text: 'Uma luz vermelha surgiu entre as árvores. Os animais fugiram e todas as fogueiras do acampamento se apagaram — menos a que estava perto de você. O fragmento brilhava.' },
  fragmento: { title: 'O Fragmento Vermelho', text: 'Ao tocar o cristal, o fragmento acendeu. Por um instante você viu cinco luzes girando em volta de uma montanha em chamas. Bram viu o símbolo gravado na pedra e desviou o olhar.' },
  lobo: { title: 'O que o lobo guardava', text: 'Sob o covil do Lobo Cinzento havia pedras com marcas antigas. A fera não caçava por fome: ela afastava as pessoas de algo enterrado sob a floresta.' },
  bandeira: { title: 'O desenho da criança', text: 'Durante o Festival, uma menina desenhou com carvão cinco símbolos e uma cidade em chamas. Disse que viu tudo num sonho. Era a bandeira de Eldoria — um reino de que ela nunca ouviu falar.' },
  ordens: { title: 'Ordens de um morto', text: 'Entre as coisas dos Saqueadores havia ordens militares assinadas por um comandante que morreu há mil anos. No lacre, um sol negro. Alguém está pagando os ataques.' },
  circulo: { title: 'O Círculo de Cogumelos', text: 'Os cogumelos formam um selo antigo. Sussurros falam dos cinco guardiões e de um juramento: nenhum rei controlaria o Coração.' },
  diario: { title: 'Diário do Explorador', text: '"Dia 40. As criaturas não eram assim. Algo mudou quando a montanha acendeu. O rei prometeu cura para todos. Trouxe cinzas."' },
  guardioes: { title: 'O Eco dos Guardiões', text: 'Uma voz de pedra ecoa: "Dividimos o Coração em cinco selos para que ninguém o dominasse. Portador, lembre-se de nós."' },
  noiteCinzas: { title: 'A Noite das Cinzas', text: 'A visão do selo mostra Aurelian roubando os cinco selos e abrindo o Coração. O céu ficou vermelho, a terra se partiu e os mortos voltaram a andar. O Selo da Terra não prende só o mal: guarda também a consciência do antigo reino.' },
  catastrofe: { title: 'A praga de Eldoria', text: 'O mural mostra uma praga mágica: plantações podres, crianças doentes, curandeiros sem resposta. Os guardiões proibiram o rei de usar o Coração. Ele não aceitou.' },
  aurelian: { title: 'Aurelian, o Último Rei', text: 'Aurelian não começou como tirano. Era amado, venceu guerras e faria qualquer coisa pelo seu povo. Quando a praga veio, uma "voz divina" lhe ensinou o ritual. Ele acreditou nela.' },
  reis: { title: 'A confissão do rei', text: 'Na lápide, Aurelian confessa: "Quis salvar todos e condenei todos. A voz que me guiou não era de um deus. Que o Golem perdoe o que deixei dentro dele."' },
  vilarejo: { title: 'O Vilarejo Silencioso', text: 'Os moradores esqueceram os próprios nomes na noite em que o lago congelou. A corrupção não leva só a vida: leva as lembranças.' },
  memorias: { title: 'O que a corrupção come', text: 'O Guardião Adormecido não atacava por maldade: protegia as memórias dos mortos. A entidade por trás da corrupção se alimenta de lembranças, culpa e medo. O Selo da Água guarda o verdadeiro destino de Aurelian.' },
  rota: { title: 'A rota dos artefatos', text: 'Os registros do Mercado das Miragens mostram compras de artefatos dos templos, sempre pagas em ouro com o mesmo sol negro.' },
  eclipse: { title: 'A Ordem do Eclipse', text: 'O Contrabandista trabalhava para a Ordem do Eclipse. Eles acreditam que o mundo de hoje é uma Eldoria incompleta e querem reconstruir o reino com os cinco selos, mesmo que isso custe a vida de quem vive nele.' },
  documentos: { title: 'Mensagens Interceptadas', text: 'Ordens do Eclipse: "Recuperem os selos antes do portador. Tragam o fragmento vermelho intacto. O garoto da fogueira é a chave."' },
  bram: { title: 'O segredo de Bram', text: 'Bram confessa: ele serviu a uma ordem que protegia os registros de Eldoria. Recebeu o fragmento de alguém que morreu para manter você vivo, e escondeu a verdade para que o Eclipse não te encontrasse.' },
  forja: { title: 'A forja dos selos', text: 'O mestre de Doran mostra a forja original onde os guardiões criaram os selos. Ele desapareceu para impedir que o Eclipse forjasse armas capazes de quebrá-los.' },
  golem: { title: 'A Verdade do Golem', text: 'O Golem de Fogo não é o inimigo. Os guardiões o ergueram para conter o que restou do Coração. Sua fúria é o sinal de que a prisão está falhando — e o Eclipse quer acordá-lo de vez.' },
  portador: { title: 'O Portador do Fragmento', text: 'Anos atrás, o Eclipse tentou forjar um sexto selo para controlar os outros cinco. O experimento destruiu tudo e só uma criança sobreviveu: você. O fragmento é o que restou desse selo. Por isso os templos respondem ao seu toque.' },
  coracao: { title: 'O Coração Adormecido', text: 'Dentro do núcleo, o Coração ainda pensa e sente. Com os cinco selos, ele pode ser preso de novo — ou a prisão pode ser quebrada para sempre.' },
  finalDestruir: { title: 'Final: o fim do ciclo pela força', text: 'O Golem caiu e o núcleo se apagou. As criaturas corrompidas perderam a força e a Ordem do Eclipse desmoronou. Mas a magia antiga também sumiu de parte do mundo. Nem toda vitória devolve o que foi destruído.' },
  aurelianConflito: { title: 'O conflito de Aurelian', text: 'O rei não é simplesmente mau. Tomou uma decisão desesperada, foi enganado e condenou o próprio povo. Sua consciência ficou presa às memórias do Coração, dividida entre assumir a culpa e acreditar que, com mais poder, teria salvado todos.' },
  ecoCoroa: { title: 'Eco do Rei: a coroa partida', text: 'Aurelian partiu a própria coroa num salão cheio de doentes. Ele não queria poder: queria tempo para salvar cada um.' },
  ecoGelo: { title: 'Eco do Rei: a voz no gelo', text: 'Uma luz sem rosto prometeu cura se ele abrisse o Coração. Os guardiões imploraram para ele parar. Ele escolheu a voz que lhe dava esperança.' },
  ecoForja: { title: 'Eco do Rei: a última ordem', text: 'Consumido pelo Coração, Aurelian ordenou que os guardiões o prendessem junto com a energia. Foi a primeira ordem que deu por todos, e não por si.' },
  finalLibertar: { title: 'Final secreto: o Coração livre', text: 'Você libertou a consciência do Coração e deixou que ela escolhesse o próprio destino. Aurelian reconheceu sua culpa, o Eclipse perdeu o controle da energia e o Golem se desfez por vontade própria. Eldoria não voltou. Algo novo começou, sem rei, sem profecia e sem poder absoluto.' },
  finalRestaurar: { title: 'Final: o renascimento de Eldoria', text: 'Os cinco selos e o fragmento estabilizaram o núcleo. O Golem parou de lutar e revelou as memórias de Aurelian. A corrupção foi purificada, mas os mortos não voltaram. O passado pode ensinar o futuro, mas não substituí-lo.' },
  amanhecer: { title: 'O Amanhecer', text: 'As cinzas assentam e o sol volta a nascer. O acampamento é agora o primeiro povoado de uma nova era — sem rei, sem profecia, construído pelas mãos de quem sobreviveu.' }
});

/**
 * História ligada às missões existentes (objetivos e recompensas não mudam).
 * intro: frase extra ao oferecer a missão • outro: fala ao concluir • lore: registros liberados ao concluir.
 */
export const MISSION_STORY = Object.freeze({
  1: { lore: ['despertar', 'eldoria'] },
  4: { outro: 'As gosmas fugiram da luz vermelha da noite passada. Elas também sentiram alguma coisa.' },
  7: { lore: ['presagio'], outro: 'O sobrevivente repetia a mesma frase: "a luz vermelha apagou as fogueiras... menos a sua".' },
  9: {
    intro: 'Bram evita olhar para o seu fragmento quando fala do cristal.',
    outro: 'Bram fica pálido ao ver o fragmento brilhar. "Guarde isso dentro da camisa e não mostre a ninguém. Um dia eu explico. Hoje não."',
    lore: ['fragmento']
  },
  10: { lore: ['lobo'], outro: 'O Lobo Cinzento caiu. Sob o covil, pedras com marcas antigas. A fera guardava algo enterrado — e agora ninguém guarda.' },
  20: { lore: ['bandeira'], outro: 'Uma menina mostra um desenho de carvão: cinco símbolos e uma cidade em chamas. Bram rasga o papel e joga no fogo sem dizer nada.' },
  27: { outro: 'Zeno conta as moedas devagar. "Alguns compradores pagam bem por pedras antigas. Bem demais. Não pergunte."' },
  30: { lore: ['ordens'], outro: 'Os saqueadores fugiram e deixaram ordens com o lacre de um sol negro, assinadas por um comandante morto há mil anos.' },
  33: { intro: 'Kael diz que os animais da floresta atacam como se estivessem feridos por dentro.' },
  39: { outro: 'A visão termina e o fragmento queima na sua pele. Você viu a Noite das Cinzas como se estivesse lá.' },
  40: { lore: ['noiteCinzas'], outro: 'O Selo da Terra pulsa junto do fragmento. Ele não prende só o mal: guarda também a consciência de um reino inteiro.' },
  47: { lore: ['aurelian', 'aurelianConflito'] },
  50: { outro: 'A confissão do rei ecoa nas ruínas. Uma voz o enganou. E alguém, hoje, está repetindo o mesmo ritual.' },
  57: { outro: 'Ninguém no vilarejo lembra o próprio nome. Lia anota cada rosto para que ninguém seja apagado.' },
  60: { lore: ['memorias'], outro: 'O Selo da Água mostra Aurelian chorando diante do Coração aberto. A entidade se alimenta de culpa — e ele tinha muita.' },
  63: { outro: 'Os nômades falam de compradores vestidos de preto, com um sol negro bordado no peito.' },
  66: { lore: ['rota'] },
  67: { lore: ['eclipse'], outro: 'O Contrabandista ri antes de cair: "A Ordem do Eclipse já tem compradores para os seus selos, portador."' },
  70: { outro: 'Com o Selo do Vento, três selos estão em suas mãos. O Eclipse não vai mais esperar nas sombras.' },
  73: { outro: 'Os documentos falam de você: "o garoto da fogueira". Bram lê por cima do seu ombro e pede para conversar a sós.' },
  76: { outro: 'As torres resistiram. A Capitã Mirela descobre que as ordens de recuo vieram de um oficial infiltrado.' },
  77: { lore: ['forja'], outro: 'O mestre de Doran está vivo. "Fugi para que o Eclipse não forjasse armas contra os selos. Agora é a sua vez de terminar o que comecei."' },
  80: { lore: ['bram'], outro: 'Bram finalmente conta a verdade: ele te tirou das ruínas de um ritual do Eclipse quando você era criança. "Eu te escondi do mundo. Perdoe um velho com medo."' },
  85: { outro: 'Os núcleos de magma ainda guardam calor do Coração. O Golem ruge mais alto a cada um retirado.' },
  89: { outro: 'Lia termina de ler as inscrições em silêncio. "Não é um monstro. É uma prisão. E ela está chorando."' },
  92: { outro: 'O mecanismo aceita os cinco selos — e então o seu fragmento, como se fosse a sexta peça.' },
  94: { lore: ['portador'], outro: 'O núcleo mostra a sua origem: o laboratório do Eclipse, o sexto selo partido, uma criança sobrevivendo. Você é a prova de que o ciclo pode ser quebrado.' },
  96: { outro: 'O Golem cambaleia. Dentro dele, uma voz cansada — a de Aurelian — pede para tudo acabar do jeito certo.' },
  98: { outro: 'O núcleo se estabiliza. Mirela, Kael, Doran e Lia seguraram a linha. Ninguém desta vez lutou sozinho.' },
  100: { outro: 'O acampamento virou povoado. Eldoria não voltou, e talvez não precise voltar. Algo novo começa — e o seu nome agora é uma lenda.' }
});

/** Falas dos moradores por capítulo (a partir do capítulo indicado). */
export const NPC_STORY_LINES = Object.freeze({
  vigia: {
    1: ['Fique perto do fogo à noite. A escuridão daqui tem dentes.', 'Esse colar seu... deixe por dentro da camisa, está bem?'],
    3: ['Bandidos não escrevem ordens com lacre. Isso me preocupa.', 'Eldoria já foi bonita, sabia? Antes da Noite das Cinzas.'],
    5: ['Aurelian foi um homem desesperado, não um monstro. Isso não o torna inocente.'],
    8: ['Eu devia ter contado antes. Tive medo de te perder para eles.', 'O Eclipse acha que você é uma chave. Eu acho que você é uma pessoa.'],
    10: ['Seja o que for que escolher lá dentro, escolha sabendo o preço.']
  },
  curandeira: {
    1: ['Ervas frescas salvam vidas. Traga o que encontrar.', 'Seu fragmento vermelho pulsa quando você se aproxima do fogo.'],
    4: ['Alguns feridos saram, mas esquecem quem amavam. Eu anoto os nomes deles.'],
    6: ['A corrupção come lembranças. Se eu esquecer, prometa que lê o meu caderno.'],
    9: ['Há um ritual que poderia curar todos... e apagar as minhas memórias. Ainda não sei se teria coragem.']
  },
  ferreiro: {
    1: ['Ferro bom canta quando bate na bigorna.', 'Traga minério e eu transformo em lenda.'],
    3: ['Meu mestre dizia: toda lâmina guarda um juramento. As inscrições da mina falavam a mesma coisa.'],
    8: ['Meu mestre sumiu para não forjar armas para eles. Eu vou terminar a obra dele, sem repetir o erro de Eldoria.']
  },
  cacador: {
    1: ['A floresta fala. Basta saber ouvir os galhos quebrando.', 'Lobos caçam em bando. Nunca fique cercado.'],
    4: ['Alguns monstros atacam porque estão feridos pela magia dos selos. Não sei mais quem merece a lâmina.'],
    7: ['Eu queria exterminar todos eles. Agora aprendo a distinguir o que precisa morrer do que pode ser curado.']
  },
  construtor: {
    1: ['Madeira e pedra: com isso eu levanto qualquer coisa.', 'Precisamos de mais casas. Gente nova chega toda semana!'],
    3: ['Uma muralha bem feita vale mais que cem espadas.'],
    8: ['Se tudo cair, a gente reconstrói. É isso que a gente faz aqui.'],
    10: ['Depois que tudo acabar, quero construir uma praça. Com uma fogueira no meio, claro.']
  },
  capitao: {
    5: ['Soldados sem rei, mas não sem honra.', 'Você luta como os antigos guardiões contavam.'],
    8: ['Recebi ordens falsas de um dos meus. Agora decido sozinha — e respondo pelas decisões.', 'A guerra das cinzas chegou. Fique ao meu lado.'],
    10: ['Não existe resposta perfeita lá dentro. Existe a que você consegue carregar depois.']
  },
  mercador: {
    1: ['Tudo tem preço, amigo. Até a esperança.', 'Rotas seguras significam bons negócios para todos.'],
    5: ['Ouvi dizer que no deserto há um mercado que aparece e some.'],
    7: ['Eu vendi pedras antigas para gente de preto. Não sabia para quê. Juro que não sabia.'],
    8: ['Fugir seria fácil. Ficar e consertar o que eu causei... é o único negócio que ainda vale a pena.']
  }
});

/** Missão 95: a escolha que muda o final. */
export const GOLEM_CHOICE = Object.freeze({
  title: 'A Última Escolha',
  text: 'O Golem de Fogo prende o que restou do Coração de Eldoria há mil anos — e a consciência de Aurelian com ele. Destruí-lo acaba com a corrupção e com o Eclipse, mas apaga a magia antiga. Restaurá-lo com os cinco selos e o fragmento purifica o Coração, mas mantém a prisão de pé. A escolha fica gravada para sempre.',
  restore: { label: 'RESTAURAR O GUARDIÃO', toast: 'Você decidiu restaurar o Golem e purificar o Coração.' },
  destroy: { label: 'DESTRUIR O GOLEM', toast: 'Você decidiu destruir o Golem e acabar com o ciclo pela força.' }
});

/** Finais (missão 99), conforme a escolha da missão 95. */
export const ENDINGS = Object.freeze({
  restore: { title: 'O RENASCIMENTO DE ELDORIA', lore: 'finalRestaurar' },
  destroy: { title: 'O FIM DO CICLO PELA FORÇA', lore: 'finalDestruir' },
  free: { title: 'O CORAÇÃO LIVRE', lore: 'finalLibertar', image: 'libertar' }
});

// ---------- Aurelian, o Último Rei ----------
// O vilão que tentou salvar o mundo: decidiu desesperado, foi enganado e condenou o próprio povo.
// A consciência dele ficou presa às memórias do Coração. Conflito: assumir a culpa ou continuar
// acreditando que, com mais poder, teria salvado todos.

/** Quem fala nos diálogos sem ser morador do acampamento (retrato próprio). */
export const SPEAKERS = Object.freeze({
  aurelian: {
    name: 'Aurelian, o Último Rei',
    palette: { tunic: '#4a2a5a', scarf: '#d9b45c', hair: '#d8d8e0', skin: '#b8b0c8', beard: true, hat: '#e8c15a' }
  }
});

/** Ecos do Rei: memórias de Aurelian escondidas no mundo (opcionais, contam para o final secreto). */
export const AURELIAN_ECHOES = Object.freeze([
  {
    id: 'eco-coroa', name: 'Eco do Rei: a Coroa Partida', region: 'valdora', offset: [-260, 120], afterMission: 'm050', lore: 'ecoCoroa',
    title: 'Memória: a coroa partida',
    text: 'Você vê Aurelian jovem, coroado sob aplausos. Depois, o mesmo salão vazio, cheio de leitos de doentes. Ele tira a coroa e a parte ao meio: "De que serve um rei que não salva ninguém?"',
    speech: 'Eu não queria poder. Eu queria tempo. Mais um dia para cada criança naquela ala. Você entende isso, portador?'
  },
  {
    id: 'eco-gelo', name: 'Eco do Rei: o Lago Congelado', region: 'norte', offset: [260, 120], afterMission: 'm060', lore: 'ecoGelo',
    title: 'Memória: a voz no gelo',
    text: 'No reflexo do lago, Aurelian ajoelha diante de uma luz sem rosto. A voz promete cura para todos se ele abrir o Coração. Os guardiões gritam para ele parar. Ele escolhe ouvir a voz.',
    speech: 'A voz falava como um deus. Os guardiões falavam como juízes. Eu escolhi quem me dava esperança... e a esperança tinha dentes.'
  },
  {
    id: 'eco-forja', name: 'Eco do Rei: as Cinzas da Forja', region: 'montanha', offset: [-220, 60], afterMission: 'm088', lore: 'ecoForja',
    title: 'Memória: a última ordem',
    text: 'A Noite das Cinzas vista de dentro do Coração. O rei, já consumido, ordena que os guardiões o prendam junto com a energia. É a última ordem que ele dá, e a primeira que dá por todos, e não por si.',
    speech: 'Mil anos repetindo a mesma conta: se eu tivesse mais força, teria salvado todos. Talvez a resposta nunca tenha sido força.'
  }
]);

/** Laços: conversas pessoais com os moradores (opcionais, contam para o final secreto). */
export const BONDS = Object.freeze({
  cacador: {
    afterMission: 'm040',
    text: 'Kael encara o horizonte. "Matei hoje um lobo que só estava ferido pela magia dos selos. E se a maioria deles puder ser curada?"',
    options: [
      { label: 'VAMOS CURAR OS QUE PUDERMOS', bond: true, reply: 'Kael sorri pela primeira vez em dias. "Então eu aprendo a mirar só no que precisa morrer."' },
      { label: 'MONSTRO É MONSTRO', bond: false, reply: 'Kael assente devagar, mas não parece convencido.' }
    ]
  },
  curandeira: {
    afterMission: 'm060',
    text: 'Lia segura o caderno com os nomes de todos. "Existe um ritual que cura a corrupção, mas apaga as minhas memórias. Se eu esquecer, quem lembra de vocês?"',
    options: [
      { label: 'NÓS LEMBRAMOS POR VOCÊ', bond: true, reply: '"Então deixo o caderno com você", diz Lia, mais leve. "Prometa que vai ler os nomes em voz alta."' },
      { label: 'NÃO ARRISQUE NADA', bond: false, reply: 'Lia fecha o caderno. "Talvez você tenha razão." Ela não parece aliviada.' }
    ]
  },
  mercador: {
    afterMission: 'm067',
    text: 'Zeno não olha nos seus olhos. "Vendi pedras dos templos para gente de preto. Não sabia para quê. Posso fugir hoje à noite... ou ficar e consertar."',
    options: [
      { label: 'FIQUE E CONSERTE', bond: true, reply: '"O pior negócio da minha vida", ri Zeno, nervoso. "E o único que vale a pena." Ele te entrega a lista dos compradores do Eclipse.' },
      { label: 'FAÇA O QUE QUISER', bond: false, reply: 'Zeno guarda as moedas em silêncio.' }
    ]
  },
  capitao: {
    afterMission: 'm076',
    text: 'Mirela queima uma ordem falsa na fogueira. "Obedeci a um traidor e quase perdemos as torres. Talvez eu não sirva para comandar."',
    options: [
      { label: 'DECIDA POR CONTA PRÓPRIA', bond: true, reply: '"Sem ordens, sem desculpas", diz Mirela. "Só eu e o peso das escolhas. Combinado."' },
      { label: 'SIGA AS ORDENS DE SEMPRE', bond: false, reply: 'Mirela endireita o uniforme. "Sim, senhor." A voz sai vazia.' }
    ]
  },
  ferreiro: {
    afterMission: 'm077',
    text: 'Doran examina as ferramentas do mestre. "Ele forjou armas para Eldoria e viu no que deu. Se eu terminar a obra dele, vou repetir o mesmo erro?"',
    options: [
      { label: 'FORJE PARA PROTEGER', bond: true, reply: 'Doran grava no cabo do martelo: "Toda lâmina guarda um juramento." "Agora sei qual é o meu."' },
      { label: 'ARMAS SÃO SÓ ARMAS', bond: false, reply: 'Doran volta para a bigorna sem dizer nada.' }
    ]
  },
  vigia: {
    afterMission: 'm080',
    text: 'Bram mexe no fogo. "Escondi a verdade de você por anos. Tive medo de te perder para o Eclipse. Você me perdoa?"',
    options: [
      { label: 'VOCÊ ME PROTEGEU. EU PERDOO', bond: true, reply: 'Bram fecha os olhos por um longo tempo. "Obrigado, filho. Agora vamos terminar isso juntos."' },
      { label: 'VOCÊ DEVIA TER CONTADO', bond: false, reply: '"Eu sei", diz Bram. E não diz mais nada pelo resto da noite.' }
    ]
  }
});

/** Final secreto (C): exige os 3 Ecos do Rei, todos os laços e as provas do Eclipse. */
export const SECRET_ENDING = Object.freeze({
  echoes: AURELIAN_ECHOES.map((echo) => echo.lore),
  bonds: Object.keys(BONDS),
  evidence: ['ordens', 'rota', 'eclipse', 'documentos'],
  choice: { label: 'LIBERTAR O CORAÇÃO', toast: 'Você decidiu libertar o Coração e deixar que ele escolha o próprio destino.' },
  hint: 'Algo ainda está incompleto. Talvez existam memórias do rei, conversas e provas que você não encontrou.'
});

/** O que Aurelian diz em cada final (o conflito dele). */
export const AURELIAN_FINAL_WORDS = Object.freeze({
  destroy: '"Se eu tivesse mais força... não, nem agora." A voz do rei se apaga junto com o núcleo, ainda contando os que não salvou.',
  restore: '"Então continuarei aqui, guardando o que quebrei." Aurelian aceita a prisão, mas ainda sonha com o poder que teria salvado todos.',
  free: '"Fui eu. Não a voz, não a praga, não o destino. Fui eu." Pela primeira vez em mil anos Aurelian assume a culpa, e por isso finalmente pode descansar.'
});

export const AURELIAN_LINES = Object.freeze({
  choice: 'Portador... eu sou o que restou de Aurelian. Abri o Coração para salvar meu povo e condenei todos. Escolha melhor do que eu escolhi.'
});
