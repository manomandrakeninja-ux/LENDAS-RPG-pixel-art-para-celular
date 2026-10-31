# Decisões de design/engenharia — 30x

## Ciclo 01
- Branch `experimento-evolucao-30x` + checkpoint antes de qualquer alteração (proteção do projeto).
- `_backup_original/` não é versionado (ficou só no disco, excluído via `.git/info/exclude`).
- Testes: `node tests/x.test.js` por arquivo + `powershell -ExecutionPolicy Bypass -File scripts/run-all-tests.ps1` (o build `npm run build` falha no sandbox com spawn EPERM — build fica para o usuário fora do sandbox; registrado como limitação no relatório final).
- Cada ciclo teve commit próprio no branch `experimento-evolucao-30x` (30+ commits); `_backup_original/` nunca versionado.
- Saves antigos continuam válidos: todas as adições de save (waypoint, chestDays, travelerGifts) têm fallback para ausente.
- Nada em `F:\app\JOGO` foi tocado; sem deploy, sem mudança de dependências, sem comandos destrutivos.
