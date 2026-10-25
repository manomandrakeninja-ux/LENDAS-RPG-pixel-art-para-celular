import { check, runInChrome } from './runtime-harness.mjs';

// Evolução visual dos prédios: aparência por nível, troca durante o jogo, save e recarga.
await runInChrome({ name: 'evolution', port: 9359, width: 1280, height: 800 }, async ({ inScene, capture, reload, delay }) => {
  const setLevels = (level) => inScene((scene, value) => {
    scene.campaign?.ui.closeDialogue();
    scene.enemyDirector.spawnTimer = 1e9;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    for (const key of Object.keys(scene.camp.levels)) scene.camp.levels[key] = value;
    scene.camp.defense.onLevelChanged('wall');
    scene.camp.defense.onLevelChanged('tower');
    scene.camp.refreshVisuals();
    scene.player.body.reset(scene.camp.x, scene.camp.y + 60);
  }, level);
  const read = () => inScene((scene) => {
    const frames = {};
    for (const key of ['campfire', 'farm', 'forge', 'house', 'market']) {
      const sprite = scene.camp.buildings[key].sprite;
      frames[key] = sprite.frame.name;
    }
    const tower = scene.camp.defense.towerBuilding.sprites[0];
    return {
      frames,
      tower: tower?.texture.key,
      wallStage: scene.camp.defense.wallStage,
      children: scene.children.list.length,
      smokeVisible: scene.camp.smoke.visible
    };
  });

  const looks = {};
  for (const level of [1, 2, 3, 4, 5, 7, 8, 10]) {
    await setLevels(level);
    await delay(150);
    looks[level] = await read();
    if ([1, 4, 8].includes(level)) await capture(`evolucao-nivel-${level}.png`);
  }
  check(looks[1].frames.house === 'house-1' && looks[1].frames.forge === 'forge-1' && looks[1].tower === 'tower-1' && looks[1].wallStage === 1,
    `Nível 1: ${JSON.stringify(looks[1])}`);
  check(looks[4].frames.house === 'house' && looks[4].frames.market === 'store' && looks[4].tower === 'tower-stone' && looks[4].wallStage === 4,
    `Nível 4: ${JSON.stringify(looks[4])}`);
  check(looks[8].frames.house === 'house-8' && looks[8].frames.farm === 'farm-8' && looks[8].tower === 'tower-8' && looks[8].wallStage === 8,
    `Nível 8: ${JSON.stringify(looks[8])}`);
  check(looks[1].frames.campfire.startsWith('campfire-') && looks[4].frames.campfire.startsWith('campfire4-') && looks[8].frames.campfire.startsWith('campfire8-'),
    `Fogueira: ${JSON.stringify([looks[1].frames, looks[4].frames, looks[8].frames])}`);
  // Níveis intermediários usam a aparência do estágio.
  const still = (frames) => JSON.stringify({ ...frames, campfire: frames.campfire.split('-')[0] });
  check(still(looks[2].frames) === still(looks[3].frames) && looks[3].frames.house === 'house-1', `Níveis 2–3: ${JSON.stringify([looks[2], looks[3]])}`);
  check(looks[5].frames.house === 'house' && looks[7].frames.house === 'house' && looks[10].frames.house === 'house-8', 'Níveis 5, 7 e 10');
  // Trocar de nível várias vezes não duplica objetos.
  check(looks[10].children <= looks[8].children + 8, `Objetos duplicados: ${looks[8].children} -> ${looks[10].children}`);

  // Melhorar de 3 para 4 durante o jogo troca a arte na hora (com brilho).
  await setLevels(3);
  const upgrade = await inScene((scene) => {
    for (const type of Object.keys(scene.camp.storage)) scene.camp.storage[type] = 9999;
    scene.economy.coins = 99999;
    const before = scene.camp.buildings.house.sprite.frame.name;
    const result = scene.upgradeBuilding('house');
    const sprite = scene.camp.buildings.house.sprite;
    return { ok: result.ok, before, after: sprite.frame.name, level: scene.camp.levels.house, hitWidth: sprite.input.hitArea.width, interactive: Boolean(sprite.input) };
  });
  check(upgrade.ok && upgrade.before === 'house-1' && upgrade.after === 'house' && upgrade.level === 4 && upgrade.interactive,
    `Melhoria durante o jogo: ${JSON.stringify(upgrade)}`);

  // Muralha octogonal: o personagem não atravessa os lados e passa pelo portão sul.
  await setLevels(8);
  const wall = await inScene(async (scene) => {
    const camp = scene.camp;
    const walk = (x, y, vx, vy) => new Promise((resolve) => {
      scene.player.body.reset(x, y);
      const started = performance.now();
      const push = () => {
        scene.player.body.setVelocity(vx, vy);
        if (performance.now() - started > 1300) resolve({ x: Math.round(scene.player.x), y: Math.round(scene.player.y) });
        else requestAnimationFrame(push);
      };
      push();
    });
    const east = await walk(camp.x + 250, camp.y, 170, 0);
    const north = await walk(camp.x + 40, camp.y - 250, 0, -170);
    const diagonal = await walk(camp.x + 180, camp.y - 180, 120, -120);
    const gate = await walk(camp.x, camp.y + 250, 0, 170);
    scene.player.body.reset(camp.x, camp.y + 60);
    return { radius: camp.defense.radius, camp: { x: camp.x, y: camp.y }, east, north, diagonal, gate };
  });
  check(wall.east.x < wall.camp.x + wall.radius && wall.north.y > wall.camp.y - wall.radius &&
    Math.hypot(wall.diagonal.x - wall.camp.x, wall.diagonal.y - wall.camp.y) < wall.radius / Math.cos(Math.PI / 8),
  `O personagem atravessou a muralha: ${JSON.stringify(wall)}`);
  check(wall.gate.y > wall.camp.y + wall.radius + 20, `O portão não deixou passar: ${JSON.stringify(wall)}`);

  // Salvar e recarregar mantém a aparência.
  await setLevels(8);
  await inScene((scene) => scene.save());
  await reload();
  const reloaded = await read();
  check(reloaded.frames.house === 'house-8' && reloaded.frames.forge === 'forge-8' && reloaded.tower === 'tower-8' && reloaded.wallStage === 8,
    `Depois de recarregar: ${JSON.stringify(reloaded)}`);
  return { looks: { 1: looks[1], 4: looks[4], 8: looks[8] }, upgrade, reloaded };
});
