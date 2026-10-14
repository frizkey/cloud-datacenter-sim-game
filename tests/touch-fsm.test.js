import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MobileTouchFSM, TouchState } from '../src/ui/MobileTouchFSM.js';

describe('MobileTouchFSM State Machine Tests (US3)', () => {
  it('starts in IDLE state with 0 active pointers', () => {
    const fsm = new MobileTouchFSM();
    assert.strictEqual(fsm.currentState, TouchState.IDLE);
    assert.strictEqual(fsm.getActivePointerCount(), 0);
  });

  it('transitions to PANNING when single pointer moves past slop threshold', () => {
    const fsm = new MobileTouchFSM({ panThresholdPx: 10 });

    fsm.onPointerDown({ id: 1, x: 100, y: 100 });
    assert.strictEqual(fsm.currentState, TouchState.IDLE, 'Should remain idle before movement');

    // Move slightly (under threshold)
    fsm.onPointerMove({ id: 1, x: 105, y: 105 });
    assert.strictEqual(fsm.currentState, TouchState.IDLE);

    // Move past threshold
    fsm.onPointerMove({ id: 1, x: 120, y: 120 });
    assert.strictEqual(fsm.currentState, TouchState.PANNING);

    // Pointer up resets to IDLE
    fsm.onPointerUp({ id: 1, x: 120, y: 120 });
    assert.strictEqual(fsm.currentState, TouchState.IDLE);
  });

  it('transitions to PINCHING when second pointer touches down', () => {
    const fsm = new MobileTouchFSM();

    fsm.onPointerDown({ id: 1, x: 100, y: 100 });
    fsm.onPointerDown({ id: 2, x: 200, y: 100 });

    assert.strictEqual(fsm.currentState, TouchState.PINCHING);
    assert.strictEqual(fsm.getActivePointerCount(), 2);

    let zoomDelta = 0;
    fsm.onPinchChange = (ratio) => {
      zoomDelta = ratio;
    };

    // Spread fingers apart: 100px apart -> 150px apart (zoom in 1.5x)
    fsm.onPointerMove({ id: 2, x: 250, y: 100 });
    assert.strictEqual(zoomDelta, 1.5);

    // Release one finger
    fsm.onPointerUp({ id: 2, x: 250, y: 100 });
    assert.strictEqual(fsm.currentState, TouchState.IDLE);
  });

  it('handles DRAGGING_COMPONENT mode and emits placement coordinates', () => {
    const fsm = new MobileTouchFSM();

    fsm.startDragComponent('COMPUTE_POD');
    assert.strictEqual(fsm.currentState, TouchState.DRAGGING_COMPONENT);
    assert.strictEqual(fsm.draggedComponentType, 'COMPUTE_POD');

    let placedPayload = null;
    fsm.onComponentPlaced = (payload) => {
      placedPayload = payload;
    };

    fsm.onPointerMove({ id: 1, x: 300, y: 400 });
    fsm.onPointerUp({ id: 1, x: 300, y: 400 });

    assert.strictEqual(fsm.currentState, TouchState.IDLE);
    assert.ok(placedPayload);
    assert.strictEqual(placedPayload.componentType, 'COMPUTE_POD');
    assert.strictEqual(placedPayload.screenX, 300);
    assert.strictEqual(placedPayload.screenY, 400);
  });

  it('handles WIRING_CABLE mode between source and destination nodes', () => {
    const fsm = new MobileTouchFSM();

    fsm.startWiring('node_source_1');
    assert.strictEqual(fsm.currentState, TouchState.WIRING_CABLE);
    assert.strictEqual(fsm.wireSourceNodeId, 'node_source_1');

    let wireCompleted = null;
    fsm.onWireCompleted = (sourceId, targetId) => {
      wireCompleted = { sourceId, targetId };
    };

    fsm.completeWiring('node_target_2');
    assert.strictEqual(fsm.currentState, TouchState.IDLE);
    assert.deepStrictEqual(wireCompleted, { sourceId: 'node_source_1', targetId: 'node_target_2' });
  });
});
