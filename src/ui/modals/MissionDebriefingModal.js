/**
 * MissionDebriefingModal.js - Post-mission scorecard displaying star ratings, metrics, and next steps
 * Adheres strictly to >= 48x48 dp touch target ergonomics.
 */

export class MissionDebriefingModal {
  /**
   * @param {Object} options
   * @param {Function} options.onNextLevel (nextLevelNumber: number) => void
   * @param {Function} options.onRetryLevel (levelNumber: number) => void
   * @param {Function} options.onLevelSelect () => void
   */
  constructor(options = {}) {
    this.onNextLevel = options.onNextLevel || (() => {});
    this.onRetryLevel = options.onRetryLevel || (() => {});
    this.onLevelSelect = options.onLevelSelect || (() => {});
    this.currentResult = null;
    this.rootElement = null;

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-mission-debriefing';
    this.rootElement.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">
            <span id="debriefing-icon">🏆</span>
            <span id="debriefing-title">Mission Debriefing</span>
          </div>
          <button class="modal-close-btn" id="btn-close-debriefing" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" id="debriefing-body">
          <!-- Populated dynamically in show() -->
        </div>

        <div class="modal-footer" id="debriefing-footer">
          <!-- Populated dynamically in show() -->
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    this.rootElement.querySelector('#btn-close-debriefing').addEventListener('click', () => {
      this.hide();
      this.onLevelSelect();
    });
  }

  /**
   * Display debriefing scorecard
   * @param {Object} result { isVictory: boolean, levelNumber: number, starsEarned: number, slaPercent: number, finalCashMicroCents: number, requestsProcessed: number, failureReason?: string }
   */
  show(result) {
    this.currentResult = result;
    const isVictory = !!result.isVictory;
    const bodyEl = this.rootElement.querySelector('#debriefing-body');
    const footerEl = this.rootElement.querySelector('#debriefing-footer');
    const titleEl = this.rootElement.querySelector('#debriefing-title');
    const iconEl = this.rootElement.querySelector('#debriefing-icon');

    if (isVictory) {
      iconEl.textContent = '🏆';
      titleEl.textContent = `Level ${result.levelNumber} Complete`;

      const stars = result.starsEarned || 1;
      const starHtml = [1, 2, 3].map((s) => `
        <span class="star-badge ${s <= stars ? 'earned' : ''}">★</span>
      `).join('');

      const cashFormatted = ((result.finalCashMicroCents || 0) / 1000000).toFixed(2);
      const slaFormatted = (result.slaPercent || 100).toFixed(1);

      bodyEl.innerHTML = `
        <div class="scorecard-banner victory">
          <div class="scorecard-headline">MISSION ACCOMPLISHED!</div>
          <div class="scorecard-stars">${starHtml}</div>
          <div style="font-size: 14px; color: #94a3b8;">
            ${stars === 3 ? 'Outstanding SRE Architecture & Cost Optimization!' : stars === 2 ? 'Solid Reliability! Can you optimize costs for 3 stars?' : 'Level Complete! Focus on SLA stability to earn more stars.'}
          </div>
        </div>

        <div class="scorecard-metrics">
          <div class="scorecard-metric-item">
            <span class="scorecard-metric-label">Final SLA Reputation</span>
            <span class="scorecard-metric-val text-emerald">${slaFormatted}%</span>
          </div>
          <div class="scorecard-metric-item">
            <span class="scorecard-metric-label">Closing Treasury</span>
            <span class="scorecard-metric-val text-emerald">$${cashFormatted}</span>
          </div>
        </div>
      `;

      footerEl.innerHTML = `
        <button id="btn-debrief-menu" class="modal-btn modal-btn-secondary">
          Level Select
        </button>
        <button id="btn-debrief-retry" class="modal-btn modal-btn-secondary">
          Replay
        </button>
        ${result.levelNumber < 5 ? `
          <button id="btn-debrief-next" class="modal-btn modal-btn-primary">
            Next Level ❯
          </button>
        ` : ''}
      `;

      footerEl.querySelector('#btn-debrief-menu')?.addEventListener('click', () => {
        this.hide();
        this.onLevelSelect();
      });

      footerEl.querySelector('#btn-debrief-retry')?.addEventListener('click', () => {
        this.hide();
        this.onRetryLevel(result.levelNumber);
      });

      footerEl.querySelector('#btn-debrief-next')?.addEventListener('click', () => {
        this.hide();
        this.onNextLevel(result.levelNumber + 1);
      });
    } else {
      iconEl.textContent = '💥';
      titleEl.textContent = result.levelNumber ? `Level ${result.levelNumber} Failed` : 'Session Terminated';

      bodyEl.innerHTML = `
        <div class="scorecard-banner defeat">
          <div class="scorecard-headline">MISSION FAILED</div>
          <div style="font-size: 15px; color: #fca5a5; margin-top: 8px;">
            ${result.failureReason || 'System collapsed under catastrophic operational load.'}
          </div>
        </div>

        <div class="scorecard-metrics">
          <div class="scorecard-metric-item">
            <span class="scorecard-metric-label">Duration Survived</span>
            <span class="scorecard-metric-val text-amber">${result.elapsedSec || 0}s</span>
          </div>
          <div class="scorecard-metric-item">
            <span class="scorecard-metric-label">Final SLA</span>
            <span class="scorecard-metric-val text-red">${(result.slaPercent || 0).toFixed(1)}%</span>
          </div>
        </div>
      `;

      footerEl.innerHTML = `
        <button id="btn-debrief-menu" class="modal-btn modal-btn-secondary">
          Level Select
        </button>
        <button id="btn-debrief-retry" class="modal-btn modal-btn-primary">
          🔄 Retry Mission
        </button>
      `;

      footerEl.querySelector('#btn-debrief-menu')?.addEventListener('click', () => {
        this.hide();
        this.onLevelSelect();
      });

      footerEl.querySelector('#btn-debrief-retry')?.addEventListener('click', () => {
        this.hide();
        this.onRetryLevel(result.levelNumber || 1);
      });
    }

    this.rootElement.classList.add('active');
  }

  hide() {
    this.rootElement.classList.remove('active');
  }
}
