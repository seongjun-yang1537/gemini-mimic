// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");
const { createTaurusApi } = require("../../taurus/api");
const { ApiGuard, CostTracker } = require("./runSafety");

const PIPELINE_TIMEOUT_MINUTES_HARD_LIMIT = 60;
const PHASE_TIMEOUT_MAP = {
  1: { defaultMs: 5 * 60_000, hardLimitMs: 10 * 60_000 },
  2: { defaultMs: 5 * 60_000, hardLimitMs: 10 * 60_000 },
  3: { defaultMs: 20 * 60_000, hardLimitMs: 40 * 60_000 },
  4: { defaultMs: 3 * 60_000, hardLimitMs: 5 * 60_000 },
};

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

    try {
      await this.executeWithTimeout(
        1,
        () => this.runPhase1(runId, runtimeConfig, runSafetyContext),
        runSafetyContext.getRemainingPipelineTimeMs(),
      );
      await this.executeWithTimeout(
        2,
        () => this.runPhase2(runId, runSafetyContext),
        runSafetyContext.getRemainingPipelineTimeMs(),
      );
      await this.executeWithTimeout(
        3,
        () => this.runPhase3(runId, runtimeConfig, taurusApi, runSafetyContext),
        runSafetyContext.getRemainingPipelineTimeMs(),
      );
      await this.executeWithTimeout(
        4,
        () => this.runPhase4(runId, runSafetyContext),
        runSafetyContext.getRemainingPipelineTimeMs(),
      );

      const runState = this.runStore.updateRun(runId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      this.wsHub.publish(runId, { type: "pipeline_done", resultUrl: `/api/run/${runId}/result` });
      return runState;
    } catch (error) {
      console.error(`[pipeline:${runId}]`, error);
      this.runStore.updateRun(runId, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
      this.wsHub.publish(runId, { type: "pipeline_error", error: error.message });
      throw error;
    }
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
    } finally {
      if (phaseTimeoutHandle) {
        clearTimeout(phaseTimeoutHandle);
      }
    }
  }

  async runPhase1(runId, runtimeConfig, runSafetyContext) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 1 });
    const runState = this.runStore.getRun(runId);
    const phasePrompts = this.promptService.loadPhasePrompts("phase1");

    const candidateExperts = [
      { name: "훅 전문가", role: "hook", prompt: phasePrompts.hook_expert, settingKey: "hook" },
      { name: "스토리 전문가", role: "story", prompt: phasePrompts.story_expert, settingKey: "story" },
      { name: "CTA 전문가", role: "cta", prompt: phasePrompts.cta_expert, settingKey: "cta" },
      { name: "행동 묘사 전문가", role: "action", prompt: phasePrompts.action_desc_expert, settingKey: "actionDesc" },
      {
        name: "캐릭터 묘사 전문가",
        role: "character",
        prompt: phasePrompts.character_desc_expert,
        settingKey: "characterDesc",
      },
    ];

    const expertDefinitions = candidateExperts.filter((expertItem) => runtimeConfig.experts.phase1[expertItem.settingKey]);

    const phase1DebateResult = await this.debateEngine.runDebate({
      experts: expertDefinitions,
      facilitatorPrompt: phasePrompts.facilitator,
      summarizerPrompt: phasePrompts.summarizer,
      context: "입력 밈 영상을 분석해서 마케팅 크리에이티브 시나리오를 확정해 주세요.",
      videoPath: runState.inputVideo,
      rounds: runtimeConfig.debate.rounds,
      parallelExperts: runtimeConfig.debate.parallelExperts,
      emitEvent: async (eventPayload) => this.wsHub.publish(runId, eventPayload),
      safetyContext: runSafetyContext,
      onUsage: runSafetyContext.onUsage,
    });

    this.runStore.updateRun(runId, {
      phase1Result: {
        scenario: phase1DebateResult.summary,
        debateLog: phase1DebateResult,
      },
    });

    this.wsHub.publish(runId, { type: "phase_done", phase: 1 });
  }

  async runPhase2(runId, runSafetyContext) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 2 });
    const runState = this.runStore.getRun(runId);
    const phase2Prompts = this.promptService.loadPhasePrompts("phase2");

    const assetListText = await this.geminiClient.callGemini(
      phase2Prompts.reference_expert,
      runState.phase1Result.scenario,
      { safetyContext: runSafetyContext, onUsage: runSafetyContext.onUsage },
    );

    const generatedReferencePath = path.join(this.outputsDirectory, `${runId}-reference-1.png`);
    const hasGeneratedReference = fs.existsSync(generatedReferencePath);
    const referenceSheets = hasGeneratedReference ? [generatedReferencePath] : [];
    const generatedReferenceAssets = [];

    if (this.assetService && hasGeneratedReference) {
      const storedReferenceAsset = this.assetService.registerAssetFromFile(generatedReferencePath, {
        category: "generated_image",
        tagSeed: `${runId}_reference_1`,
        sourceRunId: runId,
        sourcePhase: 2,
      });
      generatedReferenceAssets.push(storedReferenceAsset);
    }

    this.runStore.updateRun(runId, {
      phase2Result: {
        referenceSheets,
        referenceAssetIds: generatedReferenceAssets.map((assetItem) => assetItem.id),
        assetList: assetListText,
      },
    });

    if (hasGeneratedReference) {
      this.wsHub.publish(runId, { type: "media_ready", mediaType: "image", url: generatedReferencePath });
    } else {
      this.wsHub.publish(runId, {
        type: "pipeline_error",
        error: "레퍼런스 이미지 파일 없음",
      });
    }
    this.wsHub.publish(runId, { type: "phase_done", phase: 2 });
  }

  async runPhase3(runId, runtimeConfig, taurusApi, runSafetyContext) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 3 });
    const runState = this.runStore.getRun(runId);
    const phase3Prompts = this.promptService.loadPhasePrompts("phase3");

    const iterationList = [];
    let currentIteration = 1;
    let passDecision = false;
    let finalVideoPath = "";

    const maxIterationsHardLimit = 10;
    const maxIterations = Math.min(runtimeConfig.video.maxIterations, maxIterationsHardLimit);

    while (!passDecision && currentIteration <= maxIterations) {
      const generatedVideoPath = path.join(this.outputsDirectory, `${runId}-iteration-${currentIteration}.mp4`);
      const referenceImagePaths = Array.isArray(runState.phase2Result?.referenceSheets)
        ? runState.phase2Result.referenceSheets.filter((referencePathItem) => fs.existsSync(referencePathItem))
        : [];
      const taurusGenerationOptions = {
        duration: runtimeConfig.video.defaultDuration,
        aspectRatio: runtimeConfig.video.aspectRatio,
        splitModel: runtimeConfig.video.splitModel,
        pollInterval: runtimeConfig.video.pollInterval,
        postProcessingWait: runtimeConfig.video.postProcessingWait,
        outputPath: generatedVideoPath,
        onApiCall: () => {
          runSafetyContext.apiGuard.check();
          runSafetyContext.updateUsage();
        },
        onStatus: async (status, payload) => {
          this.wsHub.publish(runId, {
            type: "video_generating",
            segment: payload.segment,
            totalSegments: payload.totalSegments,
            status,
          });
        },
      };

      if (referenceImagePaths.length > 0) {
        taurusGenerationOptions.referenceImages = referenceImagePaths;
      }

      const taurusResult = await taurusApi.generateVideo(runState.phase1Result.scenario, {
        ...taurusGenerationOptions,
      });

      this.wsHub.publish(runId, { type: "media_ready", mediaType: "video", url: taurusResult.outputPath });

      let generatedVideoAsset = null;
      if (this.assetService) {
        generatedVideoAsset = this.assetService.registerAssetFromFile(taurusResult.outputPath, {
          category: "generated_video",
          tagSeed: `${runId}_iteration_${currentIteration}`,
          sourceRunId: runId,
          sourcePhase: 3,
          iteration: currentIteration,
        });
      }

      const candidateEvaluators = [
        {
          name: "행동 묘사 평가",
          role: "action",
          prompt: phase3Prompts.action_eval_expert,
          settingKey: "actionEval",
        },
        {
          name: "캐릭터 평가",
          role: "character",
          prompt: phase3Prompts.character_eval_expert,
          settingKey: "characterEval",
        },
        {
          name: "시나리오 정합성 평가",
          role: "scenario",
          prompt: phase3Prompts.scenario_eval_expert,
          settingKey: "scenarioEval",
        },
      ];

      const evaluatorDefinitions = candidateEvaluators.filter(
        (expertItem) => runtimeConfig.experts.phase3[expertItem.settingKey],
      );

      const evaluationDebate = await this.debateEngine.runDebate({
        experts: evaluatorDefinitions,
        facilitatorPrompt: phase3Prompts.facilitator,
        summarizerPrompt: phase3Prompts.summarizer,
        context: runState.phase1Result.scenario,
        videoPath: taurusResult.outputPath,
        rounds: runtimeConfig.debate.rounds,
        parallelExperts: runtimeConfig.debate.parallelExperts,
        emitEvent: async (eventPayload) => this.wsHub.publish(runId, eventPayload),
        safetyContext: runSafetyContext,
        onUsage: runSafetyContext.onUsage,
      });

      const verdictText = evaluationDebate.summary.toLowerCase();
      passDecision = verdictText.includes("pass") || verdictText.includes("합격");

      this.wsHub.publish(runId, {
        type: "verdict",
        result: passDecision ? "pass" : "fail",
        iteration: currentIteration,
      });

      if (generatedVideoAsset) {
        generatedVideoAsset = this.assetService.updateAsset(generatedVideoAsset.id, {
          verdict: passDecision ? "pass" : "fail",
        });
      }

      iterationList.push({
        number: currentIteration,
        videoPath: taurusResult.outputPath,
        evaluation: evaluationDebate,
        verdict: passDecision ? "pass" : "fail",
        assetId: generatedVideoAsset?.id,
        correctionNote: passDecision ? undefined : evaluationDebate.summary,
      });

      finalVideoPath = taurusResult.outputPath;
      currentIteration += 1;
    }

    this.runStore.updateRun(runId, {
      phase3Result: {
        iterations: iterationList,
        finalVideo: finalVideoPath,
      },
    });

    this.wsHub.publish(runId, { type: "phase_done", phase: 3 });
  }

  async runPhase4(runId, runSafetyContext) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 4 });
    const runState = this.runStore.getRun(runId);
    const phase4Prompts = this.promptService.loadPhasePrompts("phase4");

    const editSpecText = await this.geminiClient.callGemini(phase4Prompts.editor_expert, {
      scenario: runState.phase1Result.scenario,
      sourceVideo: runState.phase3Result.finalVideo,
    }, { safetyContext: runSafetyContext, onUsage: runSafetyContext.onUsage });

    const finalCreativePath = path.join(this.outputsDirectory, `${runId}-final-creative.mp4`);

    let exportAsset = null;
    if (this.assetService && fs.existsSync(finalCreativePath)) {
      exportAsset = this.assetService.registerAssetFromFile(finalCreativePath, {
        category: "export",
        tagSeed: `${runId}_final_creative`,
        sourceRunId: runId,
        sourcePhase: 4,
      });
    }

    this.runStore.updateRun(runId, {
      phase4Result: {
        editSpec: editSpecText,
        finalCreative: finalCreativePath,
        exportAssetId: exportAsset?.id,
      },
    });

    this.wsHub.publish(runId, { type: "media_ready", mediaType: "video", url: finalCreativePath });
    this.wsHub.publish(runId, { type: "phase_done", phase: 4 });
  }
}

module.exports = { PipelineOrchestrator };
