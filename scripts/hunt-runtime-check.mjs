import { check, runInChrome } from './runtime-harness.mjs';

// Fase 4: caçadas (quadro da Fogueira, contador, save), seta de navegação, atiradores,
// paralisia, fúria, recuo à distância e bloqueio do escudo.
await runInChrome({ name: 'hunt', port: 9394, width: 1280, height: 800 }, async ({ inScene, capture, freshStart, reload, delay }) => {
  await freshStart();
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); return true; });
  await delay(300);

  // 1. Quadro de caçadas na Fogueira: aceita "Rato", contador na tela, mata e entrega.
  const board = await inScene(async (scene) => {
    scene.openBuilding('campfire');
    await new Promise((resolve) => setTimeout(resolve, 250));
    const html = document.getElementById('building-menu-content')?.textContent ?? '';
    const hasBoard = html.includes('Quadro de Caçadas');
    scene.buildingMenu.close();
    const accepted = scene.huntAction('accept', 'vale:rat');
    const counter = document.querySelector('.hunt-counter');
    const text = counter?.textContent ?? '';
    const visible = Boolean(counter && !counter.hidden);
    const second = scene.huntAction('accept', 'vale:slime');
    return { hasBoard, accepted: accepted.ok, text, visible, secondRefused: !second.ok };
  });
  check(board.hasBoard && board.accepted && board.visible && /Rato 0\/\d+/.test(board.text) && board.secondRefused,
    `Quadro e contador: ${JSON.stringify(board)}`);

  const finished = await inScene(async (scene) => {
    const need = scene.hunts.hunt.count;
    for (let i = 0; i < need; i += 1) {
      const rat = scene.enemyDirector.addEnemy('rat', scene.player.x + 300, scene.player.y + 300, {});
      scene.damageEnemy(rat, 99999);
    }
    const counter = document.querySelector('.hunt-counter');
    const done = { complete: scene.hunts.complete, green: counter.classList.contains('is-complete'), text: counter.textContent };
    const before = { xp: scene.progression.xp, level: scene.progression.level, coins: scene.economy.coins };
    const result = scene.huntAction('turnin');
    return { done, result: { ok: result.ok, xp: result.xp, coins: result.coins }, coinsGained: scene.economy.coins - before.coins, cleared: !scene.hunts.hunt };
  });
  await capture('cacada-concluida.png');
  check(finished.done.complete && finished.done.green && finished.result.ok && finished.coinsGained === finished.result.coins && finished.cleared,
    `Cacada concluida e entregue: ${JSON.stringify(finished)}`);

  // 2. Seta de navegação: aponta para a região da caçada, liga/desliga pelo botão.
  const arrow = await inScene(async (scene) => {
    scene.hunts.active = { id: 'antiga:goblin', progress: 0 };
    scene.huntUI.refresh();
    scene.player.setPosition(scene.worldBounds.camp.x, scene.worldBounds.camp.y + 85);
    scene.huntUI.update();
    const target = scene.huntUI.currentTarget;
    const shown = !document.querySelector('.nav-arrow').hidden;
    document.querySelector('.nav-toggle').click();
    scene.huntUI.update();
    const hiddenAfterToggle = document.querySelector('.nav-arrow').hidden;
    const label = document.querySelector('.nav-toggle').textContent;
    document.querySelector('.nav-toggle').click();
    scene.huntUI.update();
    return { target: target && { kind: target.kind, name: target.name }, shown, hiddenAfterToggle, label, backOn: !document.querySelector('.nav-arrow').hidden };
  });
  await capture('seta-navegacao.png');
  check(arrow.target?.kind === 'hunt' && arrow.shown && arrow.hiddenAfterToggle && /DESLIGADA/.test(arrow.label) && arrow.backOn,
    `Seta de navegacao: ${JSON.stringify(arrow)}`);

  // 3. Save: a caçada ativa volta depois de recarregar.
  await inScene((scene) => { scene.hunts.onKill('goblin'); scene.save(); return true; });
  await reload();
  const restored = await inScene((scene) => ({ id: scene.hunts.active?.id ?? null, progress: scene.hunts.active?.progress ?? -1 }));
  check(restored.id === 'antiga:goblin' && restored.progress === 1, `Save da cacada: ${JSON.stringify(restored)}`);
  await inScene((scene) => { scene.campaign.ui.closeChapter(); scene.campaign.ui.closeDialogue(); scene.hunts.abandon(); return true; });

  // 4. Atirador (bruxa): atira, recua 2 passos e fica parada lutando.
  const shooter = await inScene(async (scene) => {
    scene.player.setPosition(3950, 2850);
    scene.player.health = scene.player.maxHealth = 99999;
    let shots = 0;
    const fire = scene.enemyProjectiles.fire.bind(scene.enemyProjectiles);
    scene.enemyProjectiles.fire = (...args) => { shots += 1; return fire(...args); };
    const witch = scene.enemyDirector.addEnemy('witch', 3950 + 90, 2850, {});
    witch.noFlee = true;
    let sawHold = false; let maxSteps = 0;
    for (let i = 0; i < 80; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      maxSteps = Math.max(maxSteps, witch.retreatSteps);
      if (witch.holdMs > 0) sawHold = true;
      // O herói persegue a bruxa: cada aproximação faz ela recuar um passo; no 2º ela fica parada.
      scene.player.setPosition(witch.x - 70, witch.y);
    }
    const distance = Math.hypot(witch.x - scene.player.x, witch.y - scene.player.y);
    scene.damageEnemy(witch, 999999);
    return { shots, sawHold, maxSteps, distance: Math.round(distance) };
  });
  check(shooter.shots > 0 && shooter.sawHold && shooter.maxSteps >= 0 && shooter.distance > 40, `Atirador recua e atira: ${JSON.stringify(shooter)}`);

  // 5. Paralisia de 1 s e fúria abaixo de 30% de vida.
  const effects = await inScene(async (scene) => {
    scene.player.setPosition(3950, 2850);
    scene.player.paralyze(1000);
    const frozen = scene.player.paralyzedMs;
    // A paralisia corre no delta do jogo, que o Phaser suaviza e corta (quadros > 200 ms, aba sem foco):
    // com a máquina carregada, 1,3 s de relógio podiam ser < 1 s de jogo. Espera pelo jogo, com limite.
    const t0 = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const stillFrozen = scene.player.paralyzedMs > 0;
    while (scene.player.paralyzedMs > 0 && performance.now() - t0 < 8000) await new Promise((resolve) => setTimeout(resolve, 50));
    const freed = stillFrozen ? scene.player.paralyzedMs : -1;
    const orc = scene.enemyDirector.addEnemy('orc', 3000, 3000, {});
    const calm = { speed: orc.speed, damage: orc.currentDamage, enraged: orc.enraged };
    orc.health = Math.floor(orc.maxHealth * 0.25);
    const mad = { speed: orc.speed, damage: orc.currentDamage, enraged: orc.enraged };
    scene.damageEnemy(orc, 999999);
    return { frozen, freed, calm, mad };
  });
  check(effects.frozen === 1000 && effects.freed === 0 && !effects.calm.enraged && effects.mad.enraged &&
    effects.mad.speed > effects.calm.speed && effects.mad.damage > effects.calm.damage, `Paralisia e furia: ${JSON.stringify(effects)}`);

  // 6. Escudo: bloqueia só os 2 primeiros atacantes de cada janela de 1 s.
  const shield = await inScene(async (scene) => {
    const player = scene.player;
    player.health = player.maxHealth = 99999;
    const hit = (source) => { player.invulnerable = 0; const before = player.health; player.damage(200, source); return { dealt: before - player.health, blocked: player.lastBlockRatio }; };
    const a = { x: player.x + 20, y: player.y }; const b = { x: player.x - 20, y: player.y }; const c = { x: player.x, y: player.y + 20 };
    const noShield = hit(a);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    scene.gear.add('woodBuckler', 'common');
    scene.equipGear(scene.gear.bag[scene.gear.bag.length - 1].uid);
    const equipped = player.hasShield;
    const first = hit(a); const second = hit(b); const third = hit(c);
    // A janela do escudo usa scene.time.now (atualizado só a cada quadro): com quadros lentos, 1,1 s de
    // relógio podia não passar de 1 s no jogo. Espera o relógio do jogo andar 1,05 s.
    const w0 = scene.time.now;
    while (scene.time.now - w0 < 1050) await new Promise((resolve) => setTimeout(resolve, 50));
    const nextWindow = hit(c);
    return { equipped, noShield, first, second, third, nextWindow };
  });
  check(shield.equipped && shield.noShield.blocked === 0 && shield.first.blocked > 0 && shield.second.blocked > 0 &&
    shield.third.blocked === 0 && shield.first.dealt < shield.third.dealt && shield.nextWindow.blocked > 0, `Escudo: ${JSON.stringify(shield)}`);
});
