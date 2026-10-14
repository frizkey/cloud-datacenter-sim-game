# Tasks: Game Modes & SRE Career Campaign

**Branch**: `003-game-modes-career`  
**Spec**: [specs/003-game-modes-career/spec.md](file:///home/arie/labs/cloud-datacenter-sim-game/specs/003-game-modes-career/spec.md)  
**Plan**: [specs/003-game-modes-career/plan.md](file:///home/arie/labs/cloud-datacenter-sim-game/specs/003-game-modes-career/plan.md)  
**Generated**: 2026-10-14  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure `src/core/storage/` and `src/ui/modals/`
- [x] T002 Define Campaign Levels 1 through 5 configuration in `src/core/sim/CampaignLevels.js` with lore, starter nodes, starting cash, victory objectives, and scripted incidents

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement `src/core/storage/CareerStorage.js` with `localStorage` persistence, initial career defaults, star tracking, and survival high score

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - SRE Career Campaign Progression (Priority: P1) 🎯 MVP

**Goal**: Deliver a 5-level playable career campaign with deterministic starter topologies, scripted incident timelines, real-time objective tracking, and 3-star scorecard evaluation.

**Independent Test**: Load Level 1 headlessly; verify starter components ($1\text{ VM} + 1\text{ DB}$) and $15 starting cash; simulate 90 seconds; verify OOM occurs at $t = 30\text{s}$; verify victory evaluation awards stars and unlocks Level 2.

### Tests for User Story 1 ⚠️
- [x] T004 [P] [US1] Write unit tests for `GameModeManager` and Campaign Levels 1–5 in `tests/game-modes.test.js`

### Implementation for User Story 1
- [x] T005 [US1] Implement `src/core/sim/GameModeManager.js` managing active mode, level loading, starter component instantiation into `SimulationEngine`, tick-based incident triggering, and victory/defeat evaluation with 3-star calculation
- [x] T006 [US1] Verify US1 tests pass in `tests/game-modes.test.js`

**Checkpoint**: User Story 1 functional and tested headlessly

---

## Phase 4: User Story 2 - Endless Survival Mode (Priority: P2)

**Goal**: Deliver an infinite endurance mode with compounding traffic surges ($1.5\times$ every 120s), escalating incident frequency, and high-score recording upon insolvency.

**Independent Test**: Start Survival mode headlessly; verify initial 100 RPS; advance 240s; verify traffic multiplier reaches $2.25\times$; trigger bankruptcy; verify survival time and requests recorded in `CareerStorage`.

### Tests for User Story 2 ⚠️
- [x] T007 [P] [US2] Add unit tests for `SurvivalMode` traffic surge wave equation and escalating chaos in `tests/game-modes.test.js`

### Implementation for User Story 2
- [x] T008 [US2] Implement `src/core/sim/SurvivalMode.js` implementing wave equation $\text{RPS}(t)$ and escalating incident interval, hooked into `GameModeManager`
- [x] T009 [US2] Verify US2 tests pass in `tests/game-modes.test.js`

**Checkpoint**: User Stories 1 AND 2 functional and tested headlessly

---

## Phase 5: User Story 3 - Chaos Lab Sandbox Mode (Priority: P2)

**Goal**: Deliver an unconstrained creative sandbox mode with infinite budget ($1,000,000), free component placement, and manual chaos incident injection drawer.

**Independent Test**: Start Sandbox mode headlessly; verify infinite budget and zero component placement deduction; inject DDoS incident manually; verify incident activates immediately without wait.

### Tests for User Story 3 ⚠️
- [x] T010 [P] [US3] Add unit tests for Sandbox mode ($1,000,000 budget, free components, manual incident injection) in `tests/game-modes.test.js`

### Implementation for User Story 3
- [x] T011 [US3] Implement Sandbox mode handling in `src/core/sim/GameModeManager.js` with instant incident triggering API and infinite cashflow bypass
- [x] T012 [US3] Verify US3 tests pass in `tests/game-modes.test.js`

**Checkpoint**: All three core simulation game modes (Campaign, Survival, Sandbox) functional and tested headlessly

---

## Phase 6: User Story 4 - Mode Selection, Briefing & Debriefing Mobile UI (Priority: P3)

**Goal**: Deliver mobile-first glassmorphic modal overlays for Mode Selection, Mission Briefing (lore, objectives, starter preview), and Mission Debriefing (3-star animated scorecard, SLA, net cash, Next/Retry actions) adhering to $\ge 48 \times 48\text{ dp}$ touch targets and safe areas.

**Independent Test**: Render modals in browser; verify all button touch targets meet $\ge 48\text{px}$; verify selecting Level 1 opens Briefing modal; verify closing Briefing modal starts level; verify level victory opens Debriefing modal showing stars and "Next Level" button.

### Implementation for User Story 4
- [x] T013 [P] [US4] Implement glassmorphic modal styling in `src/ui/styles/modals.css` supporting safe-area insets (`env(safe-area-inset-*)`) and $\ge 48\times 48\text{ dp}$ touch targets
- [x] T014 [P] [US4] Implement `src/ui/modals/ModeSelectModal.js` with Campaign level cards, Survival card, and Sandbox card
- [x] T015 [P] [US4] Implement `src/ui/modals/MissionBriefingModal.js` presenting level lore, objectives, starter topology preview, and "Deploy & Start"
- [x] T016 [P] [US4] Implement `src/ui/modals/MissionDebriefingModal.js` presenting 3-star scorecard, SLA, net cash, and "Next Level" / "Retry"
- [x] T017 [US4] Integrate `GameModeManager` and modals into `src/main.js` and HUD buttons ("Modes" button, level timer display, objective tracker bar)

**Checkpoint**: Complete visual and mobile gameplay integration

---

## Phase 7: Polish & End-to-End Verification

**Purpose**: Quality assurance, stress verification, live deployment, and documentation

- [x] T018 Run full automated test suite (`npm test`) ensuring 100% green assertions and zero regressions across Phase 1, Phase 2, and Phase 3 tests
- [x] T019 Execute 10,000-tick headless stress test with active campaign and survival modes
- [x] T020 Verify mobile viewport responsive layout and touch targets in browser
- [x] T021 Commit and push changes to git, trigger Coolify live deployment via CLI, verify public live URL (`https://cloudsim.ment.arie.web.id`), and update `STATE.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)** $\rightarrow$ **Foundational (Phase 2)**: Sequential
- **User Story 1 (Phase 3)**: Depends on Foundational. MVP release checkpoint.
- **User Story 2 (Phase 4)**: Depends on US1 (uses `GameModeManager`).
- **User Story 3 (Phase 5)**: Depends on US1 (uses `GameModeManager`).
- **User Story 4 (Phase 6)**: Depends on US1, US2, US3 (wires all modes to UI).
- **Polish (Phase 7)**: Depends on all user stories being complete.
