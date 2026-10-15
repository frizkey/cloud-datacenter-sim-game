# Implementation Plan: Production-Grade Game Readiness & Polish

**Branch**: `005-production-grade-readiness` | **Date**: 2026-10-15 | **Spec**: [specs/005-production-grade-readiness/spec.md](./spec.md)

**Input**: Feature specification from `specs/005-production-grade-readiness/spec.md` and deep gap analysis from `docs/PRODUCTION_GRADE_GAP_ANALYSIS.md`.

---

## Summary

This feature transitions the **Cloud & Data Center Simulation Game** from an advanced technical prototype into a commercial, production-ready web and mobile game. The plan resolves all 3 critical P0 blockers (CampaignLevel off-screen coordinate bug, unwired StatePersistence auto-save bootstrap, and manual port-to-port cable wiring), overhauls audiovisual fidelity (vector blueprint cards replacing emojis, neon orthogonal conduit shaders, floating financial numbers, multi-stem adaptive BGM, spatial mechanical foley), introduces a deep meta-game (SRE Tech Tree progression and client enterprise RFPs), optimizes mobile touch ergonomics (radial context menus and safe-area boundaries), and ensures publishing compliance (100% offline PWA Service Worker caching and Android AAB packaging).

---

## Technical Context

**Language/Version**: JavaScript (ESNext, Node.js 20+), HTML5 Canvas/WebGL, CSS3 Glassmorphism  
**Primary Dependencies**: Phaser 4 (`phaser@4.2.1`), Vite 8, `@capacitor/core`, `@capacitor/android`, `@capacitor/haptics`, `@capacitor/app`  
**Storage**: `StatePersistence.js` (LocalStorage / IndexedDB with schema validation adhering to `save-state-schema.json`, supporting multi-slot saves and 8-hour offline catch-up)  
**Testing**: Native Node.js test runner (`node:test`, `node:assert/strict`), headless deterministic simulation benchmarks, 10,000-tick float-point drift validation  
**Target Platform**: Mobile (iOS Safari PWA, Android Capacitor APK/AAB target SDK 34+), Desktop Web (Chrome, Safari, Firefox, Edge), Desktop PWA  
**Project Type**: 2D/2.5D Dual-Perspective Real-Time Simulation & Automation Tycoon  
**Performance Goals**: Locked 60 FPS on mobile WebGL; 5,000 active concurrent data request particles processed in $< 2.0\text{ms}$ per frame  
**Constraints**: Locked Landscape orientation (16:9 / 20:9), $\ge 48 \times 48\text{ dp}$ touch target ergonomics, $< 60\text{MB}$ memory footprint, 100% offline-capable flight mode  
**Scale/Scope**: 13 logical cloud components, 6 facility physical components, 4-era research tech tree, 5 campaign missions, endless survival mode, chaos lab sandbox, 10-tier incident catalog  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I: Decoupled Headless Simulation Core**: All game physics (TrafficEngine, EconomicEngine, ThermalEngine, PowerEngine, ChaosDirector, TechTreeEngine, ContractManager) reside in pure JS modules (`src/core/sim/`) with zero Phaser or DOM coupling. Verified via headless unit tests.
- [x] **Principle II: Test-First & Deterministic Verification**: Every new engine module and contract has dedicated automated tests in `tests/`. 10,000-tick simulation runs verify zero floating-point drift or memory leaks.
- [x] **Principle III: Dual-Perspective Presentation Decoupling**: Visual scenes (`TopologyScene` and `FacilityScene`) render state from immutable snapshots and communicate with the engine strictly through the Pub/Sub `EventBus`.
- [x] **Principle IV: Mobile Ergonomics & Performance Guardrails**: Locked landscape orientation, dual-thumb control zone, safe-area boundary protection (`env(safe-area-inset-*)`), and hardware-accelerated particle pooling to lock 60 FPS.
- [x] **Principle V: Spec-Driven Governance & Traceability**: Feature progresses strictly via SpecKit (`specify` $\rightarrow$ `plan` $\rightarrow$ `tasks` $\rightarrow$ `implement`), referencing design documents and gap analysis.

*Result*: **PASSED with ZERO VIOLATIONS**.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-production-grade-readiness/
├── spec.md                  # Feature Specification
├── plan.md                  # This Implementation Plan
├── research.md              # Phase 0 Technical Research
├── data-model.md            # Phase 1 Data Models & Schemas
├── quickstart.md            # Phase 1 Verification Guide
├── checklists/
│   └── requirements.md      # Specification Quality Checklist
├── contracts/
│   ├── tech-tree-schema.json          # SRE Tech Tree JSON Schema
│   ├── client-contract-schema.json    # Enterprise RFPs & Contracts JSON Schema
│   └── blueprint-schema.json          # Factorio-Style Blueprint JSON Schema
└── tasks.md                 # Phase 2 Work Breakdown (/speckit-tasks output)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── audio/
│   │   ├── AudioManager.js          # Enhanced 4-bus mixer & multi-stem adaptive BGM
│   │   └── AudioSettings.js         # Master, Music, SFX, Ambience settings persistence
│   ├── events/
│   │   └── EventBus.js              # Decoupled Pub/Sub event bus
│   ├── haptics/
│   │   └── HapticsManager.js        # Capacitor haptics engine
│   ├── mobile/
│   │   └── MobileLifecycle.js       # Backgrounding, back button, auto-save triggers
│   ├── sim/
│   │   ├── CampaignLevels.js        # Corrected integer grid coordinates (P0 bug fix)
│   │   ├── ChaosDirector.js         # 10-tier incident spawner & forensic remediation
│   │   ├── Constants.js             # Catalogs, enums, physics constants
│   │   ├── ContractManager.js       # NEW: Enterprise customer RFPs & SLA verification
│   │   ├── EconomicEngine.js        # Cashflow, OPEX, power billing, SLA reputation
│   │   ├── GameModeManager.js       # Campaign, Survival, Sandbox state machine
│   │   ├── PowerEngine.js           # Grid, UPS battery, diesel backup genset
│   │   ├── SimulationEngine.js      # Headless 60Hz tick runner & graph resolver
│   │   ├── SurvivalMode.js          # Exponential wave scaling & high scores
│   │   ├── TechTree.js              # NEW: 4-era architectural research progression
│   │   ├── ThermalEngine.js         # BTU heat dissipation, CRAC chillers, PUE
│   │   └── TrafficEngine.js         # Multi-workload packet routing & additive latency
│   └── storage/
│       └── CareerStorage.js         # Campaign level progress & star achievements
├── render/
│   ├── CableRenderer.js             # Orthogonal Manhattan stepped conduit math
│   ├── GridSnapper.js               # Discrete coordinate snapping & validation
│   ├── IsoMath.js                   # 2.5D isometric projection matrix
│   └── ParticlePool.js              # WebGL packet & floating number particle pool
├── scenes/
│   ├── FacilityScene.js             # Physical isometric datacenter floorplan scene
│   └── TopologyScene.js             # 2D logical network scene with neon conduits & wiring tool
├── storage/
│   ├── BlueprintCodec.js            # NEW: Base64 architecture blueprint encoder/decoder
│   └── StatePersistence.js          # Multi-slot saves, auto-save bootstrap, offline catch-up
├── ui/
│   ├── BuildDrawer.js               # Procurement tray with Tech Tree locks
│   ├── CockpitHUD.js                # Top telemetry HUD with safe area boundaries
│   ├── FTUETutorial.js              # First-Time User Experience onboarding
│   ├── IncidentBar.js               # Emergency triage banner with auto-collapse triggers
│   ├── MobileTouchFSM.js            # Touch state machine with WIRING_CABLE gesture
│   ├── NodeInspector.js             # Contextual component & link inspector
│   ├── RadialTouchMenu.js           # NEW: Mobile radial context menu for node actions
│   └── modals/
│       ├── APMDashboardModal.js     # NEW: P95/P99 latency & error distribution telemetry
│       ├── ContractModal.js         # NEW: Enterprise RFPs & client bidding
│       ├── MissionBriefingModal.js   # Campaign briefing sheet
│       ├── MissionDebriefingModal.js # Victory/defeat scorecard
│       ├── ModeSelectModal.js       # Campaign/Survival/Sandbox chooser
│       ├── SettingsModal.js         # 4-bus audio sliders & accessibility options
│       └── TechTreeModal.js         # NEW: SRE Research Lab interface
├── main.js                          # Application entry point wiring auto-save & scenes
└── style.css                        # Glassmorphic sci-fi styles & safe-area rules

tests/
├── audio-mobile.test.js             # Audio mixer & mobile lifecycle tests
├── blueprint-codec.test.js          # NEW: Architecture blueprint string roundtrip tests
├── campaign-coordinates.test.js     # NEW: Campaign level coordinate alignment tests
├── chaos-director.test.js           # Incident triage tests
├── client-contracts.test.js         # NEW: Enterprise RFP SLA verification tests
├── economic-engine.test.js          # Revenue, OPEX, bankruptcy tests
├── event-bus.test.js                # Event contract tests
├── game-modes.test.js               # Campaign progression & scorecard tests
├── manual-wiring.test.js            # NEW: Port-to-port cable wiring & validation tests
├── power-engine.test.js             # UPS battery & diesel generator tests
├── simulation-engine.test.js        # Graph lifecycle & 60Hz tick tests
├── state-persistence.test.js        # Auto-save & offline catch-up tests
├── tech-tree.test.js                # NEW: SRE research unlocks & era progression tests
├── thermal-engine.test.js           # BTU, PUE, and cooling physics tests
└── traffic-engine.test.js           # Latency, queue depths, and packet routing tests
```

---

## Structure Decision

The project preserves the established single-repository structure with clear layer separation:
1. `src/core/sim/`: Pure, headless TypeScript/ESNext simulation engine (100% verifiable via `npm test`).
2. `src/scenes/` & `src/render/`: Phaser 4 WebGL rendering and particle pooling.
3. `src/ui/`: Mobile-first glassmorphic DOM cockpit and touch overlays.
4. `src/storage/`: Offline persistence, schema validation, and blueprint codecs.

---

## Complexity Tracking

> *Zero constitutional violations detected. No complexity justification required.*
