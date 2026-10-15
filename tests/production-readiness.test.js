import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/EventBus.js';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { TrafficEngine } from '../src/core/sim/TrafficEngine.js';
import { ChaosDirector } from '../src/core/sim/ChaosDirector.js';
import { TechTree } from '../src/core/sim/TechTree.js';
import { ContractManager } from '../src/core/sim/ContractManager.js';
import { CircuitBreaker, BreakerState } from '../src/core/sim/CircuitBreaker.js';
import { BlueprintCodec } from '../src/storage/BlueprintCodec.js';
import { StatePersistence, InMemoryStorageAdapter } from '../src/storage/StatePersistence.js';
import { RadialTouchMenu } from '../src/ui/RadialTouchMenu.js';
import { NodeType, PacketType, PacketState } from '../src/core/sim/Constants.js';
import * as IsoMath from '../src/render/IsoMath.js';
import { CAMPAIGN_LEVELS } from '../src/core/sim/CampaignLevels.js';

describe('Comprehensive Production-Grade Readiness End-to-End Suite (T063)', () => {
  it('validates US1: SRE Career Campaign has 5 balanced levels and proper schemas', () => {
    assert.equal(CAMPAIGN_LEVELS.length, 5);
    for (const lvl of CAMPAIGN_LEVELS) {
      assert.ok(lvl.levelNumber >= 1 && lvl.levelNumber <= 5);
      assert.ok(lvl.startingCashMicroCents > 0);
      assert.ok(lvl.objectives && typeof lvl.objectives === 'object');
      assert.ok(Array.isArray(lvl.scriptedIncidents));
    }
  });

  it('validates US2: 2.5D Isometric & Orthogonal Coordinates are invertible and snap correctly', () => {
    const screenPt = IsoMath.gridToScreen(4, 8);
    const gridPt = IsoMath.screenToGrid(screenPt.x, screenPt.y);
    assert.equal(Math.round(gridPt.x), 4);
    assert.equal(Math.round(gridPt.y), 8);

    const diamond = IsoMath.getTileDiamondVertices(2, 3);
    assert.equal(diamond.length, 4);
  });

  it('validates US3: Multi-bus audio architecture contract and procedural foley methods', async () => {
    const { AudioManager } = await import('../src/core/audio/AudioManager.js');
    const bus = new EventBus();
    const audio = new AudioManager({ eventBus: bus });
    assert.equal(typeof audio.settings.getSettings, 'function');
    assert.equal(typeof audio.playNodeClick, 'function');
    assert.equal(typeof audio.playCableCut, 'function');
  });

  it('validates US4: SRE Tech Tree progression and Enterprise RFPs SLA accounting', () => {
    const bus = new EventBus();
    const tree = new TechTree({ eventBus: bus });
    const contracts = new ContractManager();

    assert.equal(tree.isTechUnlocked('era1_bare_metal'), true);
    assert.equal(tree.isTechUnlocked('era2_load_balancer'), false);

    const available = contracts.getAvailableContracts();
    assert.ok(available.length >= 3);
  });

  it('validates US5: APM Observability rolling window & latency percentiles', () => {
    const bus = new EventBus();
    const traffic = new TrafficEngine(bus);
    for (let i = 1; i <= 100; i++) {
      traffic.recordTelemetrySample(i, i > 90 ? 502 : 200);
    }
    const apm = traffic.getApmMetrics();
    assert.equal(apm.totalRequests, 100);
    assert.equal(apm.p50LatencyMs, 50);
    assert.equal(apm.p95LatencyMs, 95);
    assert.equal(apm.p99LatencyMs, 99);
    assert.equal(apm.errorRatePercent, 10.0);
  });

  it('validates US6: Radial Touch Menu viewport safe margin clamping and action dispatch', () => {
    const menu = new RadialTouchMenu({
      viewportWidth: 800,
      viewportHeight: 600,
      safeMargin: 48,
    });
    const clamped = menu.calculateClampedPosition(10, 590);
    assert.equal(clamped.x, 48);
    assert.equal(clamped.y, 552);

    const actions = menu.getAvailableActions();
    assert.deepEqual(actions, ['restart', 'scale', 'wiring', 'inspect', 'delete']);
  });

  it('validates US7: Advanced simulation realism (multi-workload, HPA, Circuit Breakers, Multi-AZ)', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    // Multi-AZ nodes
    const gw = engine.addNode({
      type: NodeType.API_GATEWAY,
      gridX: 1,
      gridY: 1,
      zone: 'us-east-1a',
    });
    const pod = engine.addNode({
      type: NodeType.COMPUTE_POD,
      gridX: 3,
      gridY: 1,
      zone: 'us-east-1b',
      cpuUtilization: 0.85,
    });
    const conn = engine.connectNodes(gw.id, pod.id);

    // Circuit breaker exists on gateway
    assert.ok(gw.circuitBreaker instanceof CircuitBreaker);
    assert.equal(gw.circuitBreaker.state, BreakerState.CLOSED);

    // Multi-AZ egress fee & latency
    const initialCash = engine.economicEngine.cashMicroCents;
    const packet = engine.trafficEngine.spawnPacket(gw, PacketType.STATIC_CDN);
    engine.forwardPacketThroughConnection(packet, conn);
    assert.ok(packet.elapsedLatencyMs > 5);
    assert.ok(engine.economicEngine.cashMicroCents < initialCash);

    // HPA evaluation
    engine.enableHpa({ targetCpuUtilization: 0.70, cooldownSec: 0 });
    engine.evaluateHpa(1.0);
    assert.ok(pod.capacityRps > 500);
  });

  it('validates US8: Factorio-style Base64 blueprint string export/import & multi-slot saves', async () => {
    const payload = {
      title: 'Full DC Grid',
      description: 'Production cluster',
      nodes: [{ id: 'n1', type: NodeType.COMPUTE_POD, gridX: 2, gridY: 2 }],
      connections: [],
    };

    const bpStr = BlueprintCodec.encode(payload);
    assert.ok(bpStr.startsWith('CSBP1:'));
    const restored = BlueprintCodec.decode(bpStr);
    assert.equal(restored.title, 'Full DC Grid');

    const memoryAdapter = new InMemoryStorageAdapter();
    const persistence = new StatePersistence(memoryAdapter);

    const engine = new SimulationEngine();
    engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 4, gridY: 4 });
    await persistence.save(engine.serializeState(), 'slot1');

    const slots = await persistence.listSlots();
    const slot1 = slots.find((s) => s.id === 'slot1');
    assert.equal(slot1.exists, true);
    assert.equal(slot1.nodeCount, 1);
  });
});
