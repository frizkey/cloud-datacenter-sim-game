# Quickstart & Verification Guide: Production-Grade Readiness

**Feature**: `005-production-grade-readiness`  
**Date**: 2026-10-15  

---

## 1. Automated Verification Commands

Run all headless test suites to verify zero regressions across the deterministic simulation engine:

```bash
# Run complete test suite (all 78+ unit tests across 17 suites)
npm test

# Run specific test suites
node --test tests/simulation-engine.test.js
node --test tests/game-modes.test.js
node --test tests/audio-mobile.test.js
node --test tests/state-persistence.test.js
node --test tests/particle-performance.test.js

# Verify Vite production build
npm run build

# Synchronize mobile assets to Android Capacitor
npx cap sync android
```

---

## 2. Interactive Feature Verification Checklist

### 2.1 Campaign Level Coordinates (P0)
1. Open the game in the browser or mobile container.
2. Tap **Modes** $\rightarrow$ select **Level 1: The Startup Launch** $\rightarrow$ click **Deploy Level**.
3. **Verify**: Ingress, Node.js App Pod, and Postgres DB spawn directly in the center of the screen ($520, 320$). No off-screen scrolling or $8,000\text{px}$ offset.

### 2.2 StatePersistence Auto-Save & Session Restore (P0)
1. In Sandbox mode, place 3 custom nodes and wire them.
2. Note your cash balance and current RPS.
3. Refresh the browser tab (or close and re-open the mobile app).
4. **Verify**: The exact custom nodes, coordinates, active connections, and cash balance restore automatically with an offline catch-up report.

### 2.3 Manual Port-to-Port Cable Wiring (P0)
1. Place a Load Balancer at `(4, 4)` and a Compute Pod at `(7, 4)`.
2. Touch/click the right port dot ($+36, 0$) of the Load Balancer and drag toward the Compute Pod.
3. **Verify**: An interactive 90-degree orthogonal stepped conduit rubber-bands to the pointer.
4. Release over the left port dot ($-36, 0$) of the Compute Pod.
5. **Verify**: The cable locks into place, plays a tactile mechanical snap sound, triggers a haptic tap, and begins routing traffic.

### 2.4 Vector Sci-Fi Cards & Visual Juice (P1)
1. Observe all placed nodes in `TopologyScene`.
2. **Verify**: Nodes render with custom glowing vector blueprints and card designs—no system emojis.
3. Watch packets reach nodes.
4. **Verify**: Floating emerald numbers (`+$0.002`) rise from nodes on processed requests, and cables pulse with neon conduit glow.

### 2.5 Multi-Stem Audio Mixer (P1)
1. Open the **Settings Modal** (gear icon in CockpitHUD).
2. Adjust the **Music**, **SFX**, and **Ambience** sliders independently.
3. **Verify**: Each audio bus changes volume smoothly without clipping.
4. Trigger an incident from the Incident Bar.
5. **Verify**: High-tempo crisis music layers in seamlessly over the ambient synth track.

### 2.6 SRE Tech Tree & Client Contracts (P2)
1. Tap the **Research Lab** icon in the HUD.
2. Spend accumulated research capital to unlock **Cloud-Native Era** (WAF & CDN).
3. **Verify**: WAF and CDN Edge immediately become selectable in the bottom Build Drawer.
4. Tap **Contracts** $\rightarrow$ accept **NeoVault Fintech RFP**.
5. **Verify**: Maintaining $< 30\text{ms}$ latency and $99.99\%$ SLA streams bonus revenue per second.
