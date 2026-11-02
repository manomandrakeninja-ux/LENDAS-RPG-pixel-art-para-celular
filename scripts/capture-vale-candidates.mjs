import fs from 'node:fs';
import { runInChrome } from './runtime-harness.mjs';

// Captura o Vale dentro do Phaser para cada textura candidata de grama, SEM gravar nada no projeto:
// a candidata entra só na textura 'grass' da página (memória do navegador). Só o rótulo 'atual' não troca.
// Uso: node scripts/capture-vale-candidates.mjs atual=atual v04=art-pro/incoming/vale/vale__grama-trilha__8x8__v04.png
// Saídas: .tmp/capturas/vale-<rótulo>.png
const specs = process.argv.slice(2).map((arg) => {
  const [label, file] = arg.split('=');
  return { label, file: file === 'atual' ? null : file };
});
if (!specs.length) {
  console.error('Uso: node scripts/capture-vale-candidates.mjs <rótulo>=<png|atual> ...');
  process.exit(2);
}

await runInChrome({ name: 'vale-candidatos', port: 9392, width: 1280, height: 720 }, async ({ inScene, capture, freshStart, delay }) => {
  const place = (scene) => {
    scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9;
    scene.player.invulnerable = 999999;
    scene.player.body.reset(scene.camp.x + 40, scene.camp.y + 300);
    scene.cameras.main.centerOn(scene.camp.x + 40, scene.camp.y + 300);
    return true;
  };
  for (const { label, file } of specs) {
    await freshStart();
    if (file) {
      const url = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
      // A textura entra na memória da página; o restart faz a cena usar a nova (o loader ignora chaves já existentes).
      await inScene(async (scene, dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        if (scene.textures.exists('grass')) scene.textures.remove('grass');
        scene.textures.addSpriteSheet('grass', img, { frameWidth: 48, frameHeight: 48 });
        scene.scene.restart();
        return true;
      }, url);
      await delay(2500);
    }
    await inScene(place);
    await delay(1200);
    await capture(`vale-${label}.png`);
    console.log(`CAPTURA ${label} -> .tmp/capturas/vale-${label}.png`);
  }
});
