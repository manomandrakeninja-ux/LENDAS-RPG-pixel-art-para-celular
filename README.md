# LENDAS

**LENDAS** vem das iniciais de **L**ucas **E**duardo **N**istal **D**a **S**ilva, criador do jogo.

RPG top-down em pixel art feito com Phaser 3, pensado para **celular** (joystick e botões na tela) e jogável no **computador** com teclado e mouse.

Loop do jogo: explorar → coletar → melhorar o acampamento → ficar mais forte → explorar mais longe.

## Testar no computador

Requer Node.js 20 ou superior.

```bash
npm install          # só na primeira vez
npm run dev          # abre em http://127.0.0.1:5173/
```

- Teclado e mouse funcionam normalmente (veja **Controles** abaixo).
- Para ver os **controles de celular no computador**, abra `http://127.0.0.1:5173/?toque=1` e use o mouse no joystick e nos botões.
- No Chrome, também dá para simular um celular: **F12 → ícone de celular (Ctrl+Shift+M)** → escolha um aparelho e deite a tela.

## Testar no celular

1. Celular e computador na **mesma rede Wi-Fi**.
2. No computador: `npm run dev:celular`.
3. O Vite mostra um endereço **Network**, por exemplo `http://192.168.0.15:5173/`. Abra esse endereço no navegador do celular.
4. Deite o celular (o jogo foi feito para tela na horizontal) e toque em **TELA** para tela cheia.
5. Para instalar como app: no Android, menu do Chrome → **Adicionar à tela inicial**; no iPhone, Safari → **Compartilhar → Adicionar à Tela de Início**.

Se o celular não abrir o endereço, o Firewall do Windows pode estar bloqueando o Node.js: permita o acesso em **redes privadas** quando o Windows perguntar.

## Protótipo e sistemas

Protótipo de RPG top-down em pixel art feito com Phaser 3. A **Fase 1** adiciona ciclo de dia/noite, sono, espécies diurnas e noturnas, elites, recursos lunares, zona segura, drops, mochila de morte e save versionado. O **Sistema 1** acrescenta estruturas coletáveis pelo mundo, com recompensas, regeneração por dias, baús únicos e cogumelos noturnos. O **Sistema 2** implementa os menus de Fazenda, Ferraria, Casa/Armazém e Mercado, além de mineração, veios de ferro, picaretas e uma mina com inimigos fortes. O **Sistema 3** transforma a mochila em uma grade real de 12 slots e adiciona o armazenamento rápido ao entrar no acampamento. A expansão atual acrescenta **mapa fullscreen com neblina**, **progressão por XP**, **economia de moedas** e um **chefe de bioma com três padrões de ataque**.

## Build de produção

```bash
npm run build            # gera a pasta dist/
npm run preview          # testa o build no computador
npm run preview:celular  # testa o build no celular (mesma rede Wi-Fi)
```

O build usa caminhos relativos, então a pasta `dist/` funciona em qualquer hospedagem estática (GitHub Pages, Netlify, itch.io). O progresso é salvo no `localStorage` do navegador, sem servidor de jogo e sem conta.

## Controles no celular

Aparecem sozinhos em telas de toque (ou com `?toque=1` no computador; `?toque=0` esconde).

- **Joystick (lado esquerdo)**: toque em qualquer ponto da metade esquerda de baixo e arraste. Quanto mais longe você arrasta, mais rápido o personagem anda.
- **Botão grande (canto inferior direito)**: atacar, ou coletar/minerar/recuperar a mochila quando houver algo perto. O texto do botão muda conforme a situação.
- **ESQUIVA** e **ESPECIAL**: acima do botão grande. Funcionam com o outro dedo segurando o joystick.
- **MAPA** e **TELA** (tela cheia): abaixo do minimapa.
- **ACAMP.**: aparece perto da fogueira e abre/fecha o menu do acampamento.
- **Prédios**: toque no prédio para abrir o painel. **Slots da mochila**: toque para usar poção, comida ou tocha.
- **GUARDAR TUDO**: aparece embaixo, no centro, ao entrar no acampamento.

Os controles somem enquanto o mapa, um painel de prédio ou a escolha de nível estão abertos.

## Controles no computador

- **WASD** ou setas: mover
- **Clique esquerdo** no mundo ou **J**: atacar o inimigo próximo
- Ataques encadeados em menos de 0,9 s formam um **combo de 3 golpes**; o terceiro causa 1,5x de dano e empurra mais
- **Espaço**: esquivar (consome stamina)
- **Q**: habilidade especial em área
- **1**: beber poção de vida (+50) • **2**: comer (comida +12, leite +10, ovo +8) • **3**: acender tocha (luz maior por 2 min)
- **Toque em um slot da mochila**: usa poção, comida ou tocha
- **E**: coletar recursos, árvores, ervas, cogumelos e baús próximos; minerar rochas e veios quando houver picareta; ou recuperar uma mochila de morte
- **Clique ou toque nos prédios**: abrir o painel fullscreen da Fazenda, Ferraria, Casa/Armazém ou Mercado
- **Botão no canto inferior direito**: coletar, minerar, recuperar a mochila ou atacar
- **Botão Guardar Tudo no canto inferior esquerdo**: aparece ao entrar no acampamento e move a mochila para o armazém da casa
- **M**: abrir/fechar o mapa fullscreen do mundo
- **C**: abrir/fechar o menu do acampamento (quando estiver perto)
- **Clique nos cartões do acampamento**: tentar melhorar a construção ou dormir
- **F**: descansar durante o dia; à noite, dormir e pular a noite (junto à fogueira)
- **R**: dormir e pular a noite somente durante a noite
- **Esc**: fechar o mapa ou o menu aberto

A cada nível o personagem ganha +10 de vida máxima e escolhe ATAQUE +2 ou DEFESA +2. Nos níveis 5, 10, 15 e 20 também escolhe um **talento** entre três opções (Sede de Sangue, Pés Ligeiros, Golpe Brutal, Ritmo de Batalha, Vigor, Saqueador).

Derrote cinco criaturas para concluir a missão local; volte à fogueira para receber comida e ervas. O ciclo usa **4 minutos reais de dia e 2 minutos reais de noite**. Se a vida acabar, o personagem retorna à fogueira; 40% dos recursos carregados ficam em uma mochila de morte no local da queda e podem ser recuperados com **E**. Recursos guardados no armazém não são perdidos.

## Organização do código

- `src/game/World.js`: terreno procedural, floresta, recursos diurnos/noturnos e dados de áreas exploradas.
- `src/game/HarvestStructures.js`: criação, animação, interação e ciclo das estruturas coletáveis.
- `src/data/harvestStructures.js`: configuração, recompensas, loot e estado persistente das estruturas.
- `src/game/Player.js`: movimento (teclado e joystick), atributos, esquiva, knockback e dano.
- `src/game/TouchControls.js`: joystick virtual, botões de toque, tela cheia e detecção de celular.
- `src/game/Enemies.js`: entidade física e IA de cada inimigo.
- `src/game/EnemyVisual.js`: silhuetas pixeladas dos placeholders, geradas em canvas por código.
- `src/game/EnemyDirector.js`: spawn por horário/região/distância, limite, despawn e elites.
- `src/game/DayNightCycle.js`: relógio da Fase 1, transições, aviso e sono.
- `src/game/LightingSystem.js`: máscara noturna pixelada com fontes de luz.
- `src/game/DeathBackpack.js`: mochilas deixadas no local da morte.
- `src/game/Camp.js`: quatro prédios, níveis, aparência, equipamentos e armazenamento seguro.
- `src/game/FarmSystem.js`: canteiros, cultivos, produtos animais e colheita automática.
- `src/game/EquipmentSystem.js`: receitas, ferramentas, equipamentos e atributos derivados.
- `src/game/MarketSystem.js`: estoque diário, compras e vendas.
- `src/game/BuildingMenu.js`: painéis fullscreen responsivos dos quatro prédios.
- `src/data/buildingSystems.js`: tempos de cultivos, animais, receitas, mercado (compra e preços de venda por item), mina e armazenamento.
- `src/data/consumables.js`: efeitos de poção, comida e tocha, e as teclas de uso rápido.
- `src/data/progression.js`: XP, níveis, atributos e talentos dos níveis 5, 10, 15 e 20.
- `src/game/Inventory.js`: mochila de 12 slots, capacidade, bundles e perda parcial.
- `src/game/UI.js`: HUD, grade visual da mochila, contador de dias, minimapa e menus.
- `src/game/GameScene.js`: integração de ciclo, combate, spawn, sono, morte e salvamento.
- `src/game/save.js`: save v2, migração v1 e quarentena de save corrompido.
- `src/game/WorldMapOverlay.js`: mapa fullscreen, neblina de exploração e marcadores do mundo.
- `src/data/progression.js` e `src/game/LevelUpOverlay.js`: níveis, XP e escolha entre ataque/defesa.
- `src/game/ExperiencePickups.js`: cristais de XP físicos com coleta por proximidade.
- `src/game/EconomySystem.js` e `src/game/CoinPickups.js`: carteira e drops de moedas.
- `src/data/boss.js` e `src/game/BiomeBoss.js`: chefe, padrões de combate e barra de vida.
- `src/game/assets.js`: registro central das spritesheets, atlas e animações.
- `src/data/`: tabelas de ciclo, inimigos, elites, drops, spawn, recursos, biomas provisórios e combate.
- `scripts/generate-assets.js`: gerador reproduzível das imagens PNG e placeholders.
- `assets-pendentes.md`: arte final ainda necessária; a Fase 7 substituirá os placeholders.

## Pixel art e assets

Os PNGs ficam em `public/assets/` (`tiles`, `characters`, `buildings`, `nature`, `animals`, `ui` e `vfx`). O registro em `src/game/assets.js` aponta para cada spritesheet/atlas e concentra os tamanhos de frame e as animações. Troque um PNG mantendo os nomes dos frames, ou atualize o registro e os nomes usados pelos módulos do jogo.

Para recriar os placeholders pixel-art:

```bash
npm run assets:generate
```

O jogo usa nearest-neighbor, câmera de mundo com zoom inteiro 2x, câmera de interface sem zoom, molduras nine-slice e a fonte local Press Start 2P. Os PNGs incluem sombras e variações de grama; animações de caminhada, árvores, fumaça, fogueira e animais são registradas no Phaser em `assets.js`.

### Direção visual e pixel art

A camada de apresentação foi desenhada para preservar a resolução nativa dos sprites: sem blur, sem escala fracionária nos personagens e sem pós-processamento. A atmosfera combina iluminação noturna quantizada, partículas quadradas e detalhes de solo; a neblina de exploração aparece somente no minimapa e no mapa fullscreen, sem escurecer o mundo. Ataques, coleta, dano, cura e melhorias têm feedback visual próprio. Os inimigos provisórios usam silhuetas pixeladas criadas em canvas, sem atlas externo; a arte final permanece na Fase 7.

## Fase 1 — ciclo, inimigos e morte

- Dia: **240 s reais**; noite: **120 s reais**; transições: **30 s**; aviso visual/sonoro: **30 s** antes da noite.
- Relógio, contador de dias e sono ficam em `DayNightCycle.js`; os valores de balanceamento ficam em `src/data/dayNight.js`.
- O HUD mostra `DIA N`, relógio e fase. O banner noturno permanece visível durante os 30 s finais do dia.
- Dormir restaura vida/stamina, remove os inimigos noturnos, acorda às 06:00, salva e perde a chance de loot daquela noite.
- A safe zone tem raio de **300 px**; o raio de interação da fogueira continua em **165 px**. Inimigos comuns não perseguem nem atacam dentro da safe zone.
- Os drops são resolvidos por tabela; excedentes que não cabem na mochila permanecem no chão em uma mochila recuperável.
- Save **v2**: `lendas-save-v2`. Um save antigo `brumavale-save-v2` (nome anterior do jogo) é carregado e copiado automaticamente; o antigo fica guardado como cópia de segurança. Saves v1 são migrados automaticamente, preservando inventário, jogador e acampamento; estruturas coletáveis, fazenda, estoque do mercado, equipamentos, armazém e a mochila de 12 slots também são preservados.
- Os placeholders dos sete inimigos são silhuetas simples em canvas: slime, lobo, javali, esqueleto, fantasma, aranha e lobisomem. Elites reutilizam a silhueta em 40×40 com borda dourada de 1 px.

### Testes da Fase 1

```bash
npm test
npm run build
npm run test:runtime:phase1
```

O smoke test runtime exige o Vite rodando em `http://127.0.0.1:5173/` e valida início diurno, aviso T-30, spawn noturno, sono, perda parcial e recuperação da mochila de morte. As tabelas resumidas de balanceamento ficam em `docs/fase-1-balanceamento.md`.

## Sistema 1 — estruturas de coleta

- **32 árvores**: 2–4 madeiras; renascem depois de 2 dias.
- **22 rochas**: 2–3 pedras; exigem picareta e renascem depois de 3 dias.
- **26 arbustos**: 1–2 ervas; renascem depois de 1 dia.
- **16 cogumelos**: 1–3 comidas; aparecem somente durante a noite e ficam indisponíveis até a noite seguinte.
- **8 baús**: cada um possui loot próprio e não renasce após ser aberto.
- Árvores, ervas, cogumelos e baús usam **E** ou o botão contextual sem ferramenta. Rochas e veios exigem picareta e executam uma animação de mineração antes de sumir.
- O estado de coleta e as datas de regeneração são gravados no save v2; saves antigos recebem um conjunto vazio e estruturas determinísticas.

O teste runtime específico é executado com:

```bash
npm run test:runtime:harvest
```

As regras detalhadas ficam em `docs/sistema-1-coleta.md`.

## Sistema 2 — menus dos quatro prédios

Cada prédio abre um painel **fullscreen**, com abas e botões de pelo menos 48 px, próprios para toque em smartphones.

### Fazenda (A)

- Começa com **4 canteiros**; o nível 2 amplia para 6 e o nível 3 para 8.
- Plantio: trigo em 60 s, abóbora em 90 s e erva em 45 s. Cada plantio usa uma semente.
- Colheita automática no nível 3: os produtos prontos vão diretamente para o armazém.
- Animais: galinha, ovelha e vaca produzem ovo, lã e leite a cada 120 s.

### Ferraria (F)

- Nível 1: Picareta de Pedra, Espada de Ferro, Armadura de Ferro, Machado e Picareta de Ferro.
- Nível 2: desbloqueia Espada de Aço e Peitoral de Aço.
- Nível 3: desbloqueia encantamentos simples de ataque e defesa.
- Atributos de equipamentos são recalculados e persistidos sem duplicação após recarregar.

### Casa / Armazém (B)

- Armazém separado da mochila, com transferência atômica de cada item.
- Descansar restaura a vida e, após 30 s reais, avança 30 minutos do relógio do jogo.
- Dormir pula para a manhã do próximo dia e salva.
- Os upgrades ampliam a capacidade do armazém.

### Mercado

- Sorteia **6 ofertas disponíveis por dia**.
- Todos os preços usam **moedas**: sementes 3, poção de vida 8, tocha 2 e pacotes entre 4 e 15 moedas.
- Qualquer recurso pode ser vendido por **1 moeda**.
- A carteira de moedas é separada dos 12 slots da mochila e permanece salva no navegador.

### Mineração e mina

- **18 veios de ferro** aparecem entre 600 e 1300 px do acampamento; cada um rende 2–4 ferro e renasce em 4 dias.
- Uma **mina única** contém 6–10 veios de ferro, 2–3 veios de carvão e uma ocorrência rara de ouro.
- Javais diurnos e lobisomens/esqueletos noturnos patrulham perto da mina.
- Sem picareta, a mensagem é **“Você precisa de uma picareta”**.
- A Picareta de Ferro minera mais rápido e rende uma unidade extra.

O teste runtime específico é executado com:

```bash
npm run test:runtime:system2
```

As regras detalhadas ficam em `docs/sistema-2-predios.md`.

## Sistema 3 — mochila pequena de verdade

- O HUD agora exibe uma grade visual de **12 slots**, cada um com ícone e quantidade.
- Cada tipo de recurso ocupa um slot; a capacidade total é de 144 unidades.
- Ao ocupar o 12º slot, aparece **“Mochila cheia! Volte ao acampamento”**.
- Ao entrar no acampamento, aparece o botão mobile **GUARDAR TUDO**, que esvazia a mochila no armazém da Casa/Armazém.
- O botão reaparece ao sair e voltar ao acampamento; a Casa/Armazém também oferece a mesma ação.
- Saves antigos com 6 ou 8 slots migram para 12 sem perder os recursos.

O teste runtime específico é executado com:

```bash
npm run test:runtime:system3
```

As regras detalhadas ficam em `docs/sistema-3-mochila.md`.

## Expansão atual — mapa, progressão, economia e chefe

### Mapa fullscreen

- **M** abre um mapa em tela cheia, com botão de fechar e `Esc` como alternativa.
- A neblina de exploração pertence ao mapa/minimapa; o cenário do mundo não recebe overlay de neblina.
- Marcadores: acampamento, estruturas de coleta descobertas, baús ainda fechada, inimigos fortes e posição atual do jogador.
- A localização das estruturas descobertas é persistida no save v2.

### Progressão do jogador

- Inimigos deixam cristais de XP: slime 10, lobo 20, javali 25, esqueleto 30, fantasma 35, aranha 40 e lobisomem 50.
- O HUD mostra nível, XP atual e limite do próximo nível.
- Cada nível concede **+10 de vida máxima** e exige uma escolha entre **+2 ataque** ou **+2 defesa**.
- O nível máximo é **20**; escolhas pendentes e progresso são preservados ao recarregar.

### Moedas e mercado

- Inimigos comuns deixam **1–3 moedas**; inimigos noturnos deixam **5–10 moedas**.
- As moedas caem no chão, são atraídas pelo jogador e ficam separadas da mochila.
- O HUD exibe o saldo e o mercado compra/vende usando esse saldo.
- O chefe deixa **50 moedas** ao ser derrotado.

### Chefe do bioma

- O **Titã do Bioma** é único, fica a mais de 800 px do acampamento e possui **500 de vida** e **30 de dano base**.
- Usa três padrões distintos: **investida telegrafada**, **impacto sísmico em área** e **salva de três projéteis**.
- Uma barra de vida própria aparece quando o jogador se aproxima.
- A derrota concede **Núcleo do Titã**, **50 moedas** e desbloqueia **Lâmina do Titã** na ferraria.

Os testes runtime dedicados são executados com:

```bash
npm run test:runtime:map
npm run test:runtime:progression
npm run test:runtime:economy
npm run test:runtime:boss
```

## Todos os testes

```bash
npm test                         # testes rápidos de regras (sem navegador)
npm run dev                      # deixe rodando em outro terminal para os testes abaixo
npm run test:runtime:touch       # controles de celular + teclado no computador
npm run test:runtime:gameplay    # esquiva, consumíveis, combo, talentos
npm run test:runtime:phase1      # e também: harvest, system2, system3, map, progression, economy, boss
```

Os testes de runtime abrem o Chrome escondido e salvam capturas de tela em `.tmp/capturas/` (pasta ignorada pelo git).

## Como expandir

### Adicionar biomas

Em `World.js`, use as coordenadas do mundo para selecionar o bioma e desenhar seus tiles e detalhes. Mantenha cada bioma em uma função ou módulo dedicado, com paleta e tabelas próprias de recursos/inimigos; ajuste `WORLD.width` e `WORLD.height` em `config.js` para ampliar o mapa. Use `revealAround` para manter a neblina ligada à exploração.

### Adicionar inimigos

Crie uma entrada em `ENEMY_TYPES` em `src/data/enemies.js` com vida, dano, velocidade, percepção, alcance, comportamento, drops e dados do placeholder. Adicione a espécie aos pools horários em `src/data/biomes.js`. Para o placeholder provisório, implemente a silhueta em `src/game/EnemyVisual.js`; a arte final da Fase 7 deve ser registrada em `assets-pendentes.md`. O `EnemyDirector` aplica automaticamente cap, spawn, despawn, elite, safe zone e multiplicadores noturnos.

### Adicionar construções

Inclua a construção em `BUILDINGS` em `Camp.js`, com posição e uma lista de custos (um custo por nível). Adicione um frame à atlas de construções e associe sua chave em `drawBuilding`; em `Camp.upgrade`, aplique o efeito da melhoria. O menu de `UI.js` é alimentado por `BUILDINGS`.

Para substituir os placeholders por arte final na Fase 7, crie os frames definitivos e registre seus assets em `src/game/assets.js`. Até lá, as silhuetas provisórias permanecem totalmente geradas em canvas por `src/game/EnemyVisual.js`.
