import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { CONFIG } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: CONFIG.BACKGROUND_COLOR,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  input: {
    activePointers: 3, // Support multi-touch
  },
  scene: [GameScene],
};

new Phaser.Game(config);
