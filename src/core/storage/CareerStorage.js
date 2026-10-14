/**
 * CareerStorage.js - Persistent local storage for player career progress and survival scores
 * Pure JS, safe for both Browser (localStorage) and Node.js testing (in-memory fallback).
 */

const STORAGE_KEY = 'cloud_sim_career_v1';

export class CareerStorage {
  /**
   * @param {Object} [options]
   * @param {Storage} [options.storage] - Custom storage object (defaults to window.localStorage if available)
   */
  constructor(options = {}) {
    this._memoryStore = new Map();

    if (options.storage) {
      this._storage = options.storage;
    } else if (typeof window !== 'undefined' && window.localStorage) {
      this._storage = window.localStorage;
    } else if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      this._storage = globalThis.localStorage;
    } else {
      this._storage = null;
    }

    this._cachedCareer = this.loadCareer();
  }

  /**
   * Return default fresh career progress
   * @returns {Object}
   */
  getDefaults() {
    return {
      unlockedLevel: 1,
      levelStars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      survivalHighScoreSec: 0,
      survivalMaxRequests: 0,
      totalCareerCashEarnedMicroCents: 0,
      lastPlayedTimestamp: Date.now(),
    };
  }

  /**
   * Load career record from storage with fallback validation
   * @returns {Object}
   */
  loadCareer() {
    let raw = null;
    try {
      if (this._storage) {
        raw = this._storage.getItem(STORAGE_KEY);
      } else {
        raw = this._memoryStore.get(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[CareerStorage] Storage access error, using defaults:', e);
    }

    if (!raw) {
      const def = this.getDefaults();
      this.saveCareer(def);
      return def;
    }

    try {
      const parsed = JSON.parse(raw);
      return {
        unlockedLevel: Math.max(1, Math.min(5, parseInt(parsed.unlockedLevel, 10) || 1)),
        levelStars: {
          1: parseInt(parsed.levelStars?.[1], 10) || 0,
          2: parseInt(parsed.levelStars?.[2], 10) || 0,
          3: parseInt(parsed.levelStars?.[3], 10) || 0,
          4: parseInt(parsed.levelStars?.[4], 10) || 0,
          5: parseInt(parsed.levelStars?.[5], 10) || 0,
        },
        survivalHighScoreSec: Math.max(0, parseInt(parsed.survivalHighScoreSec, 10) || 0),
        survivalMaxRequests: Math.max(0, parseInt(parsed.survivalMaxRequests, 10) || 0),
        totalCareerCashEarnedMicroCents: Math.max(0, parseInt(parsed.totalCareerCashEarnedMicroCents, 10) || 0),
        lastPlayedTimestamp: parsed.lastPlayedTimestamp || Date.now(),
      };
    } catch (e) {
      console.error('[CareerStorage] Corrupted career record, resetting:', e);
      const def = this.getDefaults();
      this.saveCareer(def);
      return def;
    }
  }

  /**
   * Save career record to storage
   * @param {Object} record
   */
  saveCareer(record) {
    this._cachedCareer = {
      ...record,
      lastPlayedTimestamp: Date.now(),
    };

    const serialized = JSON.stringify(this._cachedCareer);
    try {
      if (this._storage) {
        this._storage.setItem(STORAGE_KEY, serialized);
      } else {
        this._memoryStore.set(STORAGE_KEY, serialized);
      }
    } catch (e) {
      console.warn('[CareerStorage] Failed to save career progress:', e);
    }
  }

  /**
   * Record outcome of a campaign level
   * @param {number} levelNum
   * @param {number} starsEarned
   * @param {number} cashEarnedMicroCents
   * @returns {Object} Updated career record
   */
  recordLevelResult(levelNum, starsEarned, cashEarnedMicroCents = 0) {
    const career = this.loadCareer();
    const currentStars = career.levelStars[levelNum] || 0;

    // Preserve highest stars achieved
    if (starsEarned > currentStars) {
      career.levelStars[levelNum] = Math.min(3, Math.max(0, starsEarned));
    }

    // Unlock next level if at least 1 star earned and next level is within 1-5
    if (starsEarned >= 1 && levelNum < 5 && career.unlockedLevel <= levelNum) {
      career.unlockedLevel = levelNum + 1;
    }

    if (cashEarnedMicroCents > 0) {
      career.totalCareerCashEarnedMicroCents += cashEarnedMicroCents;
    }

    this.saveCareer(career);
    return career;
  }

  /**
   * Record survival mode results
   * @param {number} survivalTimeSec
   * @param {number} requestsProcessed
   * @returns {{ isNewHighScore: boolean, career: Object }}
   */
  recordSurvivalResult(survivalTimeSec, requestsProcessed = 0) {
    const career = this.loadCareer();
    let isNewHighScore = false;

    if (survivalTimeSec > career.survivalHighScoreSec) {
      career.survivalHighScoreSec = survivalTimeSec;
      isNewHighScore = true;
    }

    if (requestsProcessed > career.survivalMaxRequests) {
      career.survivalMaxRequests = requestsProcessed;
    }

    this.saveCareer(career);
    return { isNewHighScore, career };
  }

  /**
   * Check if a specific campaign level is unlocked
   * @param {number} levelNum
   * @returns {boolean}
   */
  isLevelUnlocked(levelNum) {
    const career = this.loadCareer();
    return levelNum <= career.unlockedLevel;
  }

  /**
   * Get stars earned for a specific level
   * @param {number} levelNum
   * @returns {number}
   */
  getLevelStars(levelNum) {
    const career = this.loadCareer();
    return career.levelStars[levelNum] || 0;
  }

  /**
   * Reset career progression
   */
  resetProgress() {
    const def = this.getDefaults();
    this.saveCareer(def);
    return def;
  }
}

export const globalCareerStorage = new CareerStorage();
