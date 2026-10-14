/**
 * MobileTouchFSM.js - Mobile Touch Gesture Disambiguation State Machine
 * Handles Single-Finger Pan, Two-Finger Pinch-to-Zoom, Component Dragging, and Cable Wiring.
 * Pure JS, zero DOM/Phaser coupling for headless testing.
 */

export const TouchState = Object.freeze({
  IDLE: 'IDLE',
  PANNING: 'PANNING',
  PINCHING: 'PINCHING',
  DRAGGING_COMPONENT: 'DRAGGING_COMPONENT',
  WIRING_CABLE: 'WIRING_CABLE',
});

export class MobileTouchFSM {
  /**
   * @param {Object} [options]
   * @param {number} [options.panThresholdPx=10]
   */
  constructor(options = {}) {
    this.panThresholdPx = options.panThresholdPx || 10;
    this.currentState = TouchState.IDLE;

    this.activePointers = new Map(); // id -> { id, x, y, startX, startY }
    this.draggedComponentType = null;
    this.wireSourceNodeId = null;

    this.initialPinchDistance = 0;

    // Callbacks
    this.onPan = null; // ({ dx, dy, x, y }) => void
    this.onPinchChange = null; // (scaleRatio, midpoint) => void
    this.onComponentPlaced = null; // ({ componentType, screenX, screenY }) => void
    this.onWireCompleted = null; // (sourceId, targetId) => void
  }

  getActivePointerCount() {
    return this.activePointers.size;
  }

  onPointerDown(pointer) {
    this.activePointers.set(pointer.id, {
      id: pointer.id,
      x: pointer.x,
      y: pointer.y,
      startX: pointer.x,
      startY: pointer.y,
    });

    if (this.activePointers.size === 2 && this.currentState !== TouchState.DRAGGING_COMPONENT && this.currentState !== TouchState.WIRING_CABLE) {
      this.currentState = TouchState.PINCHING;
      this.initialPinchDistance = this.calculatePinchDistance();
    }
  }

  onPointerMove(pointer) {
    const tracked = this.activePointers.get(pointer.id);
    if (tracked) {
      tracked.x = pointer.x;
      tracked.y = pointer.y;
    }

    if (this.currentState === TouchState.IDLE && this.activePointers.size === 1) {
      const p = this.activePointers.get(pointer.id);
      if (p) {
        const dist = Math.hypot(p.x - p.startX, p.y - p.startY);
        if (dist > this.panThresholdPx) {
          this.currentState = TouchState.PANNING;
        }
      }
    }

    if (this.currentState === TouchState.PANNING) {
      if (this.onPan && tracked) {
        this.onPan({
          dx: pointer.x - tracked.startX,
          dy: pointer.y - tracked.startY,
          x: pointer.x,
          y: pointer.y,
        });
      }
    } else if (this.currentState === TouchState.PINCHING) {
      if (this.activePointers.size === 2 && this.initialPinchDistance > 0) {
        const currentDistance = this.calculatePinchDistance();
        const ratio = currentDistance / this.initialPinchDistance;
        if (this.onPinchChange) {
          this.onPinchChange(ratio);
        }
      }
    }
  }

  onPointerUp(pointer) {
    if (this.currentState === TouchState.DRAGGING_COMPONENT) {
      if (this.onComponentPlaced && this.draggedComponentType) {
        this.onComponentPlaced({
          componentType: this.draggedComponentType,
          screenX: pointer.x,
          screenY: pointer.y,
        });
      }
      this.draggedComponentType = null;
      this.currentState = TouchState.IDLE;
    } else if (this.currentState === TouchState.PINCHING) {
      this.currentState = TouchState.IDLE;
    } else if (this.currentState === TouchState.PANNING) {
      this.currentState = TouchState.IDLE;
    }

    this.activePointers.delete(pointer.id);
    if (this.activePointers.size === 0) {
      if (this.currentState !== TouchState.WIRING_CABLE) {
        this.currentState = TouchState.IDLE;
      }
    }
  }

  calculatePinchDistance() {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  startDragComponent(componentType) {
    this.currentState = TouchState.DRAGGING_COMPONENT;
    this.draggedComponentType = componentType;
  }

  startWiring(sourceNodeId) {
    this.currentState = TouchState.WIRING_CABLE;
    this.wireSourceNodeId = sourceNodeId;
  }

  completeWiring(targetNodeId) {
    if (this.currentState === TouchState.WIRING_CABLE && this.wireSourceNodeId) {
      if (this.onWireCompleted) {
        this.onWireCompleted(this.wireSourceNodeId, targetNodeId);
      }
    }
    this.wireSourceNodeId = null;
    this.currentState = TouchState.IDLE;
  }

  cancelWiring() {
    this.wireSourceNodeId = null;
    this.currentState = TouchState.IDLE;
  }
}
