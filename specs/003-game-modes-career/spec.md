# Feature Specification: Game Modes & SRE Career Campaign

**Feature Branch**: `003-game-modes-career`  
**Created**: 2026-10-14  
**Status**: Draft  
**Input**: Career campaign mode, survival mode, sandbox chaos lab, and level progression derived from [docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md) (§8) and [docs/MOBILE_GAME_FEASIBILITY_STUDY.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/MOBILE_GAME_FEASIBILITY_STUDY.md) (§2.2)  
**Governance**: Ratified under [.specify/memory/constitution.md](file:///home/arie/labs/cloud-datacenter-sim-game/.specify/memory/constitution.md)

---

## 1. Executive Summary & Vision

Phase 3 introduces the structured gameplay loops that transform the underlying simulation sandbox into an engaging, replayable mobile game. Players experience an authentic career trajectory from a Junior Cloud Engineer handling early startup traffic to a Principal SRE managing mission-critical enterprise infrastructure under catastrophic multi-tier chaos.

This feature delivers three distinct game modes:
1. **Story-Driven SRE Career Campaign (Levels 1–5)**: A sequential progression of authentic scenarios featuring predefined starting states, specific financial and technical constraints, scripted traffic milestones, dynamic incident triggers, and 3-star completion scoring.
2. **Endless Survival Mode**: A high-stakes endurance challenge where traffic volume scales exponentially every 120 seconds, chaos incidents escalate in frequency, and players compete to maximize uptime duration and cumulative company valuation before bankruptcy or total collapse.
3. **Chaos Lab (Sandbox Mode)**: An unconstrained creative environment with unlimited capital, all catalog components unlocked, and a manual incident injection drawer for testing extreme topologies.
4. **Mission Briefing & Debriefing Mobile UI**: Glassmorphic modal overlays presenting mission objectives, real-time victory/failure condition tracking, star ratings, and persistent career progress saved to local storage.

---

## 2. User Scenarios & Testing

### User Story 1 - SRE Career Campaign Progression (Priority: P1) 🎯 MVP

As a player, I want to progress through a 5-level career campaign with authentic operational scenarios and distinct victory criteria, so that I learn advanced architecture patterns and experience escalating SRE challenges.

**Why this priority**: Structured levels provide goal-directed motivation, clear progression milestones, and gradual onboarding into complex multi-tier topologies.

**Independent Test**: Can be verified headlessly: loading Level 1 initializes the engine with starter components ($1\text{ VM} + 1\text{ DB}$) and $15 starting cash; surviving 90 seconds with $\text{SLA} \ge 99.0\%$ and positive net income triggers victory and unlocks Level 2.

**Campaign Level Matrix**:
* **Level 1: The Startup Launch**
  * *Context*: A fledging SaaS product launches on social media.
  * *Starter Footprint*: $1\text{ Ingress} \rightarrow 1\text{ Compute Pod} \rightarrow 1\text{ SQL DB}$. Starting Cash: $\$15.00$.
  * *Victory Condition*: Maintain $\text{SLA} \ge 99.0\%$ for 90 seconds while processing at least 500 requests with Cash $> \$20.00$.
  * *Incident*: Single Pod OOM memory leak at $t = 30\text{s}$.
* **Level 2: The E-Commerce Flash Sale**
  * *Context*: Annual 11.11 shopping promotional surge.
  * *Starter Footprint*: $1\text{ Ingress} \rightarrow 1\text{ ALB} \rightarrow 2\text{ Pods} \rightarrow 1\text{ DB}$. Starting Cash: $\$35.00$.
  * *Victory Condition*: Absorb a 10x traffic spike ($2{,}500\text{ RPS}$) for 120 seconds with Cache hit rate $> 70\%$ and zero bankruptcy.
  * *Incident*: Cache stampede dogpiling at $t = 45\text{s}$.
* **Level 3: Under Cyber Siege**
  * *Context*: State-sponsored botnet and credential stuffing attacks targeting checkout endpoints.
  * *Starter Footprint*: Full 3-tier web app without perimeter security. Starting Cash: $\$60.00$.
  * *Victory Condition*: Defend perimeter for 150 seconds, blocking $\ge 95\%$ of malicious attack packets with WAF and keeping error rate $< 2.0\%$.
  * *Incidents*: Volumetric DDoS flood at $t = 30\text{s}$ and SQLi exploit at $t = 75\text{s}$.
* **Level 4: Global Multi-Region Expansion**
  * *Context*: Worldwide user base requiring geographic availability.
  * *Starter Footprint*: Multi-region Ingress (US, EU, AP). Starting Cash: $\$100.00$.
  * *Victory Condition*: Sustain 180 seconds with average round-trip latency $< 40\text{ms}$ across all regions.
  * *Incidents*: Cross-region network partition (Split-Brain) at $t = 60\text{s}$ and cloud provider AZ outage at $t = 120\text{s}$.
* **Level 5: Tier-4 Greenfield Data Center**
  * *Context*: Construction of a brand new physical facility from an empty floor.
  * *Starter Footprint*: Bare datacenter floor ($0\text{ racks}$). Starting Cash: $\$150.00$.
  * *Victory Condition*: Construct at least 4 server racks, 2 CRAC chillers, 1 UPS battery, and 1 Diesel Generator, maintaining $\text{PUE} < 1.30$ and surviving a 60-second municipal grid blackout.
  * *Incidents*: Severe rack overheating fire at $t = 40\text{s}$ and municipal grid blackout at $t = 90\text{s}$.

**Acceptance Scenarios**:
1. **Given** Level 1 is active, **When** 90 seconds elapse with SLA at $99.5\%$ and Cash at $\$24.50$, **Then** a Level Complete modal appears, awarding 3 stars and unlocking Level 2.
2. **Given** any campaign level, **When** cash balance remains negative for 30 seconds or SLA drops below $80.0\%$, **Then** a Mission Failed modal appears with a "Retry Mission" button.
3. **Given** Level 1 completed with 2 stars, **When** the player returns to the Level Select menu, **Then** Level 2 is unlocked and Level 1 displays its 2-star badge.

---

### User Story 2 - Endless Survival Mode (Priority: P2)

As a player, I want to test my architectural resilience in an Endless Survival Mode where traffic volume and incident severity escalate over time, so that I can challenge myself and achieve high survival scores.

**Why this priority**: Endless mode provides infinite replayability and challenges players to design self-healing, highly scalable systems.

**Independent Test**: Can be tested headlessly: starting Survival Mode sets initial traffic to 100 RPS; every 120 seconds, traffic multiplier increases by $1.5\times$ and random Tier 1–3 chaos events spawn; simulation runs until insolvency or SLA failure.

**Acceptance Scenarios**:
1. **Given** Survival Mode is active, **When** every 120 seconds elapse, **Then** incoming traffic increases by $+50\%$ and an incident warning is scheduled.
2. **Given** an architecture collapsing under survival load, **When** bankruptcy triggers, **Then** the game ends and records Survival Time, Total Packets Processed, and Final Net Profit.
3. **Given** a new personal record in Survival Mode, **When** the debriefing screen displays, **Then** the high score is saved to persistent local storage.

---

### User Story 3 - Chaos Lab Sandbox Mode (Priority: P2)

As a player, I want a creative Sandbox Mode with unlimited budget and instant component access, so that I can experiment with novel architectures and manually stress-test compound failure scenarios.

**Why this priority**: Allows players to experiment freely without financial penalties and study system dynamics under controlled conditions.

**Independent Test**: Can be tested headlessly: in Sandbox Mode, starting cash is set to $\$1{,}000{,}000$ (effectively unlimited), all catalog components cost $\$0$, and manual incident triggers can be executed on demand.

**Acceptance Scenarios**:
1. **Given** Sandbox Mode is selected, **When** the simulation starts, **Then** cash balance reads "$\infty$" or "$999,999", and all bottom drawer items can be placed without funds restriction.
2. **Given** Sandbox Mode, **When** the player opens the Chaos Injector panel, **Then** they can trigger any of the 10 incidents at will to observe propagation.

---

### User Story 4 - Mode Selection, Briefing & Debriefing UI (Priority: P3)

As a mobile player, I want a clean, touch-friendly Level Select screen and Mission Briefing/Debriefing modals with clear objectives and star ratings, so that I can easily navigate between levels and understand mission goals.

**Why this priority**: Mobile players require clear visual goals, immediate feedback, and intuitive touch navigation adhering to safe-area bounds.

**Independent Test**: Can be verified in browser and native APK: tapping "Career" opens the level carousel; tapping Level 1 displays the briefing card with objectives; finishing a level displays the 3-star scorecard with animated badges.

**Acceptance Scenarios**:
1. **Given** the player is at the title/main HUD, **When** they tap the "Game Modes" button, **Then** a full-screen drawer or modal allows selecting between Career Campaign, Survival, and Sandbox.
2. **Given** a mission briefing modal, **When** the player taps "Deploy & Start", **Then** the modal dismisses, the level timer starts, and the camera focuses on the starter nodes.
3. **Given** the Mission Debriefing modal, **When** victory is achieved, **Then** star breakdown is displayed:
   - 1 Star: Primary mission objective met (Survive duration).
   - 2 Stars: High SLA rating maintained ($\ge 99.5\%$).
   - 3 Stars: Profitability target achieved (e.g. Cash $> \$25.00$).

---

## 3. Requirements & Technical Specifications

### 3.1 Functional Requirements

- **FR-035**: System MUST implement a `GameModeManager` class that manages game state, active mode (`CAMPAIGN`, `SURVIVAL`, `SANDBOX`), and level configuration.
- **FR-036**: System MUST define structured configuration objects for Campaign Levels 1 through 5, including starter topology, starting cash, duration, victory conditions, and scripted incident timelines.
- **FR-037**: System MUST track level objective criteria in real time: elapsed time, current SLA reputation, cash balance, requests processed, and incident mitigation status.
- **FR-038**: System MUST evaluate victory and defeat conditions every second during campaign missions.
- **FR-039**: System MUST support a 3-star scoring algorithm per campaign level based on base survival, SLA maintenance ($\ge 99.5\%$), and budget margin.
- **FR-040**: System MUST persist campaign progression (unlocked levels, best star ratings, survival high score) to local persistent storage (`IndexedDB` + `LocalStorage`).
- **FR-041**: System MUST implement `EndlessSurvivalMode` scaling incoming RPS by $1.5\times$ every 120 seconds and spawning random incidents with increasing frequency.
- **FR-042**: System MUST implement `SandboxMode` with infinite cash, unlocked components, and manual chaos injection capabilities.
- **FR-043**: System MUST provide a mobile-optimized `ModeSelectModal` allowing switching between Campaign, Survival, and Sandbox modes.
- **FR-044**: System MUST provide a mobile-optimized `MissionBriefingModal` displaying level lore, starter footprint, and victory/defeat criteria before level launch.
- **FR-045**: System MUST provide a mobile-optimized `MissionDebriefingModal` displaying victory/defeat outcome, star badges, final stats, and "Next Level" / "Retry" actions.
- **FR-046**: All interactive buttons in mode selection and briefing modals MUST adhere to $\ge 48 \times 48\text{ dp}$ touch targets and respect `env(safe-area-inset-*)`.

---

### 3.2 Key Entities & Data Models

```typescript
export type GameModeType = 'CAMPAIGN' | 'SURVIVAL' | 'SANDBOX';

export interface CampaignLevelConfig {
  levelNumber: number;
  id: string;
  title: string;
  subtitle: string;
  lore: string;
  durationSec: number;
  startingCashMicroCents: number;
  starterNodes: Array<{ type: string; gridX: number; gridY: number }>;
  starterConnections: Array<{ sourceIndex: number; targetIndex: number }>;
  starterFacilities?: Array<{ type: string; isoX: number; isoY: number }>;
  objectives: {
    minSlaPercent: number;
    minProcessedRequests: number;
    minFinalCashMicroCents: number;
  };
  scriptedIncidents: Array<{
    triggerAtSec: number;
    incidentType: string;
    targetComponentId?: string;
  }>;
}

export interface PlayerCareerProgress {
  unlockedLevel: number;
  levelStars: Record<number, number>; // levelNumber -> stars (1-3)
  survivalHighScoreSec: number;
  survivalMaxRequests: number;
  totalCareerCashEarnedMicroCents: number;
}
```

---

## 4. Success Criteria

- **SC-015**: All 5 campaign levels load deterministically with exact starter nodes, cash reserves, and scripted incident triggers in automated tests.
- **SC-016**: Campaign victory condition evaluator accurately awards 1, 2, or 3 stars based on player performance across 100% of test cases.
- **SC-017**: Survival mode scales traffic every 120 seconds and terminates cleanly with high-score persistence upon insolvency.
- **SC-018**: Player progression persists across sessions and browser reloads in under 50 milliseconds.
- **SC-019**: All briefing, debriefing, and mode selection touch targets meet or exceed $48 \times 48\text{ dp}$ with zero mis-click overlaps.
- **SC-020**: Full test suite passes with $100\%$ green assertions and zero regressions against Phase 1 & 2 tests.

---

## 5. Scope Boundaries

- **In Scope for Phase 3**: Career Levels 1–5, Survival Mode, Sandbox Mode, GameModeManager, briefing/debriefing modals, 3-star rating system, and local career persistence.
- **Deferred to Future Expansion**: Cloud-synchronized global online leaderboards, community user-created level editor, and multiplayer PvP competitive hacking.
- **Strictly Prohibited**: Conference presentation hotkeys, static slide layouts, and 1-click cheat buttons.
