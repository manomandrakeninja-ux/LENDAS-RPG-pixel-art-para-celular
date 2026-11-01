import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Compara o Vale atual com a referência de props (árvores e pedras reduzidas), dia e noite (PC) e dia (mobile).
// Uso: node capturas-props.mjs pc|mobile. A troca é só em memória do navegador. Nada do projeto é alterado.
const mode = process.argv[2] ?? 'pc';
const root = path.resolve('art-pro/experiments/props_ref');
const SET = ['arvore-laranja', 'arvore-rosa', 'pedra-2', 'pedra-4'];
const dir = path.join(root, 'escala-jogo');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const items = manifest.filter((e) => SET.includes(e.name)).map((e) => ({ name: e.name, kind: e.kind, url: `data:image/png;base64,${fs.readFileSync(path.join(dir, e.name + '.png')).toString('base64')}` }));
const outDir = path.join(root, 'capturas');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync('.tmp/capturas/props_ref', { recursive: true });

const port = mode === 'mobile' ? 9382 : 9381;
await runInChrome({ name: `props-${mode}`, port, width: mode === 'mobile' ? 390 : 1280, height: mode === 'mobile' ? 844 : 720, mobile: mode === 'mobile' }, async ({ inScene, capture, freshStart, delay }) => {
  for (const variant of ['atual', 'ref']) {
    await freshStart();
    await inScene(async (scene, args) => {
      scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.enemyDirector.spawnTimer = 1e9;
      scene.player.invulnerable = 999999;
      const day = scene.dayNight;
      for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
      scene.timeState = day.getState();
      scene.player.body.reset(scene.camp.x + 300, scene.camp.y - 220);
      scene.cameras.main.centerOn(scene.camp.x + 300, scene.camp.y - 220);
      if (args.variant === 'atual') return 0;
      const rw = scene.regionWorld; const cols = rw.grid.cols;
      const structures = scene.harvestStructures?.state?.structures ?? [];
      const decor = [];
      for (const chunk of rw.chunks.values()) { if (!chunk.active) continue; for (const image of chunk.objects) if (image.texture?.key === 'vale-decor') decor.push(image); }
      const onTrail = (x, y) => { const c = Math.floor(x / 48); const r = Math.floor(y / 48); for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) { const g = rw.layout.ground[(r + dy) * cols + c + dx]; if (typeof g === 'number' && g >= 48 && g < 60) return true; } return false; };
      for (let i = 0; i < args.items.length; i += 1) { const img = new Image(); img.src = args.items[i].url; await img.decode(); if (!scene.textures.exists(`ref-${i}`)) scene.textures.addImage(`ref-${i}`, img); }
      let placed = 0;
      decor.forEach((image, i) => {
        const isTree = i % 12 === 0; const isRock = i % 12 === 6;
        if (!isTree && !isRock) return;
        if (structures.some((s) => Math.hypot(s.x - image.x, s.y - image.y) < 110)) return;
        if (Math.hypot(image.x - scene.camp.x, image.y - scene.camp.y) < 320) return;
        if (onTrail(image.x, image.y)) return;
        const choice = isTree ? args.items.findIndex((e, k) => e.kind === 'arvore' && k === (placed % 2)) : args.items.findIndex((e) => e.kind === 'pedra');
        const idx = isTree ? [0, 1][placed % 2] : [2, 3][placed % 2];
        const pick = args.items.findIndex((e) => e.name === (isTree ? ['arvore-laranja', 'arvore-rosa'][placed % 2] : ['pedra-2', 'pedra-4'][placed % 2]));
        const sprite = scene.add.image(image.x, image.y, `ref-${pick >= 0 ? pick : idx}`).setOrigin(0.5, 0.92).setDepth(image.y);
        scene.hudCamera?.ignore(sprite);
        placed += 1;
      });
      return placed;
    }, { items: items.map((e) => ({ name: e.name, kind: e.kind, url: e.url })), variant });
    await delay(1200);
    await capture(`props_ref/${mode}-${variant}-dia.png`);
    if (mode === 'pc') {
      await inScene((scene) => { const day = scene.dayNight; for (let i = 0; i < 4000; i += 1) { if (day.getState().isNight) break; day.advanceGameMinutes(8); } return true; });
      await delay(1500);
      await capture(`props_ref/${mode}-${variant}-noite.png`);
    }
    console.log('VARIANTE', variant, 'ok');
  }
});
