# Cloud & Data Center Simulation Game Constitution

## Core Principles

### I. Decoupled Headless Simulation Core
All game logic, telemetry calculations, resource flows (RPS, Latency, BTU, PUE, Cashflow), queue models, and incident state machines MUST reside in pure, headless TypeScript modules (`src/core/sim/`). The simulation core MUST NOT import Phaser, DOM, or WebGL APIs, ensuring headless testing and deterministic execution in any environment.

### II. Test-First & Deterministic Verification (NON-NEGOTIABLE)
TDD is mandatory for the simulation engine. Every mathematical equation, state transition, and chaos scenario must be accompanied by automated unit tests in `tests/` before visual wiring. A 10,000-tick headless simulation benchmark must pass cleanly in Node.js with zero floating-point drifts or unhandled rejections.

### III. Dual-Perspective Presentation Decoupling
Visual scenes (`TopologyScene` for 2D logical routing and `FacilityScene` for 2.5D isometric data center layout) communicate with the core engine strictly via an asynchronous/synchronous Pub/Sub `EventBus` and immutable state snapshots. Rendering layers never directly mutate simulation state.

### IV. Mobile Ergonomics & Performance Guardrails
The UI/UX must adhere to touchscreen ergonomics: Landscape orientation (locked), minimum interactive touch targets of 48×48 dp with safe-area insets, collapsible contextual drawers, and multi-touch gesture disambiguation (pan, pinch, wire-drag). Visual packet particles must use object pooling to guarantee 60 FPS on mobile WebGL with strict memory and thermal bounds.

### V. Spec-Driven Governance & Traceability
All feature additions, new components, and incident scenarios must follow the SpecKit specification workflow (`specify` → `plan` → `tasks` → `implement`). No feature code is written without a corresponding approved specification and task breakdown in `specs/`.

## Governance
This Constitution establishes the foundational engineering contract for the Cloud & Data Center Simulation Game. All PRs, code reviews, and agent sessions must verify compliance. Amendments require explicit documentation, updated tests, and approval.

**Version**: 1.0.0 | **Ratified**: 2026-10-14 | **Last Amended**: 2026-10-14
