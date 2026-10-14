# Implementation Plan: Advanced Infrastructure Components & SRE Chaos Expansion

**Branch**: `002-advanced-infra-chaos` | **Date**: 2026-10-14 | **Spec**: [specs/002-advanced-infra-chaos/spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-advanced-infra-chaos/spec.md`  
**Constitution**: Governed by [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

## Summary

Phase 2 expands the foundational simulation engine by delivering:
1. **6 Advanced Logical Components**: Web Application Firewall (`WAF`), Edge Caching (`CDN`), `API Gateway`, Persistent Message Broker (`MESSAGE_BROKER`), Distributed NoSQL (`NOSQL_DB`), and Cloud Blob Storage (`OBJECT_STORAGE`).
2. **4 Physical Facility Power Components**: Power Distribution Unit (`PDU`), `UPS_BATTERY` bank with dynamic amp/hour discharge equations, `DIESEL_GENERATOR` with fuel burn and spin-up delay, and `CONTAINMENT_DOORS` for thermal aisle isolation (+30% cooling efficiency).
3. **5 Tier 2 & Tier 3 SRE Chaos Incidents**: `VOLUMETRIC_DDOS`, `SQL_INJECTION`, `DATABASE_SPLIT_BRAIN`, `RACK_OVERHEATING_FIRE`, and `POWER_GRID_BLACKOUT`.
4. **Interactive Mobile Incident Actions & Mitigation HUD**: Real-time mitigation actions in `IncidentBar` and `NodeInspector` (DDoS scrubbing activation, SQLi rule filter, Raft quorum trigger, Emergency generator crank, and Hot-aisle exhaust purge).
5. **Mobile Build Drawer Categorization**: Updated multi-tab procurement tray (`Perimeter`, `Compute`, `Data & Queue`, `Facility`) supporting dynamic affordability states and $\ge 48\times 48\text{ dp}$ touch targets.

---

## Technical Context

**Language/Version**: JavaScript ESNext / TypeScript (strict mode)  
**Primary Dependencies**:
- Game Engine: `phaser@^4.2.1`
- Build Tool: `vite@^8.3.4`
- Mobile Runtime: `@capacitor/core@^6.0.0`, `@capacitor/android@^6.0.0`
- Web Server: `nginx:alpine` (multi-stage Docker container)

**Storage**: Local persistent storage (`IndexedDB` + `LocalStorage`) extending [contracts/save-state-schema.json](../001-core-sim-mobile/contracts/save-state-schema.json).  
**Testing**: Native Node.js test runner (`node --test tests/*.test.js`) and 10,000-tick determinism benchmark.  
**Performance Budget**:
- Solid 60 FPS on mobile WebGL viewports with active flame/smoke/shield particle pools.
- Zero floating-point accumulation drift over 10,000 continuous simulation ticks.
- Dynamic UPS discharge math and generator switchover executing within $< 0.1\text{ ms}$ per tick.

---

## Constitution Check

| Principle | Constitution Mandate | Proposed Implementation Plan | Status |
| :--- | :--- | :--- | :---: |
| **I. Decoupled Headless Simulation Core** | Pure TS/JS, zero DOM/Phaser coupling, deterministic resource equations. | All new component math (WAF inspection, CDN cache hits, Kafka queues, UPS discharge) resides in `src/core/sim/` without DOM or Phaser imports. | **PASS** |
| **II. Non-Negotiable Test-First (TDD)** | Automated unit tests and 10,000-tick stress benchmark in `tests/`. | Unit test suites written in `tests/` for every new node type, UPS battery physics, and Tier 2-3 incident before scene integration. | **PASS** |
| **III. Dual-Perspective Presentation Decoupling** | Pub/Sub EventBus & immutable state snapshots between Topology & Facility views. | `TopologyScene` and `FacilityScene` consume state snapshots; mitigation actions trigger via `EventBus.emit(IncidentAction)`. | **PASS** |
| **IV. Mobile Ergonomics & Performance Guardrails** | Landscape locked, $\ge 48 \times 48\text{ dp}$ touch targets, safe-area bounds, WebGL particle pooling for 60 FPS. | Mobile BuildDrawer categorized with 4 dedicated tabs; touch targets meet minimum 48dp threshold; particle pooling extended for flame/shield FX. | **PASS** |
| **V. Spec-Driven Governance & Traceability** | SpecKit SDD workflow (`specify` $\rightarrow$ `plan` $\rightarrow$ `tasks` $\rightarrow$ `implement`). | Governed by `specs/002-advanced-infra-chaos/` artifacts and task list. | **PASS** |

---

## Project Structure

```text
specs/002-advanced-infra-chaos/
├── spec.md                              # Feature specification
├── checklists/
│   └── requirements.md                  # 13/13 validated requirements checklist
├── plan.md                              # This implementation plan
├── research.md                          # Technical research on algorithms & physics
├── data-model.md                        # Component catalog & incident schemas
├── contracts/
│   └── incident-action-contract.json    # EventBus contract for incident mitigation
└── quickstart.md                        # Developer guide for testing and verification
```

---

## Phased Implementation Roadmap

1. **Phase 1: Advanced Logical Simulation (Perimeter & Messaging)**
   - Update `Constants.js` with new `NodeType` enums, pricing, and throughput capacities.
   - Extend `TrafficEngine.js` for WAF inspection latency, CDN edge cache hits, and Message Broker queue buffering ($Q_{\text{depth}}$).
   - Write unit tests in `tests/advanced-nodes.test.js`.

2. **Phase 2: Physical Facility Power & Blackout Engine**
   - Update `Constants.js` with `PDU`, `UPS_BATTERY`, `DIESEL_GENERATOR`, and `CONTAINMENT_DOOR`.
   - Extend `ThermalEngine.js` / create `PowerEngine.js` for UPS battery drain, utility power blackout state, generator spool-up, and fuel consumption.
   - Write unit tests in `tests/power-engine.test.js`.

3. **Phase 3: Tier 2 & Tier 3 SRE Chaos Scenarios**
   - Extend `ChaosDirector.js` with `VOLUMETRIC_DDOS`, `SQL_INJECTION`, `DATABASE_SPLIT_BRAIN`, `RACK_OVERHEATING_FIRE`, and `POWER_GRID_BLACKOUT`.
   - Implement remediation action validators in `SimulationEngine.js`.
   - Write unit tests in `tests/advanced-chaos.test.js`.

4. **Phase 4: Mobile Cockpit & Scene Visual Enhancements**
   - Update `BuildDrawer.js` with 4 categorized tabs (Perimeter, Compute, Data/Queue, Facility) and new icons.
   - Update `IncidentBar.js` and `NodeInspector.js` to render contextual action buttons (Scrub DDoS, Crank Generator, Patch SQLi, Raft Quorum).
   - Add particle effects in `TopologyScene.js` (crimson DDoS drops, WAF laser shield) and `FacilityScene.js` (UPS status bar, rack fire, generator diesel smoke).

5. **Phase 5: Determinism Stress Benchmark & Multi-Target Verification**
   - Extend 10,000-tick benchmark to test blackout recovery, message queuing under load, and WAF filtering without float drift.
   - Verify `npm test`, `npm run build`, Docker container, and Android APK compilation.
