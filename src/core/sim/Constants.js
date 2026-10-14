/**
 * Constants.js - Domain Constants, Enums, Catalog Metadata & Physical Ratios
 * Pure JS, zero DOM/Phaser coupling.
 */

export const NodeType = Object.freeze({
  CLIENT_INGRESS: 'CLIENT_INGRESS',
  DNS_ROUTING: 'DNS_ROUTING',
  WAF_SHIELD: 'WAF_SHIELD',
  CDN_EDGE: 'CDN_EDGE',
  LOAD_BALANCER: 'LOAD_BALANCER',
  API_GATEWAY: 'API_GATEWAY',
  COMPUTE_POD: 'COMPUTE_POD',
  SERVERLESS_FAAS: 'SERVERLESS_FAAS',
  MESSAGE_BROKER: 'MESSAGE_BROKER',
  CACHE_CLUSTER: 'CACHE_CLUSTER',
  DATABASE_SQL: 'DATABASE_SQL',
  OBJECT_STORAGE: 'OBJECT_STORAGE',
});

export const NodeStatus = Object.freeze({
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  OOM_KILLED: 'OOM_KILLED',
  REBOOTING: 'REBOOTING',
});

export const FacilityComponentType = Object.freeze({
  SERVER_RACK_42U: 'SERVER_RACK_42U',
  CRAC_CHILLER: 'CRAC_CHILLER',
  PDU_3PHASE: 'PDU_3PHASE',
  UPS_BATTERY: 'UPS_BATTERY',
  DIESEL_GENERATOR: 'DIESEL_GENERATOR',
  AISLE_CONTAINMENT: 'AISLE_CONTAINMENT',
});

export const PacketType = Object.freeze({
  HTTP_GET: 'HTTP_GET',
  HTTP_POST: 'HTTP_POST',
  CACHE_QUERY: 'CACHE_QUERY',
  DB_TRANSACTION: 'DB_TRANSACTION',
  DDOS_FLOOD: 'DDOS_FLOOD',
  SQLI_ATTACK: 'SQLI_ATTACK',
});

export const PacketState = Object.freeze({
  IN_FLIGHT: 'IN_FLIGHT',
  PROCESSED: 'PROCESSED',
  DROPPED: 'DROPPED',
  DEFLECTED: 'DEFLECTED',
});

export const IncidentSeverity = Object.freeze({
  TIER_1_LOW: 'TIER_1_LOW',
  TIER_2_MEDIUM: 'TIER_2_MEDIUM',
  TIER_3_HIGH: 'TIER_3_HIGH',
  TIER_4_CRITICAL: 'TIER_4_CRITICAL',
});

export const IncidentType = Object.freeze({
  POD_MEMORY_LEAK: 'POD_MEMORY_LEAK',
  FLASH_SALE_SPIKE: 'FLASH_SALE_SPIKE',
  DDOS_FLOOD: 'DDOS_FLOOD',
  SQLI_BREACH: 'SQLI_BREACH',
  CACHE_STAMPEDE: 'CACHE_STAMPEDE',
  RACK_OVERHEATING: 'RACK_OVERHEATING',
  POWER_BLACKOUT: 'POWER_BLACKOUT',
});

// Economic & Physics Constants
export const SIM_CONSTANTS = Object.freeze({
  MICRO_CENTS_PER_USD: 1_000_000,
  REVENUE_PER_200_OK_MICRO_CENTS: 200, // $0.0002
  STARTING_CASH_MICRO_CENTS: 50_000_000, // $50.00
  POWER_COST_PER_KWH_MICRO_CENTS: 120_000, // $0.12 / kWh
  TICK_RATE_HZ: 60,
  SEC_PER_TICK: 1 / 60,
  MAX_PACKET_HOPS: 16,
  DEFAULT_PACKET_TIMEOUT_MS: 3000,
  AMBIENT_ROOM_TEMP_C: 22.0,
  THERMAL_THROTTLE_TEMP_C: 45.0,
  THERMAL_SHUTDOWN_TEMP_C: 65.0,
  HEAT_BTU_PER_WATT_HOUR: 3.412,
  CRAC_DEFAULT_CFM: 2500,
  CRAC_DEFAULT_POWER_KW: 4.5,
  INSOLVENCY_GRACE_PERIOD_SEC: 30,
  SLA_REPUTATION_DEFAULT: 100.0,
  SLA_PENALTY_PER_DROP: 0.05,
  SLA_RECOVERY_RATE_PER_SEC: 0.08,
  OFFLINE_CATCHUP_MAX_HOURS: 8,
});

// Component Catalog & Metadata for building and procurement
export const COMPONENT_CATALOG = Object.freeze({
  [NodeType.CLIENT_INGRESS]: {
    type: NodeType.CLIENT_INGRESS,
    name: 'Customer Ingress Gateway',
    category: 'Ingress',
    costBuy: 0,
    costOpexPerSec: 0,
    capacityRps: 5000,
    baseLatencyMs: 5,
    thermalWatts: 0,
    colorHex: 0x22c55e,
    description: 'Entry gateway generating organic customer requests.',
  },
  [NodeType.DNS_ROUTING]: {
    type: NodeType.DNS_ROUTING,
    name: 'Anycast DNS Resolver',
    category: 'Ingress',
    costBuy: 5_000_000, // $5.00
    costOpexPerSec: 10_000, // $0.01/s
    capacityRps: 2000,
    baseLatencyMs: 3,
    thermalWatts: 200,
    colorHex: 0x3b82f6,
    description: 'High availability DNS routing and health checks.',
  },
  [NodeType.WAF_SHIELD]: {
    type: NodeType.WAF_SHIELD,
    name: 'Cloud WAF Shield',
    category: 'Security',
    costBuy: 15_000_000, // $15.00
    costOpexPerSec: 30_000, // $0.03/s
    capacityRps: 1500,
    baseLatencyMs: 4,
    thermalWatts: 500,
    colorHex: 0xef4444,
    description: 'Deep packet inspection blocking DDoS and SQLi attacks.',
  },
  [NodeType.CDN_EDGE]: {
    type: NodeType.CDN_EDGE,
    name: 'Edge CDN Cache',
    category: 'Edge',
    costBuy: 20_000_000, // $20.00
    costOpexPerSec: 40_000, // $0.04/s
    capacityRps: 2500,
    baseLatencyMs: 2,
    thermalWatts: 600,
    colorHex: 0x06b6d4,
    description: 'Edge distribution caching static assets with minimal latency.',
  },
  [NodeType.LOAD_BALANCER]: {
    type: NodeType.LOAD_BALANCER,
    name: 'Application Load Balancer',
    category: 'Routing',
    costBuy: 10_000_000, // $10.00
    costOpexPerSec: 20_000, // $0.02/s
    capacityRps: 3000,
    baseLatencyMs: 2,
    thermalWatts: 400,
    colorHex: 0x8b5cf6,
    description: 'Distributes traffic across downstream compute pods.',
  },
  [NodeType.API_GATEWAY]: {
    type: NodeType.API_GATEWAY,
    name: 'API Gateway',
    category: 'Routing',
    costBuy: 12_000_000, // $12.00
    costOpexPerSec: 25_000, // $0.025/s
    capacityRps: 2000,
    baseLatencyMs: 4,
    thermalWatts: 500,
    colorHex: 0xa855f7,
    description: 'Token auth verification, rate limiting, and request routing.',
  },
  [NodeType.COMPUTE_POD]: {
    type: NodeType.COMPUTE_POD,
    name: 'Compute Worker Pod',
    category: 'Compute',
    costBuy: 8_000_000, // $8.00
    costOpexPerSec: 15_000, // $0.015/s
    capacityRps: 500,
    baseLatencyMs: 20,
    thermalWatts: 1200,
    colorHex: 0xf59e0b,
    description: 'Stateless application service executing business logic.',
  },
  [NodeType.SERVERLESS_FAAS]: {
    type: NodeType.SERVERLESS_FAAS,
    name: 'Serverless FaaS Pool',
    category: 'Compute',
    costBuy: 4_000_000, // $4.00
    costOpexPerSec: 35_000, // $0.035/s
    capacityRps: 1000,
    baseLatencyMs: 35,
    thermalWatts: 800,
    colorHex: 0xeab308,
    description: 'Auto-scaling burst execution with cold start overhead.',
  },
  [NodeType.MESSAGE_BROKER]: {
    type: NodeType.MESSAGE_BROKER,
    name: 'Event Message Broker',
    category: 'Queue',
    costBuy: 14_000_000, // $14.00
    costOpexPerSec: 28_000, // $0.028/s
    capacityRps: 4000,
    baseLatencyMs: 5,
    thermalWatts: 900,
    colorHex: 0x10b981,
    description: 'Asynchronous event buffer smoothing out traffic spikes.',
  },
  [NodeType.CACHE_CLUSTER]: {
    type: NodeType.CACHE_CLUSTER,
    name: 'In-Memory Cache Cluster',
    category: 'Storage',
    costBuy: 18_000_000, // $18.00
    costOpexPerSec: 30_000, // $0.03/s
    capacityRps: 4000,
    baseLatencyMs: 1,
    thermalWatts: 700,
    colorHex: 0xec4899,
    description: 'High-speed key-value cache preventing heavy database load.',
  },
  [NodeType.DATABASE_SQL]: {
    type: NodeType.DATABASE_SQL,
    name: 'Primary SQL Database',
    category: 'Storage',
    costBuy: 25_000_000, // $25.00
    costOpexPerSec: 50_000, // $0.05/s
    capacityRps: 300,
    baseLatencyMs: 40,
    thermalWatts: 2000,
    colorHex: 0xf43f5e,
    description: 'ACID transactional persistence for critical customer data.',
  },
  [NodeType.OBJECT_STORAGE]: {
    type: NodeType.OBJECT_STORAGE,
    name: 'Cloud Object Storage',
    category: 'Storage',
    costBuy: 10_000_000, // $10.00
    costOpexPerSec: 12_000, // $0.012/s
    capacityRps: 1200,
    baseLatencyMs: 15,
    thermalWatts: 800,
    colorHex: 0x6366f1,
    description: 'Scalable binary object storage for images, videos, and backups.',
  },
  // Physical Facility Components
  [FacilityComponentType.SERVER_RACK_42U]: {
    type: FacilityComponentType.SERVER_RACK_42U,
    name: '42U Server Chassis Rack',
    category: 'Facility',
    costBuy: 10_000_000,
    costOpexPerSec: 5_000,
    powerKw: 1.0,
    maxSlots: 10,
    colorHex: 0x64748b,
    description: 'Industrial server cabinet mounting logical compute/storage nodes.',
  },
  [FacilityComponentType.CRAC_CHILLER]: {
    type: FacilityComponentType.CRAC_CHILLER,
    name: 'CRAC Air Chiller Unit',
    category: 'Facility',
    costBuy: 30_000_000,
    costOpexPerSec: 60_000,
    powerKw: 4.5,
    coolingCapacityCfm: 5000,
    colorHex: 0x38bdf8,
    description: 'Computer room air conditioner circulating cold air to lower rack temperatures.',
  },
  [FacilityComponentType.PDU_3PHASE]: {
    type: FacilityComponentType.PDU_3PHASE,
    name: '3-Phase PDU Breaker',
    category: 'Facility',
    costBuy: 8_000_000,
    costOpexPerSec: 2_000,
    powerKw: 0.2,
    maxPowerKw: 40,
    colorHex: 0xfacc15,
    description: 'Distributes conditioned 3-phase electricity across rack rows.',
  },
  [FacilityComponentType.UPS_BATTERY]: {
    type: FacilityComponentType.UPS_BATTERY,
    name: 'Flywheel / LiFePO4 UPS',
    category: 'Facility',
    costBuy: 15_000_000,
    costOpexPerSec: 4_000,
    powerKw: 0.5,
    capacityKwh: 50,
    colorHex: 0x4ade80,
    description: 'Instant battery reserve maintaining power during grid cutoffs.',
  },
  [FacilityComponentType.DIESEL_GENERATOR]: {
    type: FacilityComponentType.DIESEL_GENERATOR,
    name: '2MW Emergency Generator',
    category: 'Facility',
    costBuy: 50_000_000,
    costOpexPerSec: 10_000,
    powerKw: 0.1,
    outputPowerKw: 150,
    colorHex: 0xf97316,
    description: 'Heavy diesel engine supplying backup electricity during prolonged outages.',
  },
  [FacilityComponentType.AISLE_CONTAINMENT]: {
    type: FacilityComponentType.AISLE_CONTAINMENT,
    name: 'Aisle Cold Containment',
    category: 'Facility',
    costBuy: 5_000_000,
    costOpexPerSec: 500,
    powerKw: 0,
    colorHex: 0x94a3b8,
    description: 'Physical barrier preventing cold supply and hot exhaust mixing.',
  },
});
