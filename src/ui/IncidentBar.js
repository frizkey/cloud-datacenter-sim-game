/**
 * IncidentBar.js - Emergency triage banner and quick remediations
 * Displays active incident countdown, severity badge, camera recenter, and quick-fix button.
 */

import { globalEventBus, EngineEventTypes } from '../core/events/EventBus.js';

export class IncidentBar {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container]
   * @param {Function} [options.onRecenter] (targetComponentId) => void
   * @param {Function} [options.onRemediate] (incidentId, action) => void
   */
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onRecenter = options.onRecenter || (() => {});
    this.onRemediate = options.onRemediate || (() => {});

    this.activeIncident = null;
    this.rootElement = null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'incident-bar hidden';
    this.rootElement.innerHTML = `
      <div class="incident-badge" id="inc-severity">CRITICAL</div>
      <div class="incident-content">
        <span class="incident-title" id="inc-title">Flash Sale Surge</span>
        <span class="incident-desc" id="inc-desc">10x traffic spike overloading workers</span>
      </div>
      <div class="incident-countdown">
        ⏱️ <span id="inc-timer">30</span>s
      </div>
      <div class="incident-actions">
        <button id="inc-recenter-btn" class="incident-btn secondary-btn" aria-label="Recenter Camera">🎯 Focus</button>
        <button id="inc-remediate-btn" class="incident-btn primary-btn" aria-label="Quick Remediation">⚡ Remediate</button>
      </div>
    `;

    this.container.appendChild(this.rootElement);

    const recenterBtn = this.rootElement.querySelector('#inc-recenter-btn');
    const remediateBtn = this.rootElement.querySelector('#inc-remediate-btn');

    recenterBtn.addEventListener('click', () => {
      if (this.activeIncident) {
        this.onRecenter(this.activeIncident.targetComponentId);
      }
    });

    remediateBtn.addEventListener('click', () => {
      if (this.activeIncident) {
        this.onRemediate(this.activeIncident.id, this.activeIncident.requiredRemediation);
      }
    });
  }

  bindEvents() {
    globalEventBus.on(EngineEventTypes.INCIDENT_TRIGGERED, (evt) => {
      this.showIncident(evt.payload.incident);
    });

    globalEventBus.on(EngineEventTypes.INCIDENT_MITIGATED, (evt) => {
      if (this.activeIncident && this.activeIncident.id === evt.payload.incidentId) {
        this.hideIncident();
      }
    });

    globalEventBus.on('INCIDENT_EXPIRED', () => {
      this.hideIncident();
    });
  }

  showIncident(incident) {
    this.activeIncident = incident;
    this.rootElement.classList.remove('hidden');

    const severityEl = this.rootElement.querySelector('#inc-severity');
    const titleEl = this.rootElement.querySelector('#inc-title');
    const descEl = this.rootElement.querySelector('#inc-desc');
    const timerEl = this.rootElement.querySelector('#inc-timer');
    const remediateBtn = this.rootElement.querySelector('#inc-remediate-btn');

    severityEl.textContent = incident.severity.replace('TIER_', 'T');
    titleEl.textContent = incident.title;
    descEl.textContent = incident.description;
    timerEl.textContent = Math.ceil(incident.maxDurationSec - incident.timeElapsedSec);
    remediateBtn.textContent = `⚡ ${incident.requiredRemediation.replace(/_/g, ' ')}`;
  }

  hideIncident() {
    this.activeIncident = null;
    this.rootElement.classList.add('hidden');
  }

  destroy() {
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
  }
}
