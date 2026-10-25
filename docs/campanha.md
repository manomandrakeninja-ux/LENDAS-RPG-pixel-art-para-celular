# Campanha: As Cinzas do Primeiro Mundo

Eldoria foi destruída quando os antigos reis tentaram dominar os cinco guardiões elementais (Terra, Água, Vento, Luz e Fogo). O viajante desperta sem memória junto a um acampamento abandonado, com um fragmento vermelho. Ao longo de 100 missões em 10 capítulos, ele reconstrói a vila, recupera os cinco selos e descobre que o Golem de Fogo aprisiona o Devorador de Mundos.

## Como jogar a campanha

- Na primeira vez, o vigia Bram oferece a primeira missão.
- **L**, ou o botão **DIÁRIO** (no celular, o botão DIÁRIO no topo), abre o **Diário de Missões**, com três abas:
  - **Campanha**: capítulos, missões, objetivos com progresso e recompensas, e os botões ACEITAR, ENTREGAR e RASTREAR.
  - **Diárias**: três missões repetíveis por dia, liberadas depois da missão 10.
  - **Registros**: os selos, os moradores e as páginas da história.
- O **rastreador**, embaixo do minimapa, mostra a missão rastreada. Clique nele para abrir o Diário.
- **E**, ou o botão de ação, conversa com os moradores e usa os locais de missão. Os locais aparecem no mapa só enquanto a missão está ativa e ficam marcados no minimapa (losango dourado para a missão rastreada).
- Nos moradores, "!" indica uma missão para aceitar e "?" indica uma missão pronta para entregar.

### Conclusão das missões

- Missões sem entrega de itens terminam sozinhas, com a tela de recompensa.
- Missões com entrega de itens precisam ser entregues ao morador ou pelo Diário. Os itens saem da mochila e, se faltar, do armazém da Casa.
- Cada recompensa (XP, moedas e itens no armazém) é paga uma única vez.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `src/data/campaign.js` | Regiões, locais, moradores, as 100 missões, registros, selos e diárias |
| `src/game/CampaignState.js` | Estados (bloqueada, disponível, ativa, concluída), objetivos, pré-requisitos, recompensas, diárias e save (sem Phaser, testado em `tests/campaign.test.js`) |
| `src/game/CampaignSystem.js` | Mundo: locais, moradores, inimigos e chefes de missão, regiões com perigo, puzzles, defesas, eventos do dia |
| `src/game/QuestUI.js` e `src/quest.css` | Diário, rastreador, diálogos, avisos e tela de recompensa |
| `src/art/person.js`, `src/art/sites.js` | Desenho dos moradores e dos locais |
| `src/game/EnemyVisual.js` | Variantes de inimigos: rato, bandido, cavaleiros, guardião das raízes, urso, espírito da água, escorpião, grifo e Golem |

### Eventos reais que movem os objetivos

Os objetivos avançam com eventos do jogo:
- **Coleta:** árvores, rochas e recursos; estruturas e baús; drops de inimigos; colheita da fazenda; produtos dos animais; locais de missão.
- **Combate:** abates (por espécie, etiqueta da missão, elite, região ou noite) e chefes.
- **Ofícios:** fabricação no Ferreiro e da tocha na Fogueira; plantio e colheita.
- **Mercado:** compra e venda.
- **Exploração e interação:** chegar a locais, investigar, resgatar, conversar, acender pilares, resistir no núcleo e decidir.

Alguns objetivos conferem o estado do jogo: nível dos prédios, animais liberados, equipamento forjado, itens para entregar, selos, moradores e a escolha final.

### Pré-requisitos e proteção contra duplicação

- A campanha é uma corrente: cada missão exige a anterior.
- Saves adulterados, com uma missão ativa sem as anteriores, são corrigidos ao carregar.
- O progresso só conta com a missão ativa e para no total do objetivo.
- A entrega confere o pagamento, conclui a missão e só então consome os itens.

### Regiões e equipamentos

| Região | Perigo sem preparo | Liberada pela missão |
|---|---|---|
| Terra Congelada (norte) | frio | 51 (roupas quentes) |
| Deserto dos Ossos (leste) | calor | 61 (suprimentos) |
| Montanha das Cinzas (sudeste) | cinzas | 82 (máscaras) |

O perigo tira vida aos poucos, mas nunca abaixo de 15%.

### Diárias e eventos

- **Diárias:** três por dia, sorteadas de forma fixa para cada dia (quatro depois da campanha, incluindo desafios lendários). Ficam separadas da história e nunca reiniciam missões dela.
- **Eventos na virada do dia** (depois da missão 10):
  - tempestade em dias de chuva, que danifica um prédio;
  - pedido de abrigo, um sobrevivente que vira morador;
  - mercador raro, com loja de itens especiais.
- **Mercador Zeno:** também vende itens raros depois das missões 48 e 66.

### Chefes

| Missão | Chefe |
|---|---|
| 10 | Lobo Cinzento |
| 35 | Guardião das Raízes |
| 56 | Urso Branco |
| 59 | Guardião Adormecido |
| 67 | Contrabandista |
| 69 | Grifo Guardião |
| 87 | Cavaleiro das Brasas |
| 96–97 | Golem de Fogo, com duas fases: a fúria começa com metade da vida |

Os chefes não fogem, têm barra de vida e só aparecem enquanto a missão precisa deles.

## Testes

- `npm test`: inclui `tests/campaign.test.js`. Ele confere a integridade das 100 missões e de todos os locais; o fluxo de aceitar, avançar e entregar; as recompensas pagas uma única vez; os pré-requisitos; o save; as diárias; e uma simulação da campanha completa, da missão 1 à 100.
- `npm run test:runtime:campaign`, com `npm run dev` ativo, joga pelos caminhos reais do jogo:
  - a abertura e as missões 1 a 3, depois recarrega a página para conferir o save;
  - a entrega pelo Diário e o chefe da missão 10;
  - o ataque noturno, o puzzle e o perigo do norte;
  - a escolha final, as fases do Golem e a defesa do núcleo;
  - a virada do dia.
