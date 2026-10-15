/**
 * SimWorker.js - Web Worker decoupling 60 Hz simulation tick loop from main UI/render thread
 * Prevents UI/DOM micro-stutters from drifting physical simulation timesteps.
 */

const TICK_INTERVAL_MS = 1000 / 60; // ~16.666 ms

let isRunning = false;
let tickCount = 0;
let lastTickTime = 0;
let intervalId = null;

function performTick() {
  if (!isRunning) return;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const deltaSec = lastTickTime > 0 ? (now - lastTickTime) / 1000 : 1 / 60;
  lastTickTime = now;
  tickCount++;

  if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.postMessage({
      type: 'SIM_TICK',
      tickCount,
      deltaSec,
      now,
    });
  }
}

export function startWorkerLoop(intervalMs = TICK_INTERVAL_MS) {
  if (isRunning) return;
  isRunning = true;
  lastTickTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  intervalId = setInterval(performTick, intervalMs);
}

export function stopWorkerLoop() {
  isRunning = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function getTickCount() {
  return tickCount;
}

// If loaded in a true Web Worker context
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', (e) => {
    const data = e.data || {};
    switch (data.type) {
      case 'START':
        startWorkerLoop(data.intervalMs || TICK_INTERVAL_MS);
        break;
      case 'STOP':
        stopWorkerLoop();
        break;
      case 'RESET':
        tickCount = 0;
        lastTickTime = 0;
        break;
      case 'PING':
        self.postMessage({ type: 'PONG', tickCount });
        break;
    }
  });
}
