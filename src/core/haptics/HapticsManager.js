/**
 * HapticsManager.js - Cross-platform tactile haptic vibration engine
 * Wraps @capacitor/haptics with standard HTML5 navigator.vibrate fallback.
 * Pure JS, safe for browser, native mobile, and Node.js testing.
 */

import { globalAudioSettings } from '../audio/AudioSettings.js';
import { globalEventBus, EngineEventTypes } from '../events/EventBus.js';

export class HapticsManager {
  /**
   * @param {Object} [options]
   * @param {import('../audio/AudioSettings.js').AudioSettings} [options.settings]
   * @param {import('../events/EventBus.js').EventBus} [options.eventBus]
   * @param {Object} [options.hapticsProvider] Custom provider for testing
   */
  constructor(options = {}) {
    this.settings = options.settings || globalAudioSettings;
    this.eventBus = options.eventBus || globalEventBus;
    this.hapticsProvider = options.hapticsProvider || null;

    this.bindEvents();
  }

  /**
   * Trigger a contextual haptic vibration pulse
   * @param {'LIGHT' | 'MEDIUM' | 'HEAVY' | 'WARNING' | 'SUCCESS'} style
   */
  trigger(style) {
    if (!this.settings.getSettings().isHapticsEnabled) {
      return;
    }

    // 1. Custom or injected haptics provider (Capacitor or Test Mock)
    if (this.hapticsProvider) {
      if (style === 'WARNING' || style === 'SUCCESS') {
        if (typeof this.hapticsProvider.notification === 'function') {
          this.hapticsProvider.notification({ type: style });
          return;
        }
      } else {
        if (typeof this.hapticsProvider.impact === 'function') {
          this.hapticsProvider.impact({ style });
          return;
        }
      }
    }

    // 2. Capacitor native global plugin if running inside Capacitor Android/iOS WebView
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.Haptics) {
      const capHaptics = window.Capacitor.Plugins.Haptics;
      try {
        if (style === 'WARNING') {
          capHaptics.notification({ type: 'WARNING' });
          return;
        } else if (style === 'SUCCESS') {
          capHaptics.notification({ type: 'SUCCESS' });
          return;
        } else {
          capHaptics.impact({ style: style });
          return;
        }
      } catch (e) {
        console.warn('[HapticsManager] Capacitor haptics failed, trying navigator:', e);
      }
    }

    // 3. HTML5 navigator.vibrate fallback for mobile browsers
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        switch (style) {
          case 'LIGHT':
            navigator.vibrate(15);
            break;
          case 'MEDIUM':
            navigator.vibrate(30);
            break;
          case 'HEAVY':
            navigator.vibrate(50);
            break;
          case 'WARNING':
            navigator.vibrate([80, 40, 80]);
            break;
          case 'SUCCESS':
            navigator.vibrate([25, 35, 45]);
            break;
          default:
            navigator.vibrate(15);
            break;
        }
      } catch (e) {}
    }
  }

  bindEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('TRIGGER_HAPTIC_REQUEST', (evt) => {
      if (evt.payload?.style) {
        this.trigger(evt.payload.style);
      }
    });

    this.eventBus.on(EngineEventTypes.NODE_PLACED, () => {
      this.trigger('LIGHT');
    });

    this.eventBus.on(EngineEventTypes.NODES_CONNECTED, () => {
      this.trigger('MEDIUM');
    });

    this.eventBus.on(EngineEventTypes.NODE_REMOVED, () => {
      this.trigger('HEAVY');
    });

    this.eventBus.on(EngineEventTypes.INCIDENT_TRIGGERED, () => {
      this.trigger('WARNING');
    });

    this.eventBus.on('LEVEL_VICTORY', () => {
      this.trigger('SUCCESS');
    });
  }
}

export const globalHapticsManager = new HapticsManager();
