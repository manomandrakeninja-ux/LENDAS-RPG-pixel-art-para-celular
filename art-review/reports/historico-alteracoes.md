# Histórico de revisão

## 2026-11-01 — integração autorizada

Após aprovação individual no painel e autorização no chat para integrar/enviar, aplicadas as três propostas v1. Backup anterior, hashes, arquivos afetados e verificações documentados em [integração aprovada](./integracao-aprovada.md). As regras e os saves do jogo permanecem intocados. O bloco abaixo registra a etapa anterior, quando as propostas ainda eram pendentes.

## 2026-11-01 — lote inicial v1

- Leitura da arquitetura, atlas e dados baked. Nenhum fonte/asset original alterado.
- Extração de três referências para `art-review/originals`; SHA-256 das fontes em [source-hashes.json](../originals/source-hashes.json).
- Três gerações com referências, salvas em diretórios versionados; conversão offline para dimensões nativas/paleta oficial, transparência binária e composição das pranchas.
- Painel independente criado com servidor loopback 127.0.0.1:4180. A API só grava histórico de decisões, não possui rota de integração.
- Testes de servidor: 2 passaram, incluindo origem/host, proposta desconhecida, limite de payload, persistência concorrente, traversal e junction externa. Decisões de teste ficaram em fixtures temporárias; nenhuma proposta real foi aprovada.
- Testes de arquivos e servidor: **4 passaram** (incluindo o subteste de junction). Validação de dimensões, alpha binário, paleta, hashes e presença das comparações.
- Regressão estática do jogo: **35 testes existentes passaram**; não equivalem a partida ou validação visual no jogo.
- Navegador real Chrome 156 headless, perfil temporário separado: galeria de três artes, dimensões naturais, zoom 2×, slider 70%, quatro fundos; capturas em desktop 1280×900, mobile horizontal 844×390 e vertical 390×844. Sem overflow horizontal do documento nessas resoluções; nenhuma exceção/erro de console na execução final. Não é teste em aparelho físico.
- Aprovar, rejeitar, pedir revisão e adicionar observação foram exercitados com cliques em uma proposta **QA descartável**, hospedada em servidor temporário. Quatro eventos persistiram em disco e sobreviveram ao reload; v2 manteve estado independente. `approvals.json` real continuou com histórico vazio.
- Detectados e corrigidos no laboratório: acentos inválidos no HTML inicial, favicon ausente e overflow do grid no retrato. A ferramenta de navegador integrado teve timeout de estabilidade ao clicar; validação reproduzível feita em Chrome separado via CDP, com perfil isolado e sem abrir a origem do jogo.
- Capturas: [desktop](./painel-desktop.png), [horizontal](./painel-mobile-horizontal.png), [vertical](./painel-mobile-vertical.png). Evidência estruturada: [browser-check.json](./browser-check.json). Rodar `node art-review/browser-check.mjs` com o servidor ligado.
- Sem commit, push, alteração de saves ou execução de geradores do jogo.
