/**
 * RadialTouchMenu.js - Compact radial touch context menu for mobile node interactions
 * Appears on node selection with 5 quick-action buttons (Restart, Scale, Wiring, Inspect, Delete).
 * Clamps coordinates within viewport safe-area boundaries.
 * Pure JS safe for both Node.js tests and browser DOM.
 */

export class RadialTouchMenu {
  /**
   * @param {Object} [options]
   * @param {number} [options.viewportWidth]
   * @param {number} [options.viewportHeight]
   * @param {number} [options.safeMargin]
   * @param {Function} [options.onAction] (action: string, node: Object) => void
   */
  constructor(options = {}) {
    this.viewportWidth = options.viewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    this.viewportHeight = options.viewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    this.safeMargin = options.safeMargin || 48;
    this.radius = options.radius || 65;
    this.onAction = options.onAction || (() => {});

    this.isOpen = false;
    this.activeNode = null;
    this.rootElement = null;

    this.actions = [
      { id: 'restart', label: 'Restart', icon: '🔄', color: '#38bdf8' },
      { id: 'scale', label: 'Scale +25%', icon: '📈', color: '#10b981' },
      { id: 'wiring', label: 'Wire Cable', icon: '🔌', color: '#a855f7' },
      { id: 'inspect', label: 'Inspect', icon: '🔍', color: '#f59e0b' },
      { id: 'delete', label: 'Delete', icon: '🗑️', color: '#ef4444' },
    ];

    if (typeof document !== 'undefined') {
      this.initDOM();
    }
  }

  getAvailableActions() {
    return this.actions.map((a) => a.id);
  }

  calculateClampedPosition(x, y) {
    const minX = this.safeMargin;
    const maxX = this.viewportWidth - this.safeMargin;
    const minY = this.safeMargin;
    const maxY = this.viewportHeight - this.safeMargin;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  calculateActionItemPositions(centerX, centerY, radius = this.radius) {
    const total = this.actions.length;
    const positions = [];
    for (let i = 0; i < total; i++) {
      // Start from top (-PI / 2) and distribute clockwise
      const angle = (i * (2 * Math.PI / total)) - (Math.PI / 2);
      positions.push({
        action: this.actions[i],
        x: Math.round((centerX + radius * Math.cos(angle)) * 10) / 10,
        y: Math.round((centerY + radius * Math.sin(angle)) * 10) / 10,
      });
    }
    return positions;
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'radial-touch-menu';
    this.rootElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 900;
      display: none;
    `;
    document.body.appendChild(this.rootElement);

    // Close when tapping outside
    window.addEventListener('pointerdown', (e) => {
      if (this.isOpen && this.rootElement && !this.rootElement.contains(e.target)) {
        this.hide();
      }
    }, { capture: true });
  }

  show(node, screenX, screenY) {
    this.isOpen = true;
    this.activeNode = node;

    if (typeof window !== 'undefined') {
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;
    }

    const clamped = this.calculateClampedPosition(screenX, screenY);
    const itemPositions = this.calculateActionItemPositions(clamped.x, clamped.y, this.radius);

    if (this.rootElement) {
      this.rootElement.innerHTML = '';
      this.rootElement.style.display = 'block';

      // Background pulse hub
      const hub = document.createElement('div');
      hub.className = 'radial-hub';
      hub.style.cssText = `
        position: absolute;
        left: ${clamped.x - 20}px;
        top: ${clamped.y - 20}px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(15, 23, 42, 0.75);
        border: 2px solid rgba(56, 189, 248, 0.6);
        backdrop-filter: blur(8px);
        box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
        pointer-events: auto;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: #f8fafc;
      `;
      hub.innerHTML = '✕';
      hub.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide();
      });
      this.rootElement.appendChild(hub);

      // Radial action buttons
      for (const item of itemPositions) {
        const btn = document.createElement('button');
        btn.className = `radial-btn radial-btn-${item.action.id}`;
        btn.setAttribute('aria-label', item.action.label);
        btn.title = item.action.label;
        btn.style.cssText = `
          position: absolute;
          left: ${item.x - 22}px;
          top: ${item.y - 22}px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(15, 23, 42, 0.9);
          border: 2px solid ${item.action.color};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 8px ${item.action.color}40;
          color: #f8fafc;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          cursor: pointer;
          touch-action: manipulation;
          transition: transform 0.15s ease, background 0.15s ease;
        `;
        btn.innerHTML = item.action.icon;

        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerAction(item.action.id);
        });

        this.rootElement.appendChild(btn);
      }
    }
  }

  triggerAction(actionId) {
    if (this.activeNode) {
      const node = this.activeNode;
      this.onAction(actionId, node);
    }
    this.hide();
  }

  hide() {
    this.isOpen = false;
    this.activeNode = null;
    if (this.rootElement) {
      this.rootElement.style.display = 'none';
      this.rootElement.innerHTML = '';
    }
  }

  destroy() {
    this.hide();
    if (this.rootElement && this.rootElement.parentNode) {
      this.rootElement.parentNode.removeChild(this.rootElement);
      this.rootElement = null;
    }
  }
}
