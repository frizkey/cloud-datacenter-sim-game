import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ContractManager, ContractState, ClientTier } from '../src/core/sim/ContractManager.js';

describe('Client Enterprise RFPs & Contract Evaluation (T030)', () => {
  let manager;

  beforeEach(() => {
    manager = new ContractManager();
  });

  it('lists available enterprise contracts across multiple client tiers', () => {
    const contracts = manager.getContracts();
    assert.ok(contracts.length >= 4, 'Must have at least 4 default contracts');

    const tiers = new Set(contracts.map((c) => c.clientTier));
    assert.ok(tiers.has(ClientTier.STARTUP));
    assert.ok(tiers.has(ClientTier.GROWTH));
    assert.ok(tiers.has(ClientTier.ENTERPRISE));
    assert.ok(tiers.has(ClientTier.HYPERSCALE));
  });

  it('prevents accepting contract without required component topology', () => {
    // contract_pixel_media requires CDN_EDGE
    assert.throws(
      () => manager.acceptContract('contract_pixel_media', ['COMPUTE_POD']),
      /missing required components/i
    );
  });

  it('successfully accepts contract when topology requirements are met', () => {
    const contract = manager.acceptContract('contract_pixel_media', ['CDN_EDGE', 'COMPUTE_POD']);
    assert.equal(contract.state, ContractState.ACTIVE);
    assert.equal(manager.getActiveContracts().length, 1);
  });

  it('awards streaming revenue during healthy telemetry evaluation', () => {
    manager.acceptContract('contract_pixel_media', ['CDN_EDGE']);

    // Telemetry meeting all requirements: minRps 50, maxLatency 250ms, minSla 95%
    const telemetry = {
      currentRps: 80,
      avgLatencyMs: 120,
      currentSlaPercent: 99.8,
      activeComponentTypes: ['CDN_EDGE'],
    };

    const delta = manager.evaluate(1.0, telemetry);
    // payoutPerSecMicroCents = 100,000 ($1.00)
    assert.equal(delta.revenueDeltaMicroCents, 100000);
    assert.equal(delta.penaltyDeltaMicroCents, 0);
  });

  it('deducts SLA breach penalty when latency or SLA violates requirements', () => {
    manager.acceptContract('contract_pixel_media', ['CDN_EDGE']);

    // Breached telemetry: latency 400ms > maxLatency 250ms
    const breachedTelemetry = {
      currentRps: 80,
      avgLatencyMs: 400,
      currentSlaPercent: 88.0,
      activeComponentTypes: ['CDN_EDGE'],
    };

    const delta = manager.evaluate(1.0, breachedTelemetry);
    // penaltyPerBreachMicroCents = 500,000 ($5.00)
    assert.equal(delta.revenueDeltaMicroCents, 0);
    assert.equal(delta.penaltyDeltaMicroCents, 500000);
  });

  it('awards completion bonus when contract duration is fulfilled with >= 85% health', () => {
    manager.acceptContract('contract_pixel_media', ['CDN_EDGE']);

    const healthyTelemetry = {
      currentRps: 80,
      avgLatencyMs: 120,
      currentSlaPercent: 99.8,
      activeComponentTypes: ['CDN_EDGE'],
    };

    // Duration is 60s
    let totalRevenue = 0;
    let fulfilled = false;
    for (let sec = 0; sec < 60; sec++) {
      const delta = manager.evaluate(1.0, healthyTelemetry);
      totalRevenue += delta.revenueDeltaMicroCents;
      if (delta.completedContracts.length > 0) {
        fulfilled = true;
      }
    }

    assert.equal(fulfilled, true);
    // 60s * $1.00 + $200.00 bonus = 6,000,000 + 20,000,000 = 26,000,000 microcents
    assert.equal(totalRevenue, 26000000);
  });

  it('marks contract BREACHED when overall health ratio is unacceptable', () => {
    manager.acceptContract('contract_pixel_media', ['CDN_EDGE']);

    const badTelemetry = {
      currentRps: 10, // Below minRps 50
      avgLatencyMs: 800,
      currentSlaPercent: 70.0,
      activeComponentTypes: ['CDN_EDGE'],
    };

    let breached = false;
    for (let sec = 0; sec < 60; sec++) {
      const delta = manager.evaluate(1.0, badTelemetry);
      if (delta.breachedContracts.length > 0) {
        breached = true;
      }
    }

    assert.equal(breached, true);
    const c = manager.contracts.get('contract_pixel_media');
    assert.equal(c.state, ContractState.BREACHED);
  });

  it('serializes and deserializes active and fulfilled contract states', () => {
    manager.acceptContract('contract_pixel_media', ['CDN_EDGE']);
    const snapshot = manager.serialize();

    const freshManager = new ContractManager();
    freshManager.deserialize(snapshot);

    const restored = freshManager.contracts.get('contract_pixel_media');
    assert.equal(restored.state, ContractState.ACTIVE);
  });
});
