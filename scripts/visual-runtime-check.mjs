import { check, runInChrome } from './runtime-harness.mjs';

// Gráficos e textos: fonte pixelada, rótulos, ladrilhos de 48 px, inimigos elite
// sem moldura e correção de saves com ataque/defesa base negativos.
await runInChrome({ name: 'visual', port: 9357, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, delay }) => {
  await freshStart();

  const texts = await inScene((scene) => {
    const labels = Object.values(scene.camp.buildings).map((building) => building.label).filter(Boolean);
    return {
      hudFont: scene.ui.healthLabel.style.fontFamily,
      labelFont: labels[0].style.fontFamily,
      labelTexts: labels.map((label) => label.text),
      labelScale: labels[0].scaleX,
      resolution: scene.ui.healthLabel.style.resolution,
      fontReady: document.fonts.check('8px "Press Start 2P"'),
      grassFrame: scene.textures.get('grass').get(0).width
    };
  });
  check(texts.hudFont === '"Press Start 2P"' && texts.labelFont === '"Press Start 2P"', `Fonte sem aspas: ${JSON.stringify(texts)}`);
  check(texts.fontReady, 'A fonte Press Start 2P não carregou.');
  check(texts.resolution >= 2, `Texto em resolução baixa: ${texts.resolution}`);
  check(texts.labelTexts.includes('FERREIRO  •  NV 1') && texts.labelTexts.some((text) => text.startsWith('MURALHA')),
    `Rótulos dos prédios: ${JSON.stringify(texts.labelTexts)}`);
  check(texts.grassFrame === 48, `Ladrilho do chão deveria ter 48 px: ${texts.grassFrame}`);

  // O elite não tem mais moldura: os cantos da textura ficam transparentes.
  const elite = await inScene((scene) => {
    const Enemy = scene.enemies[0]?.constructor;
    const enemy = new Enemy(scene, scene.player.x + 60, scene.player.y, 'slime', { elite: true, isNight: false });
    scene.enemies.push(enemy);
    const source = scene.textures.get(enemy.sprite.texture.key).getSourceImage();
    const context = source.getContext('2d');
    // Quadros quadrados lado a lado (2 nos antigos, 5 nos pintados): olha só o primeiro.
    const corners = [[0, 0], [source.height - 1, 0], [0, source.height - 1], [source.height - 1, source.height - 1]]
      .map(([x, y]) => context.getImageData(x, y, 1, 1).data[3]);
    const center = context.getImageData(source.height / 2, source.height * 0.75, 1, 1).data[3];
    return { corners, center };
  });
  check(elite.corners.every((alpha) => alpha === 0), `Moldura no elite: ${JSON.stringify(elite)}`);
  check(elite.center === 255, `Elite sem desenho no centro: ${JSON.stringify(elite)}`);

  // Save corrompido com atributos base negativos volta ao valor inicial.
  await inScene((scene) => {
    scene.save();
    scene.skipSave = true;
    const save = JSON.parse(localStorage.getItem('lendas-save-v2'));
    save.player.baseAttack = -244;
    save.player.baseDefense = -64;
    save.player.attack = -244;
    save.player.defense = -64;
    localStorage.setItem('lendas-save-v2', JSON.stringify(save));
    scene.scene.restart();
  });
  await delay(1500);
  const stats = await inScene((scene) => ({
    attack: scene.player.attack,
    defense: scene.player.defense,
    baseAttack: scene.player.baseAttack,
    baseDefense: scene.player.baseDefense
  }));
  check(stats.baseAttack === 12 && stats.baseDefense === 0 && stats.attack >= 12 && stats.defense >= 0,
    `Atributos negativos não foram corrigidos: ${JSON.stringify(stats)}`);

  // O personagem não atravessa a Casa: andando para cima a partir da frente dela, para na base.
  const collision = await inScene(async (scene) => {
    scene.enemyDirector.spawnTimer = 1e9;
    for (const enemy of [...scene.enemies]) scene.enemyDirector.remove(enemy);
    const house = scene.camp.buildings.house.sprite;
    scene.player.body.reset(house.x, house.y + 40);
    const started = performance.now();
    await new Promise((resolve) => {
      const push = () => {
        scene.player.body.setVelocity(0, -160);
        if (performance.now() - started > 1200) return resolve();
        requestAnimationFrame(push);
      };
      push();
    });
    return { houseY: house.y, playerY: Math.round(scene.player.y), obstacles: scene.obstacles.group.getLength() };
  });
  check(collision.playerY > collision.houseY - 4, `O personagem atravessou a Casa: ${JSON.stringify(collision)}`);
  check(collision.obstacles >= 6, `Poucos obstáculos: ${JSON.stringify(collision)}`);

  // A escuridão da noite é um degradê: aparecem vários níveis de transparência,
  // e não só "escuro" e "claro" como no quadriculado antigo.
  const darkness = await inScene((scene) => {
    scene.lighting.draw(0.6, scene.player);
    const data = scene.lighting.context.getImageData(0, 0, scene.lighting.width, scene.lighting.height).data;
    const levels = new Set();
    for (let index = 3; index < data.length; index += 4) levels.add(data[index]);
    return { levels: levels.size };
  });
  check(darkness.levels > 20, `Escuridão sem degradê: ${JSON.stringify(darkness)}`);

  // Barra rápida: Mochila (abre o painel), Comer e Poção.
  const quick = await inScene((scene) => {
    scene.inventory.items.food = 3;
    scene.inventory.items.potion = 1;
    scene.player.health = 40;
    const ids = scene.ui.quickButtons.map((button) => button.id);
    scene.useHotkey('2');
    const afterEat = { health: scene.player.health, food: scene.inventory.items.food };
    scene.toggleBackpack();
    const open = scene.backpackPanel.isOpen;
    const useButtons = document.querySelectorAll('#backpack-grid [data-bag="use"]').length;
    document.querySelector('#backpack-grid [data-bag="use"][data-type="potion"]').click();
    const afterPotion = { health: scene.player.health, potion: scene.inventory.items.potion };
    scene.toggleBackpack();
    return { ids, afterEat, open, useButtons, afterPotion, closed: !scene.backpackPanel.isOpen, splash: Boolean(document.getElementById('splash')) };
  });
  check(quick.ids.join() === 'backpack,eat,potion,journal', `Barra rápida: ${JSON.stringify(quick)}`);
  check(quick.afterEat.health === 52 && quick.afterEat.food === 2, `Comer pela barra rápida: ${JSON.stringify(quick)}`);
  check(quick.open && quick.closed && quick.useButtons === 2, `Painel da mochila: ${JSON.stringify(quick)}`);
  check(quick.afterPotion.potion === 0 && quick.afterPotion.health > 52, `Poção pelo painel: ${JSON.stringify(quick)}`);
  check(!quick.splash, 'A tela de início não deveria aparecer nos testes automáticos.');

  await inScene((scene) => { scene.player.body.reset(scene.camp.x - 60, scene.camp.y + 40); });
  await delay(600);
  const screenshot = await capture('visual-acampamento.png');
  return { texts, elite, stats, collision, darkness, quick, screenshot };
});
