import { runInChrome } from '../../../scripts/runtime-harness.mjs';

// Investigação (sem alterar nada): mapeia o bloco quadrado da captura da fogueira (PC 1280x720) para o mundo.
const probes = [[1145, 340], [1110, 305], [1180, 375], [1145, 305], [1110, 375]];
await runInChrome({ name: 'investigar-bloco', port: 9373, width: 1280, height: 720 }, async ({ inScene, freshStart, delay }) => {
  await freshStart();
  const out = await inScene((scene, pts) => {
    scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue();
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    scene.enemyDirector.spawnTimer = 1e9; scene.player.invulnerable = 999999;
    const day = scene.dayNight;
    for (let i = 0; i < 4000; i += 1) { const st = day.getState(); if (st.phase === 'day' && st.hour >= 10 && st.hour <= 14) break; day.advanceGameMinutes(8); }
    scene.timeState = day.getState();
    scene.player.body.reset(scene.camp.x, scene.camp.y + 60);
    scene.campaign.syncWorld();
    scene.cameras.main.centerOn(scene.camp.fire?.x ?? scene.camp.x, (scene.camp.fire?.y ?? scene.camp.y) + 20);
    const cam = scene.cameras.main;
    return { zoom: cam.zoom, scroll: [cam.scrollX, cam.scrollY], width: cam.width, height: cam.height, world: pts.map(([x, y]) => { const p = cam.getWorldPoint(x, y); return [x, y, Math.round(p.x), Math.round(p.y)]; }) };
  }, probes);
  await delay(300);
  console.log('INVESTIGACAO', JSON.stringify(out));
});
