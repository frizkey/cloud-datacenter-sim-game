import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/events/EventBus.js';
import { AudioSettings } from '../src/core/audio/AudioSettings.js';
import { AudioManager } from '../src/core/audio/AudioManager.js';

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

describe('Adaptive Audio & 4-Bus Mixer Architecture (T023)', () => {
  let eventBus;
  let settings;
  let audioContext;
  let audioManager;

  beforeEach(() => {
    eventBus = new EventBus();
    settings = new AudioSettings({ eventBus });
    audioContext = new MockAudioContext();
    audioManager = new AudioManager({
      audioContext,
      settings,
      eventBus,
    });
  });

  it('initializes 4-bus mixer architecture (Master, Music, SFX, Ambience)', () => {
    assert.ok(audioManager.masterGainNode, 'Must have Master bus gain node');
    assert.ok(audioManager.musicGainNode, 'Must have Music bus gain node');
    assert.ok(audioManager.sfxGainNode, 'Must have SFX bus gain node');
    assert.ok(audioManager.ambientGainNode, 'Must have Ambience bus gain node');
  });

  it('adjusts individual audio bus volumes independently', () => {
    audioManager.setBusVolume('music', 0.4);
    assert.equal(audioManager.musicGainNode.gain.value, 0.4);

    audioManager.setBusVolume('sfx', 0.7);
    assert.equal(audioManager.sfxGainNode.gain.value, 0.7);

    audioManager.setBusVolume('ambience', 0.3);
    assert.equal(audioManager.ambientGainNode.gain.value, 0.3);

    audioManager.setBusVolume('master', 0.5);
    assert.equal(audioManager.masterGainNode.gain.value, 0.5);
  });

  it('triggers dynamic incident audio stem transitions without clipping', () => {
    audioManager.startAdaptiveMusic();
    assert.equal(audioManager.isMusicRunning, true);

    // Enter crisis incident state
    audioManager.setIncidentCrisisStem(true);
    assert.equal(audioManager.isCrisisStemActive, true);

    // Resolve crisis back to calm planning ambient
    audioManager.setIncidentCrisisStem(false);
    assert.equal(audioManager.isCrisisStemActive, false);
    audioManager.stopAdaptiveMusic();
  });

  it('synthesizes tactile mechanical foley for cable connections and clicks', () => {
    assert.doesNotThrow(() => {
      audioManager.playCableConnect();
      audioManager.playCableCut();
      audioManager.playAlarmKlaxon();
      audioManager.playNodeClick();
    });
  });
});
