/**
 * NodeInspector.js - Contextual component inspector sheet
 * Displays real-time node metrics, restart action, and sell/scale controls.
 */

import { globalEventBus, EngineEventTypes } from '../core/events/EventBus.js';

export class NodeInspector {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container]
   * @param {Function} [options.onSellNode] (nodeId) => void
   * @param {Function} [options.onRestartNode] (nodeId) => void
   */
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSellNode = options.onSellNode || (() => {});
    this.onRestartNode = options.onRestartNode || (() => {});
    this.onOpen = options.onOpen || (() => {});
    this.onClose = options.onClose || (() => {});

    this.activeNode = null;
    this.rootElement = null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'node-inspector hidden';
    this.rootElement.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-title-group">
            <span id="inspect-icon" class="inspector-icon">⚙️</span>
            <div>
              <h4 id="inspect-title" class="inspector-name">Compute Worker Pod</h4>
              <span id="inspect-type" class="inspector-badge">COMPUTE_POD</span>
            </div>
          </div>
          <button id="inspect-close-btn" class="close-btn" aria-label="Close Inspector">✕</button>
        </div>

        <div class="inspector-stats">
          <div class="stat-item">
            <span class="stat-label">Throughput</span>
            <span id="inspect-rps" class="stat-val">250 RPS</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">CPU Load</span>
            <span id="inspect-cpu" class="stat-val">45%</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Base Latency</span>
            <span id="inspect-lat" class="stat-val">20ms</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">OPEX</span>
            <span id="inspect-opex" class="stat-val">$0.015/s</span>
          </div>
        </div>

        <div class="inspector-actions">
          <button id="inspect-restart-btn" class="action-btn secondary">🔄 Restart Pod</button>
          <button id="inspect-sell-btn" class="action-btn danger">💰 Sell (50% Refund)</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.rootElement);

    const closeBtn = this.rootElement.querySelector('#inspect-close-btn');
    const restartBtn = this.rootElement.querySelector('#inspect-restart-btn');
    const sellBtn = this.rootElement.querySelector('#inspect-sell-btn');

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    restartBtn.addEventListener('click', () => {
      if (this.activeNode) {
        this.onRestartNode(this.activeNode.id);
        this.hide();
      }
    });

    sellBtn.addEventListener('click', () => {
      if (this.activeNode) {
        this.onSellNode(this.activeNode.id);
        this.hide();
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeNode) {
          this.hide();
        }
      });
    }
  }

  bindEvents() {
    globalEventBus.on('NODE_SELECTED', (evt) => {
      this.showNode(evt.payload.node);
    });

    globalEventBus.on('NODE_DESELECTED', () => {
      this.hide();
    });
  }

  showNode(node) {
    this.activeNode = node;
    this.rootElement.classList.remove('hidden');
    this.onOpen(node);

    const titleEl = this.rootElement.querySelector('#inspect-title');
    const typeEl = this.rootElement.querySelector('#inspect-type');
    const rpsEl = this.rootElement.querySelector('#inspect-rps');
    const cpuEl = this.rootElement.querySelector('#inspect-cpu');
    const latEl = this.rootElement.querySelector('#inspect-lat');
    const opexEl = this.rootElement.querySelector('#inspect-opex');

    titleEl.textContent = node.name || node.type;
    typeEl.textContent = node.type;

    if (node.type === 'WAF_SHIELD') {
      rpsEl.textContent = `Blocked: ${node.blockedAttacksCount || 0}`;
      cpuEl.textContent = node.isShieldActive ? 'Shield ACTIVE' : 'Inspection ON';
    } else if (node.type === 'CDN_EDGE') {
      rpsEl.textContent = `Hit Rate: ${Math.round((node.cacheHitRate || 0.85) * 100)}%`;
      cpuEl.textContent = 'Edge Cache';
    } else if (node.type === 'MESSAGE_BROKER') {
      rpsEl.textContent = `Queue: ${node.currentQueueDepth || 0} pkts`;
      cpuEl.textContent = `Cap: ${node.bufferCapacity || 50000}`;
    } else if (node.type === 'UPS_BATTERY') {
      rpsEl.textContent = `Charge: ${Math.round(node.currentChargeKwh || 50)} kWh`;
      cpuEl.textContent = `Max: ${node.capacityKwh || 50} kWh`;
    } else if (node.type === 'DIESEL_GENERATOR') {
      rpsEl.textContent = `Fuel: ${Math.round(node.fuelLiters || 500)} L`;
      cpuEl.textContent = node.isRunning ? 'RUNNING' : 'STANDBY';
    } else {
      rpsEl.textContent = `${node.currentRps || 0} / ${node.capacityRps || 500} RPS`;
      cpuEl.textContent = `${Math.round((node.cpuUtilization || 0.1) * 100)}%`;
    }

    latEl.textContent = `${node.baseLatencyMs || 5}ms`;
    opexEl.textContent = `$${((node.costOpexPerSec || 0) / 1_000_000).toFixed(3)}/s`;
  }

  hide() {
    this.activeNode = null;
    this.rootElement.classList.add('hidden');
    this.onClose();
  }

  destroy() {
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
  }
}
