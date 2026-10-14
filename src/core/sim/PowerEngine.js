/**
 * PowerEngine.js - Manages electrical grid power, UPS battery discharge, and emergency diesel generators
 * Pure JS, zero DOM/Phaser coupling.
 */

import { FacilityComponentType } from './Constants.js';

export class PowerEngine {
  /**
   * @param {import('../events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isGridBlackout = false;
    this.isFacilityPowered = true;
    this.totalLoadKw = 0;
    this.runtimeSecondsRemaining = 0;
  }

  /**
   * Trigger or recover municipal utility grid blackout
   * @param {boolean} blackout
   */
  setGridBlackout(blackout) {
    this.isGridBlackout = blackout;
    if (blackout && this.eventBus) {
      this.eventBus.emit('POWER_BLACKOUT_ALERT', {
        timestamp: Date.now(),
        message: 'Utility power grid blackout detected! Switching to emergency UPS battery reserves.',
      });
    }
  }

  /**
   * Spin up emergency diesel backup generator
   * @param {string} generatorId
   * @param {Map<string, Object>} components
   */
  startGenerator(generatorId, components) {
    const gen = components.get(generatorId);
    if (!gen || gen.type !== FacilityComponentType.DIESEL_GENERATOR) return;

    if (!gen.isRunning && !gen.isSpoolingUp) {
      gen.isSpoolingUp = true;
      gen.spoolTicksRemaining = gen.spoolTicksRemaining || 180; // 3 seconds at 60 Hz
    }
  }

  /**
   * Step power engine physics tick
   * @param {number} deltaSec
   * @param {Map<string, Object>} components
   */
  tick(deltaSec, components) {
    let totalLoad = 0;
    let generatedKw = 0;
    let totalBatteryChargeKwh = 0;
    let activeUpsCount = 0;

    // 1. Calculate IT and facility electrical load
    for (const comp of components.values()) {
      if (comp.type === FacilityComponentType.SERVER_RACK_42U) {
        totalLoad += comp.powerKw || 1.0;
      } else if (comp.type === FacilityComponentType.CRAC_CHILLER) {
        totalLoad += comp.powerKw || 4.5;
      } else if (comp.type === FacilityComponentType.PDU_3PHASE) {
        totalLoad += comp.powerKw || 0.2;
      } else if (comp.type === FacilityComponentType.UPS_BATTERY) {
        totalBatteryChargeKwh += Math.max(0, comp.currentChargeKwh || 0);
        activeUpsCount++;
      } else if (comp.type === FacilityComponentType.DIESEL_GENERATOR) {
        // Handle generator spool-up and power output
        if (comp.isSpoolingUp) {
          comp.spoolTicksRemaining = Math.max(0, (comp.spoolTicksRemaining || 180) - 1);
          if (comp.spoolTicksRemaining === 0) {
            comp.isSpoolingUp = false;
            comp.isRunning = true;
          }
        }

        if (comp.isRunning && (comp.fuelLiters || 0) > 0) {
          generatedKw += comp.outputPowerKw || 150;
          const burnRate = comp.fuelBurnRatePerSec || 0.05;
          comp.fuelLiters = Math.max(0, comp.fuelLiters - burnRate * deltaSec);
          if (comp.fuelLiters === 0) {
            comp.isRunning = false; // Out of fuel
          }
        }
      }
    }

    this.totalLoadKw = Math.round(totalLoad * 100) / 100;

    // 2. Power balance check
    if (!this.isGridBlackout) {
      this.isFacilityPowered = true;
      this.runtimeSecondsRemaining = Infinity;
      return;
    }

    // Grid blackout is active
    const uncoveredLoad = Math.max(0, totalLoad - generatedKw);

    if (uncoveredLoad <= 0) {
      // Generators are covering 100% of the load
      this.isFacilityPowered = true;
      this.runtimeSecondsRemaining = Infinity;
      return;
    }

    // Uncovered load must drain UPS batteries
    if (activeUpsCount > 0 && totalBatteryChargeKwh > 0) {
      const totalDrainKwh = (uncoveredLoad * deltaSec) / 3600;
      const drainPerUps = totalDrainKwh / activeUpsCount;

      let remainingTotalCharge = 0;
      for (const comp of components.values()) {
        if (comp.type === FacilityComponentType.UPS_BATTERY) {
          comp.currentChargeKwh = Math.max(0, (comp.currentChargeKwh || 0) - drainPerUps);
          remainingTotalCharge += comp.currentChargeKwh;
        }
      }

      this.runtimeSecondsRemaining = Math.round((remainingTotalCharge / uncoveredLoad) * 3600 * 0.95);

      if (remainingTotalCharge <= 0.0001) {
        this.triggerShutdown();
      } else {
        this.isFacilityPowered = true;
      }
    } else {
      this.triggerShutdown();
    }
  }

  triggerShutdown() {
    this.isFacilityPowered = false;
    this.runtimeSecondsRemaining = 0;
    if (this.eventBus) {
      this.eventBus.emit('FACILITY_POWER_SHUTDOWN', {
        timestamp: Date.now(),
        reason: 'TOTAL_BATTERY_DEPLETION',
      });
    }
  }

  reset() {
    this.isGridBlackout = false;
    this.isFacilityPowered = true;
    this.totalLoadKw = 0;
    this.runtimeSecondsRemaining = 0;
  }
}
