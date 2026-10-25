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

**Objetivo final:** levar os **7 prédios do acampamento ao nível 10**. Isso revela a localização da Masmorra do Dragão, o chefe final. A cada 10 dias o acampamento sofre um ataque.

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
- **ACAMP.**: aparece perto da fogueira e abre a visão geral dos 7 prédios (feche com **FECHAR**).
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
- **4**: poção de vigor ou armar uma armadilha no chão • **5**: elixir de força (+20% ATQ e DEF por 5 min)
- **Toque em um slot da mochila**: usa o item
- **E**: coletar recursos, árvores, ervas, cogumelos e baús próximos; minerar rochas e veios quando houver picareta; ou recuperar uma mochila de morte
- **Clique ou toque nos prédios**: abrir o painel fullscreen do prédio (inclusive Fogueira, Muralha e Torre)
- **Botão no canto inferior direito**: coletar, minerar, recuperar a mochila ou atacar
- **Botão Guardar Tudo no canto inferior esquerdo**: aparece ao entrar no acampamento e move a mochila para o armazém da casa
- **M**: abrir/fechar o mapa fullscreen do mundo
- **C**: abrir/fechar a visão geral dos 7 prédios (quando estiver perto)
- **F**: descansar junto à fogueira; à noite, dormir e pular a noite (exige Casa nível 2)
- **R**: dormir e pular a noite somente durante a noite (exige Casa nível 2)
- **Esc**: fechar o mapa ou o menu aberto

A cada nível o jogo pausa e o personagem escolhe **+15 de vida máxima**, **+3 de ataque** ou **+2 de defesa**. Nos níveis 5, 10, 15 e 20 também escolhe um **talento** entre três opções (Sede de Sangue, Pés Ligeiros, Golpe Brutal, Ritmo de Batalha, Vigor, Saqueador).

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
- `src/data/buildings.json` e `src/data/buildings.js`: custos, efeitos e textos dos 7 prédios × 10 níveis; pagamento com mochila + armazém + moedas.
- `src/game/Camp.js`: níveis, durabilidade, visual dos prédios, cercado, armazém por slots e baú secreto.
- `src/game/CampDefense.js`: Muralha (anel, HP, espinhos, fosso, portões) e Torres de Vigia (flechas, canhão).
- `src/game/RaidDirector.js` e `src/data/raids.js`: ataques a cada 10 dias, ondas, IA dos invasores, vitória e derrota.
- `src/game/FarmSystem.js`: canteiros, animais, celeiro, chuva, produção dobrada e auto-colheita.
- `src/game/EquipmentSystem.js`: melhor arma/armadura/escudo, durabilidade, reparo, desmontagem, melhorias, encantamentos e acessórios.
- `src/game/MarketSystem.js`: ofertas por nível, descontos, reputação, mercador viajante, encomendas e leilão.
- `src/game/BuffSystem.js`: buffs temporários (Bem Descansado, Calor da Fogueira, refeição, elixir, buff diário).
- `src/data/travelers.js`: viajantes da Fogueira (missões e itens). `src/data/weather.js`: dias de chuva.
- `src/game/BuildingMenu.js`: visão geral do acampamento e painéis fullscreen dos 7 prédios.
- `src/data/buildingSystems.js`: cultivos, animais, receitas do Ferreiro, encantamentos, acessórios e mina.
- `src/data/economy.json`: moedas por inimigo e baú, catálogo do mercado e preços de venda.
- `src/data/enemies.json`: atributos, drops e XP de cada inimigo (elite vale o dobro).
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

## Os 7 prédios do acampamento (níveis 1 a 10)

Fogueira, Fazenda, Ferreiro, Casa, Mercado, **Muralha** e **Torre de Vigia**. Custos, efeitos e textos de cada nível ficam em `src/data/buildings.json`. A tecla **C** (ou **ACAMP.** no celular) abre a visão geral, com nível, estado e custo de todos; cada prédio também abre o próprio painel ao ser tocado, com a aba **Níveis** mostrando o roteiro do 1 ao 10.

- **Custos** saem da mochila, depois do armazém da Casa e da carteira de moedas.
- Muralha e Torre começam **não construídas**: aparece uma placa no lugar; o nível 1 é a construção.
- Quando os 7 chegam ao nível 10: *"O acampamento está completo! O Dragão foi localizado. Prepare-se."* e a **Masmorra do Dragão** aparece no mundo, no minimapa e no mapa.

| Prédio | Destaques |
|---|---|
| Fogueira | raio de proteção cresce (170 → 340 px); cura 2/s (nível 2); cozinha poções (3); viajantes com missões a cada 4 dias (4); Calor da Fogueira (5); dano em inimigos dentro do fogo (6); ressurreição 1x por noite (7); resistência ao fogo 30% (8) e 60% (10) |
| Fazenda | 2 → 8 canteiros; galinhas, ovelha, vaca e porco; colheita 20% mais rápida (3); celeiro de 50 comidas (5); irrigação na chuva (6); ovos e leite automáticos (7); planta mágica (8); produção 2x (9); auto-colheita total e 5 comidas/min (10) |
| Ferreiro | receitas por nível (picareta básica até a Forja do Dragão); reparar e desmontar (4); encantamentos Fogo, Gelo (6) e Vampirismo (8); Arco Longo (7); melhorias +1 a +5 (8) |
| Casa | armazém de 20 → 120 slots e ilimitado no 10; dormir pula a noite (2); Bem Descansado (3); baú secreto (4); guarda tudo ao chegar (5); cozinheira (8); ressurreição automática 1x por dia (9); buff diário à escolha (10) |
| Mercado | 4 → 10 itens por dia e todos no 10; venda (2); descontos de 10% a 50%; mercador viajante (4 e 7); reputação (6); encomendas em 2 dias (8); leilão semanal de acessórios lendários (9) |
| Muralha | 200 → 20000 HP; madeira, pedra, ferro, aço e mítica; portões automáticos (2); espinhos (3 e 4); muralha dupla (5); gosmas e aranhas não escalam (6); fosso (7); campo elétrico (8); reparo automático em ataques (9); só o Dragão destrói (10) |
| Torre de Vigia | atira sozinha; 1 → 4 arqueiros; flechas de fogo (3), gelo (6), explosivas (8) e raios (9); radar no minimapa (4); segunda torre (5); canhão lendário (10) |

Prédios danificados num ataque produzem pela metade; destruídos param. O reparo custa **5 madeiras** (Muralha: 5 madeiras a cada 10% de HP). Armadilha (tecla 4), poção de vigor (4) e elixir (5) são os itens novos do Mercado e dos viajantes.

```bash
npm run test:runtime:buildings   # 7 prédios, torre atirando, nível 10 e masmorra
npm run test:runtime:system2     # menus dos prédios clicando nos botões (celular)
```

As regras detalhadas ficam em `docs/sistema-2-predios.md`.

## Ataques ao acampamento (dias 10, 20, 30...)

- No início do dia aparece **"ATAQUE IMINENTE! Prepare o acampamento!"**; o ataque começa **30 s** depois, em 3 ondas que surgem fora da muralha.
- Dia 10: 10 gosmas + 5 lobos. Dia 20: 15 esqueletos + 8 fantasmas + 3 lobisomens. Do dia 30 em diante o ataque cresce e ganha elites.
- Os invasores batem primeiro na muralha (fantasmas voam por cima); as torres atiram neles; quem passa ataca os prédios (**-10% por golpe**).
- Morrer no ataque: volta à fogueira com **30% de vida**, sem perder a mochila. Não dá para dormir durante o ataque.
- Vencer: **60 moedas por dezena de dias** e o **XP dos invasores em dobro**.
- Perder (todos os prédios destruídos): tela de fim de jogo com **Recomeçar do último save** (o save feito no início do ataque).

```bash
npm run test:runtime:raid
```

## Mineração e ferro

- **18 veios de ferro** entre 600 e 1300 px do acampamento: 2–4 ferro cada, renascem em 4 dias.
- A **mina** (ícone especial no minimapa e no mapa) tem 6–10 veios de ferro, 2–3 de carvão e 1 de ouro, com **guardas-mina** (elites) na entrada.
- Sem picareta: **"Você precisa de uma picareta para minerar isso."**
- Picareta básica (3 pedra, 2 madeira) no Ferreiro nível 1; Picareta de ferro (5 ferro, 1 carvão) no nível 5: **2x mais rápida e +1 por veio**.
- Ferro e carvão aparecem no HUD, ao lado das moedas, com ícones próprios (mochila + armazém).

```bash
npm run test:runtime:mining
```

## Sistema 3 — mochila pequena de verdade

- O HUD agora exibe uma grade visual de **12 slots**, cada um com ícone e quantidade.
- Cada tipo de recurso ocupa um slot; a capacidade total é de 144 unidades.
- Ao ocupar o 12º slot, aparece **“Mochila cheia! Volte ao acampamento”**.
- Ao entrar no acampamento, aparece o botão mobile **GUARDAR TUDO**, que esvazia a mochila no armazém da Casa (automático a partir da Casa nível 5).
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
- Marcadores: acampamento, mina, estruturas de coleta descobertas, baús ainda fechados, inimigos fortes, posição atual do jogador e a Masmorra do Dragão (quando revelada).
- A localização das estruturas descobertas é persistida no save v2.

### Progressão do jogador

- Inimigos deixam cristais de XP (valores em `src/data/enemies.json`): gosma 10, lobo 20, javali 25, esqueleto 30, aranha 30, fantasma 35 e lobisomem 50. **Elite vale o dobro.**
- A barra de XP fica logo abaixo da barra de vida; para subir é preciso **nível atual × 100** de XP.
- Ao subir, o jogo pausa e oferece **+15 vida máxima**, **+3 ataque** ou **+2 defesa**.
- O nível máximo é **20**; escolhas pendentes e progresso são preservados ao recarregar. Saves antigos mantêm os bônus que já tinham.

### Moedas e mercado

- Inimigos comuns deixam **1–3 moedas**, noturnos **3–8** e elites **10–20**; cada baú guarda **10–30 moedas** (valores em `src/data/economy.json`).
- As moedas caem no chão, são atraídas pelo jogador e ficam separadas da mochila.
- O HUD exibe o saldo; o Mercado compra com moedas e, a partir do nível 2, vende recursos pelos preços de `economy.json`.
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
npm run test:runtime:buildings   # e também: raid, mining
```

Os testes de runtime abrem o Chrome escondido e salvam capturas de tela em `.tmp/capturas/` (pasta ignorada pelo git).

## Como expandir

### Adicionar biomas

Em `World.js`, use as coordenadas do mundo para selecionar o bioma e desenhar seus tiles e detalhes. Mantenha cada bioma em uma função ou módulo dedicado, com paleta e tabelas próprias de recursos/inimigos; ajuste `WORLD.width` e `WORLD.height` em `config.js` para ampliar o mapa. Use `revealAround` para manter a neblina ligada à exploração.

### Adicionar inimigos

Crie uma entrada em `ENEMY_TYPES` em `src/data/enemies.js` com vida, dano, velocidade, percepção, alcance, comportamento, drops e dados do placeholder. Adicione a espécie aos pools horários em `src/data/biomes.js`. Para o placeholder provisório, implemente a silhueta em `src/game/EnemyVisual.js`; a arte final da Fase 7 deve ser registrada em `assets-pendentes.md`. O `EnemyDirector` aplica automaticamente cap, spawn, despawn, elite, safe zone e multiplicadores noturnos.

### Adicionar construções

Inclua a construção em `src/data/buildings.json` (nome, ícone, posição, custos por nível, textos e `stats` com 10 valores) e acrescente a chave em `order`. Para o visual, adicione um frame ao atlas e associe-o em `ATLAS_FRAMES` de `Camp.js`. A visão geral e a aba **Níveis** do painel são geradas a partir do JSON.

Para substituir os placeholders por arte final na Fase 7, crie os frames definitivos e registre seus assets em `src/game/assets.js`. Até lá, as silhuetas provisórias permanecem totalmente geradas em canvas por `src/game/EnemyVisual.js`.
