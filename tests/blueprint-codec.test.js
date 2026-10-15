import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BlueprintCodec } from '../src/storage/BlueprintCodec.js';
import { NodeType, FacilityComponentType } from '../src/core/sim/Constants.js';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';

describe('Base64 Blueprint String Codec (T052)', () => {
  const sampleArchitecture = {
    title: 'High Availability 3-Tier Web Service',
    description: 'WAF -> Gateway -> 2 Compute Pods -> SQL Master & Redis Cache',
    nodes: [
      { id: 'waf-1', type: NodeType.WAF_SHIELD, gridX: 2, gridY: 4, name: 'Cloud WAF' },
      { id: 'gw-1', type: NodeType.API_GATEWAY, gridX: 4, gridY: 4, name: 'Kong API Gateway' },
      { id: 'pod-1', type: NodeType.COMPUTE_POD, gridX: 6, gridY: 3, name: 'Worker Pod 1' },
      { id: 'pod-2', type: NodeType.COMPUTE_POD, gridX: 6, gridY: 5, name: 'Worker Pod 2' },
      { id: 'cache-1', type: NodeType.CACHE_CLUSTER, gridX: 8, gridY: 3, name: 'Redis Cache' },
      { id: 'db-1', type: NodeType.DATABASE_SQL, gridX: 8, gridY: 5, name: 'PostgreSQL Primary' },
    ],
    connections: [
      { id: 'c1', sourceNodeId: 'waf-1', targetNodeId: 'gw-1' },
      { id: 'c2', sourceNodeId: 'gw-1', targetNodeId: 'pod-1' },
      { id: 'c3', sourceNodeId: 'gw-1', targetNodeId: 'pod-2' },
      { id: 'c4', sourceNodeId: 'pod-1', targetNodeId: 'cache-1' },
      { id: 'c5', sourceNodeId: 'pod-2', targetNodeId: 'db-1' },
    ],
    facilityComponents: [
      { id: 'rack-1', type: FacilityComponentType.SERVER_RACK_42U, isoX: 2, isoY: 2 },
      { id: 'pdu-1', type: FacilityComponentType.PDU_3PHASE, isoX: 3, isoY: 2 },
    ],
  };

  it('encodes architecture topology into a prefixed Base64 blueprint string', () => {
    const encoded = BlueprintCodec.encode(sampleArchitecture);
    assert.ok(typeof encoded === 'string', 'Blueprint output must be a string');
    assert.ok(encoded.startsWith('CSBP1:'), 'Blueprint must start with CSBP1: prefix');
    assert.ok(encoded.length > 50, 'Blueprint must have substantial encoded content');
  });

  it('decodes blueprint string back into exact architecture layout', () => {
    const encoded = BlueprintCodec.encode(sampleArchitecture);
    const decoded = BlueprintCodec.decode(encoded);

    assert.equal(decoded.title, sampleArchitecture.title);
    assert.equal(decoded.description, sampleArchitecture.description);
    assert.equal(decoded.nodes.length, 6);
    assert.equal(decoded.connections.length, 5);
    assert.equal(decoded.facilityComponents.length, 2);

    assert.equal(decoded.nodes[0].id, 'waf-1');
    assert.equal(decoded.nodes[0].type, NodeType.WAF_SHIELD);
    assert.equal(decoded.connections[0].sourceNodeId, 'waf-1');
    assert.equal(decoded.connections[0].targetNodeId, 'gw-1');
  });

  it('recreates architecture into SimulationEngine from decoded blueprint', () => {
    const encoded = BlueprintCodec.encode(sampleArchitecture);
    const decoded = BlueprintCodec.decode(encoded);

    const engine = new SimulationEngine();
    // Load blueprint nodes
    for (const n of decoded.nodes) {
      engine.addNode({
        id: n.id,
        type: n.type,
        name: n.name,
        gridX: n.gridX,
        gridY: n.gridY,
      });
    }
    // Load blueprint connections
    for (const c of decoded.connections) {
      engine.connectNodes(c.sourceNodeId, c.targetNodeId);
    }

    assert.equal(engine.nodes.size, 6);
    assert.equal(engine.connections.size, 5);
    assert.ok(engine.nodes.has('waf-1'));
    assert.ok(engine.nodes.has('db-1'));
  });

  it('throws descriptive errors on corrupted, tampered, or malformed blueprint strings', () => {
    // Missing prefix
    assert.throws(() => {
      BlueprintCodec.decode('eyJ2ZXJzaW9uIjoiMS4wLjAifQ==');
    }, /Invalid blueprint prefix/);

    // Corrupted Base64 payload
    assert.throws(() => {
      BlueprintCodec.decode('CSBP1:!@#$NotValidBase64%^&*');
    }, /Corrupted blueprint string/);

    // Empty or non-string input
    assert.throws(() => {
      BlueprintCodec.decode('');
    }, /Invalid blueprint/);
    assert.throws(() => {
      BlueprintCodec.decode(null);
    }, /Invalid blueprint/);
  });
});
