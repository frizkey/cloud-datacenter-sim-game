/**
 * TopologyScene.js - 2D Logical Cloud Architecture Canvas
 * Renders orthogonal node graph, queue depth gauges, network cables, and flowing request packet particles.
 */

import Phaser from 'phaser';
import { ParticlePool } from '../render/ParticlePool.js';
import { EngineEventTypes, globalEventBus } from '../core/events/EventBus.js';
import { GridSnapper } from '../render/GridSnapper.js';
import { COMPONENT_CATALOG, NodeType } from '../core/sim/Constants.js';
import { drawPhaserGlyph, GLYPH_THEMES } from '../render/ComponentGlyphs.js';
import { RadialTouchMenu } from '../ui/RadialTouchMenu.js';

export class TopologyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TopologyScene' });
    this.particlePool = new ParticlePool({ capacity: 3000 });
    this.nodesMap = new Map();
    this.connectionsMap = new Map();
    this.activePackets = [];
    this.particles = [];
    this.currentConnections = [];
    this.gridSnapper = new GridSnapper({ tileSize: 80 });

    // Placement Mode state
    this.isPlacing = false;
    this.placementType = null;
    this.placementGhost = null;
    this.isDraggingFromDrawer = false;

    // Manual Wiring Mode state
    this.isWiring = false;
    this.wiringSourceNodeId = null;
    this.wiringStartX = 0;
    this.wiringStartY = 0;
    this.wiringCurrentX = 0;
    this.wiringCurrentY = 0;
    this.floatingTexts = [];

    // Explicit camera pan state to prevent canvas jumping
    this.isPanning = false;
    this.panOriginX = 0;
    this.panOriginY = 0;
    this.camOriginX = 0;
    this.camOriginY = 0;
    this.justPlaced = false;

    // Cable & node selection state
    this.selectedNodeId = null;
    this.selectedConnectionId = null;
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b0f19');
    this.gridGraphics = this.add.graphics();
    this.cableGraphics = this.add.graphics();
    this.cablePulseGraphics = this.add.graphics();
    this.packetGraphics = this.add.graphics();
    this.sparkGraphics = this.add.graphics();
    this.beaconGraphics = this.add.graphics().setDepth(18);
    this.wiringGraphics = this.add.graphics().setDepth(20);

    this.nodeContainer = this.add.container(0, 0);

    this.drawBackgroundGrid();

    // Center camera on starter topology
    this.cameras.main.centerOn(520, 320);

    // Initialize RadialTouchMenu for mobile node context actions
    this.radialMenu = new RadialTouchMenu({
      onAction: (action, node) => this.handleRadialAction(action, node),
    });

    // Subscribe to engine snapshots
    this.unsubscribeSnapshot = globalEventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      this.syncState(evt.payload.snapshot);
    });

    // Subscribe to packet spawned events for visual particle emission
    this.unsubscribePacket = globalEventBus.on(EngineEventTypes.PACKET_SPAWNED, (evt) => {
      this.spawnVisualPacket(evt.payload.packet);
    });

    // Floating financial feedback on processed and dropped packets
    this.unsubscribePacketProcessed = globalEventBus.on(EngineEventTypes.PACKET_PROCESSED, (evt) => {
      const p = evt.payload?.packet;
      if (p && p.targetNodeId) {
        const visual = this.nodesMap.get(p.targetNodeId);
        if (visual && visual.container) {
          this.spawnFloatingText('+$0.002', visual.container.x, visual.container.y - 20, '#10b981');
        }
      }
    });

    this.unsubscribePacketDropped = globalEventBus.on(EngineEventTypes.PACKET_DROPPED, (evt) => {
      const p = evt.payload?.packet;
      if (p && p.targetNodeId) {
        const visual = this.nodesMap.get(p.targetNodeId);
        if (visual && visual.container) {
          this.spawnFloatingText('-SLA!', visual.container.x, visual.container.y - 20, '#ef4444');
        }
      }
    });

    // Subscribe to placement initiation events
    this.unsubscribeDragInitiated = globalEventBus.on('COMPONENT_DRAG_INITIATED', (evt) => {
      if (evt?.payload?.type) {
        this.enterPlacementMode(evt.payload.type, true);
      }
    });

    this.unsubscribeStartPlacement = globalEventBus.on('START_PLACEMENT_MODE', (evt) => {
      if (evt?.payload?.type) {
        this.enterPlacementMode(evt.payload.type, false);
      }
    });

    this.unsubscribeCancelPlacement = globalEventBus.on('CANCEL_PLACEMENT_MODE', () => {
      this.exitPlacementMode();
    });

    // Subscribe to selection events to highlight cables
    this.unsubscribeNodeSelected = globalEventBus.on('NODE_SELECTED', (evt) => {
      this.selectedNodeId = evt.payload?.node?.id || null;
      this.selectedConnectionId = evt.payload?.connection?.id || null;
    });

    this.unsubscribeConnSelected = globalEventBus.on('CONNECTION_SELECTED', (evt) => {
      this.selectedConnectionId = evt.payload?.connection?.id || null;
      this.selectedNodeId = null;
    });

    this.unsubscribeNodeDeselected = globalEventBus.on('NODE_DESELECTED', () => {
      this.selectedNodeId = null;
      this.selectedConnectionId = null;
      if (this.radialMenu) {
        this.radialMenu.hide();
      }
    });

    // Setup HTML5 canvas drag & drop
    this.setupCanvasDrop();

    // Enable drag-to-pan camera & placement ghost tracking & cable rubber-banding
    this.input.on('pointermove', (pointer) => {
      if (this.isPlacing) {
        this.updatePlacementGhost(pointer);
        return; // SUPPRESS CAMERA PAN WHILE PLACING/DRAGGING COMPONENT
      }

      if (this.isWiring) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.wiringCurrentX = worldPoint.x;
        this.wiringCurrentY = worldPoint.y;
        this.drawWiringPreview();
        return; // SUPPRESS CAMERA PAN WHILE WIRING
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

    // Handle click to place, cancel wiring, or empty canvas deselect / pan start
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (this.isWiring && pointer.button === 2) {
        this.endManualWiring();
        return;
      }

      if (this.isPlacing) {
        if (pointer.button === 2) {
          // Right click cancels placement
          this.exitPlacementMode();
          return;
        }

        // Left click to place
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const placed = this.tryPlaceNodeAt(this.placementType, worldPoint.x, worldPoint.y);
        if (placed) {
          this.justPlaced = true;
          this.exitPlacementMode();
          setTimeout(() => { this.justPlaced = false; }, 250);
        }
        return;
      }

      // Check if user clicked on a network link / cable
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const clickedConn = this.findConnectionNear(worldPoint.x, worldPoint.y);
      if (clickedConn) {
        this.selectedConnectionId = clickedConn.id;
        this.selectedNodeId = null;
        globalEventBus.emit('CONNECTION_SELECTED', { connection: clickedConn });
        return;
      }

      if (!currentlyOver || currentlyOver.length === 0) {
        if (this.radialMenu) {
          this.radialMenu.hide();
        }
        globalEventBus.emit('NODE_DESELECTED');
        // Start camera pan only on empty space
        this.isPanning = true;
        this.panOriginX = pointer.x;
        this.panOriginY = pointer.y;
        this.camOriginX = this.cameras.main.scrollX;
        this.camOriginY = this.cameras.main.scrollY;
      }
    });

    // Handle drag-and-drop release & manual wiring connection drop
    this.input.on('pointerup', (pointer) => {
      if (this.isWiring) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const TILE_PX = 80;
        let targetNode = null;
        if (this.currentSnapshot?.nodes) {
          for (const n of this.currentSnapshot.nodes) {
            const nx = n.gridX * TILE_PX;
            const ny = n.gridY * TILE_PX;
            if (Math.abs(worldPoint.x - nx) <= 45 && Math.abs(worldPoint.y - ny) <= 45) {
              targetNode = n;
              break;
            }
          }
        }

        if (targetNode && targetNode.id !== this.wiringSourceNodeId) {
          globalEventBus.emit('CONNECT_NODES', {
            sourceNodeId: this.wiringSourceNodeId,
            targetNodeId: targetNode.id,
          });
        }
        this.endManualWiring();
        return;
      }

      if (this.isPlacing && this.isDraggingFromDrawer) {
        const isOverDrawer = pointer.y > this.scale.height - 120;
        if (!isOverDrawer) {
          const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const placed = this.tryPlaceNodeAt(this.placementType, worldPoint.x, worldPoint.y);
          if (placed) {
            this.justPlaced = true;
            this.exitPlacementMode();
            setTimeout(() => { this.justPlaced = false; }, 250);
          }
        } else {
          // Stay in placement mode so user can click to place
          this.isDraggingFromDrawer = false;
        }
      }

      this.isPanning = false;
    });

    // Escape key cancels placement or wiring mode
    this.escKeyHandler = (e) => {
      if (e.key === 'Escape') {
        if (this.isPlacing) this.exitPlacementMode();
        if (this.isWiring) this.endManualWiring();
      }
    };
    window.addEventListener('keydown', this.escKeyHandler);
  }


  drawBackgroundGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x1e293b, 0.4);
    const worldSize = 4000;
    const gridSize = 64;

    for (let x = -worldSize / 2; x <= worldSize / 2; x += gridSize) {
      this.gridGraphics.lineBetween(x, -worldSize / 2, x, worldSize / 2);
    }
    for (let y = -worldSize / 2; y <= worldSize / 2; y += gridSize) {
      this.gridGraphics.lineBetween(-worldSize / 2, y, worldSize / 2, y);
    }
  }

  syncState(snapshot) {
    if (!snapshot) return;

    this.currentSnapshot = snapshot;
    this.currentConnections = snapshot.connections || [];
    this.renderNodes(snapshot.nodes);
    this.renderCables(snapshot.connections, snapshot.nodes);
  }

  renderNodes(nodes) {
    const activeNodeIds = new Set(nodes.map((n) => n.id));

    // Remove obsolete visual nodes
    for (const [id, visualNode] of this.nodesMap.entries()) {
      if (!activeNodeIds.has(id)) {
        visualNode.container.destroy();
        this.nodesMap.delete(id);
      }
    }

    // Update or create nodes
    const TILE_PX = 80;
    for (const node of nodes) {
      const posX = node.gridX * TILE_PX;
      const posY = node.gridY * TILE_PX;

      let visual = this.nodesMap.get(node.id);
      if (!visual) {
        const container = this.add.container(posX, posY);
        const bg = this.add.graphics();
        const glyphGraphic = this.add.graphics();

        const label = this.add.text(0, 16, node.name || node.type, {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#cbd5e1',
          align: 'center',
        }).setOrigin(0.5);

        const rpsLabel = this.add.text(0, 28, `${node.currentRps || 0} RPS`, {
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#38bdf8',
        }).setOrigin(0.5);

        // Interactive output port dot at right edge (x = 36, y = 0)
        const outPort = this.add.circle(36, 0, 7, 0x22c55e, 1.0);
        outPort.setStrokeStyle(2, 0xffffff, 0.9);
        outPort.setInteractive({ useHandCursor: true });
        outPort.on('pointerdown', (pointer) => {
          pointer.event?.stopPropagation?.();
          this.startManualWiring(node.id, container.x + 36, container.y);
        });

        // Interactive input port dot at left edge (x = -36, y = 0)
        const inPort = this.add.circle(-36, 0, 7, 0x38bdf8, 1.0);
        inPort.setStrokeStyle(2, 0xffffff, 0.9);
        inPort.setInteractive({ useHandCursor: true });
        inPort.on('pointerup', (pointer) => {
          if (this.isWiring && this.wiringSourceNodeId && this.wiringSourceNodeId !== node.id) {
            pointer.event?.stopPropagation?.();
            globalEventBus.emit('CONNECT_NODES', {
              sourceNodeId: this.wiringSourceNodeId,
              targetNodeId: node.id,
            });
            this.endManualWiring();
          }
        });

        container.add([bg, glyphGraphic, label, rpsLabel, outPort, inPort]);
        container.setSize(72, 72);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', (pointer) => {
          if (this.isPlacing || this.isWiring) return;
          this.selectedNodeId = node.id;
          this.selectedConnectionId = null;
          const liveNode = this.currentSnapshot?.nodes?.find((n) => n.id === node.id) || node;
          globalEventBus.emit('NODE_SELECTED', { node: liveNode });
          if (this.radialMenu) {
            const screenX = pointer?.event ? pointer.event.clientX : (pointer?.x || 0);
            const screenY = pointer?.event ? pointer.event.clientY : (pointer?.y || 0);
            this.radialMenu.show(liveNode, screenX, screenY);
          }
        });

        visual = { container, bg, glyphGraphic, label, rpsLabel, outPort, inPort, nodeData: node };
        this.nodesMap.set(node.id, visual);
        this.nodeContainer.add(container);
      }

      // Update position and visual state
      visual.container.setPosition(posX, posY);
      visual.rpsLabel.setText(`${node.currentRps || 0} RPS`);

      // Draw node card background
      visual.bg.clear();
      const isNodeSelected = this.selectedNodeId === node.id;
      const borderColor = isNodeSelected
        ? 0x38bdf8
        : (node.status === 'CRITICAL' ? 0xef4444 : (node.colorHex || 0x3b82f6));
      visual.bg.fillStyle(0x0f172a, 0.9);
      visual.bg.lineStyle(isNodeSelected ? 3 : 2, borderColor, 0.9);
      visual.bg.fillRoundedRect(-36, -36, 72, 72, 10);
      visual.bg.strokeRoundedRect(-36, -36, 72, 72, 10);

      // Redraw vector sci-fi blueprint glyph
      visual.glyphGraphic.clear();
      drawPhaserGlyph(visual.glyphGraphic, node.type, 0, -8, 16, isNodeSelected ? 0x38bdf8 : null);

      // Emergency incident strobe beacon
      if (node.status === 'CRITICAL') {
        const pulseAlpha = Math.sin(this.time.now / 120) * 0.4 + 0.6;
        visual.bg.lineStyle(3, 0xef4444, pulseAlpha);
        visual.bg.strokeCircle(0, 0, 46);
      }

      // Queue depth gauge bar at bottom of node
      const loadRatio = Math.min(1.0, (node.currentRps || 0) / (node.capacityRps || 500));
      const barColor = loadRatio > 0.8 ? 0xef4444 : (loadRatio > 0.5 ? 0xf59e0b : 0x22c55e);
      visual.bg.fillStyle(0x334155, 1);
      visual.bg.fillRect(-30, 32, 60, 4);
      visual.bg.fillStyle(barColor, 1);
      visual.bg.fillRect(-30, 32, 60 * loadRatio, 4);
    }
  }

  renderCables(connections, nodes) {
    this.cableGraphics.clear();
    const nodeCoords = new Map();
    const TILE_PX = 80;
    for (const n of nodes) {
      nodeCoords.set(n.id, { x: n.gridX * TILE_PX, y: n.gridY * TILE_PX, status: n.status });
    }

    for (const conn of connections) {
      const src = nodeCoords.get(conn.sourceNodeId);
      const tgt = nodeCoords.get(conn.targetNodeId);
      if (!src || !tgt) continue;

      const isSelected = this.selectedConnectionId === conn.id ||
        (this.selectedNodeId && (conn.sourceNodeId === this.selectedNodeId || conn.targetNodeId === this.selectedNodeId));

      const srcPortX = src.x + 36;
      const srcPortY = src.y;
      const tgtPortX = tgt.x - 36;
      const tgtPortY = tgt.y;
      const midX = (srcPortX + tgtPortX) / 2;

      // Stepped 90-degree orthogonal Manhattan neon conduits with saturation heat tinting
      const isCritical = src.status === 'CRITICAL' || tgt.status === 'CRITICAL';
      const baseGlowColor = isSelected ? 0x38bdf8 : (isCritical ? 0xef4444 : 0x0284c7);
      const coreColor = isSelected ? 0xffffff : (isCritical ? 0xfca5a5 : 0x38bdf8);

      // Outer glow line
      this.cableGraphics.lineStyle(isSelected ? 5 : 3.5, baseGlowColor, isSelected ? 0.9 : 0.6);
      this.cableGraphics.beginPath();
      this.cableGraphics.moveTo(srcPortX, srcPortY);
      this.cableGraphics.lineTo(midX, srcPortY);
      this.cableGraphics.lineTo(midX, tgtPortY);
      this.cableGraphics.lineTo(tgtPortX, tgtPortY);
      this.cableGraphics.strokePath();

      // Inner neon core
      this.cableGraphics.lineStyle(isSelected ? 2.5 : 1.5, coreColor, 0.95);
      this.cableGraphics.beginPath();
      this.cableGraphics.moveTo(srcPortX, srcPortY);
      this.cableGraphics.lineTo(midX, srcPortY);
      this.cableGraphics.lineTo(midX, tgtPortY);
      this.cableGraphics.lineTo(tgtPortX, tgtPortY);
      this.cableGraphics.strokePath();

      // Port indicator dots
      this.cableGraphics.fillStyle(0x22c55e, 1);
      this.cableGraphics.fillCircle(srcPortX, srcPortY, isSelected ? 5 : 4);
      this.cableGraphics.fillStyle(0x38bdf8, 1);
      this.cableGraphics.fillCircle(tgtPortX, tgtPortY, isSelected ? 5 : 4);
    }
  }

  spawnVisualPacket(packet) {
    if (!packet || this.activePackets.length >= 75) return;

    // Build multi-hop orthogonal waypoints from packet.path
    const pathNodeIds = packet.path && packet.path.length > 0 ? packet.path : [packet.originNodeId];
    const rawNodes = [];

    for (const nodeId of pathNodeIds) {
      const visual = this.nodesMap.get(nodeId);
      if (visual && visual.container) {
        rawNodes.push({ x: visual.container.x, y: visual.container.y });
      }
    }

    // Fallback: If only 1 node, look for an outgoing cable
    if (rawNodes.length < 2) {
      const originVisual = this.nodesMap.get(packet.originNodeId);
      if (!originVisual) return;

      if (this.currentConnections) {
        const conn = this.currentConnections.find((c) => c.sourceNodeId === packet.originNodeId);
        if (conn) {
          const tgtVisual = this.nodesMap.get(conn.targetNodeId);
          if (tgtVisual) {
            rawNodes.length = 0;
            rawNodes.push({ x: originVisual.container.x, y: originVisual.container.y });
            rawNodes.push({ x: tgtVisual.container.x, y: tgtVisual.container.y });
          }
        }
      }
    }

    if (rawNodes.length < 2) return;

    // Convert raw straight-line hops to 90-degree orthogonal Manhattan waypoints
    const waypoints = [];
    for (let i = 0; i < rawNodes.length - 1; i++) {
      const p1 = rawNodes[i];
      const p2 = rawNodes[i + 1];
      const startX = p1.x + 36;
      const startY = p1.y;
      const endX = p2.x - 36;
      const endY = p2.y;
      const midX = (startX + endX) / 2;

      if (i === 0) waypoints.push({ x: startX, y: startY });
      waypoints.push({ x: midX, y: startY });
      waypoints.push({ x: midX, y: endY });
      waypoints.push({ x: endX, y: endY });
    }

    let color = 0x10b981; // 200 OK GET emerald green
    let size = 4.5;
    let speed = 260; // px/sec

    if (packet.state === 'DROPPED') {
      color = 0xef4444; // Ruby red
      size = 5.0;
      speed = 220;
    } else if (packet.isCacheHit) {
      color = 0x06b6d4; // Electric cyan
      size = 4.5;
      speed = 300;
    } else if (packet.type === 'HTTP_POST') {
      color = 0xa855f7; // Neon purple
      size = 5.0;
    } else if (packet.colorHex) {
      color = packet.colorHex;
    }

    this.activePackets.push({
      id: packet.id,
      waypoints,
      currentSegment: 0,
      segmentProgress: 0,
      x: waypoints[0].x,
      y: waypoints[0].y,
      color,
      size,
      speed,
      trail: [],
      isDropped: packet.state === 'DROPPED',
    });
  }

  startManualWiring(sourceNodeId, startX, startY) {
    this.isWiring = true;
    this.wiringSourceNodeId = sourceNodeId;
    this.wiringStartX = startX;
    this.wiringStartY = startY;
    this.wiringCurrentX = startX;
    this.wiringCurrentY = startY;
    this.drawWiringPreview();
  }

  drawWiringPreview() {
    if (!this.wiringGraphics) return;
    this.wiringGraphics.clear();
    if (!this.isWiring) return;

    const midX = (this.wiringStartX + this.wiringCurrentX) / 2;
    // Outer neon glow
    this.wiringGraphics.lineStyle(5, 0x38bdf8, 0.4);
    this.wiringGraphics.beginPath();
    this.wiringGraphics.moveTo(this.wiringStartX, this.wiringStartY);
    this.wiringGraphics.lineTo(midX, this.wiringStartY);
    this.wiringGraphics.lineTo(midX, this.wiringCurrentY);
    this.wiringGraphics.lineTo(this.wiringCurrentX, this.wiringCurrentY);
    this.wiringGraphics.strokePath();

    // Inner core
    this.wiringGraphics.lineStyle(2.5, 0xffffff, 0.95);
    this.wiringGraphics.beginPath();
    this.wiringGraphics.moveTo(this.wiringStartX, this.wiringStartY);
    this.wiringGraphics.lineTo(midX, this.wiringStartY);
    this.wiringGraphics.lineTo(midX, this.wiringCurrentY);
    this.wiringGraphics.lineTo(this.wiringCurrentX, this.wiringCurrentY);
    this.wiringGraphics.strokePath();

    // Source and target drag dots
    this.wiringGraphics.fillStyle(0x22c55e, 1.0);
    this.wiringGraphics.fillCircle(this.wiringStartX, this.wiringStartY, 5);
    this.wiringGraphics.fillStyle(0x38bdf8, 1.0);
    this.wiringGraphics.fillCircle(this.wiringCurrentX, this.wiringCurrentY, 6);
  }

  endManualWiring() {
    this.isWiring = false;
    this.wiringSourceNodeId = null;
    if (this.wiringGraphics) {
      this.wiringGraphics.clear();
    }
  }

  spawnFloatingText(text, x, y, color = '#10b981') {
    if (this.floatingTexts.length >= 25) {
      const old = this.floatingTexts.shift();
      if (old && old.destroy) old.destroy();
    }
    const txtObj = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: txtObj,
      y: y - 30,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        txtObj.destroy();
        const idx = this.floatingTexts.indexOf(txtObj);
        if (idx !== -1) this.floatingTexts.splice(idx, 1);
      },
    });
    this.floatingTexts.push(txtObj);
  }

  getNodeIcon(type) {
    switch (type) {
      case 'CLIENT_INGRESS': return '🌐';
      case 'DNS_ROUTING': return '🧭';
      case 'WAF_SHIELD': return '🛡️';
      case 'CDN_EDGE': return '⚡';
      case 'LOAD_BALANCER': return '🔀';
      case 'API_GATEWAY': return '🚪';
      case 'COMPUTE_POD': return '⚙️';
      case 'SERVERLESS_FAAS': return '🚀';
      case 'MESSAGE_BROKER': return '📨';
      case 'CACHE_CLUSTER': return '💎';
      case 'DATABASE_SQL': return '🗄️';
      case 'DATABASE_NOSQL': return '📚';
      case 'OBJECT_STORAGE': return '📦';
      default: return '💻';
    }
  }

  renderCableTrafficPulses(time) {
    this.cablePulseGraphics.clear();
    if (!this.currentConnections || this.currentConnections.length === 0) return;

    const pulseSpacing = 70;
    const speed = 90; // px/sec

    for (const conn of this.currentConnections) {
      const src = this.nodesMap.get(conn.sourceNodeId);
      const tgt = this.nodesMap.get(conn.targetNodeId);
      if (!src || !tgt) continue;

      const p1 = { x: src.container.x + 36, y: src.container.y };
      const p4 = { x: tgt.container.x - 36, y: tgt.container.y };
      const midX = (p1.x + p4.x) / 2;
      const p2 = { x: midX, y: p1.y };
      const p3 = { x: midX, y: p4.y };

      const l1 = Math.abs(p2.x - p1.x);
      const l2 = Math.abs(p3.y - p2.y);
      const l3 = Math.abs(p4.x - p3.x);
      const totalLen = l1 + l2 + l3;
      if (totalLen <= 0) continue;

      const pulseCount = Math.max(1, Math.floor(totalLen / pulseSpacing));

      for (let i = 0; i < pulseCount; i++) {
        const offset = i * pulseSpacing;
        const dist = ((time * (speed / 1000)) + offset) % totalLen;

        let px = p1.x;
        let py = p1.y;

        if (dist <= l1 && l1 > 0) {
          const prog = dist / l1;
          px = p1.x + (p2.x - p1.x) * prog;
          py = p1.y;
        } else if (dist <= l1 + l2 && l2 > 0) {
          const prog = (dist - l1) / l2;
          px = midX;
          py = p2.y + (p3.y - p2.y) * prog;
        } else if (l3 > 0) {
          const prog = (dist - l1 - l2) / l3;
          px = p3.x + (p4.x - p3.x) * prog;
          py = p4.y;
        }

        // Draw small ambient glowing pulse running along the wire
        this.cablePulseGraphics.fillStyle(0x38bdf8, 0.5);
        this.cablePulseGraphics.fillCircle(px, py, 2.5);
        this.cablePulseGraphics.fillStyle(0xffffff, 0.9);
        this.cablePulseGraphics.fillCircle(px, py, 1.2);
      }
    }
  }

  updatePackets(delta) {
    this.packetGraphics.clear();

    for (let i = this.activePackets.length - 1; i >= 0; i--) {
      const p = this.activePackets[i];
      const p1 = p.waypoints[p.currentSegment];
      const p2 = p.waypoints[p.currentSegment + 1];

      if (!p1 || !p2) {
        this.activePackets.splice(i, 1);
        continue;
      }

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = (p.speed * (delta / 1000)) / Math.max(1, dist);

      p.segmentProgress += step;
      p.x = p1.x + dx * p.segmentProgress;
      p.y = p1.y + dy * p.segmentProgress;

      // Maintain comet tail trailing history (last 6 positions)
      if (!p.trail) p.trail = [];
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 6) p.trail.pop();

      // Render comet trail on the wire
      for (let t = 0; t < p.trail.length; t++) {
        const tr = p.trail[t];
        const trAlpha = (1 - (t / p.trail.length)) * 0.45;
        const trSize = p.size * (1 - (t / p.trail.length) * 0.5);
        this.packetGraphics.fillStyle(p.color, trAlpha);
        this.packetGraphics.fillCircle(tr.x, tr.y, trSize);
      }

      // Render glowing packet head directly on the wire
      this.packetGraphics.fillStyle(p.color, 0.55);
      this.packetGraphics.fillCircle(p.x, p.y, p.size * 1.8);
      this.packetGraphics.fillStyle(0xffffff, 0.95);
      this.packetGraphics.fillCircle(p.x, p.y, p.size * 0.7);

      if (p.segmentProgress >= 1.0) {
        p.currentSegment++;
        p.segmentProgress = 0;

        // If reached end of journey
        if (p.currentSegment >= p.waypoints.length - 1) {
          if (p.isDropped) {
            this.spawnExplosionSparks(p.x, p.y, 0xef4444, 8);
          } else {
            this.spawnArrivalPulse(p.x, p.y, p.color);
          }
          this.activePackets.splice(i, 1);
        }
      }
    }
  }

  spawnExplosionSparks(x, y, color = 0xef4444, count = 8) {
    if (this.particles.length >= 100) return;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1.0,
        radius: 2 + Math.random() * 2,
        life: 0.35 + Math.random() * 0.2,
      });
    }
  }

  spawnArrivalPulse(x, y, color = 0x10b981) {
    if (this.particles.length >= 100) return;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4;
      const speed = 25 + Math.random() * 25;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 0.8,
        radius: 2,
        life: 0.25,
      });
    }
  }

  updateParticles(delta) {
    this.sparkGraphics.clear();
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= dt / pt.life;

      if (pt.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.sparkGraphics.fillStyle(pt.color, Math.max(0, pt.alpha));
      this.sparkGraphics.fillCircle(pt.x, pt.y, pt.radius);
    }
  }

  update(time, delta) {
    // 1. Ambient pulses on network cables
    this.renderCableTrafficPulses(time);

    // 2. Active request packets with glowing head and comet trail
    this.updatePackets(delta);

    // 3. Arrival ripples & explosion sparks
    this.updateParticles(delta);
  }

  destroy() {
    if (this.unsubscribeSnapshot) this.unsubscribeSnapshot();
    if (this.unsubscribePacket) this.unsubscribePacket();
    if (this.unsubscribeDragInitiated) this.unsubscribeDragInitiated();
    if (this.unsubscribeStartPlacement) this.unsubscribeStartPlacement();
    if (this.unsubscribeCancelPlacement) this.unsubscribeCancelPlacement();
    if (this.unsubscribeNodeSelected) this.unsubscribeNodeSelected();
    if (this.unsubscribeConnSelected) this.unsubscribeConnSelected();
    if (this.unsubscribeNodeDeselected) this.unsubscribeNodeDeselected();
    if (this.escKeyHandler) window.removeEventListener('keydown', this.escKeyHandler);

    const canvas = this.game?.canvas;
    if (canvas && this.canvasDragOverHandler) {
      canvas.removeEventListener('dragover', this.canvasDragOverHandler);
      canvas.removeEventListener('drop', this.canvasDropHandler);
    }

    if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
    }
  }

  setupCanvasDrop() {
    const canvas = this.game?.canvas || document.querySelector('canvas');
    if (!canvas) return;

    this.canvasDragOverHandler = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      if (this.isPlacing && this.placementGhost) {
        const rect = canvas.getBoundingClientRect();
        const screenX = (e.clientX - rect.left) * (this.scale.width / rect.width);
        const screenY = (e.clientY - rect.top) * (this.scale.height / rect.height);
        const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
        const snapped = this.gridSnapper.snap(worldPoint.x, worldPoint.y);
        this.placementGhost.setPosition(snapped.snappedX, snapped.snappedY);
      }
    };

    this.canvasDropHandler = (e) => {
      e.preventDefault();
      try {
        let type = null;
        const dataJson = e.dataTransfer?.getData('application/json');
        if (dataJson) {
          const parsed = JSON.parse(dataJson);
          type = parsed.type;
        } else {
          type = e.dataTransfer?.getData('text/plain');
        }

        if (!type && this.placementType) {
          type = this.placementType;
        }

        if (type) {
          const rect = canvas.getBoundingClientRect();
          const screenX = (e.clientX - rect.left) * (this.scale.width / rect.width);
          const screenY = (e.clientY - rect.top) * (this.scale.height / rect.height);
          const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY);
          const placed = this.tryPlaceNodeAt(type, worldPoint.x, worldPoint.y);
          if (placed) {
            this.justPlaced = true;
            this.exitPlacementMode();
            setTimeout(() => { this.justPlaced = false; }, 250);
          } else {
            this.exitPlacementMode();
          }
        }
      } catch (err) {
        console.error('Failed to handle canvas drop:', err);
      }
    };

    canvas.addEventListener('dragover', this.canvasDragOverHandler);
    canvas.addEventListener('drop', this.canvasDropHandler);
  }

  enterPlacementMode(type, isDragging = false) {
    if (!type || !(type in COMPONENT_CATALOG)) return;

    this.placementType = type;
    this.isPlacing = true;
    this.isDraggingFromDrawer = isDragging;

    if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
    }

    const item = COMPONENT_CATALOG[type];
    const buyDollars = ((item.costBuy || 0) / 1_000_000).toFixed(2);

    this.placementGhost = this.add.container(-1000, -1000);
    this.placementGhost.setDepth(9999);

    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x0f172a, 0.88);
    bgGfx.lineStyle(2, 0x22c55e, 1.0);
    bgGfx.fillRoundedRect(-75, -35, 150, 70, 8);
    bgGfx.strokeRoundedRect(-75, -35, 150, 70, 8);
    this.placementGhost.add(bgGfx);
    this.placementGhost.bgGfx = bgGfx;

    const icon = this.getItemIcon(type);
    const iconText = this.add.text(-58, -24, icon, {
      fontSize: '22px',
      resolution: 2,
    });

    const titleText = this.add.text(-28, -26, item.name || type, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      fontWeight: '700',
      color: '#f8fafc',
      resolution: 2,
    });

    const costText = this.add.text(-28, -10, `$${buyDollars}`, {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      fontWeight: '600',
      color: '#38bdf8',
      resolution: 2,
    });

    const statusText = this.add.text(0, 16, 'CLICK TO PLACE (ESC: CANCEL)', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '8px',
      fontWeight: '800',
      color: '#4ade80',
      resolution: 2,
    }).setOrigin(0.5);

    this.placementGhost.add([iconText, titleText, costText, statusText]);
    this.placementGhost.statusText = statusText;

    if (this.input.activePointer) {
      this.updatePlacementGhost(this.input.activePointer);
    }
  }

  exitPlacementMode() {
    this.isPlacing = false;
    this.placementType = null;
    this.isDraggingFromDrawer = false;
    if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
    }
    globalEventBus.emit('PLACEMENT_MODE_EXITED');
  }

  updatePlacementGhost(pointer) {
    if (!this.placementGhost || !this.placementType) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const snapped = this.gridSnapper.snap(worldPoint.x, worldPoint.y);
    const existingNodes = this.currentSnapshot?.nodes || [];
    const validation = this.gridSnapper.validatePlacement(snapped.gridX, snapped.gridY, existingNodes);

    this.placementGhost.setPosition(snapped.snappedX, snapped.snappedY);

    const isValid = validation.valid;
    const gfx = this.placementGhost.bgGfx;
    gfx.clear();

    if (isValid) {
      gfx.fillStyle(0x0f172a, 0.88);
      gfx.lineStyle(2, 0x22c55e, 1.0);
    } else {
      gfx.fillStyle(0x450a0a, 0.88);
      gfx.lineStyle(2, 0xef4444, 1.0);
    }
    gfx.fillRoundedRect(-75, -35, 150, 70, 8);
    gfx.strokeRoundedRect(-75, -35, 150, 70, 8);

    // Grid snap cell footprint indicator
    gfx.lineStyle(1.5, isValid ? 0x22c55e : 0xef4444, 0.5);
    gfx.strokeRect(-40, -40, 80, 80);

    if (this.placementGhost.statusText) {
      if (isValid) {
        this.placementGhost.statusText.setText(`[${snapped.gridX}, ${snapped.gridY}] CLICK TO PLACE`);
        this.placementGhost.statusText.setColor('#4ade80');
      } else {
        const reason = validation.reason === 'CELL_OCCUPIED' ? 'CELL OCCUPIED' : 'OUT OF BOUNDS';
        this.placementGhost.statusText.setText(`[${snapped.gridX}, ${snapped.gridY}] ${reason}`);
        this.placementGhost.statusText.setColor('#f87171');
      }
    }
  }

  tryPlaceNodeAt(type, worldX, worldY) {
    if (!type) return false;

    const snapped = this.gridSnapper.snap(worldX, worldY);
    const existingNodes = this.currentSnapshot?.nodes || [];
    const validation = this.gridSnapper.validatePlacement(snapped.gridX, snapped.gridY, existingNodes);

    if (!validation.valid) {
      return false;
    }

    const catalogItem = COMPONENT_CATALOG[type];
    const buyCost = catalogItem?.costBuy || 0;
    const currentCash = this.currentSnapshot?.economicProfile?.cashMicroCents ?? Infinity;

    if (buyCost > currentCash) {
      globalEventBus.emit('INSUFFICIENT_FUNDS', { required: buyCost, available: currentCash });
      return false;
    }

    // Emit event for SimulationEngine to create node and auto-connect
    globalEventBus.emit('PLACE_COMPONENT', {
      type,
      gridX: snapped.gridX,
      gridY: snapped.gridY,
    });

    // Placement burst particle effect
    this.spawnPlacementBurst(snapped.snappedX, snapped.snappedY, catalogItem?.colorHex || 0x38bdf8);
    return true;
  }

  spawnPlacementBurst(x, y, color) {
    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.3;
      const speed = 70 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 3,
        color: color || 0x38bdf8,
        alpha: 1.0,
        life: 0.6 + Math.random() * 0.3,
      });
    }
  }

  getItemIcon(type) {
    switch (type) {
      case NodeType.CLIENT_INGRESS: return '🌐';
      case NodeType.DNS_ROUTING: return '🧭';
      case NodeType.WAF_SHIELD: return '🛡️';
      case NodeType.CDN_EDGE: return '⚡';
      case NodeType.LOAD_BALANCER: return '🔀';
      case NodeType.API_GATEWAY: return '🚪';
      case NodeType.COMPUTE_POD: return '⚙️';
      case NodeType.SERVERLESS_FAAS: return '🚀';
      case NodeType.MESSAGE_BROKER: return '📨';
      case NodeType.CACHE_CLUSTER: return '💎';
      case NodeType.DATABASE_SQL: return '🗄️';
      case NodeType.DATABASE_NOSQL: return '📚';
      case NodeType.OBJECT_STORAGE: return '📦';
      default: return '📦';
    }
  }

  findConnectionNear(worldX, worldY) {
    if (!this.currentConnections || !this.currentSnapshot?.nodes) return null;

    const nodeCoords = new Map();
    const TILE_PX = 80;
    for (const n of this.currentSnapshot.nodes) {
      nodeCoords.set(n.id, { x: n.gridX * TILE_PX, y: n.gridY * TILE_PX, node: n });
    }

    const HIT_RADIUS_SQ = 22 * 22; // 22px hit target
    let closestConn = null;
    let closestDistSq = Infinity;

    for (const conn of this.currentConnections) {
      const src = nodeCoords.get(conn.sourceNodeId);
      const tgt = nodeCoords.get(conn.targetNodeId);
      if (!src || !tgt) continue;

      const distSq = this.distToSegmentSquared(worldX, worldY, src.x, src.y, tgt.x, tgt.y);
      if (distSq <= HIT_RADIUS_SQ && distSq < closestDistSq) {
        closestDistSq = distSq;
        closestConn = {
          ...conn,
          sourceNode: src.node,
          targetNode: tgt.node,
        };
      }
    }

    return closestConn;
  }

  distToSegmentSquared(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return (px - x1) ** 2 + (py - y1) ** 2;
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return (px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2;
  }

  handleRadialAction(action, node) {
    if (!node) return;
    switch (action) {
      case 'restart':
        globalEventBus.emit('NODE_RESTART', { nodeId: node.id });
        break;
      case 'scale':
        globalEventBus.emit('SCALE_NODE', { nodeId: node.id, scaleFactor: 1.25 });
        break;
      case 'wiring': {
        const visual = this.nodesMap.get(node.id);
        const startX = visual ? visual.container.x + 36 : (node.gridX * 80 + 36);
        const startY = visual ? visual.container.y : (node.gridY * 80);
        this.startManualWiring(node.id, startX, startY);
        break;
      }
      case 'inspect':
        globalEventBus.emit('NODE_SELECTED', { node });
        break;
      case 'delete':
        globalEventBus.emit('SELL_NODE', { nodeId: node.id });
        break;
    }
  }
}


