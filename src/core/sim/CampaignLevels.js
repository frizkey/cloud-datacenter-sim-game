/**
 * CampaignLevels.js - Career Campaign Level Configurations (Levels 1 to 5)
 * Defines starter topologies, financial constraints, objectives, and scripted incident timelines.
 * Pure JS, zero DOM/Phaser coupling.
 */

import { NodeType, FacilityComponentType, IncidentType } from './Constants.js';

export const CAMPAIGN_LEVELS = Object.freeze([
  {
    levelNumber: 1,
    id: 'lvl_01_startup_launch',
    title: 'Level 1: The Startup Launch',
    subtitle: 'Survive Day 1 Viral Traffic',
    lore: 'Your SaaS startup just launched on social media! Traffic is arriving fast, but your budget is razor thin. Keep the single compute pod alive and upgrade before an out-of-memory crash brings the platform down.',
    durationSec: 90,
    startingCashMicroCents: 15000000, // $15.00
    starterNodes: [
      { id: 'node_ingress_1', type: NodeType.CLIENT_INGRESS, gridX: 100, gridY: 200, name: 'Web Visitors' },
      { id: 'node_pod_1', type: NodeType.COMPUTE_POD, gridX: 300, gridY: 200, name: 'Node.js App Pod' },
      { id: 'node_db_1', type: NodeType.DATABASE_SQL, gridX: 500, gridY: 200, name: 'Postgres DB' },
    ],
    starterConnections: [
      { sourceId: 'node_ingress_1', targetId: 'node_pod_1' },
      { sourceId: 'node_pod_1', targetId: 'node_db_1' },
    ],
    objectives: {
      durationSec: 90,
      minSlaPercent: 99.0, // 1-star base: 99.0%, 2-star: 99.5%
      minProcessedRequests: 500,
      targetCashBonusMicroCents: 20000000, // $20.00 for 3rd star
    },
    scriptedIncidents: [
      {
        triggerAtSec: 30,
        incidentType: IncidentType.POD_MEMORY_LEAK || 'POD_MEMORY_LEAK',
        targetComponentId: 'node_pod_1',
        title: 'Compute Pod OOM Memory Leak',
        description: 'Memory leak detected in Node.js worker! Pod CPU maxed out and dropping requests.',
        requiredRemediation: 'RESTART_NODE',
      },
    ],
  },
  {
    levelNumber: 2,
    id: 'lvl_02_flash_sale',
    title: 'Level 2: The E-Commerce Flash Sale',
    subtitle: 'Absorb the 11.11 Shopping Spike',
    lore: 'The annual flash sale is live! Traffic will surge tenfold to 2,500 RPS. Without caching and a load balancer, the backend database will immediately collapse under connection pooling bottlenecks.',
    durationSec: 120,
    startingCashMicroCents: 35000000, // $35.00
    starterNodes: [
      { id: 'node_ingress_2', type: NodeType.CLIENT_INGRESS, gridX: 100, gridY: 250, name: 'Shopper Traffic' },
      { id: 'node_lb_2', type: NodeType.LOAD_BALANCER, gridX: 250, gridY: 250, name: 'Application LB' },
      { id: 'node_pod_2a', type: NodeType.COMPUTE_POD, gridX: 400, gridY: 180, name: 'Order Pod A' },
      { id: 'node_pod_2b', type: NodeType.COMPUTE_POD, gridX: 400, gridY: 320, name: 'Order Pod B' },
      { id: 'node_db_2', type: NodeType.DATABASE_SQL, gridX: 600, gridY: 250, name: 'Inventory DB' },
    ],
    starterConnections: [
      { sourceId: 'node_ingress_2', targetId: 'node_lb_2' },
      { sourceId: 'node_lb_2', targetId: 'node_pod_2a' },
      { sourceId: 'node_lb_2', targetId: 'node_pod_2b' },
      { sourceId: 'node_pod_2a', targetId: 'node_db_2' },
      { sourceId: 'node_pod_2b', targetId: 'node_db_2' },
    ],
    objectives: {
      durationSec: 120,
      minSlaPercent: 99.0,
      minProcessedRequests: 1500,
      targetCashBonusMicroCents: 45000000, // $45.00 for 3rd star
    },
    scriptedIncidents: [
      {
        triggerAtSec: 45,
        incidentType: IncidentType.CACHE_STAMPEDE || 'CACHE_STAMPEDE',
        targetComponentId: 'node_db_2',
        title: 'Cache Stampede Dogpiling',
        description: 'Key cache keys expired simultaneously! Thousands of concurrent requests are dogpiling direct onto Postgres.',
        requiredRemediation: 'WARM_CACHE',
      },
    ],
  },
  {
    levelNumber: 3,
    id: 'lvl_03_cyber_siege',
    title: 'Level 3: Under Cyber Siege',
    subtitle: 'Defend Against DDoS & Injection Exploits',
    lore: 'A sophisticated botnet has launched a coordinated cyber assault. Deploy Web Application Firewalls (WAF) to filter malicious packets before they reach internal application pods.',
    durationSec: 150,
    startingCashMicroCents: 60000000, // $60.00
    starterNodes: [
      { id: 'node_ingress_3', type: NodeType.CLIENT_INGRESS, gridX: 80, gridY: 250, name: 'Public Ingress' },
      { id: 'node_lb_3', type: NodeType.LOAD_BALANCER, gridX: 250, gridY: 250, name: 'Frontend LB' },
      { id: 'node_pod_3', type: NodeType.COMPUTE_POD, gridX: 420, gridY: 250, name: 'API Server' },
      { id: 'node_db_3', type: NodeType.DATABASE_SQL, gridX: 600, gridY: 250, name: 'UserData DB' },
    ],
    starterConnections: [
      { sourceId: 'node_ingress_3', targetId: 'node_lb_3' },
      { sourceId: 'node_lb_3', targetId: 'node_pod_3' },
      { sourceId: 'node_pod_3', targetId: 'node_db_3' },
    ],
    objectives: {
      durationSec: 150,
      minSlaPercent: 99.0,
      minProcessedRequests: 2500,
      targetCashBonusMicroCents: 75000000, // $75.00 for 3rd star
      maxErrorRatePercent: 2.0,
    },
    scriptedIncidents: [
      {
        triggerAtSec: 30,
        incidentType: 'DDOS_FLOOD',
        targetComponentId: 'node_lb_3',
        title: 'Volumetric DDoS Attack',
        description: 'A 50,000-node botnet is flooding your ingress with syn flood packets.',
        requiredRemediation: 'ENABLE_DDOS_SHIELD',
      },
      {
        triggerAtSec: 75,
        incidentType: 'SQLI_ATTACK',
        targetComponentId: 'node_db_3',
        title: 'SQL Injection Campaign',
        description: 'Automated scanners injecting UNION SELECT payloads targeting authentication credentials.',
        requiredRemediation: 'DEPLOY_WAF_RULESET',
      },
    ],
  },
  {
    levelNumber: 4,
    id: 'lvl_04_global_expansion',
    title: 'Level 4: Global Multi-Region Expansion',
    subtitle: 'Zero-Downtime Distributed Availability',
    lore: 'Your customer base is now international across US, Europe, and Asia-Pacific. Route traffic globally with DNS latency-based routing and maintain replication quorum even when an entire Availability Zone drops.',
    durationSec: 180,
    startingCashMicroCents: 100000000, // $100.00
    starterNodes: [
      { id: 'node_dns_4', type: NodeType.DNS_ROUTING, gridX: 60, gridY: 250, name: 'GeoDNS Anycast' },
      { id: 'node_ing_us', type: NodeType.CLIENT_INGRESS, gridX: 200, gridY: 150, name: 'US Ingress' },
      { id: 'node_ing_eu', type: NodeType.CLIENT_INGRESS, gridX: 200, gridY: 350, name: 'EU Ingress' },
      { id: 'node_pod_us', type: NodeType.COMPUTE_POD, gridX: 380, gridY: 150, name: 'US Cluster' },
      { id: 'node_pod_eu', type: NodeType.COMPUTE_POD, gridX: 380, gridY: 350, name: 'EU Cluster' },
      { id: 'node_db_sql', type: NodeType.DATABASE_SQL, gridX: 560, gridY: 200, name: 'Primary DB' },
      { id: 'node_db_nosql', type: NodeType.DATABASE_NOSQL, gridX: 560, gridY: 300, name: 'Replica DB' },
    ],
    starterConnections: [
      { sourceId: 'node_dns_4', targetId: 'node_ing_us' },
      { sourceId: 'node_dns_4', targetId: 'node_ing_eu' },
      { sourceId: 'node_ing_us', targetId: 'node_pod_us' },
      { sourceId: 'node_ing_eu', targetId: 'node_pod_eu' },
      { sourceId: 'node_pod_us', targetId: 'node_db_sql' },
      { sourceId: 'node_pod_eu', targetId: 'node_db_nosql' },
    ],
    objectives: {
      durationSec: 180,
      minSlaPercent: 99.0,
      minProcessedRequests: 4000,
      targetCashBonusMicroCents: 125000000, // $125.00 for 3rd star
    },
    scriptedIncidents: [
      {
        triggerAtSec: 60,
        incidentType: 'SPLIT_BRAIN',
        targetComponentId: 'node_db_sql',
        title: 'Cross-Region Partition (Split-Brain)',
        description: 'Undersea fiber cable severed! Transatlantic link severed, databases running diverging state.',
        requiredRemediation: 'TRIGGER_RAFT_QUORUM',
      },
      {
        triggerAtSec: 120,
        incidentType: 'AZ_OUTAGE',
        targetComponentId: 'node_pod_us',
        title: 'Cloud Provider AZ Outage',
        description: 'Primary datacenter in us-east-1 lost power and cooling. Failover immediately!',
        requiredRemediation: 'FAILOVER_REGION',
      },
    ],
  },
  {
    levelNumber: 5,
    id: 'lvl_05_tier4_datacenter',
    title: 'Level 5: Tier-4 Greenfield Data Center',
    subtitle: 'Construct Physical Racks & Power Resilience',
    lore: 'You are now Principal Infrastructure Architect. Build a 2N Tier-4 Data Center from a bare concrete warehouse floor. Lay server racks, deploy CRAC chillers, and survive a municipal grid blackout using battery UPS and diesel backup.',
    durationSec: 200,
    startingCashMicroCents: 150000000, // $150.00
    starterNodes: [
      { id: 'node_ing_5', type: NodeType.CLIENT_INGRESS, gridX: 100, gridY: 250, name: 'Fiber Backbone' },
      { id: 'node_pod_5', type: NodeType.COMPUTE_POD, gridX: 350, gridY: 250, name: 'Core Compute Rack' },
      { id: 'node_db_5', type: NodeType.DATABASE_SQL, gridX: 550, gridY: 250, name: 'Enterprise DB' },
    ],
    starterConnections: [
      { sourceId: 'node_ing_5', targetId: 'node_pod_5' },
      { sourceId: 'node_pod_5', targetId: 'node_db_5' },
    ],
    starterFacilities: [
      { id: 'fac_rack_01', type: FacilityComponentType.SERVER_RACK_42U, gridX: 2, gridY: 2 },
      { id: 'fac_crac_01', type: FacilityComponentType.CRAC_CHILLER, gridX: 2, gridY: 4 },
      { id: 'fac_ups_01', type: FacilityComponentType.UPS_BATTERY, gridX: 5, gridY: 2 },
    ],
    objectives: {
      durationSec: 200,
      minSlaPercent: 99.0,
      minProcessedRequests: 5000,
      targetCashBonusMicroCents: 180000000, // $180.00 for 3rd star
    },
    scriptedIncidents: [
      {
        triggerAtSec: 40,
        incidentType: 'RACK_FIRE',
        targetComponentId: 'fac_rack_01',
        title: 'Server Rack Thermal Overheat',
        description: 'Server Rack 01 thermal threshold breached 60°C! Hotspot alarm tripping.',
        requiredRemediation: 'EMERGENCY_EXHAUST_PURGE',
      },
      {
        triggerAtSec: 90,
        incidentType: 'GRID_BLACKOUT',
        targetComponentId: 'fac_ups_01',
        title: 'Municipal Power Grid Failure',
        description: 'Grid substation blown! Facility running on UPS battery. Spool up diesel generators before battery exhausts.',
        requiredRemediation: 'START_DIESEL_GENERATOR',
      },
    ],
  },
]);

/**
 * Retrieve configuration for a specific level number (1-5)
 * @param {number} levelNum
 * @returns {Object|null}
 */
export function getLevelConfig(levelNum) {
  return CAMPAIGN_LEVELS.find((lvl) => lvl.levelNumber === levelNum) || null;
}
