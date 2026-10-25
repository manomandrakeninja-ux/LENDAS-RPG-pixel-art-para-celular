import Phaser from 'phaser';
import '@fontsource/press-start-2p/400.css';
import { GameScene } from './game/GameScene.js';
import './style.css';

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
