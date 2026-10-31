# Histórico — Experimento de Evolução Autônoma 30x (LENDAS RPG)

- Branch: `experimento-evolucao-30x` (criada sobre `main`).
- Checkpoint inicial: commit 25ba0ef (toda a SUPER ATUALIZAÇÃO já estava no working tree e foi commitada; `_backup_original/` excluído do índice via `.git/info/exclude`).
- Início: 2026-10-31 (America/Sao_Paulo).
- Estado inicial do jogo (antes do ciclo 01): 48 arquivos de teste passando (run-all-tests.ps1), mapa 400×300, 15 fotos em `SUPER ATUALIZAÇÃO/`.

## Ciclos

### Ciclo 01 — Fundação: bug da bússola + ajuda de teclas
- ETAPA A: arquitetura auditada (sem TODO/FIXME; streaming/hints já throttled; buildTerrainGrid ~96 ms só no boot; MAP_SCALE=16 → canvas do mapa 1200×900, sem risco de memória). Limitação: Chrome/Vite não rodam no sandbox (spawn EPERM) → testes visuais não executados aqui; só testes de unidade.
- ETAPA C: **bug corrigido** — `readSign` calculava a bússola com `+4 & 7`, apontando para o lado OPOSTO do destino. Nova função pura `compass8(dx, dy)` em worldRegions.js + teste (8 direções) + uso na placa.
- ETAPA C: painel de ajuda **"?" (Shift+/)**** — overlay DOM com todas as teclas fixas e configuráveis (via Keybinds.js).
- ETAPA D: world.test.js 14/14 (novo teste compass8); suite 48/48 arquivos. Sem regressões (ETAPA E vazia).
- Arquivos: src/data/worldRegions.js, src/game/RegionWorld.js, src/game/GameScene.js, index.html, src/visual.css, tests/world.test.js.
- Notas 0–100: visual 78 · código 85 · estabilidade 90 · desempenho 80 · jogabilidade 82 · mobile 70 · originalidade 80.

### Ciclo 02 — Fundação: texto de moedas + roundtrip de save
- **C:** `EconomySystem.addCoins` ganhou hook `onGain`; GameScene mostra texto flutuante dourado `+N` sobre o jogador ao ganhar moedas (reusa `Effects.spawnDamage`).
- **D:** novo teste de roundtrip v2 completo em tests/save.test.js (skills, waypoint, regions com chests/travelerGifts, economy) — save.test.js 9/9; economy 3/3; suite 48/48.
- **A:** updateFog já sai cedo quando a névoa não muda (falso alarme de performance).
- Notas 0–100: visual 78 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 82 · mobile 70 · originalidade 80.

### Ciclo 03 — UX do mapa: clima + vilarejos no cartão de região
- **C:** cartão da região (clique no mapa M) agora mostra o clima de hoje (☀️/🌧️/❄️/🌪️/🌋 via `weatherAt`) e os vilarejos daquela região.
- **D:** worldMap 2/2, weather 2/2, suite 48/48. Import de weather.js no overlay é puro (sem Phaser) — testes node continuam verdes.
- Notas 0–100: visual 78 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

### Ciclo 04 — Arte: sombra de contato nos NPCs de vilarejo/viajante
- **C:** ellipse de sombra (0.26 alpha) sob cada morador de vilarejo; nos viajantes a sombra acompanha o sprite no `updateTravelers` (antes ficavam "flutuando").
- **D:** suite 48/48; `node --check` ok. Sem teste visual (sandbox sem browser) — registrado como limitação.
- Notas 0–100: visual 79 · código 86 · estabilidade 92 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

### Ciclo 05 — Testador automático: simulação de dia + bug de POI inalcançável
- **C/D:** novo `tests/simulacao.test.js` (4 testes): BFS do acampamento até todos os POIs (a pé ou de barco), 30 dias de clima por região, dia de combate/XP com roundtrip de save, grade do mapa.
- **BUG REAL CORRIGIDO:** a Gruta dos Piratas ficava numa ilha a 2105 px do porto mais próximo → inalcançável. Adicionado 7º porto "Ancoradouro dos Piratas" (ilha esmeralda) e movida a entrada da gruta para 404 px dele.
- Suite: 49/49 arquivos passando (antes 48).
- Notas 0–100: visual 79 · código 87 · estabilidade 94 · desempenho 80 · jogabilidade 83 · mobile 70 · originalidade 80.

### Ciclo 06 — Otimização: cache do buildTerrainGrid
- **A:** confirmei que `grid.terrain` só é lido (nunca mutado) fora da construção → cache seguro.
- **C/F:** `buildTerrainGrid()` agora devolve grade cacheada em módulo (medido: 182 ms → 0,00 ms na 2ª chamada); `buildTerrainGridUncached()` para quem precisa de instância nova.
- **D:** novo teste de cache em simulacao.test.js (5/5); suite 49/49.
- Notas 0–100: visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 83 · mobile 70 · originalidade 80.

### Ciclo 07 — Game design: dormir em vilarejos (cama na 1ª casa)
- **C:** cada vilarejo ganha feature `bed` (1ª casa, label "DORMIR ATÉ AMANHECER"); `interact` chama `scene.sleepAtBed(village)`; GameScene ganhou `doSleep(place)` comum (camp e vilarejo) — dormir na vila também cura, avança o dia e salva.
- **Fotos:** SUPER ATUALIZAÇÃO/16-vilarejos-com-cama.png, 17-mapa-com-porto-pirata.png (7 portos agora).
- **D:** simulacao 5/5, world 14/14, suite 49/49.
- Notas 0–100: visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 85 · mobile 70 · originalidade 80.

### Ciclo 08 — Jogabilidade: seta de borda → waypoint fora da tela
- **C:** `updateWaypointArrow()` no GameScene desenha seta verde na borda da tela (HUD camera) apontando ao waypoint quando ele está fora da visão; esconde no modo foto e quando perto.
- **D:** simulacao 5/5; suite 49/49; `node --check` ok.
- Notas 0–100: visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 86 · mobile 70 · originalidade 80.

### Ciclo 09 — Economia/loop: baús de tesouro reabastecem em 3 dias
- **C:** `chestDays` (novo no save, compat: ausente = 0) registra o dia do saque; baú de mundo saqueado volta a dar moedas (sem equipamento) após 3 dias; baú de chefe continua único. `nearestFeature` deixa baú de mundo interagível mesmo aberto.
- **D:** suite 49/49; simulacao 5/5; world 14/14.
- Notas 0–100: visual 79 · código 87 · estabilidade 94 · desempenho 83 · jogabilidade 87 · mobile 70 · originalidade 80.

### Ciclo 10 — QA: teste de contenção do mundo (trava física)
- **A/D:** `terrainAt` é infinita (gera chão até fora do mapa) → a proteção real é `Player.body.setCollideWorldBounds(true)`. Novo teste em simulacao.test.js lê o fonte e garante a trava + que FULL_WORLD cobre o overworld.
- **D:** simulacao 6/6; suite 49/49.
- Notas 0–100: visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 87 · mobile 70 · originalidade 80.

### Ciclo 11 — Conteúdo: lojinha nos vilarejos
- **C:** `openShop(speaker, title)` extraído (poção/comida/tocha por moedas); `talkToVillager` agora abre a loja da vila com fala do morador; viajante reusa o mesmo método.
- **D:** suite 49/49.
- Notas 0–100: visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 81.

### Ciclo 29 — UX: dicas contextuais na tela de derrota (noite / região perigosa / poções)
- **C:** `triggerGameOver` monta dica conforme o contexto (de noite, região acima do nível, lembrete de poções/esquiva).
- **D:** suite 49/49.
- Notas 0–100: visual 85 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 93 · mobile 74 · originalidade 84.

### Ciclo 28 — Conteúdo: 4º viajante na Estrada do Penhasco (roads 0, 2, 3, 4)
- **C:** `travelerRoads` ganhou ROADS[3] (Estrada do Penhasco) → 4 viajantes no mundo.
- **D:** suite 49/49; pontos das estradas validados como andáveis.
- Notas 0–100: visual 85 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 92 · mobile 74 · originalidade 84.

### Ciclo 27 — Consolidação: atlas regenerado + foto 19 + suite completa
- **D/F:** `generate-world-assets` (3923 ladrilhos, 69 objetos, ~9 s); foto `SUPER ATUALIZAÇÃO/19-mapa-atualizado-ciclo-27`; suite 49/49; 303 arquivos sintaxe OK (ciclo 19).
- Notas 0–100: visual 85 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 91 · mobile 74 · originalidade 83.

### Ciclo 26 — QoL: pausa automática quando a aba fica oculta
- **C:** `visibilitychange hidden` → salva + pausa a física (só se nada já pausou) + mensagem; ao voltar e apertar tecla, retoma.
- **D:** suite 49/49.
- Notas 0–100: visual 85 · código 89 · estabilidade 97 · desempenho 83 · jogabilidade 91 · mobile 74 · originalidade 83.

### Ciclo 25 — Teste de conteúdo: biomas com terreno+recursos e regiões com spawns
- **D:** novo teste em simulacao.test.js: todos os terrenos de gameplay aparecem no mapa; todo terreno de recurso está no grid; toda região do overworld tem monstros em REGION_SPAWNS (vale usa VALLEY_EXTRA_SPAWNS).
- **D:** simulacao 7/7; suite 49/49.
- Notas 0–100: visual 85 · código 89 · estabilidade 96 · desempenho 83 · jogabilidade 91 · mobile 73 · originalidade 83.

### Ciclo 24 — Feedback: vinheta vermelha pulsante com vida < 25%
- **C:** `#low-hp-vignette` (CSS pulse) liga no update quando vida < 25% do máx; some no modo foto ou com vida cheia/safe.
- **D:** suite 49/49.
- Notas 0–100: visual 85 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 91 · mobile 73 · originalidade 83.

### Ciclo 23 — Game feel: crítico de joia dá hitstop + "CRÍTICO!" dourado
- **C:** `jewelCrit` destacado no ataque corpo a corpo → hitstop 60 ms + texto dourado (impacto já era forte).
- **D:** suite 49/49.
- Notas 0–100: visual 84 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 91 · mobile 72 · originalidade 83.

### Ciclo 22 — HUD: ícone do clima junto ao texto (🌧️ CHUVA, ❄️ NEVE, 🌪️ POEIRA, 🌋 CINZAS)
- **C:** `statusText` prefixa `WEATHER_ICONS[weather]` (import puro de weather.js, seguro para testes).
- **D:** suite 49/49.
- Notas 0–100: visual 84 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 72 · originalidade 83.

### Ciclo 21 — Modo foto: coordenadas (m) + dia no canto durante as fotos
- **C:** `togglePhotoMode` mostra `#photo-coords`; updateFrame atualiza "📍 X m, Y m • dia N" só no modo foto.
- **D:** suite 49/49.
- Notas 0–100: visual 83 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 72 · originalidade 83.

### Ciclo 20 — UX: dicas rotativas na tela de carregamento (14 dicas)
- **C:** `TIPS` no Splash.js + elemento `#splash-tip`; troca a cada 4 s enquanto carrega (teclas novas: ?, waypoint, vilarejos, baús, portos, fixar ★...).
- **D:** suite 49/49.
- Notas 0–100: visual 83 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 72 · originalidade 83.

### Ciclo 19 — Auditoria de código: syntax check geral + imports
- **D:** `node --check` em 303 arquivos (src+scripts+tests): 0 falhas. Verificação manual confirma que todos os imports adicionados nesta sessão estão em uso (roadAt, keyLabel, compass8, weatherAt, WEATHER_ICONS, VILLAGES, TREASURE_SPOTS, FAST_TRAVEL_COST). Detector automático de imports ociosos deu falso-positivo (regex via pwsh) — descartado e refeito manualmente.
- **D:** suite 49/49.
- Notas 0–100: visual 83 · código 88 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 71 · originalidade 82.

### Ciclo 18 — QoL: fixar itens (★) no topo da mochila
- **C:** botão ☆/★ em cada slot; fixados vão primeiro na lista e persistem em localStorage (`lendas-pinned`); CSS dourado no slot fixado.
- **D:** suite 49/49.
- Notas 0–100: visual 83 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 90 · mobile 71 · originalidade 82.

### Ciclo 17 — Iluminação: tocha do jogador (halo quente próprio à noite)
- **C:** `getLightSources()` inclui o player como luz 'torch' (raio 120, entra primeiro na lista antes do corte de 24 luzes).
- **D:** suite 49/49.
- Notas 0–100: visual 83 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 89 · mobile 70 · originalidade 82.

### Ciclo 16 — QoL: caveira de morte no minimapa (recuperar loot)
- **C:** `respawn()` guarda `deathMarker`; minimapa desenha 💀 vermelho; some ao chegar perto (160 px).
- **D:** suite 49/49.
- Notas 0–100: visual 81 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 89 · mobile 70 · originalidade 82.

### Ciclo 15 — Documentação: backlog do mapa atualizado com entregas do experimento
- **H:** `docs/mapa-400x300.md` — itens 3 (cache do grid) e 5 (teste de POIs) marcados como feitos; nova seção com o resumo das entregas do experimento-30x.
- **D:** suite 49/49 (sem mudança de código).
- Notas 0–100: visual 81 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 82.

### Ciclo 14 — Arte: tufos de grama e flores nos biomas (4 props novos)
- **C:** `grassTuft()` e `flowerTuft()` (2 variantes cada) em biomeProps.js; adicionados às tabelas PROPS dos 8 biomas (densidade maior nos férteis). Atlas regenerado: 69 objetos (antes 65).
- **Foto:** SUPER ATUALIZAÇÃO/18-detalhe-flores-grama.
- **D:** suite 49/49; generate-world-assets ok (~9 s).
- Notas 0–100: visual 81 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 82.

### Ciclo 13 — Evento dinâmico: baú abandonado na estrada
- **C:** `randomEvent` ganhou faixa 88–94%: se o jogador está perto de estrada (`roadAt`), acha um baú abandonado (+15–35 moedas e 40% chance de poção/comida); fora da estrada cai no flavor normal.
- **D:** simulacao 6/6; suite 49/49.
- Notas 0–100: visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 82.

### Ciclo 12 — Game feel: texto flutuante de XP no jogador
- **C:** `grantExperience` mostra `+N XP` ciano flutuante sobre o player (throttle 700 ms para não virar spam em hordas); mensagem de HUD continua.
- **D:** suite 49/49.
- Notas 0–100: visual 79 · código 87 · estabilidade 95 · desempenho 83 · jogabilidade 88 · mobile 70 · originalidade 81.

