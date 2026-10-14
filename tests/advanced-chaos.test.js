import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChaosDirector } from '../src/core/sim/ChaosDirector.js';
import { IncidentType, IncidentSeverity } from '../src/core/sim/Constants.js';
import { EventBus } from '../src/core/events/EventBus.js';

describe('Advanced SRE Chaos & Incident Remediation Tests (US4)', () => {
  it('triggers and remediates Volumetric DDoS Flood via ENABLE_DDOS_SHIELD', () => {
    const bus = new EventBus();
    const director = new ChaosDirector(bus);

    let mitigated = false;
    bus.on('INCIDENT_MITIGATED', (evt) => {
      if (evt.payload.remediationAction === 'ENABLE_DDOS_SHIELD') {
        mitigated = true;
      }
    });

    const incident = director.triggerDdosFlood('ingress_1');
    assert.strictEqual(incident.type, IncidentType.DDOS_FLOOD);
    assert.strictEqual(incident.requiredRemediation, 'ENABLE_DDOS_SHIELD');

    // Wrong remediation action fails
    const failRes = director.resolveIncident(incident.id, 'RESTART_POD');
    assert.strictEqual(failRes, false);
    assert.strictEqual(mitigated, false);

    // Correct remediation action resolves
    const okRes = director.resolveIncident(incident.id, 'ENABLE_DDOS_SHIELD');
    assert.strictEqual(okRes, true);
    assert.strictEqual(mitigated, true);
    assert.strictEqual(director.getActiveIncidents().length, 0);
  });

  it('triggers and remediates SQL Injection exploit via DEPLOY_WAF_RULESET', () => {
    const bus = new EventBus();
    const director = new ChaosDirector(bus);

    const incident = director.triggerSqliBreach('db_master');
    assert.strictEqual(incident.type, IncidentType.SQLI_BREACH);
    assert.strictEqual(incident.requiredRemediation, 'DEPLOY_WAF_RULESET');

    const res = director.resolveIncident(incident.id, 'DEPLOY_WAF_RULESET');
    assert.strictEqual(res, true);
  });

  it('triggers and remediates Database Split-Brain via TRIGGER_RAFT_QUORUM', () => {
    const bus = new EventBus();
    const director = new ChaosDirector(bus);

    const incident = director.triggerDatabaseSplitBrain('db_cluster');
    assert.strictEqual(incident.type, IncidentType.DATABASE_SPLIT_BRAIN);
    assert.strictEqual(incident.requiredRemediation, 'TRIGGER_RAFT_QUORUM');

    const res = director.resolveIncident(incident.id, 'TRIGGER_RAFT_QUORUM');
    assert.strictEqual(res, true);
  });

  it('triggers and remediates Server Rack Overheating Fire via EMERGENCY_EXHAUST_PURGE', () => {
    const bus = new EventBus();
    const director = new ChaosDirector(bus);

    const incident = director.triggerRackFire('rack_b2');
    assert.strictEqual(incident.type, IncidentType.RACK_FIRE);
    assert.strictEqual(incident.requiredRemediation, 'EMERGENCY_EXHAUST_PURGE');

    const res = director.resolveIncident(incident.id, 'EMERGENCY_EXHAUST_PURGE');
    assert.strictEqual(res, true);
  });

  it('triggers and remediates Municipal Power Blackout via START_DIESEL_GENERATOR', () => {
    const bus = new EventBus();
    const director = new ChaosDirector(bus);

    const incident = director.triggerPowerBlackout();
    assert.strictEqual(incident.type, IncidentType.POWER_BLACKOUT);
    assert.strictEqual(incident.requiredRemediation, 'START_DIESEL_GENERATOR');

    const res = director.resolveIncident(incident.id, 'START_DIESEL_GENERATOR');
    assert.strictEqual(res, true);
  });
});
