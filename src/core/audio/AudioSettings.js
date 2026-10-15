/**
 * AudioSettings.js - Audio and Haptics preferences management with local persistence
 * Pure JS, safe for browser (localStorage) and Node.js testing (in-memory fallback).
 */

const SETTINGS_KEY = 'cloud_sim_settings_v1';

export class AudioSettings {
  /**
   * @param {Object} [options]
   * @param {Storage} [options.storage] Custom storage instance
   * @param {import('../events/EventBus.js').EventBus} [options.eventBus]
   */
  constructor(options = {}) {
    this._memoryStore = new Map();
    this.eventBus = options.eventBus || null;

    if (options.storage) {
      this._storage = options.storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this._storage = window.localStorage;
    } else if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      this._storage = globalThis.localStorage;
    } else {
      this._storage = null;
    }

    this._settings = this.loadSettings();
  }

  /**
   * Default initial audio settings
   * @returns {Object}
   */
  getDefaults() {
    return {
      masterVolume: 0.8,
      musicVolume: 0.6,
      sfxVolume: 1.0,
      ambientVolume: 0.6,
      isMasterMuted: false,
      isMusicMuted: false,
      isAmbientMuted: false,
      isSfxMuted: false,
      isHapticsEnabled: true,
    };
  }

  /**
   * Load settings from storage with validation and clamping
   * @returns {Object}
   */
  loadSettings() {
    let raw = null;
    try {
      if (this._storage) {
        raw = this._storage.getItem(SETTINGS_KEY);
      } else {
        raw = this._memoryStore.get(SETTINGS_KEY);
      }
    } catch (e) {
      console.warn('[AudioSettings] Storage read error, using defaults:', e);
    }

    if (!raw) {
      const def = this.getDefaults();
      this.saveSettings(def);
      return def;
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        masterVolume: this._clamp(parsed.masterVolume, 0.8),
        musicVolume: this._clamp(parsed.musicVolume, 0.6),
        sfxVolume: this._clamp(parsed.sfxVolume, 1.0),
        ambientVolume: this._clamp(parsed.ambientVolume, 0.6),
        isMasterMuted: Boolean(parsed.isMasterMuted),
        isMusicMuted: Boolean(parsed.isMusicMuted),
        isAmbientMuted: Boolean(parsed.isAmbientMuted),
        isSfxMuted: Boolean(parsed.isSfxMuted),
        isHapticsEnabled: parsed.isHapticsEnabled !== undefined ? Boolean(parsed.isHapticsEnabled) : true,
      };
    } catch (e) {
      console.error('[AudioSettings] Failed to parse stored settings:', e);
      const def = this.getDefaults();
      this.saveSettings(def);
      return def;
    }
  }

  /**
   * Save settings to storage and notify eventBus
   * @param {Object} newSettings
   */
  saveSettings(newSettings) {
    this._settings = {
      ...this._settings,
      ...newSettings,
      masterVolume: this._clamp(newSettings.masterVolume ?? this._settings.masterVolume, 0.8),
      musicVolume: this._clamp(newSettings.musicVolume ?? this._settings.musicVolume, 0.6),
      sfxVolume: this._clamp(newSettings.sfxVolume ?? this._settings.sfxVolume, 1.0),
      ambientVolume: this._clamp(newSettings.ambientVolume ?? this._settings.ambientVolume, 0.6),
    };

    const serialized = JSON.stringify(this._settings);
    try {
      if (this._storage) {
        this._storage.setItem(SETTINGS_KEY, serialized);
      } else {
        this._memoryStore.set(SETTINGS_KEY, serialized);
      }
    } catch (e) {
      console.warn('[AudioSettings] Storage write error:', e);
    }

    if (this.eventBus) {
      this.eventBus.emit('AUDIO_SETTINGS_CHANGED', { settings: { ...this._settings } });
    }
  }

  /**
   * Retrieve current active settings copy
   * @returns {Object}
   */
  getSettings() {
    return { ...this._settings };
  }

  getEffectiveMasterVolume() {
    if (this._settings.isMasterMuted) return 0;
    return this._settings.masterVolume;
  }

  getEffectiveMusicVolume() {
    if (this._settings.isMasterMuted || this._settings.isMusicMuted) return 0;
    return this._settings.masterVolume * this._settings.musicVolume;
  }

  getEffectiveSfxVolume() {
    if (this._settings.isMasterMuted || this._settings.isSfxMuted) return 0;
    return this._settings.masterVolume * this._settings.sfxVolume;
  }

  getEffectiveAmbientVolume() {
    if (this._settings.isMasterMuted || this._settings.isAmbientMuted) return 0;
    return this._settings.masterVolume * this._settings.ambientVolume;
  }

  setMasterVolume(val) {
    this.saveSettings({ masterVolume: val });
  }

  setMusicVolume(val) {
    this.saveSettings({ musicVolume: val });
  }

  setSfxVolume(val) {
    this.saveSettings({ sfxVolume: val });
  }

  setAmbientVolume(val) {
    this.saveSettings({ ambientVolume: val });
  }

  setMasterMuted(bool) {
    this.saveSettings({ isMasterMuted: Boolean(bool) });
  }

  setMusicMuted(bool) {
    this.saveSettings({ isMusicMuted: Boolean(bool) });
  }

  setAmbientMuted(bool) {
    this.saveSettings({ isAmbientMuted: Boolean(bool) });
  }

  setSfxMuted(bool) {
    this.saveSettings({ isSfxMuted: Boolean(bool) });
  }

  setHapticsEnabled(bool) {
    this.saveSettings({ isHapticsEnabled: Boolean(bool) });
  }

  _clamp(val, fallback) {
    const num = parseFloat(val);
    if (isNaN(num)) return fallback;
    return Math.max(0, Math.min(1, num));
  }
}

export const globalAudioSettings = new AudioSettings();
