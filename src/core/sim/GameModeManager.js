/**
 * GameModeManager.js - State machine orchestrating Career Campaign, Survival, and Sandbox
 * Evaluates real-time objectives, schedules scripted chaos incidents, and handles 3-star scorecards.
 * Pure JS, zero DOM/Phaser coupling.
 */

import { CAMPAIGN_LEVELS, getLevelConfig } from './CampaignLevels.js';
import { SurvivalMode } from './SurvivalMode.js';
import { ChaosDirector } from './ChaosDirector.js';
import { CareerStorage, globalCareerStorage } from '../storage/CareerStorage.js';
import { EngineEventTypes, globalEventBus } from '../events/EventBus.js';
import { COMPONENT_CATALOG, FacilityComponentType } from './Constants.js';

export class GameModeManager {
  /**
   * @param {Object} options
   * @param {import('./SimulationEngine.js').SimulationEngine} options.engine
   * @param {import('../events/EventBus.js').EventBus} [options.eventBus]
   * @param {CareerStorage} [options.careerStorage]
   * @param {ChaosDirector} [options.chaosDirector]
   */
  constructor(options = {}) {
    if (!options.engine) {
      throw new Error('[GameModeManager] requires an active SimulationEngine instance');
    }

    this.engine = options.engine;
    this.eventBus = options.eventBus || globalEventBus;
    this.careerStorage = options.careerStorage || globalCareerStorage;
    this.chaosDirector = options.chaosDirector || new ChaosDirector(this.eventBus);
    this.survivalMode = new SurvivalMode();

    this.mode = 'CAMPAIGN'; // 'CAMPAIGN' | 'SURVIVAL' | 'SANDBOX'
    this.sessionState = 'IDLE'; // 'IDLE' | 'BRIEFING' | 'ACTIVE' | 'PAUSED' | 'VICTORY' | 'DEFEAT'
    this.currentLevelNumber = 1;
    this.currentLevelConfig = null;

    this.elapsedSec = 0;
    this.pendingIncidents = [];
    this.lastStarsEarned = 0;
    this.failureReason = null;
    this._lastEmittedObjectiveSec = -1;
  }

  /**
   * Load and prepare a campaign level
   * @param {number} levelNumber
   * @returns {boolean}
   */
  loadLevel(levelNumber) {
    const config = getLevelConfig(levelNumber);
    if (!config) {
      console.error(`[GameModeManager] Level ${levelNumber} configuration not found`);
      return false;
    }

    this.mode = 'CAMPAIGN';
    this.currentLevelNumber = levelNumber;
    this.currentLevelConfig = config;
    this.elapsedSec = 0;
    this.lastStarsEarned = 0;
    this.failureReason = null;
    this.sessionState = 'BRIEFING';
    this._lastEmittedObjectiveSec = -1;

    // Reset engine topologies and balance
    this.engine.nodes.clear();
    this.engine.connections.clear();
    this.engine.facilityComponents.clear();
    this.engine.activeIncidents.clear();
    this.chaosDirector.activeIncidents.clear();

    // Reset economic state with starting cash
    this.engine.economicEngine.cashMicroCents = config.startingCashMicroCents;
    this.engine.economicEngine.slaReputationPercent = 100.0;
    this.engine.economicEngine.totalProcessedRequests = 0;
    this.engine.economicEngine.totalDroppedRequests = 0;
    this.engine.economicEngine.isBankrupt = false;
    this.engine.economicEngine.insolvencySecondsRemaining = 30.0;

    // Populate starter nodes
    if (Array.isArray(config.starterNodes)) {
      for (const nodeConfig of config.starterNodes) {
        const catalogItem = COMPONENT_CATALOG[nodeConfig.type] || {};
        const node = {
          id: nodeConfig.id,
          type: nodeConfig.type,
          name: nodeConfig.name || catalogItem.name || nodeConfig.type,
          gridX: nodeConfig.gridX ?? 0,
          gridY: nodeConfig.gridY ?? 0,
          costBuy: catalogItem.costBuy || 0,
          costOpexPerSec: catalogItem.costOpexPerSec || 0,
          capacityRps: catalogItem.capacityRps || 500,
          baseLatencyMs: catalogItem.baseLatencyMs || 5,
          currentRps: 0,
          cpuUtilization: 0.1,
          status: 'HEALTHY',
          thermalWatts: catalogItem.thermalWatts || 100,
          colorHex: catalogItem.colorHex || 0x3b82f6,
        };
        this.engine.nodes.set(node.id, node);
      }
    }

    // Populate starter connections
    if (Array.isArray(config.starterConnections)) {
      for (const connConfig of config.starterConnections) {
        this.engine.connectNodes(connConfig.sourceId, connConfig.targetId);
      }
    }

    // Populate starter facilities
    if (Array.isArray(config.starterFacilities)) {
      for (const facConfig of config.starterFacilities) {
        this.engine.facilityComponents.set(facConfig.id, {
          id: facConfig.id,
          type: facConfig.type,
          gridX: facConfig.gridX,
          gridY: facConfig.gridY,
          costOpexPerSec: 0.05,
          temperatureCelsius: 22.0,
          powerWatts: 1500,
          status: 'HEALTHY',
        });
      }
    }

    // Restore starting cash and recalculate OPEX
    this.engine.economicEngine.cashMicroCents = config.startingCashMicroCents;
    this.engine.recalculateTotalOpex();

    // Prepare scripted incidents queue
    this.pendingIncidents = config.scriptedIncidents.map((inc) => ({ ...inc }));

    this.eventBus.emit('LEVEL_LOADED', {
      levelNumber,
      title: config.title,
      durationSec: config.durationSec,
      startingCashMicroCents: config.startingCashMicroCents,
      lore: config.lore,
      objectives: config.objectives,
    });

    return true;
  }

  /**
   * Start or resume active simulation
   */
  startSession() {
    this.sessionState = 'ACTIVE';
  }

  /**
   * Pause active simulation
   */
  pauseSession() {
    if (this.sessionState === 'ACTIVE') {
      this.sessionState = 'PAUSED';
    }
  }

  /**
   * Resume paused simulation
   */
  resumeSession() {
    if (this.sessionState === 'PAUSED') {
      this.sessionState = 'ACTIVE';
    }
  }

  /**
   * Switch to Endless Survival Mode
   */
  startSurvivalMode() {
    this.mode = 'SURVIVAL';
    this.currentLevelNumber = null;
    this.currentLevelConfig = null;
    this.elapsedSec = 0;
    this.survivalMode.reset();
    this.failureReason = null;
    this.sessionState = 'ACTIVE';

    this.eventBus.emit('GAME_MODE_CHANGED', { mode: 'SURVIVAL' });
  }

  /**
   * Record end of Survival run
   * @param {number} survivalTimeSec
   * @param {number} requestsProcessed
   */
  triggerSurvivalGameOver(survivalTimeSec, requestsProcessed = 0) {
    this.sessionState = 'DEFEAT';
    this.failureReason = 'Survival Collapse';
    const { isNewHighScore } = this.careerStorage.recordSurvivalResult(survivalTimeSec, requestsProcessed);

    this.eventBus.emit('SURVIVAL_GAME_OVER', {
      survivalTimeSec,
      requestsProcessed,
      isNewHighScore,
    });
  }

  /**
   * Switch to Chaos Lab Sandbox Mode
   */
  startSandboxMode() {
    this.mode = 'SANDBOX';
    this.currentLevelNumber = null;
    this.currentLevelConfig = null;
    this.elapsedSec = 0;
    this.failureReason = null;
    this.sessionState = 'ACTIVE';

    // Set virtually infinite funds ($1,000,000 = 1,000,000,000,000 microcents)
    this.engine.economicEngine.cashMicroCents = 1000000000000;
    this.engine.economicEngine.isBankrupt = false;
    this.engine.economicEngine.insolvencySecondsRemaining = 999999;

    this.eventBus.emit('GAME_MODE_CHANGED', { mode: 'SANDBOX' });
  }

  /**
   * Manual chaos injection for Sandbox Mode
   * @param {string} incidentType
   * @param {string} [targetComponentId]
   */
  injectSandboxIncident(incidentType, targetComponentId) {
    const targetId = targetComponentId || Array.from(this.engine.nodes.keys())[0] || 'node_01';
    return this.chaosDirector.triggerIncident({
      type: incidentType,
      targetComponentId: targetId,
      title: incidentType,
      description: `Manual Chaos Lab injection: ${incidentType}`,
    });
  }

  /**
   * Main simulation tick hook called from game loop
   * @param {number} [deltaSec=1/60]
   */
  tick(deltaSec = 1 / 60) {
    if (this.sessionState !== 'ACTIVE') {
      return;
    }

    // 1. Advance underlying simulation engine
    this.engine.tick(deltaSec);
    this.elapsedSec += deltaSec;

    // 2. Mode-specific logic
    if (this.mode === 'CAMPAIGN' && this.currentLevelConfig) {
      this._tickCampaign(deltaSec);
    } else if (this.mode === 'SURVIVAL') {
      this._tickSurvival(deltaSec);
    } else if (this.mode === 'SANDBOX') {
      this._tickSandbox(deltaSec);
    }

    // 3. Emit periodic objective state snapshot (every second)
    const currentWholeSec = Math.floor(this.elapsedSec);
    if (currentWholeSec > this._lastEmittedObjectiveSec) {
      this._lastEmittedObjectiveSec = currentWholeSec;
      this.eventBus.emit('OBJECTIVE_TICK', this.getObjectiveState());
    }
  }

  /**
   * Tick handler for Story Campaign mode
   * @private
   */
  _tickCampaign(deltaSec) {
    const config = this.currentLevelConfig;

    // A. Evaluate scripted incidents
    for (let i = this.pendingIncidents.length - 1; i >= 0; i--) {
      const inc = this.pendingIncidents[i];
      if (this.elapsedSec >= inc.triggerAtSec) {
        // If target node is compute pod or server, update status first
        if (this.engine.nodes.has(inc.targetComponentId)) {
          const node = this.engine.nodes.get(inc.targetComponentId);
          node.status = 'CRITICAL';
          node.cpuUtilization = 1.0;
        }

        // Trigger the incident
        const triggered = this.chaosDirector.triggerIncident({
          type: inc.incidentType,
          targetComponentId: inc.targetComponentId,
          title: inc.title || inc.incidentType,
          description: inc.description || 'Scripted scenario incident',
          requiredRemediation: inc.requiredRemediation,
        });

        this.pendingIncidents.splice(i, 1);
      }
    }

    // B. Check Defeat Conditions
    if (this.engine.economicEngine.isBankrupt) {
      this.sessionState = 'DEFEAT';
      this.failureReason = 'Financial Insolvency (Bankrupt)';
      this.eventBus.emit('LEVEL_DEFEAT', {
        levelNumber: this.currentLevelNumber,
        reason: this.failureReason,
        elapsedSec: this.elapsedSec,
      });
      return;
    }

    if (this.engine.economicEngine.slaReputationPercent < 80.0) {
      this.sessionState = 'DEFEAT';
      this.failureReason = 'Reputation Catastrophe (SLA < 80%)';
      this.eventBus.emit('LEVEL_DEFEAT', {
        levelNumber: this.currentLevelNumber,
        reason: this.failureReason,
        elapsedSec: this.elapsedSec,
      });
      return;
    }

    // C. Check Victory Conditions
    if (this.elapsedSec >= config.durationSec) {
      const finalSla = this.engine.economicEngine.slaReputationPercent;
      const minSla = config.objectives.minSlaPercent || 99.0;

      if (finalSla >= minSla) {
        // Calculate 3-star scorecard
        let stars = 1; // 1 star for duration & base SLA
        if (finalSla >= 99.5) {
          stars++; // 2nd star for SRE excellence
        }
        if (this.engine.economicEngine.cashMicroCents >= config.objectives.targetCashBonusMicroCents) {
          stars++; // 3rd star for budget master
        }

        this.lastStarsEarned = stars;
        this.sessionState = 'VICTORY';

        // Persist progress
        this.careerStorage.recordLevelResult(
          this.currentLevelNumber,
          stars,
          this.engine.economicEngine.cashMicroCents
        );

        this.eventBus.emit('LEVEL_VICTORY', {
          levelNumber: this.currentLevelNumber,
          starsEarned: stars,
          slaPercent: finalSla,
          finalCashMicroCents: this.engine.economicEngine.cashMicroCents,
          unlockedNextLevel: this.currentLevelNumber < 5,
        });
      } else {
        this.sessionState = 'DEFEAT';
        this.failureReason = `Failed to meet minimum SLA threshold (${finalSla.toFixed(1)}% < ${minSla}%)`;
        this.eventBus.emit('LEVEL_DEFEAT', {
          levelNumber: this.currentLevelNumber,
          reason: this.failureReason,
          elapsedSec: this.elapsedSec,
        });
      }
    }
  }

  /**
   * Tick handler for Endless Survival mode
   * @private
   */
  _tickSurvival(deltaSec) {
    // Dynamic traffic wave adjustment
    const targetRps = this.survivalMode.getCurrentTargetRps(this.elapsedSec);
    this.engine.trafficEngine.baseRps = targetRps;

    // Stochastic chaos injection check
    const incidentToSpawn = this.survivalMode.checkIncidentSpawn(this.elapsedSec);
    if (incidentToSpawn) {
      const targetId = Array.from(this.engine.nodes.keys())[0] || 'node_01';
      this.chaosDirector.triggerIncident({
        ...incidentToSpawn,
        targetComponentId: targetId,
      });
    }

    // Insolvency or total failure
    if (this.engine.economicEngine.isBankrupt || this.engine.economicEngine.slaReputationPercent < 70.0) {
      this.triggerSurvivalGameOver(
        Math.floor(this.elapsedSec),
        this.engine.economicEngine.totalProcessedRequests
      );
    }
  }

  /**
   * Tick handler for Sandbox mode
   * @private
   */
  _tickSandbox(deltaSec) {
    // Keep funds virtually unlimited
    if (this.engine.economicEngine.cashMicroCents < 1000000000000) {
      this.engine.economicEngine.cashMicroCents = 1000000000000;
    }
  }

  /**
   * Query real-time objective and session state
   * @returns {Object}
   */
  getObjectiveState() {
    return {
      levelNumber: this.currentLevelNumber,
      mode: this.mode,
      sessionState: this.sessionState,
      elapsedSec: Math.floor(this.elapsedSec),
      durationSec: this.currentLevelConfig?.durationSec || 0,
      currentSlaPercent: this.engine.economicEngine.slaReputationPercent,
      currentCashMicroCents: this.engine.economicEngine.cashMicroCents,
      cumulativeRequests: this.engine.economicEngine.totalProcessedRequests,
      targetCashBonusMicroCents: this.currentLevelConfig?.objectives?.targetCashBonusMicroCents || 0,
      pendingIncidentsCount: this.pendingIncidents.length,
      activeIncidentsCount: this.chaosDirector.activeIncidents.size,
      starsEarned: this.lastStarsEarned,
      failureReason: this.failureReason,
    };
  }
}
