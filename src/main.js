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

// Setup starter infrastructure so player immediately sees live traffic
const ingress = simulationEngine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 2, gridY: 4 });
const lb = simulationEngine.addNode({ type: NodeType.LOAD_BALANCER, gridX: 5, gridY: 4 });
const pod = simulationEngine.addNode({ type: NodeType.COMPUTE_POD, gridX: 8, gridY: 3 });
const cache = simulationEngine.addNode({ type: NodeType.CACHE_CLUSTER, gridX: 8, gridY: 5 });
const db = simulationEngine.addNode({ type: NodeType.DATABASE_SQL, gridX: 11, gridY: 4 });

simulationEngine.connectNodes(ingress.id, lb.id);
simulationEngine.connectNodes(lb.id, pod.id);
simulationEngine.connectNodes(lb.id, cache.id);
simulationEngine.connectNodes(pod.id, db.id);

// Add physical data center facility components
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
  onSelectComponent: (componentType) => {
    touchFsm.startDragComponent(componentType);
  },
});

touchFsm.onComponentPlaced = ({ componentType, screenX, screenY }) => {
  const snapped = gridSnapper.snap(screenX, screenY);
  const validation = gridSnapper.validatePlacement(snapped.gridX, snapped.gridY, simulationEngine.nodes);

  if (validation.valid) {
    if (componentType in NodeType) {
      simulationEngine.addNode({
        type: componentType,
        gridX: snapped.gridX,
        gridY: snapped.gridY,
      });
    }
  }
};

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
  onOpen: () => {
    globalMobileLifecycle.registerActiveModal('inspector', inspector);
  },
  onClose: () => {
    globalMobileLifecycle.unregisterActiveModal('inspector');
  },
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
