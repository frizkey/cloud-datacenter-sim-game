import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, EngineEventTypes } from '../src/core/events/EventBus.js';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { NodeType } from '../src/core/sim/Constants.js';

describe('Dual-View State Synchronization Tests (US2)', () => {
  it('propagates immutable state snapshots to multiple subscribers synchronously', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 0, gridY: 0 });
    const pod = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 2, gridY: 0 });
    engine.connectNodes(ingress.id, pod.id);

    let topologySnapshot = null;
    let facilitySnapshot = null;

    // Simulate TopologyScene subscriber
    bus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      topologySnapshot = evt.payload.snapshot;
    });

    // Simulate FacilityScene subscriber
    bus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      facilitySnapshot = evt.payload.snapshot;
    });

    engine.tick(1 / 60);

    assert.ok(topologySnapshot, 'TopologyScene should receive snapshot');
    assert.ok(facilitySnapshot, 'FacilityScene should receive snapshot');
    assert.strictEqual(topologySnapshot.simulationTickCount, 1);
    assert.strictEqual(facilitySnapshot.simulationTickCount, 1);
    assert.strictEqual(topologySnapshot.nodes.length, 2);
    assert.strictEqual(facilitySnapshot.nodes.length, 2);
  });

  it('maintains state continuity during sleep and wake transitions', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    let facilitySceneSleeping = false;
    let facilityLastReceivedTick = 0;

    bus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      if (!facilitySceneSleeping) {
        facilityLastReceivedTick = evt.payload.snapshot.simulationTickCount;
      }
    });

    // Step 10 ticks while both awake
    for (let i = 0; i < 10; i++) engine.tick(1 / 60);
    assert.strictEqual(facilityLastReceivedTick, 10);

    // Put facility scene to sleep (player switches to Topology)
    facilitySceneSleeping = true;
    for (let i = 0; i < 20; i++) engine.tick(1 / 60);
    assert.strictEqual(facilityLastReceivedTick, 10, 'Sleeping scene ignores render updates');

    // Wake facility scene: catch up with latest snapshot immediately
    facilitySceneSleeping = false;
    const latest = engine.getSnapshot();
    facilityLastReceivedTick = latest.simulationTickCount;
    assert.strictEqual(facilityLastReceivedTick, 30, 'Waking scene immediately acquires current state');
  });
});
