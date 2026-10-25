# Expansão — chefe do bioma

## Titã do Bioma

O chefe é uma entidade única do mundo, posicionada a mais de 800 px do acampamento. Seus valores principais são:

- **500 de vida máxima**;
- **30 de dano base**;
- três padrões de ataque;
- marcador de inimigo forte no mapa;
- barra de vida própria na tela.

A barra aparece quando o jogador entra no alcance de 720 px e acompanha a vida restante em tempo real.

## Padrões de ataque

1. **Investida:** uma linha telegrafa a direção; o Titã acelera na direção do jogador e causa 30 de dano no contato.
2. **Impacto sísmico:** um círculo telegrafa a área; a onda se expande e causa 30 de dano no alcance.
3. **Salva:** três projéteis são lançados em leque e causam 30 de dano cada quando atingem o jogador.

Os padrões são executados de forma cíclica quando o Titã está no alcance de ataque. O jogador também pode acertar o chefe durante o intervalo de recuperação.

## Recompensas

Ao derrotar o Titã:

- **1 Núcleo do Titã** entra na mochila; se ela estiver cheia, o item fica em uma mochila de morte recuperável;
- **50 moedas** caem no chão e podem ser coletadas;
- a receita **Lâmina do Titã** aparece na ferraria, com custo de 1 núcleo, 4 ferros e 1 ouro e bônus de +12 ataque.

A receita fica bloqueada e oculta até a derrota do chefe. O desbloqueio é persistido separadamente dos equipamentos já criados.

## Persistência

O save v2 preserva `boss.defeated`, a vida restante e `camp.unlockedRecipes`. Após a derrota, o chefe não reaparece e o desbloqueio continua disponível ao recarregar.

## Arquivos principais

- `src/data/boss.js`: posição e valores do chefe;
- `src/game/BiomeBoss.js`: entidade, IA e três padrões;
- `src/game/GameScene.js`: integração de combate e recompensas;
- `src/game/UI.js`: atualização da barra de vida;
- `src/game/EquipmentSystem.js`: desbloqueio de receitas;
- `src/data/buildingSystems.js`: receita da Lâmina do Titã;
- `tests/boss.test.js`: valores e receita;
- `scripts/boss-runtime-check.mjs`: teste mobile dos padrões e drops.
