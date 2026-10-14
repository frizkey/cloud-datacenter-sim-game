import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { EventBus } from '../src/core/events/EventBus.js';
import { NodeType, FacilityComponentType } from '../src/core/sim/Constants.js';

describe('Headless 10,000-Tick Stress & Determinism Benchmark', () => {
  it('executes 10,000 ticks in < 1500ms with zero float drift', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    // Build production-scale topology: Ingress -> WAF -> ALB -> 3 Pods -> Cache + DB
    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 0, gridY: 0 });
    const waf = engine.addNode({ type: NodeType.WAF_SHIELD, gridX: 2, gridY: 0 });
    const alb = engine.addNode({ type: NodeType.LOAD_BALANCER, gridX: 4, gridY: 0 });
    const pod1 = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 6, gridY: -2 });
    const pod2 = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 6, gridY: 0 });
    const pod3 = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 6, gridY: 2 });
    const cache = engine.addNode({ type: NodeType.CACHE_CLUSTER, gridX: 8, gridY: -1 });
    const db = engine.addNode({ type: NodeType.DATABASE_SQL, gridX: 8, gridY: 1 });

    engine.connectNodes(ingress.id, waf.id);
    engine.connectNodes(waf.id, alb.id);
    engine.connectNodes(alb.id, pod1.id);
    engine.connectNodes(alb.id, pod2.id);
    engine.connectNodes(alb.id, pod3.id);
    engine.connectNodes(pod1.id, cache.id);
    engine.connectNodes(pod2.id, cache.id);
    engine.connectNodes(pod3.id, db.id);

    // Add physical facility racks and CRAC chiller
    engine.facilityComponents.set('rack_prod_1', {
      id: 'rack_prod_1',
      type: FacilityComponentType.SERVER_RACK_42U,
      isoX: 2,
      isoY: 2,
      temperatureCelsius: 24.0,
      isPowerActive: true,
      nominalPowerKw: 4.0,
      costOpexPerSec: 5000,
    });

    engine.facilityComponents.set('crac_prod_1', {
      id: 'crac_prod_1',
      type: FacilityComponentType.CRAC_CHILLER,
      isoX: 1,
      isoY: 2,
      temperatureCelsius: 18.0,
      isPowerActive: true,
      nominalPowerKw: 4.5,
      coolingCapacityCfm: 5000,
      costOpexPerSec: 60000,
    });

    const startTime = performance.now();
    const TOTAL_TICKS = 10000;

    for (let tick = 0; tick < TOTAL_TICKS; tick++) {
      engine.tick(1 / 60);
    }

    const durationMs = performance.now() - startTime;
    const profile = engine.economicEngine.getProfile();

    console.log(`\n[BENCHMARK] 10,000 Ticks executed in ${durationMs.toFixed(2)}ms (${((TOTAL_TICKS / durationMs) * 1000).toFixed(0)} ticks/sec)`);
    console.log(`[BENCHMARK] Total Packets Processed: ${profile.totalProcessedRequests}`);
    console.log(`[BENCHMARK] Final Capital: $${(profile.cashMicroCents / 1_000_000).toFixed(2)}`);
    console.log(`[BENCHMARK] Final SLA: ${profile.slaReputationPercent}%`);
    console.log(`[BENCHMARK] PUE Ratio: ${engine.thermalEngine.pueRatio}`);

    // Assertions
    assert.strictEqual(engine.simulationTickCount, TOTAL_TICKS);
    assert.ok(durationMs < 1500, `Benchmark took ${durationMs.toFixed(2)}ms, must complete in < 1500ms`);
    assert.strictEqual(Number.isInteger(profile.cashMicroCents), true, 'Cash balance in micro-cents must remain exact integer with zero float drift');
    assert.ok(profile.totalProcessedRequests > 10000, 'Must process significant traffic volume');
    assert.ok(profile.slaReputationPercent >= 90.0, 'SLA must remain healthy under balanced topology');
  });

  it('executes 10,000 ticks with power grid blackout, UPS drain, and emergency generator spool-up', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 0, gridY: 0 });
    const kafka = engine.addNode({ type: NodeType.MESSAGE_BROKER, gridX: 2, gridY: 0 });
    const pod = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 4, gridY: 0 });
    const nosql = engine.addNode({ type: NodeType.DATABASE_NOSQL, gridX: 6, gridY: 0 });

    engine.connectNodes(ingress.id, kafka.id);
    engine.connectNodes(kafka.id, pod.id);
    engine.connectNodes(pod.id, nosql.id);

    // Setup UPS and Diesel Generator
    engine.facilityComponents.set('ups_bench', {
      id: 'ups_bench',
      type: FacilityComponentType.UPS_BATTERY,
      capacityKwh: 100,
      currentChargeKwh: 100,
      powerKw: 0.5,
    });
    engine.facilityComponents.set('gen_bench', {
      id: 'gen_bench',
      type: FacilityComponentType.DIESEL_GENERATOR,
      outputPowerKw: 150,
      fuelLiters: 500,
      fuelBurnRatePerSec: 0.05,
      isRunning: false,
    });

    // Trigger Blackout and Generator Start
    engine.powerEngine.setGridBlackout(true);
    engine.handleRemediationAction({ actionType: 'START_DIESEL_GENERATOR' });

    const startTime = performance.now();
    const TOTAL_TICKS = 10000;

    for (let tick = 0; tick < TOTAL_TICKS; tick++) {
      engine.tick(1 / 60);
    }

    const durationMs = performance.now() - startTime;
    const gen = engine.facilityComponents.get('gen_bench');
    const profile = engine.economicEngine.getProfile();

    console.log(`\n[BENCHMARK] Blackout & Kafka 10,000 Ticks executed in ${durationMs.toFixed(2)}ms`);
    console.log(`[BENCHMARK] Generator Status: ${gen.isRunning ? 'RUNNING' : 'STOPPED'}, Remaining Fuel: ${gen.fuelLiters.toFixed(2)}L`);
    console.log(`[BENCHMARK] Facility Powered: ${engine.powerEngine.isFacilityPowered}`);

    assert.strictEqual(engine.simulationTickCount, TOTAL_TICKS);
    assert.strictEqual(gen.isRunning, true);
    assert.strictEqual(engine.powerEngine.isFacilityPowered, true);
    assert.strictEqual(Number.isInteger(profile.cashMicroCents), true);
  });
});

