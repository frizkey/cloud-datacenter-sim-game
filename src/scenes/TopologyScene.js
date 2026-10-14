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
    this.particles = [];
    this.currentConnections = [];
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor('#0b0f19');
    this.gridGraphics = this.add.graphics();
    this.cableGraphics = this.add.graphics();
    this.cablePulseGraphics = this.add.graphics();
    this.packetGraphics = this.add.graphics();
    this.sparkGraphics = this.add.graphics();

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

    // Deselect active node when clicking on empty canvas space
    this.input.on('pointerdown', (pointer, currentlyOver) => {
      if (!currentlyOver || currentlyOver.length === 0) {
        globalEventBus.emit('NODE_DESELECTED');
      }
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
    if (!packet || this.activePackets.length >= 75) return;

    // Build multi-hop waypoints from packet.path
    const pathNodeIds = packet.path && packet.path.length > 0 ? packet.path : [packet.originNodeId];
    const waypoints = [];

    for (const nodeId of pathNodeIds) {
      const visual = this.nodesMap.get(nodeId);
      if (visual && visual.container) {
        waypoints.push({ x: visual.container.x, y: visual.container.y });
      }
    }

    // Fallback: If only 1 waypoint, look for an outgoing cable
    if (waypoints.length < 2) {
      const originVisual = this.nodesMap.get(packet.originNodeId);
      if (!originVisual) return;

      if (this.currentConnections) {
        const conn = this.currentConnections.find((c) => c.sourceNodeId === packet.originNodeId);
        if (conn) {
          const tgtVisual = this.nodesMap.get(conn.targetNodeId);
          if (tgtVisual) {
            waypoints.length = 0;
            waypoints.push({ x: originVisual.container.x, y: originVisual.container.y });
            waypoints.push({ x: tgtVisual.container.x, y: tgtVisual.container.y });
          }
        }
      }
    }

    if (waypoints.length < 2) return;

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

      const p1 = { x: src.container.x, y: src.container.y };
      const p2 = { x: tgt.container.x, y: tgt.container.y };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const totalLen = Math.sqrt(dx * dx + dy * dy);
      if (totalLen <= 0) continue;

      const pulseCount = Math.max(1, Math.floor(totalLen / pulseSpacing));

      for (let i = 0; i < pulseCount; i++) {
        const offset = i * pulseSpacing;
        const dist = ((time * (speed / 1000)) + offset) % totalLen;
        const progress = dist / totalLen;
        const px = p1.x + dx * progress;
        const py = p1.y + dy * progress;

        // Draw small ambient glowing pulse running along the wire
        this.cablePulseGraphics.fillStyle(0x38bdf8, 0.4);
        this.cablePulseGraphics.fillCircle(px, py, 2.5);
        this.cablePulseGraphics.fillStyle(0xffffff, 0.85);
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
  }
}
