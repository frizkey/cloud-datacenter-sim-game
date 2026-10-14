import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EconomicEngine } from '../src/core/sim/EconomicEngine.js';
import { SIM_CONSTANTS } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('EconomicEngine Tests', () => {
  it('initializes with starting capital and 100% SLA reputation', () => {
    const bus = new EventBus();
    const econ = new EconomicEngine(bus);

    const profile = econ.getProfile();
    assert.strictEqual(profile.cashMicroCents, SIM_CONSTANTS.STARTING_CASH_MICRO_CENTS);
    assert.strictEqual(profile.slaReputationPercent, 100.0);
    assert.strictEqual(profile.isInsolvencyWarning, false);
    assert.strictEqual(profile.insolvencyGraceTimerSec, 30);
  });

  it('awards revenue on processed 200 OK packets ($0.0002 = 200 micro-cents)', () => {
    const bus = new EventBus();
    const econ = new EconomicEngine(bus);

    econ.recordProcessedRequest(100); // 100 requests
    const profile = econ.getProfile();
    assert.strictEqual(profile.totalProcessedRequests, 100);
    assert.strictEqual(profile.cashMicroCents, SIM_CONSTANTS.STARTING_CASH_MICRO_CENTS + 100 * 200);
  });

  it('deducts OPEX and power costs per tick accurately', () => {
    const bus = new EventBus();
    const econ = new EconomicEngine(bus);

    const initialCash = econ.getProfile().cashMicroCents;
    // Set fixed opex of $1.00/s = 1,000,000 micro-cents/sec
    econ.setOpexPerSec(1_000_000);

    // Run 60 ticks (1 full second)
    for (let i = 0; i < 60; i++) {
      econ.tick(1 / 60);
    }

    const currentCash = econ.getProfile().cashMicroCents;
    assert.strictEqual(currentCash, initialCash - 1_000_000, 'Exactly $1 OPEX must be deducted after 60 ticks');
  });

  it('penalizes SLA reputation on dropped packets and recovers under healthy traffic', () => {
    const bus = new EventBus();
    const econ = new EconomicEngine(bus);

    // Drop 20 packets
    econ.recordDroppedRequest(20);
    let profile = econ.getProfile();
    assert.strictEqual(profile.totalFailedRequests, 20);
    assert.ok(profile.slaReputationPercent < 100.0, 'SLA must drop when packets fail');

    const degradedSla = profile.slaReputationPercent;
    // Tick 60 times with 0 drops
    for (let i = 0; i < 60; i++) {
      econ.tick(1 / 60);
    }
    profile = econ.getProfile();
    assert.ok(profile.slaReputationPercent > degradedSla, 'SLA must recover during clean operation');
  });

  it('triggers 30-second insolvency grace countdown when cash drops below 0', () => {
    const bus = new EventBus();
    const econ = new EconomicEngine(bus);

    // Force negative balance
    econ.deductCash(60_000_000); // $50 start - $60 = -$10
    let profile = econ.getProfile();
    assert.ok(profile.cashMicroCents < 0);
    assert.strictEqual(profile.isInsolvencyWarning, true);
    assert.strictEqual(profile.isBankrupt, false);

    // Advance 10 seconds
    for (let i = 0; i < 600; i++) {
      econ.tick(1 / 60);
    }
    profile = econ.getProfile();
    assert.ok(Math.abs(profile.insolvencyGraceTimerSec - 20) < 0.1, `Expected ~20s, got ${profile.insolvencyGraceTimerSec}`);

    // Restore positive cashflow before deadline
    econ.addCash(20_000_000); // -$10 + $20 = +$10
    econ.tick(1 / 60);
    profile = econ.getProfile();
    assert.strictEqual(profile.isInsolvencyWarning, false);
    assert.strictEqual(profile.insolvencyGraceTimerSec, 30, 'Timer must reset once solvent');
  });

  it('triggers bankruptcy when insolvency timer expires at 0s', () => {
    const bus = new EventBus();
    const econ = new EconomicEngine(bus);

    let bankruptcyFired = false;
    bus.on('SLA_STATUS_CHANGED', (evt) => {
      if (evt.payload.isBankrupt) bankruptcyFired = true;
    });

    econ.deductCash(60_000_000); // negative

    // Run for 31 seconds
    for (let i = 0; i < 31 * 60; i++) {
      econ.tick(1 / 60);
    }

    const profile = econ.getProfile();
    assert.strictEqual(profile.isBankrupt, true);
    assert.strictEqual(bankruptcyFired, true);
  });
});
