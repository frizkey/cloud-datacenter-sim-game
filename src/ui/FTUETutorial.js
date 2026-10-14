/**
 * FTUETutorial.js - 30-Second Day-1 Onboarding Tutorial Walkthrough
 * Non-intrusive guided overlay introducing core build and incident triage loop.
 */

import { globalEventBus } from '../core/events/EventBus.js';

export class FTUETutorial {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container]
   * @param {Function} [options.onComplete] () => void
   */
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onComplete = options.onComplete || (() => {});
    this.currentStep = 1;
    this.totalSteps = 3;

    this.rootElement = null;
    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'ftue-overlay';
    this.rootElement.innerHTML = `
      <div class="ftue-card">
        <div class="ftue-header">
          <span class="ftue-badge">TRAINING • STEP <span id="ftue-step-num">1</span> OF 3</span>
          <button id="ftue-skip-btn" class="ftue-skip">Skip</button>
        </div>
        <h3 id="ftue-title" class="ftue-title">Welcome, Cloud Architect</h3>
        <p id="ftue-body" class="ftue-body">
          Traffic is surging! Incoming requests flow through your Ingress gateway into compute pods.
          Monitor your latency and cashflow in the Cockpit HUD above.
        </p>
        <div class="ftue-footer">
          <button id="ftue-next-btn" class="ftue-next-btn">Next Tip 👉</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.rootElement);

    const nextBtn = this.rootElement.querySelector('#ftue-next-btn');
    const skipBtn = this.rootElement.querySelector('#ftue-skip-btn');

    nextBtn.addEventListener('click', () => this.nextStep());
    skipBtn.addEventListener('click', () => this.dismiss());
  }

  nextStep() {
    this.currentStep++;

    if (this.currentStep > this.totalSteps) {
      this.dismiss();
      return;
    }

    const stepNumEl = this.rootElement.querySelector('#ftue-step-num');
    const titleEl = this.rootElement.querySelector('#ftue-title');
    const bodyEl = this.rootElement.querySelector('#ftue-body');
    const nextBtn = this.rootElement.querySelector('#ftue-next-btn');

    stepNumEl.textContent = this.currentStep;

    if (this.currentStep === 2) {
      titleEl.textContent = 'Hardware Procurement';
      bodyEl.textContent = 'Drag components from the bottom drawer to expand capacity or switch to the Facility view to check rack temperatures and cooling!';
    } else if (this.currentStep === 3) {
      titleEl.textContent = 'SRE Crisis Triage';
      bodyEl.textContent = 'When incidents trigger, use the emergency banner to remediate bottlenecks before SLA drops below 99.9%! Good luck!';
      nextBtn.textContent = 'Start Architecture 🚀';
    }
  }

  dismiss() {
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
    this.onComplete();
    globalEventBus.emit('FTUE_COMPLETED');
  }
}
