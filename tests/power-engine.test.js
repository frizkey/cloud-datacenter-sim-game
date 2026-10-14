import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PowerEngine } from '../src/core/sim/PowerEngine.js';
import { FacilityComponentType } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('PowerEngine & Facility Power Survival Tests (US2)', () => {
  it('initializes with municipal grid power active and tracks facility IT power', () => {
    const bus = new EventBus();
    const power = new PowerEngine(bus);

    assert.strictEqual(power.isGridBlackout, false);
    assert.strictEqual(power.totalLoadKw, 0);
  });

  it('UPS battery discharges during municipal power blackout and calculates runtime', () => {
    const bus = new EventBus();
    const power = new PowerEngine(bus);

    let alertEmitted = false;
    bus.on('POWER_BLACKOUT_ALERT', () => {
      alertEmitted = true;
    });

    const components = new Map();
    components.set('ups_1', {
      id: 'ups_1',
      type: FacilityComponentType.UPS_BATTERY,
      capacityKwh: 50,
      currentChargeKwh: 50,
      powerKw: 0.5,
    });
    components.set('rack_1', {
      id: 'rack_1',
      type: FacilityComponentType.SERVER_RACK_42U,
      powerKw: 25.0, // 25 kW load
    });

    // 1. Cut mains power
    power.setGridBlackout(true);
    assert.strictEqual(alertEmitted, true);

    // 2. Step 1 tick (1/60s = ~0.0166s)
    power.tick(1 / 60, components);

    const ups = components.get('ups_1');
    assert.ok(ups.currentChargeKwh < 50, 'UPS battery must discharge under load');
    assert.ok(power.runtimeSecondsRemaining > 0, 'Must calculate runtime remaining');
  });

  it('Diesel generator spools up over 3 seconds (180 ticks) and restores power with fuel burn', () => {
    const bus = new EventBus();
    const power = new PowerEngine(bus);

    const components = new Map();
    components.set('gen_1', {
      id: 'gen_1',
      type: FacilityComponentType.DIESEL_GENERATOR,
      outputPowerKw: 150,
      fuelLiters: 100,
      fuelBurnRatePerSec: 0.05,
      isRunning: false,
      isSpoolingUp: false,
      spoolTicksRemaining: 180,
    });

    power.setGridBlackout(true);
    power.startGenerator('gen_1', components);

    const gen = components.get('gen_1');
    assert.strictEqual(gen.isSpoolingUp, true);
    assert.strictEqual(gen.isRunning, false);

    // Step 180 ticks (3.0s)
    for (let i = 0; i < 180; i++) {
      power.tick(1 / 60, components);
    }

    assert.strictEqual(gen.isSpoolingUp, false);
    assert.strictEqual(gen.isRunning, true);
    assert.ok(gen.fuelLiters < 100, 'Must consume diesel fuel when running');
  });

  it('triggers total facility shutdown when UPS reaches 0 charge during blackout without generator', () => {
    const bus = new EventBus();
    const power = new PowerEngine(bus);

    let shutdownEmitted = false;
    bus.on('FACILITY_POWER_SHUTDOWN', () => {
      shutdownEmitted = true;
    });

    const components = new Map();
    components.set('ups_empty', {
      id: 'ups_empty',
      type: FacilityComponentType.UPS_BATTERY,
      capacityKwh: 50,
      currentChargeKwh: 0.0001, // Almost empty
      powerKw: 0.5,
    });
    components.set('rack_1', {
      id: 'rack_1',
      type: FacilityComponentType.SERVER_RACK_42U,
      powerKw: 50.0,
    });

    power.setGridBlackout(true);
    power.tick(1 / 60, components);

    assert.strictEqual(shutdownEmitted, true);
    assert.strictEqual(power.isFacilityPowered, false);
  });
});
