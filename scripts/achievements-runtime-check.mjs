import { check, runInChrome } from './runtime-harness.mjs';

// Fase 14: missões diárias, conquistas, painel (tecla T), título sob o nome e save.
await runInChrome({ name: 'achievements', port: 9396, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(300);

  const daily = await inScene((scene) => {
    const q = scene.achievements.state.daily.quests;
    return { n: q.length, types: q.map((x) => x.type) };
  });
  check(daily.n === 3 && daily.types.join() === 'kills,gathered,enhanceTries', `Diárias: ${JSON.stringify(daily)}`);

  // Matar, coletar e aprimorar avançam as diárias e pagam a recompensa.
  const play = await inScene((scene) => {
    const coins = scene.economy.coins;
    scene.achievements.note('kills', 500);
    scene.achievements.onGather({ wood: 500 });
    scene.achievements.onEnhance({ ok: true, success: false, upgrade: 0 });
    const st = scene.achievements.state;
    return { done: st.daily.quests.every((q) => q.done), paid: scene.economy.coins > coins, count: st.count, title: st.titleName };
  });
  check(play.done && play.paid && play.count >= 3 && play.title, `Eventos: ${JSON.stringify(play)}`);

  // Painel pela tecla T e título sob o herói.
  const panel = await inScene(async (scene) => {
    scene.achievements.open();
    await new Promise((r) => setTimeout(r, 150));
    const open = scene.achievements.isOpen && document.querySelectorAll('.achievements__list li').length >= 38;
    const pick = document.querySelector('[data-ach-title]:not(.is-active)');
    const id = pick?.dataset.achTitle;
    pick?.click();
    const chosen = scene.achievements.state.title === id;
    const text = scene.achievements.titleText?.text;
    scene.achievements.close();
    return { open, chosen, text, closed: !scene.achievements.isOpen };
  });
  await capture('conquistas.png');
  check(panel.open && panel.chosen && panel.text && panel.closed, `Painel: ${JSON.stringify(panel)}`);

  // Save e recarga.
  const before = await inScene((scene) => { scene.save(); return scene.achievements.serialize(); });
  await reload();
  const after = await inScene((scene) => scene.achievements.serialize());
  check(after.title === before.title && Object.keys(after.unlocked).length === Object.keys(before.unlocked).length && after.stats.kills === 500, `Save: ${JSON.stringify(after.stats)}`);
});
