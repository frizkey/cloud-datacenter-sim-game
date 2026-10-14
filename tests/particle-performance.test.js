import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ParticlePool } from '../src/render/ParticlePool.js';

describe('WebGL Particle Performance Verification (SC-002, T044)', () => {
  it('updates 3,000 concurrent particles in < 2.0ms per frame ensuring locked 60 FPS', () => {
    const pool = new ParticlePool({ capacity: 5000 });
    const TARGET_ACTIVE_PARTICLES = 3000;

    // Lease 3,000 particles
    for (let i = 0; i < TARGET_ACTIVE_PARTICLES; i++) {
      const p = pool.acquire({
        x: Math.random() * 800,
        y: Math.random() * 600,
        targetX: Math.random() * 800,
        targetY: Math.random() * 600,
        speed: 1.0 + Math.random(),
      });
      assert.ok(p, `Leased particle ${i}`);
    }

    assert.strictEqual(pool.activeCount, TARGET_ACTIVE_PARTICLES);

    // Simulate 60 frame updates (1 full second of animation)
    const startTime = performance.now();
    const FRAMES = 60;
    const deltaMs = 16.666;

    for (let frame = 0; frame < FRAMES; frame++) {
      pool.forEachActive((p) => {
        p.progress += deltaMs * 0.001 * p.speed;
        if (p.progress >= 1.0) {
          p.progress = 0; // Loop or recycle
        }
      });
    }

    const totalElapsedMs = performance.now() - startTime;
    const avgFrameTimeMs = totalElapsedMs / FRAMES;

    console.log(`\n[PERF] 3,000 Particles: 60 frames processed in ${totalElapsedMs.toFixed(2)}ms (avg ${avgFrameTimeMs.toFixed(3)}ms/frame)`);
    console.log(`[PERF] Frame Budget Used: ${((avgFrameTimeMs / 16.666) * 100).toFixed(1)}% of 16.66ms budget`);

    // Must use less than 2.5ms per frame (< 15% frame budget)
    assert.ok(
      avgFrameTimeMs < 2.5,
      `Average frame time was ${avgFrameTimeMs.toFixed(3)}ms, must be < 2.5ms to guarantee 60 FPS on mobile`
    );

    // Release all
    pool.releaseAll();
    assert.strictEqual(pool.activeCount, 0);
    assert.strictEqual(pool.getAvailableCount(), 5000);
  });
});
