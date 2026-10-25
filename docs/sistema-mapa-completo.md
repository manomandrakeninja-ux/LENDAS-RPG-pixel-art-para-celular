# Expansão — mapa completo

## Interação

- **M** abre e fecha o mapa fullscreen.
- `Esc` fecha o mapa antes de fechar outros painéis.
- O botão **FECHAR MAPA** possui alvo de toque de pelo menos 48 px.
- A abriu do mapa pausa movimento, inimigos, chefe e ataques.

## Neblina

- A neblina pertence somente ao mapa e ao minimapa.
- O mundo não possui overlay nem textura de neblina.
- Células reveladas pela exploração são mantidas em memória e o progresso de descoberta é salvo.

## Marcadores

- Acampamento;
- estruturas de coleta descobertas;
- baús que ainda não foram abertos;
- inimigos elite e o chefe do bioma;
- posição atual do jogador.

Estruturas só aparecem no mapa depois de descobertas. Baús fechados continuam marcados. O marcador do jogador é reposicionado a cada renderização.

## Arquivos principais

- `src/game/WorldMapOverlay.js`: coleta de marcadores e desenho do mapa;
- `src/game/World.js`: registro das áreas reveladas, sem overlay no mundo;
- `src/game/HarvestStructures.js`: descoberta por proximidade;
- `src/data/harvestStructures.js`: persistência do estado `discovered`;
- `src/style.css`: layout fullscreen responsivo;
- `tests/worldMap.test.js`: regras dos marcadores;
- `scripts/map-runtime-check.mjs`: teste mobile do mapa.
