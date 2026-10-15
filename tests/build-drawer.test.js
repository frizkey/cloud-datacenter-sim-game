import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { globalEventBus } from '../src/core/events/EventBus.js';

// Minimal mock DOM implementation for headless Node.js testing
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) {
    this.classes.add(cls);
  }
  remove(cls) {
    this.classes.delete(cls);
  }
  toggle(cls, force) {
    if (force !== undefined) {
      if (force) this.classes.add(cls);
      else this.classes.delete(cls);
      return force;
    }
    if (this.classes.has(cls)) {
      this.classes.delete(cls);
      return false;
    }
    this.classes.add(cls);
    return true;
  }
  contains(cls) {
    return this.classes.has(cls);
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.listeners = new Map();
    this._innerHTML = '';
    this.style = {};
  }

  get className() {
    return Array.from(this.classList.classes).join(' ');
  }

  set className(val) {
    this.classList.classes.clear();
    if (val) {
      val.split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
    }
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(fn);
  }

  removeEventListener(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.set(
        event,
        this.listeners.get(event).filter((h) => h !== fn)
      );
    }
  }

  dispatchEvent(evt) {
    const list = this.listeners.get(evt.type) || [];
    for (const fn of list) {
      fn(evt);
    }
  }

  click() {
    const event = {
      type: 'click',
      target: this,
      currentTarget: this,
      stopPropagation: () => {},
      preventDefault: () => {},
      closest: (sel) => {
        if (sel === '.category-tabs' && (this.className.includes('category-tabs') || this.parentNode?.className.includes('category-tabs'))) {
          return this;
        }
        if (sel === '#drawer-toggle-btn' && this.id === 'drawer-toggle-btn') {
          return this;
        }
        return null;
      },
    };
    this.dispatchEvent(event);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    // Lightweight parser for drawer-header, drawer-toggle-btn, category-tabs, and drawer-palette
    if (html.includes('drawer-header')) {
      const header = new MockElement('div');
      header.className = 'drawer-header';
      header.id = 'drawer-header';

      const toggleBtn = new MockElement('button');
      toggleBtn.id = 'drawer-toggle-btn';
      toggleBtn.className = 'drawer-handle';

      const chevron = new MockElement('span');
      chevron.id = 'drawer-chevron';
      chevron.className = 'handle-chevron';
      chevron.textContent = '▼';
      toggleBtn.appendChild(chevron);

      const label = new MockElement('span');
      label.id = 'drawer-handle-label';
      label.className = 'handle-text';
      label.textContent = 'BUILD';
      toggleBtn.appendChild(label);

      header.appendChild(toggleBtn);

      const tabsContainer = new MockElement('div');
      tabsContainer.className = 'category-tabs';

      ['Perimeter', 'Compute', 'Data & Queue', 'Facility'].forEach((cat) => {
        const tab = new MockElement('button');
        tab.className = `cat-tab ${cat === 'Perimeter' ? 'active' : ''}`;
        tab.setAttribute('data-category', cat);
        tab.textContent = cat;
        tabsContainer.appendChild(tab);
      });

      header.appendChild(tabsContainer);
      this.appendChild(header);

      const palette = new MockElement('div');
      palette.className = 'palette-scroll';
      palette.id = 'drawer-palette';
      this.appendChild(palette);
    }
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const search = (el) => {
      for (const child of el.children) {
        if (selector.startsWith('#') && child.id === selector.slice(1)) {
          results.push(child);
        } else if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) {
          results.push(child);
        } else if (selector === child.tagName?.toLowerCase()) {
          results.push(child);
        }
        search(child);
      }
    };
    search(this);
    return results;
  }
}

describe('BuildDrawer UI & Collapse/Expand Behavior', () => {
  let originalDocument;
  let mockContainer;
  let BuildDrawer;

  beforeEach(async () => {
    originalDocument = globalThis.document;

    mockContainer = new MockElement('div');
    mockContainer.id = 'mock-app';

    globalThis.document = {
      body: mockContainer,
      createElement: (tag) => new MockElement(tag),
    };

    const module = await import(`../src/ui/BuildDrawer.js?t=${Date.now()}`);
    BuildDrawer = module.BuildDrawer;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it('starts expanded by default with BUILD indicator and visible palette', () => {
    const drawer = new BuildDrawer({ container: mockContainer });
    assert.equal(drawer.isCollapsed, false);
    assert.equal(drawer.rootElement.classList.contains('collapsed'), false);

    const label = drawer.rootElement.querySelector('#drawer-handle-label');
    assert.equal(label.textContent, 'BUILD');
    const chevron = drawer.rootElement.querySelector('#drawer-chevron');
    assert.equal(chevron.textContent, '▼');
    drawer.destroy();
  });

  it('collapses and updates visual indicator on collapse()', () => {
    const drawer = new BuildDrawer({ container: mockContainer });
    drawer.collapse();

    assert.equal(drawer.isCollapsed, true);
    assert.equal(drawer.rootElement.classList.contains('collapsed'), true);

    const label = drawer.rootElement.querySelector('#drawer-handle-label');
    assert.equal(label.textContent, 'EXPAND');
    const chevron = drawer.rootElement.querySelector('#drawer-chevron');
    assert.equal(chevron.textContent, '▲');
    drawer.destroy();
  });

  it('automatically expands when any category tab is clicked while collapsed', () => {
    const drawer = new BuildDrawer({ container: mockContainer });
    drawer.collapse();
    assert.equal(drawer.isCollapsed, true);

    // User taps 'Facility' tab (just like the user bug report)
    drawer.selectCategory('Facility');

    assert.equal(drawer.isCollapsed, false, 'Drawer must expand when category is selected');
    assert.equal(drawer.rootElement.classList.contains('collapsed'), false);
    assert.equal(drawer.currentCategory, 'Facility');

    const label = drawer.rootElement.querySelector('#drawer-handle-label');
    assert.equal(label.textContent, 'BUILD');
    const chevron = drawer.rootElement.querySelector('#drawer-chevron');
    assert.equal(chevron.textContent, '▼');
    drawer.destroy();
  });

  it('toggles collapse state with toggleCollapse()', () => {
    const drawer = new BuildDrawer({ container: mockContainer });
    assert.equal(drawer.isCollapsed, false);

    drawer.toggleCollapse();
    assert.equal(drawer.isCollapsed, true);

    drawer.toggleCollapse();
    assert.equal(drawer.isCollapsed, false);
    drawer.destroy();
  });

  it('does NOT collapse automatically when INCIDENT_TRIGGERED is emitted', () => {
    const drawer = new BuildDrawer({ container: mockContainer });
    assert.equal(drawer.isCollapsed, false);

    // Emit incident event
    globalEventBus.emit('INCIDENT_TRIGGERED', {
      incident: { id: 'inc_test', type: 'FLUID_CHILLER_LEAK' },
    });

    // Drawer must remain expanded so player can build fixes
    assert.equal(drawer.isCollapsed, false);
    assert.equal(drawer.rootElement.classList.contains('collapsed'), false);
    drawer.destroy();
  });

  it('cleans up DOM on destroy()', () => {
    const drawer = new BuildDrawer({ container: mockContainer });
    assert.equal(mockContainer.children.length, 1);

    drawer.destroy();
    assert.equal(mockContainer.children.length, 0);
  });
});
