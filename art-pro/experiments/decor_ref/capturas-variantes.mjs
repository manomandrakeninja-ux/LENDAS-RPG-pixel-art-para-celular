import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Compara v02 (atual), ref 32, 24 e 16 px no quadro inteiro (dia e noite), com a mesma seleção reduzida.
// Uso: node capturas-variantes.mjs pc|mobile. A troca é só na memória do navegador.
const mode = process.argv[2] ?? 'pc';
const root = path.resolve('art-pro/experiments/decor_ref');
const KEEP = new Set(['flor-amarela-1', 'flor-roxa-rosa', 'flor-amarela-rosa', 'cogumelos-1', 'cogumelos-2']);
const VARIANTS = [
  { label: 'v02', dir: null },
  { label: 'ref32', dir: root, files: path.join(root, 'objetos') },
  { label: 'ref24', dir: path.join(root, '24px'), files: path.join(root, '24px') },
  { label: 'ref16', dir: path.join(root, '16px'), files: path.join(root, '16px') }
];
const pack = (variant) => {
  if (!variant.dir) return [];
  const manifest = JSON.parse(fs.readFileSync(path.join(variant.dir, 'manifest.json'), 'utf8'));
  return manifest.filter((e) => KEEP.has(e.label)).map((e) => ({ label: e.label, url: `data:image/png;base64,${fs.readFileSync(path.join(variant.files, e.file)).toString('base64')}` }));
};
const sets = Object.fromEntries(VARIANTS.map((v) => [v.label, pack(v)]));
const outDir = path.join(root, 'capturas');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync('.tmp/capturas/decor_ref', { recursive: true });

const port = mode === 'mobile' ? 9385 : 9384;
await runInChrome({ name: `decor-var-${mode}`, port, width: mode === 'mobile' ? 390 : 1280, height: mode === 'mobile' ? 844 : 720, mobile: mode === 'mobile' }, async ({ inScene, capture, freshStart, delay }) => {
  for (const variant of VARIANTS) {
    await freshStart();
    await inScene(async (scene, args) => {
      scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      scene.enemyDirector.spawnTimer = 1e9;
      scene.player.invulnerable = 999999;
      scene.player.body.reset(scene.camp.x + 300, scene.camp.y - 220);
      scene.cameras.main.centerOn(scene.camp.x + 300, scene.camp.y - 220);
      // Horário de dia explícito (o relógio persiste entre cargas da página).
      const day = scene.dayNight;
      for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
      scene.timeState = day.getState();
      if (!args.set.length) return 0;
      const v02 = [];
      for (const chunk of scene.regionWorld.chunks.values()) {
        if (!chunk.active) continue;
        for (const image of chunk.objects) if (image.texture?.key === 'vale-decor') v02.push(image);
      }
      const structures = scene.harvestStructures?.state?.structures ?? [];
      const keyOf = [];
      for (let i = 0; i < args.set.length; i += 1) {
        const img = new Image(); img.src = args.set[i].url; await img.decode();
        if (!scene.textures.exists(`var-${args.label}-${i}`)) scene.textures.addImage(`var-${args.label}-${i}`, img);
        keyOf.push(`var-${args.label}-${i}`);
      }
      let placed = 0;
      v02.forEach((image, i) => {
        image.setVisible(false);
        if (i % 3 !== 0) return; // densidade: um terço das posições da v02
        if (structures.some((s) => Math.hypot(s.x - image.x, s.y - image.y) < 90)) return; // longe de árvores e da mina
        const sprite = scene.add.image(image.x, image.y, keyOf[placed % keyOf.length]).setOrigin(0.5, 0.92).setDepth(-997);
        scene.hudCamera?.ignore(sprite);
        placed += 1;
      });
      return placed;
    }, { set: sets[variant.label], label: variant.label });
    await delay(1200);
    await capture(`decor_ref/${mode}-${variant.label}-dia.png`);
    await inScene((scene) => {
      const day = scene.dayNight;
      for (let i = 0; i < 4000; i += 1) { if (day.getState().isNight) break; day.advanceGameMinutes(8); }
      return true;
    });
    await delay(1500);
    await capture(`decor_ref/${mode}-${variant.label}-noite.png`);
    console.log('VARIANTE', variant.label, 'ok');
  }
});
