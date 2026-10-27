import { check, runInChrome } from './runtime-harness.mjs';

// Fase 15: renascimento (nível 150 -> 1, estrela no HUD, bônus) e arena de chefes.
await runInChrome({ name: 'rebirth', port: 9397, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(300);

  // Renascimento.
  const re = await inScene((scene) => {
    const early = scene.rebirthHero();
    scene.progression.level = 150;
    scene.progression.xp = 0;
    const gear = scene.gear.bag.length;
    const r = scene.rebirthHero();
    scene.ui.update(scene.player, scene.inventory, scene.progression, scene.economy, scene.camp, scene.timeState, null, null, null, null, false, scene.enemies, scene.world);
    return { early: early.ok, ok: r.ok, level: scene.progression.level, n: scene.progression.rebirths, hud: scene.ui.xpLabel.text, gearKept: scene.gear.bag.length === gear };
  });
  await capture('renascimento.png');
  check(!re.early && re.ok && re.level === 1 && re.n === 1 && re.hud.includes('★1') && re.gearKept, `Renascer: ${JSON.stringify(re)}`);

  // Arena: onda 1 nasce, vence, registra recorde e vai à onda 2.
  const arena = await inScene(async (scene) => {
    scene.arenaAction('start');
    const bosses = scene.arena.bosses.length;
    const wave1 = scene.arena.wave;
    for (const b of [...scene.arena.bosses]) scene.defeatEnemy(b);
    await new Promise((r) => setTimeout(r, 600));
    const record = scene.arena.record;
    await new Promise((r) => setTimeout(r, 3800));
    const wave2 = scene.arena.wave;
    scene.arenaAction('leave');
    return { bosses, wave1, record, wave2, active: scene.arena.active };
  });
  check(arena.bosses === 1 && arena.wave1 === 1 && arena.record === 1 && arena.wave2 === 2 && !arena.active, `Arena: ${JSON.stringify(arena)}`);

  // Save e recarga.
  await inScene((scene) => { scene.save(); return true; });
  await reload();
  const after = await inScene((scene) => ({ n: scene.progression.rebirths, record: scene.arena.record }));
  check(after.n === 1 && after.record === 1, `Save: ${JSON.stringify(after)}`);
});
