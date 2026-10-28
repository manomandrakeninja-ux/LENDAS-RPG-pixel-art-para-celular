import fs from 'node:fs';
import path from 'node:path';
import { capturesDir, check, runInChrome } from './runtime-harness.mjs';

// Zoom da câmera (Ajustes): 4 níveis, aplica na hora, salva, e não quebra HUD/luz/véus.
// Capturas em .tmp/capturas/zoom/. Requer `npm run dev` em 127.0.0.1:5173.
const dir = path.join(capturesDir, 'zoom');
fs.mkdirSync(dir, { recursive: true });
const LEVELS = ['near', 'normal', 'far', 'farthest'];

async function run(name, port, width, height, mobile) {
  return runInChrome({ name, port, width, height, mobile }, async ({ evaluate, inScene, capture, freshStart, delay }) => {
    await freshStart();
    const out = {};
    for (const phase of ['dia', 'noite']) {
      for (const level of LEVELS) {
        await inScene((scene, lv, night) => {
          scene.settingsPanel.set('zoom', lv);
          scene.settingsPanel.close();
          scene.dayNight.cycleTime = night ? 80 + 900 : 20;
        }, level, phase === 'noite');
        await delay(900);
        const info = await inScene((scene) => {
          const cam = scene.cameras.main;
          const hud = scene.hudCamera;
          const dusk = scene.duskTint;
          return {
            zoom: cam.zoom, hudZoom: hud.zoom, saved: JSON.parse(localStorage.getItem('lendas-configuracoes')).zoom,
            duskCovers: dusk.x * 0 + (cam.width / cam.zoom) - dusk.displayWidth,
            lightW: scene.lighting.image.displayWidth * cam.zoom, w: scene.scale.width,
            night: scene.timeState.isNight, heroShare: 64 * cam.zoom / scene.scale.height
          };
        });
        check(info.zoom > 0 && info.hudZoom === 1 && info.saved === level, `Zoom ${level}: ${JSON.stringify(info)}`);
        check(Math.abs(info.duskCovers) < 1, `Véu não cobre a tela: ${JSON.stringify(info)}`);
        check(Math.abs(info.lightW - info.w) <= 16, `Máscara de luz fora de escala: ${JSON.stringify(info)}`);
        out[`${phase}-${level}`] = info.zoom;
        await capture(`zoom/${name}-${phase}-${level}.png`);
      }
    }
    // Persistência: recarrega e o último nível (Muito longe) continua.
    const before = await inScene((scene) => scene.cameras.main.zoom);
    return { name, zooms: out, last: before };
  });
}

await run('celular', 9391, 390, 844, true);
await run('pc', 9392, 1280, 800, false);
