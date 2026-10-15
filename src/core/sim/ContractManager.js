/**
 * ContractManager.js
 * Client Enterprise RFPs & SLA Service Contract Manager.
 * Adheres strictly to contracts/client-contract-schema.json.
 */

import { globalEventBus } from '../events/EventBus.js';

export const ClientTier = Object.freeze({
  STARTUP: 'STARTUP',
  GROWTH: 'GROWTH',
  ENTERPRISE: 'ENTERPRISE',
  HYPERSCALE: 'HYPERSCALE',
});

export const ContractState = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  ACTIVE: 'ACTIVE',
  FULFILLED: 'FULFILLED',
  BREACHED: 'BREACHED',
  EXPIRED: 'EXPIRED',
});

export const DEFAULT_CONTRACTS = [
  {
    id: 'contract_pixel_media',
    clientName: 'PixelStream Media',
    clientTier: ClientTier.STARTUP,
    description: 'Video streaming startup seeking resilient CDN edge delivery with zero buffering.',
    requirements: {
      minRps: 50,
      maxLatencyMs: 250,
      minSlaPercent: 95.0,
      requiredComponents: ['CDN_EDGE'],
      durationSec: 60,
    },
    financials: {
      payoutPerSecMicroCents: 100000, // $1.00/s
      bonusMicroCents: 20000000, // $200.00 completion bonus
      penaltyPerBreachMicroCents: 500000, // $5.00 per second of breach
    },
    state: ContractState.AVAILABLE,
    elapsedSec: 0,
    healthConsecutiveSec: 0,
  },
  {
    id: 'contract_neovault_fintech',
    clientName: 'NeoVault Banking',
    clientTier: ClientTier.ENTERPRISE,
    description: 'High-frequency transaction ledger requiring WAF bot protection and strict 99.5% uptime.',
    requirements: {
      minRps: 150,
      maxLatencyMs: 120,
      minSlaPercent: 99.5,
      requiredComponents: ['WAF_SHIELD', 'DATABASE_SQL'],
      durationSec: 120,
    },
    financials: {
      payoutPerSecMicroCents: 500000, // $5.00/s
      bonusMicroCents: 100000000, // $1,000.00 completion bonus
      penaltyPerBreachMicroCents: 2500000, // $25.00 per second of breach
    },
    state: ContractState.AVAILABLE,
    elapsedSec: 0,
    healthConsecutiveSec: 0,
  },
  {
    id: 'contract_omni_health',
    clientName: 'OmniHealth AI Diagnostics',
    clientTier: ClientTier.GROWTH,
    description: 'Asynchronous medical image queue requiring message brokers and compute pod elasticity.',
    requirements: {
      minRps: 100,
      maxLatencyMs: 180,
      minSlaPercent: 98.0,
      requiredComponents: ['MESSAGE_BROKER', 'COMPUTE_POD'],
      durationSec: 90,
    },
    financials: {
      payoutPerSecMicroCents: 300000, // $3.00/s
      bonusMicroCents: 50000000, // $500.00 bonus
      penaltyPerBreachMicroCents: 1500000, // $15.00 per breach sec
    },
    state: ContractState.AVAILABLE,
    elapsedSec: 0,
    healthConsecutiveSec: 0,
  },
  {
    id: 'contract_global_cart',
    clientName: 'GlobalCart MegaStore',
    clientTier: ClientTier.HYPERSCALE,
    description: 'Global Black Friday retail traffic burst requiring redundant load balancing and caching.',
    requirements: {
      minRps: 300,
      maxLatencyMs: 95,
      minSlaPercent: 99.9,
      requiredComponents: ['LOAD_BALANCER', 'CDN_EDGE', 'DATABASE_NOSQL'],
      durationSec: 180,
    },
    financials: {
      payoutPerSecMicroCents: 1500000, // $15.00/s
      bonusMicroCents: 300000000, // $3,000.00 completion bonus
      penaltyPerBreachMicroCents: 10000000, // $100.00 per breach sec
    },
    state: ContractState.AVAILABLE,
    elapsedSec: 0,
    healthConsecutiveSec: 0,
  },
];

export class ContractManager {
  constructor(initialContracts = null) {
    this.contracts = new Map();
    const source = initialContracts || DEFAULT_CONTRACTS;
    for (const c of source) {
      this.contracts.set(c.id, {
        ...c,
        requirements: {
          ...c.requirements,
          requiredComponents: [...(c.requirements.requiredComponents || [])],
        },
        financials: { ...c.financials },
      });
    }
  }

  getContracts() {
    return Array.from(this.contracts.values());
  }

  getAvailableContracts() {
    return Array.from(this.contracts.values()).filter((c) => c.state === ContractState.AVAILABLE);
  }

  getActiveContracts() {
    return Array.from(this.contracts.values()).filter((c) => c.state === ContractState.ACTIVE);
  }

  acceptContract(contractId, currentComponents = []) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }
    if (contract.state !== ContractState.AVAILABLE) {
      throw new Error(`Contract ${contractId} is not in AVAILABLE state (current: ${contract.state})`);
    }

    // Verify required components if specified
    if (contract.requirements.requiredComponents?.length > 0) {
      const activeTypes = new Set(currentComponents.map((c) => (typeof c === 'string' ? c : c.type)));
      const missing = contract.requirements.requiredComponents.filter((req) => !activeTypes.has(req));
      if (missing.length > 0) {
        throw new Error(`Cannot sign contract: missing required components [${missing.join(', ')}]`);
      }
    }

    contract.state = ContractState.ACTIVE;
    contract.elapsedSec = 0;
    contract.healthConsecutiveSec = 0;

    globalEventBus.emit('CONTRACT_ACCEPTED', { contract });
    return contract;
  }

  /**
   * Process periodic contract evaluation (called once per second or tick).
   * @param {number} deltaSec Seconds elapsed since last evaluation
   * @param {Object} telemetry Current system telemetry { currentRps, avgLatencyMs, currentSlaPercent, activeComponentTypes }
   * @returns {Object} Financial delta { revenueDeltaMicroCents, penaltyDeltaMicroCents, completedContracts, breachedContracts }
   */
  evaluate(deltaSec, telemetry) {
    let revenueDeltaMicroCents = 0;
    let penaltyDeltaMicroCents = 0;
    const completedContracts = [];
    const breachedContracts = [];

    const activeContracts = this.getActiveContracts();
    for (const contract of activeContracts) {
      contract.elapsedSec += deltaSec;

      const req = contract.requirements;
      const isRpsMet = (telemetry.currentRps || 0) >= req.minRps;
      const isLatencyMet = (telemetry.avgLatencyMs || 0) <= req.maxLatencyMs;
      const isSlaMet = (telemetry.currentSlaPercent || 100) >= req.minSlaPercent;

      // Check component presence if required
      let areComponentsMet = true;
      if (req.requiredComponents?.length > 0) {
        const types = new Set(telemetry.activeComponentTypes || []);
        areComponentsMet = req.requiredComponents.every((t) => types.has(t));
      }

      const isHealthy = isRpsMet && isLatencyMet && isSlaMet && areComponentsMet;

      if (isHealthy) {
        contract.healthConsecutiveSec += deltaSec;
        revenueDeltaMicroCents += Math.round(contract.financials.payoutPerSecMicroCents * deltaSec);
      } else {
        penaltyDeltaMicroCents += Math.round(contract.financials.penaltyPerBreachMicroCents * deltaSec);
        globalEventBus.emit('CONTRACT_BREACH_WARNING', {
          contractId: contract.id,
          clientName: contract.clientName,
          reasons: {
            rps: !isRpsMet,
            latency: !isLatencyMet,
            sla: !isSlaMet,
            components: !areComponentsMet,
          },
        });
      }

      // Check completion
      if (contract.elapsedSec >= req.durationSec) {
        // Did we meet overall health bar (e.g. at least 90% consecutive health)?
        const healthRatio = contract.healthConsecutiveSec / contract.elapsedSec;
        if (healthRatio >= 0.85) {
          contract.state = ContractState.FULFILLED;
          revenueDeltaMicroCents += contract.financials.bonusMicroCents;
          completedContracts.push(contract);
          globalEventBus.emit('CONTRACT_FULFILLED', {
            contract,
            bonusAwarded: contract.financials.bonusMicroCents,
          });
        } else {
          contract.state = ContractState.BREACHED;
          breachedContracts.push(contract);
          globalEventBus.emit('CONTRACT_BREACHED', {
            contract,
            reason: `SLA compliance failed: only ${(healthRatio * 100).toFixed(1)}% healthy runtime`,
          });
        }
      }
    }

    return {
      revenueDeltaMicroCents,
      penaltyDeltaMicroCents,
      completedContracts,
      breachedContracts,
    };
  }

  serialize() {
    return {
      contracts: Array.from(this.contracts.values()),
    };
  }

  deserialize(data) {
    if (!data || !Array.isArray(data.contracts)) return;
    for (const saved of data.contracts) {
      const existing = this.contracts.get(saved.id);
      if (existing) {
        existing.state = saved.state;
        existing.elapsedSec = saved.elapsedSec || 0;
        existing.healthConsecutiveSec = saved.healthConsecutiveSec || 0;
      }
    }
  }
}
