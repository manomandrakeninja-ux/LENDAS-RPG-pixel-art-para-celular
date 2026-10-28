import Phaser from 'phaser';
import { PixelCanvas, darken, lighten } from '../art/pixel.js';
import { drawHorseFrame, HORSE_W, HORSE_H, HORSE_FRAMES } from '../art/mountHorse.js';
import { Companions, PETS, petAbility } from '../data/companions.js';
import { quantizePixels } from '../art/palette.js';

// Parte da cena dos mascotes e da montaria: desenho em pixel, seguir o herói e os efeitos.

function makeTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return key;
  const canvas = new PixelCanvas(width, height);
  draw(canvas);
  canvas.outline();
  const texture = scene.textures.createCanvas(key, width, height);
  texture.getContext().putImageData(new ImageData(quantizePixels(canvas).data, width, height), 0, 0);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  texture.refresh();
  return key;
}

/** Desenho 16x16 de cada mascote (corpo, cabeça, olho e um detalhe do papel). */
export function petTexture(scene, id) {
  const pet = PETS[id];
  return makeTexture(scene, `pet-${id}`, 16, 16, (c) => {
    const body = pet.color;
    const dark = darken(body, 0.35);
    const light = lighten(body, 0.3);
    if (id === 'fairy' || id === 'phoenix') {
      c.ellipse(8, 9, 3, 4, body);
      c.rect(7, 4, 3, 3, light);
      c.ellipse(3, 8, 3, 2, pet.accent, 200);
      c.ellipse(13, 8, 3, 2, pet.accent, 200);
      c.pixel(8, 5, '#1c1426');
      if (id === 'phoenix') c.rect(6, 12, 5, 3, pet.accent);
    } else if (id === 'magpie') {
      c.ellipse(8, 9, 4, 3, body);
      c.rect(10, 5, 4, 4, body);
      c.rect(13, 6, 2, 1, '#e8b53c');
      c.rect(4, 9, 4, 2, pet.accent);
      c.rect(1, 10, 4, 1, dark);
      c.pixel(12, 6, '#ffffff');
    } else {
      // Quadrúpede: lobinho ou dragãozinho.
      c.rect(3, 7, 9, 5, body);
      c.rect(10, 4, 5, 5, light);
      c.rect(10, 2, 2, 2, body);
      c.rect(13, 2, 2, 2, body);
      c.rect(3, 12, 2, 3, dark);
      c.rect(9, 12, 2, 3, dark);
      c.rect(1, 6, 3, 2, dark);
      c.pixel(13, 5, '#1c1426');
      if (id === 'dragonling') {
        c.rect(4, 4, 2, 3, pet.accent);
        c.rect(7, 4, 2, 3, pet.accent);
        c.rect(1, 8, 3, 1, pet.accent);
      }
    }
  });
}

export function mountTexture(scene, frame = 0) {
  const key = `mount-horse-${frame}`;
  if (scene.textures.exists(key)) return key;
  const canvas = drawHorseFrame(frame);
  const texture = scene.textures.createCanvas(key, HORSE_W, HORSE_H);
  texture.getContext().putImageData(new ImageData(quantizePixels(canvas).data, HORSE_W, HORSE_H), 0, 0);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  texture.refresh();
  return key;
}

export class CompanionSystem {
  constructor(scene, saved) {
    this.scene = scene;
    this.state = new Companions(saved);
    this.petSprite = null;
    this.petId = null;
    this.mountSprite = null;
    this.mountClock = 0;
    this.mountSide = 1;
    this.attackTimer = 0;
    this.healTimer = 0;
    this.bob = 0;
    this.px = 0;
    this.py = 0;
  }

  serialize() { return this.state.serialize(); }

  get speed() { return this.state.speedMultiplier(this.scene.progression?.level); }

  /** Ações do menu da Fogueira. */
  action(kind, arg) {
    const scene = this.scene;
    const state = this.state;
    let result;
    if (kind === 'buy') {
      result = state.buy(arg, scene.economy.coins);
      if (result.ok) scene.economy.coins -= result.cost;
    } else if (kind === 'hatch') result = state.hatch();
    else if (kind === 'summon') result = state.summon(arg);
    else if (kind === 'mount') result = state.toggleMount(scene.progression.level);
    else result = { ok: false, message: '' };
    scene.ui?.showMessage(result.message);
    if (result.ok) {
      this.sync();
      scene.save?.();
    }
    return result;
  }

  /** Chefe derrotado: talvez cai um ovo. */
  onBossDefeated() {
    if (this.state.rollEgg()) {
      this.scene.ui?.showMessage('O chefe deixou um ovo raro! Choque-o na Fogueira.');
      return true;
    }
    return false;
  }

  onPlayerDamaged() {
    if (this.state.onDamaged()) {
      this.sync();
      this.scene.ui?.showMessage('Você caiu da montaria!');
    }
  }

  /** Cria/remove os sprites conforme o estado. */
  sync() {
    const scene = this.scene;
    const id = this.state.active;
    if (id !== this.petId) {
      this.petSprite?.destroy();
      this.petSprite = null;
      this.petId = id;
      if (id) {
        this.px = scene.player.x - 20;
        this.py = scene.player.y + 8;
        this.petSprite = scene.add.image(this.px, this.py, petTexture(scene, id)).setOrigin(0.5, 0.8);
      }
    }
    if (this.state.mounted && !this.mountSprite) {
      this.mountSprite = scene.add.image(scene.player.x, scene.player.y + 12, mountTexture(scene, 1)).setOrigin(0.5, 0.78).setScale(1.2);
    } else if (!this.state.mounted && this.mountSprite) {
      this.mountSprite.destroy();
      this.mountSprite = null;
    }
  }

  update(delta, paused) {
    const scene = this.scene;
    const player = scene.player;
    if (!player) return;
    if (this.mountSprite) {
      if (player.direction === 'left') this.mountSide = -1;
      else if (player.direction === 'right') this.mountSide = 1;
      const moving = Math.hypot(player.x - (this.lastPx ?? player.x), player.y - (this.lastPy ?? player.y)) > 0.3;
      this.lastPx = player.x;
      this.lastPy = player.y;
      if (moving) this.mountClock += delta;
      const frame = moving ? Math.floor(this.mountClock / 90) % HORSE_FRAMES : 1;
      this.mountSprite.setTexture(mountTexture(scene, frame)).setPosition(player.x, player.y + 14).setFlipX(this.mountSide < 0).setDepth(player.y + 7);
    }
    const sprite = this.petSprite;
    if (!sprite) return;
    this.bob += delta;
    const tx = player.x - 20;
    const ty = player.y + 8;
    const distance = Phaser.Math.Distance.Between(this.px, this.py, tx, ty);
    if (distance > 240) {
      this.px = tx;
      this.py = ty;
    } else if (distance > 6) {
      const step = Math.min(distance, (60 + distance * 3) * (delta / 1000));
      const angle = Math.atan2(ty - this.py, tx - this.px);
      this.px += Math.cos(angle) * step;
      this.py += Math.sin(angle) * step;
      if (Math.abs(Math.cos(angle)) > 0.2) sprite.setFlipX(Math.cos(angle) < 0);
    }
    const flying = PETS[this.petId].role === 'heal';
    const lift = flying ? -10 + Math.sin(this.bob / 220) * 3 : -Math.abs(Math.sin(this.bob / 160)) * 1.5;
    sprite.setPosition(this.px, this.py + lift).setDepth(this.py + 8);
    if (!paused) this.runAbility(delta, player);
  }

  runAbility(delta, player) {
    const scene = this.scene;
    const ability = petAbility(this.petId);
    if (!ability) return;
    const role = PETS[this.petId].role;
    if (role === 'attack') {
      this.attackTimer += delta;
      if (this.attackTimer < ability.everyMs) return;
      let best = null;
      let bestDistance = ability.range;
      for (const enemy of scene.enemyDirector.enemies) {
        if (!enemy.active || enemy.dead || enemy.isBoss) continue;
        const d = Phaser.Math.Distance.Between(this.px, this.py, enemy.x, enemy.y);
        if (d < bestDistance) { best = enemy; bestDistance = d; }
      }
      if (!best) return;
      this.attackTimer = 0;
      scene.effects?.spawnHit(best.x, best.y - 8, 0xffd56b, 4);
      scene.damageEnemy(best, Math.max(1, Math.round(player.attack * ability.power)), { color: '#ffd56b' });
    } else if (role === 'heal') {
      this.healTimer += delta;
      if (this.healTimer < ability.everyMs) return;
      if (player.health >= player.maxHealth || player.health <= 0) return;
      this.healTimer = 0;
      const amount = Math.max(1, Math.round(player.maxHealth * ability.power));
      player.health = Math.min(player.maxHealth, player.health + amount);
      scene.effects?.spawnDamage(player.x, player.y - 26, amount, '#8affc0');
    } else if (role === 'coins') {
      scene.coinPickups.update(delta, { x: this.px, y: this.py }, (amount) => scene.collectCoins(amount), false);
    }
  }
}
