# Validador de profundidade — vale-finish × vale-paths

Arquivo: `validar-profundidade.mjs` (independente; não altera nada).

## Como executar

Na raiz do projeto (precisa de Node 18+ e do pacote `pngjs`, já instalado no projeto):

```sh
node art-pro/validador-profundidade/validar-profundidade.mjs \
  --finish art-pro/incoming/vale-finish/vale-finish__v03.png \
  --finish-json art-pro/incoming/vale-finish/vale-finish__v03.json \
  --paths public/assets/paths/vale-paths.png \
  --paths-json public/assets/paths/vale-paths.json \
  --max 6
```

Opções: `--verbose` mostra o relatório completo em JSON; `--palette` aponta para o `PALETA-VALE.json`
(padrão: `art-pro/incoming/vale-finish/PALETA-VALE.json`). Código de saída 0 = aprovado, 1 = reprovado.

## Regras aplicadas

1. **Terra × grama.** Pixel opaco é terra quando `r > g + 12` e `r > b + 25` (a mesma regra usada no atlas `vale-paths`). Os demais pixels opacos são grama. Pixels com alpha 0 não contam.
2. **Slot da franja.** Franja de máscara `m` e variante `v` ocupa o slot `k = m × 2 + v` numa grade de 8 colunas, com quadros de 64 × 64. Se o JSON tem o frame pelo nome (`finish-mMM-vV`), a posição do JSON é usada.
3. **Alinhamento.** O tile de terra de 48 px fica dentro do quadro de 64 px com margem de 8 px. O pixel `(8+u, 8+v)` do quadro de franja corresponde ao pixel `(u, v)` do tile de caminho.
4. **Variantes do caminho.** Cada máscara tem 3 variantes no `vale-paths`. A franja de variante `v` é testada contra as **3** variantes do caminho da mesma máscara (pior caso).
5. **Profundidade.** Para cada pixel de grama da franja que cai sobre terra do caminho, o validador anda até `max` (6) px nas 4 direções e procura grama no caminho. Se não encontrar grama dentro do limite, ou se sair do tile de 48 px, o pixel conta como "acima do limite". A franja passa só se nenhum pixel exceder o limite.
6. **Máscaras 0 e 15.** Os quadros dos slots 0, 1, 30 e 31 precisam ser totalmente transparentes.
7. **Paleta.** Cores opacas fora de `PALETA-VALE.json` são reportadas e reprovam.

## Resultado de referência (mesmo código)

| Arquivo | Quadros testados | Resultado |
|---|---|---|
| `vale-finish__v02.png` | 28 franjas | Reprovado: 3 a 647 px acima do limite por quadro |
| `vale-finish__v03.png` | 28 franjas | Reprovado: 1 a 24 px acima do limite por quadro (máx. em m12-v1) |

Paleta: 0 px fora da paleta em ambos.
