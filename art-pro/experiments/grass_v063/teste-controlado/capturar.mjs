import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../../scripts/runtime-harness.mjs';

// Teste controlado: mesma posição, câmera, zoom e horário; só a textura 'grass' muda (memória do navegador).
// Uso: node capturar.mjs <v05|v063> <pc|mobile>
const which = process.argv[2] ?? 'v05';
const mode = process.argv[3] ?? 'pc';
const out = path.resolve('art-pro/experiments/grass_v063/teste-controlado/capturas');
fs.mkdirSync(out, { recursive: true }); fs.mkdirSync('.tmp/capturas/teste-controlado', { recursive: true });
const url = which === 'v05' ? null : `data:image/png;base64,${fs.readFileSync(path.resolve('art-pro/experiments/grass_v063/grass-sheet-v063.png')).toString('base64')}`;
const SPOTS = ['praca', 'aberta', 'trilha'];

await runInChrome({ name: `ctrl-${which}-${mode}`, port: mode === 'pc' ? 9365 : 9364, width: mode === 'pc' ? 1280 : 390, height: mode === 'pc' ? 720 : 844, mobile: mode !== 'pc' }, async ({ inScene, capture, freshStart, delay }) => {
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
  if (url) {
    await inScene(async (scene, dataUrl) => {
      const img = new Image(); img.src = dataUrl; await img.decode();
      scene.textures.remove('grass');
      scene.textures.addSpriteSheet('grass', img, { frameWidth: 48, frameHeight: 48 });
      scene.scene.restart();
      return true;
    }, url);
    await delay(3000);
    await inScene((scene) => {
      scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.enemyDirector.spawnTimer = 1e9; scene.player.invulnerable = 999999;
      return true;
    });
  }
  const pts = await inScene((scene) => ({
    praca: [scene.camp.fire?.x ?? scene.camp.x, (scene.camp.fire?.y ?? scene.camp.y) + 20],
    aberta: [scene.camp.x - 260, scene.camp.y + 60],
    trilha: [scene.camp.x, scene.camp.y + 260],
  }));
  for (const spot of SPOTS) {
    const [x, y] = pts[spot];
    await inScene((scene, p) => { scene.player.body.reset(p[0] - 60, p[1] + 20); scene.cameras.main.centerOn(p[0], p[1]); return true; }, [x, y]);
    await delay(1500);
    await capture(`teste-controlado/${which}-${spot}-${mode}.png`);
    fs.copyFileSync(path.join('.tmp/capturas/teste-controlado', `${which}-${spot}-${mode}.png`), path.join(out, `${which}-${spot}-${mode}.png`));
    console.log('CAPTURA', which, spot, mode);
  }
});
