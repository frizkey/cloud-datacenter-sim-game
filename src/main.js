import Phaser from 'phaser';
import './style.css';
import { TopologyScene } from './scenes/TopologyScene.js';
import { FacilityScene } from './scenes/FacilityScene.js';
import { CockpitHUD } from './ui/CockpitHUD.js';
import { BuildDrawer } from './ui/BuildDrawer.js';
import { MobileTouchFSM } from './ui/MobileTouchFSM.js';
import { GridSnapper } from './render/GridSnapper.js';
import { IncidentBar } from './ui/IncidentBar.js';
import { FTUETutorial } from './ui/FTUETutorial.js';
import { NodeInspector } from './ui/NodeInspector.js';
import { ChaosDirector } from './core/sim/ChaosDirector.js';
import { SimulationEngine } from './core/sim/SimulationEngine.js';
import { GameModeManager } from './core/sim/GameModeManager.js';
import { getLevelConfig } from './core/sim/CampaignLevels.js';
import { globalCareerStorage } from './core/storage/CareerStorage.js';
import { ModeSelectModal } from './ui/modals/ModeSelectModal.js';
import { MissionBriefingModal } from './ui/modals/MissionBriefingModal.js';
import { MissionDebriefingModal } from './ui/modals/MissionDebriefingModal.js';
import { SettingsModal } from './ui/modals/SettingsModal.js';
import { globalAudioManager } from './core/audio/AudioManager.js';
import { globalHapticsManager } from './core/haptics/HapticsManager.js';
import { globalMobileLifecycle } from './core/mobile/MobileLifecycle.js';
import { globalEventBus } from './core/events/EventBus.js';
import { NodeType, FacilityComponentType, IncidentType, IncidentSeverity } from './core/sim/Constants.js';
import { StatePersistence, computeOfflineCatchup } from './storage/StatePersistence.js';
import { TechTree } from './core/sim/TechTree.js';
import { ContractManager } from './core/sim/ContractManager.js';
import { TechTreeModal } from './ui/modals/TechTreeModal.js';
import { ContractModal } from './ui/modals/ContractModal.js';
import { APMDashboardModal } from './ui/modals/APMDashboardModal.js';
import { BlueprintModal } from './ui/modals/BlueprintModal.js';

// Initialize headless deterministic simulation core
const simulationEngine = new SimulationEngine({ eventBus: globalEventBus });
const chaosDirector = new ChaosDirector(globalEventBus);

// Initialize Game Mode Manager
const gameModeManager = new GameModeManager({
  engine: simulationEngine,
  eventBus: globalEventBus,
  careerStorage: globalCareerStorage,
  chaosDirector,
});

// Initialize persistent state manager
export const globalStatePersistence = new StatePersistence();
export const globalTechTree = new TechTree({ eventBus: globalEventBus });
export const globalContractManager = new ContractManager();

function getFullSavePayload() {
  const base = simulationEngine.serializeState();
  base.techTree = globalTechTree.serialize();
  base.contracts = globalContractManager.serialize();
  return base;
}

function setupDefaultStarterNodes() {
  const ingress = simulationEngine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 2, gridY: 4 });
  const lb = simulationEngine.addNode({ type: NodeType.LOAD_BALANCER, gridX: 5, gridY: 4 });
  const pod = simulationEngine.addNode({ type: NodeType.COMPUTE_POD, gridX: 8, gridY: 3 });
  const cache = simulationEngine.addNode({ type: NodeType.CACHE_CLUSTER, gridX: 8, gridY: 5 });
  const db = simulationEngine.addNode({ type: NodeType.DATABASE_SQL, gridX: 11, gridY: 4 });

  simulationEngine.connectNodes(ingress.id, lb.id);
  simulationEngine.connectNodes(lb.id, pod.id);
  simulationEngine.connectNodes(lb.id, cache.id);
  simulationEngine.connectNodes(pod.id, db.id);

  simulationEngine.facilityComponents.set('rack_01', {
    id: 'rack_01',
    type: FacilityComponentType.SERVER_RACK_42U,
    isoX: 3,
    isoY: 3,
    temperatureCelsius: 28.5,
    isPowerActive: true,
    costOpexPerSec: 5000,
  });

  simulationEngine.facilityComponents.set('chiller_01', {
    id: 'chiller_01',
    type: FacilityComponentType.CRAC_CHILLER,
    isoX: 1,
    isoY: 1,
    temperatureCelsius: 18.0,
    isPowerActive: true,
    costOpexPerSec: 60000,
  });
}

// Bootstrap game state: restore from storage if present, otherwise populate starter nodes
async function bootstrapGameState() {
  try {
    const saved = await globalStatePersistence.load();
    if (saved && saved.nodes && saved.nodes.length > 0) {
      console.log('[Main] Restoring saved datacenter state from storage...');
      const catchup = computeOfflineCatchup(saved);
      simulationEngine.deserializeState(saved);
      if (saved.techTree) {
        globalTechTree.deserialize(saved.techTree);
      }
      if (saved.contracts) {
        globalContractManager.deserialize(saved.contracts);
      }
      if (catchup.offlineCashDelta !== 0) {
        simulationEngine.economicEngine.addCash(catchup.offlineCashDelta);
        console.log(`[Main] Offline catch-up (${catchup.offlineSeconds}s): $${(catchup.offlineCashDelta / 100000000).toFixed(2)}`);
      }
      return;
    }
  } catch (err) {
    console.warn('[Main] State restoration failed, falling back to starter nodes:', err);
  }
  setupDefaultStarterNodes();
}

bootstrapGameState();

// Periodic auto-save every 30 seconds
setInterval(async () => {
  try {
    await globalStatePersistence.save(getFullSavePayload());
  } catch (err) {
    console.warn('[Main] Auto-save error:', err);
  }
}, 30000);

globalEventBus.on('GAME_PAUSED', async () => {
  try {
    await globalStatePersistence.save(getFullSavePayload());
  } catch (e) {
    console.warn('[Main] Pause save error:', e);
  }
});

globalEventBus.on('MOBILE_BACKGROUNDED', async () => {
  try {
    await globalStatePersistence.save(getFullSavePayload());
  } catch (e) {
    console.warn('[Main] Background save error:', e);
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      globalStatePersistence.save(getFullSavePayload());
    } catch (e) {}
  });
}

// Start initial session in active sandbox state
gameModeManager.mode = 'SANDBOX';
gameModeManager.sessionState = 'ACTIVE';

// Configure Phaser 4 dual-perspective game scenes
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0b0f19',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TopologyScene, FacilityScene],
};

const game = new Phaser.Game(config);

// Connect Mobile Lifecycle to game mode manager and storage
globalMobileLifecycle.gameModeManager = gameModeManager;
globalMobileLifecycle.storage = globalCareerStorage;

// Mount Settings Modal
const settingsModal = new SettingsModal({
  onClose: () => {
    globalMobileLifecycle.unregisterActiveModal('settings');
  },
});

// Mount Modals
const modeSelectModal = new ModeSelectModal({
  onSelectLevel: (lvlNum) => {
    const levelConfig = getLevelConfig(lvlNum);
    if (levelConfig) {
      briefingModal.show(levelConfig);
      globalMobileLifecycle.registerActiveModal('briefing', briefingModal);
    }
  },
  onStartSurvival: () => {
    gameModeManager.startSurvivalMode();
    globalMobileLifecycle.unregisterActiveModal('modes');
  },
  onStartSandbox: () => {
    gameModeManager.startSandboxMode();
    globalMobileLifecycle.unregisterActiveModal('modes');
  },
  careerStorage: globalCareerStorage,
});

const briefingModal = new MissionBriefingModal({
  onDeploy: (levelConfig) => {
    gameModeManager.loadLevel(levelConfig.levelNumber);
    gameModeManager.startSession();
    globalMobileLifecycle.unregisterActiveModal('briefing');
  },
  onBack: () => {
    modeSelectModal.show();
    globalMobileLifecycle.registerActiveModal('modes', modeSelectModal);
  },
});

const debriefingModal = new MissionDebriefingModal({
  onNextLevel: (nextLevelNum) => {
    const levelConfig = getLevelConfig(nextLevelNum);
    if (levelConfig) {
      briefingModal.show(levelConfig);
      globalMobileLifecycle.registerActiveModal('briefing', briefingModal);
    } else {
      modeSelectModal.show();
      globalMobileLifecycle.registerActiveModal('modes', modeSelectModal);
    }
  },
  onRetryLevel: (lvlNum) => {
    const levelConfig = getLevelConfig(lvlNum);
    if (levelConfig) {
      briefingModal.show(levelConfig);
      globalMobileLifecycle.registerActiveModal('briefing', briefingModal);
    } else {
      modeSelectModal.show();
      globalMobileLifecycle.registerActiveModal('modes', modeSelectModal);
    }
  },
  onLevelSelect: () => {
    modeSelectModal.show();
    globalMobileLifecycle.registerActiveModal('modes', modeSelectModal);
  },
});

// Wire game mode victory/defeat events to debriefing modal
globalEventBus.on('LEVEL_VICTORY', (evt) => {
  debriefingModal.show({
    isVictory: true,
    levelNumber: evt.payload.levelNumber,
    starsEarned: evt.payload.starsEarned,
    slaPercent: evt.payload.slaPercent,
    finalCashMicroCents: evt.payload.finalCashMicroCents,
  });
  globalMobileLifecycle.registerActiveModal('debriefing', debriefingModal);
});

globalEventBus.on('LEVEL_DEFEAT', (evt) => {
  debriefingModal.show({
    isVictory: false,
    levelNumber: evt.payload.levelNumber,
    reason: evt.payload.reason,
    elapsedSec: Math.floor(evt.payload.elapsedSec || 0),
    slaPercent: simulationEngine.economicEngine.slaReputationPercent,
  });
  globalMobileLifecycle.registerActiveModal('debriefing', debriefingModal);
});

globalEventBus.on('SURVIVAL_GAME_OVER', (evt) => {
  debriefingModal.show({
    isVictory: false,
    levelNumber: 0,
    failureReason: `Survival run concluded after ${evt.payload.survivalTimeSec}s (${evt.payload.requestsProcessed} requests served)`,
    elapsedSec: evt.payload.survivalTimeSec,
    slaPercent: simulationEngine.economicEngine.slaReputationPercent,
  });
  globalMobileLifecycle.registerActiveModal('debriefing', debriefingModal);
});

// Modals for Tech Tree, Client Contracts, and APM Observability
const techTreeModal = new TechTreeModal({
  techTree: globalTechTree,
  engine: simulationEngine,
});

const contractModal = new ContractModal({
  contractManager: globalContractManager,
  engine: simulationEngine,
});

const apmModal = new APMDashboardModal({
  trafficEngine: simulationEngine.trafficEngine,
  chaosDirector,
  engine: simulationEngine,
});

const blueprintModal = new BlueprintModal({
  engine: simulationEngine,
  persistence: globalStatePersistence,
  onLoadState: (savedState) => {
    simulationEngine.deserializeState(savedState);
  },
  onClose: () => {
    globalMobileLifecycle.unregisterActiveModal('blueprints');
  },
});

// Mount CockpitHUD mobile navigation bar
const hud = new CockpitHUD({
  onViewChange: (viewName) => {
    if (viewName === 'Topology') {
      game.scene.sleep('FacilityScene');
      game.scene.wake('TopologyScene');
    } else if (viewName === 'Facility') {
      game.scene.sleep('TopologyScene');
      if (game.scene.isSleeping('FacilityScene')) {
        game.scene.wake('FacilityScene');
      } else {
        game.scene.start('FacilityScene');
      }
    }
    globalAudioManager.startAmbientHum();
  },
  onOpenApm: () => {
    apmModal.show();
    globalMobileLifecycle.registerActiveModal('apm', apmModal);
  },
  onOpenResearch: () => {
    techTreeModal.show();
    globalMobileLifecycle.registerActiveModal('techTree', techTreeModal);
  },
  onOpenContracts: () => {
    contractModal.show();
    globalMobileLifecycle.registerActiveModal('contracts', contractModal);
  },
  onOpenBlueprints: () => {
    blueprintModal.show();
    globalMobileLifecycle.registerActiveModal('blueprints', blueprintModal);
  },
  onOpenModes: () => {
    modeSelectModal.show();
    globalMobileLifecycle.registerActiveModal('modes', modeSelectModal);
  },
  onOpenSettings: () => {
    settingsModal.show();
    globalMobileLifecycle.registerActiveModal('settings', settingsModal);
  },
});

const gridSnapper = new GridSnapper({ tileSize: 80 });
const touchFsm = new MobileTouchFSM();

// Mount BuildDrawer bottom tray
const drawer = new BuildDrawer({
  techTree: globalTechTree,
  onSelectComponent: (componentType) => {
    touchFsm.startDragComponent(componentType);
  },
});

// Periodic contract SLA evaluation loop (every 1 second)
setInterval(() => {
  if (simulationEngine.isPaused) return;
  const snapshot = simulationEngine.getSnapshot();
  const activeTypes = Array.from(simulationEngine.nodes.values()).map((n) => n.type);
  const telemetry = {
    currentRps: snapshot.throughputRps || 0,
    avgLatencyMs: snapshot.latencyMs || 50,
    currentSlaPercent: snapshot.slaReputationPercent || 100,
    activeComponentTypes: activeTypes,
  };
  const delta = globalContractManager.evaluate(1.0, telemetry);
  if (delta.revenueDeltaMicroCents > 0) {
    simulationEngine.economicEngine.addCash(delta.revenueDeltaMicroCents);
  }
  if (delta.penaltyDeltaMicroCents > 0) {
    simulationEngine.economicEngine.deductCash(delta.penaltyDeltaMicroCents);
    globalAudioManager.playSfx('PACKET_DROP');
  }
}, 1000);

// Wire global component placement
globalEventBus.on('PLACE_COMPONENT', (evt) => {
  const { type, gridX, gridY } = evt.payload || evt;
  if (type in NodeType) {
    const node = simulationEngine.addNode({
      type,
      gridX,
      gridY,
    });
    simulationEngine.autoConnectNode(node);
    globalAudioManager.playNodeClick();
    globalHapticsManager.lightTap();
  } else if (type in FacilityComponentType) {
    simulationEngine.addFacilityComponent({
      type,
      isoX: gridX,
      isoY: gridY,
    });
    globalAudioManager.playNodeClick();
    globalHapticsManager.lightTap();
  }
});

touchFsm.onComponentPlaced = ({ componentType, screenX, screenY }) => {
  if (game.scene.isActive('TopologyScene')) {
    const topoScene = game.scene.getScene('TopologyScene');
    const worldPoint = topoScene.cameras.main.getWorldPoint(screenX, screenY);
    topoScene.tryPlaceNodeAt(componentType, worldPoint.x, worldPoint.y);
  }
};

touchFsm.onWireCompleted = (sourceId, targetId) => {
  if (sourceId && targetId && sourceId !== targetId) {
    const conn = simulationEngine.connectNodes(sourceId, targetId);
    if (conn) {
      globalAudioManager.playNodeClick();
      globalHapticsManager.lightTap();
    }
  }
};

globalEventBus.on('CONNECT_NODES', (evt) => {
  const { sourceNodeId, targetNodeId } = evt.payload || evt;
  if (sourceNodeId && targetNodeId) {
    const conn = simulationEngine.connectNodes(sourceNodeId, targetNodeId);
    if (conn) {
      globalAudioManager.playNodeClick();
      globalHapticsManager.lightTap();
    }
  }
});

// Mount IncidentBar triage banner
const incidentBar = new IncidentBar({
  onRecenter: (targetComponentId) => {
    const node = simulationEngine.nodes.get(targetComponentId);
    if (node && game.scene.isActive('TopologyScene')) {
      const topoScene = game.scene.getScene('TopologyScene');
      topoScene.cameras.main.pan(node.gridX * 80, node.gridY * 80, 400);
    }
  },
  onRemediate: (incidentId, action) => {
    const success = chaosDirector.resolveIncident(incidentId, action);
    if (success) {
      simulationEngine.economicEngine.addCash(10_000_000); // $10 bonus reward
    }
  },
});

// Mount NodeInspector contextual inspector sheet
const inspector = new NodeInspector({
  onSellNode: (nodeId) => {
    simulationEngine.removeNode(nodeId);
    globalMobileLifecycle.unregisterActiveModal('inspector');
  },
  onRestartNode: (nodeId) => {
    const node = simulationEngine.nodes.get(nodeId);
    if (node) {
      node.status = 'HEALTHY';
      node.cpuUtilization = 0.1;
    }
    globalMobileLifecycle.unregisterActiveModal('inspector');
  },
  onDisconnectLink: (connId) => {
    simulationEngine.disconnectNodes(connId);
  },
  onOpen: () => {
    globalMobileLifecycle.registerActiveModal('inspector', inspector);
  },
  onClose: () => {
    globalMobileLifecycle.unregisterActiveModal('inspector');
  },
});

// Wire link disconnection event
globalEventBus.on('DISCONNECT_CONNECTION', (evt) => {
  const { connectionId } = evt.payload || evt;
  if (connectionId) {
    simulationEngine.disconnectNodes(connectionId);
    globalAudioManager.playNodeClick();
    globalHapticsManager.lightTap();
  }
});

// Wire radial context menu & node management actions
globalEventBus.on('NODE_RESTART', (evt) => {
  const nodeId = evt.payload?.nodeId || evt?.nodeId;
  const node = simulationEngine.nodes.get(nodeId);
  if (node) {
    node.status = 'HEALTHY';
    node.cpuUtilization = 0.1;
    globalAudioManager.playNodeClick();
    globalHapticsManager.lightTap();
  }
});

globalEventBus.on('SCALE_NODE', (evt) => {
  const nodeId = evt.payload?.nodeId || evt?.nodeId;
  const node = simulationEngine.nodes.get(nodeId);
  if (node) {
    const factor = evt.payload?.scaleFactor || evt?.scaleFactor || 1.25;
    node.capacityRps = Math.round((node.capacityRps || 500) * factor);
    globalAudioManager.playNodeClick();
    globalHapticsManager.lightTap();
  }
});

globalEventBus.on('SELL_NODE', (evt) => {
  const nodeId = evt.payload?.nodeId || evt?.nodeId;
  if (nodeId) {
    simulationEngine.removeNode(nodeId);
    globalAudioManager.playCableCut();
    globalHapticsManager.lightTap();
  }
});

// Mount 30-Second Guided FTUE Tutorial
const ftue = new FTUETutorial();

// Start simulation loop at fixed 60 ticks/s
let lastTime = performance.now();
const tickIntervalMs = 1000 / 60; // 16.666 ms

function simLoop(now) {
  const elapsed = now - lastTime;
  if (elapsed >= tickIntervalMs) {
    gameModeManager.tick(1 / 60);
    chaosDirector.tick(1 / 60);
    lastTime = now;
  }
  requestAnimationFrame(simLoop);
}

requestAnimationFrame(simLoop);

// Register Offline Service Worker for 100% offline flight mode (T058)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });

  // Offline / Online status toast indicators
  window.addEventListener('offline', () => {
    const toast = document.createElement('div');
    toast.className = 'offline-toast';
    toast.style.cssText = `
      position: fixed;
      top: 54px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(239, 68, 68, 0.9);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10000;
      pointer-events: none;
      backdrop-filter: blur(8px);
    `;
    toast.textContent = '✈️ Offline Flight Mode (100% Local Sim)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  });

  window.addEventListener('online', () => {
    const toast = document.createElement('div');
    toast.className = 'online-toast';
    toast.style.cssText = `
      position: fixed;
      top: 54px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(16, 185, 129, 0.9);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      z-index: 10000;
      pointer-events: none;
      backdrop-filter: blur(8px);
    `;
    toast.textContent = '🌐 Back Online';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });
}

export {
  game,
  simulationEngine,
  gameModeManager,
  hud,
  inspector,
  globalAudioManager,
  globalHapticsManager,
  globalMobileLifecycle,
  settingsModal,
};

