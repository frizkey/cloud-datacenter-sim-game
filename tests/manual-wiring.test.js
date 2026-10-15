import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { MobileTouchFSM, TouchState } from '../src/ui/MobileTouchFSM.js';
import { NodeType } from '../src/core/sim/Constants.js';

describe('Manual Port-to-Port Cable Wiring (T011)', () => {
  it('handles wiring gesture lifecycle in MobileTouchFSM', () => {
    const fsm = new MobileTouchFSM();
    let completed = null;
    fsm.onWireCompleted = (src, tgt) => {
      completed = { src, tgt };
    };

    // Start wiring from node A
    fsm.startWiring('node_a');
    assert.equal(fsm.currentState, TouchState.WIRING_CABLE);
    assert.equal(fsm.wireSourceNodeId, 'node_a');

    // Complete wiring to node B
    fsm.completeWiring('node_b');
    assert.equal(fsm.currentState, TouchState.IDLE);
    assert.deepEqual(completed, { src: 'node_a', tgt: 'node_b' });
  });

  it('connects nodes in simulation engine upon valid manual port drop', () => {
    const engine = new SimulationEngine();
    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 2, gridY: 4 });
    const pod = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 5, gridY: 4 });

    assert.equal(engine.connections.size, 0);

    const conn = engine.connectNodes(ingress.id, pod.id);
    assert.ok(conn);
    assert.equal(engine.connections.size, 1);
    assert.equal(conn.sourceNodeId, ingress.id);
    assert.equal(conn.targetNodeId, pod.id);

    // Prevent duplicate connection between same pair
    const dup = engine.connectNodes(ingress.id, pod.id);
    assert.equal(dup, null, 'Duplicate connection should be rejected');
    assert.equal(engine.connections.size, 1);

    // Prevent self-connection
    const selfConn = engine.connectNodes(ingress.id, ingress.id);
    assert.equal(selfConn, null, 'Self connection must be rejected');
    assert.equal(engine.connections.size, 1);
  });
});
