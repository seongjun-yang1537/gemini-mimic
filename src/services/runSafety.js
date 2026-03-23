class ApiGuard {
  constructor(maxCalls = 200) {
    this.callCount = 0;
    this.maxCalls = maxCalls;
  }

  check() {
    this.callCount += 1;
    if (this.callCount > this.maxCalls) {
      throw new Error(`API 호출 한도 초과: ${this.callCount}/${this.maxCalls}. 파이프라인 강제 중단.`);
    }
  }

  getCount() {
    return this.callCount;
  }
}

class CostTracker {
  constructor(maxCostUsd = 10) {
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.maxCostUsd = maxCostUsd;
    this.inputRate = 2.0 / 1_000_000;
    this.outputRate = 12.0 / 1_000_000;
  }

  track(responsePayload = {}) {
    const usageMetadata = responsePayload.usageMetadata || {};
    this.inputTokens += usageMetadata.promptTokenCount ?? 0;
    this.outputTokens += usageMetadata.candidatesTokenCount ?? 0;

    const estimatedCost = this.estimateCost();
    if (estimatedCost > this.maxCostUsd) {
      throw new Error(`비용 한도 초과: $${estimatedCost.toFixed(2)} / $${this.maxCostUsd}. 파이프라인 강제 중단.`);
    }
  }

  estimateCost() {
    return this.inputTokens * this.inputRate + this.outputTokens * this.outputRate;
  }

  getUsage() {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      estimatedCost: this.estimateCost(),
      maxCostUsd: this.maxCostUsd,
    };
  }
}

module.exports = { ApiGuard, CostTracker };
