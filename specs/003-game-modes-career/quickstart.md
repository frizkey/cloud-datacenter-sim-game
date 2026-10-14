# Quickstart & Verification Guide: Game Modes & SRE Career Campaign

**Feature**: `specs/003-game-modes-career`  
**Date**: 2026-10-14  

This document provides quick runnable validation procedures for Phase 3 game modes, levels, and career persistence.

---

## 1. Automated Test Execution

Run the headless unit and scenario test suite:

```bash
# Run all tests including Phase 3 GameMode tests
npm test

# Run game mode tests specifically
npx vitest run tests/game-modes.test.js
```

### Expected Output:
- Verification of Career Levels 1 through 5 initialization with deterministic topologies and starting funds.
- Verification of the 3-star scoring engine awarding 1, 2, or 3 stars based on SLA thresholds and cash reserves.
- Verification of scripted incident triggers (e.g. Level 1 OOM at $t=30\text{s}$, Level 3 DDoS at $t=30\text{s}$).
- Verification of Endless Survival scaling (wave multipliers every 120s) and high-score recording.
- Verification of Sandbox mode (unlimited cash and unlocked drawer).
- Verification of `CareerStorage` save/load/reset operations.

---

## 2. Interactive Headless Script Verification

Run a headless multi-level simulation test run using Node.js:

```bash
node -e "
  const { GameModeManager } = require('./src/core/sim/GameModeManager.js');
  const { CareerStorage } = require('./src/core/storage/CareerStorage.js');
  
  const mgr = new GameModeManager();
  console.log('Loading Level 1: The Startup Launch...');
  mgr.loadLevel(1);
  console.log('Level 1 Loaded. Initial Cash:', mgr.engine.state.cashMicroCents / 1000000);
  
  // Advance 90 seconds (90 ticks)
  for (let s = 0; s < 90; s++) {
    mgr.tick();
  }
  
  console.log('Level 1 Status:', mgr.state);
  console.log('Stars Awarded:', mgr.lastStarsEarned);
"
```

---

## 3. Browser & Mobile Modal Verification

1. Start the Vite local development server:
   ```bash
   npm run dev
   ```
2. Open [`http://localhost:5173`](http://localhost:5173) in Chrome DevTools with Mobile Device Mode enabled (e.g. Pixel 7 or iPhone 14 Pro, landscape orientation).
3. Click **"Modes"** button in top-left HUD.
4. Verify **Mode Select Modal** opens with 3 cards:
   - **Career Campaign**: Displays Level 1 unlocked with Star ratings.
   - **Endless Survival**: Displays personal high score.
   - **Chaos Sandbox**: Displays unconstrained creative mode.
5. Tap **Career -> Level 1**.
6. Verify **Mission Briefing Modal** opens with lore, victory conditions (Survive 90s, SLA $\ge 99\%$, Cash $> \$20$), and "Deploy & Start" button.
7. Tap **"Deploy & Start"**:
   - Verify modal closes.
   - Level timer counts down from 90s.
   - Pod OOM occurs at $t = 30\text{s}$.
8. Upon mission completion, verify **Mission Debriefing Modal** appears showing:
   - "MISSION ACCOMPLISHED!" banner.
   - 1-3 star animations.
   - SLA score and profit breakdown.
   - "Next Level" button unlocked.
