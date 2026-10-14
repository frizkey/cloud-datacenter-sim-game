import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Assets preload phase
  }

  create() {
    const { width, height } = this.scale;

    // Background grid accent
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, 0x1e293b, 0.4);
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      gridGraphics.lineBetween(0, y, width, y);
    }

    // Title & status banner
    this.add.text(width / 2, height / 2 - 40, 'Cloud & Data Center Simulation', {
      fontSize: '32px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#38bdf8',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 10, 'Phaser 4 Empty Project Template Initialized', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#94a3b8',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 50, `Phaser v${Phaser.VERSION} | Ready for Development`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#22c55e',
    }).setOrigin(0.5);
  }

  update(time, delta) {
    // Game loop tick
  }
}
