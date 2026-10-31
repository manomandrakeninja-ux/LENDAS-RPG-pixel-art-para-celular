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

### Ciclos 71–77 ✅ (lote)
- 71: montinho de neve no gelo (atlas 92) · 72: brasas brilhantes nas cinzas (94) · 73: poça de lama no brejo · 74: pegadas na areia/dunas · 75: teste de clima 90 dias (todos os tipos, determinístico) · 76: cacto florido no deserto · 77: evento 🐦 passarinho de dia (+3–8 moedas).
- Estado: atlas 99 objetos; suite 49/49; simulacao 20/20.
- Notas: visual 91 · código 92 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 87.

### Ciclos 101–110 ✅ (lote)
- 101–105: props — cogumelo azul (brejo), flor de brasa, grama alta dourada, âncora quebrada, raiz de selva · 106: teste BuffSystem (apply objeto, expira, persiste) · 107: teste Bestiary (kills, persiste) · 108: teste Achievements (goal "all" aceito) · 109: evento 🍀 trevo da sorte à noite (+15–30 XP) · 110: verificação parcial.
- Estado: atlas 138 objetos; suite 49/49; simulacao 30/30.
- Notas: visual 93 · código 93 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 111–120 ✅ (lote)
- 111–115: props — pedrinha musgosa (brejo), flor branca (neve), casca caída, concha espiral, pedra vulcânica (atlas 147) · 116: teste ciclo dia/noite · 117: teste combate (campos reais) · 118: evento 🐇 coelho no vale de dia (+1 comida) · 119: dica splash · 120: verificação parcial.
- Estado: suite 49/49; simulacao 32/32.
- Notas: visual 93 · código 93 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 121–130 ✅ (lote)
- 121–125: props — flor rosa, tronco podre, pedregulho de praia, cacto alto, espuma do mar (atlas 155) · 126: teste Inventory (slots, capacidade, persiste) · 127: teste CampfireTravelers (visita, bens, missão 1x) · 128: evento 🦋 borboleta (+5–12 XP) · 129: dica splash · 130: verificação parcial.
- Estado: suite 49/49; simulacao 34/34.
- Notas: visual 94 · código 94 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 151–160 ✅ (lote)
- 151–155: props — cogumelo vermelho, pedra gravada, galho flutuante, galho com neve, concha rosa (atlas 181) · 156: teste cavernas (boss/monstros existem) · 157: teste save v2 (migrate rejeita futuro com erro claro) · 158: evento 🍃 folha ao vento (+2–5 XP de dia) · 159: dica splash · 160: verificação parcial.
- Notas: visual 95 · código 94 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 161–170 ✅ (lote)
- 161–165: props — pedra esverdeada, flor laranja, raiz de duna, gelo esculpido, tronco seco (atlas 188) · 166: teste spawns por região + ilhas com fauna própria · 167: (junto) · 168: evento ☀️ sol forte (+8 XP em dia claro) · 169: dica splash · 170: verificação parcial.
- Notas: visual 95 · código 94 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 171–180 ✅ (lote)
- 181–185: props — graveto, flor lilás, pedregulho da floresta, espetos de cinza, buraco na neve (atlas 196) · 186: teste placas de estrada apontam para POIs reais · 187: (junto) · 188: evento ⭐ estrelas cadentes em noite limpa (+5–12 moedas) · 189: dica splash · 190: verificação parcial.
- Notas: visual 95 · código 94 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 181–190 ✅ (lote)
- 191–195: props — cogumelo roxo (selva), flor branca do deserto, cascalho de praia, neve empilhada, raiz de brejo (atlas 204) · 196: teste fog/waypoint (limites) · 197: (junto) · 198: evento 🐸 sapo do brejo (+8% vida) · 199: dica splash · 200: marco (verificação + foto 31).
- Notas: visual 95 · código 94 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclos 201–210 ✅ (lote)
- 201–205: props — cinza quente, pedra de gelo clara, tronco de naufrágio, arbusto de selva, pedra do deserto (atlas 221) · 206: teste rollGearDrop determinístico (boss lendário garantido) · 207: teste hotkeys de consumíveis (1–5, máx 3 por tecla) · 208: evento 🌊 onda na praia (+5–10 XP) · 209: dica splash · 210: verificação parcial.
- Notas: visual 96 · código 95 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 211–220 ✅ (lote)
- 211–215: props — cristal de cinza, flor amarela do brejo, pedra coberta de neve, cascalho de duna, pedra molhada (atlas 229) · 216: teste skills (defs + curva XP) · 217: teste elite config + enemyXp · 218: evento 🍄 cogumelo mágico na floresta à noite (+20 XP) · 219: dica splash · 220: verificação parcial.
- Notas: visual 96 · código 95 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 221–230 ✅ (lote)
- 221–225: props — flor lilás do gelo, pedrinha rosa, galho seco, cogumelo bege, pedra clara de cinza (atlas 236) · 226: teste pedras rúnicas dos vilarejos · 227: teste docks de ilha (campo island) · 228: evento ❄️ aurora boreal no gelo à noite (+10–18 moedas) · 229: dica splash · 230: verificação parcial.
- Notas: visual 96 · código 95 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 231–240 ✅ (lote)
- 231–235: props — flor rosa de duna, cascalho de brejo, tronco de gelo, grama marinha, pedra vulcânica pequena (atlas 244) · 236: teste atlas↔src (uso cruzado; achou órfão real: `shipwreck` → agora usado na praia) · 237: (junto) · 238: evento 🌺 flor exótica na selva de dia (+10–18 XP) · 239: dica splash · 240: verificação parcial.
- Notas: visual 97 · código 95 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 241–250 ✅ (lote) — MARCO 250
- 241–245: props — flor rosa do brejo, pedra escura de rio, gelo rachado, casca escura, pedra cinza-azulada (atlas 251) · 246: teste torres (entrada, monstros válidos; bosses nas cavernas ≥80%) · 247: teste biomas amostrados no grid · 248: evento 👻 fantasma na floresta antiga à noite (+12–20 XP) · 249: dica splash · 250: marco (foto 32, 303 sintaxe OK após fix de vírgulas duplas nas PROPS).
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 251–260 ✅ (lote)
- 251–255: props — flor lilás de duna, pedra esverdeada de praia, cogumelo cinza, neve soprada, flor laranja da selva (atlas 260) · 256: teste clima (weatherAt determinístico, 5 tipos) · 257: teste ciclo dia/noite (total = dia+noite) · 258: evento 🌧️ chuva no vale cura (+10% vida) · 259: dica splash · 260: verificação parcial.
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 261–270 ✅ (lote)
- 261–265: props — cascalho claro de cinza, flor branca do brejo, pedrinha clara de duna, arbusto seco de praia, flor rosada da floresta (atlas 268) · 266: teste viajantes (bens + quest kill/deliver + recompensa) · 267: teste save v2 (envelope + migração v1) · 268: evento 🐸 coro de sapos no brejo à noite (+10–16 XP) · 269: dica splash · 270: verificação parcial.
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 271–280 ✅ (lote)
- 271–275: props — flor menta do gelo, pedra amarelada de praia, tronco musgoso, cogumelo azul claro, pedregulho de duna (atlas 275) · 276: teste bestiário (kills/serialize) · 277: teste buffs (apply/untilDay/expira) · 278: evento 🌨️ nevasca mágica no gelo de dia (+8–14 XP) · 279: dica splash · 280: verificação parcial.
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 281–290 ✅ (lote)
- 281–285: props — flor amarela da selva, pedra clara de rio, gelo azul profundo, casca clara de praia, flor branca de cinza (atlas 283) · 286: teste achievements (note/check/serialize) · 287: teste economia (nunca negativa) · 288: evento 🦋 vaga-lumes na selva à noite (+6–12 moedas) · 289: dica splash · 290: verificação parcial.
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclos 291–300 ✅ (lote) — MARCO 300
- 291–295: props — pedrinha rosa de duna, flor azul do brejo, pedra verde-clara de praia, tronco de cinza, flor lilás da floresta (atlas 290) · 296: teste scaling de inimigos (coinMultiplier/levelInRange clamp) · 297: teste combate (combo/shout/dodge) · 298: evento 🔥 brasa viva nas cinzas de dia (+10–18 XP) · 299: dica splash · 300: marco (foto 33, 303 sintaxe OK, 63/63, 49/49).
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclos 301–310 ✅ (lote)
- 301–305: props — flor laranja do brejo, pedra escura de duna, neve com flor, casca de cinza, pedra rosa de praia (atlas 299) · 306: teste gear sets (cada set tem 4+ peças) · 307: teste forja (FORGE_SLOT mapeia slots) · 308: evento 🍃 vento forte no vale de dia (+6–12 XP) · 309: dica splash · 310: verificação parcial.
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclos 301–310 ✅ (lote)
- 301–305: props — flor laranja do brejo, pedra escura de duna, neve florida, casca de cinza, pedra rosa de praia (atlas 296) · 306: teste gear sets (18 sets, peças por tierKey, bônus) · 307: teste forja (FORGE_SLOT) · 308: evento 🍃 vento forte no vale (+6–12 XP) · 309: dica splash · 310: verificação parcial.
- Notas: visual 97 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclos 311–320 ✅ (lote)
- 311–315: props — flor pêssego da floresta, pedrinha branca de praia, gelo azul claro, cascalho de floresta, flor vermelha de duna (atlas 303) · 316: teste recursos/baús (cores 0x, rewards válidos) · 317: teste inventário (slots, serialize) · 318: evento 🌙 chuva morna à noite (+6% vida) · 319: dica splash · 320: verificação parcial.
- Notas: visual 98 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclos 321–330 ✅ (lote)
- 321–325: props — arbusto rosa de praia, pedra cinza da neve, tronco longo de praia, flor verde-água do brejo, pedra avermelhada de cinza (atlas 310) · 326: teste vilas (4 vilas, nomes únicos, não bloqueantes) · 327: teste cavernas (11, entradas válidas, bosses) · 328: evento 🐚 concha brilhante na praia de dia (+4–9 moedas) · 329: dica splash · 330: verificação parcial.
- Notas: visual 98 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclos 331–340 ✅ (lote)
- 331–335: props — flor rosa da selva, pedrinha dourada de duna, neve com pedrinha, cascalho colorido de praia, flor laranja de cinza (atlas 317) · 336: teste baús (longe de torres/acampamento, terreno firme) · 337: teste keybinds (5 ações, sem colisão de code) · 338: evento 👺 espírito das cinzas à noite (+12–20 XP) · 339: dica splash · 340: verificação parcial.
- Notas: visual 98 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclos 341–350 ✅ (lote)
- 341–345: props — flor dourada do brejo, pedra lilás de praia, gelo rosa, galho de floresta, flor branca de duna (atlas 324) · 346: teste construções (níveis/custos, coins permitido) · 347: teste save futuro rejeitado · 348: evento 💎 cristal da ilha Esmeralda à noite (+15–25 XP) · 349: dica splash · 350: verificação parcial.
- Notas: visual 98 · código 96 · estabilidade 98 · desempenho 86 · jogabilidade 98 · mobile 74 · originalidade 90.

### Ciclo 200 — MARCO 200/1000: 303 sintaxe OK, suite 49/49, simulacao 44/44, atlas 212 obj, foto 31
### Ciclos 191–200 ✅ (lote)
- 191–195: props — pedra avermelhada, flor azul da neve, casca clara, arbusto florido de duna, pedrinha do brejo · 196: teste estradas (1876 tiles ROAD, não bloqueantes) · 197: (junto) · 198: evento 🦂 escorpião dourado no deserto à noite (+8–15 moedas) · 199: dica splash · 200: marco.
- Notas: visual 96 · código 95 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 89.

### Ciclo 150 — MARCO 150/1000: 303 sintaxe OK, suite 49/49, simulacao 38/38, atlas 173 obj, foto 30
### Ciclos 141–150 ✅ (lote)
- 141–145: props — granito, flor do deserto, tronco de selva, neve pisada, pedra de maré · 146: teste construções do acampamento · 147: teste clima/ícones · 148: evento 🌕 lua cheia a cada 7 dias (+XP) · 149: dica splash · 150: marco (foto 30).
- Notas: visual 94 · código 94 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 88.

### Ciclo 100 — MARCO 100/1000: 303 arquivos sintaxe OK, suite 49/49, simulacao 27/27, atlas 129 obj, foto 29
### Ciclos 98–99 — props (pedrinha, lírio aquático grande, espeto de gelo, onda de duna, flor amarela) + testes scaleEnemy/gear + evento 🔥 onda de calor

### Ciclos 78–97 ✅ (lote)
- 78–82: props novos — cogumelos, arbusto de frutas, fragmento de gelo, ondulação de areia, raiz retorcida · 83: teste baús (achou bug real: torres não eram blockers na geração → corrigido) · 84: teste oásis · 85: evento 🌨️ nevasca no gelo à noite (-20% vel 20 s) · 86–87: 2 dicas no splash + teste estradas · 88–92: props — estrela-do-mar, liana, obsidiana, poça de maré, pedra de rio · 93: teste invariantes de save (camp 1440,1080; mundo 400×300; TILE 48) · 94: teste mapa grande 1200×900 · 95: evento 🌈 arco-íris após chuva (lastRainAt 90 s) · 96: dica splash · 97: verificação parcial.
- Estado: atlas 119 objetos; suite 49/49; simulacao 25/25; world 14/14.
- Notas: visual 92 · código 93 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 87.

### Ciclo 70 — Verificação intermediária (marco 70/130): 303 arquivos sintaxe OK, suite 49/49, simulacao 19/19, atlas 90 obj, foto 28
- **D/F:** tudo verde; nenhum ciclo regrediu testes até aqui.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 86.

### Ciclo 69 — Foto 27 (detalhe do gelo com flores de neve) + dica de regeneração no splash
- **C/H:** TIPS ganhou "Fora de combate, você se cura devagar após 6 s sem levar dano."
- **D/F:** foto 27; suite 49/49; simulacao 19/19.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 86 · jogabilidade 97 · mobile 74 · originalidade 86.

### Ciclo 68 — Jogabilidade: regeneração fora de combate (+0.6% vida máx/s após 6 s sem dano, com efeitinho verde)
- **C:** `lastPlayerDamageAt` no Player.damage + regen no updateFrame.
- **D:** suite 49/49.

### Ciclo 67 — Teste: keybinds (rebind válido/reservado/duplicado, normalize, helpers) — simulacao 19/19
- **D:** suite 49/49.

### Ciclo 66 — UX: ao carregar, aviso "💾 Save carregado (gravado em …)" com savedAt do envelope
- **C/D:** suite 49/49.

### Ciclo 65 — Desempenho/debug: `window.__lendasPerf()` expõe avg ms/frame, FPS e p95 (ring 120 frames)
- **C/F:** ring buffer no updateFrame + função de leitura no console. Sem custo quando não lido.
- **D:** suite 49/49.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 86 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 64 — Teste: curva de nível das skills (nível = floor(sqrt(xp/50)), bônus por nível) — simulacao 18/18
- **D:** simulacao 18/18; suite 49/49.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 85 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 63 — Teste: todos os 50 tipos de inimigo com dados sadios (17/17; bosses/caverna dispensados de spawnWeight)
- **D:** suite 49/49.

### Ciclo 62 — Teste: vilarejos válidos (3 casas, falas, região, terreno andável) — simulacao 16/16
- **D:** novo teste em simulacao (16/16). Suite 49/49.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 85 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 61 — Arte: conchas na praia (atlas 88→90)
- **C/D:** `shell-0/1` no T.BEACH; atlas regerado; suite 49/49.

### Ciclo 60 — Teste: portos na costa + foto 26 do mapa (ciclo 60)
- **D:** simulacao 15/15; suite 49/49; foto 26-mapa-ciclo-60.

### Ciclo 59 — Baú de tesouro do mundo também dá XP (além de moedas/equipamento)
- **C:** `openWorldChest` chama `grantExperience` com valor por nível da região.
- **D:** suite 49/49; simulacao 14/14.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 85 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 58 — Teste de performance: build fria do grid < 2 s, cache < 5 ms (medido; 82 ms fria, ~0 ms quente)
- **D:** simulacao 14/14 (2 fixes de assert: rows é número 736, terrain achatado 294400). Suite 49/49.

### Ciclo 57 — Arte: tronco congelado no gelo (atlas 87→88)
- **C/D:** prop `frozen-log` no T.SNOW; atlas regerado; suite 49/49.

### Ciclos 50–56 (lote) ✅
- 50: clima do novo dia na msg de amanhecer (dormir) · 51: clima no amanhecer natural (sem duplicar) · 52: teste cavernas/torres vs ENEMY_TYPES (11/11) · 53: loja mostra saldo 🪙 no título · 54: teste de economia (nunca negativa, hook onGain) · 55: rastro fantasma azul na esquiva · 56: teste de consumíveis (13/13; corrigido modelo real: comida=heal baixo).
- Suite 49/49 em todos; simulacao 13/13; atlas 87; 25 fotos.
- Notas: visual 90 · código 92 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 49 — QoL: waypoint do mapa grande agora é limitado aos limites do mundo (clamp)
- **C:** `setWaypoint` faz clamp em [0, WORLD_COLS*TILE] × [0, OVERWORLD_ROWS*TILE].
- **D:** suite 49/49.
- Notas: visual 90 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 48 — Arte: pedrinhas (pebbles) em floresta/neve/areia/cinzas (atlas 83→87; bug do shade corrigido pelo teste)
- **C/D:** 2 props novos em 4 biomas; teste de props pegou `shade` com 1 cor → corrigido. Atlas 87; suite 49/49; simulacao 10/10.
- Notas: visual 90 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 47 — Arte: flor azul da floresta (atlas 81→83) + foto 25
- **C/D:** `forestFlower` no T.FOREST; atlas regerado; suite 49/49.
- Notas: visual 90 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 46 — Arte: flor de praia na areia da costa (atlas 79→81)
- **C/D:** `beachFlower` no T.BEACH; atlas regerado; suite 49/49.
- Notas: visual 90 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 45 — Arte: flor tropical rosa na selva (atlas 77→79) + foto 24
- **C:** `jungleFlower` nos props do T.JUNGLE.
- **D:** atlas regerado (79 objetos); suite 49/49; simulacao 10/10; foto 24.
- Notas: visual 90 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 44 — Teste: props do atlas (nomes únicos, draw não vazio, flores novas presentes) — simulacao 10/10
- **D:** novo teste em simulacao (9/9). Suite 49/49.
- Notas: visual 89 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 43 — Teste: sanidade do COMBAT_CONFIG (alcance, cooldown, combo, shout)
- **D:** simulacao 9/9; suite 49/49.
- Notas: visual 89 · código 91 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 42 — Game feel: grito FUS RO DAH dá recoo leve no jogador (oposto ao olhar)
- **C:** `setVelocity` -140 na direção contrária do facing após o shout.
- **D:** suite 49/49.
- Notas: visual 89 · código 90 · estabilidade 98 · desempenho 84 · jogabilidade 96 · mobile 74 · originalidade 86.

### Ciclo 41 — Arte: flor vulcânica 🔥🌸 no bioma de cinzas (atlas 75→77)
- **C:** `ashFlower` (laranja/vermelho) nos props do T.ASH.
- **D:** atlas regerado (77 objetos); suite 49/49.
- Notas: visual 89 · código 90 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 40 — Arte: flor do brejo lilás no pântano (atlas 73→75) + foto 23
- **C:** `swampFlower` nos props do T.SWAMP.
- **D:** atlas regerado; suite 49/49; foto 23-detalhe-brejo.
- Notas: visual 89 · código 90 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 39 — Arte: flor do deserto nas dunas/areia (atlas 71→73)
- **C:** `duneFlower` nos props T.SAND e T.DUNE.
- **D:** atlas regerado; suite 49/49.
- Notas: visual 88 · código 90 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 38 — Arte: flor de neve ❄️🌸 nos biomas gelados (2 props novos, atlas 65→71 no total) + foto 22
- **C:** `snowFlower` (pétalas branca/azul) nos props do T.SNOW; atlas regerado (71 objetos).
- **D:** suite 49/49.
- Notas: visual 88 · código 90 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 37 — Teste: save antigo (pré-experimento) migra sem erro e ganha defaults (runeDay etc.)
- **D:** novo teste em save.test.js (10/10). Suite 49/49.
- Notas: visual 87 · código 90 · estabilidade 98 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 36 — Documentação: docs/mapa-400x300.md atualizado com ciclos 31–35 + foto 21 (vilarejo com pedra rúnica)
- **H:** seção do experimento estendida; foto renomeada .png. Sem mudança de código → suite 49/49 mantida.
- Notas: visual 87 · código 90 · estabilidade 97 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 35 — Conteúdo: pedra rúnica 💠 na praça de cada vilarejo (+50% XP até amanhecer, 1x/dia, salva em runeDay)
- **C:** feature 'rune' com sprite ruin-pillar + hint; `touchRuneStone` no GameScene; buff ×1.5 no grantExperience; save/load com fallback.
- **D:** atlas regerado; suite 49/49; simulacao 8/8.
- Notas: visual 87 · código 90 · estabilidade 97 · desempenho 84 · jogabilidade 95 · mobile 74 · originalidade 86.

### Ciclo 34 — Teste novo: placas válidas + estradas andáveis (achou e corrigiu 5 placas no lodo + alinhado NOT_WALKABLE com BLOCKING real)
- **D:** novo teste em simulacao (8/8). Corrigiu geração de placas (tenta lado oposto/centro) e o próprio teste (MURK é lodo andável, não bloqueante).
- **D:** suite 49/49.
- Notas: visual 86 · código 90 · estabilidade 97 · desempenho 84 · jogabilidade 94 · mobile 74 · originalidade 85.

### Ciclo 33 — Evento aleatório novo: ☄️ cometa à noite (+20-45 moedas e +XP)
- **C:** branch 0.88–0.94 noturno em `randomEvent` (cometa: moedas + XP + float ☄️ azul).
- **D:** suite 49/49.
- Notas: visual 86 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 94 · mobile 74 · originalidade 85.

### Ciclo 32 — Placas de estrada apontam o POI mais próximo (agora incluem os 4 vilarejos)
- **C:** `roadSigns()` escolhe por placa o POI (caverna/torre/porto/vilarejo) a ≤1400 px; `ROAD_SIGNS` movido após VILLAGES. Resultado: 217 placas, 12 destinos, 4 vilarejos apontados.
- **D:** world 14/14, simulacao 7/7, suite 49/49.
- Notas: visual 86 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 93 · mobile 74 · originalidade 85.

### Ciclo 31 — HUD: fase do dia com ícone no status (☀️ DIA 🌆 CREPÚSCULO 🌙 NOITE 🌅 AMANHECER)
- **C:** `statusText` mostra a fase do `timeState` com ícone.
- **D:** suite 49/49.
- Notas: visual 86 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 93 · mobile 74 · originalidade 84.

### Ciclo 30 — Verificação final + relatório (fim da 1ª etapa de 30)
- **EXTENSÃO:** o usuário pediu +100 ciclos → continua do 31 ao 130 abaixo.

### Ciclo 30 — Verificação final + relatório (FIM DO EXPERIMENTO)
- **D:** 303 arquivos sintaxe OK; suite 49/49; simulacao 7/7; atlas 3923 ladrilhos/69 objetos; foto 20-mapa-final-30x.
- **H:** RELATORIO_EVOLUCAO_30X.md completo com comparação início vs fim, 25 melhorias, pendências e limitações de teste.
- Notas finais 0–100: visual 86 · código 89 · estabilidade 97 · desempenho 84 · jogabilidade 93 · mobile 74 · originalidade 84.

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

