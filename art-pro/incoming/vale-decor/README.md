# Decoração do Vale de Eldoria — flores, pedras, folhas e vegetação

**Pasta:** `art-pro/incoming/vale-decor/`
**Arquivos:**
- `vale-decor__atlas__v01.png` (imagem com todos os sprites)
- `vale-decor__atlas__v01.json` (atlas no formato Phaser, "JSON Hash", igual ao de `public/assets/nature/biome-atlas.json`)

Nada desta pasta entra no jogo sozinho. A decoração só é carregada depois de validada e aprovada no `art-review`.
Os sprites **não são gerados por código**: são arte desenhada à mão, em pixel art.

## Formato da imagem

- PNG RGBA 8 bits, fundo **transparente**.
- Transparência **binária**: alpha 0 ou 255. Nada de semitransparência, sombra pintada ou halo.
- Sem antialiasing e sem degradê. Cores somente da **paleta-mestre** (`src/art/palette.js`, 64 cores).
- Sem sombra projetada pintada: a sombra vem do sistema de sombras do jogo.
- Sem luz de noite pintada: a noite vem do sistema de iluminação.
- Sem contorno preto grosso. Use a cor de sombra da própria paleta para dar volume.

## Categorias, tamanhos e quantidades

| Categoria (prefixo do nome) | Tamanho do sprite | Quantidade mínima | Uso |
|---|---|---|---|
| `flor-` | 16 × 16 px | 12 variantes | flores soltas e pequenos grupos |
| `pedra-` | 16 × 12 px ou 24 × 16 px | 8 variantes | seixos e pedras pequenas |
| `folha-` | 16 × 16 px | 8 variantes | folhas caídas e gravetos |
| `tufo-` | 24 × 16 px | 8 variantes | tufos de vegetação alta |

Total mínimo: **36 sprites**. Dimensões **exatas** por sprite, sem margem extra dentro da célula.
A base do sprite (parte inferior central) é o ponto de apoio no chão.

Para cada categoria, pelo menos 4 variantes precisam ter formas claramente diferentes (não só troca de cor).

## Paleta

- Verdes: `#1e6f50 #33984b #5ac54f #99e65f #d3fc7e` (grama do Vale).
- Terra e pedra: `#391f21 #5d2c28 #8a4836 #ad7954 #cba36f #e69c69 #494834 #272727 #5d5d5d #858585 #b4b4b4`.
- Flores: use as cores da paleta-mestre (`#ffeb57 #ffa214 #edab50 #f68187 #fdd2ed #ffffff #c85086 #93388f`).
- Máximo de **6 cores por sprite**, sem contar a transparência.

## Atlas JSON

Formato Phaser "JSON Hash" com `frames`, `meta` e `image`. Cada frame tem o nome da categoria e um número:
`flor-01`, `flor-02`, …, `pedra-01`, `folha-01`, `tufo-01`.

```json
{
  "frames": {
    "flor-01": { "frame": { "x": 2, "y": 2, "w": 16, "h": 16 }, "rotated": false, "trimmed": false,
                 "spriteSourceSize": { "x": 0, "y": 0, "w": 16, "h": 16 }, "sourceSize": { "w": 16, "h": 16 } }
  },
  "meta": { "app": "LENDAS decor", "version": "1.0", "image": "vale-decor__atlas__v01.png", "format": "RGBA8888" }
}
```

## Como o jogo vai usar (quando aprovado)

- Camada decorativa independente do chão: não bloqueia, não recebe colisão e não altera recursos.
- Entra por cima do chão, na mesma faixa de profundidade da decoração atual do Vale (camada `overlay`).
- A escolha de cada sprite e a posição são deterministas (`hash` por tile), para o Vale ser o mesmo a cada partida.
- Densidade controlada no código, em `src/data/terrainLayout.js`, sem tocar em caminhos, colisões ou saves.

## Validação

```sh
node scripts/validate-vale-decor.mjs art-pro/incoming/vale-decor/vale-decor__atlas__v01.png art-pro/incoming/vale-decor/vale-decor__atlas__v01.json
```

O validador não altera arquivos. Ele confere: transparência binária, tamanhos por categoria, quantidades mínimas,
cores dentro da paleta-mestre, limite de cores por sprite, frames sem duplicata e nomes no padrão.
Termina com código diferente de zero em caso de erro.
