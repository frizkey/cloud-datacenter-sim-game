/**
 * FacilityScene.js - 2.5D Isometric Data Center Floor Plan
 * Renders server racks, CRAC chillers, and thermodynamic airflow in isometric perspective.
 */

import Phaser from 'phaser';
import { gridToScreen, getIsoDepth, getTileDiamondVertices, DEFAULT_TILE_WIDTH, DEFAULT_TILE_HEIGHT } from '../render/IsoMath.js';
import { EngineEventTypes, globalEventBus } from '../core/events/EventBus.js';

export class FacilityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FacilityScene' });
    this.facilityVisuals = new Map();
  }

  create() {
    this.cameras.main.setBackgroundColor('#070a12');
    this.floorGraphics = this.add.graphics();
    this.componentGraphics = this.add.graphics();

    this.originX = 640;
    this.originY = 200;

    this.drawIsometricFloor();

    // Subscribe to engine snapshots
    this.unsubscribeSnapshot = globalEventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      this.syncState(evt.payload.snapshot);
    });

    // Enable drag-to-pan camera
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && !pointer.wasTouchHandled) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
      }
    });

    // Enable pinch / wheel zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - deltaY * 0.001, 0.5, 2.5);
      this.cameras.main.setZoom(newZoom);
    });
  }

  drawIsometricFloor() {
    this.floorGraphics.clear();
    const GRID_SIZE = 12;

    for (let gx = 0; gx < GRID_SIZE; gx++) {
      for (let gy = 0; gy < GRID_SIZE; gy++) {
        const vertices = getTileDiamondVertices(gx, gy, this.originX, this.originY, 64, 32);

        // High-tech server room floor tile
        const isChecker = (gx + gy) % 2 === 0;
        this.floorGraphics.fillStyle(isChecker ? 0x0f172a : 0x1e293b, 0.8);
        this.floorGraphics.lineStyle(1, 0x334155, 0.5);

        this.floorGraphics.beginPath();
        this.floorGraphics.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < 4; i++) {
          this.floorGraphics.lineTo(vertices[i].x, vertices[i].y);
        }
        this.floorGraphics.closePath();
        this.floorGraphics.fillPath();
        this.floorGraphics.strokePath();
      }
    }
  }

  syncState(snapshot) {
    if (!snapshot) return;

    this.componentGraphics.clear();
    const components = snapshot.facilityComponents || [];

    // Sort by isometric depth to ensure back-to-front rendering
    const sorted = [...components].sort((a, b) => getIsoDepth(a.isoX, a.isoY) - getIsoDepth(b.isoX, b.isoY));

    for (const comp of sorted) {
      this.renderFacilityComponent(comp);
    }
  }

  renderFacilityComponent(comp) {
    const screen = gridToScreen(comp.isoX, comp.isoY, this.originX, this.originY, 64, 32);
    const tempC = comp.temperatureCelsius || 25;

    // Heat color mapping
    let heatColor = 0x22c55e; // Green <= 32C
    if (tempC > 45) {
      heatColor = 0xef4444; // Emergency Red > 45C
    } else if (tempC > 32) {
      heatColor = 0xf59e0b; // Amber Warning 32-45C
    }

    if (comp.type === 'CRAC_CHILLER') {
      // Draw blue CRAC chiller box
      this.drawIsoPrism(screen.x, screen.y, 40, 0x0284c7, 0x38bdf8);
      // Cold airflow halo
      this.componentGraphics.fillStyle(0x38bdf8, 0.15);
      this.componentGraphics.fillCircle(screen.x, screen.y, 40);
    } else if (comp.type === 'UPS_BATTERY') {
      // Green/amber battery reserve bank
      this.drawIsoPrism(screen.x, screen.y, 35, 0x14532d, 0x4ade80);
      // Battery charge level indicator
      const chargePct = Math.min(1.0, (comp.currentChargeKwh || 50) / (comp.capacityKwh || 50));
      this.componentGraphics.fillStyle(chargePct > 0.3 ? 0x22c55e : 0xef4444, 1);
      this.componentGraphics.fillRect(screen.x - 12, screen.y - 45, 24 * chargePct, 3);
    } else if (comp.type === 'DIESEL_GENERATOR') {
      // Industrial backup diesel generator
      this.drawIsoPrism(screen.x, screen.y, 45, 0x78350f, 0xf97316);
      if (comp.isRunning) {
        // Diesel exhaust smoke particles
        this.componentGraphics.fillStyle(0x475569, 0.6);
        this.componentGraphics.fillCircle(screen.x + 8, screen.y - 60, 6);
        this.componentGraphics.fillCircle(screen.x + 12, screen.y - 70, 9);
      }
    } else if (comp.type === 'PDU_3PHASE') {
      // Yellow electrical distribution breaker
      this.drawIsoPrism(screen.x, screen.y, 30, 0x713f12, 0xfacc15);
    } else if (comp.type === 'AISLE_CONTAINMENT') {
      // Tempered glass cold-aisle partition
      this.drawIsoPrism(screen.x, screen.y, 55, 0x0f172a, 0x94a3b8);
    } else {
      // Overheating hotspot warning ring
      if (tempC >= 45.0) {
        this.componentGraphics.lineStyle(2, 0xef4444, 0.8);
        this.componentGraphics.strokeCircle(screen.x, screen.y, 35);
        // Smoke plume
        this.componentGraphics.fillStyle(0x94a3b8, 0.4);
        this.componentGraphics.fillCircle(screen.x - 2, screen.y - 65, 8);
        this.componentGraphics.fillCircle(screen.x + 3, screen.y - 75, 12);
      }

      // Default: 42U Server Rack isometric cabinet
      this.drawIsoPrism(screen.x, screen.y, 50, 0x1e293b, heatColor);

      // Server rack LED status line
      this.componentGraphics.fillStyle(comp.isPowerActive ? heatColor : 0x64748b, 1);
      this.componentGraphics.fillRect(screen.x - 4, screen.y - 35, 8, 3);
    }
  }

  /**
   * Draw 2.5D isometric extruded prism block
   */
  drawIsoPrism(centerX, centerY, heightPx, fillColor, edgeColor) {
    const halfW = 24;
    const halfH = 12;

    // Top diamond face (elevated by heightPx)
    const topY = centerY - heightPx;
    this.componentGraphics.fillStyle(fillColor, 1);
    this.componentGraphics.lineStyle(1.5, edgeColor, 0.9);

    // Left face
    this.componentGraphics.beginPath();
    this.componentGraphics.moveTo(centerX - halfW, topY);
    this.componentGraphics.lineTo(centerX, topY + halfH);
    this.componentGraphics.lineTo(centerX, centerY + halfH);
    this.componentGraphics.lineTo(centerX - halfW, centerY);
    this.componentGraphics.closePath();
    this.componentGraphics.fillPath();
    this.componentGraphics.strokePath();

    // Right face
    this.componentGraphics.beginPath();
    this.componentGraphics.moveTo(centerX, topY + halfH);
    this.componentGraphics.lineTo(centerX + halfW, topY);
    this.componentGraphics.lineTo(centerX + halfW, centerY);
    this.componentGraphics.lineTo(centerX, centerY + halfH);
    this.componentGraphics.closePath();
    this.componentGraphics.fillPath();
    this.componentGraphics.strokePath();

    // Top face
    this.componentGraphics.beginPath();
    this.componentGraphics.moveTo(centerX, topY - halfH);
    this.componentGraphics.lineTo(centerX + halfW, topY);
    this.componentGraphics.lineTo(centerX, topY + halfH);
    this.componentGraphics.lineTo(centerX - halfW, topY);
    this.componentGraphics.closePath();
    this.componentGraphics.fillPath();
    this.componentGraphics.strokePath();
  }

  destroy() {
    if (this.unsubscribeSnapshot) this.unsubscribeSnapshot();
  }
}
