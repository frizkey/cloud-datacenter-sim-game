/**
 * MobileLifecycle.js - Capacitor native mobile lifecycle hooks & hardware back button handling
 * Handles app backgrounding (auto-save and pause) and resume without simulation stutter.
 * Pure JS, safe for browser and native mobile.
 */

import { globalEventBus } from '../events/EventBus.js';

export class MobileLifecycle {
  /**
   * @param {Object} [options]
   * @param {import('../sim/GameModeManager.js').GameModeManager} [options.gameModeManager]
   * @param {Object} [options.storage] State persistence storage
   * @param {import('../events/EventBus.js').EventBus} [options.eventBus]
   */
  constructor(options = {}) {
    this.gameModeManager = options.gameModeManager || null;
    this.storage = options.storage || null;
    this.eventBus = options.eventBus || globalEventBus;

    this.isBackgrounded = false;
    this.activeModalsStack = []; // List of open modal objects { id, hide }

    this.initCapacitorHooks();
    this.initBrowserVisibilityHooks();
  }

  /**
   * Register an active modal on the dismissal stack
   * @param {string} id
   * @param {{ hide: Function }} modalInstance
   */
  registerActiveModal(id, modalInstance) {
    this.unregisterActiveModal(id);
    this.activeModalsStack.push({ id, modal: modalInstance });
  }

  /**
   * Remove a modal from the active stack
   * @param {string} id
   */
  unregisterActiveModal(id) {
    this.activeModalsStack = this.activeModalsStack.filter((item) => item.id !== id);
  }

  /**
   * Handle back button navigation
   * @returns {boolean} Whether an active modal was dismissed
   */
  handleBackButton() {
    if (this.activeModalsStack.length > 0) {
      const top = this.activeModalsStack.pop();
      if (top && top.modal && typeof top.modal.hide === 'function') {
        top.modal.hide();
        return true;
      }
    }
    return false;
  }

  /**
   * Handle OS app state changes (background / foreground)
   * @param {{ isActive: boolean }} state
   */
  handleAppStateChange(state) {
    this.isBackgrounded = !state.isActive;

    if (!state.isActive) {
      // App entered background: pause simulation clock and auto-save
      if (this.gameModeManager && this.gameModeManager.sessionState === 'ACTIVE') {
        this.gameModeManager.pauseSession();
      }

      if (this.storage && typeof this.storage.saveState === 'function') {
        try {
          this.storage.saveState();
        } catch (e) {
          console.warn('[MobileLifecycle] Auto-save on background failed:', e);
        }
      }

      if (this.eventBus) {
        this.eventBus.emit('APP_STATE_CHANGED', { isActive: false });
      }
    } else {
      // App entered foreground: resume simulation
      if (this.gameModeManager && this.gameModeManager.sessionState === 'PAUSED') {
        this.gameModeManager.resumeSession();
      }

      if (this.eventBus) {
        this.eventBus.emit('APP_STATE_CHANGED', { isActive: true });
      }
    }
  }

  initCapacitorHooks() {
    if (typeof window === 'undefined') return;

    if (window.Capacitor?.Plugins?.App) {
      const capApp = window.Capacitor.Plugins.App;

      capApp.addListener('appStateChange', (state) => {
        this.handleAppStateChange(state);
      });

      capApp.addListener('backButton', () => {
        const handled = this.handleBackButton();
        if (!handled && capApp.exitApp) {
          capApp.exitApp();
        }
      });
    }
  }

  initBrowserVisibilityHooks() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      const isVisible = document.visibilityState === 'visible';
      this.handleAppStateChange({ isActive: isVisible });
    });
  }
}

export const globalMobileLifecycle = new MobileLifecycle();
