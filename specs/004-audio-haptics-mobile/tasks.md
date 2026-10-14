# Tasks: Procedural Audio, Mobile Haptics & Native Packaging

**Branch**: `004-audio-haptics-mobile`  
**Spec**: [specs/004-audio-haptics-mobile/spec.md](file:///home/arie/labs/cloud-datacenter-sim-game/specs/004-audio-haptics-mobile/spec.md)  
**Plan**: [specs/004-audio-haptics-mobile/plan.md](file:///home/arie/labs/cloud-datacenter-sim-game/specs/004-audio-haptics-mobile/plan.md)  
**Generated**: 2026-10-14  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure `src/core/audio/`, `src/core/haptics/`, `src/core/mobile/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core settings persistence and mock test harness that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Implement `src/core/audio/AudioSettings.js` with `localStorage` persistence, default volume clamping, and mute state flags

**Checkpoint**: Foundation ready - audio and haptics implementation can now begin

---

## Phase 3: User Story 1 - Procedural Web Audio Engine (Priority: P1) 🎯 MVP

**Goal**: Deliver a zero-asset procedural Web Audio synthesizer supporting ambient datacenter soundscapes, dynamic load modulation, and 10 discrete operational sound effects.

**Independent Test**: Can be tested headlessly with Web Audio mock in Node.js and in browser: verify `playSfx` synthesizes frequencies without throwing; verify ambient hum modulates filter frequency with facility load; verify emergency siren loops until stopped.

### Tests for User Story 1 ⚠️
- [x] T003 [P] [US1] Write unit tests for `AudioManager` in `tests/audio-mobile.test.js`

### Implementation for User Story 1
- [x] T004 [US1] Implement `src/core/audio/AudioManager.js` using Web Audio API nodes (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`) for ambient datacenter soundscapes and 10 discrete SFX
- [x] T005 [US1] Verify US1 tests pass in `tests/audio-mobile.test.js`

**Checkpoint**: User Story 1 functional and tested headlessly

---

## Phase 4: User Story 2 - Contextual Mobile Haptics (Priority: P2)

**Goal**: Deliver physical vibration feedback for mobile devices with light, medium, heavy, warning, and success patterns wrapping `@capacitor/haptics` and `navigator.vibrate`.

**Independent Test**: Can be tested headlessly and in browser: triggering `hapticsManager.trigger('LIGHT')` calls the underlying vibration provider; setting `isHapticsEnabled = false` suppresses all calls.

### Tests for User Story 2 ⚠️
- [x] T006 [P] [US2] Add unit tests for `HapticsManager` in `tests/audio-mobile.test.js`

### Implementation for User Story 2
- [x] T007 [US2] Implement `src/core/haptics/HapticsManager.js` wrapping `@capacitor/haptics` with standard HTML5 `navigator.vibrate` fallback
- [x] T008 [US2] Verify US2 tests pass in `tests/audio-mobile.test.js`

**Checkpoint**: User Stories 1 AND 2 functional and tested headlessly

---

## Phase 5: User Story 3 - Audio & Haptic Settings Modal (Priority: P2)

**Goal**: Deliver a mobile-first glassmorphic Settings modal with volume sliders and toggle switches for Master Volume, Ambient Hum, Sound Effects, and Haptics, wired to the CockpitHUD `⚙️` button.

**Independent Test**: Render `SettingsModal` in browser; verify all touch targets meet $\ge 48\times 48\text{ dp}$; verify adjusting sliders updates `AudioSettings`; verify settings persist to `localStorage`.

### Implementation for User Story 3
- [x] T009 [P] [US3] Add styling for settings sliders and switches in `src/ui/styles/modals.css`
- [x] T010 [US3] Implement `src/ui/modals/SettingsModal.js` with volume sliders, mute switches, and haptics toggle, integrated with `AudioSettings`
- [x] T011 [US3] Wire Settings modal opening to `#hud-menu-btn` in `src/ui/CockpitHUD.js`

**Checkpoint**: Complete audio and haptics UI controls operational

---

## Phase 6: User Story 4 - Native Capacitor Packaging & Lifecycle Hooks (Priority: P3)

**Goal**: Deliver Android/iOS app lifecycle hooks (`appStateChange` auto-save and pause on background, resume on foreground), hardware back button modal dismissal, and Capacitor project synchronization.

**Independent Test**: Backgrounding the app triggers pause and snapshot save; pressing Android back button dismisses active modal; `npx cap sync android` completes with zero errors.

### Implementation for User Story 4
- [x] T012 [P] [US4] Implement `src/core/mobile/MobileLifecycle.js` handling `appStateChange` and hardware back button modal closing
- [x] T013 [US4] Integrate `AudioManager`, `HapticsManager`, and `MobileLifecycle` into `src/main.js` and EventBus listeners
- [x] T014 [US4] Run `npx cap sync android` to synchronize web build assets with native Android wrapper

**Checkpoint**: Native mobile packaging and lifecycle hooks verified

---

## Phase 7: Polish & End-to-End Verification

**Purpose**: Quality assurance, stress verification, live deployment, and documentation

- [x] T015 Run full test suite (`npm test`) ensuring 100% green assertions across all test suites
- [x] T016 Verify production build (`npm run build`) succeeds cleanly
- [x] T017 Commit and push changes to git, trigger Coolify live deployment via CLI, verify public live URL (`https://cloudsim.ment.arie.web.id`), and update `STATE.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)** $\rightarrow$ **Foundational (Phase 2)**: Sequential
- **User Story 1 (Phase 3)**: Depends on Foundational. MVP release checkpoint.
- **User Story 2 (Phase 4)**: Depends on Foundational (uses AudioSettings).
- **User Story 3 (Phase 5)**: Depends on US1, US2 (wires settings to audio & haptics).
- **User Story 4 (Phase 6)**: Depends on US1, US2, US3 (wires lifecycle & Android packaging).
- **Polish (Phase 7)**: Depends on all user stories being complete.
