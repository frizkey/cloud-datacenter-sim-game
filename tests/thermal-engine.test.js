import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ThermalEngine } from '../src/core/sim/ThermalEngine.js';
import { FacilityComponentType, SIM_CONSTANTS } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('ThermalEngine Physics Tests (US4)', () => {
  it('calculates BTU heat dissipation from workload wattage correctly', () => {
    const bus = new EventBus();
    const thermal = new ThermalEngine(bus);

    // 1000 Watts of IT workload
    const btu = thermal.calculateBtuPerHour(1000);
    // 1000 * 3.412 = 3412 BTU/h
    assert.strictEqual(btu, 3412);
  });

  it('computes dynamic PUE ratio accurately', () => {
    const bus = new EventBus();
    const thermal = new ThermalEngine(bus);

    const facilities = [
      { id: 'rack_1', type: FacilityComponentType.SERVER_RACK_42U, nominalPowerKw: 10.0, isPowerActive: true },
      { id: 'chiller_1', type: FacilityComponentType.CRAC_CHILLER, nominalPowerKw: 3.0, isPowerActive: true },
      { id: 'pdu_1', type: FacilityComponentType.PDU_3PHASE, nominalPowerKw: 0.5, isPowerActive: true },
    ];

    // IT Power = 10 kW, Facility Overhead = 3.5 kW, Total = 13.5 kW
    // PUE = 13.5 / 10 = 1.35
    const pue = thermal.calculatePue(facilities);
    assert.strictEqual(pue, 1.35);
  });

  it('simulates temperature rise from rack workload and cooling from CRAC chillers', () => {
    const bus = new EventBus();
    const thermal = new ThermalEngine(bus);

    const uncooledRack = {
      id: 'rack_hot',
      type: FacilityComponentType.SERVER_RACK_42U,
      isoX: 5,
      isoY: 5,
      temperatureCelsius: 25.0,
      nominalPowerKw: 5.0,
      isPowerActive: true,
      linkedWatts: 5000,
    };

    // Step 60 ticks (1 second) without cooling
    for (let i = 0; i < 60; i++) {
      thermal.tick(1 / 60, [uncooledRack]);
    }
    assert.ok(uncooledRack.temperatureCelsius > 25.0, 'Uncooled rack temperature must increase');

    // Add CRAC chiller adjacent to rack (distance = 1)
    const crac = {
      id: 'crac_1',
      type: FacilityComponentType.CRAC_CHILLER,
      isoX: 5,
      isoY: 4,
      nominalPowerKw: 4.5,
      coolingCapacityCfm: 5000,
      isPowerActive: true,
      temperatureCelsius: 18.0,
    };

    const elevatedTemp = uncooledRack.temperatureCelsius;
    // Step with CRAC active
    for (let i = 0; i < 120; i++) {
      thermal.tick(1 / 60, [uncooledRack, crac]);
    }
    assert.ok(uncooledRack.temperatureCelsius < elevatedTemp, 'CRAC chiller must lower rack temperature');
  });

  it('trips thermal throttling and emits alert when rack exceeds 45°C', () => {
    const bus = new EventBus();
    const thermal = new ThermalEngine(bus);

    let alertFired = false;
    bus.on('FACILITY_HOTSPOT_ALERT', (evt) => {
      alertFired = true;
      assert.strictEqual(evt.payload.componentId, 'rack_critical');
      assert.ok(evt.payload.temperatureCelsius >= 45.0);
    });

    const overheatingRack = {
      id: 'rack_critical',
      type: FacilityComponentType.SERVER_RACK_42U,
      isoX: 0,
      isoY: 0,
      temperatureCelsius: 44.9,
      nominalPowerKw: 15.0,
      linkedWatts: 15000,
      isPowerActive: true,
    };

    // Step until over 45°C
    for (let i = 0; i < 30; i++) {
      thermal.tick(1 / 60, [overheatingRack]);
    }

    assert.ok(overheatingRack.temperatureCelsius >= 45.0);
    assert.strictEqual(alertFired, true);

    const throttleFactor = thermal.getThrottleFactor(overheatingRack);
    assert.ok(throttleFactor < 1.0, 'Workload must be throttled above 45°C');
  });
});
