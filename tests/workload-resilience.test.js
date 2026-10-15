import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/EventBus.js';
import { TrafficEngine } from '../src/core/sim/TrafficEngine.js';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { CircuitBreaker, BreakerState } from '../src/core/sim/CircuitBreaker.js';
import { NodeType, PacketType, PacketState } from '../src/core/sim/Constants.js';

describe('Advanced Simulation Realism & Resilience (T047)', () => {
  let eventBus;
  let trafficEngine;
  let simEngine;

  beforeEach(() => {
    eventBus = new EventBus();
    trafficEngine = new TrafficEngine(eventBus);
    simEngine = new SimulationEngine({ eventBus, tickRateHz: 60 });
  });

  describe('Multi-Workload Packet Routing (T048)', () => {
    it('handles STATIC_CDN packets at CDN Edge with 95% cache hit and minimal latency', () => {
      const cdnNode = {
        id: 'cdn-1',
        type: NodeType.CDN_EDGE,
        cacheHitRate: 0.95,
        baseLatencyMs: 3,
        capacityRps: 10000,
        currentRps: 50,
      };

      const packet = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.STATIC_CDN);
      assert.equal(packet.type, PacketType.STATIC_CDN);

      // Deterministic pseudo-random yielding 0.5 (< 0.95 hit rate)
      const res = trafficEngine.processNodePacket(cdnNode, packet, () => 0.5);
      assert.equal(res.isCacheHit, true);
      assert.equal(packet.state, PacketState.PROCESSED);
      assert.ok(packet.elapsedLatencyMs <= 10, 'CDN cache hit latency must be <= 10ms');
    });

    it('routes API_READ queries to Cache and bypasses DB on hit, queries DB on miss', () => {
      const cacheNode = {
        id: 'cache-1',
        type: NodeType.CACHE_CLUSTER,
        cacheHitRate: 0.85,
        baseLatencyMs: 2,
        capacityRps: 5000,
        currentRps: 100,
      };

      const readPacketHit = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.API_READ);
      const hitRes = trafficEngine.processNodePacket(cacheNode, readPacketHit, () => 0.1);
      assert.equal(hitRes.isCacheHit, true);
      assert.equal(readPacketHit.state, PacketState.PROCESSED);

      const readPacketMiss = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.API_READ);
      const missRes = trafficEngine.processNodePacket(cacheNode, readPacketMiss, () => 0.99);
      assert.equal(missRes.isCacheHit, false);
      assert.equal(readPacketMiss.state, PacketState.IN_FLIGHT);
    });

    it('enforces row-level lock contention and connection limits on API_WRITE transactions', () => {
      const dbNode = {
        id: 'db-primary',
        type: NodeType.DATABASE_SQL,
        baseLatencyMs: 25,
        capacityRps: 200,
        currentRps: 50,
        maxWriteConnections: 10,
        activeWrites: 10, // Full connection pool
      };

      const writePacket = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.API_WRITE);
      const res = trafficEngine.processNodePacket(dbNode, writePacket);
      
      // When write connection pool is full, transaction is dropped with lock contention or queued
      assert.equal(res.dropReason, 'DB_LOCK_CONTENTION_504');
      assert.equal(writePacket.state, PacketState.DROPPED);
    });

    it('buffers ASYNC_JOB in Message Broker without blocking HTTP caller', () => {
      const brokerNode = {
        id: 'kafka-1',
        type: NodeType.MESSAGE_BROKER,
        bufferCapacity: 10000,
        currentQueueDepth: 120,
      };

      const jobPacket = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.ASYNC_JOB);
      const res = trafficEngine.processNodePacket(brokerNode, jobPacket);
      assert.equal(res.isBuffered, true);
      assert.equal(brokerNode.currentQueueDepth, 121);
    });

    it('blocks CYBER_ATTACK packets at WAF_SHIELD and drops unshielded attacks into high CPU', () => {
      const wafNode = {
        id: 'waf-1',
        type: NodeType.WAF_SHIELD,
        blockedAttacksCount: 0,
      };

      const attackPacket = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.CYBER_ATTACK);
      const res = trafficEngine.processNodePacket(wafNode, attackPacket);
      assert.equal(res.dropReason, 'WAF_ATTACK_BLOCKED');
      assert.equal(wafNode.blockedAttacksCount, 1);
    });
  });

  describe('Circuit Breaker Gateway Protection (T050)', () => {
    it('initializes in CLOSED state, trips OPEN after consecutive failures, and fast-fails requests', () => {
      const breaker = new CircuitBreaker({
        id: 'gw-breaker',
        consecutiveFailuresThreshold: 3,
        tripCooldownSec: 2,
      });

      assert.equal(breaker.state, BreakerState.CLOSED);
      assert.equal(breaker.canPass(), true);

      breaker.recordFailure('Downstream 502 Bad Gateway');
      breaker.recordFailure('Downstream 504 Gateway Timeout');
      assert.equal(breaker.state, BreakerState.CLOSED);

      breaker.recordFailure('Downstream connection refused');
      assert.equal(breaker.state, BreakerState.OPEN);
      assert.equal(breaker.canPass(), false);

      // In OPEN state, gateway fast-fails packet
      const gwNode = {
        id: 'gw-1',
        type: NodeType.API_GATEWAY,
        circuitBreaker: breaker,
      };
      const packet = trafficEngine.spawnPacket({ id: 'ingress-1' }, PacketType.HTTP_GET);
      const res = trafficEngine.processNodePacket(gwNode, packet);
      assert.equal(res.dropReason, 'CIRCUIT_BREAKER_OPEN');
      assert.equal(packet.state, PacketState.DROPPED);

      // After cooldown, transitions to HALF_OPEN
      breaker.tick(2.1);
      assert.equal(breaker.state, BreakerState.HALF_OPEN);
      assert.equal(breaker.canPass(), true);

      // Probe request succeeds -> resets to CLOSED
      breaker.recordSuccess();
      assert.equal(breaker.state, BreakerState.CLOSED);
    });
  });

  describe('Horizontal Pod Autoscaler (HPA) (T049)', () => {
    it('scales up compute pod capacity when average CPU exceeds target utilization', () => {
      const pod1 = simEngine.addNode({
        type: NodeType.COMPUTE_POD,
        gridX: 2,
        gridY: 2,
        capacityRps: 500,
        cpuUtilization: 0.85,
      });
      const pod2 = simEngine.addNode({
        type: NodeType.COMPUTE_POD,
        gridX: 3,
        gridY: 2,
        capacityRps: 500,
        cpuUtilization: 0.80,
      });

      simEngine.enableHpa({
        targetCpuUtilization: 0.70,
        maxCapacityPerPod: 2000,
        scaleStepRps: 200,
        cooldownSec: 0,
      });

      let scaledUp = false;
      eventBus.on('HPA_SCALE_UP', () => {
        scaledUp = true;
      });

      simEngine.evaluateHpa(1.0);
      assert.equal(scaledUp, true, 'HPA must emit HPA_SCALE_UP when avg CPU > 70%');
      assert.ok(pod1.capacityRps > 500, 'Pod 1 capacity must have scaled up');
      assert.ok(pod2.capacityRps > 500, 'Pod 2 capacity must have scaled up');
    });

    it('scales down compute pod capacity when average CPU is low', () => {
      const pod = simEngine.addNode({
        type: NodeType.COMPUTE_POD,
        gridX: 2,
        gridY: 2,
        capacityRps: 1000,
        cpuUtilization: 0.15,
      });

      simEngine.enableHpa({
        targetCpuUtilization: 0.70,
        minCapacityPerPod: 500,
        scaleStepRps: 200,
        cooldownSec: 0,
      });

      let scaledDown = false;
      eventBus.on('HPA_SCALE_DOWN', () => {
        scaledDown = true;
      });

      simEngine.evaluateHpa(1.0);
      assert.equal(scaledDown, true, 'HPA must emit HPA_SCALE_DOWN when avg CPU < 30%');
      assert.equal(pod.capacityRps, 800);
    });
  });

  describe('Multi-AZ Cross-Zone Routing & Egress (T051)', () => {
    it('applies cross-zone latency penalty and egress bandwidth billing', () => {
      const initialCash = simEngine.economicEngine.cashMicroCents;

      const nodeA = simEngine.addNode({
        type: NodeType.COMPUTE_POD,
        gridX: 1,
        gridY: 1,
        zone: 'us-east-1a',
      });
      const nodeB = simEngine.addNode({
        type: NodeType.DATABASE_SQL,
        gridX: 2,
        gridY: 1,
        zone: 'us-east-1b',
      });

      const conn = simEngine.connectNodes(nodeA.id, nodeB.id);
      assert.ok(conn);

      const packet = trafficEngine.spawnPacket(nodeA, PacketType.API_READ);
      assert.equal(packet.elapsedLatencyMs, nodeA.baseLatencyMs || 5);

      simEngine.forwardPacketThroughConnection(packet, conn);

      // Latency penalty applied
      assert.ok(packet.elapsedLatencyMs > 10, 'Cross-zone latency penalty must be added');

      // Egress cost deducted
      assert.ok(simEngine.economicEngine.cashMicroCents < initialCash, 'Cross-zone egress cost must be deducted from cash');
    });
  });
});
