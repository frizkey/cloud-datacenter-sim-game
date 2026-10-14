# Feature Specification: Core Simulation Engine & Mobile Cockpit

**Feature Branch**: `001-core-sim-mobile`  
**Created**: 2026-10-14  
**Status**: Draft  
**Input**: Core simulation engine, dual-perspective view, and mobile cockpit derived from [docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md) and [docs/MOBILE_GAME_FEASIBILITY_STUDY.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/MOBILE_GAME_FEASIBILITY_STUDY.md)  
**Governance**: Ratified under [.specify/memory/constitution.md](file:///home/arie/labs/cloud-datacenter-sim-game/.specify/memory/constitution.md)

---

## 1. Executive Summary & Vision

The **Core Simulation Engine & Mobile Cockpit** constitutes Phase 1 of the Cloud & Data Center Simulation Game. The feature delivers the complete playable MVP loop: a decoupled, deterministic mathematical simulation core operating in tandem with a touchscreen-optimized, dual-perspective mobile interface.

Players act as a **Lead Cloud Solutions Architect & Principal SRE**, balancing four interconnected resource systems (Traffic & Compute, Data & IOPS, Physical Facility Thermodynamics, and Business Cashflow). Players design network topologies to process incoming request packets, switch to a physical server room view to manage heat and power, and triage real-time operational incidents through an ergonomic mobile cockpit.

---

## 2. User Scenarios & Testing *(Prioritized User Journeys)*

### User Story 1 - Real-Time Request Lifecycle & Headless Economic Loop (Priority: P1)

As a player, I want incoming customer requests to traverse my active infrastructure topology, generating income upon successful completion and incurring operational costs (hardware lease, power consumption, bandwidth, and SLA penalties), so that I experience a realistic business and technical balancing loop.

**Why this priority**: Without an active resource flow and cashflow loop, infrastructure building has no consequences, progression stakes, or win/loss conditions. It is the fundamental heartbeat of the game.

**Independent Test**: Can be verified fully headlessly via automated tick simulation: injecting 100 requests per second into a minimal topology (Ingress $\rightarrow$ Load Balancer $\rightarrow$ Compute $\rightarrow$ Database) yields positive net revenue, whereas injecting unhandled traffic spikes triggers 5xx drops, SLA degradation, and financial penalties.

**Acceptance Scenarios**:
1. **Given** a healthy topology processing 100 requests/second with $99.99\%$ success rate, **When** 60 seconds elapse, **Then** cash reserves increase proportionally ($100 \times 60 \times \$0.0002$ minus operating costs) and SLA reputation remains at $100\%$.
2. **Given** an unhandled traffic surge that saturates compute capacity, **When** request queues overflow and drop packets, **Then** error rates rise, SLA reputation degrades, and SLA breach penalty deductions trigger.
3. **Given** zero incoming traffic, **When** the simulation ticks, **Then** fixed idle hardware costs and power baseline bills are deducted from cash reserves.

---

### User Story 2 - Dual-Perspective Presentation Switching (Priority: P1)

As a player, I want to toggle seamlessly between the **Logical Architecture View** (2D network routing graph) and the **Physical Facility View** (2.5D isometric data center floor) using a primary view-switcher pill on the HUD, so that I can manage both network topology routing and physical hardware health without state disruption.

**Why this priority**: The dual-perspective paradigm is the core gameplay differentiator. It visually connects abstract software engineering to physical datacenter constraints.

**Independent Test**: Can be verified in the viewport by tapping the view toggle button. The screen transitions between the 2D logical node-and-wire canvas and the 2.5D isometric server room canvas with zero packet loss, zero coordinate corruption, and immediate bidirectional state reflection.

**Acceptance Scenarios**:
1. **Given** the player is viewing the Logical Architecture View, **When** they tap the "Facility View" toggle, **Then** the canvas smoothly transitions to the 2.5D isometric server room showing physical racks, cooling equipment, and power units.
2. **Given** compute nodes in the Logical View are operating at $> 85\%$ CPU utilization, **When** the player switches to the Facility View, **Then** the corresponding server rack units visually indicate high thermal load via amber/red status indicators and heat waves.
3. **Given** 500 data packets currently in transit between nodes, **When** the view is toggled back and forth, **Then** all packets, queue buffers, and metrics remain intact without desynchronization.

---

### User Story 3 - Mobile-Optimized Touch Navigation & Drag-and-Drop Building (Priority: P2)

As a mobile player, I want to navigate the simulation canvas using natural touchscreen gestures (single-finger pan, pinch-to-zoom) and place infrastructure components by dragging them from a collapsible bottom drawer, so that building and inspecting systems is ergonomic and fluid on handheld devices.

**Why this priority**: Mobile accessibility requires intuitive touch controls that eliminate desktop keyboard/mouse dependencies while preventing mis-clicks during intense incident triage.

**Independent Test**: Can be verified on touch-enabled viewports: dragging canvas pans smoothly; pinching scales zoom between $0.5\times$ and $2.5\times$; dragging a component from the drawer displays a valid grid footprint and snaps to grid coordinates upon release.

**Acceptance Scenarios**:
1. **Given** a mobile touchscreen viewport, **When** the player performs a single-finger drag on an empty canvas area, **Then** the camera pans across the infrastructure layout with smooth inertia damping.
2. **Given** the component drawer is collapsed at the bottom of the screen, **When** the player swipes upward on a category icon, **Then** the drawer expands to show available components with interactive touch targets measuring at least $48 \times 48\text{ dp}$.
3. **Given** an expanded component palette, **When** the player presses and drags an infrastructure icon onto the canvas, **Then** a semi-transparent footprint indicates valid placement tiles, snapping upon finger release with a tactile confirmation.
4. **Given** two placed nodes on the logical canvas, **When** the player touches an output port and drags a connection line to an input port, **Then** an orthogonal connection wire locks in place, initiating packet routing.

---

### User Story 4 - Facility Thermodynamics, Power & PUE Management (Priority: P2)

As a player managing the physical data center, I want server racks to generate heat proportional to computational load and consume electrical power, requiring cooling air circulation and power distribution units, so that I must optimize Power Usage Effectiveness (PUE) to prevent thermal shutdowns and high electricity bills.

**Why this priority**: Ties infrastructure scale to realistic thermodynamic and energy constraints, providing depth to the tycoon simulation.

**Independent Test**: Can be verified headlessly and visually: increasing CPU workload increases wattage; wattage converts to heat (BTU); ambient temperature rises until cooling units (chillers/CRACs) are provisioned; PUE ratio adjusts dynamically based on the ratio of total facility power to IT power.

**Acceptance Scenarios**:
1. **Given** server racks generating $20\text{ kW}$ of heat with no active cooling, **When** temperature exceeds $45^\circ\text{C}$, **Then** thermal alarm indicators flash, compute nodes throttle throughput by $50\%$, and physical racks display overheating visual effects.
2. **Given** an overheating server hall, **When** the player places an active cooling unit adjacent to the rack row, **Then** cold airflow reduces rack temperature below $25^\circ\text{C}$, restoring full compute throughput.
3. **Given** IT equipment consuming $50\text{ kW}$ and cooling/facility systems consuming $15\text{ kW}$, **When** PUE is computed, **Then** the system reports a PUE of $1.30$, accurately reflecting facility efficiency.

---

### User Story 5 - Real-Time Incident Triage & 30-Second FTUE (Priority: P3)

As a new or returning player, I want to experience guided emergency triage events (such as the 30-second "Day 1 Black Friday Outage") with an emergency incident console and quick remediation actions, so that I immediately grasp how to troubleshoot and recover broken architectures under pressure.

**Why this priority**: Drives instant player engagement and provides the high-stress crisis-solving gameplay loop characteristic of SRE work.

**Independent Test**: Can be verified by launching the onboarding tutorial: an active $502\text{ Bad Gateway}$ incident triggers immediately; following visual prompts to add a caching layer mitigates the bottleneck within 30 seconds, turning error metrics green and rewarding the player with cash.

**Acceptance Scenarios**:
1. **Given** a brand-new game session, **When** the game starts, **Then** an initial incident triggers displaying dropped requests, audible alerts, and a glowing tutorial indicator guiding the player to deploy an in-memory cache.
2. **Given** an active incident, **When** the player taps the emergency triage alert button, **Then** the camera instantly centers on the failing component and displays contextual remediation options (e.g., restart service, increase capacity, isolate traffic).
3. **Given** the remediation action is successfully applied, **When** error rates return to zero, **Then** the incident closes, an incident post-mortem log is recorded, and the player receives an SLA recovery reward.

---

### Edge Cases & Failure Modes

1. **Cyclic Network Routing Loops:** If a player routes connections in a circular dependency (Node A $\rightarrow$ Node B $\rightarrow$ Node A), packets must have a maximum time-to-live (hop count $\le 16$) and drop with a visual timeout burst to prevent infinite loops.
2. **Complete Insolvency (Bankruptcy):** If cash reserves drop below zero, a 30-second emergency credit line activates with an urgent warning banner. If positive cashflow is not restored before the countdown expires, an "Operations Insolvency" game over screen appears with an option to restart or accept emergency relief.
3. **Extreme Touch Input Overlap:** Rapid multi-touch actions (e.g., pinching while dragging a component) must cancel component placement cleanly without leaving ghost objects on the grid.
4. **Sudden App Backgrounding:** When the mobile screen locks or the user switches apps, the simulation must pause cleanly, save its state snapshot, and compute elapsed idle earnings upon resumption without draining battery in the background.
5. **Screen Rotation & Display Cutouts:** The interface must lock to landscape mode and strictly respect device display cutouts (camera notches and home indicator bars), maintaining a 16 dp safety margin from all physical boundaries.

---

## 3. Requirements

### 3.1 Functional Requirements

- **FR-001**: System MUST provide a decoupled, headless simulation loop that runs deterministically at a fixed tick rate (60 ticks/s) independent of graphics rendering.
- **FR-002**: System MUST compute request latency using an additive model incorporating network hops, firewall inspection, load balancing, compute processing, and database/cache access time.
- **FR-003**: System MUST calculate physical rack heat output in BTU/h based on electrical power consumption and active compute utilization.
- **FR-004**: System MUST dynamically calculate Power Usage Effectiveness (PUE) as the ratio of total facility power (IT load + cooling + overhead) to IT equipment power.
- **FR-005**: System MUST compute net cashflow every second by adding revenue from successful requests and deducting hardware lease, electrical power, network bandwidth, and SLA breach penalty costs.
- **FR-006**: System MUST track and display real-time SRE metrics: Service Level Agreement (SLA) percentage, requests per second (RPS), round-trip latency, error rate percentage, compute CPU utilization, facility PUE, and current cash balance.
- **FR-007**: System MUST support seamless switching between a 2D Logical Architecture View and a 2.5D Isometric Facility View without resetting simulation state or dropping active requests.
- **FR-008**: System MUST support touchscreen navigation including single-touch camera panning, pinch-to-zoom scaling between $0.5\times$ and $2.5\times$, and tap-to-select interaction.
- **FR-009**: System MUST provide a collapsible bottom hardware palette organized into functional categories: Ingress/Perimeter, Compute, Storage/Cache, and Physical Facilities.
- **FR-010**: System MUST enforce snap-to-grid placement for all infrastructure components on discrete coordinate grids.
- **FR-011**: System MUST support point-to-point connection wiring between valid node ports, forming orthogonal connection lines that visualize packet flow.
- **FR-012**: System MUST support real-time operational incidents with visual alert cues, audible alarms, camera centering, and contextual remediation actions.
- **FR-013**: System MUST provide a guided 30-second first-time user experience (FTUE) that walks the player through troubleshooting an initial traffic bottleneck.
- **FR-014**: System MUST serialize complete game state to local persistent storage on every significant state change and whenever the application transitions to the background.
- **FR-015**: System MUST simulate offline time deltas upon application resume, calculating accumulated revenue and facility state up to a maximum cap (8 hours).

---

### 3.2 Key Entities & Data Models

- **Infrastructure Node (Logical):** Represents a cloud architecture building block (DNS, WAF, CDN, Load Balancer, API Gateway, Compute Container/Pod, Message Broker, In-Memory Cache, Database, Object Storage).
  - *Attributes:* Unique ID, type category, grid coordinate $(x, y)$, capacity limits (max RPS, max connections, CPU cores, RAM), current utilization, error rate, input ports, output ports, and operational status (healthy, degraded, crashed, rebooting).
- **Facility Component (Physical):** Represents physical hardware inside the data center (42U Server Rack, CRAC/Chiller Cooling Unit, Power Distribution Unit, UPS Battery, Backup Generator).
  - *Attributes:* Unique ID, hardware type, grid coordinate $(x, y)$, power rating (kW), heat output rating (BTU/h), cooling airflow capacity (CFM), ambient temperature ($^\circ\text{C}$), linked logical nodes, and physical condition.
- **Traffic Request Packet:** Represents discrete data traversing the architecture.
  - *Attributes:* Packet ID, packet type (HTTP GET, POST, DB Query, Attack Payload), origin node, destination node, hop count, elapsed latency, payload status (in-flight, processed, dropped, cached).
- **Incident Event:** Represents an active infrastructure failure or operational crisis.
  - *Attributes:* Incident ID, severity tier (Tier 1 to 4), incident type (Memory Leak, Flash Sale Spike, DDoS, Overheating, Power Outage), affected component ID, time elapsed, active status, and required remediation action.
- **Company Economic Profile:** Represents the player's enterprise financial and operational state.
  - *Attributes:* Cash balance, revenue per second, operational expense rate per second, SLA reputation score ($0-100\%$), active customer contracts, and total uptime statistics.

---

## 4. Success Criteria

### 4.1 Measurable Outcomes

- **SC-001**: New players can successfully mitigate the initial Day-1 incident and achieve positive cashflow in under **45 seconds** during the guided onboarding flow.
- **SC-002**: Viewport view switching between Logical Topology View and Physical Facility View executes in under **100 milliseconds** with zero frame hitching or state desynchronization.
- **SC-003**: The simulation engine maintains a rock-solid **60 frames per second** on standard mobile hardware with at least **3,000 active on-screen packet particles** in flight.
- **SC-004**: Interactive touch targets across all mobile menus, drawers, and buttons meet or exceed the minimum size threshold of **$48 \times 48\text{ dp}$**, resulting in zero reported mis-click failures during incident triage testing.
- **SC-005**: All mathematical models and resource flow equations achieve **$100\%$ automated verification** across a continuous **10,000-tick headless simulation stress test** with zero floating-point accumulation drift.
- **SC-006**: State persistence and restoration completes in under **500 milliseconds**, enabling seamless application pause and resume across mobile micro-sessions.

---

## 5. Assumptions & Scope Boundaries

### 5.1 Assumptions
- The mobile game client operates primarily in **Landscape** orientation on touchscreen devices supporting modern WebGL / HTML5 standards.
- Sound effects and tactile haptic feedback enhance gameplay but are not mandatory for core functional progression (silent play is fully supported).
- Offline idle progression is capped at **8 hours** to balance player return incentives without breaking the economic scaling curve.

### 5.2 Out of Scope for Phase 1
- Real-time multiplayer collaborative architecture building and PvP competitive hacking/DDoS modes (reserved for future expansion).
- Cloud-hosted cross-device multiplayer account synchronization (Phase 1 uses local client persistence).
- Full 5-chapter story career campaign with cutscenes (Phase 1 delivers the core sandbox loop, initial career tutorial, and baseline incident catalog).
