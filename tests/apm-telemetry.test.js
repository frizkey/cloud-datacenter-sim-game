import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/EventBus.js';
import { TrafficEngine } from '../src/core/sim/TrafficEngine.js';
import { ChaosDirector } from '../src/core/sim/ChaosDirector.js';

describe('APM Observability & Forensic Triage (T036)', () => {
  let eventBus;
  let trafficEngine;
  let chaosDirector;

  beforeEach(() => {
    eventBus = new EventBus();
    trafficEngine = new TrafficEngine(eventBus);
    chaosDirector = new ChaosDirector(eventBus);
  });

  it('records request latencies and response status codes into 60-second rolling buffer', () => {
    // Record mixed sample latencies
    trafficEngine.recordTelemetrySample(20, 200);
    trafficEngine.recordTelemetrySample(45, 200);
    trafficEngine.recordTelemetrySample(95, 200);
    trafficEngine.recordTelemetrySample(180, 502);
    trafficEngine.recordTelemetrySample(320, 504);

    const metrics = trafficEngine.getApmMetrics();
    assert.equal(metrics.totalRequests, 5);
    assert.equal(metrics.statusDistribution['200'], 3);
    assert.equal(metrics.statusDistribution['502'], 1);
    assert.equal(metrics.statusDistribution['504'], 1);
    assert.equal(metrics.errorRatePercent, 40.0);
  });

  it('computes accurate P50, P95, and P99 latency percentiles', () => {
    // Inject 100 samples from 1ms to 100ms
    for (let i = 1; i <= 100; i++) {
      trafficEngine.recordTelemetrySample(i, 200);
    }

    const metrics = trafficEngine.getApmMetrics();
    assert.equal(metrics.totalRequests, 100);
    assert.equal(metrics.p50LatencyMs, 50);
    assert.equal(metrics.p95LatencyMs, 95);
    assert.equal(metrics.p99LatencyMs, 99);
  });

  it('segments requests into visual latency histogram buckets', () => {
    trafficEngine.recordTelemetrySample(25, 200);  // <50ms
    trafficEngine.recordTelemetrySample(75, 200);  // 50-100ms
    trafficEngine.recordTelemetrySample(150, 200); // 100-250ms
    trafficEngine.recordTelemetrySample(300, 504); // 250-500ms
    trafficEngine.recordTelemetrySample(600, 502); // >500ms

    const metrics = trafficEngine.getApmMetrics();
    const buckets = metrics.histogramBuckets;
    assert.ok(Array.isArray(buckets), 'Must return array of histogram buckets');
    assert.equal(buckets.length, 5);

    assert.equal(buckets[0].count, 1); // <50ms
    assert.equal(buckets[1].count, 1); // 50-100ms
    assert.equal(buckets[2].count, 1); // 100-250ms
    assert.equal(buckets[3].count, 1); // 250-500ms
    assert.equal(buckets[4].count, 1); // >500ms
  });

  it('resolves Cache Stampede incident via forensic pre-warm remediation action', () => {
    let mitigatedEmitted = false;
    eventBus.on('INCIDENT_MITIGATED', (evt) => {
      mitigatedEmitted = true;
      assert.equal(evt.payload.remediationAction, 'PREWARM_CACHE');
    });

    const incident = chaosDirector.triggerCacheStampede('cache_01');
    assert.equal(incident.type, 'CACHE_STAMPEDE');
    assert.equal(chaosDirector.getActiveIncidents().length, 1);

    const resolved = chaosDirector.resolveIncident(incident.id, 'PREWARM_CACHE');
    assert.equal(resolved, true);
    assert.equal(chaosDirector.getActiveIncidents().length, 0);
    assert.equal(mitigatedEmitted, true);
  });

  it('supports resolving incidents via resolveByRemediation helper', () => {
    chaosDirector.triggerSqliBreach('db_01');
    assert.equal(chaosDirector.getActiveIncidents().length, 1);

    const resolved = chaosDirector.resolveByRemediation('DEPLOY_WAF_RULESET');
    assert.equal(resolved, true);
    assert.equal(chaosDirector.getActiveIncidents().length, 0);
  });
});
