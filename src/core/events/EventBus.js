/**
 * EventBus.js - Decoupled Pub/Sub event dispatcher
 * Adheres strictly to contracts/engine-event-contract.json
 * Pure JS, zero DOM/Phaser coupling.
 */

export const EngineEventTypes = Object.freeze({
  SIM_TICK: 'SIM_TICK',
  NODE_PLACED: 'NODE_PLACED',
  NODE_REMOVED: 'NODE_REMOVED',
  NODES_CONNECTED: 'NODES_CONNECTED',
  PACKET_SPAWNED: 'PACKET_SPAWNED',
  PACKET_PROCESSED: 'PACKET_PROCESSED',
  PACKET_DROPPED: 'PACKET_DROPPED',
  INCIDENT_TRIGGERED: 'INCIDENT_TRIGGERED',
  INCIDENT_MITIGATED: 'INCIDENT_MITIGATED',
  SLA_STATUS_CHANGED: 'SLA_STATUS_CHANGED',
  FACILITY_HOTSPOT_ALERT: 'FACILITY_HOTSPOT_ALERT',
  STATE_SNAPSHOT_EMITTED: 'STATE_SNAPSHOT_EMITTED',
  TECH_UNLOCKED: 'TECH_UNLOCKED',
  CONTRACT_ACCEPTED: 'CONTRACT_ACCEPTED',
  CONTRACT_FULFILLED: 'CONTRACT_FULFILLED',
  CONTRACT_BREACHED: 'CONTRACT_BREACHED',
  CONTRACT_BREACH_WARNING: 'CONTRACT_BREACH_WARNING',
  CIRCUIT_BREAKER_TRIPPED: 'CIRCUIT_BREAKER_TRIPPED',
  CIRCUIT_BREAKER_RESET: 'CIRCUIT_BREAKER_RESET',
  CIRCUIT_BREAKER_HALF_OPEN: 'CIRCUIT_BREAKER_HALF_OPEN',
  BLUEPRINT_EXPORTED: 'BLUEPRINT_EXPORTED',
  BLUEPRINT_IMPORTED: 'BLUEPRINT_IMPORTED',
  AUDIO_BUS_VOLUME_CHANGED: 'AUDIO_BUS_VOLUME_CHANGED',
});

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class EventBus {
  constructor(options = {}) {
    this._listeners = new Map();
    this._history = [];
    this._maxHistory = options.maxHistory || 100;
  }

  /**
   * Subscribe to an event
   * @param {string} eventType
   * @param {Function} handler
   * @returns {Function} unsubscribe function
   */
  on(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Handler for ${eventType} must be a function`);
    }

    if (!this._listeners.has(eventType)) {
      this._listeners.set(eventType, new Set());
    }

    const handlers = this._listeners.get(eventType);
    handlers.add(handler);

    return () => this.off(eventType, handler);
  }

  /**
   * Subscribe to an event for a single trigger
   * @param {string} eventType
   * @param {Function} handler
   * @returns {Function} unsubscribe function
   */
  once(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError(`Handler for ${eventType} must be a function`);
    }

    const onceWrapper = (event) => {
      this.off(eventType, onceWrapper);
      handler(event);
    };

    return this.on(eventType, onceWrapper);
  }

  /**
   * Unsubscribe a handler from an event
   * @param {string} eventType
   * @param {Function} handler
   */
  off(eventType, handler) {
    if (!this._listeners.has(eventType)) {
      return;
    }

    const handlers = this._listeners.get(eventType);
    handlers.delete(handler);

    if (handlers.size === 0) {
      this._listeners.delete(eventType);
    }
  }

  /**
   * Dispatch an event to all registered listeners
   * @param {string} eventType
   * @param {Object} payload
   * @returns {Object} emitted event record
   */
  emit(eventType, payload = {}) {
    const event = {
      eventId: generateUUID(),
      timestamp: Date.now(),
      eventType,
      payload: Object.freeze({ ...payload }),
    };

    // Store in history
    if (this._maxHistory > 0) {
      this._history.push(event);
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }
    }

    const handlers = this._listeners.get(eventType);
    if (handlers && handlers.size > 0) {
      // Create a shallow copy to prevent modification during iteration
      const currentHandlers = Array.from(handlers);
      for (const handler of currentHandlers) {
        try {
          handler(event);
        } catch (err) {
          // Robust error isolation: one failing listener does not crash the bus or other listeners
          console.error(`[EventBus] Error in listener for ${eventType}:`, err);
        }
      }
    }

    return event;
  }

  /**
   * Count listeners for an event type
   * @param {string} eventType
   * @returns {number}
   */
  listenerCount(eventType) {
    const handlers = this._listeners.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * Clear listeners for a specific event type or all
   * @param {string} [eventType]
   */
  clear(eventType) {
    if (eventType) {
      this._listeners.delete(eventType);
    } else {
      this._listeners.clear();
      this._history = [];
    }
  }

  /**
   * Retrieve event history
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this._history];
  }
}

// Global shared singleton instance for scene/sim wiring
export const globalEventBus = new EventBus();
