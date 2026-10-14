# Data Model: Advanced Components, Power Infrastructure & Chaos Incidents

**Feature**: `002-advanced-infra-chaos`  
**Date**: 2026-10-14  

---

## 1. Logical Component Catalog Specifications

```typescript
export interface WAFNode extends InfrastructureNode {
  type: 'WAF';
  cost: 1500;
  opexPerSec: 0.08;
  maxRps: 25000;
  inspectionLatencyMs: 4;
  blockedAttacksCount: number;
  isShieldActive: boolean;
}

export interface CDNNode extends InfrastructureNode {
  type: 'CDN';
  cost: 2000;
  opexPerSec: 0.10;
  maxRps: 100000;
  cacheHitProbability: 0.85;
  edgeLatencyMs: 12;
  cacheHitsCount: number;
}

export interface ApiGatewayNode extends InfrastructureNode {
  type: 'API_GATEWAY';
  cost: 1200;
  opexPerSec: 0.05;
  maxRps: 15000;
  rateLimitPerSec: 5000;
  throttledRequestsCount: number;
}

export interface MessageBrokerNode extends InfrastructureNode {
  type: 'MESSAGE_BROKER';
  cost: 1800;
  opexPerSec: 0.09;
  bufferCapacity: 50000;
  currentQueueDepth: number;
  drainRatePerSec: 2500;
}

export interface NoSqlDbNode extends InfrastructureNode {
  type: 'NOSQL_DB';
  cost: 2500;
  opexPerSec: 0.15;
  maxIops: 25000;
  shardCount: 3;
}

export interface ObjectStorageNode extends InfrastructureNode {
  type: 'OBJECT_STORAGE';
  cost: 1000;
  opexPerSec: 0.04;
  egressCostPerMB: 0.00005;
}
```

---

## 2. Physical Facility Component Catalog Specifications

```typescript
export interface PduComponent extends FacilityComponent {
  type: 'PDU';
  cost: 800;
  maxKw: 50;
  efficiency: 0.98;
  isBreakerTripped: boolean;
}

export interface UpsBatteryComponent extends FacilityComponent {
  type: 'UPS_BATTERY';
  cost: 2200;
  capacityKwh: 120;
  currentChargeKwh: 120;
  dischargeRateKw: number;
  runtimeSecondsRemaining: number;
}

export interface DieselGeneratorComponent extends FacilityComponent {
  type: 'DIESEL_GENERATOR';
  cost: 4500;
  outputKw: 150;
  fuelLiters: 500;
  fuelBurnRatePerSec: 0.05;
  isRunning: boolean;
  spoolUpTicksRemaining: number; // 180 ticks = 3.0s
}

export interface ContainmentDoorComponent extends FacilityComponent {
  type: 'CONTAINMENT_DOOR';
  cost: 600;
  coolingBonus: 0.30;
}
```

---

## 3. Tier 2 & Tier 3 Incident Definitions

```typescript
export type IncidentType =
  // Tier 1 (Existing Phase 1)
  | 'MEMORY_LEAK_POD_CRASH'
  | 'FLASH_SALE_SPIKE'
  | 'CACHE_STAMPEDE'
  | 'PHYSICAL_RACK_OVERHEAT'
  // Tier 2 (Phase 2 Additions)
  | 'VOLUMETRIC_DDOS'
  | 'SQL_INJECTION'
  // Tier 3 (Phase 2 Additions)
  | 'DATABASE_SPLIT_BRAIN'
  | 'RACK_OVERHEATING_FIRE'
  | 'POWER_GRID_BLACKOUT';

export interface IncidentRemediationAction {
  incidentId: string;
  actionType:
    | 'ENABLE_DDOS_SHIELD'
    | 'DEPLOY_WAF_RULESET'
    | 'TRIGGER_RAFT_QUORUM'
    | 'START_DIESEL_GENERATOR'
    | 'EMERGENCY_EXHAUST_PURGE'
    | 'RESTART_NODE';
  targetComponentId?: string;
}
```
