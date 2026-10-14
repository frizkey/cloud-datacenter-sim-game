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
import { globalEventBus } from './core/events/EventBus.js';
import { NodeType, FacilityComponentType, IncidentType, IncidentSeverity } from './core/sim/Constants.js';

// Initialize headless deterministic simulation core
const simulationEngine = new SimulationEngine({ eventBus: globalEventBus });

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

const chaosDirector = new ChaosDirector(globalEventBus);

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
  },
  onRestartNode: (nodeId) => {
    const node = simulationEngine.nodes.get(nodeId);
    if (node) {
      node.status = 'HEALTHY';
      node.cpuUtilization = 0.1;
    }
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
    simulationEngine.tick(1 / 60);
    chaosDirector.tick(1 / 60);
    lastTime = now;
  }
  requestAnimationFrame(simLoop);
}

requestAnimationFrame(simLoop);

export { game, simulationEngine, hud };
