const path = require("node:path");
const { createTaurusApi } = require("../../taurus/api");
const { ApiGuard, CostTracker } = require("./runSafety");
const { PHASE_TIMEOUT_MAP, PIPELINE_TIMEOUT_MINUTES_HARD_LIMIT } = require("./pipeline/constants");
const { runPhase1 } = require("./pipeline/phase1Runner");
const { runPhase2 } = require("./pipeline/phase2Runner");
const { runPhase3 } = require("./pipeline/phase3Runner");
const { runPhase4 } = require("./pipeline/phase4Runner");

class PipelineOrchestrator {
  constructor(dependencies) {
    this.runStore = dependencies.runStore;
    this.promptService = dependencies.promptService;
    this.debateEngine = dependencies.debateEngine;
    this.geminiClient = dependencies.geminiClient;
    this.wsHub = dependencies.wsHub;
    this.assetService = dependencies.assetService;
    this.settingsService = dependencies.settingsService;
    this.outputsDirectory = path.resolve(process.env.OUTPUTS_DIR || "./outputs");
  }

  async execute(runId) {
    const runtimeConfig = this.settingsService.readConfig();
    this.geminiClient.setRuntimeConfig(runtimeConfig.gemini);
    const taurusApi = createTaurusApi({ apiKey: runtimeConfig.gemini.apiKey });
    const runSafetyContext = this.createRunSafetyContext(runId, runtimeConfig);

    this.runStore.updateRun(runId, {
      configSnapshot: JSON.parse(JSON.stringify(runtimeConfig)),
    });

    const runnerServices = {
      runStore: this.runStore,
      promptService: this.promptService,
      debateEngine: this.debateEngine,
      geminiClient: this.geminiClient,
      assetService: this.assetService,
      outputsDirectory: this.outputsDirectory,
      taurusApi,
      emitEvent: async (eventPayload) => this.wsHub.publish(runId, eventPayload),
    };

    try {
      await this.executePhase({
        runId,
        phaseNumber: 1,
        runner: runPhase1,
        runnerServices,
        runtimeConfig,
        runSafetyContext,
      });
      await this.executePhase({
        runId,
        phaseNumber: 2,
        runner: runPhase2,
        runnerServices,
        runtimeConfig,
        runSafetyContext,
      });
      await this.executePhase({
        runId,
        phaseNumber: 3,
        runner: runPhase3,
        runnerServices,
        runtimeConfig,
        runSafetyContext,
      });
      await this.executePhase({
        runId,
        phaseNumber: 4,
        runner: runPhase4,
        runnerServices,
        runtimeConfig,
        runSafetyContext,
      });

      const runState = this.runStore.updateRun(runId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      this.wsHub.publish(runId, { type: "pipeline_done", resultUrl: `/api/run/${runId}/result` });
      return runState;
    } catch (error) {
      this.handlePipelineFailure(runId, error);
      throw error;
    }
  }

  async executePhase({ runId, phaseNumber, runner, runnerServices, runtimeConfig, runSafetyContext }) {
    this.wsHub.publish(runId, { type: "phase_start", phase: phaseNumber });

    const phaseOutcome = await this.executeWithTimeout(
      phaseNumber,
      () =>
        runner({
          runId,
          services: runnerServices,
          runtimeConfig,
          runSafetyContext,
        }),
      runSafetyContext.getRemainingPipelineTimeMs(),
    );

    if (phaseOutcome) {
      const { emittedEvents = [], ...phaseResultPatch } = phaseOutcome;
      if (Object.keys(phaseResultPatch).length > 0) {
        this.runStore.updateRun(runId, phaseResultPatch);
      }
      for (const eventPayload of emittedEvents) {
        this.wsHub.publish(runId, eventPayload);
      }
    }

    this.wsHub.publish(runId, { type: "phase_done", phase: phaseNumber });
  }

  handlePipelineFailure(runId, error) {
    console.error(`[pipeline:${runId}]`, error);
    const failureTimestamp = new Date().toISOString();
    const normalizedErrorMessage = error?.message || "알 수 없는 파이프라인 오류";
    const normalizedFailedPhase = typeof error?.failedPhase === "number" ? error.failedPhase : null;

    this.runStore.updateRun(runId, {
      status: "failed",
      completedAt: failureTimestamp,
      failedAt: failureTimestamp,
      failedPhase: normalizedFailedPhase,
      errorMessage: normalizedErrorMessage,
    });
    this.wsHub.publish(runId, { type: "pipeline_error", error: normalizedErrorMessage });
  }

  createRunSafetyContext(runId, runtimeConfig) {
    const configuredMaxCalls = runtimeConfig.safety?.maxApiCallsPerRun ?? 200;
    const configuredCostLimit = runtimeConfig.safety?.maxCostPerRunUsd ?? 10;
    const configuredPipelineTimeoutMinutes = runtimeConfig.safety?.pipelineTimeoutMinutes ?? 30;
    const pipelineTimeoutMs = Math.min(configuredPipelineTimeoutMinutes, PIPELINE_TIMEOUT_MINUTES_HARD_LIMIT) * 60_000;
    const pipelineStartedAt = Date.now();
    const apiGuard = new ApiGuard(configuredMaxCalls);
    const costTracker = new CostTracker(configuredCostLimit);

    const updateUsage = () => {
      const usageSnapshot = costTracker.getUsage();
      this.runStore.updateRun(runId, {
        tokenUsage: {
          inputTokens: usageSnapshot.inputTokens,
          outputTokens: usageSnapshot.outputTokens,
          estimatedCost: usageSnapshot.estimatedCost,
        },
        apiCallUsage: {
          callCount: apiGuard.getCount(),
          maxCalls: configuredMaxCalls,
        },
      });
      this.wsHub.publish(runId, {
        type: "usage_update",
        tokenUsage: {
          inputTokens: usageSnapshot.inputTokens,
          outputTokens: usageSnapshot.outputTokens,
          estimatedCost: usageSnapshot.estimatedCost,
          maxCostUsd: usageSnapshot.maxCostUsd,
        },
        apiCallUsage: {
          callCount: apiGuard.getCount(),
          maxCalls: configuredMaxCalls,
        },
      });
    };

    return {
      apiGuard,
      costTracker,
      updateUsage,
      onUsage: () => updateUsage(),
      getRemainingPipelineTimeMs: () => {
        const elapsedMs = Date.now() - pipelineStartedAt;
        const remainingMs = pipelineTimeoutMs - elapsedMs;
        if (remainingMs <= 0) {
          throw new Error(`파이프라인 타임아웃: ${Math.floor(pipelineTimeoutMs / 60_000)}분 초과.`);
        }
        return remainingMs;
      },
    };
  }

  async executeWithTimeout(phaseNumber, executionFn, remainingPipelineTimeMs) {
    const phaseTimeoutSpec = PHASE_TIMEOUT_MAP[phaseNumber];
    const phaseTimeoutMs = Math.min(phaseTimeoutSpec.defaultMs, phaseTimeoutSpec.hardLimitMs, remainingPipelineTimeMs);
    let phaseTimeoutHandle = null;
    try {
      return await Promise.race([
        executionFn(),
        new Promise((_, rejectExecution) => {
          phaseTimeoutHandle = setTimeout(() => {
            rejectExecution(
              new Error(`Phase ${phaseNumber} 타임아웃: ${Math.floor(phaseTimeoutMs / 60_000)}분 초과.`),
            );
          }, phaseTimeoutMs);
        }),
      ]);
    } catch (error) {
      if (typeof error.failedPhase !== "number") {
        error.failedPhase = phaseNumber;
      }
      throw error;
    } finally {
      if (phaseTimeoutHandle) {
        clearTimeout(phaseTimeoutHandle);
      }
    }
  }
}

module.exports = { PipelineOrchestrator };
