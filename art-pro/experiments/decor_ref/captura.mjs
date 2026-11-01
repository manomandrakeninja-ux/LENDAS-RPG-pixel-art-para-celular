import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Experimento: grama v05 com (A) a decoração v02 atual e (B) os objetos do decor_ref nas mesmas posições.
// A troca ocorre só na memória do navegador. Nada do projeto é alterado.
const root = path.resolve('art-pro/experiments/decor_ref');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const urls = manifest.map((e) => `data:image/png;base64,${fs.readFileSync(path.join(root, 'objetos', e.file)).toString('base64')}`);
fs.mkdirSync('.tmp/capturas/decor_ref', { recursive: true });

await runInChrome({ name: 'decor-ref', port: 9386, width: 1280, height: 720 }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();
  await inScene(async (scene) => {
    scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9;
    scene.player.invulnerable = 999999;
    scene.player.body.reset(scene.camp.x + 300, scene.camp.y - 220);
    scene.cameras.main.centerOn(scene.camp.x + 300, scene.camp.y - 220);
    return true;
  });
  await delay(1200);
  await capture('decor_ref/A-atual-v05-decor-v02.png');

  await inScene(async (scene, args) => {
    const v02 = [];
    for (const chunk of scene.regionWorld.chunks.values()) {
      if (!chunk.active) continue;
      for (const image of chunk.objects) if (image.texture?.key === 'vale-decor') v02.push(image);
    }
    for (let i = 0; i < args.urls.length; i += 1) {
      const img = new Image();
      img.src = args.urls[i];
      await img.decode();
      if (!scene.textures.exists(`exp-${i}`)) scene.textures.addImage(`exp-${i}`, img);
    }
    v02.forEach((image, i) => {
      image.setVisible(false);
      const sprite = scene.add.image(image.x, image.y, `exp-${i % args.urls.length}`).setOrigin(0.5, 0.92).setDepth(-997);
      scene.hudCamera?.ignore(sprite);
    });
    return v02.length;
  }, { urls });
  await delay(1200);
  await capture('decor_ref/B-experimento-decor-ref.png');
});
