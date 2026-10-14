/**
 * TrafficEngine.js - Manages packet lifecycle, routing graph, queue depths, and additive latency
 * Pure JS, zero DOM/Phaser coupling.
 */

import { NodeType, PacketType, PacketState, SIM_CONSTANTS } from './Constants.js';
import { EngineEventTypes } from '../events/EventBus.js';

let packetCounter = 0;

export class TrafficEngine {
  /**
   * @param {import('../events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activePackets = new Map(); // packetId -> TrafficPacket
    this.processedCount = 0;
    this.droppedCount = 0;
  }

  /**
   * Calculate additive latency for a node: Base + Queue Delay + Compute Delay
   * @param {Object} node
   * @returns {number} Latency in milliseconds
   */
  calculateNodeLatency(node) {
    const baseLatency = node.baseLatencyMs || 5;
    const capacity = Math.max(1, node.capacityRps || 100);
    const currentRps = node.currentRps || 0;
    const cpuUtil = Math.min(0.98, Math.max(0, node.cpuUtilization || 0));

    // Queue latency: quadratic growth as queue fills
    const loadRatio = currentRps / capacity;
    const queueLatency = baseLatency * Math.pow(loadRatio, 2);

    // Compute latency: asymptote as CPU approaches 100%
    const computeLatency = baseLatency * (1 / (1 - cpuUtil) - 1);

    return Math.round((baseLatency + queueLatency + computeLatency) * 100) / 100;
  }

  /**
   * Spawn a new client request packet at an ingress node
   * @param {Object} ingressNode
   * @param {string} [packetType=PacketType.HTTP_GET]
   * @returns {Object}
   */
  spawnPacket(ingressNode, packetType = PacketType.HTTP_GET) {
    packetCounter++;
    const packet = {
      id: `pkt_${Date.now()}_${packetCounter}`,
      type: packetType,
      originNodeId: ingressNode.id,
      currentNodeId: ingressNode.id,
      targetNodeId: null,
      hopCount: 0,
      elapsedLatencyMs: ingressNode.baseLatencyMs || 5,
      revenuePotential: SIM_CONSTANTS.REVENUE_PER_200_OK_MICRO_CENTS,
      state: PacketState.IN_FLIGHT,
      colorHex: ingressNode.colorHex || 0x22c55e,
    };

    this.activePackets.set(packet.id, packet);

    if (this.eventBus) {
      this.eventBus.emit(EngineEventTypes.PACKET_SPAWNED, { packet });
    }

    return packet;
  }

  /**
   * Forward a packet to the next node in the topology
   * @param {Object} packet
   * @param {string} nextNodeId
   * @param {Object} [connection]
   * @returns {Object|null} The forwarded packet, or null if dropped
   */
  forwardPacket(packet, nextNodeId, connection = null) {
    packet.hopCount++;

    if (packet.hopCount > SIM_CONSTANTS.MAX_PACKET_HOPS) {
      return this.dropPacket(packet, 'HOP_LIMIT_EXCEEDED');
    }

    if (connection) {
      packet.elapsedLatencyMs += connection.latencyBaseMs || 2;
    }

    packet.currentNodeId = nextNodeId;
    return packet;
  }

  /**
   * Process a packet arriving at a specific node
   * @param {Object} node
   * @param {Object} packet
   * @param {Function} [randomFn=Math.random] For deterministic unit test injection
   * @returns {{ packet: Object, isCacheHit: boolean, dropReason?: string }}
   */
  processNodePacket(node, packet, randomFn = Math.random) {
    // 1. WAF Deep Packet Inspection
    if (node.type === NodeType.WAF_SHIELD) {
      if (packet.type === PacketType.SQLI_ATTACK || packet.type === PacketType.DDOS_FLOOD) {
        this.dropPacket(packet, 'WAF_ATTACK_BLOCKED');
        node.blockedAttacksCount = (node.blockedAttacksCount || 0) + 1;
        return { packet, isCacheHit: false, dropReason: 'WAF_ATTACK_BLOCKED' };
      }
    }

    // 2. API Gateway Token Bucket Rate Limiting
    if (node.type === NodeType.API_GATEWAY) {
      const rateLimit = node.rateLimitPerSec || 5000;
      if (node.currentRps > rateLimit) {
        this.dropPacket(packet, 'RATE_LIMIT_429');
        node.throttledRequestsCount = (node.throttledRequestsCount || 0) + 1;
        return { packet, isCacheHit: false, dropReason: 'RATE_LIMIT_429' };
      }
    }

    // 3. Message Broker Asynchronous Queue Buffering
    if (node.type === NodeType.MESSAGE_BROKER) {
      const bufferCap = node.bufferCapacity || 50000;
      node.currentQueueDepth = node.currentQueueDepth || 0;
      if (node.currentQueueDepth >= bufferCap) {
        this.dropPacket(packet, 'BUFFER_OVERFLOW_504');
        return { packet, isCacheHit: false, dropReason: 'BUFFER_OVERFLOW_504' };
      }
      node.currentQueueDepth++;
      return { packet, isCacheHit: false, isBuffered: true };
    }

    const capacity = node.capacityRps || 500;
    const currentRps = node.currentRps || 0;

    // Check capacity overflow (HTTP 502/504 Drop)
    if (currentRps > capacity * 1.5 || node.status === 'CRITICAL' || node.status === 'OOM_KILLED') {
      this.dropPacket(packet, 'CAPACITY_OVERFLOW_502');
      return { packet, isCacheHit: false, dropReason: 'CAPACITY_OVERFLOW_502' };
    }

    // Add node's additive latency
    const nodeLatency = this.calculateNodeLatency(node);
    packet.elapsedLatencyMs += nodeLatency;

    // Check Cache Hit for Cache Clusters or CDN Edge
    if (node.type === NodeType.CACHE_CLUSTER || node.type === NodeType.CDN_EDGE) {
      const hitRate = node.cacheHitRate !== undefined ? node.cacheHitRate : 0.85;
      if (randomFn() < hitRate) {
        this.completePacket(packet);
        return { packet, isCacheHit: true };
      }
    }

    // Leaf nodes or terminal database queries complete successfully
    if (
      node.type === NodeType.DATABASE_SQL ||
      node.type === NodeType.DATABASE_NOSQL ||
      node.type === NodeType.OBJECT_STORAGE
    ) {
      this.completePacket(packet);
      return { packet, isCacheHit: false };
    }

    return { packet, isCacheHit: false };
  }

  /**
   * Complete a packet successfully (200 OK)
   * @param {Object} packet
   */
  completePacket(packet) {
    packet.state = PacketState.PROCESSED;
    this.activePackets.delete(packet.id);
    this.processedCount++;

    if (this.eventBus) {
      this.eventBus.emit(EngineEventTypes.PACKET_PROCESSED, {
        packetId: packet.id,
        originNodeId: packet.originNodeId,
        elapsedLatencyMs: packet.elapsedLatencyMs,
        revenueEarned: packet.revenuePotential,
      });
    }
  }

  /**
   * Drop a packet due to timeout, overflow, or hop limit
   * @param {Object} packet
   * @param {string} reason
   * @returns {null}
   */
  dropPacket(packet, reason = 'TIMEOUT') {
    packet.state = PacketState.DROPPED;
    this.activePackets.delete(packet.id);
    this.droppedCount++;

    if (this.eventBus) {
      this.eventBus.emit(EngineEventTypes.PACKET_DROPPED, {
        packetId: packet.id,
        nodeId: packet.currentNodeId,
        reason,
        elapsedLatencyMs: packet.elapsedLatencyMs,
      });
    }

    return null;
  }

  /**
   * Step traffic engine tick
   * @param {number} deltaSec
   * @param {Map<string, Object>} nodes
   * @param {Map<string, Object>} connections
   */
  tick(deltaSec, nodes, connections) {
    // 1. Calculate incoming RPS and CPU utilization for nodes
    for (const node of nodes.values()) {
      if (node.type === NodeType.CLIENT_INGRESS) {
        // Ingress produces organic requests: e.g. 100 RPS
        const packetsToSpawn = Math.round(100 * deltaSec);
        for (let i = 0; i < packetsToSpawn; i++) {
          const pkt = this.spawnPacket(node);
          this.routeFromNode(pkt, node, connections, nodes);
        }
      }
    }
  }

  /**
   * Route packet from current node to downstream targets
   * @param {Object} packet
   * @param {Object} fromNode
   * @param {Map<string, Object>} connections
   * @param {Map<string, Object>} nodes
   */
  routeFromNode(packet, fromNode, connections, nodes) {
    const outLinks = [];
    for (const conn of connections.values()) {
      if (conn.sourceNodeId === fromNode.id) {
        outLinks.push(conn);
      }
    }

    if (outLinks.length === 0) {
      // Terminal node reached without explicit database
      this.completePacket(packet);
      return;
    }

    // Select downstream link (round robin or random)
    const link = outLinks[Math.floor(Math.random() * outLinks.length)];
    const targetNode = nodes.get(link.targetNodeId);

    if (!targetNode) {
      this.dropPacket(packet, 'DEAD_ROUTE');
      return;
    }

    const forwarded = this.forwardPacket(packet, targetNode.id, link);
    if (!forwarded) return;

    const result = this.processNodePacket(targetNode, packet);
    if (result.packet.state === PacketState.IN_FLIGHT) {
      // Continue routing downstream
      this.routeFromNode(result.packet, targetNode, connections, nodes);
    }
  }

  reset() {
    this.activePackets.clear();
    this.processedCount = 0;
    this.droppedCount = 0;
  }
}
