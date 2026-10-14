import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/core/sim/SimulationEngine.js';
import { NodeType } from '../src/core/sim/Constants.js';
import { EventBus, EngineEventTypes } from '../src/core/events/EventBus.js';

describe('SimulationEngine Integration Tests', () => {
  it('manages node graph lifecycle and applies purchase costs', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    const initialCash = engine.economicEngine.getProfile().cashMicroCents;

    // Add Ingress node ($0 buy)
    const ingress = engine.addNode({
      type: NodeType.CLIENT_INGRESS,
      gridX: 2,
      gridY: 2,
    });
    assert.ok(ingress);
    assert.strictEqual(engine.nodes.size, 1);
    assert.strictEqual(engine.economicEngine.getProfile().cashMicroCents, initialCash);

    // Add Compute Pod ($8.00 = 8,000,000 micro-cents)
    const pod = engine.addNode({
      type: NodeType.COMPUTE_POD,
      gridX: 4,
      gridY: 2,
    });
    assert.ok(pod);
    assert.strictEqual(engine.nodes.size, 2);
    assert.strictEqual(
      engine.economicEngine.getProfile().cashMicroCents,
      initialCash - 8_000_000,
      'Purchase cost must be deducted'
    );

    // Connect Ingress to Pod
    const conn = engine.connectNodes(ingress.id, pod.id);
    assert.ok(conn);
    assert.strictEqual(engine.connections.size, 1);

    // Remove Pod: should refund 50% ($4.00) and remove connection
    engine.removeNode(pod.id);
    assert.strictEqual(engine.nodes.size, 1);
    assert.strictEqual(engine.connections.size, 0);
    assert.strictEqual(
      engine.economicEngine.getProfile().cashMicroCents,
      initialCash - 4_000_000,
      'Removal should refund 50%'
    );
  });

  it('runs fixed 60 ticks/s simulation loop and processes request traffic', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    let snapshotsEmitted = 0;
    bus.on('STATE_SNAPSHOT_EMITTED', () => {
      snapshotsEmitted++;
    });

    // Create pipeline: Ingress -> Load Balancer -> Compute Pod -> Cache
    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 1, gridY: 2 });
    const alb = engine.addNode({ type: NodeType.LOAD_BALANCER, gridX: 3, gridY: 2 });
    const pod = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 5, gridY: 2 });

    engine.connectNodes(ingress.id, alb.id);
    engine.connectNodes(alb.id, pod.id);

    // Step simulation 60 ticks (1 second of game time)
    for (let i = 0; i < 60; i++) {
      engine.tick(1 / 60);
    }

    assert.ok(snapshotsEmitted > 0, 'Snapshots must be emitted over EventBus');
    assert.strictEqual(engine.simulationTickCount, 60);

    const snapshot = engine.getSnapshot();
    assert.ok(snapshot.economicProfile);
    assert.strictEqual(snapshot.nodes.length, 3);
    assert.strictEqual(snapshot.connections.length, 2);
  });

  it('serializes and deserializes complete engine state seamlessly', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 0, gridY: 0 });
    const db = engine.addNode({ type: NodeType.DATABASE_SQL, gridX: 2, gridY: 0 });
    engine.connectNodes(ingress.id, db.id);

    for (let i = 0; i < 30; i++) {
      engine.tick(1 / 60);
    }

    const savedState = engine.getSnapshot();

    // Create a new engine instance and restore
    const engine2 = new SimulationEngine({ eventBus: new EventBus() });
    engine2.loadState(savedState);

    assert.strictEqual(engine2.simulationTickCount, 30);
    assert.strictEqual(engine2.nodes.size, 2);
    assert.strictEqual(engine2.connections.size, 1);
    assert.ok(engine2.nodes.has(ingress.id));
    assert.ok(engine2.nodes.has(db.id));
  });

  it('automatically connects newly placed nodes into topology graph', () => {
    const bus = new EventBus();
    const engine = new SimulationEngine({ eventBus: bus });

    const ingress = engine.addNode({ type: NodeType.CLIENT_INGRESS, gridX: 0, gridY: 0 });
    const lb = engine.addNode({ type: NodeType.LOAD_BALANCER, gridX: 2, gridY: 0 });
    const db = engine.addNode({ type: NodeType.DATABASE_SQL, gridX: 6, gridY: 0 });

    engine.connectNodes(ingress.id, lb.id);

    // Place a compute pod: should auto-connect from lb and to db
    const pod = engine.addNode({ type: NodeType.COMPUTE_POD, gridX: 4, gridY: 0 });
    const connections = engine.autoConnectNode(pod);

    assert.ok(connections.length >= 2, 'Should create upstream and downstream links');
    
    // Check lb -> pod
    const lbToPod = Array.from(engine.connections.values()).find(
      (c) => c.sourceNodeId === lb.id && c.targetNodeId === pod.id
    );
    assert.ok(lbToPod, 'LB should connect to new pod');

    // Check pod -> db
    const podToDb = Array.from(engine.connections.values()).find(
      (c) => c.sourceNodeId === pod.id && c.targetNodeId === db.id
    );
    assert.ok(podToDb, 'New pod should connect to DB');
  });
});

