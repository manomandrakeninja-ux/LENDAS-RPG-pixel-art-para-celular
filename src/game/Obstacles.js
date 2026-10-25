// Obstáculos sólidos do mundo (base dos prédios, torres, postes e troncos).
// Só a base bloqueia: o personagem continua passando por trás do telhado ou da copa.
export class Obstacles {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.staticGroup();
  }

  /** Retângulo invisível e sólido com centro em (x, y), em coordenadas do mundo. */
  add(x, y, width, height) {
    const zone = this.scene.add.zone(x, y, width, height);
    this.scene.physics.add.existing(zone, true);
    this.group.add(zone);
    return zone;
  }

  remove(zones = []) {
    for (const zone of zones) {
      if (!zone?.active) continue;
      this.group.remove(zone);
      zone.destroy();
    }
  }

  collide(object) {
    return this.scene.physics.add.collider(object, this.group);
  }
}

// Base de cada prédio do acampamento, relativa ao ponto de apoio do sprite.
export const BUILDING_FOOTPRINTS = {
  house: { x: 0, y: -8, width: 42, height: 17 },
  forge: { x: 0, y: -8, width: 43, height: 17 },
  farm: { x: -4, y: -8, width: 52, height: 17 },
  market: { x: 4, y: -8, width: 50, height: 17 }
};
