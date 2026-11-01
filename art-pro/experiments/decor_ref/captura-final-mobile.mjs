import { runInChrome } from '../../../scripts/runtime-harness.mjs';
await runInChrome({ name: 'decor-v03-mobile', port: 9383, width: 390, height: 844, mobile: true }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); scene.player.body.reset(scene.camp.x + 300, scene.camp.y - 220); scene.cameras.main.centerOn(scene.camp.x + 300, scene.camp.y - 220); return true; });
  await delay(1500);
  await capture('decor_ref/final-v03-mobile-dia.png');
});
