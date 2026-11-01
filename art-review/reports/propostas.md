# Primeiro lote — três propostas, nenhuma integração

Data: 2026-11-01. Todas começam **PENDENTES**. Uma decisão no painel afeta apenas o par identificador/versão; integrar ao jogo exige autorização adicional explícita. Não houve commit ou push.

## Direção visual e método

Pixel art medieval frontal com visão parcial do topo e volume desenhado; mapa ortogonal, não isométrico. Luz superior esquerda, sombra inferior direita, contraste de contato sob telhados e parapeitos. Materiais devem ser legíveis no tamanho nativo, sem blur. Preservar escala, base, rotas e perspectiva. As propostas não alteram colliders, economia, níveis ou saves.

Imagens reais geradas com a ferramenta de imagens integrada usando cada original como alvo de edição. Nenhum serviço externo desconhecido foi instalado. Aseprite/LibreSprite não foram encontrados no PATH; isso não comprova ausência em outras pastas. PNG bruto preservado como `source.png`; derivado nativo `proposed.png` usa amostragem nearest-neighbor, alpha binário e paleta oficial de 64 cores. Geração não garante ajuste perfeito: as diferenças abaixo são deliberadamente expostas à revisão. Não são artes aprovadas nem certificadas para substituir os atlas.

## P01 — tower-stone / v1

- Fonte real: registro `tower-stone` em [buildingSprites.js](../../src/art/buildingSprites.js), decodificado sem modificar o fonte. Estágio 4, níveis 4–7.
- [Original](../originals/tower-4.png), [proposta 90×174](../proposals/tower-stone/v1/proposed.png), [comparação](../proposals/tower-stone/v1/comparison.png), [cenário de teste](../proposals/tower-stone/v1/scene.png), [geração bruta](../proposals/tower-stone/v1/source.png).
- Pedras com faces mais marcadas, sombra sob parapeito, ferragens e madeira da porta mais legíveis; mantém torre sem telhado e três ameias.
- Mesma altura e linha inferior; caixa opaca mudou de 86 para 79 px de largura. Avaliar se a massa visual ficou estreita demais. O topo para arqueiros e eventual canhão precisa de revisão antes de integração; nenhum foi reposicionado.
- 28 cores opacas; 62.640 bytes RGBA8 teóricos, igual ao frame original. PNG extraído 9.455 → 13.853 bytes. Não representa delta do bundle/atlas final.
- Prompt usado: refinar a mesma torre, preservar fachada/leve visão de cima, porta arqueada, três ameias, caixa lógica 90×174, pedra cinza-azulada, madeira quente, luz superior esquerda, sombras de contato, pixel art, transparência, sem personagens/texto/rotação isométrica.

## P02 — forge / v1

- Fonte real: frame `forge` do [camp-atlas](../../public/assets/buildings/camp-atlas.png), estágio 4, níveis 4–7.
- [Original](../originals/forge-4.png), [proposta 168×176](../proposals/forge/v1/proposed.png), [comparação](../proposals/forge/v1/comparison.png), [cenário](../proposals/forge/v1/scene.png), [geração bruta](../proposals/forge/v1/source.png).
- Telhas, juntas das pedras e sombreado do beiral com leitura mais definida. Fornalha à esquerda, porta à direita, janela central e chaminé preservadas como elementos.
- Caixa total igual; bounding box opaco de 155×161 para 155×159, base y=164 igual. A divisão interna mudou: conferir posição da fumaça, abertura da fornalha e proporções da porta. Detalhes de grama/ferramentas na base do original não foram todos preservados; decidir se devem retornar em v2.
- 39 cores; RGBA8 118.272 bytes, sem aumento dimensional. PNG 18.483 → 23.001 bytes. Chama da proposta é estática, não nova animação.
- Prompt usado: refinar o mesmo ferreiro em 168×176, perspectiva frontal/leve topo, manter distribuição de chaminé/fornalha/porta/janela/barril, telhas ardósia, madeira e pedra detalhadas, luz do fogo contida, pixels nítidos, transparência e nenhum NPC/texto.

## P03 — vegetation / v1

- Fonte real: frames `oak-tree` 72×88, `bush` 40×30 e `detail-flowers` 20×16 do [nature-atlas](../../public/assets/nature/nature-atlas.png). Composição comparativa 132×88, peças alinhadas pela base.
- [Original](../originals/vegetation.png), [proposta](../proposals/vegetation/v1/proposed.png), [comparação](../proposals/vegetation/v1/comparison.png), [cenário](../proposals/vegetation/v1/scene.png), [geração bruta](../proposals/vegetation/v1/source.png).
- Copa organizada em grupos e tronco mais visível; sombras inferiores frias, luz quente superior esquerda. Arbusto mantém frutos/detalhes vermelhos. Flores passaram a um grupo mais compacto: avaliar legibilidade a 1:1.
- Regiões por peça respeitadas; não é atlas pronto para carregar no jogo. Futuro empacotamento precisa manter nomes, origens e margens. Carvalho escolhido é estático, sem substituir pinheiros animados.
- 32 cores; RGBA8 46.464 bytes da prancha (inclui áreas vazias). PNG 7.777 → 10.482 bytes.
- Prompt usado: trio carvalho/arbusto/flores na mesma ordem, bases alinhadas e regiões 72×88/40×30/20×16; clusters de folhas, volume do tronco, luz superior esquerda, verdes florestais, pixel art transparente, sem fundo/legendas.

## Como avaliar

Comparar a 1:1 e 2×, alternar fundos, usar o slider e a montagem de cenário. Anotar mudanças desejadas; aprovar/rejeitar/revisar cada versão separadamente. As montagens reutilizam grama e ferreiro existentes, mas **não são screenshots de uma partida nem comprovam colisão/profundidade**.

Para novas versões, criar diretório `v2` e entrada própria no manifest. O preparador recusa sobrescrever `proposed.png` já existente. Não editar uma proposta aprovada. O painel não oferece upload nem substituição de arte.
