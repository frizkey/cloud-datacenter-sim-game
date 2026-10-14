import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TrafficEngine } from '../src/core/sim/TrafficEngine.js';
import { NodeType, PacketType, PacketState } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('TrafficEngine Tests', () => {
  it('calculates additive latency correctly including queue and compute delays', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    // Setup node: Compute pod with baseLatency 20ms
    const node = {
      id: 'pod_1',
      type: NodeType.COMPUTE_POD,
      capacityRps: 500,
      currentRps: 250,
      baseLatencyMs: 20,
      cpuUtilization: 0.5,
      status: 'HEALTHY',
    };

    const latency = traffic.calculateNodeLatency(node);
    // Base 20 + Queue (20 * (250/500)^2 = 5ms) + Compute (20 * (1/(1 - 0.5) - 1) = 20ms) => ~45ms
    assert.ok(latency >= 40 && latency <= 50, `Expected latency ~45ms, got ${latency}`);
  });

  it('drops packets and enforces max 16 hops to prevent circular routing', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    let droppedEvent = null;
    bus.on('PACKET_DROPPED', (evt) => {
      droppedEvent = evt;
    });

    const packet = {
      id: 'pkt_test_1',
      type: PacketType.HTTP_GET,
      hopCount: 16, // At limit
      elapsedLatencyMs: 120,
      state: PacketState.IN_FLIGHT,
      currentNodeId: 'node_a',
      targetNodeId: 'node_b',
    };

    const routed = traffic.forwardPacket(packet, 'node_b', null);
    assert.strictEqual(routed, null, 'Packet exceeding max hops must be dropped');
    assert.strictEqual(packet.state, PacketState.DROPPED);
    assert.ok(droppedEvent);
    assert.strictEqual(droppedEvent.payload.reason, 'HOP_LIMIT_EXCEEDED');
  });

  it('handles cache hits at edge/cache nodes bypassing downstream processing', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    const cacheNode = {
      id: 'cache_1',
      type: NodeType.CACHE_CLUSTER,
      capacityRps: 4000,
      currentRps: 100,
      baseLatencyMs: 1,
      cpuUtilization: 0.1,
      status: 'HEALTHY',
      cacheHitRate: 0.85,
    };

    const packet = {
      id: 'pkt_cache_test',
      type: PacketType.HTTP_GET,
      hopCount: 2,
      elapsedLatencyMs: 10,
      state: PacketState.IN_FLIGHT,
      currentNodeId: 'cache_1',
    };

    // Deterministic seed / mock for cache hit
    const result = traffic.processNodePacket(cacheNode, packet, () => 0.5); // 0.5 < 0.85 -> cache hit
    assert.strictEqual(result.isCacheHit, true);
    assert.strictEqual(result.packet.state, PacketState.PROCESSED);
  });

  it('drops packets with HTTP 502/504 when node queue overflows capacity', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);

    const overloadedNode = {
      id: 'overloaded_pod',
      type: NodeType.COMPUTE_POD,
      capacityRps: 100,
      currentRps: 200, // 200% capacity
      baseLatencyMs: 20,
      cpuUtilization: 1.0,
      status: 'CRITICAL',
    };

    const packet = {
      id: 'pkt_overflow',
      type: PacketType.HTTP_POST,
      hopCount: 3,
      elapsedLatencyMs: 80,
      state: PacketState.IN_FLIGHT,
    };

    const result = traffic.processNodePacket(overloadedNode, packet);
    assert.strictEqual(result.packet.state, PacketState.DROPPED);
    assert.strictEqual(result.dropReason, 'CAPACITY_OVERFLOW_502');
  });
});
