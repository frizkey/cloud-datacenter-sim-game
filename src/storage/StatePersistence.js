/**
 * StatePersistence.js - IndexedDB / LocalStorage client state persistence
 * Adheres strictly to contracts/save-state-schema.json and handles 8-hour offline catch-up.
 * Pure JS, isomorphic with memory fallback for headless testing.
 */

import { SIM_CONSTANTS } from '../core/sim/Constants.js';

export const SAVE_STATE_VERSION = '1.0.0';
export const SAVE_STORAGE_KEY = 'cloudsim_save_v1';

/**
 * Validates save state object against save-state-schema.json
 * @param {Object} data
 * @returns {boolean}
 */
export function validateSaveSchema(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== SAVE_STATE_VERSION) return false;
  if (typeof data.savedAtTimestamp !== 'number' || data.savedAtTimestamp <= 0) return false;
  if (typeof data.simulationTickCount !== 'number' || data.simulationTickCount < 0) return false;

  const ep = data.economicProfile;
  if (!ep || typeof ep !== 'object') return false;
  if (typeof ep.cashMicroCents !== 'number') return false;
  if (typeof ep.slaReputationPercent !== 'number' || ep.slaReputationPercent < 0 || ep.slaReputationPercent > 100) return false;
  if (typeof ep.totalProcessedRequests !== 'number' || ep.totalProcessedRequests < 0) return false;
  if (typeof ep.totalFailedRequests !== 'number' || ep.totalFailedRequests < 0) return false;

  if (!Array.isArray(data.nodes)) return false;
  for (const node of data.nodes) {
    if (!node.id || !node.type || typeof node.gridX !== 'number' || typeof node.gridY !== 'number' || !node.status) {
      return false;
    }
  }

  if (!Array.isArray(data.connections)) return false;
  for (const conn of data.connections) {
    if (!conn.id || !conn.sourceNodeId || !conn.targetNodeId) {
      return false;
    }
  }

  if (!Array.isArray(data.facilityComponents)) return false;
  for (const fac of data.facilityComponents) {
    if (!fac.id || !fac.type || typeof fac.isoX !== 'number' || typeof fac.isoY !== 'number' || typeof fac.temperatureCelsius !== 'number') {
      return false;
    }
  }

  if (!Array.isArray(data.activeIncidents)) return false;
  for (const inc of data.activeIncidents) {
    if (!inc.id || !inc.type || !inc.severity || !inc.targetComponentId) {
      return false;
    }
  }

  return true;
}

/**
 * Serializes live simulation engine state into schema-compliant JSON structure
 * @param {Object} engineState
 * @returns {Object}
 */
export function serializeState(engineState) {
  return {
    version: SAVE_STATE_VERSION,
    savedAtTimestamp: Date.now(),
    simulationTickCount: engineState.simulationTickCount || 0,
    economicProfile: {
      cashMicroCents: engineState.economicProfile?.cashMicroCents ?? SIM_CONSTANTS.STARTING_CASH_MICRO_CENTS,
      revenuePerSec: engineState.economicProfile?.revenuePerSec ?? 0,
      opexPerSec: engineState.economicProfile?.opexPerSec ?? 0,
      slaReputationPercent: engineState.economicProfile?.slaReputationPercent ?? SIM_CONSTANTS.SLA_REPUTATION_DEFAULT,
      totalProcessedRequests: engineState.economicProfile?.totalProcessedRequests ?? 0,
      totalFailedRequests: engineState.economicProfile?.totalFailedRequests ?? 0,
    },
    nodes: (engineState.nodes || []).map((n) => ({
      id: n.id,
      type: n.type,
      gridX: n.gridX,
      gridY: n.gridY,
      status: n.status || 'HEALTHY',
      cpuUtilization: n.cpuUtilization || 0,
    })),
    connections: (engineState.connections || []).map((c) => ({
      id: c.id,
      sourceNodeId: c.sourceNodeId,
      targetNodeId: c.targetNodeId,
    })),
    facilityComponents: (engineState.facilityComponents || []).map((f) => ({
      id: f.id,
      type: f.type,
      isoX: f.isoX,
      isoY: f.isoY,
      temperatureCelsius: f.temperatureCelsius || SIM_CONSTANTS.AMBIENT_ROOM_TEMP_C,
      isPowerActive: f.isPowerActive !== undefined ? f.isPowerActive : true,
    })),
    activeIncidents: (engineState.activeIncidents || []).map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      targetComponentId: i.targetComponentId,
      timeElapsedSec: i.timeElapsedSec || 0,
    })),
    techTree: engineState.techTree || null,
    contracts: engineState.contracts || null,
  };
}

/**
 * Computes offline delta revenue and catch-up metrics capped at 8 hours (28,800s)
 * @param {Object} savedState
 * @param {number} currentTimestamp
 * @returns {{ offlineSeconds: number, offlineCashDelta: number, offlineRequestsProcessed: number, offlineRequestsDropped: number }}
 */
export function computeOfflineCatchup(savedState, currentTimestamp = Date.now()) {
  const elapsedMs = Math.max(0, currentTimestamp - savedState.savedAtTimestamp);
  const rawOfflineSec = Math.floor(elapsedMs / 1000);
  const maxOfflineSec = SIM_CONSTANTS.OFFLINE_CATCHUP_MAX_HOURS * 3600; // 28,800s
  const offlineSeconds = Math.min(rawOfflineSec, maxOfflineSec);

  const ep = savedState.economicProfile;
  const netPerSec = (ep.revenuePerSec || 0) - (ep.opexPerSec || 0);

  // If SLA is healthy (>= 95%), full offline throughput operates
  const slaMultiplier = ep.slaReputationPercent >= 95 ? 1.0 : (ep.slaReputationPercent / 100);
  const offlineCashDelta = Math.floor(offlineSeconds * netPerSec * slaMultiplier);

  const estRps = (ep.revenuePerSec || 0) / SIM_CONSTANTS.REVENUE_PER_200_OK_MICRO_CENTS;
  const offlineRequestsProcessed = Math.floor(estRps * offlineSeconds * slaMultiplier);
  const offlineRequestsDropped = Math.floor(estRps * offlineSeconds * (1.0 - slaMultiplier));

  return {
    offlineSeconds,
    offlineCashDelta,
    offlineRequestsProcessed,
    offlineRequestsDropped,
  };
}

/**
 * Storage adapter interface implementations
 */
export class InMemoryStorageAdapter {
  constructor() {
    this._data = new Map();
  }
  async getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  async setItem(key, value) {
    this._data.set(key, value);
  }
  async removeItem(key) {
    this._data.delete(key);
  }
}

export class LocalStorageAdapter {
  async getItem(key) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }
  async setItem(key, value) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
  async removeItem(key) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}

/**
 * Main StatePersistence coordinator
 */
export class StatePersistence {
  constructor(storageAdapter = null) {
    if (storageAdapter) {
      this.storage = storageAdapter;
    } else if (typeof localStorage !== 'undefined') {
      this.storage = new LocalStorageAdapter();
    } else {
      this.storage = new InMemoryStorageAdapter();
    }
  }

  getSlotKey(slotId = 'autosave') {
    if (!slotId || slotId === 'autosave' || slotId === 'default') {
      return SAVE_STORAGE_KEY;
    }
    return `cloudsim_save_${slotId}`;
  }

  async save(engineState, slotId = 'autosave') {
    const serialized = serializeState(engineState);
    if (!validateSaveSchema(serialized)) {
      throw new Error('Simulation state failed save-state-schema validation');
    }
    const key = this.getSlotKey(slotId);
    await this.storage.setItem(key, JSON.stringify(serialized));
    return serialized;
  }

  async load(slotId = 'autosave') {
    const key = this.getSlotKey(slotId);
    const raw = await this.storage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (validateSaveSchema(parsed)) {
        return parsed;
      }
      console.warn(`[StatePersistence] Saved data in ${slotId} failed schema validation, skipping`);
      return null;
    } catch (e) {
      console.error(`[StatePersistence] Error parsing saved state JSON from ${slotId}:`, e);
      return null;
    }
  }

  async listSlots() {
    const slots = [
      { id: 'autosave', name: 'Auto-Save' },
      { id: 'slot1', name: 'Manual Slot 1' },
      { id: 'slot2', name: 'Manual Slot 2' },
      { id: 'slot3', name: 'Manual Slot 3' },
    ];
    const results = [];
    for (const slot of slots) {
      const raw = await this.storage.getItem(this.getSlotKey(slot.id));
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          results.push({
            id: slot.id,
            name: slot.name,
            exists: true,
            savedAtTimestamp: parsed.savedAtTimestamp,
            nodeCount: parsed.nodes ? parsed.nodes.length : 0,
            cashMicroCents: parsed.economicProfile?.cashMicroCents || 0,
          });
          continue;
        } catch (e) {}
      }
      results.push({
        id: slot.id,
        name: slot.name,
        exists: false,
        savedAtTimestamp: null,
        nodeCount: 0,
        cashMicroCents: 0,
      });
    }
    return results;
  }

  async clearSlot(slotId = 'autosave') {
    const key = this.getSlotKey(slotId);
    await this.storage.removeItem(key);
  }

  async clear() {
    await this.clearSlot('autosave');
  }
}
