# Compatibilidade gráfica e preservação — LENDAS

> Auditoria inicial pré-integração. Para os testes posteriores em runtime das três artes aprovadas, consulte [integração aprovada](./integracao-aprovada.md).

Data: 2026-11-01. Auditoria dos originais em leitura, complementa [auditoria gráfica](./auditoria-grafica.md). Nenhuma alteração no código, assets, dependências, saves ou configuração do jogo. O novo laboratório tem servidor separado e arquivos exclusivamente em art-review; os resultados do painel estão no [histórico](./historico-alteracoes.md). Sem build do jogo, commit ou push. Links são relativos a este relatório; `#Lnn` informa linha do fonte consultado.

## Versão efetiva e dependências

[package.json](../../package.json) declara Phaser `^3.90.0`. [package-lock.json, L1302](../../package-lock.json#L1302) fixa **3.90.0**, também encontrado no pacote instalado. LockfileVersion=3. Vite no lock: 6.4.5; pngjs: 7.0.0. Não houve instalação nem atualização.

O runtime usa Phaser, fontes locais empacotadas e DOM/CSS. Geração de arte também depende de Node, pngjs e @napi-rs/canvas; preservar lock e fontes dos pintores para reproduzir assets. A presença dessas dependências não significa que seus geradores tenham sido executados nesta auditoria.

## Matriz de compatibilidade

| Área | Evidência estática | Situação / exigência para alteração |
|---|---|---|
| WebGL / Canvas | [main.js, L33](../../src/main.js#L33) usa AUTO | Seleção real do renderer **não testada**. Comparar tint, alpha, ADD e CanvasTexture nos dois caminhos; AUTO não comprova equivalência visual. |
| Limite de textura | Terreno 1536×5904 carregado em [GameScene.js, L109](../../src/game/GameScene.js#L109) | Não cabe em limite de 4096 por eixo; cabe dimensionalmente em 8192. Limite do aparelho **não testado**. Não foi encontrado tratamento de limite no código src. Dividir requer atualizar folha, índice e tilesets juntos. |
| Resolução / DPR | [main.js, L36](../../src/main.js#L36), [GraphicsManager.js, L35](../../src/game/GraphicsManager.js#L35) | RESIZE e resolução reduzida 75% no leve; nitidez em DPR 1/2/3 **não testada**. Não confundir resolução de texto 2 com resolução global. |
| Dependência de implementação Phaser | Patch de `scale.updateScale`, gameSize/baseSize e campos do loop em [GraphicsManager.js, L42](../../src/game/GraphicsManager.js#L42), [L90](../../src/game/GraphicsManager.js#L90) | Upgrade de Phaser exige regressão de resize, ponteiro, FPS cap e reinício de cena. Não certificar atualização de versão com esta auditoria. |
| Zoom / orientação | [cameraZoom.js, L13](../../src/game/cameraZoom.js#L13), [GameScene.js, L446](../../src/game/GameScene.js#L446) | Lógica cobre retrato ≤600 px e tela larga; quatro níveis podem convergir ao mínimo 0,5. Testar rotação com menus abertos e interação no modo leve. |
| Mobile / toque | [TouchControls.js, L76](../../src/game/TouchControls.js#L76) trata pointercancel/lostpointercapture; [index.html, L5](../../index.html#L5) define viewport | Código presente, dispositivo real **não testado**. Conferir multitouch, safe-area, teclado, fullscreen e retorno após suspensão. `user-scalable=no` merece revisão de acessibilidade. |
| Perfis gráficos | [graphics.js, L16](../../src/game/graphics.js#L16) | Alto/equilibrado/leve: resolução 1/1/0,75, chuva 90/60/30, intervalos de luz 90/130/200 ms. São configurações, não resultados de benchmark. Limite de inimigos 1/0,85/0,6 também altera densidade do gameplay. |
| Memória | Auxiliares ≈36 MiB RGBA8 e terreno 34,59 MiB RGBA8 | Somados ≈70,60 MiB por uma cópia teórica, excluindo demais texturas/CPU/GPU/overhead. Modo leve não reduz as dimensões desses PNGs carregados. RAM/VRAM/p95/FPS **não medidos**. |
| Assets e URLs | [assets.js, L122](../../src/game/assets.js#L122), [GameScene.js, L104](../../src/game/GameScene.js#L104) | Arquivos auditados existem; HTTP 404/CORS e deploy em subpasta **não testados**. Não encontrado handler `loaderror` em src; progress não prova sucesso de todos os recursos. |
| Offline / atualização | [vite.config.js, L26](../../vite.config.js#L26), [sw.js, L8](../../public/sw.js#L8) | Precache é preenchido pelo build; instalação ignora falhas individuais de cache.add. Offline completo e atualização entre versões **não testados**; um recurso faltante pode passar pela instalação. |
| Cache | [sw.js, L36](../../public/sw.js#L36) usa cache-first e ignoreSearch | Troca de PNG com mesmo caminho precisa validar ciclo de atualização do SW. Versão gerada por build; não presumir que query string força atualização. |
| Saves | [save.js, L4](../../src/game/save.js#L4), [GameScene.js, L3208](../../src/game/GameScene.js#L3208) | Save v2, estado lógico serializado. Troca visual com mesmos IDs/estágios tende a dispensar migração; troca de IDs/regras/posição exige análise própria. Saves reais **não testados e não acessados**. |

## Contratos que uma proposta precisa preservar

| Contrato | Dependências e critério |
|---|---|
| Herói | 56×64, 12×4, pés 62, direções/poses de [heroRig.js, L19](../../src/art/heroRig.js#L19). Atualizar rig de mão/costas se mudar anatomia; [Player.js, L352](../../src/game/Player.js#L352) calcula origem. Não embutir arma em arte cuja arma já é objeto separado. |
| Prédios centrais | Chaves do atlas e estágios 1/4/8 em [buildingVisuals.js, L6](../../src/data/buildingVisuals.js#L6); footprints em [Obstacles.js, L32](../../src/game/Obstacles.js#L32). Atualizar luz/fumaça/labelTop se mudar desenho. |
| Auxiliares | Chaves camp-sawmill-N/camp-mine-N de [assets.js, L124](../../src/game/assets.js#L124). Origem 0,86 e escala por estágio em [Camp.js, L233](../../src/game/Camp.js#L233). Corrigir metadados antes de prometer compatibilidade com arte de outra dimensão. |
| Torre defensiva | [CampDefense.js, L670](../../src/game/CampDefense.js#L670): top controla arqueiros, canhão e tiro; origem 1; collider separado. Baked tem precedência sobre fallback em [L25](../../src/game/CampDefense.js#L25). |
| Vegetação | Frames pine-0/1/2 e pine-b-0/1/2, índice/nomes dos biomas. Origem, profundidade e sólido em [World.js, L53](../../src/game/World.js#L53), [RegionWorld.js, L981](../../src/game/RegionWorld.js#L981). Sem usar caixa inteira da copa como collider. |
| Atlas | Manter frame names, retângulos válidos, transparência, sourceSize e spriteSourceSize. O loader consome PNG+JSON em conjunto: [assets.js, L134](../../src/game/assets.js#L134). Reempacotar exige validar animações e todo consumidor de frames. |
| Arte gerada | Alterações precisam sobreviver ao bake; [bake-buildings.mjs, L27](../../scripts/bake-buildings.mjs#L27) grava JS, [generate-assets.js, L1111](../../scripts/generate-assets.js#L1111) usa os dados no atlas. Atualizar somente saída deixa duas fontes divergentes. |
| Saves / identidade | [GameScene.js, L3221](../../src/game/GameScene.js#L3221) salva camp, regiões, gear e hero.gender em [L3246](../../src/game/GameScene.js#L3246). Preservar nomes lógicos e normalização; não salvar nomes temporários de proposta. |

## Saves: limites específicos

[save.js, L48](../../src/game/save.js#L48) migra v1 para v2, normaliza v2 e rejeita versões futuras. Há leitura das chaves antigas Brumavale e cópia para a atual; JSON inválido pode ir para quarentena em [L124](../../src/game/save.js#L124). A serialização não contém imagens; arte é reconstruída a partir do estado lógico.

[save.js, L108](../../src/game/save.js#L108) faz getItem antes do try de parse; disponibilidade por `typeof localStorage` não garante que o acesso ao armazenamento seja permitido. Bloqueio de storage, quota e navegação privada precisam de teste real. [saveBackup.js, L47](../../src/game/saveBackup.js#L47) possui exportação/importação; esse fluxo não foi executado. Nenhum save real foi lido, exportado, importado ou alterado.

## Verificações executadas

1. Decodificação PNG com pngjs dos arquivos de public/assets e src/ui-skin: dimensões e bytes registrados no [inventário](./auditoria-grafica.md#inventário-físico-png). Alpha dos seis auxiliares inspecionado numericamente.
2. Verificação programática de **57 referências de arquivo** de ASSET_CONFIG e CAMP_BUILDING_IMAGES: nenhuma ausente. Sheets desses contratos são divisíveis pelas dimensões de frame. Isso não inclui toda URL construída dinamicamente na aplicação.
3. Cinco atlas (camp, nature, biome, panel e vfx): retângulos dos frames dentro das dimensões dos PNGs. Não é prova de padding, ausência de sobreposição, qualidade visual ou nome consumido correto em todo caminho.
4. **35 testes existentes passaram**, saída de processo 0, com `node --test --test-reporter=dot` nos nove arquivos abaixo. Sem execução dos scripts de runtime/captura. Storage dos testes de save é simulado em memória.

| Teste existente | Cobertura pertinente |
|---|---|
| [assets.test.js](../../tests/assets.test.js) | Existência/contratos básicos de assets |
| [buildingVisuals.test.js](../../tests/buildingVisuals.test.js) | Estágios e contratos de prédios |
| [cameraZoom.test.js](../../tests/cameraZoom.test.js) | Cálculo de zoom |
| [depth.test.js](../../tests/depth.test.js) | Helpers de sombra/oclusão; não equivale a teste de ordenação renderizada |
| [graphics.test.js](../../tests/graphics.test.js) | Perfis, configurações e estatísticas sintéticas |
| [heroStance.test.js](../../tests/heroStance.test.js) | Estado de postura do herói |
| [npcSheets.test.js](../../tests/npcSheets.test.js) | Contratos de folhas NPC |
| [save.test.js](../../tests/save.test.js) | Migração e armazenamento simulado |
| [touchControls.test.js](../../tests/touchControls.test.js) | Helpers de controles; não interação física de toque |

## Validação posterior recomendada — não executada

- Desktop WebGL e Canvas, Android Chrome e iOS Safari: confirmar renderer, limite de textura e falhas do loader; aparelhos/versões ainda não certificados.
- Retrato/paisagem, DPR 1/2/3, quatro zooms × três modos gráficos: enquadramento, contornos, texto, safe-area, ponteiro e resize.
- Estágios 1/4/8 de torre e cada prédio; herói na frente, atrás, laterais e entrada: base, oclusão, colisão, labels, luz e projéteis.
- Manhã/meio-dia/tarde/noite, neve/grama/água: alpha/halos, sombra de contato, sombra solar, tint e ADD. Comparar arte atual e proposta sob a mesma câmera.
- Travessia com vegetação densa, combate, chuva e abertura de mapa: medir FPS/p95/memória e tempo de carga com identificação do hardware. Nenhum valor alvo foi confundido com resultado observado.
- Carregamento offline inicial após precache completo, reload offline, atualização de build e retomada após suspensão.
- Em ambiente de teste, cópias de saves v1/v2/antigos/corrompidos; manter dados reais fora do ensaio. Conferir skins, níveis e estruturas após mudança estritamente visual.

Compatibilidade estática parcial verificada; **compatibilidade visual e desempenho em navegador/mobile permanecem não testados**. As três propostas estão detalhadas na [auditoria gráfica](./auditoria-grafica.md#três-propostas-futuras--oportunidades-sem-implementação).
