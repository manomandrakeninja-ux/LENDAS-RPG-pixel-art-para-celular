# Integração aprovada — lote v1

Data: 2026-11-01. Autorização explícita: “integre e envie ao github”. Aprovações individuais de torre, ferreiro e vegetação presentes em [approvals.json](../approvals.json).

## Escopo aplicado

- Torre `tower-stone`, 90×174, níveis 4–7. Demais torres/muralhas permanecem iguais.
- Ferreiro `forge`, 168×176, níveis 4–7. Estágios 1 e 8 não alterados.
- `oak-tree` 72×88, `bush` 40×30 e `detail-flowers` 20×16, separados da prancha aprovada usando as regiões originais. Nenhum pinheiro/animação substituído.
- Apenas os retângulos autorizados de dois atlas PNG foram substituídos. JSONs de atlas, posições, origens, escalas, colisões e profundidade não foram modificados.

## Arquivos e reprodução

1. [camp-atlas.png](../../public/assets/buildings/camp-atlas.png) e [nature-atlas.png](../../public/assets/nature/nature-atlas.png): troca pontual de pixels, sem reempacotar.
2. [approvedBuildingSprites.js](../../src/art/approvedBuildingSprites.js) e [approvedNatureSprites.js](../../src/art/approvedNatureSprites.js): dados RLE das artes aprovadas; as fontes antigas continuam preservadas.
3. [bakedBuildings.js](../../src/art/bakedBuildings.js) e [bakedNature.js](../../src/art/bakedNature.js): preferem apenas as entradas aprovadas, mantendo fallback para todas as outras. Isso faz a torre usar a arte nova em runtime e impede que o próximo bake dos dados antigos a reverta.
4. [generate-assets.js](../../scripts/generate-assets.js): flores passam a usar a entrada aprovada. Ferreiro, árvore e arbusto já passavam pelo decoder baked; nenhum gerador completo foi executado para modificar assets não aprovados.

Overrides gerados a partir dos PNGs aprovados por [integrate-approved.mjs](../integrate-approved.mjs), não desenhados novamente. Cores, resolução e alpha foram comparados byte a byte, inclusive com as CanvasTextures/frames realmente carregados pelo Phaser.

## Segurança / rollback

Cinco arquivos originais foram copiados integralmente **antes** da alteração para [backups/approved-v1](../backups/approved-v1). [Manifest](../backups/approved-v1/manifest.json) registra SHA-256 antes/depois e os hashes das propostas. Nenhum save pessoal foi carregado ou modificado pelos testes.

Rollback, somente se solicitado: `node art-review/rollback-approved.mjs --restore`. Confere todos os hashes antes de restaurar os cinco originais; recusa se houver alterações mais novas. Os dois módulos novos permanecem no disco, sem referências, para não excluir dados. Não executar rollback só para consultar os backups.

## Verificação

- 388 testes existentes do jogo passaram.
- Testes específicos verificam pixels autorizados iguais às propostas, pixels restantes dos atlas inalterados, dimensões, dados baked e hashes de backup/integração.
- `npm run build` passou. Build real servido em loopback separado (4182) durante o teste, encerrado após o ensaio.
- Chrome 156 headless com perfil temporário; desktop 1280×800 e mobile horizontal 844×390, mobile com `toque=1`. Sem erros JavaScript/console na execução final. Os níveis do cenário de QA foram ajustados para 4, apenas nesse perfil, para exibir o estágio aprovado; isso **não é progresso de campanha**.
- Cinco hashes RGBA das texturas no Phaser coincidiram com as propostas aprovadas.
- Origens de runtime preservadas: ferreiro 0,84; torre 1. Animações anteriores e controles não foram modificados. Mobile aqui é emulação de viewport/toque, não certificação em Android/iPhone físico.
- Colisão real via tecla W: personagem iniciou em y=1085, moveu até y=1037 e seu corpo parou exatamente no limite y=1030 do footprint 116×22 do ferreiro. Não atravessou a base.
- Ordenação verificada em duas posições: depth do personagem abaixo/acima de 1040 (ferreiro), conforme atrás/frente. Capturas: [atrás](./integracao-atras-ferreiro.png), [frente](./integracao-frente-ferreiro.png). Ensaio focalizado, não teste de todos os obstáculos do mapa.
- Capturas reais: [acampamento desktop](./integracao-desktop-camp.png), [torre desktop](./integracao-desktop-tower.png), [vegetação desktop](./integracao-desktop-vegetation.png), [acampamento mobile](./integracao-mobile-horizontal-camp.png), [torre mobile](./integracao-mobile-horizontal-tower.png), [vegetação mobile](./integracao-mobile-horizontal-vegetation.png).
- Dados estruturados: [integration-runtime.json](./integration-runtime.json). As pranchas de proposta continuam sendo montagens; as capturas listadas acima são do jogo executando.

## Custo e limites

Atlas do acampamento: 91.683 → 94.582 bytes; atlas de natureza: 13.518 → 14.405 bytes. Delta combinado **3.786 bytes**, dimensões idênticas. Compressão reaproveita o escritor PNG do projeto, sem mudar pixels.

Os módulos novos totalizam 51.960 bytes de fonte antes de bundling; preservam os dados antigos como fallback/rollback. Isso é custo de download/JS, não texturas extras simultâneas obrigatórias. Texturas mantêm suas dimensões; não foi medido delta de VRAM.

FPS registrados são amostras instantâneas em Chrome headless local, com câmera de teste. Não constituem benchmark antes/depois nem desempenho de celular real. Sem alterações em campanha, níveis/recompensas, economia, produção, controles, colisões ou salvamento no código do jogo.
