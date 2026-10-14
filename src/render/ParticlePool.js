/**
 * ParticlePool.js - Pre-allocated particle object pooling manager
 * Handles up to 5,000 concurrent request packet particles with zero-GC allocations during runtime.
 * Pure JS, fully testable headlessly.
 */

export class ParticlePool {
  /**
   * @param {Object} [options]
   * @param {number} [options.capacity=5000]
   */
  constructor(options = {}) {
    this.capacity = options.capacity || 5000;
    this.activeCount = 0;
    this._pool = new Array(this.capacity);

    for (let i = 0; i < this.capacity; i++) {
      this._pool[i] = {
        poolIndex: i,
        active: false,
        id: `pkt_pool_${i}`,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        progress: 0.0,
        speed: 1.0,
        colorHex: 0x22c55e,
        packetType: 'HTTP_GET',
        packetId: null,
        originNodeId: null,
        targetNodeId: null,
        hopCount: 0,
      };
    }

    this._freeIndices = [];
    for (let i = 0; i < this.capacity; i++) {
      this._freeIndices.push(i);
    }
  }

  /**
   * Acquire an inactive particle from the pool
   * @param {Object} [props] Initial state
   * @returns {Object|null} The leased particle or null if pool exhausted
   */
  acquire(props = {}) {
    if (this._freeIndices.length === 0) {
      // Pool full - gracefully drop or return null
      return null;
    }

    const index = this._freeIndices.pop();
    const particle = this._pool[index];

    particle.active = true;
    particle.x = props.x ?? 0;
    particle.y = props.y ?? 0;
    particle.targetX = props.targetX ?? props.x ?? 0;
    particle.targetY = props.targetY ?? props.y ?? 0;
    particle.progress = props.progress ?? 0.0;
    particle.speed = props.speed ?? 1.0;
    particle.colorHex = props.colorHex ?? 0x22c55e;
    particle.packetType = props.packetType ?? 'HTTP_GET';
    particle.packetId = props.packetId ?? null;
    particle.originNodeId = props.originNodeId ?? null;
    particle.targetNodeId = props.targetNodeId ?? null;
    particle.hopCount = props.hopCount ?? 0;

    this.activeCount++;
    return particle;
  }

  /**
   * Return a particle back to the pool
   * @param {Object} particle
   */
  release(particle) {
    if (!particle || !particle.active) {
      return;
    }

    particle.active = false;
    particle.packetId = null;
    particle.originNodeId = null;
    particle.targetNodeId = null;
    particle.progress = 0;

    this._freeIndices.push(particle.poolIndex);
    this.activeCount = Math.max(0, this.activeCount - 1);
  }

  /**
   * Release all active particles
   */
  releaseAll() {
    this._freeIndices = [];
    for (let i = 0; i < this.capacity; i++) {
      const p = this._pool[i];
      p.active = false;
      p.packetId = null;
      p.originNodeId = null;
      p.targetNodeId = null;
      p.progress = 0;
      this._freeIndices.push(i);
    }
    this.activeCount = 0;
  }

  /**
   * Iterate over each active particle with zero array allocation
   * @param {Function} callback (particle) => void
   */
  forEachActive(callback) {
    if (this.activeCount === 0) return;
    for (let i = 0; i < this.capacity; i++) {
      const p = this._pool[i];
      if (p.active) {
        callback(p);
      }
    }
  }

  /**
   * Returns available free slots in pool
   * @returns {number}
   */
  getAvailableCount() {
    return this._freeIndices.length;
  }
}
