/**
 * ModeSelectModal.js - Mobile dialog for selecting Campaign Levels, Survival, and Sandbox
 * DOM overlay adhering strictly to >= 48x48 dp touch target ergonomics.
 */

import { CAMPAIGN_LEVELS } from '../../core/sim/CampaignLevels.js';
import { globalCareerStorage } from '../../core/storage/CareerStorage.js';

export class ModeSelectModal {
  /**
   * @param {Object} options
   * @param {Function} options.onSelectLevel (levelNumber: number) => void
   * @param {Function} options.onStartSurvival () => void
   * @param {Function} options.onStartSandbox () => void
   * @param {import('../../core/storage/CareerStorage.js').CareerStorage} [options.careerStorage]
   */
  constructor(options = {}) {
    this.onSelectLevel = options.onSelectLevel || (() => {});
    this.onStartSurvival = options.onStartSurvival || (() => {});
    this.onStartSandbox = options.onStartSandbox || (() => {});
    this.careerStorage = options.careerStorage || globalCareerStorage;

    this.activeTab = 'campaign'; // 'campaign' | 'survival' | 'sandbox'
    this.rootElement = null;
    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-mode-select';
    this.rootElement.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">
            <span>🎮</span>
            <span>Game Modes & Career</span>
          </div>
          <button class="modal-close-btn" id="btn-close-mode-modal" aria-label="Close">✕</button>
        </div>

        <div class="modal-body">
          <div class="mode-tabs-container">
            <button class="mode-tab-btn active" data-tab="campaign">Career Campaign</button>
            <button class="mode-tab-btn" data-tab="survival">Endless Survival</button>
            <button class="mode-tab-btn" data-tab="sandbox">Chaos Sandbox</button>
          </div>

          <div id="mode-tab-content" class="mode-content-panel">
            <!-- Dynamic tab view injected here -->
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    // Tab buttons
    const tabBtns = this.rootElement.querySelectorAll('.mode-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeTab = btn.dataset.tab;
        this.renderTabContent();
      });
    });

    // Close button
    const closeBtn = this.rootElement.querySelector('#btn-close-mode-modal');
    closeBtn.addEventListener('click', () => this.hide());

    this.renderTabContent();
  }

  renderTabContent() {
    const container = this.rootElement.querySelector('#mode-tab-content');
    const career = this.careerStorage.loadCareer();

    if (this.activeTab === 'campaign') {
      container.innerHTML = `
        <div class="level-cards-grid">
          ${CAMPAIGN_LEVELS.map((lvl) => {
            const isUnlocked = lvl.levelNumber <= career.unlockedLevel;
            const stars = career.levelStars[lvl.levelNumber] || 0;
            const starText = isUnlocked
              ? `${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}`
              : '🔒 LOCKED';

            return `
              <div class="level-card ${isUnlocked ? '' : 'locked'}" data-level="${lvl.levelNumber}">
                <div class="level-card-header">
                  <span class="level-card-title">${lvl.title}</span>
                  <span class="level-stars">${starText}</span>
                </div>
                <div class="level-card-subtitle">${lvl.subtitle}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                  Target Duration: ${lvl.durationSec}s | Starter: $${(lvl.startingCashMicroCents / 1000000).toFixed(2)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      container.querySelectorAll('.level-card:not(.locked)').forEach((card) => {
        card.addEventListener('click', () => {
          const levelNum = parseInt(card.dataset.level, 10);
          this.hide();
          this.onSelectLevel(levelNum);
        });
      });
    } else if (this.activeTab === 'survival') {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px; text-align: center; padding: 10px 0;">
          <div style="font-size: 15px; color: #cbd5e1;">
            Face compounding traffic surges (+50% every 120s) and escalating operational chaos. Test your architecture to its absolute limit!
          </div>

          <div class="scorecard-metrics" style="grid-template-columns: 1fr 1fr;">
            <div class="scorecard-metric-item">
              <span class="scorecard-metric-label">Best Survival Time</span>
              <span class="scorecard-metric-val text-emerald">${career.survivalHighScoreSec}s</span>
            </div>
            <div class="scorecard-metric-item">
              <span class="scorecard-metric-label">Max Requests Served</span>
              <span class="scorecard-metric-val text-sky">${career.survivalMaxRequests.toLocaleString()}</span>
            </div>
          </div>

          <button id="btn-launch-survival" class="modal-btn modal-btn-primary" style="margin-top: 10px;">
            ⚡ Launch Endless Survival
          </button>
        </div>
      `;

      container.querySelector('#btn-launch-survival')?.addEventListener('click', () => {
        this.hide();
        this.onStartSurvival();
      });
    } else if (this.activeTab === 'sandbox') {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px; text-align: center; padding: 10px 0;">
          <div style="font-size: 15px; color: #cbd5e1;">
            Unlimited funds ($1,000,000), zero placement costs, and an open manual chaos injector. Experiment freely with extreme multi-tier topologies.
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 12px; color: #6ee7b7; font-size: 13px;">
            ✓ All catalog items available<br>
            ✓ Zero bankruptcy penalty<br>
            ✓ Manual incident injection drawer
          </div>

          <button id="btn-launch-sandbox" class="modal-btn modal-btn-primary" style="margin-top: 10px;">
            🧪 Launch Chaos Sandbox
          </button>
        </div>
      `;

      container.querySelector('#btn-launch-sandbox')?.addEventListener('click', () => {
        this.hide();
        this.onStartSandbox();
      });
    }
  }

  show() {
    this.renderTabContent();
    this.rootElement.classList.add('active');
  }

  hide() {
    this.rootElement.classList.remove('active');
  }
}
