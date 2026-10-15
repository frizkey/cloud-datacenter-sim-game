/**
 * APMDashboardModal.js - Interactive APM Observability & Forensic Triage UI
 * Displays real-time P95/P99 latency histograms, 4xx/5xx status distribution, and forensic remediation actions.
 * Adheres strictly to >= 48x48 dp touch controls.
 */

import { globalEventBus } from '../../core/events/EventBus.js';
import { globalAudioManager } from '../../core/audio/AudioManager.js';

export class APMDashboardModal {
  /**
   * @param {Object} options
   * @param {import('../../core/sim/TrafficEngine.js').TrafficEngine} options.trafficEngine
   * @param {import('../../core/sim/ChaosDirector.js').ChaosDirector} options.chaosDirector
   * @param {import('../../core/sim/SimulationEngine.js').SimulationEngine} options.engine
   * @param {Function} [options.onClose]
   */
  constructor(options = {}) {
    this.trafficEngine = options.trafficEngine;
    this.chaosDirector = options.chaosDirector;
    this.engine = options.engine;
    this.onClose = options.onClose || (() => {});
    this.rootElement = null;
    this.refreshTimer = null;

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-apm-dashboard';
    this.rootElement.innerHTML = `
      <div class="modal-dialog" style="max-width: 760px; width: 92%;">
        <div class="modal-header">
          <div class="modal-title">
            <span>📊</span>
            <span>APM Observability & Forensic Triage</span>
          </div>
          <button class="modal-close-btn" id="btn-close-apm" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" style="padding-top: 12px;">
          <!-- Real-Time Percentile Metric Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div class="metric-card" style="padding: 10px;">
              <span class="metric-label">P50 LATENCY</span>
              <span id="apm-p50" class="metric-value text-emerald" style="font-size: 18px;">0ms</span>
              <span class="metric-sub text-muted">Median</span>
            </div>
            <div class="metric-card" style="padding: 10px;">
              <span class="metric-label">P95 LATENCY</span>
              <span id="apm-p95" class="metric-value text-sky" style="font-size: 18px;">0ms</span>
              <span class="metric-sub text-muted">SLA Threshold</span>
            </div>
            <div class="metric-card" style="padding: 10px;">
              <span class="metric-label">P99 LATENCY</span>
              <span id="apm-p99" class="metric-value" style="font-size: 18px; color: #f59e0b;">0ms</span>
              <span class="metric-sub text-muted">Tail Jitter</span>
            </div>
            <div class="metric-card" style="padding: 10px;">
              <span class="metric-label">ERROR RATE</span>
              <span id="apm-error-rate" class="metric-value" style="font-size: 18px; color: #ef4444;">0.0%</span>
              <span class="metric-sub text-muted">HTTP 4xx / 5xx</span>
            </div>
          </div>

          <!-- Latency Histogram -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
            <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">
              60-Second Latency Histogram
            </div>
            <div id="apm-histogram-bars" style="display: flex; flex-direction: column; gap: 6px;">
              <!-- Rendered dynamically -->
            </div>
          </div>

          <!-- Forensic Triage & Active Incident Mitigation -->
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 12px 14px;">
            <div style="font-size: 12px; font-weight: 700; color: #f87171; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: space-between;">
              <span>🚨 Live Incident Forensic Triage</span>
              <span id="apm-incident-count-badge" style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444;">0 Active</span>
            </div>
            <div id="apm-incident-triage-container" style="display: flex; flex-direction: column; gap: 10px;">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-apm-done" class="modal-btn modal-btn-primary" style="width: 100%;">
            Close APM
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    this.rootElement.querySelector('#btn-close-apm').addEventListener('click', () => this.hide());
    this.rootElement.querySelector('#btn-apm-done').addEventListener('click', () => this.hide());
  }

  renderMetrics() {
    if (!this.trafficEngine) return;
    const m = this.trafficEngine.getApmMetrics();

    const p50El = this.rootElement.querySelector('#apm-p50');
    const p95El = this.rootElement.querySelector('#apm-p95');
    const p99El = this.rootElement.querySelector('#apm-p99');
    const errEl = this.rootElement.querySelector('#apm-error-rate');

    if (p50El) p50El.textContent = `${m.p50LatencyMs}ms`;
    if (p95El) p95El.textContent = `${m.p95LatencyMs}ms`;
    if (p99El) p99El.textContent = `${m.p99LatencyMs}ms`;
    if (errEl) errEl.textContent = `${m.errorRatePercent.toFixed(1)}%`;

    // Render Histogram
    const histContainer = this.rootElement.querySelector('#apm-histogram-bars');
    histContainer.innerHTML = '';

    const maxCount = Math.max(1, ...m.histogramBuckets.map((b) => b.count));

    for (const bucket of m.histogramBuckets) {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 12px;';

      const pctWidth = Math.max(2, Math.round((bucket.count / maxCount) * 100));

      row.innerHTML = `
        <span style="width: 75px; color: #94a3b8; font-family: monospace;">${bucket.range}</span>
        <div style="flex: 1; height: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; overflow: hidden;">
          <div style="width: ${pctWidth}%; height: 100%; background: ${bucket.range.startsWith('>') ? '#ef4444' : '#38bdf8'}; transition: width 0.2s ease;"></div>
        </div>
        <span style="width: 45px; text-align: right; color: #cbd5e1; font-weight: 700;">${bucket.count}</span>
      `;
      histContainer.appendChild(row);
    }

    // Render Forensic Incident Triage
    const incidentContainer = this.rootElement.querySelector('#apm-incident-triage-container');
    const countBadge = this.rootElement.querySelector('#apm-incident-count-badge');
    const incidents = this.chaosDirector ? this.chaosDirector.getActiveIncidents() : [];

    countBadge.textContent = `${incidents.length} Active`;
    incidentContainer.innerHTML = '';

    if (incidents.length === 0) {
      incidentContainer.innerHTML = `
        <div style="padding: 12px; text-align: center; color: #10b981; font-size: 13px; font-weight: 600;">
          ✓ All microservices operational. Telemetry nominal.
        </div>
      `;
      return;
    }

    for (const inc of incidents) {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(239, 68, 68, 0.4);
        border-radius: 6px;
        padding: 10px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      `;

      let actionLabel = '🛠️ Mitigate';
      if (inc.requiredRemediation === 'PREWARM_CACHE') actionLabel = '⚡ Pre-Warm Cache Keys';
      else if (inc.requiredRemediation === 'DEPLOY_WAF_RULESET') actionLabel = '🛡️ Deploy WAF Patch';
      else if (inc.requiredRemediation === 'TRIGGER_RAFT_QUORUM') actionLabel = '🗳️ Trigger Raft Election';
      else if (inc.requiredRemediation === 'START_DIESEL_GENERATOR') actionLabel = '⚡ Spool Generator';
      else if (inc.requiredRemediation === 'EMERGENCY_EXHAUST_PURGE') actionLabel = '💨 Exhaust Purge';
      else if (inc.requiredRemediation === 'RESTART_POD') actionLabel = '🔄 Restart Pod';

      card.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 13px; color: #f87171;">${inc.title}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${inc.description}</div>
          <div style="font-size: 10px; color: #cbd5e1; margin-top: 4px;">Target: <strong>${inc.targetComponentId}</strong> | Elapsed: ${inc.timeElapsedSec}s</div>
        </div>
        <div>
          <button class="modal-btn modal-btn-primary btn-remediate-incident" data-action="${inc.requiredRemediation}" data-id="${inc.id}" style="min-height: 44px; padding: 0 14px; background: #ef4444; border-color: #f87171; white-space: nowrap;">
            ${actionLabel}
          </button>
        </div>
      `;

      incidentContainer.appendChild(card);
    }

    // Attach click events to remediation buttons
    const remediateBtns = incidentContainer.querySelectorAll('.btn-remediate-incident');
    remediateBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        const id = e.currentTarget.getAttribute('data-id');
        if (this.chaosDirector) {
          const ok = this.chaosDirector.resolveIncident(id, action);
          if (ok) {
            globalAudioManager.playSfx('INCIDENT_RESOLVED');
            this.renderMetrics();
          }
        }
      });
    });
  }

  show() {
    this.renderMetrics();
    this.rootElement.classList.add('active');
    this.refreshTimer = setInterval(() => this.renderMetrics(), 1000);
  }

  hide() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.rootElement.classList.remove('active');
    this.onClose();
  }
}
