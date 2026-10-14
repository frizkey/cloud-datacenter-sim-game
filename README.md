# Cloud & Data Center Simulation Game

A high-fidelity Cloud Architecture and Data Center Tycoon / Simulation Game built with **Phaser 4** and **Vite**.

## Features & Blueprint
- **Game Design & Specification Document:** [docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md](docs/CLOUD_DATACENTER_SIMULATION_GAME_DESIGN.md)
  - Dual-perspective engine (2D Logical Topology & 2.5D Isometric Data Center Facility).
  - Economic loop (Cashflow, ARR, SLA breach penalties, CAPEX/OPEX).
  - Thermal BTU, CRAC Chiller cooling, PUE metrics, and ATS Emergency Diesel Generators.
  - Granular SRE Telemetry & Chaos Scenarios.

## Tech Stack
- **Engine:** Phaser 4 (`^4.2.1`)
- **Bundler:** Vite 8
- **Testing:** Native Node.js test runner (`node:test`)
- **Paseo Integration:** Linked to Paseo project registry (`prj_65c105297a762177`)

## Development
```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run unit tests
npm test

# Build for production
npm run build
```
