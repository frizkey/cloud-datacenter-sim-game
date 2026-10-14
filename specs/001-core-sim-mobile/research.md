# Research & Technical Decisions: Core Simulation Engine & Mobile Cockpit

**Feature**: `001-core-sim-mobile`  
**Date**: 2026-10-14  
**Status**: Completed  
**Spec Reference**: [specs/001-core-sim-mobile/spec.md](./spec.md)  
**Constitution Reference**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

## 1. Headless Fixed-Tick Simulation Engine

### Context & Requirements
The game requires deterministic calculations for four interconnected resource flows:
1. Request Latency: $\text{Latency} = T_{\text{DNS}} + T_{\text{WAF}} + T_{\text{LB}} + T_{\text{Compute}} + (P_{\text{Hit}} \times T_{\text{Cache}} + (1 - P_{\text{Hit}}) \times T_{\text{DB}})$
2. Heat Output: $\text{Heat (BTU/h)} = \text{Watts} \times 3.41214 \times (1 + \text{CPU}_{\text{Load}}\%)$
3. Power Usage Effectiveness: $\text{PUE} = \frac{\text{Total Facility Power}}{\text{IT Equipment Power}}$
4. Cashflow: $\text{Net Income} = (\text{Successful Requests} \times \$0.0002) - (\text{Hardware OPEX} + \text{Power Bill} + \text{Egress}) - \text{SLA Penalties}$

Constitution Principle I dictates that this engine must have zero dependencies on DOM, browser canvas, or Phaser APIs to allow standalone Node.js testing.

### Decision
- **Architecture**: Pure TypeScript / ESNext modular state machine running a fixed timestep accumulator (default: 60 ticks/s in active mode, with capability to run at 1,000x for headless stress tests).
- **Decoupling Strategy**: The simulation engine exposes an `update(deltaMs)` tick method and emits immutable `TelemetrySnapshot` objects over a lightweight `EventBus`. The rendering layer listens to snapshots and dispatches player action commands (`placeNode`, `connectNodes`, `applyRemediation`) through command handlers.
- **Floating-Point Stability**: Monetary values are tracked in integer micro-cents ($1\text{ USD} = 1,000,000\text{ units}$) and roundoff error in thermal calculations is bounded by clamping.

### Alternatives Evaluated
- *Tight coupling inside Phaser `Scene.update()`*: Rejected because it prevents headless unit testing, binds simulation speed to screen refresh rate (causing game logic to run twice as fast on 120Hz mobile screens), and prevents fast-forwarding offline earnings.
- *Web Worker thread isolation*: Considered. While viable, passing large state objects via `postMessage` creates serialization overhead on lower-end mobile devices. For Phase 1, keeping the headless engine on the main loop using a decoupled event bus provides the lowest latency and easiest debugging while preserving headless testability. A Web Worker adapter can be plugged in during Phase 2 if simulation scale exceeds 10,000 entities.

---

## 2. Dual-Perspective Mobile Presentation (Phaser 4.2.1)

### Context & Requirements
The player must toggle between two views without packet desynchronization or state reset:
1. **Logical Topology View:** 2D orthogonal node graph with flowing packet particles and queue buffers.
2. **Physical Facility View:** 2.5D isometric data center floor grid ($N \times M$ cells) with server racks, CRAC units, PDUs, and generators.

### Decision
- **Scene Management**: Utilize Phaser 4 scene switching (`scene.sleep()` and `scene.wake()` or simultaneous parallel running where the inactive scene ceases drawing while maintaining its display objects).
- **Isometric Grid Matrix**: Implement an isometric coordinate projection utility:
  $$\text{screenX} = (gridX - gridY) \times \frac{\text{tileWidth}}{2} + \text{originX}$$
  $$\text{screenY} = (gridX + gridY) \times \frac{\text{tileHeight}}{2} + \text{originY}$$
  With reverse screen-to-grid raycasting for touch hit testing.
- **Packet Particle Pooling**: Mobile WebGL has strict garbage collection boundaries. Creating 500 new packet objects per second triggers GC stutter. We implement a pre-allocated `ObjectPool<PacketSprite>` (capacity: 5,000 particles) using Phaser 4 particle emitters / sprite instances, recycling particles upon destination arrival.

### Alternatives Evaluated
- *DOM / HTML5 Canvas hybrid (React Flow + Three.js)*: High memory consumption, massive battery drain on mobile, inconsistent touch responsiveness across devices.
- *Single unified 3D engine (Three.js / Babylon.js)*: Overkill for schematic cloud architecture diagrams; 2.5D isometric pixel art in Phaser 4 provides better battery efficiency, smaller asset footprint, and superior nostalgic tycoon aesthetics.

---

## 3. Touchscreen Ergonomics & Gesture State Machine

### Context & Requirements
Mobile devices require landscape orientation with dual-thumb controls. Touch targets must be $\ge 48 \times 48\text{ dp}$ with safe-area insets. The input system must disambiguate:
- Single-finger canvas pan
- Two-finger pinch-to-zoom ($0.5\times$ to $2.5\times$)
- Hold-and-drag component placement from palette
- Tap-and-drag point-to-point node wiring

### Decision
- **Touch Gesture State Machine (FSM):**
  - `IDLE`: Listening for pointer down.
  - `PANNING`: Pointer moved $> 10\text{ px}$ on empty canvas without pinch.
  - `PINCHING`: Two active pointers; calculate distance ratio and adjust camera zoom with clamp $[0.5, 2.5]$.
  - `DRAGGING_COMPONENT`: Pointer started inside bottom drawer; render semi-transparent ghost at touch position; snap to grid on pointer up.
  - `WIRING_CABLE`: Pointer down on node output port; draw orthogonal preview wire to current touch position; snap to target input port on release.
- **HUD Glassmorphism Overlay**: Render top metrics bar and bottom category drawer as high-performance CSS Grid/Flex DOM overlays on top of the Phaser canvas, leveraging native hardware-accelerated CSS transforms and touch event isolation (`pointer-events: auto` on UI, `none` on canvas pass-through).

---

## 4. Multi-Target Deployment Pipeline: Coolify, Android APK & iOS

### Context & Requirements
- Web game deployment on Coolify for rapid testing, continuous staging, and live playtesting.
- Standalone Android APK for release.
- iOS compatibility path given headless Linux environment.

### Decision
1. **Coolify Web Deployment:**
   - Multi-stage `Dockerfile`:
     - Stage 1: `node:22-alpine` runs `npm ci` and `npm run build` to produce optimized static assets in `/dist`.
     - Stage 2: `nginx:alpine` copies `/dist` into `/usr/share/nginx/html` with custom Nginx configuration enabling gzip/brotli compression, MIME types for WebGL/WASM/Audio, and cache-control headers (`Cache-Control: public, max-age=31536000` for hashed assets, `no-cache` for `index.html`).
   - Integrated with Coolify Git Webhooks to auto-deploy on push to `main`.
2. **Android Release Packaging:**
   - Use **Capacitor 6** (`@capacitor/core`, `@capacitor/android`).
   - Build flow: `npm run build` $\rightarrow$ `npx cap sync android` $\rightarrow$ Gradle CLI (`./gradlew assembleDebug` or `bundleRelease`).
   - Min SDK: API 26 (Android 8.0 Oreo), Target SDK: API 34.
3. **iOS Support (Headless Linux Strategy):**
   - **Tier 1 (Instant Testing via Coolify):** Deliver full PWA manifest with `display: standalone`, `apple-mobile-web-app-capable`, and iOS touch icons. iOS Safari users can "Add to Home Screen" for an authentic full-screen 60 FPS mobile app experience without App Store overhead.
   - **Tier 2 (Native IPA CI):** Scaffold `@capacitor/ios`. Set up a GitHub Actions workflow on `macos-latest` to compile and sign the Xcode project remotely upon release tag creation, generating an installable `.ipa` without needing a physical Mac.

---

## 5. Rejection of Presentation Style

### Context & Decision
Earlier experiments (`cloud-arch-presenter`) featured presentation modes (`P`), slide embed modals, pre-canned architectures, and 1-click disaster/cheat-fix buttons. 

### Enforced Rule
All presentation artifacts, slide modals, and static pre-canned layouts are banned from the codebase.
- The player starts with an empty canvas or minimal starter setup ($1\text{ VM} + 1\text{ DB}$).
- Every component must be purchased with in-game cash.
- Wires must be routed by the player.
- Traffic scales dynamically from organic customer curves.
- Disasters occur dynamically via a Chaos Director engine and must be triaged through real in-game SRE mechanics.
