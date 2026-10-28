// Fase 22: arma real nas costas e na mão, ciclo sacar / golpear / segurar 5 s / guardar, ferramenta e dano.
import { check, runInChrome } from './runtime-harness.mjs';

const WEAPONS = ['ferro-weapon-b', 'grokkAxe', 'frostSpear', 'pharaohStaff', 'captainSabre', 'giantClub', 'dragonClaw', 'hydraFang'];

await runInChrome({ name: 'hero', port: 9431 }, async ({ inScene, freshStart, delay, errors }) => {
  await freshStart();
  const snap = () => inScene((scene) => scene.player.animator.snapshot());

  let s = await snap();
  check(s.mode === 'sheathed' && s.backVisible && !s.handVisible, `Começo: arma nas costas: ${JSON.stringify(s)}`);
  check(/^hero-weapon-forge-/.test(s.backTexture), `Sem peça vestida, espada da Forja nas costas: ${s.backTexture}`);

  // Troca de arma: as costas mudam na hora; o golpe usa a mesma arma.
  for (const id of WEAPONS) {
    const ok = await inScene((scene, id) => {
      const item = scene.gear.add(id, 'rare');
      if (!item) return false;
      scene.player.progression && (scene.player.progression.level = Math.max(scene.player.progression.level ?? 1, 150));
      const result = scene.gear.equip(item.uid, 150);
      scene.player.refreshGear();
      return result.ok;
    }, id);
    check(ok, `Não equipou ${id}`);
    await delay(60);
    s = await snap();
    check(s.weaponKey === `hero-weapon-${id}` && s.backTexture?.startsWith(`hero-weapon-${id}-`),
      `Costas sem a arma ${id}: ${JSON.stringify(s)}`);
  }
  // Golpe: saca e a mão segura a arma equipada (a última).
  const last = WEAPONS.at(-1);
  await inScene((scene) => scene.player.showAttack(0));
  await delay(450);
  s = await snap();
  check(s.mode === 'armed' && s.handVisible && !s.backVisible && s.handTexture.startsWith(`hero-weapon-${last}-`),
    `Depois do golpe a arma ${last} fica na mão: ${JSON.stringify(s)}`);
  // Troca durante o combate: a mão muda na hora.
  await inScene((scene) => { const item = scene.gear.add('grokkAxe', 'rare'); scene.gear.equip(item.uid, 150); });
  await delay(80);
  s = await snap();
  check(s.handTexture?.startsWith('hero-weapon-grokkAxe-'), `Trocou a arma no combate e a mão não mudou: ${JSON.stringify(s)}`);
  await delay(3500);
  s = await snap();
  check(s.mode === 'armed', `Ainda segura antes dos 5 s: ${JSON.stringify(s)}`);
  await delay(2200);
  s = await snap();
  check(s.mode === 'sheathed' && s.backVisible && !s.handVisible, `Guardou depois de 5 s: ${JSON.stringify(s)}`);

  // Mineração: arma nas costas, picareta na mão.
  await inScene((scene) => { scene.player.showAttack(0); });
  await delay(300);
  await inScene((scene) => scene.player.startMining(scene.player.x + 30, scene.player.y));
  await delay(600);
  s = await snap();
  check(s.item === 'tool' && s.handTexture?.startsWith('hero-tool-pickaxe') && s.backVisible && s.backTexture.startsWith('hero-weapon-grokkAxe-'),
    `Minerando: ferramenta na mão e arma nas costas: ${JSON.stringify(s)}`);
  await inScene((scene) => scene.player.stopMining());
  await delay(250);
  s = await snap();
  check(s.mode === 'sheathed' && !s.handVisible, `Guardou a ferramenta: ${JSON.stringify(s)}`);

  // Dano: quadro de recuo (coluna 10).
  const hurt = await inScene((scene) => {
    scene.player.invulnerable = 0;
    scene.player.damage(1, { x: scene.player.x + 20, y: scene.player.y });
    return scene.player.animator.stance.pose().col;
  });
  check(hurt === 10, `Dano sem quadro de recuo: ${hurt}`);

  // Todas as skins rodam o mesmo ciclo.
  for (const skin of ['male', 'female', 'swordsman', 'warrior', 'warrior-black']) {
    const frame = await inScene(async (scene, skin) => {
      scene.player.setGender(skin);
      scene.player.showAttack(Math.PI / 2);
      await new Promise((r) => setTimeout(r, 140));
      const early = scene.player.animator.snapshot();
      await new Promise((r) => setTimeout(r, 400));
      return { early, late: scene.player.animator.snapshot() };
    }, skin);
    check(frame.early.frame % 12 >= 5 && frame.late.handVisible, `Skin ${skin} sem pose de golpe: ${JSON.stringify(frame)}`);
  }
  check(errors.length === 0, `Erros no console: ${errors.join(' | ')}`);
  console.log('hero: arma real nas costas/mão, sacar-golpear-segurar-guardar, ferramenta e dano OK');
});
