# Desempenho — laboratório e estimativas

> Estimativas da fase de propostas. Custos dos atlas após integração e amostras de runtime estão em [integração aprovada](./integracao-aprovada.md).

Data: 2026-11-01. Ambiente: Windows, Node v24.22.1, dependências já presentes. O servidor do laboratório usa apenas módulos nativos Node; processamento offline usa pngjs/@napi-rs/canvas/culori já instalados. Não foi instalado pacote nem executado build do jogo.

| Proposta | Resolução | PNG original extraído | PNG proposto | RGBA8 por imagem |
|---|---:|---:|---:|---:|
| Torre | 90×174 | 9.455 B | 13.853 B | 62.640 B |
| Ferreiro | 168×176 | 18.483 B | 23.001 B | 118.272 B |
| Vegetação (prancha) | 132×88 | 7.777 B | 10.482 B | 46.464 B |

Valores medidos nos arquivos; memória RGBA8 é **estimativa por fórmula largura×altura×4**, não medição de GPU. Propostas somam 47.336 B comprimidos; RGBA8 somado 227.376 B. O painel mantém originais e propostas simultaneamente e também usa thumbnails; consumo real depende do navegador. Fontes de geração grandes ficam apenas no laboratório e não são carregadas pelo jogo.

As dimensões iguais sugerem custo dimensional equivalente numa futura integração, mas não comprovam FPS ou VRAM iguais. Empacotamento, texturas duplicadas, transparência e iluminação podem alterar o resultado. A torre originalmente é RLE em JS, portanto comparar PNGs não mede variação do download original.

FPS do jogo, memória GPU real, aparelhos físicos, latência mobile e impacto pós-integração: **não medidos** nesta etapa. Não há integração autorizada. Antes dela, medir limite MAX_TEXTURE_SIZE, FPS/frame-time em mesma rota/câmera, cold/warm load e memória em desktop/celular, antes/depois, sem mudar saves.

Resultados do navegador e testes do painel estão em [histórico](./historico-alteracoes.md). Métricas brutas em [asset-metrics.json](./asset-metrics.json).
