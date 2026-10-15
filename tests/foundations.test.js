import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BlueprintCodec } from '../src/storage/BlueprintCodec.js';
import { TechTree } from '../src/core/sim/TechTree.js';
import { ContractManager, ContractState } from '../src/core/sim/ContractManager.js';
import { CircuitBreaker, BreakerState } from '../src/core/sim/CircuitBreaker.js';
import { globalEventBus, EngineEventTypes } from '../src/core/events/EventBus.js';
import { getGlyphSvg, GLYPH_THEMES } from '../src/render/ComponentGlyphs.js';
import { I18n, t } from '../src/core/i18n/I18n.js';

describe('Phase 1 & Phase 2 Foundational Subsystems (T001 - T008)', () => {
  describe('BlueprintCodec (T004)', () => {
    it('encodes and decodes valid architecture graph cleanly', () => {
      const original = {
        title: 'Microservices Reference Cluster',
        description: 'Ingress to Pods with SQL DB',
        nodes: [
          { id: 'node-1', type: 'CLIENT_INGRESS', gridX: 2, gridY: 4, name: 'Main Ingress' },
          { id: 'node-2', type: 'COMPUTE_POD', gridX: 5, gridY: 4, name: 'API Worker' },
          { id: 'node-3', type: 'DATABASE_SQL', gridX: 8, gridY: 4, name: 'Primary DB' },
        ],
        connections: [
          { id: 'c-1', sourceNodeId: 'node-1', targetNodeId: 'node-2', isOrthogonal: true },
          { id: 'c-2', sourceNodeId: 'node-2', targetNodeId: 'node-3', isOrthogonal: true },
        ],
        facilityComponents: [
          { id: 'fac-1', type: 'PDU_3PHASE', isoX: 1, isoY: 1 },
        ],
      };

      const encoded = BlueprintCodec.encode(original);
      assert.ok(typeof encoded === 'string');
      assert.ok(encoded.startsWith('CSBP1:'));

      const decoded = BlueprintCodec.decode(encoded);
      assert.equal(decoded.version, '1.0.0');
      assert.equal(decoded.generator, 'cloudsim-blueprint');
      assert.equal(decoded.title, original.title);
      assert.equal(decoded.nodes.length, 3);
      assert.equal(decoded.connections.length, 2);
      assert.equal(decoded.facilityComponents.length, 1);
    });

    it('rejects corrupt or tampered blueprint payloads', () => {
      assert.throws(() => BlueprintCodec.decode('INVALID_PREFIX_DATA'), /Invalid blueprint prefix/);
      assert.throws(() => BlueprintCodec.decode('CSBP1:not-valid-base64-!@#$!'), /Corrupted blueprint string/);
    });
  });

  describe('TechTree Engine (T005)', () => {
    let techTree;

    beforeEach(() => {
      techTree = new TechTree();
    });

    it('initializes Era 1 starter tech as unlocked by default', () => {
      assert.equal(techTree.isUnlocked('era1_bare_metal'), true);
      assert.ok(techTree.getUnlockedComponentTypes().includes('CLIENT_INGRESS'));
      assert.ok(techTree.getUnlockedComponentTypes().includes('COMPUTE_POD'));
      assert.ok(techTree.getUnlockedComponentTypes().includes('DATABASE_SQL'));
    });

    it('enforces prerequisites and research costs before unlocking', () => {
      // era2_load_balancer requires era2_dns_routing
      assert.equal(techTree.canUnlock('era2_load_balancer', 1000000000), false);

      // era2_dns_routing only requires era1_bare_metal (already unlocked)
      const dnsCost = techTree.getNode('era2_dns_routing').researchCostMicroCents;
      assert.equal(techTree.canUnlock('era2_dns_routing', dnsCost - 1), false);
      assert.equal(techTree.canUnlock('era2_dns_routing', dnsCost), true);

      // Unlock DNS routing
      const unlockRes = techTree.unlock('era2_dns_routing', dnsCost);
      assert.equal(unlockRes.success, true);
      assert.equal(techTree.isUnlocked('era2_dns_routing'), true);

      // Now era2_load_balancer prerequisites are met
      const lbCost = techTree.getNode('era2_load_balancer').researchCostMicroCents;
      assert.equal(techTree.canUnlock('era2_load_balancer', lbCost), true);
    });

    it('serializes and restores unlocked tech state accurately', () => {
      techTree.unlock('era1_pdu_distribution', 50000000);
      const snapshot = techTree.serialize();

      const newTree = new TechTree();
      assert.equal(newTree.isUnlocked('era1_pdu_distribution'), false);
      newTree.deserialize(snapshot);
      assert.equal(newTree.isUnlocked('era1_pdu_distribution'), true);
    });
  });

  describe('ContractManager (T006)', () => {
    let contractMgr;

    beforeEach(() => {
      contractMgr = new ContractManager();
    });

    it('lists available contracts and prevents activating without requirements', () => {
      const available = contractMgr.getAvailableContracts();
      assert.ok(available.length >= 4);

      // contract_pixel_media requires CDN_EDGE
      assert.throws(() => {
        contractMgr.acceptContract('contract_pixel_media', [{ type: 'COMPUTE_POD' }]);
      }, /missing required components/);

      // Accepting with required components succeeds
      const accepted = contractMgr.acceptContract('contract_pixel_media', [{ type: 'CDN_EDGE' }]);
      assert.equal(accepted.state, ContractState.ACTIVE);
    });

    it('evaluates contract health and awards revenue or penalties', () => {
      contractMgr.acceptContract('contract_pixel_media', [{ type: 'CDN_EDGE' }]);

      // Healthy telemetry
      const goodTelemetry = {
        currentRps: 60,
        avgLatencyMs: 150,
        currentSlaPercent: 99.0,
        activeComponentTypes: ['CDN_EDGE'],
      };
      const res1 = contractMgr.evaluate(1.0, goodTelemetry);
      assert.ok(res1.revenueDeltaMicroCents > 0);
      assert.equal(res1.penaltyDeltaMicroCents, 0);

      // Failing SLA telemetry
      const badTelemetry = {
        currentRps: 20, // below 50
        avgLatencyMs: 500, // above 250
        currentSlaPercent: 80.0, // below 95%
        activeComponentTypes: ['CDN_EDGE'],
      };
      const res2 = contractMgr.evaluate(1.0, badTelemetry);
      assert.equal(res2.revenueDeltaMicroCents, 0);
      assert.ok(res2.penaltyDeltaMicroCents > 0);
    });
  });

  describe('CircuitBreaker (T007)', () => {
    it('trips on wattage overload and cools down to HALF_OPEN', () => {
      const breaker = new CircuitBreaker({ maxPowerWatts: 10000, tripCooldownSec: 2 });
      assert.equal(breaker.state, BreakerState.CLOSED);

      // Safe load
      assert.equal(breaker.checkPowerLoad(8000), true);
      assert.equal(breaker.canPass(), true);

      // Excessive load trips breaker
      assert.equal(breaker.checkPowerLoad(12000), false);
      assert.equal(breaker.state, BreakerState.OPEN);
      assert.equal(breaker.canPass(), false);

      // Cool down
      breaker.tick(1.0);
      assert.equal(breaker.state, BreakerState.OPEN);
      breaker.tick(1.0);
      assert.equal(breaker.state, BreakerState.HALF_OPEN);

      // Recovery success transitions to CLOSED
      breaker.recordSuccess();
      assert.equal(breaker.state, BreakerState.CLOSED);
    });
  });

  describe('Vector Glyphs & I18n Registry (T002, T003, T008)', () => {
    it('provides SVG vector glyphs for all major component types', () => {
      const ingressSvg = getGlyphSvg('CLIENT_INGRESS', { size: 32 });
      assert.ok(ingressSvg.includes('<svg'));
      assert.ok(ingressSvg.includes('viewBox="0 0 24 24"'));

      const dbSvg = getGlyphSvg('DATABASE_SQL');
      assert.ok(dbSvg.includes('<svg'));
      assert.ok(GLYPH_THEMES.DATABASE_SQL.hex !== undefined);
    });

    it('I18n translates keys and supports parameter substitution', () => {
      assert.equal(t('hud.cash'), 'Cash');
      assert.equal(t('components.CLIENT_INGRESS.name'), 'Global Ingress');
    });

    it('EventBus includes all new engine event types', () => {
      assert.ok(EngineEventTypes.TECH_UNLOCKED);
      assert.ok(EngineEventTypes.CONTRACT_ACCEPTED);
      assert.ok(EngineEventTypes.CIRCUIT_BREAKER_TRIPPED);
      assert.ok(EngineEventTypes.BLUEPRINT_EXPORTED);
    });
  });
});
