# Cloud Datacenter Simulator: SRE Operator & Architect Manual

Welcome to **Cloud Datacenter Simulator**, the mobile-first cloud architecture and data center tycoon simulation game. You are the Lead Site Reliability Engineer (SRE) and Chief Infrastructure Architect. Your mission: design, scale, cable, protect, and optimize high-throughput distributed microservice systems while keeping physical facilities cooled, powered, and financially solvent.

---

## 1. Dual-Perspective Architecture

The game simulates two tightly coupled physical realities:

### 1.1 Logical Topology Canvas (2D Orthogonal Architecture)
- **Visual Style**: Clean sci-fi blueprint aesthetic with Manhattan conduits and vector iconography.
- **Controls**:
  - **Pan / Zoom**: Single-finger drag on empty canvas or mouse scroll wheel.
  - **Manual Port Cable Wiring**: Tap & drag from an active component's right green output port (`+36px`) to a downstream component's left cyan input port (`-36px`).
  - **Radial Context Menu**: Tap any placed node to reveal a 5-action radial wheel:
    - 🔄 **Restart**: Reboots overloaded or crashed microservice instances.
    - 📈 **Scale +25%**: Instantly scales provisioned request capacity.
    - 🔌 **Wire Cable**: Initiates guided manual cable wiring from the selected node.
    - 🔍 **Inspect**: Opens the contextual Node Inspector sheet showing CPU, OPEX, and connected links.
    - 🗑️ **Delete**: Decommissions the node and grants an immediate 50% capital refund.

### 1.2 Physical Facility Floor (2.5D Isometric Datacenter)
- **Visual Style**: Real-time isometric floor with true diamond raycasting and dynamic depth sorting.
- **Facility Mechanics**:
  - **42U Server Racks**: Generates heat in BTU/hour directly proportional to workload wattage.
  - **CRAC Chillers**: Computes dynamic PUE ratios and pumps cold airflow to prevent thermal shutdowns ($> 65^\circ\text{C}$).
  - **3-Phase PDUs & UPS Batteries**: Buffers against sudden municipal power blackouts.
  - **Diesel Backup Generators**: Spools up over a 3-second emergency interval with fuel burn to maintain continuous facility uptime.

---

## 2. Game Modes & Career Campaign

### 2.1 SRE Career Campaign (Levels 1 to 5)
1. **Level 1: The Startup Launch** (Day 1 Viral Traffic — Single compute pod survival against out-of-memory memory leaks).
2. **Level 2: The E-Commerce Flash Sale** (Black Friday Surge — Token bucket rate limiting, CDN caching, and read-replica scaling).
3. **Level 3: The Cyber Siege** (State-Actor DDoS & SQLi Injections — WAF ruleset updates and circuit breaker isolation).
4. **Level 4: The Heatwave Blackout** (Municipal Power Grid Collapse — UPS battery discharge and emergency diesel spool-up).
5. **Level 5: Hyperscale Multi-AZ Migration** (Global High-Availability — Zero-downtime cutover across 3 availability zones).

### 2.2 Endless Survival Mode
- Progressive waves of traffic increase every 120 seconds.
- High scores are persisted locally across sessions.

### 2.3 Chaos Lab Sandbox Mode
- Infinite capital ($50,000.00+) and zero bankruptcy fail states.
- Manual chaos injection trigger buttons for all 9 incident archetypes.

---

## 3. SRE Research Lab & Enterprise RFPs

### 3.1 4-Era Technology Progression
- **Era 1: Monolith Foundation**: Starter bare metal compute, monolithic SQL database, basic PDU.
- **Era 2: High Availability Cluster**: DNS routing, Load Balancers, Redis Cache Clusters, CRAC chillers.
- **Era 3: Cloud-Native Microservices**: API Gateways, Message Brokers (Kafka), WAF Shields, UPS Battery banks.
- **Era 4: Hyperscale Multi-Cloud**: Serverless FaaS, NoSQL Document Stores, Multi-AZ Replication, Diesel Turbines.

### 3.2 Enterprise Service Contracts (RFPs)
Accept corporate SLAs to earn recurring passive revenue streams. Meet stringent latency ($< 150\text{ms}$) and availability ($> 99.9\%$) targets to earn substantial completion bonuses, while avoiding breach penalty fees.

---

## 4. APM Observability & Forensic Triage

Access the real-time APM telemetry dashboard via the Cockpit HUD:
- **Rolling Telemetry Buffer**: 60-second sliding window of all requests.
- **Percentile Latency Histograms**: Real-time calculated **P50**, **P95**, and **P99** latencies.
- **HTTP Status Code Distribution**: Real-time breakdown of `200 OK`, `429 Too Many Requests`, `502 Bad Gateway`, and `504 Gateway Timeout`.
- **Forensic Incident Remediation**: Targeted engineering actions (e.g. pre-warming caches, updating WAF rules, spooling generators) resolve crises without relying on simplistic 1-click magic fixes.

---

## 5. Architectural Resilience Systems

- **Multi-Workload Traffic Routing**:
  - `STATIC_CDN`: Served at CDN edge with 95% cache hit rate and minimal compute overhead.
  - `API_READ`: Cache-first queries with fallback to database read-replicas.
  - `API_WRITE`: ACID transactions with database connection pool and row-level lock contention handling.
  - `ASYNC_JOB`: Asynchronously buffered in Message Brokers.
  - `CYBER_ATTACK`: Blocked by WAF firewalls before consuming backend pod capacity.
- **Circuit Breakers**:
  - Protects Gateways against cascading failures (*thundering herds*).
  - Automatically trips `OPEN` after 5 consecutive failures, fast-failing traffic until downstream components recover.
- **Horizontal Pod Autoscaler (HPA)**:
  - Automates pod capacity scaling based on configurable average CPU utilization thresholds ($> 70\%$ scales up, $< 30\%$ scales down).
- **Multi-AZ Cross-Zone Synchronization**:
  - Models inter-zone network latency penalties (+5ms) and egress bandwidth financial fees.

---

## 6. Blueprints, Saves & Offline Play

- **Factorio-style Architecture Blueprints**:
  - Export any architecture layout to a Base64 blueprint string (`CSBP1:...`).
  - Copy to clipboard or paste external community blueprint strings to instantly build complete datacenters.
- **Multi-Slot Save Manager**:
  - Independent support for **Auto-Save**, **Slot 1**, **Slot 2**, and **Slot 3**.
- **100% Offline Flight Mode**:
  - Fully cached via Progressive Web App Service Worker (`sw.js`). Play without internet connectivity with zero asset download requirements.
