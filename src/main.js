import Phaser from 'phaser';
import '@fontsource/press-start-2p/400.css';
import { GameScene } from './game/GameScene.js';
import './style.css';

// A fonte Press Start 2P só fica nítida em múltiplos de 8 px e sem suavização.
// Os textos do mundo são ampliados 2x pela câmera: renderizá-los em resolução 2
// evita que fiquem borrados.
const TEXT_RESOLUTION = 2;
// O nome da fonte precisa de aspas: sem elas, o "2P" (começa com número) invalida
// a fonte no canvas e o navegador usa uma fonte padrão borrada.
const quoteFamily = (family) => (/["']/.test(family) || !/\s/.test(family) ? family : `"${family}"`);
const createText = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function text(x, y, content, style = {}) {
  const fontFamily = quoteFamily(style.fontFamily ?? 'Press Start 2P');
  return createText.call(this, x, y, content, { resolution: TEXT_RESOLUTION, ...style, fontFamily });
};

document.fonts.load('10px "Press Start 2P"').then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#213d31',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: 960,
      height: 640,
      min: { width: 320, height: 320 },
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false }
    },
    scene: [GameScene]
  });
  window.__LENDAS__ = game;
});
