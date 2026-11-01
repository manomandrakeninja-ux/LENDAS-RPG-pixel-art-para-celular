import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Capturas do estado atual (ou do rótulo dado) em dois pontos de estrada do Vale, PC dia e mobile 390x844.
// Uso: node capturas.mjs <rotulo>. Só lê o que está no projeto; não altera nada.
const label = process.argv[2] ?? 'atual';
const SPOTS = { junto: [1748, 1297], cruzamento: [36 * 48 + 24, 21 * 48 + 24] };
const dir = path.resolve('art-pro/experiments/caminhos_org/capturas');
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync('.tmp/capturas/caminhos_org', { recursive: true });

for (const mode of ['pc', 'mobile']) {
  await runInChrome({ name: `caminhos-${label}-${mode}`, port: mode === 'pc' ? 9380 : 9379, width: mode === 'pc' ? 1280 : 390, height: mode === 'pc' ? 720 : 844, mobile: mode !== 'pc' }, async ({ inScene, capture, freshStart, delay }) => {
    for (const [spotName, [x, y]] of Object.entries(SPOTS)) {
      await freshStart();
      await inScene((scene, p) => {
        scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
        for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
        scene.enemyDirector.spawnTimer = 1e9; scene.player.invulnerable = 999999;
        const day = scene.dayNight;
        for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
        scene.timeState = day.getState();
        scene.player.body.reset(p[0] + 60, p[1]);
        scene.cameras.main.centerOn(p[0], p[1]);
        return true;
      }, [x, y]);
      await delay(1500);
      await capture(`caminhos_org/${label}-${spotName}-${mode}.png`);
      fs.copyFileSync(path.join('.tmp/capturas/caminhos_org', `${label}-${spotName}-${mode}.png`), path.join(dir, `${label}-${spotName}-${mode}.png`));
      console.log('CAPTURA', label, spotName, mode);
    }
  });
}
