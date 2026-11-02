import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Capturas reais do Vale com a grama v05 (antes) ou v06 (depois). A troca acontece só na memória do navegador:
// substitui a textura 'grass' e reinicia a cena. Nenhum arquivo do projeto é alterado.
// Uso: node capturas.mjs <antes|depois> <pc|mobile>
const label = process.argv[2] ?? 'antes';
const mode = process.argv[3] ?? 'pc';
const out = path.resolve('art-pro/experiments/grass_v063/capturas');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync('.tmp/capturas/grass_v063', { recursive: true });
const v06 = `data:image/png;base64,${fs.readFileSync('art-pro/experiments/grass_v063/grass-sheet-v063.png').toString('base64')}`;

await runInChrome({ name: `grass-v063-${label}-${mode}`, port: mode === 'pc' ? 9367 : 9366, width: mode === 'pc' ? 1280 : 390, height: mode === 'pc' ? 720 : 844, mobile: mode !== 'pc' }, async ({ inScene, capture, freshStart, delay }) => {
  for (const spot of ['praca', 'aberta']) {
    await freshStart();
    await inScene((scene) => {
      scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.enemyDirector.spawnTimer = 1e9; scene.player.invulnerable = 999999;
      const day = scene.dayNight;
      for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
      scene.timeState = day.getState();
      return true;
    });
    if (label === 'depois') {
      await inScene(async (scene, url) => {
        const img = new Image(); img.src = url; await img.decode();
        scene.textures.remove('grass');
        scene.textures.addSpriteSheet('grass', img, { frameWidth: 48, frameHeight: 48 });
        scene.scene.restart();
        return true;
      }, v06);
      await delay(3000);
    }
    const pt = await inScene((scene) => ({ praca: [scene.camp.fire?.x ?? scene.camp.x, (scene.camp.fire?.y ?? scene.camp.y) + 20], aberta: [scene.camp.x - 260, scene.camp.y + 60] }));
    const [x, y] = pt[spot];
    await inScene((scene, p) => { scene.player.body.reset(p[0] - 60, p[1] + 20); scene.cameras.main.centerOn(p[0], p[1]); return true; }, [x, y]);
    await delay(1500);
    await capture(`grass_v063/${label}-${spot}-${mode}.png`);
    fs.copyFileSync(path.join('.tmp/capturas/grass_v063', `${label}-${spot}-${mode}.png`), path.join(out, `${label}-${spot}-${mode}.png`));
    console.log('CAPTURA', label, spot, mode);
  }
});
