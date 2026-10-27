import Phaser from 'phaser';

// Projetis atirados por monstros à distância (bruxa, pirata, diabrete, djinn). Dados em enemies.json.
export class EnemyProjectiles {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }

  fire(enemy, target) {
    const data = enemy.definition.projectile;
    if (!data) return null;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y - 6, target.x, target.y - 4);
    const color = Phaser.Display.Color.HexStringToColor(data.color ?? '#ffffff').color;
    const image = this.scene.add.circle(enemy.x, enemy.y - 6, (data.size ?? 8) / 2, color).setDepth(enemy.y + 60);
    image.setStrokeStyle(1, 0xffffff, 0.7);
    const projectile = {
      image, enemy, data, age: 0,
      damage: Math.max(1, Math.round(enemy.currentDamage * (data.damageMultiplier ?? 1))),
      vx: Math.cos(angle) * data.speed, vy: Math.sin(angle) * data.speed
    };
    this.list.push(projectile);
    return projectile;
  }

  update(delta, player) {
    const seconds = delta / 1000;
    for (const projectile of [...this.list]) {
      projectile.age += delta;
      projectile.image.x += projectile.vx * seconds;
      projectile.image.y += projectile.vy * seconds;
      projectile.image.setDepth(projectile.image.y + 60);
      let done = projectile.age > (projectile.data.lifetimeMs ?? 1600) || !projectile.enemy.active;
      if (!done && Phaser.Math.Distance.Between(projectile.image.x, projectile.image.y, player.x, player.y - 4) < 16) {
        if (player.damage(projectile.damage, projectile.enemy, { fire: Boolean(projectile.data.fire) })) {
          const paralyze = projectile.enemy.definition.paralyze;
          if (paralyze) player.paralyze?.(paralyze.durationMs);
        }
        done = true;
      }
      if (done) this.remove(projectile);
    }
  }

  remove(projectile) {
    projectile.image.destroy();
    this.list = this.list.filter((entry) => entry !== projectile);
  }

  clear() {
    for (const projectile of [...this.list]) this.remove(projectile);
  }
}
