import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrafficEngine } from '../src/core/sim/TrafficEngine.js';
import { NodeType, PacketType, PacketState, COMPONENT_CATALOG } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('Advanced Infrastructure Nodes (Phase 2)', () => {
  it('validates catalog metadata for all advanced nodes', () => {
    assert.ok(COMPONENT_CATALOG[NodeType.WAF_SHIELD]);
    assert.ok(COMPONENT_CATALOG[NodeType.CDN_EDGE]);
    assert.ok(COMPONENT_CATALOG[NodeType.API_GATEWAY]);
    assert.ok(COMPONENT_CATALOG[NodeType.MESSAGE_BROKER]);
    assert.ok(COMPONENT_CATALOG[NodeType.DATABASE_NOSQL]);
    assert.ok(COMPONENT_CATALOG[NodeType.OBJECT_STORAGE]);

    assert.strictEqual(COMPONENT_CATALOG[NodeType.WAF_SHIELD].category, 'Security');
    assert.strictEqual(COMPONENT_CATALOG[NodeType.CDN_EDGE].category, 'Edge');
    assert.strictEqual(COMPONENT_CATALOG[NodeType.API_GATEWAY].category, 'Routing');
    assert.strictEqual(COMPONENT_CATALOG[NodeType.MESSAGE_BROKER].category, 'Queue');
    assert.strictEqual(COMPONENT_CATALOG[NodeType.DATABASE_NOSQL].category, 'Storage');
  });

  it('WAF blocks malicious attack packets and applies 4ms latency to clean requests', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    let dropReason = null;
    bus.on('PACKET_DROPPED', (evt) => {
      dropReason = evt.payload.reason;
    });

    const wafNode = {
      id: 'waf_1',
      type: NodeType.WAF_SHIELD,
      capacityRps: 1500,
      currentRps: 200,
      baseLatencyMs: 4,
      cpuUtilization: 0.1,
      blockedAttacksCount: 0,
      status: 'HEALTHY',
    };

    // 1. Clean packet passes through with latency added
    const cleanPacket = {
      id: 'pkt_clean',
      type: PacketType.HTTP_GET,
      originNodeId: 'ingress_1',
      currentNodeId: 'waf_1',
      hopCount: 1,
      elapsedLatencyMs: 5,
      state: PacketState.IN_FLIGHT,
    };
    const cleanResult = traffic.processNodePacket(wafNode, cleanPacket);
    assert.strictEqual(cleanResult.packet.state, PacketState.IN_FLIGHT);
    assert.ok(cleanResult.packet.elapsedLatencyMs >= 9, 'Should add WAF inspection latency');

    // 2. Attack packet is dropped by WAF
    const attackPacket = {
      id: 'pkt_attack',
      type: PacketType.SQLI_ATTACK,
      originNodeId: 'ingress_1',
      currentNodeId: 'waf_1',
      hopCount: 1,
      elapsedLatencyMs: 5,
      state: PacketState.IN_FLIGHT,
    };
    const attackResult = traffic.processNodePacket(wafNode, attackPacket);
    assert.strictEqual(attackResult.dropReason, 'WAF_ATTACK_BLOCKED');
    assert.strictEqual(dropReason, 'WAF_ATTACK_BLOCKED');
    assert.strictEqual(wafNode.blockedAttacksCount, 1);
  });

  it('CDN edge cache resolves cacheable requests with 85% probability without touching origin', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    const cdnNode = {
      id: 'cdn_1',
      type: NodeType.CDN_EDGE,
      capacityRps: 2500,
      currentRps: 300,
      baseLatencyMs: 2,
      cacheHitRate: 0.85,
      status: 'HEALTHY',
    };

    // Deterministic randomFn: 0.5 is less than 0.85 => Cache Hit
    const hitPacket = {
      id: 'pkt_cdn_hit',
      type: PacketType.HTTP_GET,
      originNodeId: 'ingress_1',
      currentNodeId: 'cdn_1',
      hopCount: 1,
      elapsedLatencyMs: 2,
      revenuePotential: 200,
      state: PacketState.IN_FLIGHT,
    };
    const hitResult = traffic.processNodePacket(cdnNode, hitPacket, () => 0.5);
    assert.strictEqual(hitResult.isCacheHit, true);
    assert.strictEqual(hitPacket.state, PacketState.PROCESSED);

    // Deterministic randomFn: 0.95 is greater than 0.85 => Cache Miss
    const missPacket = {
      id: 'pkt_cdn_miss',
      type: PacketType.HTTP_GET,
      originNodeId: 'ingress_1',
      currentNodeId: 'cdn_1',
      hopCount: 1,
      elapsedLatencyMs: 2,
      revenuePotential: 200,
      state: PacketState.IN_FLIGHT,
    };
    const missResult = traffic.processNodePacket(cdnNode, missPacket, () => 0.95);
    assert.strictEqual(missResult.isCacheHit, false);
    assert.strictEqual(missPacket.state, PacketState.IN_FLIGHT);
  });

  it('API Gateway enforces rate limiting with HTTP 429 when concurrency bursts exceed threshold', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    let dropReason = null;
    bus.on('PACKET_DROPPED', (evt) => {
      dropReason = evt.payload.reason;
    });

    const apiGateway = {
      id: 'apigw_1',
      type: NodeType.API_GATEWAY,
      capacityRps: 2000,
      currentRps: 5500, // Exceeds rate limit
      rateLimitPerSec: 5000,
      throttledRequestsCount: 0,
      status: 'HEALTHY',
    };

    const packet = {
      id: 'pkt_rate_limit',
      type: PacketType.HTTP_POST,
      originNodeId: 'ingress_1',
      currentNodeId: 'apigw_1',
      hopCount: 1,
      elapsedLatencyMs: 5,
      state: PacketState.IN_FLIGHT,
    };

    const result = traffic.processNodePacket(apiGateway, packet);
    assert.strictEqual(result.dropReason, 'RATE_LIMIT_429');
    assert.strictEqual(dropReason, 'RATE_LIMIT_429');
    assert.strictEqual(apiGateway.throttledRequestsCount, 1);
  });

  it('Message Broker buffers requests up to buffer capacity and drops on overflow (504)', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    const broker = {
      id: 'kafka_1',
      type: NodeType.MESSAGE_BROKER,
      capacityRps: 4000,
      currentRps: 100,
      bufferCapacity: 2,
      currentQueueDepth: 1,
      status: 'HEALTHY',
    };

    // Enqueue 1 packet within capacity
    const pkt1 = {
      id: 'pkt_k1',
      type: PacketType.HTTP_POST,
      originNodeId: 'ingress_1',
      currentNodeId: 'kafka_1',
      hopCount: 1,
      elapsedLatencyMs: 5,
      state: PacketState.IN_FLIGHT,
    };
    const res1 = traffic.processNodePacket(broker, pkt1);
    assert.strictEqual(res1.isBuffered, true);
    assert.strictEqual(broker.currentQueueDepth, 2);

    // Enqueue next packet exceeding capacity -> 504 Overflow Drop
    const pkt2 = {
      id: 'pkt_k2',
      type: PacketType.HTTP_POST,
      originNodeId: 'ingress_1',
      currentNodeId: 'kafka_1',
      hopCount: 1,
      elapsedLatencyMs: 5,
      state: PacketState.IN_FLIGHT,
    };
    const res2 = traffic.processNodePacket(broker, pkt2);
    assert.strictEqual(res2.dropReason, 'BUFFER_OVERFLOW_504');
  });

  it('Distributed NoSQL cluster acts as terminal persistent node successfully completing writes', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    const nosql = {
      id: 'nosql_1',
      type: NodeType.DATABASE_NOSQL,
      capacityRps: 2500,
      currentRps: 100,
      baseLatencyMs: 10,
      status: 'HEALTHY',
    };

    const packet = {
      id: 'pkt_nosql',
      type: PacketType.DB_TRANSACTION,
      originNodeId: 'ingress_1',
      currentNodeId: 'nosql_1',
      hopCount: 2,
      elapsedLatencyMs: 15,
      revenuePotential: 200,
      state: PacketState.IN_FLIGHT,
    };

    const result = traffic.processNodePacket(nosql, packet);
    assert.strictEqual(result.packet.state, PacketState.PROCESSED);
    assert.strictEqual(traffic.processedCount, 1);
  });
});
