import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeState,
  validateSaveSchema,
  computeOfflineCatchup,
  InMemoryStorageAdapter,
  StatePersistence,
} from '../src/storage/StatePersistence.js';

describe('StatePersistence & SaveStateSchema Tests', () => {
  const sampleEngineState = {
    simulationTickCount: 12000,
    economicProfile: {
      cashMicroCents: 52_000_000,
      revenuePerSec: 100_000,
      opexPerSec: 40_000,
      slaReputationPercent: 99.98,
      totalProcessedRequests: 15400,
      totalFailedRequests: 12,
    },
    nodes: [
      { id: 'node_1', type: 'CLIENT_INGRESS', gridX: 2, gridY: 2, status: 'HEALTHY', cpuUtilization: 0.1 },
      { id: 'node_2', type: 'COMPUTE_POD', gridX: 4, gridY: 2, status: 'HEALTHY', cpuUtilization: 0.45 },
    ],
    connections: [
      { id: 'conn_1', sourceNodeId: 'node_1', targetNodeId: 'node_2' },
    ],
    facilityComponents: [
      { id: 'fac_1', type: 'SERVER_RACK_42U', isoX: 0, isoY: 0, temperatureCelsius: 28.5, isPowerActive: true },
    ],
    activeIncidents: [
      { id: 'inc_1', type: 'FLASH_SALE_SPIKE', severity: 'TIER_2_MEDIUM', targetComponentId: 'node_2', timeElapsedSec: 5.0 },
    ],
  };

  it('serializes simulation state matching save-state-schema.json format', () => {
    const serialized = serializeState(sampleEngineState);

    assert.strictEqual(serialized.version, '1.0.0');
    assert.strictEqual(typeof serialized.savedAtTimestamp, 'number');
    assert.strictEqual(serialized.simulationTickCount, 12000);
    assert.deepStrictEqual(serialized.economicProfile, sampleEngineState.economicProfile);
    assert.strictEqual(serialized.nodes.length, 2);
    assert.strictEqual(serialized.connections.length, 1);
    assert.strictEqual(serialized.facilityComponents.length, 1);
    assert.strictEqual(serialized.activeIncidents.length, 1);
  });

  it('validates schema requirements strictly', () => {
    const valid = serializeState(sampleEngineState);
    assert.strictEqual(validateSaveSchema(valid), true);

    // Missing version
    assert.strictEqual(validateSaveSchema({ ...valid, version: undefined }), false);

    // Invalid SLA percentage (> 100)
    const invalidSla = JSON.parse(JSON.stringify(valid));
    invalidSla.economicProfile.slaReputationPercent = 105;
    assert.strictEqual(validateSaveSchema(invalidSla), false);

    // Missing required node attributes
    const invalidNode = JSON.parse(JSON.stringify(valid));
    delete invalidNode.nodes[0].gridX;
    assert.strictEqual(validateSaveSchema(invalidNode), false);
  });

  it('computes offline catch-up capped at 8 hours', () => {
    const savedState = serializeState(sampleEngineState);

    // Simulate 2 hours (7200 seconds) offline with net income = 60,000 micro-cents/sec ($0.06/s)
    const twoHoursMs = 2 * 3600 * 1000;
    savedState.savedAtTimestamp = Date.now() - twoHoursMs;

    const catchup2h = computeOfflineCatchup(savedState, Date.now());
    assert.strictEqual(catchup2h.offlineSeconds, 7200);
    assert.strictEqual(catchup2h.offlineCashDelta, 7200 * (100_000 - 40_000));
    assert.ok(catchup2h.offlineRequestsProcessed > 0);

    // Simulate 24 hours offline -> should be capped at 8 hours (28800 seconds)
    const twentyFourHoursMs = 24 * 3600 * 1000;
    savedState.savedAtTimestamp = Date.now() - twentyFourHoursMs;

    const catchup24h = computeOfflineCatchup(savedState, Date.now());
    assert.strictEqual(catchup24h.offlineSeconds, 8 * 3600, 'Must cap offline catchup at 8 hours');
    assert.strictEqual(catchup24h.offlineCashDelta, 28800 * (100_000 - 40_000));
  });

  it('saves and loads state with fallback adapter', async () => {
    const storage = new InMemoryStorageAdapter();
    const persistence = new StatePersistence(storage);

    await persistence.save(sampleEngineState);
    const loaded = await persistence.load();

    assert.ok(loaded);
    assert.strictEqual(loaded.version, '1.0.0');
    assert.strictEqual(loaded.simulationTickCount, 12000);
    assert.strictEqual(loaded.economicProfile.cashMicroCents, 52_000_000);
  });
});
