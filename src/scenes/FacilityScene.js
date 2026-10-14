/**
 * FacilityScene.js - 2.5D Isometric Data Center Floor Plan
 * Renders server racks, CRAC chillers, and thermodynamic airflow in isometric perspective.
 */

import Phaser from 'phaser';
import { gridToScreen, screenToGridCell, getIsoDepth, getTileDiamondVertices, DEFAULT_TILE_WIDTH, DEFAULT_TILE_HEIGHT } from '../render/IsoMath.js';
import { EngineEventTypes, globalEventBus } from '../core/events/EventBus.js';
import { COMPONENT_CATALOG, FacilityComponentType } from '../core/sim/Constants.js';

export class FacilityScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FacilityScene' });
    this.facilityVisuals = new Map();
    this.isPlacing = false;
    this.placementType = null;
    this.isDraggingFromDrawer = false;

    // Explicit camera pan state to prevent canvas jumping
    this.isPanning = false;
    this.panOriginX = 0;
    this.panOriginY = 0;
    this.camOriginX = 0;
    this.camOriginY = 0;
    this.justPlaced = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#070a12');
    this.floorGraphics = this.add.graphics();
    this.componentGraphics = this.add.graphics();
    this.ghostGraphics = this.add.graphics();
    this.ghostGraphics.setDepth(9999);

    this.originX = 640;
    this.originY = 200;

    this.drawIsometricFloor();

    // Subscribe to engine snapshots
    this.unsubscribeSnapshot = globalEventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      this.syncState(evt.payload.snapshot);
    });

    // Subscribe to placement events for facility components
    this.unsubscribeDragInitiated = globalEventBus.on('COMPONENT_DRAG_INITIATED', (evt) => {
      if (evt?.payload?.type && evt.payload.type in FacilityComponentType) {
        this.enterPlacementMode(evt.payload.type, true);
      }
    });

    this.unsubscribeStartPlacement = globalEventBus.on('START_PLACEMENT_MODE', (evt) => {
      if (evt?.payload?.type && evt.payload.type in FacilityComponentType) {
        this.enterPlacementMode(evt.payload.type, false);
      }
    });

    this.unsubscribeCancelPlacement = globalEventBus.on('CANCEL_PLACEMENT_MODE', () => {
      this.exitPlacementMode();
    });

    // Enable drag-to-pan camera & placement ghost
    this.input.on('pointermove', (pointer) => {
      if (this.isPlacing) {
        this.updatePlacementGhost(pointer);
        return; // SUPPRESS CAMERA PAN WHILE PLACING COMPONENT
      }

      if (this.isPanning && !this.justPlaced) {
        const dx = pointer.x - this.panOriginX;
        const dy = pointer.y - this.panOriginY;
        this.cameras.main.scrollX = this.camOriginX - dx / this.cameras.main.zoom;
        this.cameras.main.scrollY = this.camOriginY - dy / this.cameras.main.zoom;
      }
    });

    // Enable pinch / wheel zoom
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom - deltaY * 0.001, 0.5, 2.5);
      this.cameras.main.setZoom(newZoom);
    });

    // Handle click to place or camera pan start
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (this.isPlacing) {
        if (pointer.button === 2) {
          this.exitPlacementMode();
          return;
        }
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const placed = this.tryPlaceFacilityAt(this.placementType, worldPoint.x, worldPoint.y);
        if (placed) {
          this.justPlaced = true;
          this.exitPlacementMode();
          setTimeout(() => { this.justPlaced = false; }, 250);
        }
        return;
      }

      if (!currentlyOver || currentlyOver.length === 0) {
        this.isPanning = true;
        this.panOriginX = pointer.x;
        this.panOriginY = pointer.y;
        this.camOriginX = this.cameras.main.scrollX;
        this.camOriginY = this.cameras.main.scrollY;
      }
    });

    // Handle drag-and-drop release
    this.input.on('pointerup', (pointer) => {
      if (this.isPlacing && this.isDraggingFromDrawer) {
        const isOverDrawer = pointer.y > this.scale.height - 120;
        if (!isOverDrawer) {
          const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const placed = this.tryPlaceFacilityAt(this.placementType, worldPoint.x, worldPoint.y);
          if (placed) {
            this.justPlaced = true;
            this.exitPlacementMode();
            setTimeout(() => { this.justPlaced = false; }, 250);
          }
        } else {
          this.isDraggingFromDrawer = false;
        }
      }

      this.isPanning = false;
    });

    this.escKeyHandler = (e) => {
      if (e.key === 'Escape' && this.isPlacing) {
        this.exitPlacementMode();
      }
    };
    window.addEventListener('keydown', this.escKeyHandler);
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
    if (this.unsubscribeDragInitiated) this.unsubscribeDragInitiated();
    if (this.unsubscribeStartPlacement) this.unsubscribeStartPlacement();
    if (this.unsubscribeCancelPlacement) this.unsubscribeCancelPlacement();
    if (this.escKeyHandler) window.removeEventListener('keydown', this.escKeyHandler);
    if (this.ghostGraphics) {
      this.ghostGraphics.destroy();
      this.ghostGraphics = null;
    }
  }

  enterPlacementMode(type, isDragging = false) {
    this.placementType = type;
    this.isPlacing = true;
    this.isDraggingFromDrawer = isDragging;
  }

  exitPlacementMode() {
    this.isPlacing = false;
    this.placementType = null;
    this.isDraggingFromDrawer = false;
    if (this.ghostGraphics) {
      this.ghostGraphics.clear();
    }
    globalEventBus.emit('PLACEMENT_MODE_EXITED');
  }

  updatePlacementGhost(pointer) {
    if (!this.isPlacing || !this.placementType || !this.ghostGraphics) return;
    this.ghostGraphics.clear();

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const cell = screenToGridCell(worldPoint.x, worldPoint.y, this.originX, this.originY, 64, 32);

    const isValid = cell.gridX >= 0 && cell.gridX < 12 && cell.gridY >= 0 && cell.gridY < 12;
    const vertices = getTileDiamondVertices(cell.gridX, cell.gridY, this.originX, this.originY, 64, 32);

    this.ghostGraphics.lineStyle(2, isValid ? 0x22c55e : 0xef4444, 0.9);
    this.ghostGraphics.fillStyle(isValid ? 0x22c55e : 0xef4444, 0.25);
    this.ghostGraphics.beginPath();
    this.ghostGraphics.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < 4; i++) {
      this.ghostGraphics.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ghostGraphics.closePath();
    this.ghostGraphics.fillPath();
    this.ghostGraphics.strokePath();

    if (isValid) {
      const screen = gridToScreen(cell.gridX, cell.gridY, this.originX, this.originY, 64, 32);
      this.ghostGraphics.lineStyle(1.5, 0x38bdf8, 0.8);
      this.ghostGraphics.strokeRect(screen.x - 20, screen.y - 40, 40, 40);
    }
  }

  tryPlaceFacilityAt(type, worldX, worldY) {
    const cell = screenToGridCell(worldX, worldY, this.originX, this.originY, 64, 32);
    if (cell.gridX < 0 || cell.gridX >= 12 || cell.gridY < 0 || cell.gridY >= 12) {
      return false;
    }

    const catalogItem = COMPONENT_CATALOG[type];
    const buyCost = catalogItem?.costBuy || 0;
    const currentCash = this.currentSnapshot?.economicProfile?.cashMicroCents ?? Infinity;

    if (buyCost > currentCash) {
      globalEventBus.emit('INSUFFICIENT_FUNDS', { required: buyCost, available: currentCash });
      return false;
    }

    globalEventBus.emit('PLACE_COMPONENT', {
      type,
      gridX: cell.gridX,
      gridY: cell.gridY,
    });
    return true;
  }
}

