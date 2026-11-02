import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Capturas do jogo integrado (sem injeção de textura). Só ajusta a câmera e o herói; Lia é criada em memória
// (ela só entra no acampamento depois do resgate) e o syncWorld fica desligado só nesta captura.
const mode = process.argv[2] ?? 'pc';
const outDir = path.resolve('art-pro/experiments/vale_paths/capturas-integradas');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync('.tmp/capturas/vale_paths', { recursive: true });
await runInChrome({ name: `vp-real-${mode}`, port: mode === 'pc' ? 9375 : 9374, width: mode === 'pc' ? 1280 : 390, height: mode === 'pc' ? 720 : 844, mobile: mode !== 'pc' }, async ({ inScene, capture, freshStart, delay }) => {
  const spots = { fogueira: 'fogueira', trilha: 'trilha', curandeira: 'curandeira' };
  for (const spot of Object.keys(spots)) {
    await freshStart();
    const pt = await inScene((scene) => {
      scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.enemyDirector.spawnTimer = 1e9; scene.player.invulnerable = 999999;
      const day = scene.dayNight;
      for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
      scene.timeState = day.getState();
      scene.player.body.reset(scene.camp.x, scene.camp.y + 60);
      scene.campaign.syncWorld();
      if (!scene.campaign.npcs.has('curandeira')) scene.campaign.createNpc('curandeira');
      scene.campaign.syncWorld = () => {};
      const lia = scene.campaign.npcs.get('curandeira');
      return {
        fogueira: [scene.camp.fire?.x ?? scene.camp.x, (scene.camp.fire?.y ?? scene.camp.y) + 20],
        trilha: [scene.camp.x, scene.camp.y + 260],
        curandeira: lia ? [lia.x, lia.y] : [scene.camp.x + 112, scene.camp.y + 112]
      };
    });
    const [x, y] = pt[spots[spot]];
    await inScene((scene, p) => {
      scene.player.body.reset(p[0] - (p[2] ? 40 : 0), p[1] + (p[2] ? 14 : 0));
      scene.cameras.main.centerOn(p[0], p[1]);
      return true;
    }, [x, y, spot === 'curandeira']);
    await delay(1500);
    await capture(`vale_paths/${spot}-${mode}.png`);
    fs.copyFileSync(path.join('.tmp/capturas/vale_paths', `${spot}-${mode}.png`), path.join(outDir, `${spot}-${mode}.png`));
    console.log('CAPTURA', spot, mode);
  }
});
