import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { StatePersistence, InMemoryStorageAdapter, computeOfflineCatchup } from '../src/storage/StatePersistence.js';
import { NodeType, SIM_CONSTANTS } from '../src/core/sim/Constants.js';

describe('StatePersistence Auto-Save & Bootstrap (T010)', () => {
  it('saves simulation state and restores it completely on game boot', async () => {
    const memoryAdapter = new InMemoryStorageAdapter();
    const persistence = new StatePersistence(memoryAdapter);

    const engineA = new SimulationEngine();
    const ingress = engineA.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 3, gridY: 4 });
    const pod = engineA.addNode({ type: NodeType.COMPUTE_POD, gridX: 6, gridY: 4 });
    const db = engineA.addNode({ type: NodeType.DATABASE_SQL, gridX: 9, gridY: 4 });
    engineA.connectNodes(ingress.id, pod.id);
    engineA.connectNodes(pod.id, db.id);
    engineA.economicEngine.addCash(50_000_000); // Add $500

    // Save state
    const saved = await persistence.save(engineA.serializeState());
    assert.ok(saved);
    assert.equal(saved.nodes.length, 3);
    assert.equal(saved.connections.length, 2);

    // Boot a new engine instance (simulating page reload)
    const engineB = new SimulationEngine();
    const loadedData = await persistence.load();
    assert.ok(loadedData, 'Must load saved data');

    // Restore state into engineB
    engineB.deserializeState(loadedData);
    assert.equal(engineB.nodes.size, 3);
    assert.equal(engineB.connections.size, 2);
    assert.equal(engineB.nodes.get(ingress.id).type, NodeType.CLIENT_INGRESS);
    assert.equal(engineB.nodes.get(pod.id).type, NodeType.COMPUTE_POD);
  });

  it('computes offline catch-up correctly when restored after time gap', async () => {
    const savedTimestamp = Date.now() - 3600 * 1000; // 1 hour ago
    const savedState = {
      savedAtTimestamp: savedTimestamp,
      economicProfile: {
        cashMicroCents: 10_000_000,
        revenuePerSec: 200_000, // $2.00/s
        opexPerSec: 50_000, // $0.50/s -> Net $1.50/s
        slaReputationPercent: 99.0,
      },
    };

    const catchup = computeOfflineCatchup(savedState, Date.now());
    assert.ok(catchup.offlineSeconds >= 3599 && catchup.offlineSeconds <= 3601);
    assert.ok(catchup.offlineCashDelta > 0, 'Must award positive offline cash delta');
  });
});
