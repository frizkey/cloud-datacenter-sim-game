/**
 * TechTree.js
 * SRE Research Lab Engine & Technology Progression.
 * Adheres strictly to contracts/tech-tree-schema.json.
 */

import { globalEventBus } from '../events/EventBus.js';

export const TECH_TREE_VERSION = '1.0.0';

export const DEFAULT_TECH_NODES = [
  // Era 1: Bare Metal Monolith
  {
    id: 'era1_bare_metal',
    era: 1,
    name: 'Bare Metal Servers',
    description: 'Standard compute servers and relational databases for baseline monolithic deployments.',
    researchCostMicroCents: 0,
    prerequisiteTechIds: [],
    unlockedComponentTypes: ['CLIENT_INGRESS', 'COMPUTE_POD', 'DATABASE_SQL'],
    unlockedMechanics: ['MANUAL_WIRING'],
    isUnlocked: true,
  },
  {
    id: 'era1_pdu_distribution',
    era: 1,
    name: '3-Phase PDU Distribution',
    description: 'Heavy duty electrical power distribution units to deliver clean current to server racks.',
    researchCostMicroCents: 50000000, // $500.00
    prerequisiteTechIds: ['era1_bare_metal'],
    unlockedComponentTypes: ['PDU_3PHASE'],
    unlockedMechanics: [],
    isUnlocked: false,
  },
  {
    id: 'era1_crac_cooling',
    era: 1,
    name: 'CRAC Chillers',
    description: 'Computer Room Air Conditioner units to dissipate server heat and prevent thermal throttling.',
    researchCostMicroCents: 100000000, // $1,000.00
    prerequisiteTechIds: ['era1_pdu_distribution'],
    unlockedComponentTypes: ['CRAC_CHILLER'],
    unlockedMechanics: ['THERMAL_MANAGEMENT'],
    isUnlocked: false,
  },
  {
    id: 'era1_ups_battery',
    era: 1,
    name: 'UPS Battery Banks',
    description: 'High-capacity uninterruptible power supply batteries to bridge power grid outages.',
    researchCostMicroCents: 150000000, // $1,500.00
    prerequisiteTechIds: ['era1_pdu_distribution'],
    unlockedComponentTypes: ['UPS_BATTERY'],
    unlockedMechanics: ['BATTERY_STORAGE'],
    isUnlocked: false,
  },

  // Era 2: Virtualization & High Availability
  {
    id: 'era2_dns_routing',
    era: 2,
    name: 'Anycast GeoDNS',
    description: 'Geo-distributed DNS routing to balance regional incoming requests.',
    researchCostMicroCents: 250000000, // $2,500.00
    prerequisiteTechIds: ['era1_bare_metal'],
    unlockedComponentTypes: ['DNS_ROUTING'],
    unlockedMechanics: ['REGIONAL_ROUTING'],
    isUnlocked: false,
  },
  {
    id: 'era2_load_balancer',
    era: 2,
    name: 'Layer 7 Reverse Proxy',
    description: 'High throughput load balancers distributing HTTP requests across compute clusters.',
    researchCostMicroCents: 300000000, // $3,000.00
    prerequisiteTechIds: ['era2_dns_routing'],
    unlockedComponentTypes: ['LOAD_BALANCER'],
    unlockedMechanics: ['HEALTH_CHECK_ROUTING'],
    isUnlocked: false,
  },
  {
    id: 'era2_db_replicas',
    era: 2,
    name: 'NoSQL & Read Replicas',
    description: 'Distributed document databases and read replica clustering to relieve read query saturation.',
    researchCostMicroCents: 350000000, // $3,500.00
    prerequisiteTechIds: ['era1_bare_metal'],
    unlockedComponentTypes: ['DATABASE_NOSQL'],
    unlockedMechanics: ['READ_REPLICAS'],
    isUnlocked: false,
  },
  {
    id: 'era2_diesel_generator',
    era: 2,
    name: 'Diesel Auxiliary Turbines',
    description: 'Emergency combustion generators that spool up to provide auxiliary power during prolonged blackout.',
    researchCostMicroCents: 400000000, // $4,000.00
    prerequisiteTechIds: ['era1_ups_battery'],
    unlockedComponentTypes: ['DIESEL_GENERATOR'],
    unlockedMechanics: ['AUXILIARY_POWER_SPOOL'],
    isUnlocked: false,
  },
  {
    id: 'era2_circuit_breaker',
    era: 2,
    name: 'Electrical Circuit Breakers',
    description: 'Automated circuit breaker trips that isolate overloading racks before transformers blow.',
    researchCostMicroCents: 200000000, // $2,000.00
    prerequisiteTechIds: ['era1_pdu_distribution'],
    unlockedComponentTypes: ['CIRCUIT_BREAKER'],
    unlockedMechanics: ['CIRCUIT_BREAKER'],
    isUnlocked: false,
  },

  // Era 3: Cloud-Native Microservices
  {
    id: 'era3_waf_shield',
    era: 3,
    name: 'Cloud WAF Defense',
    description: 'Deep packet inspection firewall filtering malicious bots and volumetric layer-7 attacks.',
    researchCostMicroCents: 600000000, // $6,000.00
    prerequisiteTechIds: ['era2_load_balancer'],
    unlockedComponentTypes: ['WAF_SHIELD'],
    unlockedMechanics: ['BOT_MITIGATION'],
    isUnlocked: false,
  },
  {
    id: 'era3_edge_cdn',
    era: 3,
    name: 'Global Edge CDN',
    description: 'Edge caching point-of-presence absorbing static content requests at near-zero latency.',
    researchCostMicroCents: 800000000, // $8,000.00
    prerequisiteTechIds: ['era2_dns_routing'],
    unlockedComponentTypes: ['CDN_EDGE'],
    unlockedMechanics: ['STATIC_CACHING'],
    isUnlocked: false,
  },
  {
    id: 'era3_api_gateway',
    era: 3,
    name: 'Microservice API Gateway',
    description: 'Unified edge gateway handling token authentication, rate limiting, and upstream path rewrites.',
    researchCostMicroCents: 750000000, // $7,500.00
    prerequisiteTechIds: ['era2_load_balancer'],
    unlockedComponentTypes: ['API_GATEWAY'],
    unlockedMechanics: ['RATE_LIMITING'],
    isUnlocked: false,
  },
  {
    id: 'era3_message_broker',
    era: 3,
    name: 'Kafka Message Queue',
    description: 'Durable event log message queues absorbing traffic spikes and decoupling asynchronous consumers.',
    researchCostMicroCents: 900000000, // $9,000.00
    prerequisiteTechIds: ['era2_load_balancer'],
    unlockedComponentTypes: ['MESSAGE_BROKER'],
    unlockedMechanics: ['ASYNC_BUFFERING'],
    isUnlocked: false,
  },
  {
    id: 'era3_serverless_faas',
    era: 3,
    name: 'Serverless Functions',
    description: 'Instant event-triggered compute instances with scale-to-zero and micro-billing.',
    researchCostMicroCents: 1000000000, // $10,000.00
    prerequisiteTechIds: ['era3_api_gateway'],
    unlockedComponentTypes: ['SERVERLESS_FAAS'],
    unlockedMechanics: ['SCALE_TO_ZERO'],
    isUnlocked: false,
  },
  {
    id: 'era3_object_storage',
    era: 3,
    name: 'Object Storage Buckets',
    description: 'High durability S3 blob storage with multi-zone data redundancy.',
    researchCostMicroCents: 850000000, // $8,500.00
    prerequisiteTechIds: ['era2_db_replicas'],
    unlockedComponentTypes: ['OBJECT_STORAGE'],
    unlockedMechanics: ['BLOB_PERSISTENCE'],
    isUnlocked: false,
  },

  // Era 4: Hyperscale Autonomous Operations
  {
    id: 'era4_autoscaler',
    era: 4,
    name: 'Kubernetes Horizontal Pod Autoscaler',
    description: 'Automated horizontal scaling based on CPU and request queue saturation metrics.',
    researchCostMicroCents: 1500000000, // $15,000.00
    prerequisiteTechIds: ['era3_serverless_faas'],
    unlockedComponentTypes: [],
    unlockedMechanics: ['POD_AUTOSCALING'],
    isUnlocked: false,
  },
  {
    id: 'era4_blueprints',
    era: 4,
    name: 'Architectural Blueprint Sharing',
    description: 'Export and import datacenter subgraphs via encoded blueprint strings.',
    researchCostMicroCents: 1200000000, // $12,000.00
    prerequisiteTechIds: ['era3_api_gateway'],
    unlockedComponentTypes: [],
    unlockedMechanics: ['BLUEPRINT_EXPORT_IMPORT'],
    isUnlocked: false,
  },
  {
    id: 'era4_chaos_mesh',
    era: 4,
    name: 'Automated Chaos Engineering',
    description: 'Active resilience testing with scheduled simulated outages to earn SLA resilience bonuses.',
    researchCostMicroCents: 2000000000, // $20,000.00
    prerequisiteTechIds: ['era4_autoscaler'],
    unlockedComponentTypes: [],
    unlockedMechanics: ['CHAOS_EXPERIMENTS'],
    isUnlocked: false,
  },
];

export class TechTree {
  constructor(options = null) {
    this.version = TECH_TREE_VERSION;
    this.schemaVersion = TECH_TREE_VERSION;
    this.nodes = new Map();
    let sourceNodes = DEFAULT_TECH_NODES;
    this.eventBus = null;

    if (Array.isArray(options)) {
      sourceNodes = options;
    } else if (options && typeof options === 'object') {
      if (Array.isArray(options.initialNodes)) {
        sourceNodes = options.initialNodes;
      }
      if (options.eventBus) {
        this.eventBus = options.eventBus;
      }
    }

    for (const node of sourceNodes) {
      this.nodes.set(node.id, {
        ...node,
        prerequisiteTechIds: [...(node.prerequisiteTechIds || [])],
        unlockedComponentTypes: [...(node.unlockedComponentTypes || [])],
        unlockedMechanics: [...(node.unlockedMechanics || [])],
        isUnlocked: Boolean(node.isUnlocked),
        unlockedAtTimestamp: node.unlockedAtTimestamp || (node.isUnlocked ? Date.now() : null),
      });
    }
  }

  getNodes() {
    return Array.from(this.nodes.values());
  }

  getNode(techId) {
    return this.nodes.get(techId) || null;
  }

  isUnlocked(techId) {
    const node = this.nodes.get(techId);
    return Boolean(node && node.isUnlocked);
  }

  isTechUnlocked(techId) {
    return this.isUnlocked(techId);
  }

  canUnlock(techId, availableMicroCents) {
    const node = this.nodes.get(techId);
    if (!node || node.isUnlocked) return false;
    if (availableMicroCents < node.researchCostMicroCents) return false;

    // Check prerequisites
    for (const prereqId of node.prerequisiteTechIds) {
      if (!this.isUnlocked(prereqId)) {
        return false;
      }
    }
    return true;
  }

  canResearchTech(techId, availableMicroCents) {
    const node = this.nodes.get(techId);
    if (!node) {
      return { canResearch: false, reason: `Unknown tech node: ${techId}` };
    }
    if (node.isUnlocked) {
      return { canResearch: false, reason: 'Tech is already unlocked' };
    }

    // Check prerequisites
    for (const prereqId of node.prerequisiteTechIds) {
      const prereq = this.nodes.get(prereqId);
      if (!prereq || !prereq.isUnlocked) {
        return {
          canResearch: false,
          reason: `Missing prerequisite: ${prereq ? prereq.name : prereqId}`,
        };
      }
    }

    // Check research funds
    if (availableMicroCents < node.researchCostMicroCents) {
      return {
        canResearch: false,
        reason: `Insufficient research funds (costs $${(node.researchCostMicroCents / 100000).toFixed(2)}, available: $${(availableMicroCents / 100000).toFixed(2)})`,
      };
    }

    return { canResearch: true, reason: null };
  }

  researchTech(techId, availableMicroCents) {
    const check = this.canResearchTech(techId, availableMicroCents);
    if (!check.canResearch) {
      return {
        success: false,
        reason: check.reason,
        costDeductedMicroCents: 0,
        deductedMicroCents: 0,
        remainingMicroCents: availableMicroCents,
      };
    }

    const node = this.nodes.get(techId);
    node.isUnlocked = true;
    node.unlockedAtTimestamp = Date.now();

    const payload = {
      techId: node.id,
      era: node.era,
      name: node.name,
      unlockedComponentTypes: node.unlockedComponentTypes,
      unlockedMechanics: node.unlockedMechanics,
      costDeductedMicroCents: node.researchCostMicroCents,
    };

    const bus = this.eventBus || globalEventBus;
    bus.emit('TECH_UNLOCKED', payload);
    bus.emit('TECH_RESEARCHED', payload);
    if (this.eventBus && this.eventBus !== globalEventBus) {
      globalEventBus.emit('TECH_UNLOCKED', payload);
      globalEventBus.emit('TECH_RESEARCHED', payload);
    }

    return {
      success: true,
      costDeductedMicroCents: node.researchCostMicroCents,
      deductedMicroCents: node.researchCostMicroCents,
      remainingMicroCents: availableMicroCents - node.researchCostMicroCents,
      unlockedNode: node,
    };
  }

  unlock(techId, availableMicroCents) {
    const res = this.researchTech(techId, availableMicroCents);
    if (!res.success) {
      throw new Error(`Cannot unlock ${techId}: ${res.reason}`);
    }
    return res;
  }

  getUnlockedComponentTypes() {
    const unlocked = new Set();
    for (const node of this.nodes.values()) {
      if (node.isUnlocked) {
        for (const type of node.unlockedComponentTypes) {
          unlocked.add(type);
        }
      }
    }
    return Array.from(unlocked);
  }

  getUnlockedMechanics() {
    const unlocked = new Set();
    for (const node of this.nodes.values()) {
      if (node.isUnlocked) {
        for (const mechanic of node.unlockedMechanics) {
          unlocked.add(mechanic);
        }
      }
    }
    return Array.from(unlocked);
  }

  isComponentUnlocked(type) {
    return this.getUnlockedComponentTypes().includes(type);
  }

  isMechanicUnlocked(mechanic) {
    return this.getUnlockedMechanics().includes(mechanic);
  }

  serialize() {
    const unlockedIds = [];
    for (const node of this.nodes.values()) {
      if (node.isUnlocked) unlockedIds.push(node.id);
    }
    return {
      version: this.version,
      schemaVersion: this.version,
      unlockedTechIds: unlockedIds,
      nodes: Array.from(this.nodes.values()),
    };
  }

  deserialize(data) {
    if (!data) return;
    if (Array.isArray(data.unlockedTechIds)) {
      const unlockedSet = new Set(data.unlockedTechIds);
      for (const node of this.nodes.values()) {
        node.isUnlocked = unlockedSet.has(node.id);
      }
    }
    if (Array.isArray(data.nodes)) {
      for (const savedNode of data.nodes) {
        const existing = this.nodes.get(savedNode.id);
        if (existing) {
          existing.isUnlocked = Boolean(savedNode.isUnlocked);
          existing.unlockedAtTimestamp = savedNode.unlockedAtTimestamp || null;
        }
      }
    }
  }
}
