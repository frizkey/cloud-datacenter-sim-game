/**
 * TopologyScene.js - 2D Logical Cloud Architecture Canvas
 * Renders orthogonal node graph, queue depth gauges, network cables, and flowing request packet particles.
 */

import Phaser from 'phaser';
import { ParticlePool } from '../render/ParticlePool.js';
import { EngineEventTypes, globalEventBus } from '../core/events/EventBus.js';

export class TopologyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TopologyScene' });
    this.particlePool = new ParticlePool({ capacity: 3000 });
    this.nodesMap = new Map();
    this.connectionsMap = new Map();
    this.activePackets = [];
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b0f19');
    this.gridGraphics = this.add.graphics();
    this.cableGraphics = this.add.graphics();
    this.packetGraphics = this.add.graphics();

    this.nodeContainer = this.add.container(0, 0);

    this.drawBackgroundGrid();

    // Subscribe to engine snapshots
    this.unsubscribeSnapshot = globalEventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      this.syncState(evt.payload.snapshot);
    });

    // Subscribe to packet spawned events for visual particle emission
    this.unsubscribePacket = globalEventBus.on(EngineEventTypes.PACKET_SPAWNED, (evt) => {
      this.spawnVisualPacket(evt.payload.packet);
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
        const icon = this.add.text(0, -12, this.getNodeIcon(node.type), { fontSize: '24px' }).setOrigin(0.5);
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

        container.add([bg, icon, label, rpsLabel]);
        container.setSize(72, 72);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
          globalEventBus.emit('NODE_SELECTED', { node });
        });

        visual = { container, bg, icon, label, rpsLabel, nodeData: node };
        this.nodesMap.set(node.id, visual);
        this.nodeContainer.add(container);
      }

      // Update position and visual state
      visual.container.setPosition(posX, posY);
      visual.rpsLabel.setText(`${node.currentRps || 0} RPS`);

      // Draw node card background
      visual.bg.clear();
      const borderColor = node.status === 'CRITICAL' ? 0xef4444 : (node.colorHex || 0x3b82f6);
      visual.bg.fillStyle(0x0f172a, 0.85);
      visual.bg.lineStyle(2, borderColor, 0.9);
      visual.bg.fillRoundedRect(-36, -36, 72, 72, 10);
      visual.bg.strokeRoundedRect(-36, -36, 72, 72, 10);

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
      nodeCoords.set(n.id, { x: n.gridX * TILE_PX, y: n.gridY * TILE_PX });
    }

    for (const conn of connections) {
      const src = nodeCoords.get(conn.sourceNodeId);
      const tgt = nodeCoords.get(conn.targetNodeId);
      if (!src || !tgt) continue;

      // Draw sleek orthogonal or direct network cable
      this.cableGraphics.lineStyle(2, 0x3b82f6, 0.6);
      this.cableGraphics.lineBetween(src.x, src.y, tgt.x, tgt.y);

      // Port dots
      this.cableGraphics.fillStyle(0x38bdf8, 1);
      this.cableGraphics.fillCircle(src.x, src.y, 4);
      this.cableGraphics.fillCircle(tgt.x, tgt.y, 4);
    }
  }

  spawnVisualPacket(packet) {
    const srcNode = this.nodesMap.get(packet.originNodeId);
    if (!srcNode) return;

    const particle = this.particlePool.acquire({
      x: srcNode.container.x,
      y: srcNode.container.y,
      targetX: srcNode.container.x,
      targetY: srcNode.container.y,
      colorHex: packet.colorHex || 0x22c55e,
      packetId: packet.id,
      originNodeId: packet.originNodeId,
    });

    if (particle) {
      this.activePackets.push(particle);
    }
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

  update(time, delta) {
    // Render packet particles along paths
    this.packetGraphics.clear();
    const TILE_PX = 80;

    for (let i = this.activePackets.length - 1; i >= 0; i--) {
      const p = this.activePackets[i];
      p.progress += delta * 0.002;

      if (p.progress >= 1.0) {
        this.particlePool.release(p);
        this.activePackets.splice(i, 1);
        continue;
      }

      // Draw glowing packet dot
      const currentX = Phaser.Math.Linear(p.x, p.targetX, p.progress);
      const currentY = Phaser.Math.Linear(p.y, p.targetY, p.progress);

      this.packetGraphics.fillStyle(p.colorHex, 0.9);
      this.packetGraphics.fillCircle(currentX, currentY, 3);
    }
  }

  destroy() {
    if (this.unsubscribeSnapshot) this.unsubscribeSnapshot();
    if (this.unsubscribePacket) this.unsubscribePacket();
  }
}
