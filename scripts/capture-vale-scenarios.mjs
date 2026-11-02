import fs from 'node:fs';
import { runInChrome } from './runtime-harness.mjs';

// Cenários de avaliação visual da grama, dentro do Phaser, SEM gravar nada no projeto.
// A candidata entra só na textura 'grass' da página (memória do navegador). 'atual' não troca.
// Uso: node scripts/capture-vale-scenarios.mjs atual=atual v05=art-pro/incoming/vale/vale__grama-trilha__8x8__v05.png
// Saídas: .tmp/capturas/cenarios/<rótulo>-<cenário>.png
const specs = process.argv.slice(2).map((arg) => {
  const [label, file] = arg.split('=');
  return { label, file: file === 'atual' ? null : file };
});
if (!specs.length) {
  console.error('Uso: node scripts/capture-vale-scenarios.mjs <rótulo>=<png|atual> ...');
  process.exit(2);
}

const ZOOMS = [1, 1.5, 2.25];
fs.mkdirSync('.tmp/capturas/cenarios', { recursive: true });

await runInChrome({ name: 'vale-cenarios', port: 9391, width: 1280, height: 720 }, async ({ inScene, capture, freshStart, delay }) => {
  for (const { label, file } of specs) {
    await freshStart();
    if (file) {
      const url = `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
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
    const camp = await inScene((scene) => ({ x: scene.camp.x, y: scene.camp.y }));
    const scenarios = [
      { name: 'acampamento-dia', x: camp.x + 40, y: camp.y + 120, night: false, zoom: 1, mode: 'day' },
      { name: 'acampamento-noite', x: camp.x + 40, y: camp.y + 120, night: true, zoom: 1, mode: 'night' },
      { name: 'vale-aberto', x: camp.x + 420, y: camp.y - 260, night: false, zoom: 1, mode: 'day' },
      ...ZOOMS.map((z) => ({ name: `zoom-${String(z).replace('.', ',')}x`, x: camp.x + 420, y: camp.y - 260, night: false, zoom: z, mode: 'day' }))
    ];
    for (const s of scenarios) {
      await inScene((scene, args) => {
        scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
        for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
        scene.enemyDirector.spawnTimer = 1e9;
        scene.player.invulnerable = 999999;
        scene.player.body.reset(args.x, args.y);
        scene.cameras.main.setZoom(args.zoom);
        scene.cameras.main.centerOn(args.x, args.y);
        const day = scene.dayNight;
        // Anda o ciclo até achar a fase pedida (dia = manhã avançada; noite = fase 'night').
        for (let i = 0; i < 4000; i += 1) {
          const state = day.getState();
          const ok = args.mode === 'night' ? state.isNight : state.phase === 'day' && state.hour >= 10 && state.hour <= 14;
          if (ok) break;
          day.advanceGameMinutes(8);
        }
        scene.timeState = day.getState();
        return true;
      }, s);
      await delay(1500);
      await capture(`cenarios/${label}-${s.name}.png`);
      console.log(`CAPTURA ${label} ${s.name}`);
    }
  }
});
