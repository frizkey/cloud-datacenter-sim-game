/**
 * MissionBriefingModal.js - Pre-mission briefing presenting lore, objectives, and starter footprint
 * Adheres strictly to >= 48x48 dp touch target ergonomics.
 */

export class MissionBriefingModal {
  /**
   * @param {Object} options
   * @param {Function} options.onDeploy (levelConfig: Object) => void
   * @param {Function} options.onBack () => void
   */
  constructor(options = {}) {
    this.onDeploy = options.onDeploy || (() => {});
    this.onBack = options.onBack || (() => {});
    this.currentLevel = null;
    this.rootElement = null;

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-mission-briefing';
    this.rootElement.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">
            <span>📋</span>
            <span id="briefing-title">Mission Briefing</span>
          </div>
          <button class="modal-close-btn" id="btn-close-briefing" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" id="briefing-body">
          <!-- Populated dynamically in show() -->
        </div>

        <div class="modal-footer">
          <button id="btn-briefing-back" class="modal-btn modal-btn-secondary">
            Back
          </button>
          <button id="btn-briefing-deploy" class="modal-btn modal-btn-primary">
            🚀 Deploy & Start
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    this.rootElement.querySelector('#btn-close-briefing').addEventListener('click', () => {
      this.hide();
      this.onBack();
    });

    this.rootElement.querySelector('#btn-briefing-back').addEventListener('click', () => {
      this.hide();
      this.onBack();
    });

    this.rootElement.querySelector('#btn-briefing-deploy').addEventListener('click', () => {
      this.hide();
      if (this.currentLevel) {
        this.onDeploy(this.currentLevel);
      }
    });
  }

  /**
   * Open the briefing modal for a specific level configuration
   * @param {Object} levelConfig
   */
  show(levelConfig) {
    this.currentLevel = levelConfig;
    if (!levelConfig) return;

    this.rootElement.querySelector('#briefing-title').textContent = levelConfig.title;

    const startCash = (levelConfig.startingCashMicroCents / 1000000).toFixed(2);
    const targetBonusCash = (levelConfig.objectives.targetCashBonusMicroCents / 1000000).toFixed(2);

    const bodyEl = this.rootElement.querySelector('#briefing-body');
    bodyEl.innerHTML = `
      <div style="font-size: 14px; line-height: 1.5; color: #cbd5e1; background: rgba(30, 41, 59, 0.4); padding: 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.08);">
        ${levelConfig.lore}
      </div>

      <div style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px;">
        Mission Parameters & Starter Budget
      </div>
      <div class="scorecard-metrics" style="grid-template-columns: 1fr 1fr;">
        <div class="scorecard-metric-item">
          <span class="scorecard-metric-label">Starter Capital</span>
          <span class="scorecard-metric-val text-emerald">$${startCash}</span>
        </div>
        <div class="scorecard-metric-item">
          <span class="scorecard-metric-label">Duration Required</span>
          <span class="scorecard-metric-val text-sky">${levelConfig.durationSec}s</span>
        </div>
      </div>

      <div style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 4px;">
        Victory Criteria & Star Ratings
      </div>
      <div class="briefing-objectives-list">
        <div class="briefing-objective-item">
          <span>⭐</span>
          <span><strong>1 Star:</strong> Survive full ${levelConfig.durationSec}s with SLA ≥ ${levelConfig.objectives.minSlaPercent.toFixed(1)}%</span>
        </div>
        <div class="briefing-objective-item">
          <span>⭐</span>
          <span><strong>2 Stars:</strong> SRE Mastery - Maintain SLA ≥ 99.5%</span>
        </div>
        <div class="briefing-objective-item">
          <span>⭐</span>
          <span><strong>3 Stars:</strong> Profitability Target - End mission with cash ≥ $${targetBonusCash}</span>
        </div>
      </div>

      ${levelConfig.scriptedIncidents && levelConfig.scriptedIncidents.length > 0 ? `
        <div class="intel-warning-box">
          <span style="font-size: 18px;">⚠️</span>
          <div>
            <strong>Incident Intel Forecast:</strong> ${levelConfig.scriptedIncidents[0].description} (Estimated at T+${levelConfig.scriptedIncidents[0].triggerAtSec}s).
          </div>
        </div>
      ` : ''}
    `;

    this.rootElement.classList.add('active');
  }

  hide() {
    this.rootElement.classList.remove('active');
  }
}
