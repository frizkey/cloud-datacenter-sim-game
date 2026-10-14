import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChaosDirector } from '../src/core/sim/ChaosDirector.js';
import { IncidentType, IncidentSeverity } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('ChaosDirector Incident Triage Tests (US5)', () => {
  it('triggers emergency incident and emits INCIDENT_TRIGGERED event', () => {
    const bus = new EventBus();
    const chaos = new ChaosDirector(bus);

    let triggeredEvent = null;
    bus.on('INCIDENT_TRIGGERED', (evt) => {
      triggeredEvent = evt;
    });

    const incident = chaos.triggerIncident({
      type: IncidentType.POD_MEMORY_LEAK,
      severity: IncidentSeverity.TIER_2_MEDIUM,
      targetComponentId: 'pod_01',
      title: 'Memory Leak Detected',
      description: 'RSS memory approaching 95%. Pod will OOMKill soon.',
      requiredRemediation: 'RESTART_POD',
      maxDurationSec: 45,
    });

    assert.ok(incident);
    assert.strictEqual(chaos.getActiveIncidents().length, 1);
    assert.strictEqual(incident.isResolved, false);
    assert.ok(triggeredEvent);
    assert.strictEqual(triggeredEvent.payload.incident.type, IncidentType.POD_MEMORY_LEAK);
  });

  it('validates player remediation and mitigates incident upon correct action', () => {
    const bus = new EventBus();
    const chaos = new ChaosDirector(bus);

    let mitigatedEvent = null;
    bus.on('INCIDENT_MITIGATED', (evt) => {
      mitigatedEvent = evt;
    });

    const incident = chaos.triggerIncident({
      type: IncidentType.CACHE_STAMPEDE,
      severity: IncidentSeverity.TIER_3_HIGH,
      targetComponentId: 'db_01',
      title: 'Cache Stampede',
      description: 'Hot keys expired; database queue depth is 400 requests.',
      requiredRemediation: 'WARM_CACHE',
      maxDurationSec: 30,
    });

    // Wrong remediation action: should not resolve
    const wrongResult = chaos.resolveIncident(incident.id, 'RESTART_POD');
    assert.strictEqual(wrongResult, false);
    assert.strictEqual(incident.isResolved, false);

    // Correct remediation action: resolves incident
    const correctResult = chaos.resolveIncident(incident.id, 'WARM_CACHE');
    assert.strictEqual(correctResult, true);
    assert.strictEqual(incident.isResolved, true);
    assert.strictEqual(chaos.getActiveIncidents().length, 0);
    assert.ok(mitigatedEvent);
    assert.strictEqual(mitigatedEvent.payload.incidentId, incident.id);
  });

  it('progresses incident elapsed time and handles deadline timeouts', () => {
    const bus = new EventBus();
    const chaos = new ChaosDirector(bus);

    const incident = chaos.triggerIncident({
      type: IncidentType.FLASH_SALE_SPIKE,
      severity: IncidentSeverity.TIER_1_LOW,
      targetComponentId: 'ingress_01',
      title: 'Traffic Spike',
      description: '10x traffic spike in progress',
      requiredRemediation: 'SCALE_POD',
      maxDurationSec: 10,
    });

    // Advance 5 seconds
    chaos.tick(5.0);
    assert.strictEqual(incident.timeElapsedSec, 5.0);
    assert.strictEqual(incident.isResolved, false);

    // Advance past deadline (6 more seconds = 11s)
    chaos.tick(6.0);
    assert.strictEqual(chaos.getActiveIncidents().length, 0, 'Expired incident must be removed from active pool');
  });
});
