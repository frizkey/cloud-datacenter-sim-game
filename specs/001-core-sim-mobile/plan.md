# Implementation Plan: Core Simulation Engine & Mobile Cockpit

**Branch**: `001-core-sim-mobile` | **Date**: 2026-10-14 | **Spec**: [specs/001-core-sim-mobile/spec.md](./spec.md)

**Input**: Feature specification from `specs/001-core-sim-mobile/spec.md`  
**Constitution**: Governed by [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

## Summary

Phase 1 delivers the foundational MVP for the Cloud & Data Center Simulation Game. The implementation establishes:
1. A **decoupled, headless simulation engine** in pure TypeScript (`src/core/sim/`) operating at a fixed 60 ticks/s, executing the four core resource flow equations (Total Latency, Heat BTU, PUE, and Net Cashflow) and the 10-incident chaos director.
2. A **mobile-first dual-perspective visual canvas** in Phaser 4 (`TopologyScene` for 2D logical packet routing and `FacilityScene` for 2.5D isometric data center floor grids).
3. A **touchscreen-optimized glassmorphic cockpit** enforcing landscape orientation, split dual-thumb comfort zones, $\ge 48 \times 48\text{ dp}$ touch targets, safe-area boundary protection, and the 30-second Day-1 onboarding walkthrough.
4. A **multi-target deployment pipeline** supporting Coolify web containerization for testing, Capacitor for Android APK/AAB release, and a dual PWA / macOS CI strategy for iOS.

---

## Technical Context

**Language/Version**: JavaScript ESNext / TypeScript (strict mode)  
**Primary Dependencies**:
- Game Engine: `phaser@^4.2.1`
- Build Tool: `vite@^8.3.4`
- Mobile Runtime: `@capacitor/core@^6.0.0`, `@capacitor/android@^6.0.0`, `@capacitor/ios@^6.0.0`
- Web Server: `nginx:alpine` (Docker multi-stage runner)

**Storage**: Local persistent storage (`IndexedDB` via lightweight idb keyval + `LocalStorage` fallback) adhering to [contracts/save-state-schema.json](./contracts/save-state-schema.json).  
**Testing**: Native Node.js test runner (`node --test tests/*.test.js`) for unit tests and headless simulation stress benchmarks (`tests/stress-sim.benchmark.js`).  
**Target Platform**:
- Web Preview & Staging: Modern desktop/mobile browsers deployed on Coolify.
- Mobile Native: Android 8.0+ (API 26+) via Capacitor APK/AAB.
- iOS: Standalone full-screen PWA via Coolify URL + Capacitor Xcode project for remote macOS CI.

**Project Type**: Mobile Game / HTML5 Web Game / Native Mobile Hybrid.  
**Performance Goals**:
- Locked 60 FPS on mobile WebGL viewports.
- Support up to 3,000 concurrent packet particles in flight using object pooling.
- Viewport transition between Topology and Facility views in $< 100\text{ ms}$.
- Headless 10,000-tick stress benchmark completed in $< 1,500\text{ ms}$.

**Constraints**:
- Strict landscape orientation lock (16:9 / 20:9).
- Minimum interactive touch target size: $48 \times 48\text{ dp}$ ($\ge 9\text{mm}$).
- Safe-area insets padding (`env(safe-area-inset-*)`) clearing all device notches and home indicator bars.
- Zero forced interstitial advertisements or conference presentation cheats.

**Scale/Scope**:
- 11 Logical Infrastructure Node types.
- 6 Physical Facility Component types.
- 10 Chaos Incident Scenarios across 4 difficulty tiers.
- 1 Career Sandbox Region with 30-second guided Day-1 tutorial.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

| Principle | Constitution Mandate | Proposed Implementation Plan | Status |
| :--- | :--- | :--- | :---: |
| **I. Decoupled Headless Simulation Core** | Pure TS/JS, zero DOM/Phaser coupling, deterministic resource flow equations. | All simulation math resides in `src/core/sim/` (`TrafficEngine`, `ThermalEngine`, `EconomicEngine`, `ChaosDirector`, `EventBus`). Zero imports of DOM or Phaser. | **PASS** |
| **II. Non-Negotiable Test-First (TDD)** | Automated unit tests and 10,000-tick stress benchmark in `tests/`. | Pure Node.js unit tests in `tests/` verify every equation, node transition, and incident trigger before scene integration. | **PASS** |
| **III. Dual-Perspective Presentation Decoupling** | Pub/Sub EventBus & immutable state snapshots between Topology & Facility views. | `TopologyScene` (2D) and `FacilityScene` (2.5D) subscribe to engine snapshots via [contracts/engine-event-contract.json](./contracts/engine-event-contract.json). Neither scene mutates sim state directly. | **PASS** |
| **IV. Mobile Ergonomics & Performance Guardrails** | Landscape locked, $\ge 48 \times 48\text{ dp}$ touch targets, safe-area bounds, WebGL particle pooling for 60 FPS. | UI overlays built with responsive CSS Flex/Grid honoring safe-area insets. Particle pooling manages up to 5,000 recycled sprites. | **PASS** |
| **V. Spec-Driven Governance & Traceability** | SpecKit SDD workflow (`specify` $\rightarrow$ `plan` $\rightarrow$ `tasks` $\rightarrow$ `implement`). | All artifacts tracked in `specs/001-core-sim-mobile/`. Tasks will follow in `tasks.md`. | **PASS** |

---

## Project Structure

### Documentation (`specs/001-core-sim-mobile/`)

```text
specs/001-core-sim-mobile/
├── spec.md                          # Feature specification & requirements
├── checklists/
│   └── requirements.md              # 16/16 validated specification checklist
├── plan.md                          # This file (implementation plan & architecture)
├── research.md                      # Technical decisions, options & rationales
├── data-model.md                    # Domain entities, schemas & state machine
├── contracts/
│   ├── engine-event-contract.json   # Pub/Sub EventBus event schemas
│   └── save-state-schema.json       # State snapshot serialization schema
├── quickstart.md                    # Runnable verification & deployment guide
└── tasks.md                         # Dependency-ordered TDD tasks (Phase 2 output)
```

### Source Code (`src/` and `tests/`)

```text
src/
├── core/
│   ├── events/
│   │   └── EventBus.js              # Decoupled Pub/Sub event dispatcher
│   └── sim/
│       ├── SimulationEngine.js      # Main fixed-timestep tick accumulator
│       ├── TrafficEngine.js         # Packet flow, routing, and latency math
│       ├── ThermalEngine.js         # Power consumption, heat BTU, and PUE math
│       ├── EconomicEngine.js        # Cashflow, OPEX bills, and SLA reputation
│       └── ChaosDirector.js         # 10-tier incident spawner and triage logic
├── render/
│   ├── IsoMath.js                   # 2.5D Isometric projection & raycasting math
│   └── ParticlePool.js              # Pre-allocated request packet sprite pool
├── scenes/
│   ├── BootScene.js                 # Asset preloader and cache initialization
│   ├── TopologyScene.js             # 2D logical cloud routing canvas
│   └── FacilityScene.js             # 2.5D isometric data center floor grid
├── ui/
│   ├── MobileTouchFSM.js            # Pan, pinch-zoom, and hold-drag gesture state machine
│   ├── CockpitHUD.js                # Top metrics bar & view toggle pill
│   ├── BuildDrawer.js               # Collapsible bottom hardware procurement palette
│   └── IncidentBar.js               # Emergency triage banner and quick remediations
├── storage/
│   └── StatePersistence.js          # IndexedDB serialization and offline catch-up
├── main.js                          # Phaser 4 game instance bootstrapper
└── style.css                        # Glassmorphic mobile HUD styles & safe-area insets

tests/
├── economic-engine.test.js          # Unit tests for cashflow, billing, and SLA penalties
├── thermal-engine.test.js           # Unit tests for BTU heat generation and PUE ratio
├── traffic-engine.test.js           # Unit tests for packet latency and queue overflow
├── chaos-director.test.js           # Unit tests for incident trigger & triage state transitions
└── stress-sim.benchmark.js          # 10,000-tick headless simulation benchmark

capacitor.config.json                # Capacitor configuration for mobile native builds
Dockerfile                           # Multi-stage build for Coolify web deployment
```

---

## Complexity Tracking

*No constitutional violations detected. All modules adhere strictly to decoupled headless testing and mobile performance standards.*
