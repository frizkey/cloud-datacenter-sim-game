/**
 * CockpitHUD.js - Glassmorphic top navigation bar & view-switcher pill
 * Renders cash ticker, throughput RPS, PUE ratio, SLA reputation, and view toggles.
 * DOM overlay adhering strictly to safe-area boundaries and >= 48x48 dp touch target ergonomics.
 */

import { globalEventBus, EngineEventTypes } from '../core/events/EventBus.js';

export class CockpitHUD {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container]
   * @param {Function} [options.onViewChange] (viewName: 'Topology' | 'Facility') => void
   */
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onViewChange = options.onViewChange || (() => {});
    this.onOpenModes = options.onOpenModes || (() => {});
    this.onOpenSettings = options.onOpenSettings || (() => {});
    this.onOpenResearch = options.onOpenResearch || (() => {});
    this.onOpenContracts = options.onOpenContracts || (() => {});
    this.onOpenBlueprints = options.onOpenBlueprints || (() => {});
    this.onOpenApm = options.onOpenApm || (() => {});
    this.currentView = 'Topology';

    this.rootElement = null;
    this.cashEl = null;
    this.netIncomeEl = null;
    this.rpsEl = null;
    this.slaEl = null;
    this.pueEl = null;
    this.insolvencyWarningEl = null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.rootElement = document.createElement('header');
    this.rootElement.className = 'cockpit-hud';
    this.rootElement.innerHTML = `
      <div class="hud-left">
        <!-- View Toggle Pill -->
        <div class="view-switcher-pill" role="tablist">
          <button id="btn-view-topology" class="pill-btn active" role="tab" aria-selected="true">
            <span class="icon">🌐</span>
            <span class="label">Topology</span>
          </button>
          <button id="btn-view-facility" class="pill-btn" role="tab" aria-selected="false">
            <span class="icon">🏢</span>
            <span class="label">Facility</span>
          </button>
        </div>
      </div>

      <div class="hud-center">
        <!-- Real-Time Metrics Strip -->
        <div class="metric-card metric-cash">
          <span class="metric-label">CAPITAL</span>
          <span id="hud-cash" class="metric-value text-emerald">$50.00</span>
          <span id="hud-net-income" class="metric-sub text-muted">+$0.00/s</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">THROUGHPUT</span>
          <span id="hud-rps" class="metric-value">0 RPS</span>
          <span class="metric-sub text-muted">100% capacity</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">REPUTATION</span>
          <span id="hud-sla" class="metric-value text-emerald">100.0%</span>
          <span class="metric-sub text-muted">SLA 99.99%</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">EFFICIENCY</span>
          <span id="hud-pue" class="metric-value text-sky">1.20</span>
          <span class="metric-sub text-muted">PUE Ratio</span>
        </div>
      </div>

      <div class="hud-right" style="display: flex; align-items: center; gap: 6px;">
        <button id="hud-apm-btn" class="pill-btn" style="min-width: auto; min-height: 44px; padding: 0 10px; background: rgba(245, 158, 11, 0.18); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24;" aria-label="APM Observability">
          📊 <span class="label" style="margin-left: 3px;">APM</span>
        </button>
        <button id="hud-research-btn" class="pill-btn" style="min-width: auto; min-height: 44px; padding: 0 10px; background: rgba(168, 85, 247, 0.18); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc;" aria-label="Research Lab">
          🔬 <span class="label" style="margin-left: 3px;">Lab</span>
        </button>
        <button id="hud-contracts-btn" class="pill-btn" style="min-width: auto; min-height: 44px; padding: 0 10px; background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399;" aria-label="Client Contracts">
          📜 <span class="label" style="margin-left: 3px;">RFPs</span>
        </button>
        <button id="hud-blueprints-btn" class="pill-btn" style="min-width: auto; min-height: 44px; padding: 0 10px; background: rgba(14, 165, 233, 0.18); border: 1px solid rgba(14, 165, 233, 0.4); color: #38bdf8;" aria-label="Blueprints & Saves">
          📐 <span class="label" style="margin-left: 3px;">Saves</span>
        </button>
        <button id="hud-modes-btn" class="pill-btn" style="min-width: auto; min-height: 44px; padding: 0 10px; background: rgba(56, 189, 248, 0.18); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8;" aria-label="Game Modes">
          🎮 <span class="label" style="margin-left: 3px;">Modes</span>
        </button>
        <button id="hud-menu-btn" class="icon-touch-btn" aria-label="Game Menu">
          ⚙️
        </button>
      </div>

      <!-- Emergency Insolvency Banner -->
      <div id="hud-insolvency-alert" class="insolvency-banner hidden">
        ⚠️ INSOLVENT: BANKRUPTCY IN <span id="hud-insolvency-timer">30</span>s! SCALE DOWN OR INJECT REVENUE!
      </div>
    `;

    this.container.appendChild(this.rootElement);

    this.cashEl = this.rootElement.querySelector('#hud-cash');
    this.netIncomeEl = this.rootElement.querySelector('#hud-net-income');
    this.rpsEl = this.rootElement.querySelector('#hud-rps');
    this.slaEl = this.rootElement.querySelector('#hud-sla');
    this.pueEl = this.rootElement.querySelector('#hud-pue');
    this.insolvencyWarningEl = this.rootElement.querySelector('#hud-insolvency-alert');
    this.insolvencyTimerEl = this.rootElement.querySelector('#hud-insolvency-timer');

    // Button event listeners
    const btnTopology = this.rootElement.querySelector('#btn-view-topology');
    const btnFacility = this.rootElement.querySelector('#btn-view-facility');
    const btnApm = this.rootElement.querySelector('#hud-apm-btn');
    const btnResearch = this.rootElement.querySelector('#hud-research-btn');
    const btnContracts = this.rootElement.querySelector('#hud-contracts-btn');
    const btnBlueprints = this.rootElement.querySelector('#hud-blueprints-btn');
    const btnModes = this.rootElement.querySelector('#hud-modes-btn');
    const btnMenu = this.rootElement.querySelector('#hud-menu-btn');

    btnTopology.addEventListener('click', () => this.switchView('Topology'));
    btnFacility.addEventListener('click', () => this.switchView('Facility'));
    btnApm?.addEventListener('click', () => this.onOpenApm());
    btnResearch?.addEventListener('click', () => this.onOpenResearch());
    btnContracts?.addEventListener('click', () => this.onOpenContracts());
    btnBlueprints?.addEventListener('click', () => this.onOpenBlueprints());
    btnModes?.addEventListener('click', () => this.onOpenModes());
    btnMenu?.addEventListener('click', () => this.onOpenSettings());
  }

  switchView(viewName) {
    if (this.currentView === viewName) return;
    this.currentView = viewName;

    const btnTopology = this.rootElement.querySelector('#btn-view-topology');
    const btnFacility = this.rootElement.querySelector('#btn-view-facility');

    if (viewName === 'Topology') {
      btnTopology.classList.add('active');
      btnTopology.setAttribute('aria-selected', 'true');
      btnFacility.classList.remove('active');
      btnFacility.setAttribute('aria-selected', 'false');
    } else {
      btnFacility.classList.add('active');
      btnFacility.setAttribute('aria-selected', 'true');
      btnTopology.classList.remove('active');
      btnTopology.setAttribute('aria-selected', 'false');
    }

    this.onViewChange(viewName);
    globalEventBus.emit('VIEW_CHANGED', { viewName });
  }

  bindEvents() {
    globalEventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      this.updateMetrics(evt.payload.snapshot);
    });
  }

  updateMetrics(snapshot) {
    if (!snapshot || !snapshot.economicProfile) return;
    const ep = snapshot.economicProfile;

    // 1. Format Cash ($XX.XX)
    const dollars = (ep.cashMicroCents / 1_000_000).toFixed(2);
    this.cashEl.textContent = `$${dollars}`;

    if (ep.cashMicroCents < 0) {
      this.cashEl.className = 'metric-value text-red flash-urgent';
      this.insolvencyWarningEl.classList.remove('hidden');
      this.insolvencyTimerEl.textContent = Math.ceil(ep.insolvencyGraceTimerSec || 0);
    } else {
      this.cashEl.className = 'metric-value text-emerald';
      this.insolvencyWarningEl.classList.add('hidden');
    }

    // 2. Net Income
    const netDollars = (ep.netIncomePerSec / 1_000_000).toFixed(2);
    const prefix = ep.netIncomePerSec >= 0 ? '+' : '';
    this.netIncomeEl.textContent = `${prefix}$${netDollars}/s`;
    this.netIncomeEl.className = ep.netIncomePerSec >= 0 ? 'metric-sub text-muted' : 'metric-sub text-red';

    // 3. Total RPS
    let totalRps = 0;
    if (Array.isArray(snapshot.nodes)) {
      for (const n of snapshot.nodes) {
        totalRps += (n.currentRps || 0);
      }
    }
    this.rpsEl.textContent = `${totalRps} RPS`;

    // 4. SLA Reputation
    const sla = ep.slaReputationPercent.toFixed(2);
    this.slaEl.textContent = `${sla}%`;
    if (ep.slaReputationPercent >= 99.9) {
      this.slaEl.className = 'metric-value text-emerald';
    } else if (ep.slaReputationPercent >= 95.0) {
      this.slaEl.className = 'metric-value text-amber';
    } else {
      this.slaEl.className = 'metric-value text-red';
    }

    // 5. PUE Ratio
    const pue = snapshot.pueRatio ? snapshot.pueRatio.toFixed(2) : '1.20';
    this.pueEl.textContent = pue;
  }

  destroy() {
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
  }
}
