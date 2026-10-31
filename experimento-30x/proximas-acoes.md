# Próximas ações — 30x

## Fila inicial (Fase 1 — Fundação)
1. Ciclo 01: análise de arquitetura + correção de bug real + 1 melhoria visual leve + docs.
2. Auditar warnings de `node --check` e imports não usados nos arquivos tocados.
3. Procurar TODO/FIXME pendentes no código.
4. Verificar performance do buildTerrainGrid (custo ~90 ms por teste; caching por chunk é backlog conhecido de docs/mapa-400x300.md).
5. Rodar `npm run build` está bloqueado no sandbox (spawn EPERM) — deixar anotado para o usuário rodar fora.
