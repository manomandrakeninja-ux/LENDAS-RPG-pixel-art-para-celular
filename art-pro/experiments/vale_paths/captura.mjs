import fs from 'node:fs';
import path from 'node:path';
import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Prévia temporária dos caminhos (v01) no jogo real. Só memória do navegador; nada do projeto muda.
// 1) cobre as células de caminho com grama v05 (frame do grass-sheet); 2) põe, por vértice, o quadro dual com a
// máscara dos 4 quadrantes (TL 1, TR 2, BL 4, BR 8 = célula é caminho). Uso: node captura.mjs <rotulo> [pc|mobile]
const label = process.argv[2] ?? 'previa';
const mode = process.argv[3] ?? 'pc';
const version = process.env.VP_VERSION ?? 'v01';
const root = path.resolve(version === 'v02' ? 'art-pro/experiments/vale_paths/v02' : 'art-pro/experiments/vale_paths');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const tiles = {};
for (const list of Object.values(manifest)) for (const e of list) {
  tiles[e.name] = `data:image/png;base64,${fs.readFileSync(path.join(root, 'tiles', e.name + '.png')).toString('base64')}`;
}
const names = Object.keys(tiles);
const masks = Object.fromEntries(Object.entries(manifest).map(([m, list]) => [m, list.map((e) => e.name)]));
const outDir = path.resolve('art-pro/experiments/vale_paths/capturas');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync('.tmp/capturas/vale_paths', { recursive: true });

await runInChrome({ name: `vale-paths-${label}-${mode}`, port: mode === 'pc' ? 9378 : 9377, width: mode === 'pc' ? 1280 : 390, height: mode === 'pc' ? 720 : 844, mobile: mode !== 'pc' }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();
  const spots = await inScene((scene) => {
    scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9; scene.player.invulnerable = 999999;
    const day = scene.dayNight;
    for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
    scene.timeState = day.getState();
    scene.player.body.reset(scene.camp.x, scene.camp.y + 60);
    scene.campaign.syncWorld();
    // Lia só entra no acampamento depois do resgate (missão do sobrevivente). Na prévia ela é criada só em memória.
    if (!scene.campaign.npcs.has('curandeira')) scene.campaign.createNpc('curandeira');
    // Só na prévia: impede que o syncWorld remova a Lia quando o herói sai do acampamento para o enquadramento.
    scene.campaign.syncWorld = () => {};
    const lia = scene.campaign.npcs.get('curandeira');
    return { fogueira: [scene.camp.fire?.x ?? scene.camp.x, (scene.camp.fire?.y ?? scene.camp.y) + 20], curandeira: lia ? [lia.x, lia.y] : [scene.camp.x + 112, scene.camp.y + 112], trilha: [scene.camp.x, scene.camp.y + 260] };
  });
  for (const [spotName, pt] of Object.entries(spots)) {
    if (process.env.VP_SPOTS && !process.env.VP_SPOTS.split(',').includes(spotName)) continue;
    if (!pt) continue;
    await inScene(async (scene, args) => {
      const rw = scene.regionWorld; const cols = rw.grid.cols; const rows = rw.grid.rows;
      for (const [name, url] of Object.entries(args.tiles)) {
        const img = new Image(); img.src = url; await img.decode();
        if (!scene.textures.exists(`vp-${name}`)) scene.textures.addImage(`vp-${name}`, img);
      }
      const isPath = (c, r) => {
        if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
        const i = r * cols + c;
        if (rw.grid.terrain[i] === 16) return true; // T.ROAD
        const g = rw.layout.ground[i];
        return typeof g === 'number' && g >= 48 && g < 60; // trilha do acampamento
      };
      const [px, py] = args.pt;
      const c0 = Math.floor(px / 48); const r0 = Math.floor(py / 48); const R = 14;
      const hashv = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
      let covered = 0; let dual = 0;
      for (let r = r0 - R; r <= r0 + R; r += 1) for (let c = c0 - R; c <= c0 + R; c += 1) {
        if (!isPath(c, r)) continue;
        // Cobre a célula com grama v05 (frame da folha), para tirar a estrada organica daquele ladrilho.
        const frame = hashv(c, r) % 48;
        scene.add.image(c * 48, r * 48, 'grass', frame).setOrigin(0, 0).setDepth(-998.9);
        covered += 1;
      }
      for (let vr = r0 - R; vr <= r0 + R + 1; vr += 1) for (let vc = c0 - R; vc <= c0 + R + 1; vc += 1) {
        const tl = isPath(vc - 1, vr - 1) ? 1 : 0; const tr = isPath(vc, vr - 1) ? 2 : 0;
        const bl = isPath(vc - 1, vr) ? 4 : 0; const br = isPath(vc, vr) ? 8 : 0;
        const mask = tl + tr + bl + br;
        if (!mask) continue;
        const list = args.masks[String(mask)];
        const name = list[hashv(vc, vr) % list.length];
        scene.add.image(vc * 48 - 24, vr * 48 - 24, `vp-${name}`).setOrigin(0, 0).setDepth(-998.8);
        dual += 1;
      }
      return { covered, dual };
    }, { tiles, masks, pt });
    await delay(1200);
    await inScene((scene, p) => { scene.player.body.reset(p[0] - 40, p[1] + 14); scene.cameras.main.centerOn(p[0], p[1]); return true; }, pt);
    await delay(1000);
    await capture(`vale_paths/${label}-${spotName}-${mode}.png`);
    fs.copyFileSync(path.join('.tmp/capturas/vale_paths', `${label}-${spotName}-${mode}.png`), path.join(outDir, `${label}-${spotName}-${mode}.png`));
    console.log('CAPTURA', label, spotName, mode);
  }
});
