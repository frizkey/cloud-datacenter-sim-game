# Quickstart Guide: Advanced Infrastructure & SRE Chaos (Phase 2)

**Feature**: `002-advanced-infra-chaos`  
**Date**: 2026-10-14  

---

## 1. Running Unit Tests

Run the test suite verifying all new components, power physics, and Tier 2-3 incidents:

```bash
# Run all unit tests
node --test tests/*.test.js

# Run power engine and blackout tests
node --test tests/power-engine.test.js

# Run advanced chaos incident tests
node --test tests/advanced-chaos.test.js
```

---

## 2. Running Determinism Stress Benchmark

Verify zero float drift and 60-tick performance under blackout and DDoS conditions:

```bash
node tests/stress-sim.benchmark.js
```

---

## 3. Interactive Web & Mobile Playtesting

Start the Vite development server:

```bash
npm run dev
```

Open `http://localhost:5173/` in your browser. Set viewport to mobile landscape (e.g. iPhone 14 Pro Max landscape $932 \times 430\text{ px}$).

### Test Scenarios:
1. **Perimeter Defense**: Open the bottom drawer, tap `Perimeter`, deploy a `WAF` and `CDN`. Notice static traffic latency drops to ~12ms.
2. **Power Grid Blackout**: In `FacilityScene`, build a `UPS_BATTERY` and `DIESEL_GENERATOR`. Trigger a blackout event and watch the UPS battery discharge countdown. Tap "Start Generator" before the battery dies to save the data center.
3. **DDoS Scrubbing**: When a Volumetric DDoS incident flashes on the incident bar, tap "Scrub Traffic" to engage the edge shield and watch attack packets turn into crimson bursts.
