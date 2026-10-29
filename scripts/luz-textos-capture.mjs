import fs from 'node:fs';
import path from 'node:path';
import { capturesDir, check, runInChrome } from './runtime-harness.mjs';

// Capturas: acampamento à noite e textos do mundo nos 4 zooms (celular 390x844).
// Uso: node scripts/luz-textos-capture.mjs <sufixo> (antes|depois). Requer `npm run dev`.
const suffix = process.argv[2] ?? 'depois';
const dir = path.join(capturesDir, 'luz-textos');
fs.mkdirSync(dir, { recursive: true });

await runInChrome({ name: 'luz-textos', port: 9393, width: 390, height: 844, mobile: true }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.settingsPanel.set('zoom', 'normal'); scene.settingsPanel.close(); scene.dayNight.cycleTime = 80 + 900; });
  await delay(1200);
  await capture(`luz-textos/acampamento-noite-${suffix}.png`);
  for (const level of ['near', 'normal', 'far', 'farthest']) {
    await inScene((scene, lv) => {
      scene.settingsPanel.set('zoom', lv); scene.settingsPanel.close();
      scene.dayNight.cycleTime = 20;
      const v = scene.villagers?.villagers?.values().next().value;
      if (v) scene.villagers.say(v, 'Ola, viajante! A noite chegou e o acampamento esta seguro.', 60000);
      scene.effects.spawnDamage(scene.player.x + 20, scene.player.y - 30, 12);
    }, level);
    await delay(700);
    const info = await inScene((scene) => {
      const z = scene.cameras.main.zoom; const out = [];
      for (const t of scene.worldTexts?.texts ?? []) if (t.active && t.visible) out.push([t.text.slice(0, 14), +(t.scaleX * z).toFixed(2)]);
      return { z, out: out.slice(0, 8) };
    });
    console.log(level, JSON.stringify(info));
    await capture(`luz-textos/textos-${level}-${suffix}.png`);
  }
  check(true, 'capturas ok');
});
