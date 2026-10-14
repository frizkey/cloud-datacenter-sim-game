# Quickstart & Verification Guide: Procedural Audio, Mobile Haptics & Native Packaging

**Feature**: `specs/004-audio-haptics-mobile`  
**Date**: 2026-10-14  

This guide provides verification procedures for testing the procedural audio synthesis, tactile haptics, Settings modal, and native Capacitor lifecycle hooks.

---

## 1. Automated Test Execution

Run the headless unit test suite:

```bash
# Run all tests including Phase 4 Audio & Haptics tests
npm test

# Run audio & mobile tests specifically
npx vitest run tests/audio-mobile.test.js
```

### Expected Output:
- Verification of procedural audio synthesis methods (`playSfx`, `startAmbientHum`, `stopAmbientHum`, `startSiren`, `stopSiren`).
- Verification of audio gain scaling and mute toggles.
- Verification of haptic trigger mapping (light, medium, heavy, warning, success) and vibration fallback.
- Verification of settings persistence (`AudioSettingsStorage` load, save, default fallback).
- Verification of app background lifecycle pausing simulation and triggering auto-save.

---

## 2. Browser Interactive Verification

1. Start development server:
   ```bash
   npm run dev
   ```
2. Open [`http://localhost:5173`](http://localhost:5173) in browser.
3. Tap anywhere on the canvas to unlock the Web Audio `AudioContext`.
4. Open the Settings modal by tapping the `⚙️` button in the top right of CockpitHUD:
   - Adjust **Master Volume**, **SFX Volume**, and **Ambient Datacenter Hum** sliders.
   - Toggle **Ambient Datacenter Hum**: verify the background drone fades out.
   - Toggle **Haptic Feedback**: verify state is saved.
5. In game:
   - Place a node: hear the procedural two-tone harmonic blip.
   - Connect two nodes: hear the connection chord.
   - Switch to **Facility View**: hear the continuous cooling fan ambient soundscape.
   - Trigger an incident via IncidentBar or Chaos Lab: hear the two-tone emergency alarm siren.
   - Complete Level 1: hear the 4-note ascending victory fanfare.

---

## 3. Capacitor Native Android Sync Verification

Verify Capacitor Android project synchronization:

```bash
# Sync web build assets with native Android wrapper
npm run build
npx cap sync android
```

Expected result: Android assets synced successfully to `android/app/src/main/assets/public`.
