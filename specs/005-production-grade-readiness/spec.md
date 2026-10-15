# Feature Specification: Production-Grade Game Readiness & Polish

**Feature Branch**: `005-production-grade-readiness`  
**Created**: 2026-10-15  
**Status**: Draft  
**Input**: User description: "specify from docs/PRODUCTION_GRADE_GAP_ANALYSIS.md and make sure there no issue leftout"  
**Constitutional Grounding**: 
- `docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md` (§2, §3, §4, §5, §6, §7, §8)
- `docs/MOBILE_GAME_FEASIBILITY_STUDY.md` (§1, §2, §3)
- `docs/PRODUCTION_GRADE_GAP_ANALYSIS.md` (Sections 1 through 9)
- `.specify/memory/constitution.md` (Principles I through V)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Critical Coordinate, Persistence & Manual Wiring Fixes (Priority: P1)

As a player starting the game or playing through Career Campaign Levels 1–5, I want my infrastructure to be visible on-screen, my progress automatically saved across browser and app restarts, and the ability to manually wire network cables between specific ports, so that the game loop is playable, tactile, and reliable.

**Why this priority**: Without correct coordinates, levels spawn off-screen in empty void. Without persistent state bootstrap, all player progress is lost on page reload. Without manual port wiring, players cannot design custom network topologies or active-passive routes.

**Independent Test**:
- Can be independently tested by:
  1. Loading Campaign Level 1 and verifying nodes appear centered in the visible viewport.
  2. Placing nodes, refreshing the browser, and confirming state restores seamlessly.
  3. Clicking and dragging from Node A's output port to Node B's input port and confirming an orthogonal cable is created and carries traffic.

**Acceptance Scenarios**:
1. **Given** a player launches Campaign Level 1, **When** the briefing is accepted, **Then** all starter nodes spawn at integer grid coordinates ($2 \le x \le 12, 2 \le y \le 8$) centered in the camera view ($520, 320$), completely eliminating the $8,000\text{px}$ off-screen bug.
2. **Given** a player has built a custom topology, **When** 30 seconds elapse or the window/app loses focus (`visibilitychange` / Capacitor pause), **Then** the engine state serializes to storage and immediately restores upon reload with offline catch-up calculations applied.
3. **Given** two placed nodes on the canvas, **When** the player drags from an output port of Node A onto an input port of Node B, **Then** an orthogonal stepped Manhattan cable connects the nodes if validation passes (preventing self-loops and ingress-targeting).

---

### User Story 2 - Visual Overhaul, Neon Conduits & Visual "Juice" (Priority: P1)

As a player managing an infrastructure network, I want high-contrast sci-fi vector component cards (no system emojis), animated neon orthogonal conduits with saturation indicators, and floating financial/SLA feedback, so that the game looks and feels like a professional, polished commercial title.

**Why this priority**: Replacing OS-dependent emoji glyphs with dedicated vector/pixel art and adding floating numbers and conduit glow transforms the game from a hobbyist prototype into an immersive, satisfying experience (*Factorio* / *Mindustry* visual parity).

**Independent Test**:
- Can be independently verified by inspecting visual rendering on Web and mobile, confirming custom SVG/vector graphics instead of system emojis, stepped Manhattan conduit glow shaders, and floating text indicators on packet completion.

**Acceptance Scenarios**:
1. **Given** any component rendered in Topology View, **When** viewed on any OS (iOS, Android, Linux, Windows), **Then** it renders using a unified vector blueprint icon and card design rather than an OS-dependent emoji.
2. **Given** connected nodes in Topology View, **When** packets flow through them, **Then** cables render with stepped orthogonal 90-degree Manhattan conduits with dynamic glowing flow pulses and color shifts (blue = healthy, amber = 80% saturation, red = dropping packets).
3. **Given** packets successfully reaching terminal nodes (200 OK) or dropping, **When** processed by the economic engine, **Then** floating particle text rises and fades (`+$0.002` in emerald green, `-$0.015/s` in slate grey, `-$500 SLA Penalty!` in flashing red).

---

### User Story 3 - Adaptive Dynamic Audio & Spatial Foley (Priority: P1)

As a player building and operating a data center, I want layered adaptive background music that responds to traffic intensity and incidents, alongside tactile mechanical foley and spatial datacenter fan hum, with independent volume controls, so that the audiovisual atmosphere is compelling.

**Why this priority**: Audio is 50% of game immersion. Replacing pure procedural noise with a multi-stem adaptive soundtrack and realistic mechanical foley delivers tension during SRE crises and relaxation during planning.

**Independent Test**:
- Can be independently verified by listening to audio transitions between calm building phases (ambient synth) and high-load/incident phases (driving rhythm + alarm klaxons), and verifying volume sliders in SettingsModal.

**Acceptance Scenarios**:
1. **Given** normal system operation, **When** traffic is within baseline capacity, **Then** the audio engine plays a calm, ambient lo-fi synthwave stem.
2. **Given** a traffic spike or active operational incident (e.g. DDoS, rack overheat), **When** triggered by ChaosDirector, **Then** the audio engine dynamically un-mutes the high-tempo percussion and bass synth stems, ducking background hum.
3. **Given** user opens the Settings Modal, **When** adjusting Master, Music, SFX, and Ambience sliders, **Then** each bus responds independently with persisted volume levels.

---

### User Story 4 - SRE Research Tech Tree & Enterprise RFPs (Priority: P2)

As a player progressing through Career or Sandbox mode, I want to invest research capital into an SRE Tech Tree to unlock advanced architectures (Kubernetes, Kafka, CDN, Serverless) and fulfill high-value client enterprise service contracts (RFPs), so that there is a deep, rewarding long-term meta-game.

**Why this priority**: A tycoon game requires meaningful progression gates. Unlocking advanced technology and fulfilling client requirements (*NeoVault Fintech*, *StreamFlix Streaming*, *ModelScale AI*) provides strategic purpose.

**Independent Test**:
- Can be independently verified by opening the Research Lab modal, unlocking a tier node with accumulated capital, verifying that the new component appears in the Build Drawer, and accepting/completing a client RFP contract.

**Acceptance Scenarios**:
1. **Given** a new game session, **When** inspecting the Build Drawer, **Then** advanced components (WAF, CDN, Kafka, NoSQL, FaaS) are locked until researched in the SRE Tech Tree.
2. **Given** a player reaches Tier 3 research, **When** unlocking Horizontal Pod Autoscaler (HPA), **Then** compute pods can be configured with automated scale-out thresholds.
3. **Given** an available Client RFP ("NeoVault: 2,500 RPS, < 30ms latency, zero packet loss"), **When** the player meets the architecture criteria for 60 consecutive seconds, **Then** the contract is fulfilled, awarding bonus capital and reputation.

---

### User Story 5 - Interactive APM Observability & Forensic Triage (Priority: P2)

As a Lead SRE triaging a complex operational disaster, I want an interactive APM Observability dashboard (P95/P99 latency histograms, error breakdown, per-node metrics) so that I can diagnose and remediate incidents through engineering actions rather than a simple 1-click button.

**Why this priority**: The core fantasy of the game is being an authentic SRE/Architect. Replacing generic 1-click remediation with forensic diagnosis elevates the puzzle depth.

**Independent Test**:
- Can be independently verified by triggering an incident (e.g. Cache Stampede), opening the APM Dashboard, observing database IOPS at 100% and cache hit at 0%, applying remediation (cache pre-warming and replica scaling), and watching telemetry recover.

**Acceptance Scenarios**:
1. **Given** an operational incident alert, **When** the player taps the incident or APM icon, **Then** an APM dashboard modal displays live telemetry (P95/P99 latency, 4xx/5xx error rates, queue saturation, and per-component load).
2. **Given** a specific failure condition (e.g. Memory Leak, SQLi attack), **When** the player takes appropriate engineering actions (scaling pods, updating WAF rules, provisioning read replicas), **Then** the incident mitigates dynamically based on telemetry recovery.

---

### User Story 6 - Mobile Ergonomics, Radial Context Menu & Screen Budgeting (Priority: P2)

As a mobile player in landscape orientation, I want the UI to avoid obscuring the playable canvas through auto-collapsing panels, radial touch context menus, and notch-safe boundaries, so that playing on a smartphone or tablet is ergonomic and comfortable.

**Why this priority**: Mobile screens have strict vertical height budgets (~360–393px). Cluttered, overlapping panels break touch playability.

**Independent Test**:
- Can be independently verified by running the game on a mobile viewport (e.g. iPhone 15 landscape / Android emulator), testing radial menus on node tap, and checking notch padding (`env(safe-area-inset-*)`).

**Acceptance Scenarios**:
1. **Given** a player taps any node on a mobile device, **When** selected, **Then** a compact radial touch menu appears around the node (Restart, Scale, Cut Wire, Inspect, Delete) instead of an oversized bottom sheet.
2. **Given** an active incident notification arrives, **When** displayed, **Then** the bottom Build Drawer automatically collapses to preserve central canvas visibility.
3. **Given** execution on devices with notches or camera cutouts, **When** rendered, **Then** all interactive buttons and HUD elements respect `env(safe-area-inset-left)` and `env(safe-area-inset-right)`.

---

### User Story 7 - Advanced Simulation Realism & Resilience Patterns (Priority: P2)

As an architect designing high-availability systems, I want realistic packet categorization (Static vs Read vs Write with locks vs Async jobs) and SRE resilience mechanisms (Horizontal Pod Autoscaling, Circuit Breakers, Multi-AZ routing), so that the simulation authentically models enterprise cloud systems.

**Why this priority**: Differentiating write transactions (database row locks) from cached reads and static CDN hits turns architecture design into a realistic engineering challenge.

**Independent Test**:
- Can be independently tested in headless unit tests verifying that write packets consume DB connection pool slots and generate locks, and that Circuit Breakers trip open when downstream error rates exceed 50%.

**Acceptance Scenarios**:
1. **Given** incoming traffic containing HTTP POST/Write requests, **When** processed by compute pods, **Then** they require exclusive DB connection slots and trigger write IOPS, while HTTP GET requests leverage cache hits without locking.
2. **Given** a failing downstream service with > 50% error rate, **When** Circuit Breaker is enabled on API Gateway, **Then** the gateway trips open, immediately returning fast-fail fallback responses to prevent thundering herd collapse.

---

### User Story 8 - Multi-Slot Saves, Blueprint Strings & Web Worker Decoupling (Priority: P2)

As a dedicated player, I want multiple save slots, the ability to export/import architecture blueprint strings (like *Factorio*), and a decoupled Web Worker simulation loop, so that I can save multiple designs, share them with friends, and enjoy locked 60/120 FPS performance.

**Why this priority**: Power players love sharing optimal blueprints. Moving the 60 Hz simulation loop into a Web Worker ensures the main thread stays locked at 60/120 FPS even under 10,000 active packets.

**Independent Test**:
- Can be independently verified by exporting an architecture to a Base64 blueprint string, importing it into an empty sandbox, and confirming exact topology restoration.

**Acceptance Scenarios**:
1. **Given** any topology in Sandbox or Campaign, **When** the player clicks "Export Blueprint", **Then** a compressed Base64 string is copied to the clipboard.
2. **Given** a valid blueprint string, **When** pasted into "Import Blueprint", **Then** the nodes and connections are validated and constructed on the canvas.
3. **Given** a high-stress simulation with 5,000 concurrent packets, **When** running on a Web Worker, **Then** the main browser thread maintains locked 60 FPS frame timing without jank.

---

### User Story 9 - Platform Compliance & App Store Publishing Readiness (Priority: P3)

As a publisher releasing the game on Google Play Store, Apple App Store, and the Web, I want full store compliance (signed AAB, SDK 34+, privacy disclosures, Game Center / Play Games achievements, and offline PWA caching), so that the title can pass store reviews and be played offline.

**Why this priority**: Commercial distribution requires meeting platform store guidelines and enabling offline flight-mode play.

**Independent Test**:
- Can be independently verified by checking PWA offline caching via Chrome DevTools (Network: Offline), generating Android release AAB, and verifying splash/icon assets.

**Acceptance Scenarios**:
1. **Given** a player launches the Web version without internet connectivity, **When** the Service Worker is registered, **Then** the full game loads and plays offline without errors.
2. **Given** Android build generation, **When** running `npx cap sync android`, **Then** the project compiles with adaptive launcher icons, dark splash screens, and target SDK 34 compliance.

---

### Edge Cases

- **Campaign Level Loading on Empty State**: When switching between levels or resetting, all active packets, visual particles, and audio sirens from previous levels must be purged instantaneously.
- **Circuit Breaker Half-Open State**: When tripped, the circuit breaker must periodically send canary probe requests (1 per second); only if 3 consecutive canary requests succeed does the circuit transition back to Closed.
- **Corrupted Blueprint Import**: If a player imports an invalid or malicious Base64 string, the parser must reject it gracefully with a descriptive toast error without crashing the engine.
- **Simultaneous Emergency & Bankruptcy**: If an incident expires while the insolvency countdown is active, the bankruptcy check takes precedence to prevent zombie game sessions.
- **Audio Context Unlock on Mobile Gesture**: Ensure Web Audio context unlocks on the first touch gesture without audible pop or latency glitches across all browsers.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Foundation, Coordinates & Persistence (P0)
- **FR-001**: System MUST correct all starter node coordinates in `src/core/sim/CampaignLevels.js` from raw pixel numbers (`100, 200`) to integer grid cell coordinates ($2 \le x \le 12, 2 \le y \le 8$) centered on viewport $(520, 320)$.
- **FR-002**: System MUST import and initialize `StatePersistence` in `src/main.js`, restoring saved state upon game load and automatically saving state every 30 seconds and on `visibilitychange` / `pause`.
- **FR-003**: System MUST provide a manual Port-to-Port Cable Wiring tool in `TopologyScene`, allowing players to drag from a node's output port to another node's input port to establish a verified connection.
- **FR-004**: System MUST render all network links using orthogonal stepped Manhattan conduits via `CableRenderer.getOrthogonalWaypoints` with animated neon glow flow shaders.

#### Visual Polish & "Juice" (P1)
- **FR-005**: System MUST replace all system emoji placeholders with cohesive, high-contrast vector sci-fi component cards in `TopologyScene`, `BuildDrawer`, and `NodeInspector`.
- **FR-006**: System MUST render animated glowing status indicators on all nodes and server racks (healthy pulsing cyan/green, warning amber, critical strobe red).
- **FR-007**: System MUST render floating financial and telemetry text particles on packet completion (`+$0.002` emerald, `-$0.015/s` opex, `-$500 SLA Penalty!` red).
- **FR-008**: System MUST render visual incident indicators: flashing emergency beacons, thermal heat distortion ripples, and smoke particle effects on damaged racks.

#### Audio & Soundscapes (P1)
- **FR-009**: System MUST implement a multi-stem adaptive background music (BGM) system with calm planning synth layers dynamically blending into high-tempo crisis stems during incidents.
- **FR-010**: System MUST synthesize spatial datacenter environmental audio (60 Hz transformer hum, high-velocity fan airflow, disk array seek chatter).
- **FR-011**: System MUST provide mechanical tactile foley for node placement, cable plugging/cutting, switch flips, and emergency sirens.
- **FR-012**: System MUST implement a 4-channel audio mixer in `AudioManager` (Master, Music, SFX, Ambience) with persistent volume sliders in `SettingsModal`.

#### Meta-Game, Tech Tree & Contracts (P2)
- **FR-013**: System MUST implement an SRE Research Lab / Tech Tree with progressive unlocks spanning 4 eras (Bare Metal, Scale-Out, Cloud-Native, Hyperscale).
- **FR-014**: System MUST implement Client Enterprise RFPs & Dynamic Service Contracts with distinct customer personas (Fintech NeoVault, Streaming StreamFlix, AI ModelScale) and custom SLA penalties.
- **FR-015**: System MUST provide an interactive APM Observability Dashboard displaying P95/P99 latency histograms, 4xx/5xx error distributions, and per-component load telemetry.
- **FR-016**: System MUST require forensic engineering remediation for incidents (scaling replicas, cache pre-warming, WAF ruleset updates) instead of a simple 1-click button.

#### Mobile Ergonomics & Accessibility (P2)
- **FR-017**: System MUST implement a compact radial touch context menu on node selection for mobile viewports (Restart, Scale, Cut Wire, Inspect, Delete).
- **FR-018**: System MUST auto-collapse bottom procurement trays during active incident triage to preserve the central playable viewport.
- **FR-019**: System MUST support `env(safe-area-inset-*)` CSS boundaries, ensuring all controls clear camera notches, Dynamic Islands, and system gesture bars.
- **FR-020**: System MUST provide colorblind accessibility modes utilizing shape coding (circles, triangles, octagons) in addition to color hues.
- **FR-021**: System MUST implement an internationalization (i18n) localization architecture with JSON locale bundles (`en-US`, `id-ID`).

#### Simulation Realism & Resilience Patterns (P2)
- **FR-022**: System MUST categorize traffic packets into distinct workload types: Static Content (CDN), API Reads (Cache/Replica), API Writes (Primary DB locks), Async Jobs (Message Queue), and Cyber Attacks.
- **FR-023**: System MUST implement Horizontal Pod Autoscaler (HPA) logic allowing automated pod scaling based on CPU utilization or queue depth.
- **FR-024**: System MUST implement Circuit Breaker logic with Closed, Open, and Half-Open canary states to protect downstream systems from cascading failure.
- **FR-025**: System MUST simulate Multi-AZ / Multi-Region replication latency and cross-zone traffic egress costs.

#### Data Persistence & Operations (P2)
- **FR-026**: System MUST support multiple save slots (Save 1, Save 2, Save 3, Auto-Save).
- **FR-027**: System MUST support exporting and importing compressed Base64 architecture blueprint strings.
- **FR-028**: System MUST support offloading the 60 Hz simulation tick loop into a background Web Worker, maintaining decoupled UI/render execution.
- **FR-029**: System MUST register an offline Service Worker caching all static assets and audio for 100% offline flight-mode playability.
- **FR-030**: System MUST generate Android release assets (adaptive launcher icons, splash screen, target SDK 34).

---

### Key Entities *(include if feature involves data)*

- **TechTreeNode**: Represents an unlockable architectural capability (`id`, `tier`, `name`, `costMicroCents`, `prerequisites`, `unlockedComponents`, `unlockedMechanics`).
- **ClientContract**: Represents an active enterprise customer contract (`id`, `clientName`, `clientTier`, `targetRps`, `maxLatencyMs`, `minSlaPercent`, `monthlyRevenueMicroCents`, `breachPenaltyMicroCents`, `status`).
- **BlueprintData**: Serialized JSON payload containing node coordinates, component types, connection pairs, and autoscaling configs, encoded as a compressed Base64 string.
- **APMSnapshot**: Real-time observability window storing rolling 60-second histograms of request latencies, status codes (200, 429, 500, 502, 504), queue saturation, and per-pipe throughput.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Career Campaign starter nodes (Levels 1–5) render centered in the visible viewport ($520, 320$) with zero off-screen coordinates.
- **SC-002**: Player architecture and balance persist across browser refreshes and mobile app restarts with 100% data fidelity and accurate offline catch-up.
- **SC-003**: Players can manually drag and connect network cables between any two compatible node ports in $< 1.5$ seconds with orthogonal Manhattan routing.
- **SC-004**: System replaces 100% of OS-dependent emoji characters with custom vector sci-fi blueprint glyphs.
- **SC-005**: Game delivers locked 60 FPS on mobile WebGL and $< 2.0\text{ms}$ frame render time during 5,000 active concurrent packets.
- **SC-006**: Audio mixer provides 4 independent volume buses (Master, Music, SFX, Ambience) with dynamic multi-stem incident transitions.
- **SC-007**: Players can unlock all 4 tiers of the SRE Tech Tree and fulfill client enterprise contracts in Career/Sandbox mode.
- **SC-008**: Full game loads and operates with 100% functionality in offline mode (Service Worker PWA / Airplane mode).
- **SC-009**: Blueprint export/import roundtrip retains 100% of nodes, coordinates, and connections with zero data corruption.
- **SC-010**: All automated headless unit tests in `tests/` pass with zero failures and zero float-point drift across 10,000 simulation ticks.

---

## Assumptions

- **Target Platforms**: Modern evergreen mobile browsers (Mobile Safari iOS 16+, Chrome Android 110+), desktop browsers (Chrome, Firefox, Safari, Edge), and standalone Capacitor mobile packaging.
- **Rendering Technology**: Phaser 4 (`phaser@4.2.1`) WebGL canvas with hardware-accelerated particle pooling and PostFX pipelines.
- **Audio Engine**: HTML5 Web Audio API using Web Audio oscillators, noise buffers, and compressed audio sprites for Foley.
- **Simulation Invariance**: The headless simulation core (`SimulationEngine`, `TrafficEngine`, `EconomicEngine`, `ThermalEngine`, `PowerEngine`, `ChaosDirector`) remains 100% decoupled from Phaser and DOM APIs to ensure continuous CLI verification.
- **Monetization**: Completely free of predatory pay-to-win mechanics; designed as a premium or fair tycoon title with optional cosmetic datacenter themes.
