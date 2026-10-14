/**
 * tests/game-modes.test.js - Unit tests for GameModeManager, Campaign Levels, Survival Mode & Career Persistence
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { EventBus } from '../src/core/events/EventBus.js';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { GameModeManager } from '../src/core/sim/GameModeManager.js';
import { CAMPAIGN_LEVELS, getLevelConfig } from '../src/core/sim/CampaignLevels.js';
import { CareerStorage } from '../src/core/storage/CareerStorage.js';
import { NodeType } from '../src/core/sim/Constants.js';

describe('Phase 3: SRE Career Campaign & Game Modes (US1, US2, US3)', () => {
  let eventBus;
  let engine;
  let careerStorage;
  let manager;

  beforeEach(() => {
    eventBus = new EventBus();
    engine = new SimulationEngine({ eventBus });
    careerStorage = new CareerStorage({ storage: null }); // In-memory
    manager = new GameModeManager({ engine, eventBus, careerStorage });
  });

  test('Campaign Level Configurations: all 5 levels exist and have required schema', () => {
    assert.equal(CAMPAIGN_LEVELS.length, 5);

    for (let i = 1; i <= 5; i++) {
      const config = getLevelConfig(i);
      assert.ok(config, `Level ${i} should be defined`);
      assert.equal(config.levelNumber, i);
      assert.ok(config.title);
      assert.ok(config.lore);
      assert.ok(config.durationSec >= 60);
      assert.ok(config.startingCashMicroCents > 0);
      assert.ok(config.starterNodes.length >= 3);
      assert.ok(config.starterConnections.length >= 2);
      assert.ok(config.objectives.minSlaPercent >= 95.0);
      assert.ok(config.objectives.targetCashBonusMicroCents > 0);
    }
  });

  test('CareerStorage: handles level progression and star achievements correctly', () => {
    const fresh = careerStorage.loadCareer();
    assert.equal(fresh.unlockedLevel, 1);
    assert.equal(fresh.levelStars[1], 0);

    // Unlocks level 2 on earning 1 star
    careerStorage.recordLevelResult(1, 1, 5000000);
    assert.equal(careerStorage.isLevelUnlocked(1), true);
    assert.equal(careerStorage.isLevelUnlocked(2), true);
    assert.equal(careerStorage.isLevelUnlocked(3), false);
    assert.equal(careerStorage.getLevelStars(1), 1);

    // Improving score to 3 stars updates score
    careerStorage.recordLevelResult(1, 3, 10000000);
    assert.equal(careerStorage.getLevelStars(1), 3);

    // Worse score does not overwrite 3 stars
    careerStorage.recordLevelResult(1, 2, 0);
    assert.equal(careerStorage.getLevelStars(1), 3);

    // Resetting clears progress
    careerStorage.resetProgress();
    assert.equal(careerStorage.loadCareer().unlockedLevel, 1);
    assert.equal(careerStorage.getLevelStars(1), 0);
  });

  test('GameModeManager: loads Level 1 with starter topology and initial cash balance', () => {
    let levelLoadedEvent = null;
    eventBus.on('LEVEL_LOADED', (evt) => {
      levelLoadedEvent = evt.payload;
    });

    manager.loadLevel(1);

    assert.equal(manager.mode, 'CAMPAIGN');
    assert.equal(manager.currentLevelNumber, 1);
    assert.equal(manager.sessionState, 'BRIEFING');
    assert.ok(levelLoadedEvent);
    assert.equal(levelLoadedEvent.levelNumber, 1);

    // Verify engine has 3 starter nodes and 2 connections
    assert.equal(engine.nodes.size, 3);
    assert.equal(engine.connections.size, 2);

    // Verify player cash is exactly starting cash ($15.00 = 15,000,000 microcents)
    assert.equal(engine.economicEngine.cashMicroCents, 15000000);
  });

  test('GameModeManager: triggers scripted incident at scheduled second', () => {
    let triggeredIncident = null;
    eventBus.on('INCIDENT_TRIGGERED', (evt) => {
      triggeredIncident = evt.payload.incident;
    });

    manager.loadLevel(1);
    manager.startSession();
    assert.equal(manager.sessionState, 'ACTIVE');

    // Level 1 has POD_MEMORY_LEAK scheduled at t = 30s
    // Simulate 29 seconds (29 * 60 ticks)
    for (let t = 0; t < 29 * 60; t++) {
      manager.tick(1 / 60);
    }
    assert.equal(triggeredIncident, null, 'Incident should not trigger before t=30s');

    // Simulate 2 more seconds (past 30s)
    for (let t = 0; t < 2 * 60; t++) {
      manager.tick(1 / 60);
    }

    assert.ok(triggeredIncident, 'Incident should trigger at t=30s');
    assert.equal(triggeredIncident.targetComponentId, 'node_pod_1');
  });

  test('GameModeManager: awards 3-star victory when all objectives met', () => {
    let victoryEvent = null;
    eventBus.on('LEVEL_VICTORY', (evt) => {
      victoryEvent = evt.payload;
    });

    manager.loadLevel(1);
    manager.startSession();

    // Ensure high SLA and bonus cash
    engine.economicEngine.slaReputationPercent = 99.8;
    engine.economicEngine.cashMicroCents = 25000000; // Above target $20.00
    engine.economicEngine.totalProcessedRequests = 600;

    // Listen for incident and remediate it immediately like an alert SRE
    eventBus.on('INCIDENT_TRIGGERED', (evt) => {
      eventBus.emit('INCIDENT_REMEDIATION_REQUEST', {
        actionType: 'RESTART_NODE',
        targetComponentId: evt.payload.incident.targetComponentId,
      });
      manager.chaosDirector.resolveIncident(evt.payload.incident.id, 'RESTART_NODE');
      engine.economicEngine.slaReputationPercent = 99.8;
    });

    // Advance until level duration (90s)
    for (let t = 0; t < 91 * 60; t++) {
      manager.tick(1 / 60);
      if (manager.sessionState === 'VICTORY') break;
    }

    assert.equal(manager.sessionState, 'VICTORY');
    assert.ok(victoryEvent);
    assert.equal(victoryEvent.levelNumber, 1);
    assert.equal(victoryEvent.starsEarned, 3);
    assert.equal(victoryEvent.unlockedNextLevel, true);
    assert.equal(careerStorage.isLevelUnlocked(2), true);
  });

  test('GameModeManager: handles level defeat when SLA drops below threshold', () => {
    let defeatEvent = null;
    eventBus.on('LEVEL_DEFEAT', (evt) => {
      defeatEvent = evt.payload;
    });

    manager.loadLevel(1);
    manager.startSession();

    // Degrade SLA to 75%
    engine.economicEngine.slaReputationPercent = 75.0;

    manager.tick(1 / 60);

    assert.equal(manager.sessionState, 'DEFEAT');
    assert.ok(defeatEvent);
    assert.equal(defeatEvent.levelNumber, 1);
  });

  test('Endless Survival Mode: scales traffic wave multiplier every 120s and records high score', () => {
    let gameOverEvent = null;
    eventBus.on('SURVIVAL_GAME_OVER', (evt) => {
      gameOverEvent = evt.payload;
    });

    manager.startSurvivalMode();
    assert.equal(manager.mode, 'SURVIVAL');
    assert.equal(manager.sessionState, 'ACTIVE');

    const initialTraffic = manager.survivalMode.getCurrentTargetRps(0);
    assert.ok(initialTraffic >= 80 && initialTraffic <= 120);

    // At t = 120s, multiplier should be 1.5x
    const wave2Traffic = manager.survivalMode.getCurrentTargetRps(120);
    assert.ok(wave2Traffic > initialTraffic * 1.3);

    // At t = 240s, multiplier should be 2.25x
    const wave3Traffic = manager.survivalMode.getCurrentTargetRps(240);
    assert.ok(wave3Traffic > wave2Traffic);

    // Trigger game over
    manager.triggerSurvivalGameOver(185, 2500);
    assert.equal(manager.sessionState, 'DEFEAT');
    assert.ok(gameOverEvent);
    assert.equal(gameOverEvent.survivalTimeSec, 185);
    assert.equal(careerStorage.loadCareer().survivalHighScoreSec, 185);
  });

  test('Chaos Lab Sandbox Mode: provides infinite budget and manual incident injection', () => {
    manager.startSandboxMode();
    assert.equal(manager.mode, 'SANDBOX');
    assert.equal(manager.sessionState, 'ACTIVE');

    // Unlimited cash ($1,000,000)
    assert.equal(engine.economicEngine.cashMicroCents, 1000000000000);

    // Manual incident injection
    let injectedIncident = null;
    eventBus.on('INCIDENT_TRIGGERED', (evt) => {
      injectedIncident = evt.payload.incident;
    });

    manager.injectSandboxIncident('DDOS_FLOOD', 'node_01');
    assert.ok(injectedIncident);
    assert.equal(injectedIncident.type, 'DDOS_FLOOD');
  });
});
