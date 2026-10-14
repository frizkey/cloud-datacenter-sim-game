# Quickstart & Verification Guide: Core Simulation Engine & Mobile Cockpit

**Feature**: `001-core-sim-mobile`  
**Date**: 2026-10-14  
**Spec Reference**: [specs/001-core-sim-mobile/spec.md](./spec.md)  
**Plan Reference**: [specs/001-core-sim-mobile/plan.md](./plan.md)  
**Data Model**: [specs/001-core-sim-mobile/data-model.md](./data-model.md)

---

## 1. Prerequisites
- **Node.js**: v20.x or v22.x LTS
- **Package Manager**: npm v10+
- **Docker**: (Optional, for Coolify container validation)
- **Android SDK & Gradle**: (Optional, for native APK generation)

---

## 2. Installation & Verification Commands

### 2.1 Install Dependencies
```bash
npm install
```

### 2.2 Run Headless Unit Tests (Deterministic Core Verification)
Validates the mathematical engine, four resource equations, and incident state transitions without DOM dependencies:
```bash
npm test
```
*Expected Outcome:* All unit tests in `tests/*.test.js` pass with 0 failures.

### 2.3 Run Headless 10,000-Tick Simulation Stress Benchmark
Validates long-running simulation stability, float roundoff bounds, and garbage-collection safety:
```bash
node tests/stress-sim.benchmark.js
```
*Expected Outcome:* 10,000 ticks complete in $< 1,500\text{ ms}$ with zero float accumulation error and zero uncaught exceptions.

### 2.4 Run Local Development Web Server
Starts the Vite development server with hot-module reload for interactive testing:
```bash
npm run dev
```
*Expected Outcome:* Local URL `http://localhost:5173/` opens the 60 FPS mobile landscape canvas with active dual-perspective toggle (`TopologyScene` $\leftrightarrow$ `FacilityScene`).

### 2.5 Build Production Assets
Compiles production bundles and checks bundle size limits:
```bash
npm run build
```
*Expected Outcome:* Vite builds static output to `dist/` with valid asset hashes and zero syntax errors.

---

## 3. Deployment Validation Scenarios

### 3.1 Coolify Web Container Build & Run (Local Docker Test)
Test the multi-stage Docker build locally before deploying to Coolify:
```bash
# 1. Build container image
docker build -t cloud-datacenter-sim-game:test .

# 2. Run container
docker run -d -p 8080:80 --name test-sim-game cloud-datacenter-sim-game:test

# 3. Verify HTTP 200 OK
curl -I http://localhost:8080/

# 4. Cleanup
docker rm -f test-sim-game
```
*Expected Outcome:* Returns `HTTP/1.1 200 OK` with `Content-Type: text/html`.

### 3.2 Android Release APK Generation (Capacitor)
Generates the native Android package:
```bash
# 1. Build web distribution
npm run build

# 2. Sync web assets to Capacitor Android project
npx cap sync android

# 3. Build standalone debug APK
cd android && ./gradlew assembleDebug
```
*Expected Outcome:* Emits debug APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

### 3.3 iOS PWA Validation
1. Open the Coolify URL on iOS Safari.
2. Tap the Safari Share button $\rightarrow$ select *"Add to Home Screen"*.
3. Launch the game from the iOS Home Screen.
*Expected Outcome:* The game boots full-screen in landscape orientation without Safari address/navigation bars, running at fluid 60 FPS.
