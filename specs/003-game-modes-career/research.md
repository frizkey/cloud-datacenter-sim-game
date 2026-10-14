# Research & Architecture Decisions: Game Modes & SRE Career Campaign

**Feature**: `specs/003-game-modes-career`  
**Date**: 2026-10-14  
**Author**: Antigravity  

---

## 1. Overview & Research Objectives

Phase 3 transitions the Cloud & Data Center Simulation Game from a pure technical sandbox into a structured, replayable mobile game. We investigate and resolve five primary technical decisions:
1. **Level Configuration & Scripted Timelines**: How to model deterministic starting topologies and time-based incident triggers while remaining decoupled from Phaser.
2. **Victory / Defeat Evaluation Engine**: How to evaluate real-time level objectives and 3-star ratings efficiently every simulation second.
3. **Endless Survival Scaling Dynamics**: The mathematical formula for compounding traffic surges and stochastic chaos injection.
4. **Offline-First Career Persistence**: Schema and storage strategy across Web (IndexedDB/LocalStorage) and native mobile (Capacitor Preferences).
5. **Mobile Modal Ergonomics**: Touch-friendly glassmorphic UI patterns for Level Selection, Mission Briefings, and Debriefing Scorecards.

---

## 2. Research Findings & Decisions

### Decision 1: Game Mode State Management & Decoupled Engine Architecture
- **Decision**: Implement a headless `GameModeManager` class in `src/core/sim/GameModeManager.js` that wraps the existing `SimulationEngine`.
- **Rationale**:
  - Adheres strictly to Constitution Principle I (Decoupled Headless Simulation Core).
  - The `GameModeManager` acts as the orchestrator: it loads level topologies into `SimulationEngine`, schedules scripted incident triggers via simulation elapsed time, monitors victory/defeat conditions on each tick, and publishes high-level game state events to `EventBus`.
  - Enables 100% headless automated unit testing and headless CI runs without requiring browser canvas or WebGL mocks.
- **Alternatives Considered**:
  - *Hardcoding level logic in Phaser Scenes*: Rejected because it violates Constitution Principle I & II (prevents headless unit testing).
  - *External JSON level files loaded via fetch()*: Evaluated, but bundling typed JavaScript/TypeScript configuration objects (`src/core/sim/CampaignLevels.js`) avoids async bundle loading latency and ensures deterministic offline playability on mobile.

---

### Decision 2: 3-Star Scoring Algorithm & Objective Tracking
- **Decision**: Define a three-tier criteria evaluation system executed on mission completion:
  - **1 Star (Mission Base Complete)**: Survive the required duration (e.g. 90s, 120s, 180s) without triggering insolvency (negative cash > 30s) or SLA catastrophe ($\text{SLA} < 80.0\%$).
  - **2 Stars (SRE Excellence)**: Maintain cumulative SLA $\ge 99.5\%$ throughout the mission.
  - **3 Stars (Financial Master)**: End the mission with final cash balance exceeding the level's bonus target (e.g., Level 1 $\ge \$25.00$, Level 2 $\ge \$50.00$, etc.).
- **Rationale**:
  - Provides instant casual gratification (1 star to progress) alongside high-skill mastery goals (3 stars) familiar to mobile construction tycoon players.
  - Directly maps SRE operational trade-offs: spending too much cash on excess redundancy lowers profit (losing star 3), while under-provisioning degrades SLA (losing star 2).
- **Alternatives Considered**:
  - *Continuous score (points/percentages)*: Rejected as primary completion mechanic because star ratings provide clearer micro-goals and UI badge states on mobile carousels.

---

### Decision 3: Endless Survival Mode Scaling Curve
- **Decision**: Implement an exponential wave function updated every 120 seconds:
  $$\text{RPS}(t) = \text{BaseRPS} \times (1.50)^{\lfloor t / 120 \rfloor} \times \left(1 + 0.15 \sin\left(\frac{2\pi t}{30}\right)\right)$$
  - Chaos injection interval escalates inversely:
    $$\Delta T_{\text{incident}}(t) = \max\left(20\text{s}, 90\text{s} - 5\text{s} \times \lfloor t / 60 \rfloor\right)$$
- **Rationale**:
  - A compounding $1.5\times$ base surge forces players to continuously upgrade nodes (from Micro Pods to Large Pods, introducing Redis clusters and database sharding).
  - The diurnial sine variation creates rhythmic breathing periods allowing players to recover cash before the next spike.
  - The escalating incident timer tests architectural fault-tolerance under sustained load.
- **Alternatives Considered**:
  - *Linear scaling (+50 RPS every minute)*: Rejected because linear growth allows static architectures to survive indefinitely without restructuring.

---

### Decision 4: Career Persistence Layer (`CareerStorage`)
- **Decision**: Implement `src/core/storage/CareerStorage.js` utilizing `localStorage` with in-memory caching and JSON schema validation.
- **Rationale**:
  - Mobile career progression (unlocked levels, star maps, high scores) requires $< 1\text{ KB}$ of state data.
  - `localStorage` provides synchronous read/write access during game loop transitions, eliminating asynchronous UI hitching when closing debriefing modals.
  - Fully compatible with Web, Capacitor (WebView local storage is persistent across app launches), and PWA offline mode.
- **Schema**:
  ```json
  {
    "unlockedLevel": 2,
    "levelStars": { "1": 3, "2": 0 },
    "survivalHighScoreSec": 248,
    "survivalMaxRequests": 18450,
    "totalCareerCashMicroCents": 125000000,
    "lastPlayedTimestamp": 1773489123000
  }
  ```

---

### Decision 5: Mobile UI Modal Component Design
- **Decision**: Build pure DOM/CSS glassmorphic overlay modals managed by `src/ui/modals/`:
  - `ModeSelectModal.js`: Carousel/cards to choose between Campaign, Survival, and Sandbox.
  - `MissionBriefingModal.js`: Pre-mission briefing showing lore, starting resources, objectives, and "Deploy & Start".
  - `MissionDebriefingModal.js`: Post-mission scorecard showing Victory/Defeat, animated stars, SLA achieved, net cash, and "Next Level" / "Retry".
- **Rationale**:
  - Aligns with Phase 1 & 2 architecture where HUD overlays reside in DOM for crisp typography, accessibility, and native mobile virtual keyboard / safe-area handling (`env(safe-area-inset-*)`).
  - Ensures interactive button hitboxes strictly meet $\ge 48 \times 48\text{ dp}$ with smooth CSS transitions (`transform: translateY(0)`).
- **Alternatives Considered**:
  - *Phaser Scene GameObjects for UI*: Rejected because text rendering and modal responsiveness across heterogeneous mobile screen aspect ratios are significantly cleaner and sharper in HTML5/CSS glassmorphic overlays.
