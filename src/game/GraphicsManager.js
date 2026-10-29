import Phaser from 'phaser';
import { GRAPHICS_LABELS, frameStats, graphicsProfile, suggestGraphicsMode } from './graphics.js';
import { loadSettings, saveSettings } from './Settings.js';

const MEASURE_START_MS = 2500; // espera o jogo assentar (carregamento e primeiros desenhos)
const MEASURE_MS = 4000;

/**
 * Aplica o modo gráfico escolhido (perfil em `scene.gfx`), a resolução interna reduzida, o limite de
 * 30 fps e o contador de fps; e na primeira execução mede o aparelho para sugerir o modo.
 */
export class GraphicsManager {
  constructor(scene) {
    this.scene = scene;
    this.frames = [];
    this.counterElapsed = 0;
    this.counterFrames = 0;
    this.counterFps = 0;
    this.suggestion = null;
    this.patchScale();
    this.counter = document.createElement('div');
    this.counter.id = 'fps-counter';
    this.counter.className = 'fps-counter';
    this.counter.hidden = true;
    (document.getElementById('game') ?? document.body).append(this.counter);
    scene.events.once('shutdown', () => this.counter.remove());
    this.measured = 0;
    this.measureStart = null;
  }

  get settings() {
    return this.scene.settingsPanel?.settings ?? loadSettings();
  }

  /** Reduz o tamanho interno do canvas (renderScale) e estica por CSS; o ponteiro continua certo (displayScale). */
  patchScale() {
    const scale = this.scene.scale;
    // A Scale Manager vive mais que a cena (scene.restart cria outro GraphicsManager): o fator fica nele.
    if (scale.__lendasRenderScale) return;
    scale.__lendasRenderScale = true;
    scale.__lendasFactor = 1;
    const original = scale.updateScale.bind(scale);
    scale.updateScale = () => {
      original();
      const canvas = scale.canvas;
      const factor = scale.__lendasFactor;
      if (scale.scaleMode !== Phaser.Scale.RESIZE || factor >= 1) {
        if (canvas.style.width) { canvas.style.width = ''; canvas.style.height = ''; canvas.style.imageRendering = ''; }
        return;
      }
      const cssWidth = scale.displaySize.width;
      const cssHeight = scale.displaySize.height;
      const width = Math.max(240, Math.round(cssWidth * factor));
      const height = Math.max(240, Math.round(cssHeight * factor));
      canvas.width = width;
      canvas.height = height;
      scale.gameSize.setSize(width, height);
      scale.baseSize.setSize(width, height);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.imageRendering = 'auto';
    };
  }

  /** Aplica o modo salvo; `scene.gfx` vale já na criação da cena. */
  apply() {
    const settings = this.settings;
    const scene = this.scene;
    const profile = graphicsProfile(settings.graphics);
    scene.gfx = profile;
    scene.graphicsMode = settings.graphics;
    if (scene.scale.__lendasFactor !== profile.renderScale) {
      scene.scale.__lendasFactor = profile.renderScale;
      if (scene.scale.refresh) scene.scale.refresh();
    }
    this.applyFpsCap(settings.fpsCap30);
    this.counter.hidden = !settings.fpsCounter;
    scene.lighting?.setProfile?.(profile);
    scene.effects?.setProfile?.(profile);
    scene.ui?.setGraphics?.(profile);
    scene.shadows?.setProfile?.(profile);
    scene.world?.setBackgroundAnimations?.(profile.backgroundAnimations);
    scene.harvestStructures?.setBackgroundAnimations?.(profile.backgroundAnimations);
  }

  applyFpsCap(capped) {
    const loop = this.scene.game.loop;
    if (!loop?.raf || this.capped === capped) return;
    this.capped = capped;
    loop.fpsLimit = capped ? 30 : 0;
    loop.hasFpsLimit = capped;
    loop._limitRate = capped ? 1000 / 30 - 1 : 0;
    loop.raf.callback = capped ? loop.stepLimitFPS.bind(loop) : loop.step.bind(loop);
  }

  /** Chamado todo quadro (barato): contador de fps e medição da primeira execução. */
  update(delta) {
    const settings = this.settings;
    if (settings.fpsCounter) {
      this.counterElapsed += delta;
      this.counterFrames += 1;
      if (this.counterElapsed >= 500) {
        this.counterFps = this.counterFrames * 1000 / this.counterElapsed;
        this.counter.textContent = `${Math.round(this.counterFps)} FPS`;
        this.counterElapsed = 0;
        this.counterFrames = 0;
      }
    }
    if (settings.graphicsChosen || this.suggestion || this.scene.isUiPaused?.()) return;
    this.measured += delta;
    if (this.measured < MEASURE_START_MS) return;
    this.frames.push(delta);
    if (this.measured >= MEASURE_START_MS + MEASURE_MS) this.finishDetection();
  }

  /** Mede o fps dos primeiros segundos de jogo, junta com o aparelho e aplica o modo sugerido (uma única vez). */
  finishDetection() {
    const { fps } = frameStats(this.frames);
    const mode = suggestGraphicsMode({
      cores: navigator.hardwareConcurrency ?? null,
      memory: navigator.deviceMemory ?? null,
      fps: this.settings.fpsCap30 ? null : fps
    });
    this.suggestion = mode;
    const panel = this.scene.settingsPanel;
    if (!panel) return;
    // A detecção não repete: o aparelho fica registrado e o jogador pode trocar quando quiser.
    panel.settings = { ...panel.settings, graphics: mode, graphicsChosen: true };
    saveSettings(panel.settings);
    panel.settings = loadSettings();
    this.apply();
    panel.render();
    if (mode !== 'high') {
      this.scene.ui?.showMessage(`Modo gráfico ${GRAPHICS_LABELS[mode]} ativado para o seu aparelho. Troque em Ajustes > Gráficos.`);
    }
  }
}
