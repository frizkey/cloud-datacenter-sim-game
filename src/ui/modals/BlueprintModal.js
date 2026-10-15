/**
 * BlueprintModal.js - Base64 Blueprint Sharing & Multi-Slot Save Manager UI
 * Allows exporting/importing Factorio-style architecture blueprints and managing 4 save slots.
 * Adheres to >= 48x48 dp touch targets and glassmorphic styling.
 */

import { BlueprintCodec } from '../../storage/BlueprintCodec.js';
import { globalEventBus } from '../../core/events/EventBus.js';
import { globalAudioManager } from '../../core/audio/AudioManager.js';

export class BlueprintModal {
  /**
   * @param {Object} options
   * @param {import('../../core/sim/SimulationEngine.js').SimulationEngine} options.engine
   * @param {import('../../storage/StatePersistence.js').StatePersistence} options.persistence
   * @param {Function} [options.onClose]
   * @param {Function} [options.onLoadState]
   */
  constructor(options = {}) {
    this.engine = options.engine;
    this.persistence = options.persistence;
    this.onClose = options.onClose || (() => {});
    this.onLoadState = options.onLoadState || (() => {});
    this.currentTab = 'blueprint'; // 'blueprint' | 'slots'
    this.rootElement = null;

    if (typeof document !== 'undefined') {
      this.initDOM();
    }
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-blueprint';
    this.rootElement.innerHTML = `
      <div class="modal-dialog" style="max-width: 680px; width: 92%;">
        <div class="modal-header">
          <div class="modal-title">
            <span>📐</span>
            <span>Blueprints & Save Slots</span>
          </div>
          <button class="modal-close-btn" id="btn-close-blueprint" aria-label="Close">✕</button>
        </div>

        <div class="modal-body" style="padding-top: 12px;">
          <!-- Tab Switcher -->
          <div class="view-switcher-pill" style="display: flex; gap: 4px; margin-bottom: 16px; width: 100%;" role="tablist">
            <button class="pill-btn active bp-tab-btn" data-tab="blueprint" style="flex: 1; min-height: 44px;">
              Blueprint Strings
            </button>
            <button class="pill-btn bp-tab-btn" data-tab="slots" style="flex: 1; min-height: 44px;">
              Multi-Slot Saves
            </button>
          </div>

          <!-- Tab 1: Blueprint Strings -->
          <div id="tab-blueprint-content" class="tab-pane active" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Export Section -->
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h5 style="margin: 0; font-size: 14px; color: #38bdf8;">Export Current Architecture</h5>
                <button id="btn-generate-bp" class="action-btn secondary" style="min-height: 36px; padding: 6px 12px; font-size: 12px;">
                  Generate String
                </button>
              </div>
              <textarea id="txt-export-bp" readonly style="width: 100%; height: 70px; background: #0b0f19; border: 1px solid #334155; border-radius: 6px; color: #94a3b8; font-family: monospace; font-size: 11px; padding: 8px; resize: none; box-sizing: border-box;" placeholder="Click Generate String to serialize current topology..."></textarea>
              <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                <button id="btn-copy-bp" class="action-btn secondary" style="min-height: 38px; padding: 6px 14px; font-size: 12px;">
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>

            <!-- Import Section -->
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px;">
              <h5 style="margin: 0 0 8px 0; font-size: 14px; color: #10b981;">Import Blueprint String</h5>
              <textarea id="txt-import-bp" style="width: 100%; height: 70px; background: #0b0f19; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; font-family: monospace; font-size: 11px; padding: 8px; resize: none; box-sizing: border-box;" placeholder="Paste Base64 blueprint string (CSBP1:...) here..."></textarea>
              <div id="import-preview-box" style="margin-top: 8px; font-size: 12px; color: #94a3b8; min-height: 20px;"></div>
              <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
                <button id="btn-validate-bp" class="action-btn secondary" style="min-height: 38px; padding: 6px 12px; font-size: 12px;">
                  Inspect String
                </button>
                <button id="btn-import-bp" class="action-btn" style="min-height: 38px; padding: 6px 16px; font-size: 12px; background: #10b981; color: white;">
                  📥 Build Blueprint
                </button>
              </div>
            </div>
          </div>

          <!-- Tab 2: Save Slots -->
          <div id="tab-slots-content" class="tab-pane" style="display: none; flex-direction: column; gap: 10px;">
            <div id="slots-list-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);
    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = this.rootElement.querySelector('#btn-close-blueprint');
    closeBtn.addEventListener('click', () => this.hide());

    this.rootElement.addEventListener('click', (e) => {
      if (e.target === this.rootElement) this.hide();
    });

    // Tab switcher
    const tabBtns = this.rootElement.querySelectorAll('.bp-tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = btn.dataset.tab;
        this.renderTabContent();
      });
    });

    // Generate blueprint export
    const genBtn = this.rootElement.querySelector('#btn-generate-bp');
    const exportTxt = this.rootElement.querySelector('#txt-export-bp');
    genBtn.addEventListener('click', () => {
      if (!this.engine) return;
      try {
        const nodes = Array.from(this.engine.nodes.values());
        const connections = Array.from(this.engine.connections.values());
        const facilityComponents = Array.from(this.engine.facilityComponents?.values() || []);
        const encoded = BlueprintCodec.encode({
          title: `Architecture Export (${nodes.length} Nodes)`,
          description: 'Exported from Cloud Datacenter Sim',
          nodes,
          connections,
          facilityComponents,
        });
        exportTxt.value = encoded;
        globalAudioManager.playNodeClick();
      } catch (err) {
        exportTxt.value = `Export Error: ${err.message}`;
      }
    });

    // Copy to clipboard
    const copyBtn = this.rootElement.querySelector('#btn-copy-bp');
    copyBtn.addEventListener('click', async () => {
      if (!exportTxt.value) return;
      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(exportTxt.value);
        } else {
          exportTxt.select();
          document.execCommand('copy');
        }
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyBtn.textContent = '📋 Copy to Clipboard'; }, 2000);
      } catch (e) {
        copyBtn.textContent = '⚠️ Copy Failed';
      }
    });

    // Inspect / validate import
    const importTxt = this.rootElement.querySelector('#txt-import-bp');
    const previewBox = this.rootElement.querySelector('#import-preview-box');
    const validateBtn = this.rootElement.querySelector('#btn-validate-bp');
    validateBtn.addEventListener('click', () => {
      try {
        const decoded = BlueprintCodec.decode(importTxt.value.trim());
        previewBox.innerHTML = `
          <span style="color: #10b981; font-weight: 600;">✓ Valid Blueprint:</span> 
          "${decoded.title}" — <strong>${decoded.nodes.length}</strong> Nodes, <strong>${decoded.connections.length}</strong> Cables
        `;
      } catch (err) {
        previewBox.innerHTML = `<span style="color: #ef4444;">✗ Error: ${err.message}</span>`;
      }
    });

    // Build / import blueprint
    const importBtn = this.rootElement.querySelector('#btn-import-bp');
    importBtn.addEventListener('click', () => {
      try {
        const decoded = BlueprintCodec.decode(importTxt.value.trim());
        if (!this.engine) return;

        // Clear existing nodes and connections
        for (const connId of Array.from(this.engine.connections.keys())) {
          this.engine.disconnectNodes(connId);
        }
        for (const nodeId of Array.from(this.engine.nodes.keys())) {
          this.engine.removeNode(nodeId);
        }

        // Add nodes
        for (const n of decoded.nodes) {
          this.engine.addNode({
            id: n.id,
            type: n.type,
            name: n.name,
            gridX: n.gridX,
            gridY: n.gridY,
          });
        }

        // Add connections
        for (const c of decoded.connections) {
          this.engine.connectNodes(c.sourceNodeId, c.targetNodeId);
        }

        globalAudioManager.playNodeClick();
        previewBox.innerHTML = `<span style="color: #10b981; font-weight: 700;">🎉 Blueprint Built Successfully!</span>`;
        setTimeout(() => this.hide(), 1000);
      } catch (err) {
        previewBox.innerHTML = `<span style="color: #ef4444;">✗ Import Failed: ${err.message}</span>`;
      }
    });
  }

  async renderTabContent() {
    const bpPane = this.rootElement.querySelector('#tab-blueprint-content');
    const slotsPane = this.rootElement.querySelector('#tab-slots-content');

    if (this.currentTab === 'blueprint') {
      bpPane.style.display = 'flex';
      slotsPane.style.display = 'none';
    } else {
      bpPane.style.display = 'none';
      slotsPane.style.display = 'flex';
      await this.renderSlotsList();
    }
  }

  async renderSlotsList() {
    const container = this.rootElement.querySelector('#slots-list-container');
    if (!container || !this.persistence) return;

    const slots = await this.persistence.listSlots();
    container.innerHTML = slots
      .map((slot) => {
        const timeStr = slot.savedAtTimestamp
          ? new Date(slot.savedAtTimestamp).toLocaleTimeString()
          : 'Empty Slot';
        const statsStr = slot.exists
          ? `${slot.nodeCount} nodes • $${(slot.cashMicroCents / 100000000).toFixed(2)}`
          : 'No save data';

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: rgba(15, 23, 42, 0.7); border: 1px solid #334155; border-radius: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: ${slot.exists ? '#38bdf8' : '#94a3b8'};">
                ${slot.name}
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                ${timeStr} — ${statsStr}
              </div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="action-btn secondary btn-save-slot" data-slot="${slot.id}" style="min-height: 36px; padding: 4px 10px; font-size: 11px;">
                💾 Save
              </button>
              ${
                slot.exists
                  ? `<button class="action-btn btn-load-slot" data-slot="${slot.id}" style="min-height: 36px; padding: 4px 10px; font-size: 11px; background: #0284c7; color: white;">
                      📂 Load
                    </button>
                    <button class="action-btn danger btn-clear-slot" data-slot="${slot.id}" style="min-height: 36px; padding: 4px 8px; font-size: 11px;">
                      ✕
                    </button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    // Wire slot actions
    container.querySelectorAll('.btn-save-slot').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.engine || !this.persistence) return;
        const slotId = btn.dataset.slot;
        try {
          const payload = this.engine.serializeState();
          await this.persistence.save(payload, slotId);
          globalAudioManager.playNodeClick();
          await this.renderSlotsList();
        } catch (e) {
          console.warn('[BlueprintModal] Save failed:', e);
        }
      });
    });

    container.querySelectorAll('.btn-load-slot').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.persistence) return;
        const slotId = btn.dataset.slot;
        try {
          const savedData = await this.persistence.load(slotId);
          if (savedData) {
            this.onLoadState(savedData);
            globalAudioManager.playNodeClick();
            this.hide();
          }
        } catch (e) {
          console.warn('[BlueprintModal] Load failed:', e);
        }
      });
    });

    container.querySelectorAll('.btn-clear-slot').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!this.persistence) return;
        const slotId = btn.dataset.slot;
        await this.persistence.clearSlot(slotId);
        globalAudioManager.playCableCut();
        await this.renderSlotsList();
      });
    });
  }

  show() {
    if (!this.rootElement) this.initDOM();
    this.rootElement.classList.add('active');
    this.renderTabContent();
  }

  hide() {
    if (this.rootElement) {
      this.rootElement.classList.remove('active');
    }
    this.onClose();
  }
}
