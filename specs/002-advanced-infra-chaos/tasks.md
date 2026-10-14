# Tasks: Advanced Infrastructure Components & SRE Chaos Expansion

**Feature Branch**: `002-advanced-infra-chaos`  
**Input**: [specs/002-advanced-infra-chaos/spec.md](./spec.md) and [specs/002-advanced-infra-chaos/plan.md](./plan.md)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup & Foundational Catalog Constants

**Purpose**: Establish catalog definitions, enums, pricing, and schemas for new logical and physical infrastructure.

- [ ] T001 [P] [US1] Extend `src/core/sim/Constants.js` with `WAF`, `CDN`, `API_GATEWAY`, `MESSAGE_BROKER`, `NOSQL_DB`, and `OBJECT_STORAGE` catalog entries per data-model.md
- [ ] T002 [P] [US2] Extend `src/core/sim/Constants.js` with `PDU`, `UPS_BATTERY`, `DIESEL_GENERATOR`, and `CONTAINMENT_DOOR` catalog entries
- [ ] T003 [P] [US4] Extend `src/core/sim/Constants.js` with Tier 2 and Tier 3 incident types (`VOLUMETRIC_DDOS`, `SQL_INJECTION`, `DATABASE_SPLIT_BRAIN`, `RACK_OVERHEATING_FIRE`, `POWER_GRID_BLACKOUT`)
- [ ] T004 [US1] Create unit test suite `tests/advanced-nodes.test.js` covering catalog integrity and node instantiation

---

## Phase 2: User Story 1 - Advanced Logical Perimeter & Caching (Priority: P1) 🎯 MVP

**Goal**: Deliver WAF malicious payload inspection, CDN edge cache hit offloading, and API Gateway rate limiting.

### Tests for User Story 1
- [ ] T005 [P] [US1] Add test for WAF attack packet dropping and +4ms latency overhead in `tests/advanced-nodes.test.js`
- [ ] T006 [P] [US1] Add test for CDN 85% cache hit probability bypassing origin compute/DB in `tests/advanced-nodes.test.js`
- [ ] T007 [P] [US1] Add test for API Gateway token bucket rate limiting (HTTP 429) in `tests/advanced-nodes.test.js`

### Implementation for User Story 1
- [ ] T008 [US1] Update `src/core/sim/TrafficEngine.js` to process WAF nodes (drop `ATTACK_SQLI` / `ATTACK_DDOS`, record `blockedAttacksCount`)
- [ ] T009 [US1] Update `src/core/sim/TrafficEngine.js` to process CDN nodes (intercept cacheable GET packets with $P_{\text{Hit}} = 0.85$, return with 12ms latency)
- [ ] T010 [US1] Update `src/core/sim/TrafficEngine.js` to process API Gateway nodes (enforce token bucket rate limiting, emit 429 drops on overflow)
- [ ] T011 [US1] Verify T005, T006, T007 pass with `node --test tests/advanced-nodes.test.js`

---

## Phase 3: User Story 2 - Physical Facility Power & Blackout Survival (Priority: P1)

**Goal**: Implement PDU breakers, UPS battery discharge equations, backup diesel generator startup, and containment cooling bonuses.

### Tests for User Story 2
- [ ] T012 [P] [US2] Create unit test suite `tests/power-engine.test.js` verifying UPS battery discharge math under electrical load
- [ ] T013 [P] [US2] Add test in `tests/power-engine.test.js` verifying diesel generator 3-second (180-tick) spool-up and fuel consumption
- [ ] T014 [P] [US2] Add test in `tests/power-engine.test.js` verifying total facility shutdown when mains power is cut and batteries reach 0 kWh

### Implementation for User Story 2
- [ ] T015 [US2] Implement `src/core/sim/PowerEngine.js` to manage electrical grid state, PDU loads, UPS charge depletion, and diesel generation
- [ ] T016 [US2] Integrate `PowerEngine.js` into `src/core/sim/SimulationEngine.js` tick loop
- [ ] T017 [US2] Update `src/core/sim/ThermalEngine.js` to apply 30% cooling efficiency bonus when `CONTAINMENT_DOOR` is adjacent to racks
- [ ] T018 [US2] Verify T012, T013, T014 pass with `node --test tests/power-engine.test.js`

---

## Phase 4: User Story 3 - Asynchronous Messaging & Distributed Data Storage (Priority: P2)

**Goal**: Deliver persistent queue buffers (Kafka) and sharded NoSQL / Object Storage IOPS handling.

### Tests for User Story 3
- [ ] T019 [P] [US3] Add test for Message Broker leaky-bucket buffering and 504 drops on buffer overflow in `tests/advanced-nodes.test.js`
- [ ] T020 [P] [US3] Add test for NoSQL sharded IOPS and Object Storage egress billing in `tests/advanced-nodes.test.js`

### Implementation for User Story 3
- [ ] T021 [US3] Update `src/core/sim/TrafficEngine.js` to buffer requests in `MESSAGE_BROKER` nodes and drain to downstream consumer pods
- [ ] T022 [US3] Update `src/core/sim/EconomicEngine.js` to account for Object Storage egress bandwidth costs
- [ ] T023 [US3] Verify T019 and T020 pass with `node --test tests/advanced-nodes.test.js`

---

## Phase 5: User Story 4 - Tier 2 & Tier 3 SRE Chaos Scenarios & Active Triage (Priority: P2)

**Goal**: Implement Tier 2 and Tier 3 incidents with authentic interactive mitigation commands.

### Tests for User Story 4
- [ ] T024 [P] [US4] Create unit test suite `tests/advanced-chaos.test.js` verifying injection and remediation of `VOLUMETRIC_DDOS` and `SQL_INJECTION`
- [ ] T025 [P] [US4] Add test in `tests/advanced-chaos.test.js` verifying `DATABASE_SPLIT_BRAIN` quorum recovery
- [ ] T026 [P] [US4] Add test in `tests/advanced-chaos.test.js` verifying `POWER_GRID_BLACKOUT` and `RACK_OVERHEATING_FIRE` mitigation actions

### Implementation for User Story 4
- [ ] T027 [US4] Extend `src/core/sim/ChaosDirector.js` with generators for Tier 2 and Tier 3 incidents
- [ ] T028 [US4] Implement remediation action handlers in `src/core/sim/SimulationEngine.js` responding to `contracts/incident-action-contract.json`
- [ ] T029 [US4] Verify T024, T025, T026 pass with `node --test tests/advanced-chaos.test.js`

---

## Phase 6: User Story 5 - Mobile Cockpit Catalog & Visual Presentation (Priority: P3)

**Goal**: Update mobile touch UI drawers, contextual inspectors, and Phaser scene visual feedback for new infrastructure.

### Implementation for User Story 5
- [ ] T030 [US5] Update `src/ui/BuildDrawer.js` with 4 categorized tabs (`Perimeter`, `Compute`, `Data & Queue`, `Facility`) and new catalog items
- [ ] T031 [US5] Update `src/ui/IncidentBar.js` to display contextual remediation action buttons (e.g. "Scrub DDoS", "Start Generator", "Raft Quorum")
- [ ] T032 [US5] Update `src/ui/NodeInspector.js` to show component-specific telemetry (WAF blocked attacks, CDN hit rate, UPS runtime remaining)
- [ ] T033 [US5] Update `src/scenes/TopologyScene.js` to render crimson particle drops on WAF block and queue depth gauges on Kafka nodes
- [ ] T034 [US5] Update `src/scenes/FacilityScene.js` to render UPS battery charge bars, diesel generator animations, and rack fire smoke

---

## Phase 7: Determinism Stress Benchmark & Multi-Target Verification

**Purpose**: Rigorous cross-platform validation and non-regression verification.

- [ ] T035 Extend `tests/stress-sim.benchmark.js` with active WAF, CDN, Kafka, and blackout scenarios across 10,000 ticks with zero float drift
- [ ] T036 Run full unit test suite `node --test tests/*.test.js` and verify 100% green tests
- [ ] T037 Run `npm run build` to verify clean production bundle in `dist/`
- [ ] T038 Verify Docker container build with `Dockerfile`
- [ ] T039 Update `STATE.md` with Phase 2 progress, test results, and next steps
