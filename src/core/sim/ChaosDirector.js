/**
 * ChaosDirector.js - Dynamic incident spawner, failure injector, and SRE triage director
 * Pure JS, zero DOM/Phaser coupling.
 */

import { IncidentType, IncidentSeverity } from './Constants.js';
import { EngineEventTypes } from '../events/EventBus.js';

let incidentCounter = 0;

export class ChaosDirector {
  /**
   * @param {import('../events/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.activeIncidents = new Map(); // id -> IncidentEvent
    this.resolvedHistory = [];
  }

  /**
   * Trigger and inject a new operational emergency incident
   * @param {Object} params
   * @returns {Object} Created incident
   */
  triggerIncident(params) {
    incidentCounter++;
    const incident = {
      id: params.id || `inc_${Date.now()}_${incidentCounter}`,
      type: params.type || IncidentType.POD_MEMORY_LEAK,
      severity: params.severity || IncidentSeverity.TIER_2_MEDIUM,
      title: params.title || 'Operational Incident',
      description: params.description || 'System component degraded.',
      targetComponentId: params.targetComponentId || 'node_01',
      timeElapsedSec: 0,
      maxDurationSec: params.maxDurationSec || 45,
      isResolved: false,
      requiredRemediation: params.requiredRemediation || 'RESTART_POD',
    };

    this.activeIncidents.set(incident.id, incident);

    if (this.eventBus) {
      this.eventBus.emit(EngineEventTypes.INCIDENT_TRIGGERED, { incident });
    }

    return incident;
  }

  /**
   * Attempt to resolve active incident via player triage remediation
   * @param {string} incidentId
   * @param {string} remediationAction
   * @returns {boolean} Whether remediation was accepted and resolved
   */
  resolveIncident(incidentId, remediationAction) {
    const incident = this.activeIncidents.get(incidentId);
    if (!incident || incident.isResolved) return false;

    if (incident.requiredRemediation === remediationAction) {
      incident.isResolved = true;
      this.activeIncidents.delete(incidentId);
      this.resolvedHistory.push(incident);

      if (this.eventBus) {
        this.eventBus.emit(EngineEventTypes.INCIDENT_MITIGATED, {
          incidentId,
          remediationAction,
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Step incident timers and handle expiration
   * @param {number} deltaSec
   */
  tick(deltaSec) {
    for (const [id, incident] of this.activeIncidents.entries()) {
      incident.timeElapsedSec += deltaSec;

      if (incident.timeElapsedSec >= incident.maxDurationSec) {
        // Incident timed out (failure impact finalized)
        this.activeIncidents.delete(id);
        this.resolvedHistory.push(incident);

        if (this.eventBus) {
          this.eventBus.emit('INCIDENT_EXPIRED', { incidentId: id });
        }
      }
    }
  }

  /**
   * Returns list of currently active emergencies
   * @returns {Array<Object>}
   */
  getActiveIncidents() {
    return Array.from(this.activeIncidents.values());
  }
}
