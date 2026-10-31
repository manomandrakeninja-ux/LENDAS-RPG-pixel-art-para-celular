# Laboratório de ideias — 30x (concluído)

A cada ciclo: 5 ideias novas, nota 0–10 em diversão / originalidade / compatibilidade / viabilidade / benefício, e a escolhida. Resumo das escolhidas está no RELATORIO_EVOLUCAO_30X.md (25 implementações em 30 ciclos); as de alto risco (ex.: tilemap do chão por chunk) ficaram no backlog com justificativa.

## Ciclo 01
1. Bússola corrigida nas placas (bug) — diversão 6, originalidade 3, compat 10, viabilidade 10, benefício 8 → **implementada**.
2. Painel de ajuda "?" com todas as teclas — diversão 7, originalidade 5, compat 10, viabilidade 9, benefício 9 → **implementado**.
3. Som ambiente por bioma — ficou para outro ciclo (já existia parcialmente comovento/blips;'évaluer depois).
4. Cache de chunks do chão (backlog mapa-400x300) — benefício alto em mobile, risco médio → fila ciclo 02+.
5. Testes de fumaça do save (roundtrip completo) — compat 10, viabilidade 10 → **feito no ciclo 02**.

## Ciclo 02
1. Texto flutuante "+N moedas" ao ganhar — diversão 7, originalidade 5, compat 10, viabilidade 10, benefício 8 → **implementado** (hook onGain).
2. Roundtrip de save v2 completo — benefício 9, risco 0 → **implementado** (teste).
3. Cache de chunks do chão (backlog) — avaliação adiada para ciclo de performance dedicado.
4. Névoa do minimapa por frame — auditada, já otimizada (sai cedo).
5. Placas com direção errada — viraram bug corrigido no ciclo 01.

