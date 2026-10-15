/**
 * NodeInspector.js - Contextual component & link inspector sheet
 * Displays real-time node metrics, restart action, sell controls,
 * and inspectable/disconnectable network cable links.
 */

import { globalEventBus, EngineEventTypes } from '../core/events/EventBus.js';
import { getGlyphSvg } from '../render/ComponentGlyphs.js';

export class NodeInspector {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container]
   * @param {Function} [options.onSellNode] (nodeId) => void
   * @param {Function} [options.onRestartNode] (nodeId) => void
   * @param {Function} [options.onDisconnectLink] (connId) => void
   * @param {Function} [options.onOpen] (item) => void
   * @param {Function} [options.onClose] () => void
   */
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSellNode = options.onSellNode || (() => {});
    this.onRestartNode = options.onRestartNode || (() => {});
    this.onDisconnectLink = options.onDisconnectLink || (() => {});
    this.onOpen = options.onOpen || (() => {});
    this.onClose = options.onClose || (() => {});

    this.activeNode = null;
    this.activeConnection = null;
    this.rootElement = null;
    this.latestSnapshot = null;

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

        <div id="inspect-stats-group" class="inspector-stats">
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

        <div id="inspect-connections-section" class="inspector-section">
          <h5 class="inspector-section-title">🔗 Connected Cables</h5>
          <div id="inspect-connections-list" class="connections-list"></div>
        </div>

        <div id="inspect-node-actions" class="inspector-actions">
          <button id="inspect-restart-btn" class="action-btn secondary">🔄 Restart Pod</button>
          <button id="inspect-sell-btn" class="action-btn danger">💰 Sell (50% Refund)</button>
        </div>

        <div id="inspect-conn-actions" class="inspector-actions hidden">
          <button id="inspect-disconnect-btn" class="action-btn danger">✂ Disconnect Cable</button>
        </div>
      </div>
    `;

    this.container.appendChild(this.rootElement);

    const closeBtn = this.rootElement.querySelector('#inspect-close-btn');
    const restartBtn = this.rootElement.querySelector('#inspect-restart-btn');
    const sellBtn = this.rootElement.querySelector('#inspect-sell-btn');
    const disconnectBtn = this.rootElement.querySelector('#inspect-disconnect-btn');
    const connectionsList = this.rootElement.querySelector('#inspect-connections-list');

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

    disconnectBtn.addEventListener('click', () => {
      if (this.activeConnection) {
        globalEventBus.emit('DISCONNECT_CONNECTION', { connectionId: this.activeConnection.id });
        this.hide();
      }
    });

    connectionsList.addEventListener('click', (e) => {
      const target = e.target;
      if (target.classList.contains('conn-disconnect-btn')) {
        const connId = target.dataset.connId;
        if (connId) {
          globalEventBus.emit('DISCONNECT_CONNECTION', { connectionId: connId });
          target.closest('.connection-item')?.remove();
          if (connectionsList.children.length === 0) {
            connectionsList.innerHTML = '<span class="no-conn-text">No active cables connected</span>';
          }
        }
      } else if (target.classList.contains('conn-node-name')) {
        const nodeId = target.dataset.nodeId;
        const targetNode = this.latestSnapshot?.nodes?.find((n) => n.id === nodeId);
        if (targetNode) {
          globalEventBus.emit('NODE_SELECTED', { node: targetNode });
        }
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && (this.activeNode || this.activeConnection)) {
          this.hide();
        }
      });
    }
  }

  bindEvents() {
    globalEventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      this.latestSnapshot = evt.payload?.snapshot;
      if (this.activeNode && !this.rootElement.classList.contains('hidden')) {
        const updatedNode = this.latestSnapshot?.nodes?.find((n) => n.id === this.activeNode.id);
        if (updatedNode) {
          this.showNode(updatedNode);
        } else if (!this.activeConnection) {
          this.hide();
        }
      }
    });

    globalEventBus.on('NODE_SELECTED', (evt) => {
      this.showNode(evt.payload.node);
    });

    globalEventBus.on('CONNECTION_SELECTED', (evt) => {
      this.showConnection(evt.payload.connection);
    });

    globalEventBus.on('NODE_DESELECTED', () => {
      this.hide();
    });
  }

  getNodeIcon(type) {
    return getGlyphSvg(type, { size: 28 });
  }

  showNode(node) {
    if (!node) return;
    this.activeNode = node;
    this.activeConnection = null;
    this.rootElement.classList.remove('hidden');
    this.onOpen(node);

    const iconEl = this.rootElement.querySelector('#inspect-icon');
    const titleEl = this.rootElement.querySelector('#inspect-title');
    const typeEl = this.rootElement.querySelector('#inspect-type');
    const rpsEl = this.rootElement.querySelector('#inspect-rps');
    const cpuEl = this.rootElement.querySelector('#inspect-cpu');
    const latEl = this.rootElement.querySelector('#inspect-lat');
    const opexEl = this.rootElement.querySelector('#inspect-opex');
    const connSection = this.rootElement.querySelector('#inspect-connections-section');
    const connList = this.rootElement.querySelector('#inspect-connections-list');
    const nodeActions = this.rootElement.querySelector('#inspect-node-actions');
    const connActions = this.rootElement.querySelector('#inspect-conn-actions');

    connSection.classList.remove('hidden');
    nodeActions.classList.remove('hidden');
    connActions.classList.add('hidden');

    iconEl.innerHTML = this.getNodeIcon(node.type);
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

    // Render connected links
    const connections = this.latestSnapshot?.connections || [];
    const allNodes = this.latestSnapshot?.nodes || [];
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

    const connectedLinks = [];
    for (const c of connections) {
      if (c.targetNodeId === node.id) {
        const src = nodeMap.get(c.sourceNodeId);
        connectedLinks.push({
          id: c.id,
          direction: 'IN',
          node: src || { id: c.sourceNodeId, name: 'Upstream Node', type: 'NODE' },
        });
      } else if (c.sourceNodeId === node.id) {
        const tgt = nodeMap.get(c.targetNodeId);
        connectedLinks.push({
          id: c.id,
          direction: 'OUT',
          node: tgt || { id: c.targetNodeId, name: 'Downstream Node', type: 'NODE' },
        });
      }
    }

    if (connectedLinks.length === 0) {
      connList.innerHTML = '<span class="no-conn-text">No active cables connected</span>';
    } else {
      connList.innerHTML = connectedLinks.map((link) => `
        <div class="connection-item">
          <span class="conn-direction ${link.direction === 'IN' ? 'conn-in' : 'conn-out'}">${link.direction}</span>
          <span class="conn-node-name" data-node-id="${link.node.id}" title="Click to inspect">${this.getNodeIcon(link.node.type)} ${link.node.name || link.node.type}</span>
          <button class="conn-disconnect-btn" data-conn-id="${link.id}" title="Cut Cable">✂ Cut</button>
        </div>
      `).join('');
    }
  }

  showConnection(connection) {
    if (!connection) return;
    this.activeConnection = connection;
    this.activeNode = null;
    this.rootElement.classList.remove('hidden');
    this.onOpen(connection);

    const iconEl = this.rootElement.querySelector('#inspect-icon');
    const titleEl = this.rootElement.querySelector('#inspect-title');
    const typeEl = this.rootElement.querySelector('#inspect-type');
    const rpsEl = this.rootElement.querySelector('#inspect-rps');
    const cpuEl = this.rootElement.querySelector('#inspect-cpu');
    const latEl = this.rootElement.querySelector('#inspect-lat');
    const opexEl = this.rootElement.querySelector('#inspect-opex');
    const connSection = this.rootElement.querySelector('#inspect-connections-section');
    const connList = this.rootElement.querySelector('#inspect-connections-list');
    const nodeActions = this.rootElement.querySelector('#inspect-node-actions');
    const connActions = this.rootElement.querySelector('#inspect-conn-actions');

    connSection.classList.remove('hidden');
    nodeActions.classList.add('hidden');
    connActions.classList.remove('hidden');

    iconEl.textContent = '🔌';
    titleEl.textContent = 'Network Cable';
    typeEl.textContent = '10Gbps Ethernet Link';

    const allNodes = this.latestSnapshot?.nodes || [];
    const src = allNodes.find((n) => n.id === connection.sourceNodeId) || connection.sourceNode;
    const tgt = allNodes.find((n) => n.id === connection.targetNodeId) || connection.targetNode;

    rpsEl.textContent = 'Active';
    cpuEl.textContent = '10 Gbps';
    latEl.textContent = '< 1ms';
    opexEl.textContent = '$0.00/s';

    connList.innerHTML = `
      <div class="connection-item">
        <span class="conn-direction conn-in">FROM</span>
        <span class="conn-node-name" data-node-id="${src?.id || connection.sourceNodeId}" title="Click to inspect">${src ? `${this.getNodeIcon(src.type)} ${src.name || src.type}` : 'Source Node'}</span>
      </div>
      <div class="connection-item">
        <span class="conn-direction conn-out">TO</span>
        <span class="conn-node-name" data-node-id="${tgt?.id || connection.targetNodeId}" title="Click to inspect">${tgt ? `${this.getNodeIcon(tgt.type)} ${tgt.name || tgt.type}` : 'Target Node'}</span>
      </div>
    `;
  }

  hide() {
    this.activeNode = null;
    this.activeConnection = null;
    this.rootElement.classList.add('hidden');
    this.onClose();
  }

  destroy() {
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
  }
}
