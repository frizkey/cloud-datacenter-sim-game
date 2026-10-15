import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/EventBus.js';
import { TechTree } from '../src/core/sim/TechTree.js';

describe('SRE Research Tech Tree Progression (T029)', () => {
  let eventBus;
  let techTree;

  beforeEach(() => {
    eventBus = new EventBus();
    techTree = new TechTree({ eventBus });
  });

  it('initializes Era 1 starter tech and gates future era components', () => {
    assert.equal(techTree.isTechUnlocked('era1_bare_metal'), true);
    assert.equal(techTree.isComponentUnlocked('COMPUTE_POD'), true);
    assert.equal(techTree.isComponentUnlocked('DATABASE_SQL'), true);

    // Era 2/3/4 components must be locked initially
    assert.equal(techTree.isTechUnlocked('era2_load_balancer'), false);
    assert.equal(techTree.isComponentUnlocked('LOAD_BALANCER'), false);
    assert.equal(techTree.isComponentUnlocked('FIREWALL_WAF'), false);
    assert.equal(techTree.isComponentUnlocked('EDGE_CDN'), false);
  });

  it('rejects unlocking tech without meeting prerequisites', () => {
    // era2_load_balancer requires era2_dns_routing
    const result = techTree.researchTech('era2_load_balancer', 1000000000); // Plenty of funds
    assert.equal(result.success, false);
    assert.match(result.reason, /prerequisite/i);
    assert.equal(techTree.isTechUnlocked('era2_load_balancer'), false);
  });

  it('rejects unlocking tech with insufficient research funds', () => {
    // era1_pdu_distribution requires era1_bare_metal (met), but costs $500.00
    const result = techTree.researchTech('era1_pdu_distribution', 1000); // 1000 microcents ($0.01)
    assert.equal(result.success, false);
    assert.match(result.reason, /funds/i);
    assert.equal(techTree.isTechUnlocked('era1_pdu_distribution'), false);
  });

  it('unlocks tech when prerequisites and funds are met, deducting cost and emitting event', () => {
    let emittedEvent = null;
    eventBus.on('TECH_RESEARCHED', (evt) => {
      emittedEvent = evt;
    });

    const cost = 50000000; // $500.00
    const availableFunds = 100000000; // $1,000.00
    const result = techTree.researchTech('era1_pdu_distribution', availableFunds);

    assert.equal(result.success, true);
    assert.equal(result.costDeductedMicroCents, cost);
    assert.equal(techTree.isTechUnlocked('era1_pdu_distribution'), true);
    assert.equal(techTree.isComponentUnlocked('PDU_3PHASE'), true);

    assert.ok(emittedEvent, 'Must emit TECH_RESEARCHED event');
    assert.equal(emittedEvent.payload.techId, 'era1_pdu_distribution');
  });

  it('supports progressive era unlocking from Era 1 through Era 3', () => {
    // Unlock PDU -> CRAC
    techTree.researchTech('era1_pdu_distribution', 1e9);
    techTree.researchTech('era1_crac_cooling', 1e9);
    assert.equal(techTree.isTechUnlocked('era1_crac_cooling'), true);

    // Unlock Era 2 DNS -> Load Balancer
    techTree.researchTech('era2_dns_routing', 1e9);
    techTree.researchTech('era2_load_balancer', 1e9);
    assert.equal(techTree.isTechUnlocked('era2_load_balancer'), true);
    assert.equal(techTree.isComponentUnlocked('LOAD_BALANCER'), true);

    // Unlock Era 3 WAF
    techTree.researchTech('era3_waf_shield', 1e9);
    assert.equal(techTree.isTechUnlocked('era3_waf_shield'), true);
    assert.equal(techTree.isComponentUnlocked('WAF_SHIELD'), true);
  });

  it('serializes and deserializes unlocked state cleanly', () => {
    techTree.researchTech('era1_pdu_distribution', 1e9);
    techTree.researchTech('era2_dns_routing', 1e9);

    const serialized = techTree.serialize();
    assert.equal(serialized.schemaVersion, '1.0.0');
    assert.ok(serialized.unlockedTechIds.includes('era1_pdu_distribution'));
    assert.ok(serialized.unlockedTechIds.includes('era2_dns_routing'));

    const freshTree = new TechTree();
    freshTree.deserialize(serialized);
    assert.equal(freshTree.isTechUnlocked('era1_pdu_distribution'), true);
    assert.equal(freshTree.isTechUnlocked('era2_dns_routing'), true);
    assert.equal(freshTree.isTechUnlocked('era2_load_balancer'), false);
  });
});
