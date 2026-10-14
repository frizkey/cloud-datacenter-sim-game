import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus, EngineEventTypes } from '../src/core/events/EventBus.js';

describe('EventBus Pub/Sub Contract Tests', () => {
  it('dispatches events with schema conforming to engine-event-contract.json', () => {
    const bus = new EventBus();
    let receivedEvent = null;

    bus.on(EngineEventTypes.SIM_TICK, (evt) => {
      receivedEvent = evt;
    });

    const emitted = bus.emit(EngineEventTypes.SIM_TICK, { tick: 42, delta: 16.6 });

    assert.ok(receivedEvent, 'Listener should have received event');
    assert.strictEqual(receivedEvent.eventType, EngineEventTypes.SIM_TICK);
    assert.strictEqual(typeof receivedEvent.eventId, 'string');
    assert.ok(receivedEvent.eventId.length > 10, 'eventId should be a UUID');
    assert.strictEqual(typeof receivedEvent.timestamp, 'number');
    assert.strictEqual(receivedEvent.payload.tick, 42);
    assert.strictEqual(receivedEvent.payload.delta, 16.6);
    assert.strictEqual(emitted.eventId, receivedEvent.eventId);
  });

  it('unsubscribes listeners using returned unbind function and off()', () => {
    const bus = new EventBus();
    let count = 0;

    const unsub = bus.on(EngineEventTypes.NODE_PLACED, () => {
      count++;
    });

    bus.emit(EngineEventTypes.NODE_PLACED, { id: 'node_1' });
    assert.strictEqual(count, 1);

    // Call unsubscribe
    unsub();
    bus.emit(EngineEventTypes.NODE_PLACED, { id: 'node_2' });
    assert.strictEqual(count, 1, 'Unsubscribed listener should not be called again');

    // Test off() directly
    const handler2 = () => { count += 10; };
    bus.on(EngineEventTypes.NODE_PLACED, handler2);
    bus.emit(EngineEventTypes.NODE_PLACED, { id: 'node_3' });
    assert.strictEqual(count, 11);

    bus.off(EngineEventTypes.NODE_PLACED, handler2);
    bus.emit(EngineEventTypes.NODE_PLACED, { id: 'node_4' });
    assert.strictEqual(count, 11);
  });

  it('handles once() subscriptions by executing only once', () => {
    const bus = new EventBus();
    let triggers = 0;

    bus.once(EngineEventTypes.INCIDENT_TRIGGERED, () => {
      triggers++;
    });

    bus.emit(EngineEventTypes.INCIDENT_TRIGGERED, { incidentId: 'inc_1' });
    bus.emit(EngineEventTypes.INCIDENT_TRIGGERED, { incidentId: 'inc_2' });

    assert.strictEqual(triggers, 1, 'once() listener should only trigger once');
  });

  it('isolates listener errors without crashing the bus or sibling listeners', () => {
    const bus = new EventBus();
    let siblingRan = false;

    bus.on(EngineEventTypes.PACKET_DROPPED, () => {
      throw new Error('Explosion in buggy listener');
    });

    bus.on(EngineEventTypes.PACKET_DROPPED, () => {
      siblingRan = true;
    });

    // Should not throw
    assert.doesNotThrow(() => {
      bus.emit(EngineEventTypes.PACKET_DROPPED, { packetId: 'pkt_drop_1' });
    });

    assert.strictEqual(siblingRan, true, 'Sibling listener must execute despite error in previous listener');
  });

  it('maintains bounded history ring buffer', () => {
    const bus = new EventBus({ maxHistory: 3 });

    bus.emit(EngineEventTypes.SIM_TICK, { n: 1 });
    bus.emit(EngineEventTypes.SIM_TICK, { n: 2 });
    bus.emit(EngineEventTypes.SIM_TICK, { n: 3 });
    bus.emit(EngineEventTypes.SIM_TICK, { n: 4 });

    const history = bus.getHistory();
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].payload.n, 2);
    assert.strictEqual(history[2].payload.n, 4);
  });
});
