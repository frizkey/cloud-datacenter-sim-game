/**
 * tests/audio-mobile.test.js - Unit tests for Procedural AudioManager, HapticsManager, AudioSettings & Lifecycle
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { EventBus } from '../src/core/events/EventBus.js';
import { AudioSettings } from '../src/core/audio/AudioSettings.js';
import { AudioManager } from '../src/core/audio/AudioManager.js';
import { HapticsManager } from '../src/core/haptics/HapticsManager.js';
import { MobileLifecycle } from '../src/core/mobile/MobileLifecycle.js';

// Mock Web Audio API for headless Node.js testing
class MockAudioNode {
  constructor() {
    this.gain = {
      value: 1,
      setValueAtTime: (val) => { this.gain.value = val; },
      exponentialRampToValueAtTime: (val) => { this.gain.value = val; },
      linearRampToValueAtTime: (val) => { this.gain.value = val; },
    };
    this.frequency = {
      value: 440,
      setValueAtTime: (val) => { this.frequency.value = val; },
      exponentialRampToValueAtTime: (val) => { this.frequency.value = val; },
      linearRampToValueAtTime: (val) => { this.frequency.value = val; },
    };
  }
  connect() { return new MockAudioNode(); }
  disconnect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = new MockAudioNode();
  }
  createGain() { return new MockAudioNode(); }
  createOscillator() { return new MockAudioNode(); }
  createBiquadFilter() { return new MockAudioNode(); }
  createBuffer(channels, length, sampleRate) {
    return {
      getChannelData: () => new Float32Array(length),
    };
  }
  createBufferSource() {
    const src = new MockAudioNode();
    src.buffer = null;
    src.loop = false;
    return src;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
}

describe('Phase 4: Procedural Audio, Haptics & Mobile Packaging', () => {
  let eventBus;
  let settings;
  let audioContext;
  let audioManager;
  let hapticsManager;

  beforeEach(() => {
    eventBus = new EventBus();
    settings = new AudioSettings({ storage: null, eventBus });
    audioContext = new MockAudioContext();
    audioManager = new AudioManager({ audioContext, settings, eventBus });
    hapticsManager = new HapticsManager({ settings, eventBus });
  });

  test('AudioSettings: saves, clamps, and calculates effective volume levels correctly', () => {
    assert.equal(settings.getSettings().masterVolume, 0.8);
    assert.equal(settings.getSettings().sfxVolume, 1.0);
    assert.equal(settings.getSettings().ambientVolume, 0.6);
    assert.equal(settings.getSettings().isHapticsEnabled, true);

    // Clamps values between 0.0 and 1.0
    settings.setMasterVolume(1.5);
    assert.equal(settings.getSettings().masterVolume, 1.0);

    settings.setSfxVolume(-0.5);
    assert.equal(settings.getSettings().sfxVolume, 0.0);

    // Effective volume with muting
    settings.setMasterVolume(0.8);
    settings.setSfxVolume(0.5);
    assert.equal(settings.getEffectiveSfxVolume(), 0.4);

    settings.setMasterMuted(true);
    assert.equal(settings.getEffectiveSfxVolume(), 0.0);

    settings.setMasterMuted(false);
    settings.setSfxMuted(true);
    assert.equal(settings.getEffectiveSfxVolume(), 0.0);
  });

  test('AudioManager: initializes Web Audio graph and unlocks audio context', () => {
    assert.equal(audioManager.isUnlocked, false);
    audioManager.unlock();
    assert.equal(audioManager.isUnlocked, true);
    assert.equal(audioContext.state, 'running');
  });

  test('AudioManager: synthesizes discrete sound effects without errors', () => {
    audioManager.unlock();

    // Verify all 10 sound effect types can be synthesized
    const sfxList = [
      'UI_CLICK',
      'NODE_PLACED',
      'NODE_REMOVED',
      'CABLE_CONNECTED',
      'PACKET_SUCCESS',
      'PACKET_DROP',
      'INCIDENT_RESOLVED',
      'LEVEL_VICTORY',
      'LEVEL_DEFEAT',
    ];

    for (const type of sfxList) {
      assert.doesNotThrow(() => {
        audioManager.playSfx(type);
      }, `Should synthesize ${type} cleanly`);
    }
  });

  test('AudioManager: starts, modulates, and stops ambient datacenter hum', () => {
    audioManager.unlock();
    audioManager.startAmbientHum();
    assert.equal(audioManager.isAmbientRunning, true);

    // Modulate filter cutoff frequency with workload
    audioManager.modulateAmbient(5000, 1.2);
    assert.ok(audioManager.ambientFilterNode.frequency.value >= 150);

    audioManager.modulateAmbient(25000, 1.8);
    assert.ok(audioManager.ambientFilterNode.frequency.value > 250);

    audioManager.stopAmbientHum();
    assert.equal(audioManager.isAmbientRunning, false);
  });

  test('AudioManager: starts and stops emergency incident siren', () => {
    audioManager.unlock();
    audioManager.startSiren();
    assert.equal(audioManager.isSirenActive, true);

    audioManager.stopSiren();
    assert.equal(audioManager.isSirenActive, false);
  });

  test('HapticsManager: triggers haptic patterns and respects mute toggle', () => {
    let triggeredPattern = null;
    const mockHapticsProvider = {
      impact: (opts) => { triggeredPattern = opts.style; },
      notification: (opts) => { triggeredPattern = opts.type; },
    };

    const haptics = new HapticsManager({
      settings,
      eventBus,
      hapticsProvider: mockHapticsProvider,
    });

    haptics.trigger('LIGHT');
    assert.equal(triggeredPattern, 'LIGHT');

    haptics.trigger('WARNING');
    assert.equal(triggeredPattern, 'WARNING');

    // Disabling haptics suppresses calls
    settings.setHapticsEnabled(false);
    triggeredPattern = null;
    haptics.trigger('LIGHT');
    assert.equal(triggeredPattern, null, 'Haptic should not fire when disabled in settings');
  });

  test('MobileLifecycle: handles backgrounding pause and auto-save', () => {
    let pausedCalled = false;
    let resumeCalled = false;
    let saveCalled = false;

    const mockGameModeManager = {
      sessionState: 'ACTIVE',
      pauseSession() {
        pausedCalled = true;
        this.sessionState = 'PAUSED';
      },
      resumeSession() {
        resumeCalled = true;
        this.sessionState = 'ACTIVE';
      },
    };

    const mockStorage = {
      saveState: () => { saveCalled = true; },
    };

    const lifecycle = new MobileLifecycle({
      gameModeManager: mockGameModeManager,
      storage: mockStorage,
      eventBus,
    });

    // Simulate OS backgrounding
    lifecycle.handleAppStateChange({ isActive: false });
    assert.equal(pausedCalled, true, 'Simulation should pause on background');
    assert.equal(lifecycle.isBackgrounded, true);

    // Simulate OS resume
    lifecycle.handleAppStateChange({ isActive: true });
    assert.equal(resumeCalled, true, 'Simulation should resume on foreground');
    assert.equal(lifecycle.isBackgrounded, false);
  });

  test('MobileLifecycle: hardware back button pops active modals', () => {
    let modalClosed = false;
    const mockModal = {
      isActive: true,
      hide: () => { modalClosed = true; },
    };

    const lifecycle = new MobileLifecycle({ eventBus });
    lifecycle.registerActiveModal('modal_settings', mockModal);

    const handled = lifecycle.handleBackButton();
    assert.equal(handled, true);
    assert.equal(modalClosed, true);
  });
});
