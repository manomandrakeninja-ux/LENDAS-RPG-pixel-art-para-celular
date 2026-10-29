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

// Base de cada prédio do acampamento, relativa ao ponto de apoio do sprite, por estágio visual (1, 4, 8).
// Item 19: os prédios foram repintados na escala do herói (2–3x a altura dele), então a base cresceu junto.
export const BUILDING_FOOTPRINTS = {
  house: { 1: { x: 1, y: -10, width: 84, height: 20 }, 4: { x: -5, y: -11, width: 112, height: 22 }, 8: { x: -7, y: -11, width: 148, height: 22 } },
  forge: { 1: { x: -3, y: -9, width: 104, height: 16 }, 4: { x: -9, y: -11, width: 116, height: 22 }, 8: { x: -13, y: -11, width: 148, height: 22 } },
  farm: { 1: { x: -31, y: -10, width: 60, height: 20 }, 4: { x: -10, y: -11, width: 126, height: 22 }, 8: { x: 13, y: -11, width: 160, height: 22 } },
  market: { 1: { x: 0, y: -10, width: 92, height: 18 }, 4: { x: -5, y: -11, width: 116, height: 22 }, 8: { x: 0, y: -2, width: 190, height: 30 } }
};

/** Base do prédio no estágio visual (1, 4 ou 8). */
export function buildingFootprint(key, stage) {
  const byStage = BUILDING_FOOTPRINTS[key];
  return byStage?.[stage] ?? byStage?.[1] ?? null;
}
