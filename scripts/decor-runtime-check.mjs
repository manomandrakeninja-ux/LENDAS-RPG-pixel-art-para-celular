import { check, runInChrome } from './runtime-harness.mjs';

// Decoração do Vale (atlas 'vale-decor'): quantidade ativa, exclusões, determinismo e save.
await runInChrome({ name: 'decor', port: 9389, width: 1280, height: 720 }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(600);
  const result = await inScene((scene) => {
    const rw = scene.regionWorld;
    const decor = [];
    for (const chunk of rw.chunks.values()) {
      if (!chunk.active) continue;
      for (const image of chunk.objects) if (image.texture?.key === 'vale-decor') decor.push({ x: image.x, y: image.y, frame: image.frame.name });
    }
    const cols = rw.grid.cols;
    const onPath = decor.filter((d) => {
      const col = Math.floor(d.x / 48); const row = Math.floor(d.y / 48);
      const g = rw.layout.ground[row * cols + col];
      return typeof g === 'number' && g >= 48 && g < 60;
    }).length;
    const nearCamp = decor.filter((d) => Math.hypot(d.x - 1440, d.y - 1080) < 300).length;
    const structures = scene.harvestStructures?.state?.structures ?? [];
    const nearStructure = decor.filter((d) => structures.some((s) => Math.hypot(s.x - d.x, s.y - d.y) < 36)).length;
    const frames = new Set(decor.map((d) => d.frame));
    // Determinismo: o mesmo bloco planejado duas vezes dá a mesma lista.
    const sample = [...rw.chunks.entries()].find(([, chunk]) => chunk.active);
    const [key] = sample;
    const [cx, cy] = key.split(',').map(Number);
    const again = JSON.stringify(rw.planChunk(cx, cy).props.filter((p) => p.decor));
    const first = JSON.stringify(rw.chunks.get(key).plan.props.filter((p) => p.decor));
    const save = Object.keys(rw.serialize()).sort().join(',');
    return {
      active: decor.length, distinctFrames: frames.size, onPath, nearCamp, nearStructure,
      deterministic: again === first, save, decorKeys: decor.length ? decor[0].frame : null
    };
  });
  console.log('RESULT', JSON.stringify(result));
  check(result.active > 0, `Nenhuma decoração ativa no Vale: ${JSON.stringify(result)}`);
  check(result.distinctFrames >= 4, `Pouca variedade de sprites (${result.distinctFrames} de 5).`);
  check(result.onPath === 0, `Decoração sobre a trilha: ${result.onPath}.`);
  check(result.nearCamp === 0, `Decoração perto do acampamento: ${result.nearCamp}.`);
  check(result.nearStructure === 0, `Decoração sobre coleta/estrutura: ${result.nearStructure}.`);
  check(result.deterministic, 'O plano de decoração de um bloco mudou entre duas gerações.');
  check(result.save === 'bosses,chestDays,chests,discovered,harvested,travelerGifts', `Chaves do save da região mudaram: ${result.save}`);
  await capture('decor/runtime-dia.png');
  await inScene((scene) => {
    const day = scene.dayNight;
    for (let i = 0; i < 4000; i += 1) { if (day.getState().isNight) break; day.advanceGameMinutes(8); }
    return true;
  });
  await delay(1500);
  await capture('decor/runtime-noite.png');
});
