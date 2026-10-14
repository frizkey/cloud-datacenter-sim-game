/**
 * SurvivalMode.js - Endless Survival Mode wave scaling and dynamic chaos scheduler
 * Traffic increases by 1.5x every 120 seconds with escalating incident spawn rates.
 * Pure JS, zero DOM/Phaser coupling.
 */

import { IncidentType, IncidentSeverity } from './Constants.js';

export class SurvivalMode {
  /**
   * @param {Object} [options]
   * @param {number} [options.baseRps=100]
   */
  constructor(options = {}) {
    this.baseRps = options.baseRps || 100;
    this.lastIncidentSpawnSec = 0;
    this.incidentPool = [
      { type: 'POD_MEMORY_LEAK', title: 'Pod Memory Leak', remediation: 'RESTART_NODE' },
      { type: 'CACHE_STAMPEDE', title: 'Cache Stampede', remediation: 'WARM_CACHE' },
      { type: 'DDOS_FLOOD', title: 'Volumetric DDoS', remediation: 'ENABLE_DDOS_SHIELD' },
      { type: 'SQLI_ATTACK', title: 'SQL Injection Attack', remediation: 'DEPLOY_WAF_RULESET' },
      { type: 'SPLIT_BRAIN', title: 'Database Split-Brain', remediation: 'TRIGGER_RAFT_QUORUM' },
      { type: 'RACK_FIRE', title: 'Rack Thermal Runaway', remediation: 'EMERGENCY_EXHAUST_PURGE' },
      { type: 'GRID_BLACKOUT', title: 'Municipal Power Outage', remediation: 'START_DIESEL_GENERATOR' },
    ];
  }

  /**
   * Calculate target incoming RPS at elapsed simulation time
   * @param {number} elapsedSec
   * @returns {number}
   */
  getCurrentTargetRps(elapsedSec) {
    const waveIndex = Math.floor(elapsedSec / 120);
    const waveMultiplier = Math.pow(1.5, waveIndex);
    const wavePhase = 1 + 0.15 * Math.sin((2 * Math.PI * elapsedSec) / 30);
    return Math.round(this.baseRps * waveMultiplier * wavePhase);
  }

  /**
   * Get the current dynamic incident interval in seconds
   * @param {number} elapsedSec
   * @returns {number}
   */
  getIncidentIntervalSec(elapsedSec) {
    const minutesElapsed = Math.floor(elapsedSec / 60);
    return Math.max(20, 90 - 5 * minutesElapsed);
  }

  /**
   * Check if a new chaotic incident should be spawned on this tick
   * @param {number} elapsedSec
   * @returns {Object|null}
   */
  checkIncidentSpawn(elapsedSec) {
    if (elapsedSec < 30) {
      return null; // Grace period for early setup
    }

    const interval = this.getIncidentIntervalSec(elapsedSec);
    if (elapsedSec - this.lastIncidentSpawnSec >= interval) {
      this.lastIncidentSpawnSec = elapsedSec;

      // Select random incident
      const template = this.incidentPool[Math.floor(Math.random() * this.incidentPool.length)];
      return {
        type: template.type,
        title: template.title,
        severity: elapsedSec > 240 ? IncidentSeverity.TIER_3_HIGH : IncidentSeverity.TIER_2_MEDIUM,
        description: `Survival wave challenge: ${template.title}`,
        requiredRemediation: template.remediation,
      };
    }

    return null;
  }

  /**
   * Reset survival mode tracker
   */
  reset() {
    this.lastIncidentSpawnSec = 0;
  }
}
