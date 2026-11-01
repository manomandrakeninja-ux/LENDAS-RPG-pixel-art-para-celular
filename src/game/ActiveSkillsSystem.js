import Phaser from 'phaser';
import { ActiveSkills, ACTIVE_SKILLS } from '../data/activeSkills.js';

// Skills ativas nos atalhos 6-9 (Bola de Fogo, Muralha, Cura, Onda) — HUD próprio à direita,
// abaixo do minimapa, com cooldown visual. O Grito (Z) continua separado.

const SLOT_SIZE = 40;
const SLOT_GAP = 8;

export class ActiveSkillsSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.state = new ActiveSkills(saved);
    this.slots = [];
    this.projectiles = [];
    this.lastWidth = 0;
    this.buildHud();
  }

  buildHud() {
    const scene = this.scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(15000);
    for (const skill of ACTIVE_SKILLS) {
      const frame = scene.add.nineslice(0, 0, 'ui-slot', undefined, SLOT_SIZE, SLOT_SIZE, 6, 6, 6, 6)
        .setOrigin(0);
      const icon = scene.add.text(SLOT_SIZE / 2, SLOT_SIZE / 2 - 8, skill.icon, { fontSize: '16px' })
        .setOrigin(0.5);
      const key = scene.add.text(4, 2, skill.key, { fontSize: '8px', color: '#f4d88f', stroke: '#140f14', strokeThickness: 3 })
        .setOrigin(0);
      const cd = scene.add.graphics();
      const cdText = scene.add.text(SLOT_SIZE / 2, SLOT_SIZE / 2 + 10, '', { fontSize: '8px', color: '#fff', stroke: '#140f14', strokeThickness: 3 })
        .setOrigin(0.5);
      this.container.add([frame, icon, key, cd, cdText]);
      this.slots.push({ skill, frame, icon, key, cd, cdText });
    }
    this.layout();
  }

  layout() {
    const width = this.scene.scale.width;
    const mapSize = this.scene.ui?.metrics?.mapSize ?? 120;
    const x = width - SLOT_SIZE - 10;
    const y0 = 91 + mapSize + 16;
    this.container.setPosition(0, 0);
    this.slots.forEach((slot, i) => {
      slot.frame.setPosition(x, y0 + i * (SLOT_SIZE + SLOT_GAP));
      slot.icon.setPosition(x + SLOT_SIZE / 2, y0 + i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2 - 8);
      slot.key.setPosition(x + 4, y0 + i * (SLOT_SIZE + SLOT_GAP) + 2);
      slot.cd.setPosition(0, 0);
      slot.cdText.setPosition(x + SLOT_SIZE / 2, y0 + i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2 + 10);
    });
    this.lastWidth = width;
  }

  /** Lançada pela tecla 6-9. */
  castSlot(slotIndex) {
    const scene = this.scene;
    const skill = this.state.skillAt(slotIndex);
    if (!skill) return false;
    if (scene.overlayBlocked() || scene.isUiPaused() || scene.gameOver) return false;
    const level = scene.progression?.level ?? 1;
    const stamina = scene.player?.stamina ?? 0;
    const now = scene.time.now;
    const check = this.state.canCast(skill.id, { level, stamina, now });
    if (!check.ok) {
      scene.ui?.showMessage(`${skill.icon} ${skill.name}: ${check.reason}`);
      return false;
    }
    this.state.cast(skill.id, now);
    scene.player.stamina = Math.max(0, stamina - skill.stamina);
    scene.audio?.playSpecial?.() ?? scene.audio?.playSwing?.();

    if (skill.id === 'fireball') this.castFireball(skill);
    else if (skill.id === 'ward') this.castWard(skill);
    else if (skill.id === 'heal') this.castHeal(skill);
    else if (skill.id === 'burst') this.castBurst(skill);
    return true;
  }

  castFireball(skill) {
    const scene = this.scene;
    const player = scene.player;
    const target = scene.lockTarget && !scene.lockTarget.dead && scene.lockTarget.active
      ? scene.lockTarget
      : scene.nearestEnemy(skill.range);
    const facing = player.facing ?? { x: 0, y: 1 };
    const angle = target
      ? Phaser.Math.Angle.Between(player.x, player.y - 8, target.x, target.y - 8)
      : Math.atan2(facing.y, facing.x);
    const sprite = scene.add.circle(player.x + Math.cos(angle) * 20, player.y - 8 + Math.sin(angle) * 20, 7, 0xff8a3c, 1)
      .setDepth(player.y + 20);
    scene.effects?.spawnDust(sprite.x, sprite.y, 3, 0xffa53d);
    this.projectiles.push({
      sprite,
      vx: Math.cos(angle) * skill.speed,
      vy: Math.sin(angle) * skill.speed,
      ttl: (skill.range / skill.speed) * 1000,
      damage: Math.round(player.attack * skill.damageMultiplier)
    });
    scene.ui?.showMessage(`🔥 ${skill.name}!`);
  }

  castWard(skill) {
    const scene = this.scene;
    scene.buffs?.apply('ward', { durationMs: skill.durationMs });
    scene.player?.recalculateEquipment?.(scene.camp.equipment);
    scene.effects?.spawnHeal(scene.player.x, scene.player.y - 24);
    scene.ui?.showMessage(`🛡️ ${skill.name}: +${Math.round(skill.defensePercent * 100)}% defesa por ${skill.durationMs / 1000}s!`);
  }

  castHeal(skill) {
    const scene = this.scene;
    const amount = Math.round(scene.player.maxHealth * skill.healPercent);
    scene.player.heal(amount);
    scene.effects?.spawnHeal(scene.player.x, scene.player.y - 8);
    scene.effects?.spawnDamage(scene.player.x, scene.player.y - 30, `+${amount}`, '#8affc0');
    scene.ui?.showMessage(`✨ ${skill.name}: +${amount} de vida!`);
  }

  castBurst(skill) {
    const scene = this.scene;
    const player = scene.player;
    scene.effects?.spawnSpecial(player.x, player.y - 4);
    scene.cameras.main.shake(220, 0.008, true);
    scene.hitstop?.(50);
    const targets = scene.enemies.filter((enemy) => enemy.active &&
      Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y) < skill.radius);
    if (scene.boss && !scene.boss.dead &&
        Phaser.Math.Distance.Between(scene.boss.x, scene.boss.y, player.x, player.y) < skill.radius) {
      targets.push(scene.boss);
    }
    for (const enemy of targets) {
      const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
      enemy.applyKnockback?.(angle, 260);
      scene.damageEnemy(enemy, player.attack * skill.damageMultiplier, { color: '#ffb066' });
    }
    scene.ui?.showMessage(`💥 ${skill.name}: ${targets.length} ${targets.length === 1 ? 'alvo' : 'alvos'}!`);
  }

  update(delta) {
    const scene = this.scene;
    if (this.lastWidth !== scene.scale.width) this.layout();
    const now = scene.time.now;
    const level = scene.progression?.level ?? 1;
    // Projéteis da Bola de Fogo.
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const p = this.projectiles[i];
      p.ttl -= delta;
      p.sprite.x += (p.vx * delta) / 1000;
      p.sprite.y += (p.vy * delta) / 1000;
      let hit = false;
      const targets = [...scene.enemies, ...(scene.boss && !scene.boss.dead ? [scene.boss] : [])];
      for (const enemy of targets) {
        if (!enemy.active || enemy.dead) continue;
        if (Phaser.Math.Distance.Between(p.sprite.x, p.sprite.y, enemy.x, enemy.y - 8) < 26) {
          scene.damageEnemy(enemy, p.damage, { color: '#ff8a3c', burn: { dps: 6, ms: 2000 } });
          scene.effects?.spawnHit(enemy.x, enemy.y - 8, 0xffa53d, 5);
          hit = true;
          break;
        }
      }
      if (hit || p.ttl <= 0) {
        scene.effects?.spawnDust(p.sprite.x, p.sprite.y, 4, 0xff8a3c);
        p.sprite.destroy();
        this.projectiles.splice(i, 1);
      }
    }
    // HUD: cadeado por nível + cooldown.
    for (const slot of this.slots) {
      const { skill } = slot;
      const unlocked = this.state.unlocked(skill.id, level);
      const remaining = this.state.remainingMs(skill.id, now);
      slot.icon.setAlpha(unlocked ? 1 : 0.25);
      slot.frame.setTint(unlocked ? 0xffffff : 0x777777);
      slot.cd.clear();
      if (!unlocked) {
        slot.cdText.setText(`Nv${skill.unlockLevel}`);
      } else if (remaining > 0) {
        const ratio = remaining / skill.cooldownMs;
        slot.cd.fillStyle(0x000000, 0.62);
        slot.cd.fillRect(slot.frame.x, slot.frame.y + SLOT_SIZE * (1 - ratio), SLOT_SIZE, SLOT_SIZE * ratio);
        slot.cdText.setText(`${Math.ceil(remaining / 1000)}`);
      } else {
        slot.cdText.setText('');
      }
    }
  }

  serialize() { return this.state.serialize(); }
}
