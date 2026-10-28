import { check, runInChrome } from './runtime-harness.mjs';
import { isRainyDay } from '../src/data/weather.js';

// Regressão: o jogo travava ao lutar contra o Lobo Cinzento (missão 10) no celular, à noite e com chuva.
// Pula até a missão 10, luta até matar o lobo com cada skin e confere que o loop segue rodando.
let RAINY_DAY = 2;
while (!isRainyDay(RAINY_DAY)) RAINY_DAY += 1;
const SKINS = (process.env.WOLF_SKINS ?? 'male,female,swordsman,warrior').split(',');

await runInChrome({ name: 'wolfboss', port: 9371, width: 390, height: 844, mobile: true }, async ({ inScene, capture, freshStart, delay, errors }) => {
  const results = [];
  for (const skin of SKINS) {
    await freshStart();
    const setup = await inScene((scene, skin, rainyDay) => {
      const campaign = scene.campaign;
      campaign.ui.closeChapter?.();
      campaign.ui.closeDialogue?.();
      campaign.state.introShown = true;
      scene.enemyDirector.spawnTimer = 1e9;
      for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
      for (let n = 1; n <= 9; n += 1) campaign.state.missions[`m00${n}`].state = 'done';
      // O "início limpo" regrava o save da rodada anterior ao sair da página: zera a missão 10.
      campaign.state.missions.m010.state = 'available';
      campaign.state.missions.m010.progress = [0];
      campaign.state.missions.m010.rewarded = false;
      delete campaign.state.sites.covil;
      campaign.accept('m010');
      campaign.ui.closeDialogue?.();
      campaign.ui.reward.hidden = true;
      scene.player.setGender(skin);
      // Noite (os riscos de chuva do ambiente aparecem à noite) num dia de chuva.
      scene.dayNight.cycleTime = 250;
      scene.dayNight.dayCount = rainyDay;
      scene.player.maxHealth = 99999;
      scene.player.health = 99999;
      campaign.syncWorld();
      const site = campaign.sites.get('covil');
      if (site) scene.player.body.reset(site.def.x - 40, site.def.y);
      return { state: campaign.state.stateOf('m010'), site: Boolean(site), sites: [...campaign.sites.keys()] };
    }, skin, RAINY_DAY);
    check(setup.state === 'active' && setup.site, `Missão 10 não ficou ativa (${skin}): ${JSON.stringify(setup)}`);
    await delay(800);
    const fight = await inScene(async (scene) => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const wolf = () => [...scene.campaign.questEnemies].find((enemy) => enemy.questTag === 'loboCinzento');
      const started = Date.now();
      let boss = wolf();
      const log = [];
      let lastNow = scene.time.now;
      let stalls = 0;
      while (Date.now() - started < 45000) {
        boss = wolf() ?? boss;
        if (scene.campaign.state.stateOf('m010') === 'done') break;
        scene.campaign.ui.closeDialogue?.();
        while (scene.progression.hasPendingChoice) scene.chooseLevelUp('health');
        scene.player.health = scene.player.maxHealth;
        if (scene.dayNight.cycleTime > 320) scene.dayNight.cycleTime = 250;
        if (boss && !boss.dead) scene.player.body.reset(boss.x - 30, boss.y);
        scene.attackNearby();
        await wait(120);
        const now = scene.time.now;
        if (now === lastNow) stalls += 1; else stalls = 0;
        lastNow = now;
        if (stalls > 10) { log.push('scene time stopped'); break; }
      }
      return {
        found: Boolean(boss), health: boss?.health, max: boss?.maxHealth, dead: Boolean(boss?.dead),
        mission: scene.campaign.state.stateOf('m010'), entry: scene.campaign.state.missions.m010, stalls, log, isNight: scene.timeState?.isNight,
        frame: scene.game.loop.frame
      };
    });
    const frameBefore = fight.frame;
    await delay(1200);
    const after = await inScene((scene) => ({ frame: scene.game.loop.frame, now: scene.time.now }));
    results.push({ skin, ...fight, frameAfter: after.frame });
    await capture(`wolfboss-${skin}.png`);
    check(fight.isNight, `A luta não aconteceu à noite (${skin}).`);
    check(fight.found && fight.mission === 'done', `Lobo Cinzento não morreu (${skin}): ${JSON.stringify(fight)} erros: ${JSON.stringify(errors)}`);
    check(after.frame > frameBefore + 10, `Loop do jogo parou (${skin}): ${frameBefore} → ${after.frame}`);
  }
  return { results };
});
