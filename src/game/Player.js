import Phaser from 'phaser';
import { COMBAT_CONFIG } from '../data/combat.js';
import { ShieldBlocker, blockedDamage } from './ShieldBlock.js';
import { heroTexture, normalizeGender } from './HeroStyle.js';
import { heroFrameSize } from '../art/skins.js';
import { PERK_EFFECTS } from '../data/progression.js';
import { weaponLookFor } from '../art/weaponSprites.js';
import { HeroAnimator } from './HeroAnimator.js';

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

    // Fase 22: a arma equipada fica nas costas; o HeroAnimator saca, golpeia, segura 5 s e guarda.
    this.animator = new HeroAnimator(scene, this, this.sprite, {
      onStep: () => this.scene.effects?.spawnDust(this.x - this.facing.x * 4 + (Math.random() - 0.5) * 4, this.y + 6, 2, 0x9a9a72)
    });
    this.miningTarget = null;
    this.refreshGear();
  }

  /** Arma real equipada agora (peça vestida ou espada da Forja): troca nas costas e na mão na hora. */
  refreshGear() {
    const camp = this.scene.camp;
    const look = weaponLookFor({
      lootId: this.scene.gear?.weapon?.id ?? null,
      forgeWeapon: camp?.equipment?.equipped?.weapon ?? null
    });
    this.animator.setWeapon(look);
    return look;
  }

  /** Golpe: vira para o alvo, saca se preciso e golpeia com a arma equipada. */
  swingWeapon(angle = Math.atan2(this.facing.y, this.facing.x), options = {}) {
    if (Math.abs(Math.cos(angle)) > 0.01 || Math.abs(Math.sin(angle)) > 0.01) {
      this.direction = Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle))
        ? (Math.cos(angle) < 0 ? 'left' : 'right')
        : (Math.sin(angle) < 0 ? 'up' : 'down');
    }
    this.refreshGear();
    this.animator.attack(options);
  }

  startMining(x, y) {
    this.miningTarget = { x, y };
    const angle = Math.atan2(y - this.y, x - this.x);
    this.direction = Math.abs(Math.cos(angle)) >= Math.abs(Math.sin(angle))
      ? (Math.cos(angle) < 0 ? 'left' : 'right')
      : (Math.sin(angle) < 0 ? 'up' : 'down');
    this.animator.startTool('pickaxe', this.scene.camp?.pickaxeTier === 'iron' ? 'iron' : 'stone');
  }

  stopMining() {
    this.miningTarget = null;
    this.animator.stopTool();
  }

  /** Coleta rápida (madeira com machadinha): um golpe da ferramenta e guarda. */
  gestureTool(tool = 'hatchet') {
    if (this.miningTarget) return;
    this.animator.startTool(tool, 'iron', 1);
  }

  /** Pose da arma e da ferramenta a cada quadro. */
  poseGear(delta, moving = false) {
    this.refreshGear();
    this.animator.update(delta, this.direction, moving);
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
      this.poseGear(delta, false);
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
    } else if (pointerWorld) {
      const aim = new Phaser.Math.Vector2(pointerWorld.x - this.x, pointerWorld.y - this.y);
      if (aim.lengthSq() > 0) this.facing.copy(aim.normalize());
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
    this.poseGear(delta, movement.lengthSq() > 0 && this.knockbackTimer === 0);
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
    this.animator.hurt();
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
    this.scene.onPlayerDamaged?.(dealt);
    return true;
  }

  showAttack(angle, options = {}) {
    this.swingWeapon(angle, options);
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** Nível do herói (poções fortes e equipamentos pedem nível mínimo). */
  get level() {
    return this.progression?.level ?? 1;
  }

  /** Altura do topo da cabeça no mundo (as folhas 56x64 têm ~4 px vazios em cima). Barras e textos vão acima. */
  headTopY() {
    const s = this.sprite;
    return this.y + (this.animator?.baseY ?? s.y) - s.displayOriginY * s.scaleY + 4 * s.scaleY;
  }

  /** Linha dos pés no mundo (base do quadro, onde o contorno das botas termina). */
  feetY() {
    return this.y + (this.animator?.baseY ?? this.sprite.y) + 8.2;
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
    this.animator?.setSkin(this.animPrefix);
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
