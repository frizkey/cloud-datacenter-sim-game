/**
 * SettingsModal.js - Glassmorphic dialog for Audio, Haptics, and System preferences
 * Mobile-optimized with >= 48x48 dp touch controls and real-time AudioSettings synchronization.
 */

import { globalAudioSettings } from '../../core/audio/AudioSettings.js';
import { globalAudioManager } from '../../core/audio/AudioManager.js';

export class SettingsModal {
  /**
   * @param {Object} [options]
   * @param {import('../../core/audio/AudioSettings.js').AudioSettings} [options.settings]
   * @param {import('../../core/audio/AudioManager.js').AudioManager} [options.audioManager]
   * @param {Function} [options.onClose]
   */
  constructor(options = {}) {
    this.settings = options.settings || globalAudioSettings;
    this.audioManager = options.audioManager || globalAudioManager;
    this.onClose = options.onClose || (() => {});
    this.rootElement = null;

    this.initDOM();
  }

  initDOM() {
    this.rootElement = document.createElement('div');
    this.rootElement.className = 'modal-backdrop';
    this.rootElement.id = 'modal-settings';
    this.rootElement.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title">
            <span>⚙️</span>
            <span>Audio & System Settings</span>
          </div>
          <button class="modal-close-btn" id="btn-close-settings" aria-label="Close Settings">✕</button>
        </div>

        <div class="modal-body">
          <!-- Audio Levels -->
          <div class="settings-section">
            <div class="settings-section-title">🔊 Audio Volume & Soundscape</div>

            <!-- Master Volume -->
            <div class="settings-row">
              <div class="settings-label-wrap">
                <span class="settings-label">Master Volume</span>
                <span class="settings-desc">Overall sound output</span>
              </div>
              <div class="settings-slider-wrap">
                <input type="range" id="slider-master" class="settings-slider" min="0" max="100" step="1">
                <span id="val-master" class="settings-val-badge">80%</span>
              </div>
            </div>

            <!-- Music Volume -->
            <div class="settings-row">
              <div class="settings-label-wrap">
                <span class="settings-label">Adaptive Music</span>
                <span class="settings-desc">Generative planning ambient & crisis stems</span>
              </div>
              <div class="settings-slider-wrap">
                <input type="range" id="slider-music" class="settings-slider" min="0" max="100" step="1">
                <span id="val-music" class="settings-val-badge">60%</span>
              </div>
            </div>

            <!-- SFX Volume -->
            <div class="settings-row">
              <div class="settings-label-wrap">
                <span class="settings-label">Sound Effects</span>
                <span class="settings-desc">Placement blips, clicks & alerts</span>
              </div>
              <div class="settings-slider-wrap">
                <input type="range" id="slider-sfx" class="settings-slider" min="0" max="100" step="1">
                <span id="val-sfx" class="settings-val-badge">100%</span>
              </div>
            </div>

            <!-- Ambient Drone -->
            <div class="settings-row">
              <div class="settings-label-wrap">
                <span class="settings-label">Datacenter Ambient Hum</span>
                <span class="settings-desc">Dynamically modulated cooling airflow</span>
              </div>
              <div class="settings-slider-wrap">
                <input type="range" id="slider-ambient" class="settings-slider" min="0" max="100" step="1">
                <span id="val-ambient" class="settings-val-badge">60%</span>
              </div>
            </div>

            <!-- Mute Ambient Toggle -->
            <div class="settings-row">
              <div class="settings-label-wrap">
                <span class="settings-label">Mute Ambient Soundscape</span>
                <span class="settings-desc">Play SFX only, silence background fan</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-ambient-mute">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- Tactile Haptics -->
          <div class="settings-section">
            <div class="settings-section-title">📳 Mobile Tactile Feedback</div>
            <div class="settings-row">
              <div class="settings-label-wrap">
                <span class="settings-label">Haptic Vibrations</span>
                <span class="settings-desc">Physical feedback on grid snaps & alarms</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="toggle-haptics">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- System Info -->
          <div class="settings-section" style="background: rgba(15, 23, 42, 0.4);">
            <div class="settings-section-title">📱 System Runtime</div>
            <div style="font-size: 12px; color: #94a3b8; display: flex; flex-direction: column; gap: 4px;">
              <div>Architecture: <strong>Decoupled Headless Simulation (60 Hz)</strong></div>
              <div>Renderer: <strong>Phaser 4 WebGL / Dual-Perspective</strong></div>
              <div>Audio Engine: <strong>Web Audio Procedural Synthesis (Zero Assets)</strong></div>
              <div>Packaging: <strong>Capacitor Native Android / PWA Hybrid</strong></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="btn-settings-done" class="modal-btn modal-btn-primary" style="width: 100%;">
            Done
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.rootElement);

    // Close buttons
    this.rootElement.querySelector('#btn-close-settings').addEventListener('click', () => this.hide());
    this.rootElement.querySelector('#btn-settings-done').addEventListener('click', () => this.hide());

    // Sliders & Toggles
    const sliderMaster = this.rootElement.querySelector('#slider-master');
    const sliderMusic = this.rootElement.querySelector('#slider-music');
    const sliderSfx = this.rootElement.querySelector('#slider-sfx');
    const sliderAmbient = this.rootElement.querySelector('#slider-ambient');
    const toggleAmbientMute = this.rootElement.querySelector('#toggle-ambient-mute');
    const toggleHaptics = this.rootElement.querySelector('#toggle-haptics');

    sliderMaster.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.rootElement.querySelector('#val-master').textContent = `${val}%`;
      this.settings.setMasterVolume(val / 100);
      if (this.audioManager) this.audioManager.unlock();
    });

    sliderMusic.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.rootElement.querySelector('#val-music').textContent = `${val}%`;
      this.settings.setMusicVolume(val / 100);
      if (this.audioManager) {
        this.audioManager.unlock();
        if (!this.audioManager.isMusicRunning && val > 0) {
          this.audioManager.startAdaptiveMusic();
        }
      }
    });

    sliderSfx.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.rootElement.querySelector('#val-sfx').textContent = `${val}%`;
      this.settings.setSfxVolume(val / 100);
      if (this.audioManager) this.audioManager.unlock();
    });

    sliderAmbient.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      this.rootElement.querySelector('#val-ambient').textContent = `${val}%`;
      this.settings.setAmbientVolume(val / 100);
      if (this.audioManager) this.audioManager.unlock();
    });

    toggleAmbientMute.addEventListener('change', (e) => {
      this.settings.setAmbientMuted(e.target.checked);
      if (this.audioManager) {
        this.audioManager.unlock();
        if (e.target.checked) {
          this.audioManager.stopAmbientHum();
        } else {
          this.audioManager.startAmbientHum();
        }
      }
    });

    toggleHaptics.addEventListener('change', (e) => {
      this.settings.setHapticsEnabled(e.target.checked);
    });

    this.syncUIFromSettings();
  }

  syncUIFromSettings() {
    const s = this.settings.getSettings();
    const sliderMaster = this.rootElement.querySelector('#slider-master');
    const sliderMusic = this.rootElement.querySelector('#slider-music');
    const sliderSfx = this.rootElement.querySelector('#slider-sfx');
    const sliderAmbient = this.rootElement.querySelector('#slider-ambient');
    const toggleAmbientMute = this.rootElement.querySelector('#toggle-ambient-mute');
    const toggleHaptics = this.rootElement.querySelector('#toggle-haptics');

    const masterPercent = Math.round(s.masterVolume * 100);
    const musicPercent = Math.round((s.musicVolume ?? 0.6) * 100);
    const sfxPercent = Math.round(s.sfxVolume * 100);
    const ambientPercent = Math.round(s.ambientVolume * 100);

    sliderMaster.value = masterPercent;
    this.rootElement.querySelector('#val-master').textContent = `${masterPercent}%`;

    if (sliderMusic) {
      sliderMusic.value = musicPercent;
      this.rootElement.querySelector('#val-music').textContent = `${musicPercent}%`;
    }

    sliderSfx.value = sfxPercent;
    this.rootElement.querySelector('#val-sfx').textContent = `${sfxPercent}%`;

    sliderAmbient.value = ambientPercent;
    this.rootElement.querySelector('#val-ambient').textContent = `${ambientPercent}%`;

    toggleAmbientMute.checked = Boolean(s.isAmbientMuted);
    toggleHaptics.checked = Boolean(s.isHapticsEnabled);
  }

  show() {
    this.syncUIFromSettings();
    this.rootElement.classList.add('active');
  }

  hide() {
    this.rootElement.classList.remove('active');
    this.onClose();
  }
}
