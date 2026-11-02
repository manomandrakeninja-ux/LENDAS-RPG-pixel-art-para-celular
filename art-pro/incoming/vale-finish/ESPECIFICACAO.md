# Especificação — camada visual `vale-finish` (acabamento de caminhos do Vale)

**Pasta de entrega:** `art-pro/incoming/vale-finish/`
**Arquivos esperados:** `vale-finish__v01.png` e `vale-finish__v01.json`. Nenhum sprite provisório.
**Escopo:** só visual. Não altera geometria, colisões, saves, velocidade, missões ou NPCs.

## 1. Quadro e PNG

- Cada quadro tem **64 × 64 px**. A área de terra do tile fica no retângulo interno **x 8..55, y 8..55** (48 × 48 px).
- As **8 px de margem** em volta são a área de avanço visual (overhang): só podem ser pixels de **grama** (ver seção 5).
- Grade do PNG: **8 colunas × 6 linhas** de quadros → **512 × 384 px**. Índice do quadro = `linha × 8 + coluna`.
- Formato: PNG RGBA 8 bits.

## 2. Organização dos quadros (48 slots, 44 usados)

| Índices | Conteúdo | Quantidade |
|---|---|---|
| 0 – 31 | Franjas de borda: máscara `m` (0–15) × variante `v` (0–1), índice = `m × 2 + v` | 32 |
| 32 – 35 | Cantos externos: TL, TR, BL, BR | 4 |
| 36 – 39 | Detalhes decorativos: pedrinha-a, pedrinha-b, salpico-de-terra, tufo | 4 |
| 40 – 47 | Reservados (transparentes, não usar) | 8 |

Índices 0–31 ocupam as linhas 0–3; 32–39 ocupam a linha 4; a linha 5 fica vazia.

## 3. Máscaras (mesma convenção do atlas `vale-paths`)

Bits dos quadrantes do vértice: **TL = 1, TR = 2, BL = 4, BR = 8**. Bit ligado = a célula desse quadrante é **caminho**. Assim a máscara `m` de uma franja é a mesma calculada pelo jogo para o atlas de caminhos, e o mesmo índice escolhe a franja.

- `m = 0` (nenhum caminho) e `m = 15` (tudo caminho) não têm franja: ambas as entradas ficam **transparentes**, mas continuam no JSON.
- A franja desenha **a grama avançando sobre a terra**, na região onde `m` diz que é grama. Isto é, o pixel é grama quando o quadrante correspondente não é caminho.

## 4. Cantos e detalhes

- **Cantos (32–35):** pequeno contorno de grama que avança sobre a terra no canto **externo** de uma curva convexa de caminho (TL, TR, BL, BR indicam o canto).
- **Detalhes (36–39):** pedrinhas e salpicos que ficam **dentro da área de terra** (nunca na margem), com no máximo 3 cores cada.

## 5. Transparência e deslocamento (até 8 px)

- Alpha **binário**: 0 ou 255. Sem semitransparência, sombra pintada ou halo.
- Sem antialias: pixel art com cores da paleta do projeto (`src/art/palette.js` e os tons de terra e grama já usados por `terrain.js` e pelo atlas `vale-paths`).
- **Terra só dentro de x 8..55 e y 8..55.** Na margem, o pixel só pode ser grama (ou transparente).
- O deslocamento visual é o próprio desenho da margem: não há ajuste de posição em tempo de execução.

## 6. Continuidade nas bordas

- A margem de cada franja tem que casar com a margem da franja vizinha no mesmo lado, para a grama continuar contínua.
- Dentro da área de terra, as franjas não dependem de vizinhos: o lado de terra da franja deve ser contínuo com a própria terra do atlas `vale-paths` (mesma linha de borda, mesma cor de terra).
- Dois quadros nunca compartilham um pixel de terra fora da própria área de 48 px.

## 7. JSON compatível com o Phaser

```json
{
  "frames": {
    "finish-m01-v0": { "frame": { "x": 0,   "y": 0, "w": 64, "h": 64 }, "mask": 1,  "variant": 0, "index": 0 },
    "finish-m01-v1": { "frame": { "x": 64,  "y": 0, "w": 64, "h": 64 }, "mask": 1,  "variant": 1, "index": 1 },
    "corner-tl":     { "frame": { "x": 0,   "y": 256, "w": 64, "h": 64 }, "mask": null, "variant": null, "index": 32 },
    "detail-pebble-a": { "frame": { "x": 256, "y": 256, "w": 64, "h": 64 }, "mask": null, "variant": null, "index": 36 }
  },
  "meta": {
    "app": "LENDAS finish",
    "version": "v01",
    "image": "vale-finish__v01.png",
    "format": "RGBA8888",
    "size": { "w": 512, "h": 384 },
    "tile": 48,
    "margin": 8,
    "anchor": { "x": 8, "y": 8 }
  }
}
```

- Os nomes são obrigatórios: `finish-mMM-vV` (MM = máscara com 2 dígitos, V = variante 0 ou 1), `corner-tl|tr|bl|br`, `detail-pebble-a|pebble-b|speck|tuft`.
- O JSON deve listar **todos os 40 quadros**, incluindo as máscaras 0 e 15 (índices 0, 1, 30 e 31), que são **transparentes**. Assim a fórmula `index = m × 2 + v` vale para todos os quadros de franja, sem exceção.

## 8. Uso no Phaser (quando a arte chegar)

- `load.image('vale-finish', 'assets/finish/vale-finish.png')` e `load.json('vale-finish-index', 'assets/finish/vale-finish.json')`.
- Posição de cada quadro: o vértice `(vc, vr)` da camada de caminhos fica no canto do tile em `(vc × 48 − 24, vr × 48 − 24)`. A franja é desenhada com `x = vc × 48 − 24 − 8`, `y = vr × 48 − 24 − 8`, origem `(0, 0)`, na mesma profundidade da camada de caminhos (ou logo acima dela).
- Variante escolhida com o mesmo `hash(vc, vr, seed)` de `buildValePaths`. Nada aleatório em tempo de execução.
- Só aparece onde há borda de caminho (máscara 1…14). Não é desenhada sobre construções nem sobre decoração: a checagem usa os mesmos critérios da decoração (`decorBlocked`).

## 9. Critérios de aceitação (antes de integrar)

1. PNG 512 × 384, JSON com os nomes e índices acima.
2. Alpha binário; cores dentro da paleta de terra/grama do projeto.
3. Terra só na área 8..55; margem só grama ou transparente.
4. Continuidade das margens entre franjas vizinhas (teste de borda, como `tests/vale-paths-seams.test.js`).
5. Visual aprovado no `art-review` com captura da fogueira e da trilha, PC e mobile.

Aguardo os arquivos `vale-finish__v01.png` e `vale-finish__v01.json` na pasta `art-pro/incoming/vale-finish/`. Nenhum commit ou deploy.
