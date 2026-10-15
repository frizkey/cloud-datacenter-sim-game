# Tasks: Production-Grade Game Readiness & Polish

**Feature**: `005-production-grade-readiness`  
**Spec**: [specs/005-production-grade-readiness/spec.md](./spec.md)  
**Plan**: [specs/005-production-grade-readiness/plan.md](./plan.md)  
**Date**: 2026-10-15  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize contracts, asset registries, and shared infrastructure for production readiness.

- [ ] T001 Verify contract schemas and test setup in `specs/005-production-grade-readiness/contracts/`
- [ ] T002 [P] Initialize vector sci-fi glyph assets registry in `src/render/ComponentGlyphs.js`
- [ ] T003 [P] Set up i18n locale dictionary directory and English bundle in `src/locales/en.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core engine primitives and models that MUST be complete before user stories can execute.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Implement `BlueprintCodec.js` in `src/storage/BlueprintCodec.js` adhering to `contracts/blueprint-schema.json`
- [ ] T005 [P] Implement `TechTree.js` engine in `src/core/sim/TechTree.js` adhering to `contracts/tech-tree-schema.json`
- [ ] T006 [P] Implement `ContractManager.js` in `src/core/sim/ContractManager.js` adhering to `contracts/client-contract-schema.json`
- [ ] T007 [P] Implement `CircuitBreaker.js` logic in `src/core/sim/CircuitBreaker.js`
- [ ] T008 Wire event bus subscriptions for new subsystems in `src/core/events/EventBus.js`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Critical Coordinate, Persistence & Manual Wiring Fixes (Priority: P1) 🎯 MVP

**Goal**: Fix CampaignLevels off-screen coordinates, wire StatePersistence auto-save/restore into game lifecycle, and implement interactive manual port-to-port cable wiring.

**Independent Test**: Load Level 1 and verify starter nodes spawn at integer grid cells in center viewport; refresh browser and verify state restores; drag wire from Node A output port to Node B input port and verify orthogonal cable creation.

### Tests for User Story 1 ⚠️
- [ ] T009 [P] [US1] Unit test for CampaignLevels integer coordinates alignment in `tests/campaign-coordinates.test.js`
- [ ] T010 [P] [US1] Unit test for StatePersistence auto-save bootstrap in `tests/state-persistence-bootstrap.test.js`
- [ ] T011 [P] [US1] Unit test for manual port-to-port cable wiring validation in `tests/manual-wiring.test.js`

### Implementation for User Story 1
- [ ] T012 [US1] Fix CampaignLevels 1–5 starter node coordinates from raw pixel numbers ($100, 200$) to integer grid cells ($2 \le x \le 12, 2 \le y \le 8$) in `src/core/sim/CampaignLevels.js`
- [ ] T013 [US1] Wire StatePersistence auto-save (every 30s + on pause) and initial state restoration in `src/main.js`
- [ ] T014 [US1] Implement input and output port interactive target dots on nodes in `src/scenes/TopologyScene.js`
- [ ] T015 [US1] Implement `WIRING_CABLE` state gesture handling in `src/ui/MobileTouchFSM.js`
- [ ] T016 [US1] Implement live orthogonal rubber-band drag cable and drop validation in `src/scenes/TopologyScene.js`

**Checkpoint**: User Story 1 complete and independently testable (MVP milestone).

---

## Phase 4: User Story 2 - Visual Overhaul, Neon Conduits & Visual "Juice" (Priority: P1)

**Goal**: Replace all placeholder system emojis with custom vector blueprint icons, render stepped orthogonal neon conduits with saturation heat tinting, and add floating financial/SLA particle numbers.

**Independent Test**: View nodes on canvas to verify vector blueprint rendering without system emojis; observe packets flowing along 90-degree orthogonal conduits with neon glow; verify floating `+$0.002` text rising on packet completion.

### Implementation for User Story 2
- [ ] T017 [P] [US2] Implement vector canvas blueprint card renderer replacing emojis in `src/render/ComponentGlyphs.js`
- [ ] T018 [US2] Integrate vector sci-fi glyphs into node container rendering in `src/scenes/TopologyScene.js`
- [ ] T019 [US2] Integrate vector sci-fi glyphs into `src/ui/BuildDrawer.js` and `src/ui/NodeInspector.js`
- [ ] T020 [US2] Implement stepped orthogonal Manhattan neon conduits with saturation heat tinting in `src/scenes/TopologyScene.js`
- [ ] T021 [US2] Implement floating financial text particle emitter (`+$0.002`, `-$0.015/s`, `-5% SLA!`) in `src/render/ParticlePool.js` and `src/scenes/TopologyScene.js`
- [ ] T022 [US2] Implement emergency incident strobe beacons and rack smoke particle effects in `src/scenes/TopologyScene.js` and `src/scenes/FacilityScene.js`

**Checkpoint**: User Stories 1 AND 2 both work independently with high visual fidelity.

---

## Phase 5: User Story 3 - Adaptive Dynamic Audio & Spatial Foley (Priority: P1)

**Goal**: Implement a 4-bus Web Audio mixer, dynamic multi-stem adaptive BGM (ambient planning layer vs high-tempo crisis rhythm), spatial datacenter transformer/fan soundscape, and tactile mechanical foley.

**Independent Test**: Adjust volume sliders in SettingsModal to verify independent bus attenuation; trigger incident and verify high-tempo crisis music layers in smoothly without audio clipping.

### Tests for User Story 3 ⚠️
- [ ] T023 [P] [US3] Unit test for 4-bus audio mixing and dynamic incident stems in `tests/adaptive-audio.test.js`

### Implementation for User Story 3
- [ ] T024 [US3] Implement 4-bus mixer architecture (Master, Music, SFX, Ambience) in `src/core/audio/AudioManager.js`
- [ ] T025 [US3] Implement multi-stem adaptive BGM with smooth gain cross-fading based on traffic RPS and incident state in `src/core/audio/AudioManager.js`
- [ ] T026 [US3] Implement spatial datacenter fan airflow and transformer hum foley in `src/core/audio/AudioManager.js`
- [ ] T027 [US3] Implement tactile mechanical foley for node placement, cable connect/cut, and alarm klaxons in `src/core/audio/AudioManager.js`
- [ ] T028 [US3] Update audio settings sliders in `src/ui/modals/SettingsModal.js` and persist to `src/core/audio/AudioSettings.js`

**Checkpoint**: User Stories 1, 2, and 3 provide full audiovisual and tactile immersion.

---

## Phase 6: User Story 4 - SRE Research Tech Tree & Enterprise RFPs (Priority: P2)

**Goal**: Implement an SRE Research Lab with 4 eras of technology progression, and Client Enterprise RFPs with real-time SLA verification and bonus/penalty mechanics.

**Independent Test**: Unlock Cloud-Native Era in Research Lab modal and verify WAF/CDN appear in BuildDrawer; accept NeoVault contract and verify bonus revenue stream while meeting SLA requirements.

### Tests for User Story 4 ⚠️
- [ ] T029 [P] [US4] Unit test for SRE Tech Tree research progression in `tests/tech-tree.test.js`
- [ ] T030 [P] [US4] Unit test for Client Enterprise RFP contract evaluation in `tests/client-contracts.test.js`

### Implementation for User Story 4
- [ ] T031 [US4] Implement 4-era research tech tree state machine in `src/core/sim/TechTree.js`
- [ ] T032 [US4] Implement ClientContract manager with real-time SLA verification and payout/penalty loops in `src/core/sim/ContractManager.js`
- [ ] T033 [US4] Implement Research Lab modal UI in `src/ui/modals/TechTreeModal.js`
- [ ] T034 [US4] Implement Enterprise RFPs & Service Contracts modal UI in `src/ui/modals/ContractModal.js`
- [ ] T035 [US4] Integrate tech tree unlock gating into `src/ui/BuildDrawer.js` and Cockpit HUD buttons in `src/ui/CockpitHUD.js`

**Checkpoint**: Deep tycoon progression and client contract gameplay fully operational.

---

## Phase 7: User Story 5 - Interactive APM Observability & Forensic Triage (Priority: P2)

**Goal**: Implement an interactive APM Observability dashboard with P95/P99 latency histograms, 4xx/5xx status codes, and forensic root-cause remediation linking engineering actions to incident resolution.

**Independent Test**: Trigger Cache Stampede incident, open APM dashboard, verify 100% DB IOPS and 0% cache hit, deploy read replica and pre-warm cache, and confirm telemetry recovery.

### Tests for User Story 5 ⚠️
- [ ] T036 [P] [US5] Unit test for APM rolling window metrics and forensic remediation in `tests/apm-telemetry.test.js`

### Implementation for User Story 5
- [ ] T037 [US5] Implement 60-second rolling telemetry ring buffer (P95/P99 latency, 4xx/5xx status codes) in `src/core/sim/TrafficEngine.js`
- [ ] T038 [US5] Implement APM Dashboard modal UI with latency histogram and error distribution in `src/ui/modals/APMDashboardModal.js`
- [ ] T039 [US5] Connect forensic triage actions (scaling replicas, cache pre-warming, WAF ruleset updates) to live incident recovery in `src/core/sim/ChaosDirector.js`
- [ ] T040 [US5] Add APM quick-access button to Cockpit HUD in `src/ui/CockpitHUD.js`

**Checkpoint**: Forensic incident triage replaces simplistic 1-click remediation.

---

## Phase 8: User Story 6 - Mobile Ergonomics, Radial Context Menu & Screen Budgeting (Priority: P2)

**Goal**: Implement a compact radial touch menu on node selection, auto-collapse bottom drawer during incidents, apply notch safe-area boundaries, and add colorblind accessibility shape coding.

**Independent Test**: Tap node on mobile viewport and verify radial action wheel appears; trigger incident and verify BuildDrawer auto-collapses; test notch padding on narrow landscape screens.

### Tests for User Story 6 ⚠️
- [ ] T041 [P] [US6] Unit test for radial touch menu state and safe area constraints in `tests/radial-menu.test.js`

### Implementation for User Story 6
- [ ] T042 [US6] Implement compact radial touch context menu component in `src/ui/RadialTouchMenu.js`
- [ ] T043 [US6] Wire radial context menu on node tap in `src/scenes/TopologyScene.js` (Restart, Scale, Cut Cable, Inspect, Delete)
- [ ] T044 [US6] Implement auto-collapse of bottom BuildDrawer when emergency incident alerts appear in `src/ui/BuildDrawer.js` and `src/ui/IncidentBar.js`
- [ ] T045 [US6] Add notch safe-area inset rules (`env(safe-area-inset-*)`) and colorblind shape indicators in `src/style.css`
- [ ] T046 [US6] Implement i18n locale string resolver in `src/locales/i18n.js` and update UI modals

**Checkpoint**: Mobile touch ergonomics and accessibility validated across small landscape viewports.

---

## Phase 9: User Story 7 - Advanced Simulation Realism & Resilience Patterns (Priority: P2)

**Goal**: Categorize packets into realistic workloads (Static CDN, API Reads, API Writes with DB locks, Async Kafka jobs, Cyber attacks) and implement HPA autoscaling and Circuit Breakers.

**Independent Test**: Send write-heavy traffic and verify primary DB connection pool exhaustion; simulate service outage and verify Circuit Breaker trips open with fast-fail fallback responses.

### Tests for User Story 7 ⚠️
- [ ] T047 [P] [US7] Unit test for multi-workload traffic packets and circuit breaker trips in `tests/workload-resilience.test.js`

### Implementation for User Story 7
- [ ] T048 [US7] Implement multi-workload packet routing (Static CDN, API Reads, API Writes with DB locks, Async Kafka jobs, Cyber attacks) in `src/core/sim/TrafficEngine.js`
- [ ] T049 [US7] Implement Horizontal Pod Autoscaler (HPA) logic with configurable CPU/queue thresholds in `src/core/sim/SimulationEngine.js`
- [ ] T050 [US7] Implement Circuit Breaker state machine (Closed, Open, Half-Open) in `src/core/sim/CircuitBreaker.js` and wire into Gateway nodes
- [ ] T051 [US7] Simulate Multi-AZ replication lag and cross-zone egress cost in `src/core/sim/SimulationEngine.js`

**Checkpoint**: Advanced architectural simulation delivers authentic SRE depth.

---

## Phase 10: User Story 8 - Multi-Slot Saves, Blueprint Strings & Web Worker Decoupling (Priority: P2)

**Goal**: Implement multi-slot save manager, *Factorio*-style Base64 architecture blueprint export/import, and decouple the 60 Hz simulation loop into a Web Worker.

**Independent Test**: Export an architecture to Base64 blueprint string, paste into another slot, and confirm exact topology recreation; verify locked 60 FPS under 5,000 packets.

### Tests for User Story 8 ⚠️
- [ ] T052 [P] [US8] Unit test for Base64 blueprint string export/import roundtrip in `tests/blueprint-codec.test.js`

### Implementation for User Story 8
- [ ] T053 [US8] Implement Base64 architecture blueprint encoder and decoder in `src/storage/BlueprintCodec.js`
- [ ] T054 [US8] Add Blueprint Export and Import modal UI in `src/ui/modals/BlueprintModal.js`
- [ ] T055 [US8] Implement multi-slot save manager (Slot 1, Slot 2, Slot 3, Auto-save) in `src/storage/StatePersistence.js`
- [ ] T056 [US8] Decouple 60 Hz simulation tick loop into Web Worker module in `src/core/sim/SimWorker.js`

**Checkpoint**: Blueprint sharing and multi-slot persistence complete.

---

## Phase 11: User Story 9 - Platform Compliance & App Store Publishing Readiness (Priority: P3)

**Goal**: Implement 100% offline Service Worker PWA caching, configure Android adaptive icons and target SDK 34, and verify store package readiness.

**Independent Test**: Disconnect network in browser and verify full game loads and runs offline; run `npx cap sync android` and verify clean compilation.

### Implementation for User Story 9
- [ ] T057 [P] [US9] Create offline Service Worker script (`public/sw.js`) caching core assets for 100% offline flight mode
- [ ] T058 [US9] Register Service Worker in `src/main.js` with offline indicator toast
- [ ] T059 [US9] Configure Android adaptive launcher icons, dark splash screens, and target SDK 34 in `android/`
- [ ] T060 [US9] Verify production Capacitor Android sync via `npx cap sync android` and create release build verification script

**Checkpoint**: Title is compliant and ready for Google Play, App Store, and PWA distribution.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: System-wide hardening, stress testing, documentation, and final release verification.

- [ ] T061 [P] Update user documentation and game manual in `docs/`
- [ ] T062 Run 10,000-tick headless stress benchmark in `tests/stress-sim.benchmark.js` to verify zero float-point drift
- [ ] T063 [P] Full end-to-end integration test of all 9 user stories in `tests/production-readiness.test.js`
- [ ] T064 Execute full test suite `npm test` and production Vite build `npm run build`
- [ ] T065 Validate complete quickstart verification guide in `specs/005-production-grade-readiness/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Independent - starts immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all User Stories.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2 - Highest priority P1.
- **User Story 2 (Phase 4)**: Depends on Phase 2 & US1 (renders on top of corrected coordinates).
- **User Story 3 (Phase 5)**: Depends on Phase 2 - Audio can proceed in parallel with US2.
- **User Story 4 (Phase 6)**: Depends on Phase 2 & US1 (Tech tree gates component procurement).
- **User Story 5 (Phase 7)**: Depends on Phase 2 & US1 (APM observability tracks active nodes).
- **User Story 6 (Phase 8)**: Depends on US1 & US2 (Radial menu targets visual nodes).
- **User Story 7 (Phase 9)**: Depends on US1 (Routing & HPA scale active nodes).
- **User Story 8 (Phase 10)**: Depends on US1 (Blueprints serialize topology graph).
- **User Story 9 (Phase 11)**: Depends on US1, US2, US3 (Packaged build includes assets).
- **Polish (Phase 12)**: Depends on all user stories completed.

---

## Parallel Example: User Story 1 (MVP)

```bash
# Launch test tasks in parallel:
Task: "Unit test for CampaignLevels integer coordinates alignment in tests/campaign-coordinates.test.js"
Task: "Unit test for StatePersistence auto-save bootstrap in tests/state-persistence-bootstrap.test.js"
Task: "Unit test for manual port-to-port cable wiring validation in tests/manual-wiring.test.js"

# Launch implementation in parallel:
Task: "Fix CampaignLevels 1–5 starter node coordinates in src/core/sim/CampaignLevels.js"
Task: "Wire StatePersistence auto-save in src/main.js"
Task: "Implement WIRING_CABLE state gesture handling in src/ui/MobileTouchFSM.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phase 1: Setup & Phase 2: Foundational.
2. Complete Phase 3: User Story 1 (Campaign level coordinates, StatePersistence auto-save, manual port wiring).
3. **STOP and VALIDATE**: Run `npm test`, test Level 1 launch and manual wiring in browser.
4. Deploy to Coolify as MVP release.

### Incremental Delivery
1. Foundation + US1 (MVP!)
2. Add US2 (Vector sci-fi cards, neon conduits, floating finance text)
3. Add US3 (Multi-stem adaptive BGM, spatial foley, 4-bus mixer)
4. Add US4 + US5 (Tech Tree, RFPs, APM observability dashboard)
5. Add US6 + US7 (Radial touch menu, HPA, Circuit breakers)
6. Add US8 + US9 (Blueprints, offline PWA, Android release packaging)
7. Final Polish & Stress Benchmarking
