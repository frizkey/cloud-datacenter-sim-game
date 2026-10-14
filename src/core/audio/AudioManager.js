/**
 * AudioManager.js - Procedural Web Audio synthesizer and dynamic datacenter soundscape
 * Zero external audio files/downloads. Pure mathematical oscillator and noise buffer generation.
 * Pure JS, safe for browser Web Audio and Node.js testing.
 */

import { globalAudioSettings } from './AudioSettings.js';
import { globalEventBus, EngineEventTypes } from '../events/EventBus.js';

export class AudioManager {
  /**
   * @param {Object} [options]
   * @param {AudioContext} [options.audioContext]
   * @param {import('./AudioSettings.js').AudioSettings} [options.settings]
   * @param {import('../events/EventBus.js').EventBus} [options.eventBus]
   */
  constructor(options = {}) {
    this.settings = options.settings || globalAudioSettings;
    this.eventBus = options.eventBus || globalEventBus;

    // Initialize or adapt AudioContext
    if (options.audioContext) {
      this.ctx = options.audioContext;
    } else if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    } else {
      this.ctx = null;
    }

    this.isUnlocked = false;
    this.isAmbientRunning = false;
    this.isSirenActive = false;

    this.masterGainNode = null;
    this.sfxGainNode = null;
    this.ambientGainNode = null;
    this.ambientSourceNode = null;
    this.ambientFilterNode = null;
    this.sirenOscillator = null;
    this.sirenLfo = null;

    if (this.ctx) {
      this.initAudioGraph();
    }

    this.bindEvents();
    this.setupAutoUnlock();
  }

  initAudioGraph() {
    this.masterGainNode = this.ctx.createGain();
    this.sfxGainNode = this.ctx.createGain();
    this.ambientGainNode = this.ctx.createGain();

    this.sfxGainNode.connect(this.masterGainNode);
    this.ambientGainNode.connect(this.masterGainNode);
    this.masterGainNode.connect(this.ctx.destination);

    this.updateGainLevels();
  }

  updateGainLevels() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime || 0;
    const sfxVol = this.settings.getEffectiveSfxVolume();
    const ambVol = this.settings.getEffectiveAmbientVolume();

    if (this.sfxGainNode) {
      this.sfxGainNode.gain.setValueAtTime(sfxVol, now);
    }
    if (this.ambientGainNode) {
      this.ambientGainNode.gain.setValueAtTime(ambVol, now);
    }
  }

  setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      this.unlock();
      if (!this.isAmbientRunning) {
        this.startAmbientHum();
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
  }

  unlock() {
    this.isUnlocked = true;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn('[AudioManager] resume error:', err));
    }
  }

  /**
   * Start procedural continuous datacenter cooling fan drone
   */
  startAmbientHum() {
    if (!this.ctx || this.isAmbientRunning) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2; // 2-second buffer
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      // Pink-ish noise generation
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.12;
      }

      this.ambientSourceNode = this.ctx.createBufferSource();
      this.ambientSourceNode.buffer = noiseBuffer;
      this.ambientSourceNode.loop = true;

      this.ambientFilterNode = this.ctx.createBiquadFilter();
      this.ambientFilterNode.type = 'lowpass';
      this.ambientFilterNode.frequency.setValueAtTime(200, this.ctx.currentTime || 0);

      this.ambientSourceNode.connect(this.ambientFilterNode);
      this.ambientFilterNode.connect(this.ambientGainNode);

      this.ambientSourceNode.start();
      this.isAmbientRunning = true;
    } catch (e) {
      console.warn('[AudioManager] Failed to start ambient hum:', e);
    }
  }

  /**
   * Modulate ambient fan frequency based on datacenter power/heat
   * @param {number} totalWatts
   * @param {number} pueRatio
   */
  modulateAmbient(totalWatts = 5000, pueRatio = 1.2) {
    if (!this.ambientFilterNode || !this.ctx) return;
    const now = this.ctx.currentTime || 0;
    const loadFactor = Math.min(1.0, Math.max(0, totalWatts / 30000));
    const targetFreq = 180 + loadFactor * 420; // 180Hz to 600Hz
    this.ambientFilterNode.frequency.setValueAtTime(targetFreq, now);
  }

  /**
   * Stop ambient fan soundscape
   */
  stopAmbientHum() {
    if (this.ambientSourceNode) {
      try {
        this.ambientSourceNode.stop();
        this.ambientSourceNode.disconnect();
      } catch (e) {}
      this.ambientSourceNode = null;
    }
    this.isAmbientRunning = false;
  }

  /**
   * Start two-tone emergency incident siren
   */
  startSiren() {
    if (!this.ctx || this.isSirenActive) return;

    try {
      const now = this.ctx.currentTime || 0;
      this.sirenOscillator = this.ctx.createOscillator();
      this.sirenLfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const sirenGain = this.ctx.createGain();

      this.sirenOscillator.type = 'sawtooth';
      this.sirenOscillator.frequency.setValueAtTime(750, now);

      this.sirenLfo.type = 'sine';
      this.sirenLfo.frequency.setValueAtTime(2.5, now); // 2.5 Hz oscillation

      lfoGain.gain.setValueAtTime(150, now); // +/- 150 Hz swing (600 to 900 Hz)

      sirenGain.gain.setValueAtTime(0.25, now);

      this.sirenLfo.connect(lfoGain);
      lfoGain.connect(this.sirenOscillator.frequency);

      this.sirenOscillator.connect(sirenGain);
      sirenGain.connect(this.sfxGainNode);

      this.sirenOscillator.start();
      this.sirenLfo.start();
      this.isSirenActive = true;
    } catch (e) {
      console.warn('[AudioManager] Failed to start siren:', e);
    }
  }

  /**
   * Stop emergency siren
   */
  stopSiren() {
    if (!this.isSirenActive) return;

    try {
      if (this.sirenOscillator) {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      }
      if (this.sirenLfo) {
        this.sirenLfo.stop();
        this.sirenLfo.disconnect();
      }
    } catch (e) {}

    this.sirenOscillator = null;
    this.sirenLfo = null;
    this.isSirenActive = false;
  }

  /**
   * Synthesize and play a discrete sound effect
   * @param {string} type
   */
  playSfx(type) {
    if (!this.ctx || this.settings.getEffectiveSfxVolume() <= 0) return;

    const now = this.ctx.currentTime || 0;

    switch (type) {
      case 'UI_CLICK': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.015);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        osc.connect(gain);
        gain.connect(this.sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.02);
        break;
      }
      case 'NODE_PLACED': {
        // Two-tone harmonic major third blip
        [523.25, 659.25].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);
          gain.gain.setValueAtTime(0.2, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.14);
        });
        break;
      }
      case 'NODE_REMOVED': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }
      case 'CABLE_CONNECTED': {
        // Ascending harmonic sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      }
      case 'PACKET_SUCCESS': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
      case 'PACKET_DROP': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxGainNode);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case 'INCIDENT_RESOLVED': {
        // Pleasant C major chord (C5, E5, G5)
        [523.25, 659.25, 783.99].forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(now);
          osc.stop(now + 0.36);
        });
        break;
      }
      case 'LEVEL_VICTORY': {
        // 4-note ascending arpeggio (C5 -> E5 -> G5 -> C6)
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          const startTime = now + idx * 0.12;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(startTime);
          osc.stop(startTime + 0.45);
        });
        break;
      }
      case 'LEVEL_DEFEAT': {
        // 3-note descending minor triad (Eb5 -> C5 -> G4)
        [622.25, 523.25, 392.0].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          const startTime = now + idx * 0.16;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
        break;
      }
    }
  }

  bindEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('AUDIO_SETTINGS_CHANGED', () => {
      this.updateGainLevels();
    });

    this.eventBus.on('PLAY_SFX_REQUEST', (evt) => {
      if (evt.payload?.sfxType) {
        this.playSfx(evt.payload.sfxType);
      }
    });

    this.eventBus.on(EngineEventTypes.NODE_PLACED, () => {
      this.playSfx('NODE_PLACED');
    });

    this.eventBus.on(EngineEventTypes.NODE_REMOVED, () => {
      this.playSfx('NODE_REMOVED');
    });

    this.eventBus.on(EngineEventTypes.NODES_CONNECTED, () => {
      this.playSfx('CABLE_CONNECTED');
    });

    this.eventBus.on(EngineEventTypes.INCIDENT_TRIGGERED, () => {
      this.startSiren();
    });

    this.eventBus.on(EngineEventTypes.INCIDENT_MITIGATED, () => {
      this.stopSiren();
      this.playSfx('INCIDENT_RESOLVED');
    });

    this.eventBus.on('LEVEL_VICTORY', () => {
      this.stopSiren();
      this.playSfx('LEVEL_VICTORY');
    });

    this.eventBus.on('LEVEL_DEFEAT', () => {
      this.stopSiren();
      this.playSfx('LEVEL_DEFEAT');
    });

    this.eventBus.on(EngineEventTypes.STATE_SNAPSHOT_EMITTED, (evt) => {
      const power = evt.payload?.snapshot?.powerProfile?.totalLoadKw || 15;
      const pue = evt.payload?.snapshot?.pueRatio || 1.2;
      this.modulateAmbient(power * 1000, pue);
    });
  }
}

export const globalAudioManager = new AudioManager();
