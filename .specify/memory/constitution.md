# Cloud & Data Center Simulation Game Constitution

## Preamble & Authoritative Research Grounding

This Constitution establishes the non-negotiable architectural, engineering, ergonomic, and quality standards for the **Cloud & Data Center Simulation Game**. All design and implementation decisions derive from and must strictly align with the two foundational research documents in this repository:

1. **[Primary Game Design & Simulation Specification](file:///home/arie/labs/cloud-datacenter-sim-game/docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md):**
   - Defines the dual-view architecture (2D Logical Topology + 2.5D Isometric Facility Grid).
   - Establishes the 4 core interconnected resource groups: Traffic & Compute (RPS, CPU, RAM, Bandwidth), Data & IOPS (Connections, IOPS, Queue depth, Cache footprint), Facility Physical (kW, BTU/h, CFM, RU density), and Business/Financial (Cashflow, SLA reputation, OPEX).
   - Outlines the 10-tier incident chaos catalog (Tier 1: Single service breakdown through Tier 4: Multi-cloud cascading failure).
   - Mandates the decoupled Phaser 4 (`phaser@4.2.1`) rendering engine and RunComfy AI asset pipeline.
2. **[Mobile Game Feasibility & Deep Research Study](file:///home/arie/labs/cloud-datacenter-sim-game/docs/MOBILE_GAME_FEASIBILITY_STUDY.md):**
   - Classifies the game into the AI Development Feasibility Spectrum (Medium Feasibility / High Logic Automation - A-Tier).
   - Establishes mobile ergonomics: Landscape orientation (locked), dual-thumb interaction heat map, safe-area insets (`env(safe-area-inset-*)`), and minimum $48 \times 48\text{ dp}$ touch targets.
   - Outlines the 30-second First-Time User Experience (FTUE: "The Day 1 Black Friday Outage"), micro-session optimization, and `IndexedDB` instant pause/resume.
   - Benchmarks market competitors (*Mindustry*, *Mini Motorways*, *Builderment*) and defines the non-intrusive hybrid monetization architecture (rewarded emergency cloud bursting, cosmetic season passes).

---

## Core Principles

### I. Decoupled Headless Simulation Core (Grounding: Design Spec §4, §6.1)
All game logic, mathematical models, telemetry calculations, and incident state machines MUST reside in pure, headless TypeScript modules (`src/core/sim/`).
- **Resource Flow Equations:** All 4 equations defined in `CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md` §4.1 must execute deterministically:
  1. $\text{Total Latency} = T_{\text{DNS}} + T_{\text{WAF}} + T_{\text{LB}} + T_{\text{Compute}} + (P_{\text{Hit}} \times T_{\text{Cache}} + (1 - P_{\text{Hit}}) \times T_{\text{DB}})$
  2. $\text{Heat Generated (BTU)} = \text{Watts} \times 3.41214 \times (1 + \text{CPU}_{\text{Load}}\%)$
  3. $\text{PUE} = \frac{\text{Total Facility Power}}{\text{IT Equipment Power}}$ (Target: $1.15 - 1.25$)
  4. $\text{Net Income} = (\text{Successful Requests} \times \$0.0002) - (\text{Hardware OPEX} + \text{Power Bill} + \text{Egress}) - \text{SLA Penalties}$
- **Zero DOM/Engine Coupling:** The simulation core MUST NOT import Phaser, DOM, canvas, or WebGL APIs, ensuring headless testing and CLI verification in any execution environment.

### II. Test-First & Deterministic Verification (NON-NEGOTIABLE) (Grounding: Mobile Study §1.1)
*Meta-Rule: "An agent can build what it can verify."*
- **TDD Requirement:** Unit tests in `tests/` must be written and passing for each engine module before visual scene integration.
- **Chaos & Incident Verification:** All 10 incident scenarios from `CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md` §5 (Pod OOMKilled, Flash Sale surge, DDoS flood, SQLi exploit, Cache stampede, Split-brain partition, Rack overheat, Power grid blackout, Thundering herd, AZ outage) must have headless test harnesses verifying trigger conditions and mitigation state transitions.
- **Stress Benchmark:** A 10,000-tick headless simulation run must execute with zero floating-point drifts, memory leaks, or unhandled exceptions.

### III. Dual-Perspective Presentation Decoupling (Grounding: Design Spec §2.1, §6)
The visual presentation consists of two distinct view layers that render state but never directly mutate core simulation data:
1. **Logical / Topology View (`TopologyScene`):** 2D interactive node graph (DNS, WAF, LB, Pods, Redis, DB, Kafka) with orthogonal cable routing and packet particle streams.
2. **Physical / Facility View (`FacilityScene`):** 2.5D isometric data center floor grid ($N \times M$ cells) displaying 42U racks, CRAC chillers, PDU breakers, UPS battery banks, and diesel generators.
- **Communication Contract:** Visual scenes communicate with the headless engine strictly via an asynchronous/synchronous Pub/Sub `EventBus` and immutable state snapshots.

### IV. Mobile Ergonomics & Performance Guardrails (Grounding: Mobile Study §2)
The game must be tailored for mobile touch ergonomics and thermal efficiency:
- **Orientation:** Locked **Landscape (16:9 / 20:9)** utilizing the dual-thumb split control zone (Left thumb: camera navigation & view toggling; Right thumb: build drawer, contextual inspector, and emergency triage FAB).
- **Touch Standards:** Minimum clickable target size of **$48 \times 48\text{ dp}$** ($\ge 9\text{mm}$) with $\ge 8\text{ dp}$ padding. All UI elements must strictly avoid screen notches, rounded corners, and system navigation bars using `env(safe-area-inset-*)`.
- **Gesture FSM:** Input handling must disambiguate single-finger pan, pinch-to-zoom ($0.5\times - 2.5\times$), hold-and-drag grid placement, and point-to-point node wiring without input conflicts.
- **Performance Budget:** Target rock-solid 60 FPS on mobile WebGL by enforcing particle emitter pooling (handling up to 10,000 request particles/s without per-packet memory allocation) and offering a 30 FPS Battery Saver profile.

### V. Spec-Driven Governance & Traceability (Grounding: SpecKit SDD)
All features, component expansions, and balance revisions must proceed through the SpecKit SDD pipeline:
`speckit-specify` $\rightarrow$ `speckit-plan` $\rightarrow$ `speckit-tasks` $\rightarrow$ `speckit-implement`.
- Every feature specification in `specs/` must reference the relevant section of the research documents.
- No code or scene modifications may be merged without an approved specification and corresponding task list.

---

## Governance & Compliance

This Constitution supersedes informal conventions. All Pull Requests, automated agent tasks, and code reviews must verify explicit compliance with the principles above. Amendments to this Constitution require updating both research cross-references and automated verification tests.

**Version:** 1.1.0 | **Ratified:** 2026-10-14 | **Last Amended:** 2026-10-14
