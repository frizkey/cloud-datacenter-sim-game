/**
 * TechTreeModal.js - SRE Research Lab Modal UI
 * Displays 4 progressive technology eras, prerequisites, research costs, and unlocks.
 * Adheres strictly to >= 48x48 dp touch targets and glassmorphic styling.
 */

import { globalEventBus } from '../../core/events/EventBus.js';
import { globalAudioManager } from '../../core/audio/AudioManager.js';

export class TechTreeModal {
  /**
   * @param {Object} options
   * @param {import('../../core/sim/TechTree.js').TechTree} options.techTree
   * @param {import('../../core/sim/SimulationEngine.js').SimulationEngine} options.engine
   * @param {Function} [options.onClose]
   */
  constructor(options = {}) {
    this.techTree = options.techTree;
    this.engine = options.engine;
    this.onClose = options.onClose || (() => {});
    this.currentEra = 1;
    this.rootElement = null;

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-tech-tree';
    this.rootElement.innerHTML = `
      <div class="modal-dialog" style="max-width: 720px; width: 92%;">
        <div class="modal-header">
          <div class="modal-title">
            <span>🔬</span>
            <span>SRE Research Lab</span>
          </div>
          <button class="modal-close-btn" id="btn-close-tech-tree" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" style="padding-top: 12px;">
          <!-- Top info bar with balance -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 10px 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px;">
            <div style="font-size: 13px; color: #94a3b8;">
              Unlock advanced cloud infrastructure, security firewalls, and automated SRE mechanics.
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #10b981; white-space: nowrap; margin-left: 12px;">
              Funds: <span id="tech-modal-funds">$0.00</span>
            </div>
          </div>

          <!-- Era Navigation Tabs -->
          <div class="view-switcher-pill" style="display: flex; gap: 4px; margin-bottom: 16px; width: 100%;" role="tablist">
            <button class="pill-btn active era-tab" data-era="1" style="flex: 1; min-height: 44px;">
              Era 1: Monolith
            </button>
            <button class="pill-btn era-tab" data-era="2" style="flex: 1; min-height: 44px;">
              Era 2: HA Cluster
            </button>
            <button class="pill-btn era-tab" data-era="3" style="flex: 1; min-height: 44px;">
              Era 3: Cloud-Native
            </button>
            <button class="pill-btn era-tab" data-era="4" style="flex: 1; min-height: 44px;">
              Era 4: Hyperscale
            </button>
          </div>

          <!-- Tech Cards Grid -->
          <div id="tech-cards-grid" style="display: flex; flex-direction: column; gap: 12px; max-height: 380px; overflow-y: auto; padding-right: 4px;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-tech-done" class="modal-btn modal-btn-primary" style="width: 100%;">
            Close Lab
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    this.rootElement.querySelector('#btn-close-tech-tree').addEventListener('click', () => this.hide());
    this.rootElement.querySelector('#btn-tech-done').addEventListener('click', () => this.hide());

    const eraTabs = this.rootElement.querySelectorAll('.era-tab');
    eraTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        eraTabs.forEach((t) => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentEra = parseInt(e.currentTarget.getAttribute('data-era'), 10);
        this.renderCards();
      });
    });
  }

  getAvailableFundsMicroCents() {
    if (this.engine?.economicEngine) {
      return this.engine.economicEngine.cashMicroCents;
    }
    return 1000000000;
  }

  renderCards() {
    if (!this.techTree) return;
    const grid = this.rootElement.querySelector('#tech-cards-grid');
    const fundsEl = this.rootElement.querySelector('#tech-modal-funds');
    const availableFunds = this.getAvailableFundsMicroCents();
    fundsEl.textContent = `$${(availableFunds / 100000).toFixed(2)}`;

    grid.innerHTML = '';

    const nodes = this.techTree.getNodes().filter((n) => n.era === this.currentEra);

    for (const node of nodes) {
      const isUnlocked = node.isUnlocked;
      const canResearch = this.techTree.canResearchTech(node.id, availableFunds);
      const costDollars = (node.researchCostMicroCents / 100000).toFixed(2);

      const card = document.createElement('div');
      card.className = 'tech-card';
      card.style.cssText = `
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid ${isUnlocked ? 'rgba(16, 185, 129, 0.4)' : canResearch.canResearch ? 'rgba(56, 189, 248, 0.4)' : 'rgba(148, 163, 184, 0.2)'};
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      `;

      // Prerequisites description
      let prereqInfo = '';
      if (node.prerequisiteTechIds?.length > 0) {
        const prereqNames = node.prerequisiteTechIds.map((id) => {
          const p = this.techTree.getNode(id);
          const pUnlocked = p ? p.isUnlocked : false;
          return `<span style="color: ${pUnlocked ? '#10b981' : '#f43f5e'};">${p ? p.name : id}</span>`;
        });
        prereqInfo = `<div style="font-size: 11px; margin-top: 4px; color: #94a3b8;">Prerequisites: ${prereqNames.join(', ')}</div>`;
      }

      // Unlocks badge
      let unlocksBadge = '';
      if (node.unlockedComponentTypes?.length > 0) {
        unlocksBadge = `<div style="font-size: 11px; margin-top: 2px; color: #38bdf8;">Unlocks: <strong>${node.unlockedComponentTypes.join(', ')}</strong></div>`;
      }

      let actionBtnHtml = '';
      if (isUnlocked) {
        actionBtnHtml = `<span style="color: #10b981; font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 4px;">✓ RESEARCHED</span>`;
      } else if (canResearch.canResearch) {
        actionBtnHtml = `<button class="modal-btn modal-btn-primary btn-research-tech" data-tech="${node.id}" style="min-height: 44px; padding: 0 16px; white-space: nowrap;">
          🔬 Research ($${costDollars})
        </button>`;
      } else {
        actionBtnHtml = `<button class="modal-btn modal-btn-secondary" disabled style="min-height: 44px; padding: 0 16px; opacity: 0.5; white-space: nowrap;" title="${canResearch.reason || 'Locked'}">
          🔒 Locked ($${costDollars})
        </button>`;
      }

      card.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 14px; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
            <span>${node.name}</span>
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${node.description}</div>
          ${prereqInfo}
          ${unlocksBadge}
        </div>
        <div>
          ${actionBtnHtml}
        </div>
      `;

      grid.appendChild(card);
    }

    // Attach research click handlers
    const researchBtns = grid.querySelectorAll('.btn-research-tech');
    researchBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const techId = e.currentTarget.getAttribute('data-tech');
        this.executeResearch(techId);
      });
    });
  }

  executeResearch(techId) {
    if (!this.techTree) return;
    const availableFunds = this.getAvailableFundsMicroCents();
    const result = this.techTree.researchTech(techId, availableFunds);

    if (result.success) {
      if (this.engine?.economicEngine && result.costDeductedMicroCents > 0) {
        this.engine.economicEngine.deductCash(result.costDeductedMicroCents);
      }
      globalAudioManager.playSfx('LEVEL_VICTORY');
      this.renderCards();
    } else {
      globalAudioManager.playSfx('PACKET_DROP');
      alert(`Research failed: ${result.reason}`);
    }
  }

  show() {
    this.renderCards();
    this.rootElement.classList.add('active');
  }

  hide() {
    this.rootElement.classList.remove('active');
    this.onClose();
  }
}
