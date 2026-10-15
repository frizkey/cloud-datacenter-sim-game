/**
 * CircuitBreaker.js
 * Hardware & Traffic Circuit Protection Switch.
 * Protects electrical distribution and microservice graphs from cascading overloads.
 */

import { globalEventBus } from '../events/EventBus.js';

export const BreakerState = Object.freeze({
  CLOSED: 'CLOSED', // Normal operation: power/traffic flows
  OPEN: 'OPEN', // Tripped: isolated to prevent damage
  HALF_OPEN: 'HALF_OPEN', // Probe mode: testing recovery
});

export class CircuitBreaker {
  constructor(options = {}) {
    this.id = options.id || 'main-breaker';
    this.name = options.name || 'Main PDU Breaker';
    this.maxPowerWatts = options.maxPowerWatts || 50000; // 50kW default rating
    this.tripCooldownSec = options.tripCooldownSec || 10;
    this.consecutiveFailuresThreshold = options.consecutiveFailuresThreshold || 5;

    this.state = BreakerState.CLOSED;
    this.currentLoadWatts = 0;
    this.consecutiveFailures = 0;
    this.timeInOpenSec = 0;
    this.totalTrips = 0;
  }

  /**
   * Evaluates current electrical power load against rated maximum.
   * @param {number} loadWatts Current wattage demanded through breaker
   * @returns {boolean} True if within safe limit, false if tripped
   */
  checkPowerLoad(loadWatts) {
    this.currentLoadWatts = loadWatts;
    if (this.state === BreakerState.CLOSED || this.state === BreakerState.HALF_OPEN) {
      if (loadWatts > this.maxPowerWatts) {
        this.trip(`Power load overload: ${(loadWatts / 1000).toFixed(1)}kW exceeds ${(this.maxPowerWatts / 1000).toFixed(1)}kW rating`);
        return false;
      }
      return true;
    }
    return false; // Already tripped
  }

  /**
   * Checks whether traffic or power is allowed through.
   * @returns {boolean}
   */
  canPass() {
    return this.state === BreakerState.CLOSED || this.state === BreakerState.HALF_OPEN;
  }

  recordSuccess() {
    this.consecutiveFailures = 0;
    if (this.state === BreakerState.HALF_OPEN) {
      this.state = BreakerState.CLOSED;
      this.timeInOpenSec = 0;
      globalEventBus.emit('CIRCUIT_BREAKER_RESET', {
        id: this.id,
        name: this.name,
        state: this.state,
      });
    }
  }

  recordFailure(reason = 'Failure rate exceeded') {
    this.consecutiveFailures++;
    if (this.state === BreakerState.HALF_OPEN || this.consecutiveFailures >= this.consecutiveFailuresThreshold) {
      this.trip(reason);
    }
  }

  trip(reason = 'Overload detected') {
    if (this.state !== BreakerState.OPEN) {
      this.state = BreakerState.OPEN;
      this.timeInOpenSec = 0;
      this.totalTrips++;

      globalEventBus.emit('CIRCUIT_BREAKER_TRIPPED', {
        id: this.id,
        name: this.name,
        reason,
        loadWatts: this.currentLoadWatts,
        maxPowerWatts: this.maxPowerWatts,
      });
    }
  }

  tick(deltaSec) {
    if (this.state === BreakerState.OPEN) {
      this.timeInOpenSec += deltaSec;
      if (this.timeInOpenSec >= this.tripCooldownSec) {
        this.state = BreakerState.HALF_OPEN;
        globalEventBus.emit('CIRCUIT_BREAKER_HALF_OPEN', {
          id: this.id,
          name: this.name,
        });
      }
    }
  }

  manualReset() {
    if (this.currentLoadWatts > this.maxPowerWatts) {
      // Re-trip immediately if underlying physical overload wasn't fixed
      this.trip('Cannot reset breaker: Overload condition still active!');
      return false;
    }
    this.state = BreakerState.CLOSED;
    this.consecutiveFailures = 0;
    this.timeInOpenSec = 0;
    globalEventBus.emit('CIRCUIT_BREAKER_RESET', {
      id: this.id,
      name: this.name,
      state: this.state,
    });
    return true;
  }

  serialize() {
    return {
      id: this.id,
      state: this.state,
      currentLoadWatts: this.currentLoadWatts,
      consecutiveFailures: this.consecutiveFailures,
      timeInOpenSec: this.timeInOpenSec,
      totalTrips: this.totalTrips,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.id = data.id || this.id;
    this.state = data.state || BreakerState.CLOSED;
    this.currentLoadWatts = data.currentLoadWatts || 0;
    this.consecutiveFailures = data.consecutiveFailures || 0;
    this.timeInOpenSec = data.timeInOpenSec || 0;
    this.totalTrips = data.totalTrips || 0;
  }
}
