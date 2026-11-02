# Entrega do Vale de Eldoria — grama e caminhos

**Pasta:** `art-pro/incoming/vale/`
**Arquivo:** `vale__grama-trilha__8x8__v01.png` (versões novas: `v02`, `v03`… nunca sobrescrever).

Nada desta pasta entra no jogo sozinho. A folha só substitui `public/assets/tiles/grass-sheet.png`
depois de passar no validador e de ser aprovada no `art-review`.

## Formato

- PNG RGBA 8 bits, **384 × 384 px** = 8 colunas × 8 linhas de **48 × 48 px**, sem margem nem espaçamento.
- Quadros 0 a 59 **totalmente opacos** (alpha 255). Quadros 60 a 63 ficam vazios (reservados).
- Pixel art real: sem blur, sem suavização, sem degradê contínuo. Paleta-mestre em `src/art/palette.js`
  (o importador reduz para ela; cores fora dela só geram aviso).
- Visão de cima (top-down/2.5D), luz do alto à esquerda, sem sombra projetada pintada e sem luz de noite pintada.

## Ordem dos quadros (quadro = linha × 8 + coluna, contado da esquerda para a direita, de cima para baixo)

| Quadros | Conteúdo |
|---|---|
| 0–15 | Grama Wang, **miolo 0**: máscaras 0 a 15 |
| 16–31 | Grama Wang, **miolo 1**: máscaras 0 a 15 |
| 32–47 | Grama Wang, **miolo 2**: máscaras 0 a 15 |
| 48–51 | Caminho reto, **lado esquerdo** (variantes 0 a 3) |
| 52–55 | Caminho reto, **lado direito** (variantes 0 a 3) |
| 56–57 | Fim do caminho, lado esquerdo (variantes 0 e 1) |
| 58–59 | Fim do caminho, lado direito (variantes 0 e 1) |
| 60–63 | Vazios |

## Wang de cantos (quadros 0 a 47)

A máscara de um quadro é a soma dos cantos que valem 1: **superior esquerdo = 1, superior direito = 2,
inferior esquerdo = 4, inferior direito = 8.** Classe **0 = tom escuro** (grama mais escura) e
**classe 1 = tom claro**. A máscara do quadro é `quadro % 16` e o miolo é `quadro ÷ 16` (inteiro).

Em cada quadro, a mancha clara/escura muda de forma suave de um canto para o outro. Regras que o jogo exige:

1. **Borda só depende dos dois cantos dela.** Duas peças que compartilham os mesmos dois cantos numa
   borda precisam ter a mesma continuação nessa borda, qualquer que seja o miolo ou a máscara do resto.
2. Os 3 miolos de uma mesma máscara têm a **mesma borda** e miolos diferentes (para não repetir a cada 48 px).
3. Máscara 0 (tudo escuro) e máscara 15 (tudo claro) são o chão liso, os mais usados.
4. Pontos de detalhe (flores, pedras, manchas de terra) ficam **dentro** do tile, longe da borda
   (cerca de 4 px), ou então se repetem no vizinho. Props grandes (árvores, arbustos) não entram aqui.

## Caminho (quadros 48 a 59)

O caminho tem 2 tiles de largura (lado esquerdo + lado direito) e corre na vertical.

- Cada lado tem 4 variantes retas; o jogo escolhe uma por linha. **Topo e base** de qualquer variante
  do mesmo lado precisam emendar com topo e base de qualquer outra variante do mesmo lado.
- O **lado esquerdo** encosta, à esquerda, na **grama de máscara 0** (qualquer miolo). O **lado direito**
  encosta, à direita, na grama de máscara 0. O lado esquerdo e o direito emendam entre si no meio.
- **Fim do caminho** (56 a 59): o topo emenda com o caminho reto do mesmo lado; a base emenda com a
  grama de máscara 0 que vem abaixo.

## O que não está incluído nesta entrega

Árvores, arbustos, flores soltas, placas, construções, personagens, franjas contra outros biomas
(floresta, praia etc.) e o conjunto de decoração (`decor`). Cada um terá sua própria entrega.

## Como validar antes de integrar

```sh
node scripts/validate-vale-sheet.mjs art-pro/incoming/vale/vale__grama-trilha__8x8__v01.png
```

O validador não altera nenhum arquivo. Ele confere formato, opacidade, emendas Wang (mesmas bordas e
continuidade), emenda do caminho com a grama, repetição de quadros e paleta, e termina com código
diferente de zero se houver erro.
