import Phaser from 'phaser';
import { COMBAT_CONFIG } from '../data/combat.js';
import { ShieldBlocker, blockedDamage } from './ShieldBlock.js';
import { heroTexture, normalizeGender } from './HeroStyle.js';
import { SKINS, heroFrameSize } from '../art/skins.js';
import { PERK_EFFECTS } from '../data/progression.js';
import { SWORD_TIERS, drawPickaxe, drawSword, swordTierFor } from '../art/gear.js';
import { quantizePixels } from '../art/palette.js';

const SWING_MS = 170;
const PICK_SWING_MS = 480;

const BASE_ATTACK = 12;
const BASE_DEFENSE = 0;

export class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, saved = {}, progression = null) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(16, 18);
    this.body.setOffset(-8, -7);
    this.body.setCollideWorldBounds(true);
    this.setDepth(y + 30);

    this.gender = 'male';
    this.animPrefix = 'player';
    this.sprite = scene.add.sprite(0, -2, 'player', 1).setOrigin(0.5, 0.77);
    this.add(this.sprite);

    this.progression = progression;
    this.maxHealth = progression?.maxHealth ?? saved.maxHealth ?? 100;
    this.health = Math.min(saved.health ?? this.maxHealth, this.maxHealth);
    this.stamina = 100;
    // Nada no jogo reduz os atributos base: um valor abaixo do inicial vem de um save
    // corrompido (o bônus antigo da Ferraria foi descontado várias vezes) e é corrigido aqui.
    const loadedAttack = Number.isFinite(Number(saved.baseAttack)) && saved.baseAttack !== null
      ? Number(saved.baseAttack)
      : (Number(saved.attack) || BASE_ATTACK) - (scene.camp?.legacyForgeBonus?.attack ?? 0);
    const loadedDefense = Number.isFinite(Number(saved.baseDefense)) && saved.baseDefense !== null
      ? Number(saved.baseDefense)
      : (Number(saved.defense) || BASE_DEFENSE) - (scene.camp?.legacyForgeBonus?.defense ?? 0);
    this.baseAttack = Math.max(BASE_ATTACK, loadedAttack);
    this.baseDefense = Math.max(BASE_DEFENSE, loadedDefense);
    this.attack = this.baseAttack;
    this.defense = this.baseDefense;
    this.speedMultiplier = 1;
    this.fireResistance = 0;
    this.dragonShield = 0;
    this.facing = new Phaser.Math.Vector2(1, 0);
    this.attackCooldown = 0;
    this.dodgeCooldown = 0;
    this.dodgeTimer = 0;
    this.dodgeX = 0;
    this.dodgeY = 0;
    this.specialCooldown = 0;
    this.invulnerable = 0;
    this.torchTimer = 0;
    this.direction = 'down';
    this.stepTimer = 0;
    this.knockbackTimer = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.sprite.play('player-idle-down');

    // Equipamento visível: espada na mão, picareta nas costas (e na mão ao minerar).
    this.ensureGearTextures();
    this.backPickaxe = scene.add.image(-4, -10, 'gear-pickaxe-stone').setOrigin(0.5, 0.85).setRotation(-0.7).setVisible(false);
    this.weapon = scene.add.image(7, -8, 'gear-sword-rusty').setOrigin(0.5, 0.82);
    this.handTool = scene.add.image(0, 0, 'gear-pickaxe-stone').setOrigin(0.5, 0.85).setVisible(false);
    this.addAt(this.backPickaxe, 0);
    this.add([this.weapon, this.handTool]);
    this.swingTimer = 0;
    this.swingAngle = 0;
    this.miningTarget = null;
    this.miningClock = 0;
    this.gearKey = '';
    this.gearTimer = 0;
  }

  ensureGearTextures() {
    const textures = this.scene.textures;
    const put = (key, pixels) => {
      if (textures.exists(key)) return;
      const texture = textures.createCanvas(key, pixels.width, pixels.height);
      texture.getContext().putImageData(new ImageData(quantizePixels(pixels).data, pixels.width, pixels.height), 0, 0);
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      texture.refresh();
    };
    for (const tier of Object.keys(SWORD_TIERS)) put(`gear-sword-${tier}`, drawSword(tier));
    for (const tier of ['stone', 'iron']) put(`gear-pickaxe-${tier}`, drawPickaxe(tier));
  }

  /** Atualiza a espada (cor da arma forjada) e a picareta (tem ou não, pedra ou ferro). */
  refreshGear() {
    const camp = this.scene.camp;
    const weapon = camp?.equipment?.equipped?.weapon ?? null;
    // Arma achada/comprada vestida: a espada na mão usa a cor dela.
    const lootWeapon = this.scene.gear?.weapon ?? null;
    const pickaxe = camp?.pickaxeTier ?? null;
    const key = `${weapon}|${lootWeapon?.id}|${pickaxe}`;
    if (key === this.gearKey) return;
    this.gearKey = key;
    this.weapon.setTexture(`gear-sword-${lootWeapon?.sword ?? swordTierFor(weapon)}`);
    if (pickaxe) {
      this.backPickaxe.setTexture(`gear-pickaxe-${pickaxe === 'iron' ? 'iron' : 'stone'}`);
      this.handTool.setTexture(`gear-pickaxe-${pickaxe === 'iron' ? 'iron' : 'stone'}`);
    }
  }

  /** Golpe: a espada faz um arco na direção do ataque. */
  swingWeapon(angle = Math.atan2(this.facing.y, this.facing.x)) {
    this.swingAngle = angle;
    this.swingTimer = SWING_MS;
  }

  startMining(x, y) {
    this.miningTarget = { x, y };
    this.miningClock = 0;
  }

  stopMining() {
    this.miningTarget = null;
  }

  /** Pose da espada e da picareta a cada quadro. */
  poseGear(delta) {
    this.gearTimer -= delta;
    if (this.gearTimer <= 0) {
      this.gearTimer = 400;
      this.refreshGear();
    }
    const hasPickaxe = Boolean(this.scene.camp?.pickaxeTier);
    const behind = this.direction === 'up';
    if (this.miningTarget) {
      // Picaretando: a ferramenta sobe e desce em direção à rocha.
      this.miningClock += delta;
      const angle = Math.atan2(this.miningTarget.y - this.y, this.miningTarget.x - this.x);
      const phase = (this.miningClock % PICK_SWING_MS) / PICK_SWING_MS;
      const lift = phase < 0.7 ? phase / 0.7 : 1 - (phase - 0.7) / 0.3;
      const side = Math.cos(angle) < 0 ? -1 : 1;
      this.weapon.setVisible(false);
      this.backPickaxe.setVisible(false);
      this.handTool.setVisible(true)
        .setPosition(side * 8, -9)
        .setFlipX(side < 0)
        .setRotation(side * (1.4 - lift * 2.1));
      return;
    }
    this.handTool.setVisible(false);
    // Skins que já trazem a espada no desenho: a arma equipada só aparece no golpe.
    this.weapon.setVisible(!this.skinHasSword || this.swingTimer > 0);
    this.backPickaxe.setVisible(hasPickaxe);
    // Nas costas: olhando para a esquerda, as costas ficam do lado direito da tela.
    const backSide = this.direction === 'left' ? 1 : -1;
    this.backPickaxe.setPosition(backSide * 4, -10).setFlipX(backSide > 0).setRotation(backSide * 0.7);
    this.moveTo(this.backPickaxe, behind ? this.list.length - 1 : 0);
    if (this.swingTimer > 0) {
      this.swingTimer = Math.max(0, this.swingTimer - delta);
      const t = 1 - this.swingTimer / SWING_MS;
      const eased = 1 - (1 - t) * (1 - t);
      const angle = this.swingAngle;
      this.weapon
        .setPosition(Math.cos(angle) * 8, -11 + Math.sin(angle) * 5)
        .setFlipX(false)
        .setRotation(angle + Math.PI / 2 + (-1.5 + eased * 3));
      this.moveTo(this.weapon, this.list.length - 1);
      return;
    }
    const poses = {
      down: [7, -8, 0.45],
      right: [1, -8, 0.35],
      left: [-1, -8, -0.35],
      up: [7, -9, 0.3]
    };
    const [x, y, rotation] = poses[this.direction] ?? poses.down;
    this.weapon.setPosition(x, y).setRotation(rotation).setFlipX(this.direction === 'left');
    this.moveTo(this.weapon, behind ? 0 : this.list.length - 1);
  }

  // analog: vetor do joystick de toque (-1 a 1); usado quando nenhuma tecla de movimento está pressionada.
  /** Escudo da Forja ou peça de escudo vestida. */
  get hasShield() {
    return Boolean(this.scene.gear?.equippedItem?.('shield') || this.scene.camp?.equipment?.equipped?.shield);
  }

  /** Paralisia: o herói não anda nem ataca pelo tempo dado. */
  paralyze(ms) {
    this.paralyzedMs = Math.max(this.paralyzedMs ?? 0, ms);
    this.dodgeTimer = 0;
    this.sprite.setTint(0xfff27a);
    this.scene.ui?.showMessage?.('Paralisado!');
  }

  update(delta, keys, cursors, pointerWorld, analog = null) {
    const seconds = delta / 1000;
    if ((this.paralyzedMs ?? 0) > 0) {
      this.paralyzedMs = Math.max(0, this.paralyzedMs - delta);
      this.body.setVelocity(0, 0);
      this.invulnerable = Math.max(0, this.invulnerable - delta);
      if (this.paralyzedMs === 0) this.sprite.clearTint();
      return;
    }
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
    this.specialCooldown = Math.max(0, this.specialCooldown - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.torchTimer = Math.max(0, this.torchTimer - delta);
    this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);
    this.stamina = Math.min(100, this.stamina + 13 * seconds);

    let x = Number(keys.left.isDown || keys.a.isDown || cursors.left.isDown) * -1 +
      Number(keys.right.isDown || keys.d.isDown || cursors.right.isDown);
    let y = Number(keys.up.isDown || keys.w.isDown || cursors.up.isDown) * -1 +
      Number(keys.down.isDown || keys.s.isDown || cursors.down.isDown);
    const movement = new Phaser.Math.Vector2(x, y);
    this.stepTimer = Math.max(0, this.stepTimer - delta);
    if (movement.lengthSq() > 0) {
      movement.normalize();
    } else if (analog && (analog.x !== 0 || analog.y !== 0)) {
      movement.set(analog.x, analog.y);
      if (movement.lengthSq() > 1) movement.normalize();
    }
    if (movement.lengthSq() > 0) {
      const strength = movement.length();
      this.facing.copy(movement).scale(1 / strength);
      this.direction = Math.abs(movement.x) > Math.abs(movement.y)
        ? movement.x < 0 ? 'left' : 'right'
        : movement.y < 0 ? 'up' : 'down';
      const walk = `${this.animPrefix}-walk-${this.direction}`;
      if (this.sprite.anims.currentAnim?.key !== walk) this.sprite.play(walk);
      if (this.stepTimer === 0) {
        this.stepTimer = 240;
        this.scene.effects?.spawnDust(this.x - this.facing.x * 6, this.y + 9, 2, 0x9a9a72);
      }
    } else if (pointerWorld) {
      const aim = new Phaser.Math.Vector2(pointerWorld.x - this.x, pointerWorld.y - this.y);
      if (aim.lengthSq() > 0) this.facing.copy(aim.normalize());
      const idle = `${this.animPrefix}-idle-${this.direction}`;
      if (this.sprite.anims.currentAnim?.key !== idle) this.sprite.play(idle);
    } else {
      const idle = `${this.animPrefix}-idle-${this.direction}`;
      if (this.sprite.anims.currentAnim?.key !== idle) this.sprite.play(idle);
    }
    if (this.knockbackTimer > 0) {
      this.body.setVelocity(this.knockbackX, this.knockbackY);
    } else if (this.dodgeTimer > 0) {
      this.body.setVelocity(this.dodgeX, this.dodgeY);
    } else {
      // Lodo do brejo e dos oásis deixa o passo mais lento.
      const terrainFactor = this.scene.regionWorld?.speedFactorAt(this.x, this.y) ?? 1;
      const speed = 130 * this.speedMultiplier * terrainFactor * (this.scene.companions?.speed ?? 1);
      this.body.setVelocity(movement.x * speed, movement.y * speed);
    }
    this.poseGear(delta);
    this.setDepth(this.y + 30);
  }

  // forced: esquiva pedida pelo botão de toque, além da tecla Espaço.
  dodge(keys, forced = false) {
    const fleetfoot = this.progression?.hasPerk?.('fleetfoot') ?? false;
    const staminaCost = Math.round(COMBAT_CONFIG.dodgeStaminaCost *
      (fleetfoot ? PERK_EFFECTS.fleetfootStaminaMultiplier : 1));
    const pressed = Phaser.Input.Keyboard.JustDown(keys.dodge) || forced;
    if (!pressed || this.dodgeCooldown > 0 ||
        this.stamina < staminaCost) return false;
    this.stamina -= staminaCost;
    this.dodgeCooldown = Math.round(COMBAT_CONFIG.dodgeCooldownMs *
      (fleetfoot ? PERK_EFFECTS.fleetfootCooldownMultiplier : 1));
    this.invulnerable = COMBAT_CONFIG.dodgeInvulnerabilityMs;
    // A velocidade é mantida por dodgeDurationMs em update(); antes ela durava um único frame.
    this.dodgeTimer = COMBAT_CONFIG.dodgeDurationMs;
    this.dodgeX = this.facing.x * COMBAT_CONFIG.dodgeSpeed;
    this.dodgeY = this.facing.y * COMBAT_CONFIG.dodgeSpeed;
    this.knockbackTimer = 0;
    this.body.setVelocity(this.dodgeX, this.dodgeY);
    this.scene.effects?.spawnDust(this.x, this.y + 8, 6, 0xb0ad82);
    return true;
  }

  // options.fire: dano de fogo, reduzido pela resistência ao fogo (Fogueira 8/10, Forja do Dragão).
  damage(amount, source = null, options = {}) {
    if (this.invulnerable > 0) return false;
    const fireFactor = options.fire ? 1 - this.fireResistance : 1;
    // fullDamage: o Golem de Fogo bate com o dano cheio (só a defesa reduz).
    const scaling = options.fullDamage ? 1 : COMBAT_CONFIG.enemyDamageToPlayer ?? 1;
    let scaled = amount * fireFactor * scaling;
    // Escudo: bloqueia boa parte do dano só dos 2 primeiros atacantes de cada janela de ~1 s.
    this.lastBlockRatio = 0;
    if (source && this.hasShield) {
      this.shieldBlocker ??= new ShieldBlocker();
      this.lastBlockRatio = this.shieldBlocker.tryBlock(source, this.scene.time.now);
      if (this.lastBlockRatio > 0) scaled = blockedDamage(scaled, this.lastBlockRatio);
    }
    // Defesa reduz em porcentagem (100 de defesa = metade do dano); assim os monstros
    // continuam perigosos no fim de jogo em vez de baterem sempre 1.
    const dealt = Math.max(1, Math.round(scaled * 100 / (100 + Math.max(0, this.defense))));
    this.health = Math.max(0, this.health - dealt);
    this.invulnerable = 450;
    this.scene.companions?.onPlayerDamaged();
    this.sprite.setTint(0xffc2a8);
    this.scene.effects?.spawnHit(this.x, this.y - 9, 0xff9b78, 6);
    this.scene.effects?.spawnDamage(this.x, this.y - 20, dealt, '#ffb59a');
    this.scene.audio?.playHit();
    if (this.lastBlockRatio > 0) this.scene.effects?.spawnDamage(this.x, this.y - 32, 'BLOQ', '#a9d8ff');
    if (source) {
      const angle = Phaser.Math.Angle.Between(source.x, source.y, this.x, this.y);
      this.knockbackTimer = COMBAT_CONFIG.knockback.durationMs;
      this.knockbackX = Math.cos(angle) * COMBAT_CONFIG.knockback.normal;
      this.knockbackY = Math.sin(angle) * COMBAT_CONFIG.knockback.normal;
    }
    if (this.scene.damageFlash) {
      this.scene.damageFlash.setAlpha(0.2);
      this.scene.tweens.add({ targets: this.scene.damageFlash, alpha: 0, duration: 140 });
    }
    this.scene.cameras.main.shake(
      COMBAT_CONFIG.screenShake.playerHit.duration,
      COMBAT_CONFIG.screenShake.playerHit.intensity,
      true
    );
    this.scene.time.delayedCall(110, () => {
      if (this.sprite?.active) this.sprite.clearTint();
    });
    this.scene.onPlayerDamaged?.(dealt);
    return true;
  }

  showAttack(angle) {
    this.sprite.setTint(0xffe4a5);
    this.swingWeapon(angle);
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** Nível do herói (poções fortes e equipamentos pedem nível mínimo). */
  get level() {
    return this.progression?.level ?? 1;
  }

  /** Troca o desenho do herói (cavaleiro ou heroína); as animações são as mesmas. */
  setGender(gender) {
    this.gender = normalizeGender(gender);
    this.animPrefix = heroTexture(this.gender);
    this.sprite.setTexture(this.animPrefix, 1);
    // Pés sempre no mesmo ponto: folhas maiores (skins novas) mudam a origem vertical.
    const frame = heroFrameSize(this.animPrefix);
    this.sprite.setOrigin(0.5, (frame.feet + 1 - 8.2 / frame.scale) / frame.height);
    this.sprite.setScale(frame.scale);
    this.skinHasSword = SKINS.some((skin) => skin.sword && `player-${skin.id}` === this.animPrefix);
    this.sprite.play(`${this.animPrefix}-idle-${this.direction}`);
  }

  /** Recalcula atributos: base + níveis + Forja + equipamento vestido + buffs + efeitos do acampamento. */
  recalculateEquipment(equipment) {
    const bonuses = { attack: 0, defense: 0, fireResistance: 0, maxHealth: 0, speedPercent: 0, ...(equipment?.getBonuses?.() ?? {}) };
    for (const [stat, value] of Object.entries(this.scene.gear?.bonuses?.() ?? {})) bonuses[stat] = (bonuses[stat] ?? 0) + value;
    const buffs = this.scene.buffs?.effects ?? {};
    const camp = this.scene.camp;
    const flatAttack = this.baseAttack + (this.progression?.attackBonus ?? 0) + bonuses.attack + (buffs.attack ?? 0);
    const flatDefense = this.baseDefense + (this.progression?.defenseBonus ?? 0) + bonuses.defense + (buffs.defense ?? 0);
    this.attack = Math.round(flatAttack * (1 + (buffs.attackPercent ?? 0)) * (this.progression?.rebirthBonus ?? 1));
    this.defense = Math.round(flatDefense * (1 + (buffs.defensePercent ?? 0)));
    const baseMax = this.progression?.maxHealth ?? this.maxHealth;
    this.maxHealth = baseMax + bonuses.maxHealth + (buffs.maxHealth ?? 0);
    this.health = Math.min(this.health, this.maxHealth);
    this.speedMultiplier = 1 + bonuses.speedPercent + (buffs.speedPercent ?? 0);
    this.fireResistance = Math.min(0.9, bonuses.fireResistance + (camp?.fireResistance ?? 0));
    this.dragonShield = camp?.dragonShield ?? 0;
    this.jewelCrit = Math.min(0.5, bonuses.critChance ?? 0);
    this.jewelPoison = Math.max(0, Math.round(bonuses.poison ?? 0));
  }
}
