/**
 * BuildDrawer.js - Collapsible bottom procurement tray
 * Mobile-first drawer with category tabs, component cards (>= 48x48 dp), and drag-to-place initiation.
 */

import { COMPONENT_CATALOG, NodeType, FacilityComponentType } from '../core/sim/Constants.js';
import { globalEventBus } from '../core/events/EventBus.js';
import { getGlyphSvg } from '../render/ComponentGlyphs.js';

export class BuildDrawer {
  /**
   * @param {Object} options
   * @param {HTMLElement} [options.container]
   * @param {Function} [options.onSelectComponent] (type) => void
   */
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.onSelectComponent = options.onSelectComponent || (() => {});
    this.techTree = options.techTree || null;
    this.isCollapsed = false;
    this.currentCategory = 'Perimeter';

    this.categories = ['Perimeter', 'Compute', 'Data & Queue', 'Facility'];
    this.rootElement = null;

    this.unsubscribeTechUnlocked = globalEventBus.on('TECH_UNLOCKED', () => {
      this.renderCategoryItems(this.currentCategory);
    });

    this.unsubscribeIncidentTriggered = globalEventBus.on('INCIDENT_TRIGGERED', () => {
      if (!this.isCollapsed) {
        this.toggleCollapse();
      }
    });

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'build-drawer';
    this.rootElement.innerHTML = `
      <!-- Collapsible Drawer Handle -->
      <div class="drawer-header">
        <button id="drawer-toggle-btn" class="drawer-handle" aria-label="Toggle Build Drawer">
          <span class="handle-bar"></span>
        </button>

        <!-- Category Tabs -->
        <div class="category-tabs" role="tablist">
          ${this.categories
            .map(
              (cat) => `
            <button class="cat-tab ${cat === this.currentCategory ? 'active' : ''}" data-category="${cat}" role="tab">
              ${cat}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <!-- Scrollable Component Palette -->
      <div class="palette-scroll" id="drawer-palette">
        <!-- Rendered dynamically -->
      </div>
    `;

    this.container.appendChild(this.rootElement);

    // Prevent touches/clicks in drawer from propagating to canvas
    this.rootElement.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });

    // Subscribe to placement exited to clear selection highlight
    this.unsubscribeExitPlacement = globalEventBus.on('PLACEMENT_MODE_EXITED', () => {
      this.clearSelection();
    });

    // Event listeners
    const toggleBtn = this.rootElement.querySelector('#drawer-toggle-btn');
    toggleBtn.addEventListener('click', () => this.toggleCollapse());

    const tabs = this.rootElement.querySelectorAll('.cat-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const cat = e.currentTarget.getAttribute('data-category');
        this.selectCategory(cat);
      });
    });

    this.renderCategoryItems(this.currentCategory);
  }

  selectCard(card) {
    const cards = this.rootElement.querySelectorAll('.component-card');
    cards.forEach((c) => c.classList.remove('selected'));
    if (card) {
      card.classList.add('selected');
    }
  }

  clearSelection() {
    if (!this.rootElement) return;
    const cards = this.rootElement.querySelectorAll('.component-card');
    cards.forEach((c) => c.classList.remove('selected'));
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.rootElement.classList.toggle('collapsed', this.isCollapsed);
  }

  selectCategory(category) {
    this.currentCategory = category;

    const tabs = this.rootElement.querySelectorAll('.cat-tab');
    tabs.forEach((tab) => {
      if (tab.getAttribute('data-category') === category) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.renderCategoryItems(category);
  }

  renderCategoryItems(category) {
    const palette = this.rootElement.querySelector('#drawer-palette');
    palette.innerHTML = '';

    const items = Object.values(COMPONENT_CATALOG).filter((item) => {
      if (category === 'Perimeter') {
        return (
          item.category === 'Ingress' ||
          item.category === 'Routing' ||
          item.category === 'Security' ||
          item.category === 'Edge'
        );
      }
      if (category === 'Compute') {
        return item.category === 'Compute';
      }
      if (category === 'Data & Queue') {
        return item.category === 'Storage' || item.category === 'Queue';
      }
      if (category === 'Facility') {
        return item.category === 'Facility';
      }
      return false;
    });

    for (const item of items) {
      const isUnlocked = !this.techTree || this.techTree.isComponentUnlocked(item.type);
      const buyDollars = (item.costBuy / 1_000_000).toFixed(2);
      const opexDollars = (item.costOpexPerSec / 1_000_000).toFixed(3);

      const card = document.createElement('div');
      card.className = `component-card ${isUnlocked ? '' : 'locked'}`;
      card.setAttribute('data-type', item.type);
      card.setAttribute('draggable', isUnlocked ? 'true' : 'false');
      if (!isUnlocked) {
        card.style.opacity = '0.45';
        card.style.filter = 'grayscale(0.7)';
        card.title = 'Locked: Research in SRE Lab';
      }

      const lockBadge = isUnlocked ? '' : '<span style="font-size: 10px; color: #f43f5e; font-weight: 700; margin-left: 4px;">🔒 LOCKED</span>';

      card.innerHTML = `
        <div class="card-icon">${this.getItemIcon(item.type)}</div>
        <div class="card-info">
          <span class="card-title">${item.name} ${lockBadge}</span>
          <span class="card-price">$${buyDollars} <small class="text-muted">(+$${opexDollars}/s)</small></span>
        </div>
      `;

      // HTML5 Drag and Drop support
      card.addEventListener('dragstart', (e) => {
        if (!isUnlocked) {
          e.preventDefault();
          return;
        }
        if (e.dataTransfer) {
          e.dataTransfer.setData('application/json', JSON.stringify({ type: item.type }));
          e.dataTransfer.setData('text/plain', item.type);
          e.dataTransfer.effectAllowed = 'copy';
        }
        this.selectCard(card);
        this.onSelectComponent(item.type);
        globalEventBus.emit('COMPONENT_DRAG_INITIATED', { type: item.type });
      });

      // Pointer click / touch to select or drag
      card.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!isUnlocked) {
          globalEventBus.emit('SHOW_NOTIFICATION', {
            message: `⚠️ ${item.name} is locked! Unlock it in the SRE Research Lab.`,
          });
          return;
        }
        this.selectCard(card);
        this.onSelectComponent(item.type);
        globalEventBus.emit('COMPONENT_DRAG_INITIATED', { type: item.type });
      });

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUnlocked) return;
        this.selectCard(card);
        this.onSelectComponent(item.type);
        globalEventBus.emit('START_PLACEMENT_MODE', { type: item.type });
      });

      palette.appendChild(card);
    }
  }

  getItemIcon(type) {
    return getGlyphSvg(type, { size: 24 });
  }

  destroy() {
    if (this.unsubscribeExitPlacement) this.unsubscribeExitPlacement();
    if (this.unsubscribeTechUnlocked) this.unsubscribeTechUnlocked();
    if (this.unsubscribeIncidentTriggered) this.unsubscribeIncidentTriggered();
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
    }
  }
}
