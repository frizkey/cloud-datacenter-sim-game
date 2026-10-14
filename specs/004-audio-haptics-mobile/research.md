# Research & Architecture Decisions: Procedural Audio, Mobile Haptics & Native Packaging

**Feature**: `specs/004-audio-haptics-mobile`  
**Date**: 2026-10-14  
**Author**: Antigravity  

---

## 1. Overview & Research Objectives

Phase 4 introduces audio immersion, physical haptics, and native mobile lifecycle handling without downloading heavy external audio files. We evaluate five critical architecture decisions:
1. **Procedural Web Audio Synthesis vs. Static Asset Bundling**: How to generate realistic server room soundscapes and UI sound effects purely via code.
2. **Mobile Autoplay Policy & AudioContext Lifecycle**: How to gracefully unlock Web Audio on iOS Safari and Android Chrome upon the first user interaction.
3. **Cross-Platform Haptics Architecture**: Unifying `@capacitor/haptics` with standard HTML5 `navigator.vibrate` fallback.
4. **Native Mobile App Lifecycle Management**: How to capture backgrounding/foregrounding and hardware back buttons via `@capacitor/app`.
5. **Decoupled EventBus Integration**: Triggering sound effects and haptic pulses through existing simulation events with zero tight coupling.

---

## 2. Research Findings & Decisions

### Decision 1: Procedural Sound Synthesis via Web Audio API
- **Decision**: Build `src/core/audio/AudioManager.js` using pure Web Audio nodes (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`, `GainNode`, and dynamic `AudioBuffer`).
- **Rationale**:
  - **Zero Network Payload**: Avoids multi-megabyte MP3/WAV downloads over mobile cellular networks, preserving sub-2-second load times.
  - **Zero Audio Decoding Latency**: Synthesized sounds trigger in $< 5\text{ms}$ compared to file-decode overhead which can cause UI stutter.
  - **Dynamic Audio Modulation**: Ambient fan hum cutoff frequency and resonance can be continuously modulated by real-time facility metrics:
    $$f_{\text{cutoff}} = 150\text{Hz} + \left(\frac{\text{IT}_{\text{Watts}}}{20000\text{W}}\right) \times 450\text{Hz}$$
- **Synthesis Recipes**:
  1. *Datacenter Ambient Drone*: 2-second looped pink/white noise buffer fed through a `BiquadFilterNode` (`type: 'lowpass'`, frequency: $180\text{Hz} - 600\text{Hz}$) mixed with a subtle $60\text{Hz}$ electrical sub-bass sine oscillator.
  2. *Tactile UI Click*: $10\text{ms}$ sine burst dropping rapidly from $1200\text{Hz}$ to $200\text{Hz}$ with exponential gain decay.
  3. *Node Placed Harmonic Blip*: Two-tone major third sine chord ($523.25\text{Hz}$ C5 and $659.25\text{Hz}$ E5) with $120\text{ms}$ decay.
  4. *Packet Routing Ping*: Soft sine ping ($880\text{Hz}$ A5) with $60\text{ms}$ decay and low gain ($0.05$).
  5. *Emergency Alarm Siren*: Modulated triangle wave oscillating between $650\text{Hz}$ and $920\text{Hz}$ via an LFO ($2.5\text{Hz}$).
  6. *Level Victory Fanfare*: 4-note ascending major arpeggio (C5 $\rightarrow$ E5 $\rightarrow$ G5 $\rightarrow$ C6) over $600\text{ms}$.
  7. *Mission Defeat Cues*: 3-note descending minor triad (Eb5 $\rightarrow$ C5 $\rightarrow$ G4) over $800\text{ms}$.
- **Alternatives Considered**:
  - *Bundling MP3/OGG sound files*: Rejected because static assets inflate repository and bundle size, require HTTP fetching, and cannot dynamically pitch-shift according to thermodynamic simulation metrics.

---

### Decision 2: Mobile AudioContext Unlock Strategy
- **Decision**: Implement an automated one-shot user gesture listener in `AudioManager`:
  ```javascript
  const unlock = () => {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  ```
- **Rationale**:
  - iOS WebKit and Android Chrome strictly enforce that `AudioContext` cannot produce sound until a user interaction (tap, click, keydown) occurs.
  - Listening for the first `pointerdown` unlocks the audio engine before the player even finishes their first touch gesture, preventing silenced sound effects.

---

### Decision 3: Unified Haptic Feedback Strategy (`HapticsManager.js`)
- **Decision**: Implement a progressive enhancement wrapper:
  1. If running under native Capacitor, invoke `@capacitor/haptics` (`Haptics.impact({ style: ImpactStyle.Light })`, `Haptics.notification(...)`).
  2. If running in a mobile web browser with `navigator.vibrate`, invoke `navigator.vibrate([15])` for light taps and `navigator.vibrate([80, 50, 80])` for alarms.
  3. If unsupported or disabled by the player, fail silently with zero errors.
- **Rationale**:
  - Provides identical tactile sensations whether the user is playing the deployed web app on mobile Chrome/Safari or running the native Android APK.

---

### Decision 4: Mobile App Lifecycle & Hardware Back Button (`MobileLifecycle.js`)
- **Decision**: Integrate `@capacitor/app` to bind native lifecycle events:
  - `appStateChange`:
    - When `isActive: false` (app backgrounded): pause `GameModeManager` and call `SimulationEngine.getSnapshot()` to persist state to `CareerStorage`.
    - When `isActive: true` (app foregrounded): resume simulation loop.
  - `backButton`:
    - Check if any modal is active (`SettingsModal`, `MissionDebriefingModal`, `MissionBriefingModal`, `ModeSelectModal`, or `NodeInspector`).
    - If modal open, call `modal.hide()` and prevent app exit.
    - If no modal open, permit standard OS navigation.
- **Rationale**:
  - Standardizes mobile user expectations (hardware back dismisses dialogs) and prevents battery drain when the device is locked or switched to another app.

---

### Decision 5: Audio & Feedback Settings Persistence
- **Decision**: Save audio and haptic configuration in `localStorage` under `cloud_sim_settings_v1`:
  ```json
  {
    "masterVolume": 0.8,
    "sfxVolume": 1.0,
    "ambientVolume": 0.6,
    "isMasterMuted": false,
    "isAmbientMuted": false,
    "isSfxMuted": false,
    "isHapticsEnabled": true
  }
  ```
- **Rationale**:
  - Allows players to tune or mute ambient noise independently from crisp UI click sounds.
  - Persists settings across browser reloads and native app restarts.
