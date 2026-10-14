# Feature Specification: Advanced Infrastructure Components & SRE Chaos Expansion

**Feature Branch**: `002-advanced-infra-chaos`  
**Created**: 2026-10-14  
**Status**: Draft  
**Input**: Advanced logical components, physical power redundancy, and Tier 2-3 SRE chaos disaster scenarios derived from [docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md) (§3.1, §3.2, §4, §5) and [docs/MOBILE_GAME_FEASIBILITY_STUDY.md](file:///home/arie/labs/cloud-datacenter-sim-game/docs/MOBILE_GAME_FEASIBILITY_STUDY.md)  
**Governance**: Ratified under [.specify/memory/constitution.md](file:///home/arie/labs/cloud-datacenter-sim-game/.specify/memory/constitution.md)

---

## 1. Executive Summary & Vision

Phase 2 builds upon the rock-solid Phase 1 MVP (`001-core-sim-mobile`) by expanding the infrastructure catalog and elevating the operational stakes. Players evolve from managing a simple 3-tier web app into architecting an enterprise-grade, high-availability, multi-layer cloud platform capable of surviving catastrophic infrastructural and security incidents.

This specification introduces:
1. **Advanced Logical Components (Network & Data Layer)**: Web Application Firewall (WAF), Content Delivery Network (CDN / Edge Cache), API Gateway, Distributed Message Broker (Kafka/NATS), Distributed NoSQL (Cassandra/DynamoDB), and Object Storage (S3).
2. **Physical Facility Power & Redundancy Layer**: Power Distribution Units (PDU), Uninterruptible Power Supply (UPS) Battery Banks, Emergency Backup Diesel Generators, and Thermal Containment Doors.
3. **Tier 2 & Tier 3 SRE Chaos Scenarios**: Volumetric DDoS Flood, SQL Injection Exploit Breach, Cache Stampede, Database Split-Brain Partition, Server Rack Thermal Overheating/Fire, and Utility Power Grid Blackout.
4. **Active SRE Remediation Mechanics**: Interactive incident mitigation actions embedded into mobile touch inspection sheets (Cloudburst scrubbing, SQLi signature updates, emergency generator crank, Raft consensus quorum elections, and emergency exhaust venting).

All systems adhere strictly to the **Game-First Tycoon** philosophy: no presentation cheat buttons, full deterministic verification via headless unit tests, and seamless dual-perspective rendering (`TopologyScene` $\leftrightarrow$ `FacilityScene`).

---

## 2. User Scenarios & Testing

### User Story 1 - Advanced Logical Perimeter & Caching Infrastructure (Priority: P1)

As a player, I want to deploy edge protection and caching layers (WAF, CDN, and API Gateway) in front of my application workloads, so that I can deflect malicious traffic spikes, offload origin compute servers, and reduce end-to-end request latency.

**Why this priority**: High-volume traffic and cyber threats quickly overwhelm basic compute clusters; edge infrastructure provides the necessary architectural buffers for scalable cloud architectures.

**Independent Test**: Can be verified headlessly: sending 1,000 requests to a topology with a CDN results in 80% cache-hit resolution without touching origin VMs, while passing exploit payloads through a WAF drops the attack packets and increments security reputation.

**Acceptance Scenarios**:
1. **Given** a CDN deployed between Ingress and Load Balancer, **When** static asset GET requests flow through the network, **Then** up to 90% of requests are satisfied at the edge with reduced latency ($< 15\text{ms}$) and compute servers receive only cache misses.
2. **Given** a WAF deployed at the perimeter, **When** SQL injection attack packets are injected, **Then** the WAF identifies malicious signatures (+4ms inspection latency overhead), drops the attack packets, and prevents database corruption.
3. **Given** an API Gateway deployed in front of microservices, **When** rate limits are exceeded, **Then** the Gateway returns HTTP 429 Too Many Requests, protecting downstream compute pods from queue saturation.

---

### User Story 2 - Physical Facility Power Redundancy & Blackout Survival (Priority: P1)

As a player, I want to equip my data center with PDU breakers, UPS battery banks, and emergency diesel generators in the Physical Facility View, so that my servers remain operational when the municipal power grid suffers a blackout.

**Why this priority**: Data centers cannot operate without continuous power; experiencing power loss without redundant systems causes immediate server shutdown, total SLA collapse, and catastrophic financial loss.

**Independent Test**: Can be tested headlessly: simulating a grid power cut triggers UPS battery discharge countdown; starting the backup diesel generator within the battery window restores power to PDUs and preserves 100% server uptime.

**Acceptance Scenarios**:
1. **Given** a data center with UPS battery banks and a diesel generator, **When** a Utility Power Grid Blackout event occurs, **Then** UPS batteries immediately take over electrical load and a visible 15-second countdown timer initiates on the HUD.
2. **Given** UPS batteries discharging during a blackout, **When** the player activates the Diesel Backup Generator before battery depletion, **Then** the generator starts up (3-second spool-up), consumes diesel fuel, powers the racks, and stops battery drain.
3. **Given** a data center without backup power during a blackout, **When** power drops to 0 kW, **Then** all server racks shut down immediately, in-flight packets are dropped with 500 errors, and SLA reputation plunges.

---

### User Story 3 - Asynchronous Messaging & Distributed Data Storage (Priority: P2)

As a player, I want to route asynchronous tasks through Message Brokers (Kafka/NATS) and persist state across Distributed NoSQL and Object Storage, so that my architecture can absorb massive spike loads without dropping transactional data.

**Why this priority**: Synchronous request-response architectures fail under peak loads; message queuing and specialized storage layers enable modern cloud resilience.

**Independent Test**: Can be tested headlessly: pushing a 5x traffic surge through a message broker enqueues packets into buffer memory without dropping requests, allowing consumers to drain the queue at a steady rate.

**Acceptance Scenarios**:
1. **Given** a Message Broker positioned between API Gateway and Worker Pods, **When** a traffic surge arrives, **Then** excess requests are held in the broker's queue buffer ($Q_{\text{depth}}$) rather than being dropped with HTTP 504 errors.
2. **Given** a Distributed NoSQL cluster, **When** high-throughput write requests arrive, **Then** writes are distributed across multiple shards with sustained high IOPS.
3. **Given** an Object Storage bucket (S3), **When** unstructured blob requests arrive, **Then** data is retrieved with standard egress bandwidth accounting.

---

### User Story 4 - Tier 2 & Tier 3 SRE Chaos Scenarios & Active Triage (Priority: P2)

As a player, I want to face authentic operational crises (Volumetric DDoS, Cache Stampede, Database Split-Brain, and Rack Overheating Fires) and resolve them using tactical remediation actions, so that I am tested on true SRE troubleshooting and capacity planning.

**Why this priority**: Chaos events create dynamic tension, transform passive building into active gameplay, and reward players for resilient engineering.

**Independent Test**: Can be verified headlessly: triggering each incident alters system metrics (RPS surge, temperature spike, partition flag); executing the corresponding remediation action within the deadline transitions the incident from active to resolved.

**Acceptance Scenarios**:
1. **Given** a Volumetric DDoS Flood incident, **When** 5,000 attack packets/s saturate the load balancer, **Then** the player can activate "Cloudflare Shield / DDoS Scrubbing" to filter attack traffic and protect the ingress pipe.
2. **Given** a Cache Stampede incident where hot keys expire, **When** the database IOPS saturates at 100%, **Then** the player can trigger "Cache Pre-Warming & Mutex Lock" to recover the hit rate.
3. **Given** a Database Split-Brain partition where inter-node communication fails, **When** data inconsistency alerts trigger, **Then** the player can execute a "Raft Quorum Election" to elect a primary and restore consistency.
4. **Given** a Physical Server Rack Overheating incident ($> 45^\circ\text{C}$), **When** the rack catches fire in the Facility View, **Then** the player can engage "Emergency Exhaust Venting" and redistribute traffic load to cooler racks.

---

### User Story 5 - Mobile Cockpit Catalog Expansion & Visual Feedback (Priority: P3)

As a mobile player, I want the bottom procurement drawer to feature all new components with clear category tabs, and receive intuitive visual indicators (shield glows, fire smoke, battery gauges) in both Topology and Facility views, so that I can easily expand and monitor my data center on touchscreen devices.

**Why this priority**: Ergonomic touchscreen access and unmistakable visual feedback are essential for fast mobile triage and pleasant construction gameplay.

**Independent Test**: Can be verified in browser and native APK: bottom drawer displays new category icons with $\ge 48 \times 48\text{ dp}$ touch targets, and visual effects render smoothly at 60 FPS without UI clipping.

**Acceptance Scenarios**:
1. **Given** the mobile build drawer is open, **When** the player scrolls through Ingress, Compute, Queue/Storage, and Facility tabs, **Then** WAF, CDN, API Gateway, Kafka, NoSQL, S3, PDU, UPS, and Diesel Generator are selectable with real-time affordability states.
2. **Given** an active DDoS attack in the Topology View, **When** packets hit the WAF, **Then** distinct crimson particle bursts indicate blocked malicious requests.
3. **Given** a rack fire in the Facility View, **When** the camera pans to the server room, **Then** animated isometric smoke and emergency strobe lights highlight the affected rack.

---

## 3. Requirements & Technical Specifications

### 3.1 Functional Requirements

- **FR-019**: System MUST implement a `WAF` (Web Application Firewall) node that inspects packet payloads, adds 4ms latency overhead, and drops malicious attack packets (SQLi, XSS, exploit attempts).
- **FR-020**: System MUST implement a `CDN` (Content Delivery Network) edge cache node that serves cacheable GET requests with 60%–95% cache hit probability, bypassing origin compute and database layers.
- **FR-021**: System MUST implement an `API Gateway` node with configurable rate limiting (token bucket algorithm) returning HTTP 429 when concurrency thresholds are breached.
- **FR-022**: System MUST implement a `Message Broker` node (Kafka/NATS) with persistent queue buffers ($Q_{\text{depth}}$) that decouples ingress traffic from consumer processing pools.
- **FR-023**: System MUST implement a `NoSQL Database` cluster node supporting high-throughput sharded writes and partition key routing.
- **FR-024**: System MUST implement an `Object Storage` (S3) node with bandwidth-metered egress accounting.
- **FR-025**: System MUST implement physical facility `PDU` (Power Distribution Unit) components with circuit breaker load limits (kW).
- **FR-026**: System MUST implement physical `UPS Battery Bank` components that provide temporary battery backup during mains power loss with dynamic drain calculation.
- **FR-027**: System MUST implement physical `Diesel Backup Generator` components requiring a 3-second spin-up delay and consuming diesel fuel ($/s) to generate electrical power.
- **FR-028**: System MUST implement physical `Containment Doors` (Hot/Cold Aisle) that improve cooling efficiency by 30% when placed adjacent to server racks.
- **FR-029**: System MUST expand `ChaosDirector` with Tier 2 incidents: `VOLUMETRIC_DDOS` and `SQL_INJECTION`.
- **FR-030**: System MUST expand `ChaosDirector` with Tier 3 incidents: `DATABASE_SPLIT_BRAIN`, `RACK_OVERHEATING_FIRE`, and `POWER_GRID_BLACKOUT`.
- **FR-031**: System MUST provide interactive incident mitigation actions accessible via the Mobile Incident Bar and Node Inspector.
- **FR-032**: System MUST calculate UPS runtime: $\text{Minutes Remaining} = \frac{\text{Battery Capacity (kWh)}}{\text{Active Facility IT Load (kW)}} \times 60 \times \text{Efficiency}$.
- **FR-033**: System MUST update the mobile `BuildDrawer` UI to include all new components across 4 functional tabs (Perimeter, Compute, Data/Queue, Facility) adhering to $\ge 48\times 48\text{ dp}$ touch targets.
- **FR-034**: System MUST render visual status indicators for new components in `TopologyScene` (shield glow for WAF, queue depth fill bars for Kafka) and `FacilityScene` (generator rotation, UPS charge bars, rack flame/smoke particles).

---

### 3.2 Key Entities & Data Models

- **Logical Component Catalog Addition**:
  - `WAF`: `{ cost: 1500, opex: 0.08, maxRps: 25000, inspectLatency: 4, blockedAttacks: 0 }`
  - `CDN`: `{ cost: 2000, opex: 0.10, maxRps: 100000, hitRate: 0.85, edgeLatency: 12 }`
  - `API_GATEWAY`: `{ cost: 1200, opex: 0.05, maxRps: 15000, rateLimit: 5000 }`
  - `MESSAGE_BROKER`: `{ cost: 1800, opex: 0.09, bufferCapacity: 50000, currentQueue: 0, drainRate: 2500 }`
  - `NOSQL_DB`: `{ cost: 2500, opex: 0.15, maxIops: 25000, shards: 3 }`
  - `OBJECT_STORAGE`: `{ cost: 1000, opex: 0.04, egressCostPerMB: 0.00005 }`

- **Physical Component Catalog Addition**:
  - `PDU`: `{ cost: 800, maxKw: 50, efficiency: 0.98 }`
  - `UPS_BATTERY`: `{ cost: 2200, capacityKwh: 120, currentChargeKwh: 120, dischargeRateKw: 0 }`
  - `DIESEL_GENERATOR`: `{ cost: 4500, outputKw: 150, fuelLiters: 500, fuelBurnRatePerSec: 0.05, isRunning: false }`
  - `CONTAINMENT_DOOR`: `{ cost: 600, coolingBonus: 0.30 }`

---

## 4. Success Criteria

- **SC-009**: All 6 new logical components and 4 physical facility components function deterministically within the 60-tick simulation loop with $100\%$ automated test coverage.
- **SC-010**: All 5 new Tier 2 & Tier 3 chaos incidents trigger and remediate cleanly in automated headless tests without desynchronizing simulation state.
- **SC-011**: The UPS battery discharge and backup generator switchover equations maintain uninterrupted power during a simulated 60-second power blackout.
- **SC-012**: Dual-perspective rendering (`TopologyScene` and `FacilityScene`) maintains $\ge 60\text{ FPS}$ on mobile WebGL with all new visual particles (flames, smoke, shield effects) active.
- **SC-013**: Touch navigation across all new mobile procurement items and remediation actions conforms to safe-area bounds and minimum $48\times 48\text{ dp}$ touch targets.
- **SC-014**: Production bundle build (`npm run build`) and Docker container build complete cleanly with zero errors.

---

## 5. Assumptions & Scope Boundaries

- **In Scope for Phase 2**: WAF, CDN, API Gateway, Message Broker, NoSQL, Object Storage, PDU, UPS, Diesel Generator, Containment Doors, Tier 2-3 Chaos Incidents, remediation actions, and mobile drawer/inspector updates.
- **Deferred to Phase 3**: Multi-region inter-continental routing (WAN latency between geographic regions), multi-chapter career story campaign with scripted levels, and Web Audio synth soundscapes.
- **Strictly Prohibited**: Conference presentation hotkeys, static slide layouts, and 1-click cheat recovery buttons. All gameplay operations must use in-game cash, authentic engineering placement, and SRE triage mechanics.
