// Fase 22: ciclo da arma do herói, sem Phaser (testável em Node).
// sheathed (arma nas costas) → drawing (mão vai ao ombro e puxa) → armed (arma na mão; cada golpe
// toca preparar/golpe/retorno) → depois de HOLD_MS sem golpear → sheathing (guarda, animação reversa).
// Ferramenta (minerar/coletar): a arma vai para as costas antes; a ferramenta vem na mão e volta depois.
import { WEAPON_STYLES } from '../art/heroRig.js';

export const HOLD_MS = 5000;
export const DRAW_MS = 160; // 2 quadros: mão no peito (5) e mão no ombro pegando o cabo (6)
export const SHEATHE_MS = 160;
export const ATTACK_MS = 270; // preparar 70 + golpe 110 + retorno 90
export const ATTACK_PHASES = Object.freeze([70, 110, 90]);
export const TOOL_SWING_MS = 480;
export const HURT_MS = 260;

export class HeroStance {
  constructor() {
    this.mode = 'sheathed';
    this.t = 0;
    this.holdLeft = 0;
    this.attackT = null;
    this.queued = 0;
    this.style = 'slash';
    this.handLook = null; // aparência só deste golpe (ex.: arco no tiro)
    this.tool = null;
    this.toolT = 0;
    this.toolSwings = Infinity;
    this.afterTool = null;
    this.hurtT = null;
  }

  get armed() { return this.mode === 'armed'; }

  /** Pede um golpe. Devolve true se o golpe começa já (arma na mão) ou fica na fila (sacando). */
  attack({ style = 'slash', handLook = null } = {}) {
    this.style = style;
    this.handLook = handLook;
    if (this.mode === 'tool' || this.mode === 'tool-draw' || this.mode === 'tool-stow') {
      // Larga a ferramenta na hora para puxar a arma.
      this.tool = null;
      this.mode = 'sheathed';
    }
    if (this.mode === 'armed') {
      this.attackT = 0;
      this.holdLeft = HOLD_MS;
      return true;
    }
    if (this.mode === 'sheathed' || this.mode === 'sheathing') {
      this.mode = 'drawing';
      this.t = 0;
    }
    this.queued = 1;
    this.holdLeft = HOLD_MS;
    return true;
  }

  /** Começa a usar a ferramenta (swings = quantos golpes; Infinity = até stopTool). */
  startTool(tool = 'pickaxe', swings = Infinity) {
    this.toolSwings = swings;
    if (this.tool === tool && (this.mode === 'tool' || this.mode === 'tool-draw')) return;
    this.tool = tool;
    this.attackT = null;
    this.queued = 0;
    if (this.mode === 'armed' || this.mode === 'drawing') {
      // A arma volta para as costas antes de pegar a ferramenta.
      this.mode = 'sheathing';
      this.t = 0;
      this.afterTool = tool;
      return;
    }
    this.mode = 'tool-draw';
    this.t = 0;
    this.toolT = 0;
  }

  stopTool() {
    this.afterTool = null;
    if (this.mode === 'tool' || this.mode === 'tool-draw') {
      this.mode = 'tool-stow';
      this.t = 0;
    }
  }

  hurt() { this.hurtT = 0; }

  update(dt) {
    if (this.hurtT !== null) {
      this.hurtT += dt;
      if (this.hurtT >= HURT_MS) this.hurtT = null;
    }
    this.t += dt;
    switch (this.mode) {
      case 'drawing':
        if (this.t >= DRAW_MS) {
          this.mode = 'armed';
          this.t = 0;
          if (this.queued) { this.attackT = 0; this.queued = 0; }
        }
        break;
      case 'armed':
        if (this.attackT !== null) {
          this.attackT += dt;
          if (this.attackT >= ATTACK_MS) { this.attackT = null; this.handLook = null; }
          this.holdLeft = HOLD_MS; // os 5 s contam a partir do fim do último golpe
        } else {
          this.holdLeft -= dt;
          if (this.holdLeft <= 0) { this.mode = 'sheathing'; this.t = 0; this.holdLeft = 0; }
        }
        break;
      case 'sheathing':
        if (this.t >= SHEATHE_MS) {
          this.mode = 'sheathed';
          this.t = 0;
          if (this.afterTool) { this.mode = 'tool-draw'; this.toolT = 0; this.afterTool = null; }
        }
        break;
      case 'tool-draw':
        if (this.t >= DRAW_MS / 2) { this.mode = 'tool'; this.t = 0; this.toolT = 0; }
        break;
      case 'tool':
        this.toolT += dt;
        if (this.toolT >= TOOL_SWING_MS * this.toolSwings) this.stopTool();
        break;
      case 'tool-stow':
        if (this.t >= DRAW_MS / 2) { this.mode = 'sheathed'; this.t = 0; this.tool = null; }
        break;
      default:
        break;
    }
  }

  /**
   * O que mostrar agora: col = coluna de pose (null = andar/parado normal); item = 'weapon' | 'tool';
   * where = 'back' (arma nas costas) | 'hand'; angleFrom/angleTo/mix: o golpe gira a arma do preparo ao golpe.
   */
  pose() {
    const seq = (WEAPON_STYLES[this.style] ?? WEAPON_STYLES.slash).seq;
    const hurt = this.hurtT !== null && this.attackT === null;
    const base = { col: null, where: 'back', item: 'weapon', style: this.style, swingCol: null, mix: 0, hurt };
    switch (this.mode) {
      case 'drawing':
        return { ...base, col: this.t < DRAW_MS / 2 ? 5 : 6, where: 'back' };
      case 'sheathing':
        return { ...base, col: this.t < SHEATHE_MS / 2 ? 6 : 5, where: 'back' };
      case 'armed': {
        if (this.attackT === null) return { ...base, col: hurt ? 10 : null, where: 'hand' };
        const [a, b] = ATTACK_PHASES;
        const t = this.attackT;
        if (t < a) return { ...base, col: seq[0], where: 'hand', handLook: this.handLook };
        if (t < a + b) return { ...base, col: seq[1], where: 'hand', swingCol: seq[0], mix: Math.min(1, (t - a) / (b * 0.55)), handLook: this.handLook };
        return { ...base, col: seq[2], where: 'hand', handLook: this.handLook };
      }
      case 'tool-draw':
      case 'tool-stow':
        return { ...base, col: 5, where: 'hand', item: 'tool', style: 'tool', tool: this.tool };
      case 'tool': {
        const p = (this.toolT % TOOL_SWING_MS) / TOOL_SWING_MS;
        const tseq = WEAPON_STYLES.tool.seq;
        if (p < 0.55) return { ...base, col: tseq[0], where: 'hand', item: 'tool', style: 'tool', tool: this.tool };
        if (p < 0.78) return { ...base, col: tseq[1], where: 'hand', item: 'tool', style: 'tool', tool: this.tool, swingCol: tseq[0], mix: Math.min(1, (p - 0.55) / 0.12) };
        return { ...base, col: tseq[2], where: 'hand', item: 'tool', style: 'tool', tool: this.tool };
      }
      default:
        return { ...base, col: hurt ? 10 : null };
    }
  }
}
