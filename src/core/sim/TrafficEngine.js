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
    this.telemetrySamples = []; // Array of { latencyMs, statusCode, timestamp }
    this.telemetryWindowMs = 60000; // 60s
    this.maxSamples = 2000;
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
      path: [ingressNode.id],
      elapsedLatencyMs: ingressNode.baseLatencyMs || 5,
      revenuePotential: SIM_CONSTANTS.REVENUE_PER_200_OK_MICRO_CENTS,
      state: PacketState.IN_FLIGHT,
      colorHex: ingressNode.colorHex || 0x22c55e,
    };

    this.activePackets.set(packet.id, packet);
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
    if (!packet.path) packet.path = [packet.originNodeId || nextNodeId];
    packet.path.push(nextNodeId);
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
    // 0. Circuit Breaker protection check (e.g. on Gateway or microservice entry)
    if (node.circuitBreaker && !node.circuitBreaker.canPass()) {
      this.dropPacket(packet, 'CIRCUIT_BREAKER_OPEN');
      return { packet, isCacheHit: false, dropReason: 'CIRCUIT_BREAKER_OPEN' };
    }

    // 1. WAF Deep Packet Inspection
    if (node.type === NodeType.WAF_SHIELD) {
      if (
        packet.type === PacketType.SQLI_ATTACK ||
        packet.type === PacketType.DDOS_FLOOD ||
        packet.type === PacketType.CYBER_ATTACK
      ) {
        this.dropPacket(packet, 'WAF_ATTACK_BLOCKED');
        node.blockedAttacksCount = (node.blockedAttacksCount || 0) + 1;
        return { packet, isCacheHit: false, dropReason: 'WAF_ATTACK_BLOCKED' };
      }
    }

    // 2. API Gateway Token Bucket Rate Limiting
    if (node.type === NodeType.API_GATEWAY) {
      const rateLimit = node.rateLimitPerSec || 5000;
      if (node.currentRps > rateLimit) {
        if (node.circuitBreaker) node.circuitBreaker.recordFailure('Rate limit exceeded');
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

    // 4. Database Row-Level Lock & Connection Contention for Writes
    if (node.type === NodeType.DATABASE_SQL || node.type === NodeType.DATABASE_NOSQL) {
      if (packet.type === PacketType.API_WRITE || packet.type === PacketType.DB_TRANSACTION) {
        const maxWrites = node.maxWriteConnections || 100;
        const currentActiveWrites = node.activeWrites || 0;
        if (currentActiveWrites >= maxWrites) {
          this.dropPacket(packet, 'DB_LOCK_CONTENTION_504');
          return { packet, isCacheHit: false, dropReason: 'DB_LOCK_CONTENTION_504' };
        }
      }
    }

    const capacity = node.capacityRps || 500;
    const currentRps = node.currentRps || 0;

    // Check capacity overflow (HTTP 502/504 Drop)
    if (currentRps > capacity * 1.5 || node.status === 'CRITICAL' || node.status === 'OOM_KILLED') {
      if (node.circuitBreaker) node.circuitBreaker.recordFailure('Capacity overflow');
      this.dropPacket(packet, 'CAPACITY_OVERFLOW_502');
      return { packet, isCacheHit: false, dropReason: 'CAPACITY_OVERFLOW_502' };
    }

    // Add node's additive latency
    const nodeLatency = this.calculateNodeLatency(node);
    packet.elapsedLatencyMs += nodeLatency;

    // Check Cache Hit for Cache Clusters or CDN Edge
    if (node.type === NodeType.CACHE_CLUSTER || node.type === NodeType.CDN_EDGE) {
      let hitRate = node.cacheHitRate !== undefined ? node.cacheHitRate : 0.85;
      if (packet.type === PacketType.STATIC_CDN && node.type === NodeType.CDN_EDGE) {
        hitRate = node.cacheHitRate !== undefined ? node.cacheHitRate : 0.95;
      }
      if (randomFn() < hitRate) {
        packet.isCacheHit = true;
        this.completePacket(packet);
        if (node.circuitBreaker) node.circuitBreaker.recordSuccess();
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
      if (node.circuitBreaker) node.circuitBreaker.recordSuccess();
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
    this.recordTelemetrySample(packet.elapsedLatencyMs, 200);

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

    let statusCode = 500;
    if (reason === 'QUEUE_OVERFLOW') statusCode = 504;
    else if (reason === 'RATE_LIMITED') statusCode = 429;
    else if (reason === 'WAF_BLOCKED') statusCode = 403;
    else if (reason === 'HOP_LIMIT_EXCEEDED') statusCode = 502;
    this.recordTelemetrySample(packet.elapsedLatencyMs, statusCode);

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

  recordTelemetrySample(latencyMs, statusCode = 200, timestamp = Date.now()) {
    this.telemetrySamples.push({
      latencyMs: Math.max(1, latencyMs),
      statusCode: String(statusCode),
      timestamp,
    });
    if (this.telemetrySamples.length > this.maxSamples) {
      this.telemetrySamples.splice(0, this.telemetrySamples.length - this.maxSamples);
    }
  }

  pruneTelemetry(now = Date.now()) {
    const cutoff = now - this.telemetryWindowMs;
    let firstValid = 0;
    while (firstValid < this.telemetrySamples.length && this.telemetrySamples[firstValid].timestamp < cutoff) {
      firstValid++;
    }
    if (firstValid > 0) {
      this.telemetrySamples.splice(0, firstValid);
    }
  }

  getApmMetrics(now = Date.now()) {
    this.pruneTelemetry(now);
    const samples = this.telemetrySamples;
    const totalRequests = samples.length;

    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        avgLatencyMs: 0,
        errorRatePercent: 0,
        statusDistribution: { '200': 0, '4xx': 0, '5xx': 0 },
        histogramBuckets: [
          { range: '<50ms', count: 0 },
          { range: '50-100ms', count: 0 },
          { range: '100-250ms', count: 0 },
          { range: '250-500ms', count: 0 },
          { range: '>500ms', count: 0 },
        ],
      };
    }

    const sortedLatencies = samples.map((s) => s.latencyMs).sort((a, b) => a - b);
    let sumLatency = 0;
    const statusDistribution = { '200': 0, '400': 0, '429': 0, '500': 0, '502': 0, '504': 0, '4xx': 0, '5xx': 0 };
    let non200Count = 0;

    const buckets = [
      { range: '<50ms', count: 0 },
      { range: '50-100ms', count: 0 },
      { range: '100-250ms', count: 0 },
      { range: '250-500ms', count: 0 },
      { range: '>500ms', count: 0 },
    ];

    for (const s of samples) {
      sumLatency += s.latencyMs;
      const code = s.statusCode;
      statusDistribution[code] = (statusDistribution[code] || 0) + 1;
      if (code.startsWith('4')) {
        statusDistribution['4xx'] = (statusDistribution['4xx'] || 0) + 1;
        non200Count++;
      } else if (code.startsWith('5')) {
        statusDistribution['5xx'] = (statusDistribution['5xx'] || 0) + 1;
        non200Count++;
      } else if (code !== '200') {
        non200Count++;
      }

      const lat = s.latencyMs;
      if (lat < 50) buckets[0].count++;
      else if (lat < 100) buckets[1].count++;
      else if (lat < 250) buckets[2].count++;
      else if (lat < 500) buckets[3].count++;
      else buckets[4].count++;
    }

    const getPercentile = (p) => {
      const idx = Math.min(
        sortedLatencies.length - 1,
        Math.max(0, Math.floor((p / 100) * (sortedLatencies.length - 1)))
      );
      return sortedLatencies[idx];
    };

    return {
      totalRequests,
      p50LatencyMs: getPercentile(50),
      p95LatencyMs: getPercentile(95),
      p99LatencyMs: getPercentile(99),
      avgLatencyMs: Math.round((sumLatency / totalRequests) * 10) / 10,
      errorRatePercent: Math.round((non200Count / totalRequests) * 1000) / 10,
      statusDistribution,
      histogramBuckets: buckets,
    };
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
          if (this.eventBus) {
            this.eventBus.emit(EngineEventTypes.PACKET_SPAWNED, { packet: pkt });
          }
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
