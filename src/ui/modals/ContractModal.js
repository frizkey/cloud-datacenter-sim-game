/**
 * ContractModal.js - Enterprise RFPs & Service Level Agreements UI
 * Presents available client contracts across Startup, Growth, Enterprise, and Hyperscale tiers.
 * Live evaluation status tracking with >= 48x48 dp touch controls.
 */

import { globalEventBus } from '../../core/events/EventBus.js';
import { globalAudioManager } from '../../core/audio/AudioManager.js';
import { ContractState } from '../../core/sim/ContractManager.js';

export class ContractModal {
  /**
   * @param {Object} options
   * @param {import('../../core/sim/ContractManager.js').ContractManager} options.contractManager
   * @param {import('../../core/sim/SimulationEngine.js').SimulationEngine} options.engine
   * @param {Function} [options.onClose]
   */
  constructor(options = {}) {
    this.contractManager = options.contractManager;
    this.engine = options.engine;
    this.onClose = options.onClose || (() => {});
    this.rootElement = null;

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-client-contracts';
    this.rootElement.innerHTML = `
      <div class="modal-dialog" style="max-width: 740px; width: 92%;">
        <div class="modal-header">
          <div class="modal-title">
            <span>📜</span>
            <span>Enterprise RFPs & Client Contracts</span>
          </div>
          <button class="modal-close-btn" id="btn-close-contracts" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" style="padding-top: 12px;">
          <!-- Top info summary -->
          <div style="margin-bottom: 14px; padding: 10px 14px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; font-size: 13px; color: #94a3b8;">
            Sign commercial SLA service contracts to unlock recurring revenue streams and lucrative milestone bonuses. Breach penalties apply if latency or SLA degrades!
          </div>

          <!-- Contracts list container -->
          <div id="contracts-list-grid" style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 4px;">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-contracts-done" class="modal-btn modal-btn-primary" style="width: 100%;">
            Done
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    this.rootElement.querySelector('#btn-close-contracts').addEventListener('click', () => this.hide());
    this.rootElement.querySelector('#btn-contracts-done').addEventListener('click', () => this.hide());
  }

  getActiveComponentTypes() {
    if (!this.engine) return [];
    const types = [];
    if (this.engine.nodes) {
      for (const node of this.engine.nodes.values()) {
        types.push(node.type);
      }
    }
    return types;
  }

  renderContracts() {
    if (!this.contractManager) return;
    const grid = this.rootElement.querySelector('#contracts-list-grid');
    grid.innerHTML = '';

    const contracts = this.contractManager.getContracts();
    const activeComponents = this.getActiveComponentTypes();
    const activeSet = new Set(activeComponents);

    for (const contract of contracts) {
      const card = document.createElement('div');
      card.className = 'contract-card';

      const payoutSec = (contract.financials.payoutPerSecMicroCents / 100000).toFixed(2);
      const bonus = (contract.financials.bonusMicroCents / 100000).toFixed(2);
      const penalty = (contract.financials.penaltyPerBreachMicroCents / 100000).toFixed(2);

      let tierColor = '#38bdf8';
      if (contract.clientTier === 'GROWTH') tierColor = '#a855f7';
      if (contract.clientTier === 'ENTERPRISE') tierColor = '#f59e0b';
      if (contract.clientTier === 'HYPERSCALE') tierColor = '#ef4444';

      // Check component requirements
      let compReqHtml = '';
      let hasRequiredComps = true;
      if (contract.requirements.requiredComponents?.length > 0) {
        const compPills = contract.requirements.requiredComponents.map((c) => {
          const present = activeSet.has(c);
          if (!present) hasRequiredComps = false;
          return `<span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; background: ${present ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${present ? '#10b981' : '#f87171'}; border: 1px solid ${present ? '#10b981' : '#ef4444'};">${c}</span>`;
        });
        compReqHtml = `<div style="margin-top: 6px; font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">Req Components: ${compPills.join(' ')}</div>`;
      }

      // State and Actions
      let statusHtml = '';
      if (contract.state === ContractState.AVAILABLE) {
        statusHtml = `
          <button class="modal-btn modal-btn-primary btn-sign-contract" data-id="${contract.id}" ${hasRequiredComps ? '' : 'disabled style="opacity: 0.5;" title="Deploy required components first"'}>
            ✍️ Sign RFP (+$${payoutSec}/s)
          </button>
        `;
      } else if (contract.state === ContractState.ACTIVE) {
        const progressPct = Math.min(100, Math.round((contract.elapsedSec / contract.requirements.durationSec) * 100));
        statusHtml = `
          <div style="min-width: 140px; text-align: right;">
            <div style="color: #38bdf8; font-weight: 700; font-size: 13px;">ACTIVE (${progressPct}%)</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${contract.elapsedSec}s / ${contract.requirements.durationSec}s</div>
            <div style="width: 100%; height: 6px; background: rgba(255, 255, 255, 0.1); border-radius: 3px; overflow: hidden; margin-top: 4px;">
              <div style="width: ${progressPct}%; height: 100%; background: #38bdf8;"></div>
            </div>
          </div>
        `;
      } else if (contract.state === ContractState.FULFILLED) {
        statusHtml = `<span style="color: #10b981; font-weight: 700; font-size: 13px;">✓ FULFILLED (+$${bonus})</span>`;
      } else if (contract.state === ContractState.BREACHED) {
        statusHtml = `<span style="color: #ef4444; font-weight: 700; font-size: 13px;">⚠️ SLA BREACHED</span>`;
      }

      card.style.cssText = `
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid ${contract.state === ContractState.ACTIVE ? 'rgba(56, 189, 248, 0.5)' : contract.state === ContractState.FULFILLED ? 'rgba(16, 185, 129, 0.5)' : 'rgba(148, 163, 184, 0.2)'};
        border-radius: 8px;
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      `;

      card.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 15px; color: #f8fafc;">${contract.clientName}</span>
            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; background: rgba(56, 189, 248, 0.15); color: ${tierColor}; border: 1px solid ${tierColor};">
              ${contract.clientTier}
            </span>
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${contract.description}</div>
          
          <div style="display: flex; gap: 14px; margin-top: 6px; font-size: 12px; color: #cbd5e1; flex-wrap: wrap;">
            <span>Target: <strong>${contract.requirements.minRps} RPS</strong></span>
            <span>Max Latency: <strong>${contract.requirements.maxLatencyMs}ms</strong></span>
            <span>SLA: <strong>${contract.requirements.minSlaPercent}%</strong></span>
            <span>Duration: <strong>${contract.requirements.durationSec}s</strong></span>
          </div>

          <div style="display: flex; gap: 14px; margin-top: 4px; font-size: 12px; color: #10b981; flex-wrap: wrap;">
            <span>Rate: <strong>+$${payoutSec}/s</strong></span>
            <span>Bonus: <strong>+$${bonus}</strong></span>
            <span style="color: #f87171;">Breach Penalty: <strong>-$${penalty}/s</strong></span>
          </div>

          ${compReqHtml}
        </div>

        <div style="display: flex; align-items: center;">
          ${statusHtml}
        </div>
      `;

      grid.appendChild(card);
    }

    // Attach sign click events
    const signBtns = grid.querySelectorAll('.btn-sign-contract');
    signBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const contractId = e.currentTarget.getAttribute('data-id');
        this.executeSign(contractId);
      });
    });
  }

  executeSign(contractId) {
    if (!this.contractManager) return;
    try {
      const activeComponents = this.getActiveComponentTypes();
      this.contractManager.acceptContract(contractId, activeComponents);
      globalAudioManager.playSfx('LEVEL_VICTORY');
      this.renderContracts();
    } catch (err) {
      globalAudioManager.playSfx('PACKET_DROP');
      alert(`Cannot sign contract: ${err.message}`);
    }
  }

  show() {
    this.renderContracts();
    this.rootElement.classList.add('active');
  }

  hide() {
    this.rootElement.classList.remove('active');
    this.onClose();
  }
}
