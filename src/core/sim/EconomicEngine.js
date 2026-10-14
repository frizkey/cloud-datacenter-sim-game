/**
 * EconomicEngine.js - Manages financial balance in micro-cents, OPEX bills, and SLA reputation
 * Pure JS, zero DOM/Phaser coupling.
 */

import { SIM_CONSTANTS } from './Constants.js';
import { EngineEventTypes } from '../events/EventBus.js';

export class EconomicEngine {
  /**
   * @param {import('../events/EventBus.js').EventBus} eventBus
   * @param {Object} [initialProfile]
   */
  constructor(eventBus, initialProfile = {}) {
    this.eventBus = eventBus;

    this.cashMicroCents = initialProfile.cashMicroCents ?? SIM_CONSTANTS.STARTING_CASH_MICRO_CENTS;
    this.revenuePerSec = initialProfile.revenuePerSec ?? 0;
    this.opexPerSec = initialProfile.opexPerSec ?? 0;
    this.netIncomePerSec = 0;
    this.slaReputationPercent = initialProfile.slaReputationPercent ?? SIM_CONSTANTS.SLA_REPUTATION_DEFAULT;
    this.totalProcessedRequests = initialProfile.totalProcessedRequests ?? 0;
    this.totalFailedRequests = initialProfile.totalFailedRequests ?? 0;

    this.isInsolvencyWarning = false;
    this.insolvencyGraceTimerSec = SIM_CONSTANTS.INSOLVENCY_GRACE_PERIOD_SEC;
    this.isBankrupt = false;

    this._pendingRevenueMicroCents = 0;
    this._recentDrops = 0;
    this._accumulatedOpexFraction = 0;
  }

  /**
   * Record successfully processed requests (200 OK)
   * @param {number} count
   */
  recordProcessedRequest(count = 1) {
    const revenue = count * SIM_CONSTANTS.REVENUE_PER_200_OK_MICRO_CENTS;
    this.cashMicroCents += revenue;
    this.totalProcessedRequests += count;
    this._pendingRevenueMicroCents += revenue;
  }

  /**
   * Record egress bandwidth for Object Storage ($0.00005/MB = 50 micro-cents/MB)
   * @param {number} megabytes
   */
  recordEgressBandwidth(megabytes = 1) {
    const egressCost = Math.round(megabytes * 50);
    this.cashMicroCents -= egressCost;
  }

  /**
   * Record dropped or timed out requests
   * @param {number} count
   */
  recordDroppedRequest(count = 1) {
    this.totalFailedRequests += count;
    this._recentDrops += count;

    // SLA penalty: 0.05% drop per failed packet
    const penalty = count * SIM_CONSTANTS.SLA_PENALTY_PER_DROP;
    this.slaReputationPercent = Math.max(0, Math.round((this.slaReputationPercent - penalty) * 1000) / 1000);

    if (this.eventBus) {
      this.eventBus.emit(EngineEventTypes.SLA_STATUS_CHANGED, {
        slaReputationPercent: this.slaReputationPercent,
        totalFailedRequests: this.totalFailedRequests,
      });
    }
  }

  /**
   * Deduct cash for equipment procurement or emergency triage
   * @param {number} amountMicroCents
   * @returns {boolean} Whether transaction succeeded
   */
  deductCash(amountMicroCents) {
    this.cashMicroCents -= amountMicroCents;
    this.checkInsolvencyState();
    return true;
  }

  /**
   * Add cash (e.g. funding grants, refunds)
   * @param {number} amountMicroCents
   */
  addCash(amountMicroCents) {
    this.cashMicroCents += amountMicroCents;
    this.checkInsolvencyState();
  }

  /**
   * Update fixed operational expenditure rate
   * @param {number} opexMicroCentsPerSec
   */
  setOpexPerSec(opexMicroCentsPerSec) {
    this.opexPerSec = Math.max(0, opexMicroCentsPerSec);
  }

  /**
   * Update revenue rate based on current throughput
   * @param {number} revenueMicroCentsPerSec
   */
  setRevenuePerSec(revenueMicroCentsPerSec) {
    this.revenuePerSec = Math.max(0, revenueMicroCentsPerSec);
  }

  /**
   * Verify insolvency and bankruptcy conditions
   */
  checkInsolvencyState() {
    if (this.cashMicroCents < 0) {
      this.isInsolvencyWarning = true;
    } else {
      this.isInsolvencyWarning = false;
      this.insolvencyGraceTimerSec = SIM_CONSTANTS.INSOLVENCY_GRACE_PERIOD_SEC;
    }
  }

  /**
   * Step economic tick
   * @param {number} deltaSec
   */
  tick(deltaSec) {
    if (this.isBankrupt) return;

    // Deduct OPEX slice with fractional remainder accumulation to guarantee zero float drift
    this._accumulatedOpexFraction += this.opexPerSec * deltaSec;
    const integerOpexDeduction = Math.floor(this._accumulatedOpexFraction);
    if (integerOpexDeduction > 0) {
      this.cashMicroCents -= integerOpexDeduction;
      this._accumulatedOpexFraction -= integerOpexDeduction;
    }

    // Calculate net income per sec
    this.netIncomePerSec = this.revenuePerSec - this.opexPerSec;

    // SLA recovery when zero drops occur in this tick window
    if (this._recentDrops === 0 && this.slaReputationPercent < 100.0) {
      this.slaReputationPercent = Math.min(
        100.0,
        this.slaReputationPercent + SIM_CONSTANTS.SLA_RECOVERY_RATE_PER_SEC * deltaSec
      );
    }
    this._recentDrops = 0;

    // Insolvency countdown
    if (this.cashMicroCents < 0) {
      this.isInsolvencyWarning = true;
      this.insolvencyGraceTimerSec -= deltaSec;

      if (this.insolvencyGraceTimerSec <= 0) {
        this.insolvencyGraceTimerSec = 0;
        this.isBankrupt = true;

        if (this.eventBus) {
          this.eventBus.emit(EngineEventTypes.SLA_STATUS_CHANGED, {
            isBankrupt: true,
            cashMicroCents: this.cashMicroCents,
            reason: 'INSOLVENCY_GRACE_EXPIRED',
          });
        }
      }
    } else if (this.isInsolvencyWarning) {
      this.isInsolvencyWarning = false;
      this.insolvencyGraceTimerSec = SIM_CONSTANTS.INSOLVENCY_GRACE_PERIOD_SEC;
    }
  }

  /**
   * Returns current company economic profile snapshot
   * @returns {Object}
   */
  getProfile() {
    return {
      cashMicroCents: this.cashMicroCents,
      revenuePerSec: this.revenuePerSec,
      opexPerSec: this.opexPerSec,
      netIncomePerSec: this.netIncomePerSec,
      slaReputationPercent: Math.round(this.slaReputationPercent * 100) / 100,
      totalProcessedRequests: this.totalProcessedRequests,
      totalFailedRequests: this.totalFailedRequests,
      isInsolvencyWarning: this.isInsolvencyWarning,
      insolvencyGraceTimerSec: Math.round(this.insolvencyGraceTimerSec * 10) / 10,
      isBankrupt: this.isBankrupt,
    };
  }
}
