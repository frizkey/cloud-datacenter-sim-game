/**
 * SimulationEngine.js - Main fixed-timestep simulation tick accumulator (60 ticks/s)
 * Integrates TrafficEngine, EconomicEngine, and publishes state snapshots over EventBus.
 * Pure JS, zero DOM/Phaser coupling.
 */

import { COMPONENT_CATALOG, NodeType, SIM_CONSTANTS } from './Constants.js';
import { TrafficEngine } from './TrafficEngine.js';
import { EconomicEngine } from './EconomicEngine.js';
import { ThermalEngine } from './ThermalEngine.js';
import { PowerEngine } from './PowerEngine.js';
import { EngineEventTypes, globalEventBus } from '../events/EventBus.js';

let nodeCounter = 0;
let connCounter = 0;

export class SimulationEngine {
  /**
   * @param {Object} [options]
   * @param {import('../events/EventBus.js').EventBus} [options.eventBus]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || globalEventBus;

    this.nodes = new Map(); // id -> InfrastructureNode
    this.connections = new Map(); // id -> NetworkConnection
    this.facilityComponents = new Map(); // id -> FacilityComponent
    this.activeIncidents = new Map(); // id -> IncidentEvent

    this.trafficEngine = new TrafficEngine(this.eventBus);
    this.economicEngine = new EconomicEngine(this.eventBus);
    this.thermalEngine = new ThermalEngine(this.eventBus);
    this.powerEngine = new PowerEngine(this.eventBus);

    this.simulationTickCount = 0;
    this.timeAccumulator = 0;
    this.fixedDeltaSec = SIM_CONSTANTS.SEC_PER_TICK; // 1/60 sec

    // Wire traffic events to economic balance
    this.eventBus.on(EngineEventTypes.PACKET_PROCESSED, (evt) => {
      this.economicEngine.recordProcessedRequest(1);
    });

    this.eventBus.on(EngineEventTypes.PACKET_DROPPED, (evt) => {
      this.economicEngine.recordDroppedRequest(1);
    });

    // Wire incident remediation actions
    this.eventBus.on('INCIDENT_REMEDIATION_REQUEST', (evt) => {
      this.handleRemediationAction(evt.payload || evt);
    });
  }

  /**
   * Add a new infrastructure node to the logical topology
   * @param {Object} params { type, gridX, gridY, name }
   * @returns {Object} Created node
   */
  addNode(params) {
    const catalogItem = COMPONENT_CATALOG[params.type];
    if (!catalogItem) {
      throw new Error(`Unknown component type: ${params.type}`);
    }

    // Deduct purchase cost
    const buyCost = catalogItem.costBuy || 0;
    if (buyCost > 0) {
      this.economicEngine.deductCash(buyCost);
    }

    nodeCounter++;
    const node = {
      id: params.id || `node_${Date.now()}_${nodeCounter}`,
      type: params.type,
      name: params.name || catalogItem.name,
      gridX: params.gridX ?? 0,
      gridY: params.gridY ?? 0,
      costBuy: buyCost,
      costOpexPerSec: catalogItem.costOpexPerSec || 0,
      capacityRps: catalogItem.capacityRps || 500,
      baseLatencyMs: catalogItem.baseLatencyMs || 5,
      currentRps: 0,
      cpuUtilization: 0.1,
      status: 'HEALTHY',
      thermalWatts: catalogItem.thermalWatts || 100,
      colorHex: catalogItem.colorHex || 0x3b82f6,
    };

    this.nodes.set(node.id, node);
    this.recalculateTotalOpex();

    this.eventBus.emit(EngineEventTypes.NODE_PLACED, { node });
    return node;
  }

  /**
   * Remove an infrastructure node and refund 50% purchase value
   * @param {string} nodeId
   * @returns {boolean}
   */
  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    // Remove all associated connections
    for (const [connId, conn] of this.connections.entries()) {
      if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
        this.connections.delete(connId);
      }
    }

    this.nodes.delete(nodeId);

    // 50% refund on sale
    const refund = Math.floor((node.costBuy || 0) * 0.5);
    if (refund > 0) {
      this.economicEngine.addCash(refund);
    }

    this.recalculateTotalOpex();
    this.eventBus.emit(EngineEventTypes.NODE_REMOVED, { nodeId, refund });
    return true;
  }

  /**
   * Connect two nodes with a directed network link
   * @param {string} sourceNodeId
   * @param {string} targetNodeId
   * @returns {Object|null} NetworkConnection
   */
  connectNodes(sourceNodeId, targetNodeId) {
    if (!this.nodes.has(sourceNodeId) || !this.nodes.has(targetNodeId)) {
      return null;
    }
    if (sourceNodeId === targetNodeId) {
      return null; // No self loops
    }

    // Check if already connected
    for (const conn of this.connections.values()) {
      if (conn.sourceNodeId === sourceNodeId && conn.targetNodeId === targetNodeId) {
        return conn;
      }
    }

    connCounter++;
    const connection = {
      id: `conn_${Date.now()}_${connCounter}`,
      sourceNodeId,
      targetNodeId,
      bandwidthGbps: 10,
      latencyBaseMs: 2,
      currentThroughputBytes: 0,
      isCongested: false,
      droppedPacketsPerSec: 0,
    };

    this.connections.set(connection.id, connection);
    this.eventBus.emit(EngineEventTypes.NODES_CONNECTED, { connection });
    return connection;
  }

  /**
   * Disconnect a network link
   * @param {string} connectionId
   */
  disconnectNodes(connectionId) {
    this.connections.delete(connectionId);
  }

  /**
   * Automatically connect a newly placed node to logical upstream/downstream neighbors
   * @param {Object} node
   * @returns {Array<Object>} Created connections
   */
  autoConnectNode(node) {
    if (!node || !node.id) return [];
    const createdConnections = [];

    const nodesList = Array.from(this.nodes.values()).filter((n) => n.id !== node.id);

    const isCompute = (t) => t === NodeType.COMPUTE_POD || t === NodeType.SERVERLESS_FAAS;
    const isGateway = (t) => t === NodeType.LOAD_BALANCER || t === NodeType.API_GATEWAY;
    const isEdge = (t) => t === NodeType.WAF_SHIELD || t === NodeType.CDN_EDGE || t === NodeType.DNS_ROUTING;
    const isIngress = (t) => t === NodeType.CLIENT_INGRESS;
    const isData = (t) =>
      t === NodeType.DATABASE_SQL ||
      t === NodeType.DATABASE_NOSQL ||
      t === NodeType.CACHE_CLUSTER ||
      t === NodeType.MESSAGE_BROKER ||
      t === NodeType.OBJECT_STORAGE;

    const dist = (a, b) => Math.hypot(a.gridX - b.gridX, a.gridY - b.gridY);
    const sortByDist = (list) => [...list].sort((a, b) => dist(node, a) - dist(node, b));

    const safeConnect = (sourceId, targetId) => {
      const conn = this.connectNodes(sourceId, targetId);
      if (conn && !createdConnections.includes(conn)) {
        createdConnections.push(conn);
      }
    };

    if (isCompute(node.type)) {
      // Connect from nearest upstream gateway
      const gateways = sortByDist(nodesList.filter((n) => isGateway(n.type)));
      if (gateways.length > 0) {
        safeConnect(gateways[0].id, node.id);
      } else {
        const upstreams = sortByDist(nodesList.filter((n) => isEdge(n.type) || isIngress(n.type)));
        if (upstreams.length > 0) safeConnect(upstreams[0].id, node.id);
      }

      // Connect to nearest downstream data/state service (DB or Cache)
      const dataNodes = sortByDist(nodesList.filter((n) => isData(n.type)));
      if (dataNodes.length > 0) {
        safeConnect(node.id, dataNodes[0].id);
        // If there's another data node within close proximity (<= 4 tiles), also connect
        if (dataNodes.length > 1 && dist(node, dataNodes[1]) <= 4) {
          safeConnect(node.id, dataNodes[1].id);
        }
      }
    } else if (isGateway(node.type)) {
      // Connect from nearest ingress or edge
      const upstreams = sortByDist(nodesList.filter((n) => isEdge(n.type) || isIngress(n.type)));
      if (upstreams.length > 0) safeConnect(upstreams[0].id, node.id);

      // Connect to up to 2 nearest downstream computes
      const computes = sortByDist(nodesList.filter((n) => isCompute(n.type)));
      if (computes.length > 0) {
        safeConnect(node.id, computes[0].id);
        if (computes.length > 1 && dist(node, computes[1]) <= 6) {
          safeConnect(node.id, computes[1].id);
        }
      } else {
        const dataNodes = sortByDist(nodesList.filter((n) => isData(n.type)));
        if (dataNodes.length > 0) safeConnect(node.id, dataNodes[0].id);
      }
    } else if (isData(node.type)) {
      // Connect from nearest compute node
      const computes = sortByDist(nodesList.filter((n) => isCompute(n.type)));
      if (computes.length > 0) {
        safeConnect(computes[0].id, node.id);
      } else {
        const gateways = sortByDist(nodesList.filter((n) => isGateway(n.type)));
        if (gateways.length > 0) safeConnect(gateways[0].id, node.id);
      }
    } else if (isEdge(node.type)) {
      // Edge security/CDN node: Splice between nearest Ingress and nearest Gateway
      const ingresses = sortByDist(nodesList.filter((n) => isIngress(n.type)));
      const gateways = sortByDist(nodesList.filter((n) => isGateway(n.type)));

      if (ingresses.length > 0) {
        safeConnect(ingresses[0].id, node.id);
      }
      if (gateways.length > 0) {
        safeConnect(node.id, gateways[0].id);
      }

      // If ingress was directly connected to gateway, splice by removing direct link
      if (ingresses.length > 0 && gateways.length > 0) {
        for (const [connId, conn] of this.connections.entries()) {
          if (conn.sourceNodeId === ingresses[0].id && conn.targetNodeId === gateways[0].id) {
            this.disconnectNodes(connId);
            break;
          }
        }
      }
    } else if (isIngress(node.type)) {
      // Connect to nearest edge node or gateway
      const targets = sortByDist(nodesList.filter((n) => isEdge(n.type) || isGateway(n.type)));
      if (targets.length > 0) {
        safeConnect(node.id, targets[0].id);
      }
    }

    return createdConnections;
  }

  /**
   * Add a physical facility component (Server Rack, Chiller, PDU, etc.)
   * @param {Object} params
   * @returns {Object} Created component
   */
  addFacilityComponent(params) {
    const catalogItem = COMPONENT_CATALOG[params.type];
    if (!catalogItem) {
      throw new Error(`Unknown facility component type: ${params.type}`);
    }

    const buyCost = catalogItem.costBuy || 0;
    if (buyCost > 0) {
      this.economicEngine.deductCash(buyCost);
    }

    const id = params.id || `fac_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const comp = {
      id,
      type: params.type,
      name: params.name || catalogItem.name,
      isoX: params.isoX ?? 0,
      isoY: params.isoY ?? 0,
      temperatureCelsius: 22.0,
      isPowerActive: true,
      costOpexPerSec: catalogItem.costOpexPerSec || 0,
      capacityKwh: catalogItem.capacityKwh || 50,
      currentChargeKwh: catalogItem.capacityKwh || 50,
      coolingCapacityKw: catalogItem.coolingCapacityKw || 0,
      powerOutputKw: catalogItem.powerOutputKw || 0,
      isRunning: params.type === 'DIESEL_GENERATOR' ? false : true,
    };

    this.facilityComponents.set(id, comp);
    this.recalculateTotalOpex();
    this.eventBus.emit('FACILITY_COMPONENT_PLACED', { component: comp });
    return comp;
  }

  /**
   * Remove a facility component and refund 50%
   * @param {string} componentId
   * @returns {boolean}
   */
  removeFacilityComponent(componentId) {
    const comp = this.facilityComponents.get(componentId);
    if (!comp) return false;

    this.facilityComponents.delete(componentId);
    const catalogItem = COMPONENT_CATALOG[comp.type];
    const buyCost = catalogItem?.costBuy || 0;
    const refund = Math.floor(buyCost * 0.5);
    if (refund > 0) {
      this.economicEngine.addCash(refund);
    }

    this.recalculateTotalOpex();
    this.eventBus.emit('FACILITY_COMPONENT_REMOVED', { componentId, refund });
    return true;
  }


  /**
   * Recalculate combined OPEX rate from active nodes and facilities
   */
  recalculateTotalOpex() {
    let totalOpex = 0;
    for (const node of this.nodes.values()) {
      totalOpex += node.costOpexPerSec || 0;
    }
    for (const fac of this.facilityComponents.values()) {
      totalOpex += fac.costOpexPerSec || 0;
    }
    this.economicEngine.setOpexPerSec(totalOpex);
  }

  /**
   * Advance simulation clock by one fixed tick
   * @param {number} [deltaSec=1/60]
   */
  tick(deltaSec = this.fixedDeltaSec) {
    this.simulationTickCount++;

    // 1. Advance traffic engine
    this.trafficEngine.tick(deltaSec, this.nodes, this.connections);

    // 2. Advance thermodynamics engine
    this.thermalEngine.tick(deltaSec, this.facilityComponents);

    // 3. Advance electrical power and UPS engine
    this.powerEngine.tick(deltaSec, this.facilityComponents);

    // 4. Advance economic engine
    this.economicEngine.tick(deltaSec);

    // 5. Emit simulation events
    this.eventBus.emit(EngineEventTypes.SIM_TICK, {
      tick: this.simulationTickCount,
      delta: deltaSec,
    });

    // 6. Emit complete immutable state snapshot
    this.eventBus.emit(EngineEventTypes.STATE_SNAPSHOT_EMITTED, {
      snapshot: this.getSnapshot(),
    });
  }

  /**
   * Handle incident remediation command from UI or contract event
   * @param {Object} action
   */
  handleRemediationAction(action) {
    if (!action || !action.actionType) return;

    switch (action.actionType) {
      case 'START_DIESEL_GENERATOR': {
        for (const [id, comp] of this.facilityComponents.entries()) {
          if (comp.type === 'DIESEL_GENERATOR' && !comp.isRunning) {
            this.powerEngine.startGenerator(id, this.facilityComponents);
            break;
          }
        }
        break;
      }
      case 'ENABLE_DDOS_SHIELD': {
        for (const node of this.nodes.values()) {
          if (node.type === NodeType.WAF_SHIELD) {
            node.isShieldActive = true;
          }
        }
        break;
      }
      case 'DEPLOY_WAF_RULESET': {
        for (const node of this.nodes.values()) {
          if (node.type === NodeType.WAF_SHIELD) {
            node.hasSqliRuleset = true;
          }
        }
        break;
      }
      case 'TRIGGER_RAFT_QUORUM': {
        for (const node of this.nodes.values()) {
          if (node.type === NodeType.DATABASE_SQL || node.type === NodeType.DATABASE_NOSQL) {
            node.isPartitioned = false;
            node.status = 'HEALTHY';
          }
        }
        break;
      }
      case 'EMERGENCY_EXHAUST_PURGE': {
        for (const fac of this.facilityComponents.values()) {
          if (fac.type === 'SERVER_RACK_42U') {
            fac.temperatureCelsius = Math.max(22, (fac.temperatureCelsius || 22) - 15);
          }
        }
        break;
      }
      case 'RESTART_NODE': {
        if (action.targetComponentId && this.nodes.has(action.targetComponentId)) {
          const node = this.nodes.get(action.targetComponentId);
          node.status = 'HEALTHY';
          node.cpuUtilization = 0.1;
        }
        break;
      }
    }
  }

  /**
   * Create complete immutable state snapshot conforming to save-state-schema.json
   * @returns {Object}
   */
  getSnapshot() {
    return {
      version: '1.0.0',
      savedAtTimestamp: Date.now(),
      simulationTickCount: this.simulationTickCount,
      pueRatio: this.thermalEngine.pueRatio,
      economicProfile: this.economicEngine.getProfile(),
      powerProfile: {
        isGridBlackout: this.powerEngine.isGridBlackout,
        isFacilityPowered: this.powerEngine.isFacilityPowered,
        totalLoadKw: this.powerEngine.totalLoadKw,
        runtimeSecondsRemaining: this.powerEngine.runtimeSecondsRemaining,
      },
      nodes: Array.from(this.nodes.values()).map((n) => ({ ...n })),
      connections: Array.from(this.connections.values()).map((c) => ({ ...c })),
      facilityComponents: Array.from(this.facilityComponents.values()).map((f) => ({ ...f })),
      activeIncidents: Array.from(this.activeIncidents.values()).map((i) => ({ ...i })),
    };
  }

  /**
   * Restore engine state from saved snapshot
   * @param {Object} state
   */
  loadState(state) {
    this.simulationTickCount = state.simulationTickCount || 0;

    if (state.economicProfile) {
      this.economicEngine = new EconomicEngine(this.eventBus, state.economicProfile);
    }

    this.nodes.clear();
    if (Array.isArray(state.nodes)) {
      for (const n of state.nodes) {
        this.nodes.set(n.id, { ...n });
      }
    }

    this.connections.clear();
    if (Array.isArray(state.connections)) {
      for (const c of state.connections) {
        this.connections.set(c.id, { ...c });
      }
    }

    this.facilityComponents.clear();
    if (Array.isArray(state.facilityComponents)) {
      for (const f of state.facilityComponents) {
        this.facilityComponents.set(f.id, { ...f });
      }
    }

    this.activeIncidents.clear();
    if (Array.isArray(state.activeIncidents)) {
      for (const i of state.activeIncidents) {
        this.activeIncidents.set(i.id, { ...i });
      }
    }

    this.recalculateTotalOpex();
  }
}
