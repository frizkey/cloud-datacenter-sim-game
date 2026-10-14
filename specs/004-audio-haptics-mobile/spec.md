# Feature Specification: Procedural Audio, Mobile Haptics & Native Packaging

**Feature Branch**: `004-audio-haptics-mobile`  
**Created**: 2026-10-14  
**Status**: Draft  
**Input**: Web Audio API procedural sound synthesis, mobile tactile haptics, and Capacitor native packaging derived from [docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md) (§6) and [docs/MOBILE_GAME_FEASIBILITY_STUDY.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/MOBILE_GAME_FEASIBILITY_STUDY.md) (§2.3, §4.2)  
**Governance**: Ratified under [.specify/memory/constitution.md](file:///home/arie/labs/cloud-datacenter-sim-game/.specify/memory/constitution.md)

---

## 1. Executive Summary & Vision

Phase 4 elevates the sensory immersion, tactile responsiveness, and native mobile polish of the Cloud & Data Center Simulation Game. While Phases 1–3 established the simulation engine, advanced infrastructure nodes, chaos scenarios, and career campaign progression, Phase 4 delivers the crucial audio-tactile feedback loop that transforms a good web simulation into an addictive, visceral mobile game.

This feature encompasses four key pillars:
1. **Procedural Web Audio Engine**: Zero-asset procedural synthesis utilizing the Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`). Generates authentic datacenter fan noise, electrical hum, subtle network packet routing pings, tactile UI clicks, two-tone emergency sirens, and victory/defeat musical cues without downloading external audio files.
2. **Tactile Haptic Feedback**: Context-aware vibration patterns for mobile devices via `@capacitor/haptics` with standard `navigator.vibrate` browser fallback. Provides distinct micro-vibrations for grid placement, cable snapping, incident alarms, and victory fanfares.
3. **Audio & Feedback Settings UI**: A glassmorphic Settings modal allowing independent volume sliders and mute toggles for Master Audio, Ambient Hum, Sound Effects, and Haptics.
4. **Mobile Native Packaging & Lifecycle**: Capacitor native Android/iOS integration handling app backgrounding (auto-save and pause), app resume, hardware back button navigation, and safe-area status bar styling.

---

## 2. User Scenarios & Testing

### User Story 1 - Procedural Audio Feedback & Soundscape (Priority: P1) 🎯 MVP

As a player, I want responsive audio feedback when interacting with nodes, hearing network traffic, and managing datacenter emergencies, so that the simulation feels alive and immersive without consuming mobile download bandwidth.

**Why this priority**: Sound design provides critical situational awareness (e.g. hearing the server room hum accelerate or hearing crisis sirens) and delivers instant satisfaction when placing components and completing requests.

**Independent Test**: Can be verified headlessly and in browser: triggering `audioManager.playSfx('NODE_PLACED')` synthesizes a frequency ramp; entering Facility view spools up the ambient low-pass fan drone; triggering an incident starts the alarm siren; muting audio stops all oscillator nodes immediately.

**Acceptance Scenarios**:
1. **Given** audio is enabled, **When** the player places a node on the grid or connects two nodes, **Then** a crisp procedural harmonic blip ($440\text{Hz} \rightarrow 880\text{Hz}$) plays in $< 10\text{ms}$.
2. **Given** Facility View is active, **When** facility IT load increases, **Then** the ambient low-pass fan noise dynamically increases in filter cutoff frequency and subtle resonance.
3. **Given** an operational incident triggers (e.g. DDoS, OOM, Fire), **When** the incident banner appears, **Then** an urgent two-tone siren ($600\text{Hz} \leftrightarrow 900\text{Hz}$) sounds until mitigated or dismissed.
4. **Given** mobile WebKit/Chrome autoplay restrictions, **When** the player taps anywhere on the screen for the first time, **Then** the `AudioContext` state transitions seamlessly from `suspended` to `running`.

---

### User Story 2 - Contextual Mobile Haptics (Priority: P2)

As a mobile player, I want subtle tactile vibrations when tapping buttons, placing nodes, and resolving incidents, so that the touchscreen interface provides physical confirmation.

**Why this priority**: Touchscreens lack physical button travel; haptic feedback restores mechanical satisfaction and communicates operational severity.

**Independent Test**: Can be tested on native device or browser with vibration support: placing a node calls `Haptics.impact({ style: ImpactStyle.Light })`; incident alarm calls `Haptics.notification({ type: NotificationType.Warning })`; disabling haptics in settings suppresses all calls.

**Acceptance Scenarios**:
1. **Given** haptics enabled on mobile, **When** the player snaps a component to the grid, **Then** a light tactile pulse ($15\text{ms}$) confirms placement.
2. **Given** an incident triggers, **When** the alarm fires, **Then** a distinct warning vibration pattern alerts the player.
3. **Given** a level victory, **When** the 3-star scorecard displays, **Then** a success vibration pattern triggers for each earned star.
4. **Given** the player disables haptics in Settings, **When** actions occur, **Then** zero vibrations are generated.

---

### User Story 3 - Audio & Haptic Settings Modal (Priority: P2)

As a player, I want an easily accessible Settings modal where I can adjust master volume, ambient hum volume, sound effects volume, and toggle haptics, so that I can customize my sensory experience.

**Why this priority**: Players often play in quiet environments (offices, public transit) or prefer silence, requiring immediate volume and mute controls.

**Independent Test**: Tapping the `⚙️` button in CockpitHUD opens the Settings modal; adjusting the SFX slider scales audio gain; toggling "Mute All" mutes audio instantly; settings persist to `localStorage` across reloads.

**Acceptance Scenarios**:
1. **Given** the CockpitHUD, **When** the player taps the `⚙️` button, **Then** a glassmorphic Settings modal opens displaying volume sliders and toggle switches.
2. **Given** the Settings modal, **When** the player toggles "Ambient Soundscape Off", **Then** the background fan hum smoothly fades to zero gain over $300\text{ms}$.
3. **Given** custom volume settings, **When** the browser is refreshed, **Then** all settings load from persistent storage.

---

### User Story 4 - Native Capacitor Packaging & Lifecycle Hooks (Priority: P3)

As a mobile player on Android or iOS, I want the game to gracefully pause and save when I switch apps, support the hardware back button, and respect the native system navigation bars, so that the game feels like a first-class native app.

**Why this priority**: Abrupt app backgrounding on mobile can cause battery drain or lost game progress if lifecycle events are unhandled.

**Independent Test**: Running `npx cap sync android` builds without errors; backgrounding the app pauses `GameModeManager` and saves state snapshot; pressing hardware back button dismisses active modal instead of closing the app.

**Acceptance Scenarios**:
1. **Given** an active simulation session, **When** the OS sends the app to the background (`appStateChange: isActive: false`), **Then** the simulation loop pauses and saves a state snapshot.
2. **Given** the app returns to the foreground, **When** `appStateChange: isActive: true` fires, **Then** the simulation resumes cleanly without catch-up stutter.
3. **Given** an open modal dialog (Briefing or Mode Select), **When** the Android hardware back button is pressed, **Then** the modal closes and the app remains running.

---

## 3. Requirements & Technical Specifications

### 3.1 Functional Requirements

- **FR-047**: System MUST implement an `AudioManager` class using procedural Web Audio synthesis with zero external audio media files.
- **FR-048**: System MUST support continuous ambient soundscapes (datacenter airflow/fan drone) dynamically modulated by facility workload.
- **FR-049**: System MUST synthesize discrete sound effects for: `UI_CLICK`, `NODE_PLACED`, `NODE_REMOVED`, `CABLE_CONNECTED`, `PACKET_SUCCESS`, `PACKET_DROP`, `INCIDENT_ALARM`, `INCIDENT_RESOLVED`, `LEVEL_VICTORY`, and `LEVEL_DEFEAT`.
- **FR-050**: System MUST implement an `unlockAudioContext()` user gesture listener to unblock audio on mobile WebKit and Chrome.
- **FR-051**: System MUST implement a `HapticsManager` supporting `light`, `medium`, `heavy`, `success`, and `warning` tactile pulses via `@capacitor/haptics` and `navigator.vibrate`.
- **FR-052**: System MUST implement a mobile-optimized `SettingsModal` with touch-friendly sliders and toggles for Master Volume, Ambient Hum, Sound Effects, and Haptics.
- **FR-053**: System MUST persist audio and haptic preferences in `localStorage` under `cloud_sim_settings_v1`.
- **FR-054**: System MUST handle mobile lifecycle events (`appStateChange`) to auto-save and pause on app backgrounding and resume on foregrounding.
- **FR-055**: System MUST bind the Android hardware back button to dismiss open modal overlays before closing the app.
- **FR-056**: All buttons and sliders in the Settings modal MUST satisfy $\ge 48 \times 48\text{ dp}$ touch targets and safe-area insets.

---

### 3.2 Key Entities & Data Models

```typescript
export interface AudioSettings {
  masterVolume: number;   // 0.0 to 1.0
  sfxVolume: number;      // 0.0 to 1.0
  ambientVolume: number;  // 0.0 to 1.0
  isMasterMuted: boolean;
  isAmbientMuted: boolean;
  isSfxMuted: boolean;
  isHapticsEnabled: boolean;
}

export type SfxType = 
  | 'UI_CLICK'
  | 'NODE_PLACED'
  | 'NODE_REMOVED'
  | 'CABLE_CONNECTED'
  | 'PACKET_SUCCESS'
  | 'PACKET_DROP'
  | 'INCIDENT_ALARM'
  | 'INCIDENT_RESOLVED'
  | 'LEVEL_VICTORY'
  | 'LEVEL_DEFEAT';

export type HapticPattern = 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'SUCCESS' | 'WARNING';
```

---

## 4. Success Criteria

- **SC-021**: Procedural audio synthesizes all 10 sound effect types in $< 15\text{ms}$ latency without dropping frames on mobile WebGL.
- **SC-022**: Ambient datacenter soundscape modulates smoothly in real time without audio pops, clicks, or memory leaks.
- **SC-023**: Audio and haptic preferences persist reliably across browser reloads and app restarts.
- **SC-024**: Native Android build syncs via `npx cap sync android` with zero build configuration errors.
- **SC-025**: App backgrounding cleanly pauses simulation ticks and auto-saves current progress in $< 50\text{ms}$.
- **SC-026**: 100% of automated unit tests pass with zero regressions against Phase 1–3 test suites.

---

## 5. Scope Boundaries

- **In Scope for Phase 4**: Procedural Web Audio engine, ambient datacenter generator, haptic vibration feedback, settings modal, Capacitor app lifecycle hooks, and Android project sync.
- **Deferred to Future Expansion**: Licensed multi-track orchestral soundtrack streaming and custom MP3 upload support.
- **Strictly Prohibited**: Heavy external WAV/MP3 asset files that inflate bundle download size over 2G/3G mobile networks.
