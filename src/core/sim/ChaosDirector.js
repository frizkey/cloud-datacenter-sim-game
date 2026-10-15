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
   * Resolve any active incident matching the given triage remediation action
   * @param {string} remediationAction
   * @returns {boolean} Whether an incident was resolved
   */
  resolveByRemediation(remediationAction) {
    for (const [id, incident] of this.activeIncidents.entries()) {
      if (incident.requiredRemediation === remediationAction) {
        return this.resolveIncident(id, remediationAction);
      }
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

  triggerDdosFlood(targetIngressId) {
    return this.triggerIncident({
      type: IncidentType.DDOS_FLOOD,
      severity: IncidentSeverity.TIER_2_MEDIUM,
      title: 'Volumetric DDoS Attack',
      description: 'Botnet saturating ingress bandwidth. Scrub traffic via Cloudflare Shield.',
      targetComponentId: targetIngressId,
      maxDurationSec: 30,
      requiredRemediation: 'ENABLE_DDOS_SHIELD',
    });
  }

  triggerSqliBreach(targetDbId) {
    return this.triggerIncident({
      type: IncidentType.SQLI_BREACH,
      severity: IncidentSeverity.TIER_2_MEDIUM,
      title: 'SQL Injection Exploit Breach',
      description: 'Malicious SQL payload penetrating database. Deploy WAF ruleset patch.',
      targetComponentId: targetDbId,
      maxDurationSec: 40,
      requiredRemediation: 'DEPLOY_WAF_RULESET',
    });
  }

  triggerCacheStampede(targetCacheId) {
    return this.triggerIncident({
      type: IncidentType.CACHE_STAMPEDE,
      severity: IncidentSeverity.TIER_2_MEDIUM,
      title: 'Cache Stampede Thundering Herd',
      description: 'Hot key TTL expired, cascading 100% queries to database. Pre-warm cache keys or deploy replica.',
      targetComponentId: targetCacheId,
      maxDurationSec: 35,
      requiredRemediation: 'PREWARM_CACHE',
    });
  }

  triggerDatabaseSplitBrain(targetDbId) {
    return this.triggerIncident({
      type: IncidentType.DATABASE_SPLIT_BRAIN,
      severity: IncidentSeverity.TIER_3_HIGH,
      title: 'Database Split-Brain Partition',
      description: 'Cross-zone network link severed. Quorum consensus election required.',
      targetComponentId: targetDbId,
      maxDurationSec: 45,
      requiredRemediation: 'TRIGGER_RAFT_QUORUM',
    });
  }

  triggerRackFire(targetRackId) {
    return this.triggerIncident({
      type: IncidentType.RACK_FIRE,
      severity: IncidentSeverity.TIER_3_HIGH,
      title: 'Server Rack Overheating Fire',
      description: 'Rack exceeding 45°C and catching fire. Emergency exhaust purge required.',
      targetComponentId: targetRackId,
      maxDurationSec: 30,
      requiredRemediation: 'EMERGENCY_EXHAUST_PURGE',
    });
  }

  triggerPowerBlackout() {
    return this.triggerIncident({
      type: IncidentType.POWER_BLACKOUT,
      severity: IncidentSeverity.TIER_3_HIGH,
      title: 'Municipal Power Grid Blackout',
      description: 'City power grid offline. Start emergency diesel generator before UPS battery dies.',
      targetComponentId: 'facility_grid',
      maxDurationSec: 40,
      requiredRemediation: 'START_DIESEL_GENERATOR',
    });
  }
}

