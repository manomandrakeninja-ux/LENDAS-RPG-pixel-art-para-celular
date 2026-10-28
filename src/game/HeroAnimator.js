// Fase 22: animação do herói, reutilizável por qualquer skin que siga o padrão de src/art/heroRig.js.
// Basta a folha (12 x 4 quadros de 56 x 64; uma folha só com o andar 4 x 4 também roda, com poses simuladas).
// Cuida de: andar com balanço e poeira nos passos, respiração e piscada parado, viradas suaves,
// arma equipada nas costas, sacar / golpear / segurar 5 s / guardar (HeroStance), ferramenta na coleta,
// e reação ao dano (quadro de recuo, clarão e piscar).
import { HERO_DIRS, HERO_FRAME, rigFor, weaponAngle } from '../art/heroRig.js';
import { WEAPON_STYLE, drawWeaponSprite, toolLookFor, weaponPose } from '../art/weaponSprites.js';
import { quantizePixels } from '../art/palette.js';
import { HeroStance } from './heroStance.js';

const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };
const TURN_VIA = { left: 'down', right: 'down', up: 'right', down: 'right' };
const TURN_MS = 90;

/** Colunas da folha de uma textura (12 no padrão novo, 4 nas folhas antigas). */
export function sheetColumns(scene, textureKey) {
  const source = scene.textures.get(textureKey)?.getSourceImage?.();
  return source?.width ? Math.max(4, Math.round(source.width / HERO_FRAME.width)) : 4;
}

/** Cria as animações de andar e de parado (respira e pisca) de uma folha do herói. */
export function createHeroAnimations(scene, prefix) {
  const cols = sheetColumns(scene, prefix);
  HERO_DIRS.forEach((direction, row) => {
    const first = row * cols;
    const walkKey = `${prefix}-walk-${direction}`;
    const idleKey = `${prefix}-idle-${direction}`;
    if (scene.anims.exists(walkKey)) scene.anims.remove(walkKey);
    if (scene.anims.exists(idleKey)) scene.anims.remove(idleKey);
    scene.anims.create({
      key: walkKey,
      frames: scene.anims.generateFrameNumbers(prefix, { frames: [first, first + 1, first + 2, first + 3] }),
      frameRate: 9,
      repeat: -1
    });
    const idle = cols >= 12
      ? [[1, 1700], [4, 700], [1, 1500], [11, 110], [1, 900], [4, 700]]
      : [[1, 1000]];
    scene.anims.create({
      key: idleKey,
      frames: idle.map(([col, duration]) => ({ key: prefix, frame: first + col, duration })),
      frameRate: 60,
      repeat: -1
    });
  });
}

export class HeroAnimator {
  constructor(scene, container, sprite, { onStep = null } = {}) {
    this.scene = scene;
    this.container = container;
    this.sprite = sprite;
    this.onStep = onStep;
    this.stance = new HeroStance();
    this.baseY = sprite.y;
    this.dir = 'down';
    this.turnMs = 0;
    this.turnDir = null;
    this.flashMs = 0;
    this.weaponLook = null;
    this.toolLooks = {};
    this.back = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.hand = scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    container.addAt(this.back, 0);
    container.add(this.hand);
    this.setSkin(sprite.texture.key);
    sprite.on('animationupdate', (anim, frame) => this.onAnimFrame(anim, frame));
  }

  setSkin(textureKey) {
    this.textureKey = textureKey;
    this.cols = sheetColumns(this.scene, textureKey);
    this.rig = rigFor(textureKey);
  }

  /** Garante as 4 variantes nítidas (original e espelhos) da arma/ferramenta como texturas. */
  ensureLook(look) {
    const textures = this.scene.textures;
    if (textures.exists(`${look.key}-00`)) return;
    const pixels = quantizePixels(drawWeaponSprite(look.look, look.main, look.accent));
    const size = pixels.width;
    for (const fx of [0, 1]) {
      for (const fy of [0, 1]) {
        const key = `${look.key}-${fx}${fy}`;
        const texture = textures.createCanvas(key, size, size);
        const data = new ImageData(size, size);
        for (let y = 0; y < size; y += 1) {
          for (let x = 0; x < size; x += 1) {
            const sx = fx ? size - 1 - x : x;
            const sy = fy ? size - 1 - y : y;
            const from = (sy * size + sx) * 4;
            data.data.set(pixels.data.subarray(from, from + 4), (y * size + x) * 4);
          }
        }
        texture.getContext().putImageData(data, 0, 0);
        texture.setFilter(1); // Phaser.Textures.FilterMode.NEAREST (sem importar o Phaser: assets.js roda em Node)
        texture.refresh();
      }
    }
  }

  /** Arma equipada (weaponLookFor). Trocar de arma muda as costas e a mão na hora. */
  setWeapon(look) {
    if (this.weaponLook?.key === look?.key) return;
    this.weaponLook = look;
    if (look) this.ensureLook(look);
  }

  get weaponStyle() {
    return WEAPON_STYLE[this.weaponLook?.look] ?? 'slash';
  }

  attack({ handLook = null } = {}) {
    if (handLook) this.ensureLook(handLook);
    const style = handLook ? (WEAPON_STYLE[handLook.look] ?? 'slash') : this.weaponStyle;
    this.stance.attack({ style, handLook });
  }

  startTool(tool = 'pickaxe', tier = 'stone', swings = Infinity) {
    const look = toolLookFor(tool, tier);
    this.ensureLook(look);
    this.toolLooks[tool] = look;
    this.stance.startTool(tool, swings);
  }

  stopTool() { this.stance.stopTool(); }

  hurt() {
    this.stance.hurt();
    this.flashMs = 70;
  }

  onAnimFrame(anim, frame) {
    if (!anim?.key?.includes('-walk-')) return;
    const col = Number(frame.textureFrame) % this.cols;
    if ((col === 0 || col === 2) && this.onStep) this.onStep(col);
  }

  /** dir: direção do herói; moving: está andando. */
  update(delta, dir, moving) {
    this.stance.update(delta);
    if (dir !== this.dir) {
      if (OPPOSITE[this.dir] === dir) { this.turnMs = TURN_MS; this.turnDir = TURN_VIA[dir]; }
      this.dir = dir;
    }
    this.turnMs = Math.max(0, this.turnMs - delta);
    const pose = this.stance.pose();
    const sprite = this.sprite;
    const showDir = this.turnMs > 0 && pose.col === null ? this.turnDir : dir;
    const row = HERO_DIRS.indexOf(showDir);
    let col;
    let offsetX = 0;
    if (pose.col !== null) {
      // Pose do golpe/ferramenta/dano: quadro fixo da folha (ou o parado, deslocado, nas folhas antigas).
      if (sprite.anims.isPlaying) sprite.anims.stop();
      const usable = this.cols >= 12 ? pose.col : 1;
      if (this.cols < 12) {
        const lean = { 7: -1, 8: 2, 10: -2 }[pose.col] ?? 0;
        offsetX = showDir === 'left' ? -lean : showDir === 'right' ? lean : 0;
      }
      sprite.setFrame(row * this.cols + usable);
      col = pose.col;
    } else {
      const key = `${this.textureKey}-${this.turnMs > 0 ? 'idle' : moving ? 'walk' : 'idle'}-${showDir}`;
      if (!sprite.anims.isPlaying || sprite.anims.currentAnim?.key !== key) sprite.play(key, true);
      col = Number(sprite.frame.name) % this.cols;
      if (!Number.isFinite(col)) col = 1;
    }
    const rig = this.rig[showDir];
    const bob = moving && pose.col === null && col < 4 ? (rig.walkBob[col] ?? 0) : 0;
    sprite.y = this.baseY + bob;
    sprite.x = offsetX;

    // Dano: clarão avermelhado curto, depois pisca enquanto dura a reação.
    const flashing = this.flashMs > 0;
    this.flashMs = Math.max(0, this.flashMs - delta);
    if (this.flashMs > 0) sprite.setTint(0xff8f80);
    else if (flashing) sprite.clearTint();
    sprite.setAlpha(pose.hurt && Math.floor(this.stance.hurtT / 55) % 2 ? 0.45 : 1);

    this.placeItems(pose, showDir, col);
  }

  /** Ponto do quadro (pixel da folha) em coordenadas do contêiner. */
  framePoint([x, y]) {
    const s = this.sprite;
    return [s.x - s.displayOriginX + x + 0.5, s.y - s.displayOriginY + y + 0.5];
  }

  placeItem(image, look, point, angle, front) {
    if (!look) { image.setVisible(false); return; }
    const pose = weaponPose(look.look, angle);
    const size = 32;
    image.setTexture(`${look.key}-${pose.flipX ? 1 : 0}${pose.flipY ? 1 : 0}`)
      .setOrigin((pose.grip[0] + 0.5) / size, (pose.grip[1] + 0.5) / size)
      .setRotation((pose.rotation * Math.PI) / 180)
      .setPosition(...this.framePoint(point))
      .setAlpha(this.sprite.alpha)
      .setVisible(true);
    const list = this.container.list;
    const si = list.indexOf(this.sprite);
    const ii = list.indexOf(image);
    if (front && ii < si) this.container.moveTo(image, list.length - 1);
    else if (!front && ii > si) this.container.moveTo(image, si);
  }

  placeItems(pose, dir, col) {
    const rig = this.rig[dir];
    const weapon = this.weaponLook;
    const backFront = rig.back.layer === 'front';
    // Arma nas costas: fora de combate, sacando/guardando e enquanto usa a ferramenta.
    const weaponOnBack = pose.where === 'back' || pose.item === 'tool';
    if (weaponOnBack) this.placeItem(this.back, weapon, rig.back.grip, rig.back.angle, backFront);
    else this.back.setVisible(false);
    if (pose.where !== 'hand') { this.hand.setVisible(false); return; }
    const look = pose.item === 'tool' ? this.toolLooks[pose.tool] : (pose.handLook ?? weapon);
    const style = pose.item === 'tool' ? 'tool' : pose.style;
    let angle = weaponAngle(style, dir, col);
    let point = rig.hands[col] ?? rig.hands[1];
    if (pose.swingCol !== null && pose.mix < 1) {
      // Meio do golpe: a arma gira do preparo até o golpe e a mão acompanha.
      const from = weaponAngle(style, dir, pose.swingCol);
      const delta = ((angle - from + 540) % 360) - 180;
      const arc = style === 'slash' || style === 'heavy' || style === 'tool';
      const sweep = !arc ? delta : dir === 'down' || dir === 'right' ? (delta < 0 ? delta + 360 : delta) : (delta > 0 ? delta - 360 : delta);
      angle = from + sweep * pose.mix;
      const a = rig.hands[pose.swingCol];
      point = [Math.round(a[0] + (point[0] - a[0]) * pose.mix), Math.round(a[1] + (point[1] - a[1]) * pose.mix)];
    }
    this.placeItem(this.hand, look, point, angle, rig.layer[col] !== 'back');
  }

  /** Estado para testes e depuração. */
  snapshot() {
    const pose = this.stance.pose();
    return {
      mode: this.stance.mode,
      holdLeft: Math.round(this.stance.holdLeft),
      col: pose.col,
      where: pose.where,
      item: pose.item,
      backVisible: this.back.visible,
      backTexture: this.back.visible ? this.back.texture.key : null,
      handVisible: this.hand.visible,
      handTexture: this.hand.visible ? this.hand.texture.key : null,
      weaponKey: this.weaponLook?.key ?? null,
      frame: Number(this.sprite.frame.name)
    };
  }
}
