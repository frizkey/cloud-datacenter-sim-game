import Phaser from 'phaser';
import './style.css';
import { MainScene } from './scenes/MainScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#0b0f19',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MainScene],
};

const game = new Phaser.Game(config);

export default game;
