const fs = require("node:fs");
const path = require("node:path");
const { createTaurusApi } = require("../../taurus/api");

class PipelineOrchestrator {
  constructor(dependencies) {
    this.runStore = dependencies.runStore;
    this.promptService = dependencies.promptService;
    this.debateEngine = dependencies.debateEngine;
    this.geminiClient = dependencies.geminiClient;
    this.wsHub = dependencies.wsHub;
    this.assetService = dependencies.assetService;
    this.outputsDirectory = path.resolve(process.env.OUTPUTS_DIR || "./outputs");
  }

  resolveRunConfig(runId) {
    const runState = this.runStore.getRun(runId);
    if (!runState) {
      throw new Error("Run not found");
    }
    const runConfig = runState.configSnapshot;
    if (!runConfig) {
      throw new Error("Run config snapshot is missing");
    }
    return runConfig;
  }

  createTaurusClient(runConfig) {
    return createTaurusApi({ apiKey: runConfig.gemini.apiKey || process.env.GEMINI_API_KEY });
  }

  async execute(runId) {
    try {
      const runConfig = this.resolveRunConfig(runId);
      this.geminiClient.setRuntimeConfig(runConfig.gemini);

      await this.runPhase1(runId, runConfig);
      await this.runPhase2(runId, runConfig);
      await this.runPhase3(runId, runConfig);
      await this.runPhase4(runId, runConfig);

      const runState = this.runStore.updateRun(runId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      this.wsHub.publish(runId, { type: "pipeline_done", resultUrl: `/api/run/${runId}/result` });
      return runState;
    } catch (error) {
      this.runStore.updateRun(runId, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
      this.wsHub.publish(runId, { type: "pipeline_error", error: error.message });
      throw error;
    }
  }

  async runPhase1(runId, runConfig) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 1 });
    const runState = this.runStore.getRun(runId);
    const phasePrompts = this.promptService.loadPhasePrompts("phase1");

    const phase1ExpertCatalog = [
      { key: "hook", name: "훅 전문가", role: "hook", prompt: phasePrompts.hook_expert },
      { key: "story", name: "스토리 전문가", role: "story", prompt: phasePrompts.story_expert },
      { key: "cta", name: "CTA 전문가", role: "cta", prompt: phasePrompts.cta_expert },
      { key: "actionDesc", name: "행동 묘사 전문가", role: "action", prompt: phasePrompts.action_desc_expert },
      { key: "characterDesc", name: "캐릭터 묘사 전문가", role: "character", prompt: phasePrompts.character_desc_expert },
    ];

    const activeExperts = phase1ExpertCatalog.filter((expertDefinition) => runConfig.experts.phase1[expertDefinition.key]);

    const phase1DebateResult = await this.debateEngine.runDebate({
      experts: activeExperts,
      facilitatorPrompt: phasePrompts.facilitator,
      summarizerPrompt: phasePrompts.summarizer,
      context: "입력 밈 영상을 분석해서 마케팅 크리에이티브 시나리오를 확정해 주세요.",
      videoPath: runState.inputVideo,
      rounds: runConfig.debate.rounds,
      parallelExperts: runConfig.debate.parallelExperts,
      emitEvent: async (eventPayload) => this.wsHub.publish(runId, eventPayload),
    });

    this.runStore.updateRun(runId, {
      phase1Result: {
        scenario: phase1DebateResult.summary,
        debateLog: phase1DebateResult,
      },
    });

    this.wsHub.publish(runId, { type: "phase_done", phase: 1 });
  }

  async runPhase2(runId) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 2 });
    const runState = this.runStore.getRun(runId);
    const phase2Prompts = this.promptService.loadPhasePrompts("phase2");

    const assetListText = await this.geminiClient.callGemini(
      phase2Prompts.reference_expert,
      runState.phase1Result.scenario,
    );

    const generatedReferencePath = path.join(this.outputsDirectory, `${runId}-reference-1.png`);
    const generatedReferenceAssets = [];

    if (this.assetService && fs.existsSync(generatedReferencePath)) {
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
        referenceSheets: [generatedReferencePath],
        referenceAssetIds: generatedReferenceAssets.map((assetItem) => assetItem.id),
        assetList: assetListText,
      },
    });

    this.wsHub.publish(runId, { type: "media_ready", mediaType: "image", url: generatedReferencePath });
    this.wsHub.publish(runId, { type: "phase_done", phase: 2 });
  }

  async runPhase3(runId, runConfig) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 3 });
    const runState = this.runStore.getRun(runId);
    const phase3Prompts = this.promptService.loadPhasePrompts("phase3");
    const taurusClient = this.createTaurusClient(runConfig);

    const iterationList = [];
    let currentIteration = 1;
    let passDecision = false;
    let finalVideoPath = "";

    while (!passDecision && currentIteration <= runConfig.video.maxIterations) {
      const generatedVideoPath = path.join(this.outputsDirectory, `${runId}-iteration-${currentIteration}.mp4`);
      const taurusResult = await taurusClient.generateVideo(runState.phase1Result.scenario, {
        referenceImages: runState.phase2Result.referenceSheets.slice(0, runConfig.image.maxReferenceSheets),
        duration: runConfig.video.defaultDuration,
        model: runConfig.video.model,
        aspectRatio: runConfig.video.aspectRatio,
        resolution: runConfig.video.resolution,
        extensionSeconds: runConfig.video.extensionSeconds,
        maxTotalSeconds: runConfig.video.maxTotalSeconds,
        postProcessingWait: runConfig.video.postProcessingWait,
        pollInterval: runConfig.video.pollInterval,
        splitModel: runConfig.video.splitModel,
        outputPath: generatedVideoPath,
        onStatus: async (status, payload) => {
          this.wsHub.publish(runId, {
            type: "video_generating",
            segment: payload.segment,
            totalSegments: payload.totalSegments,
            status,
          });
        },
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

      const phase3EvaluatorCatalog = [
        { key: "actionEval", name: "행동 묘사 평가", role: "action", prompt: phase3Prompts.action_eval_expert },
        { key: "characterEval", name: "캐릭터 평가", role: "character", prompt: phase3Prompts.character_eval_expert },
        { key: "scenarioEval", name: "시나리오 정합성 평가", role: "scenario", prompt: phase3Prompts.scenario_eval_expert },
      ];
      const activeEvaluators = phase3EvaluatorCatalog.filter((expertDefinition) => runConfig.experts.phase3[expertDefinition.key]);

      const evaluationDebate = await this.debateEngine.runDebate({
        experts: activeEvaluators,
        facilitatorPrompt: phase3Prompts.facilitator,
        summarizerPrompt: phase3Prompts.summarizer,
        context: runState.phase1Result.scenario,
        videoPath: taurusResult.outputPath,
        rounds: runConfig.debate.rounds,
        parallelExperts: runConfig.debate.parallelExperts,
        emitEvent: async (eventPayload) => this.wsHub.publish(runId, eventPayload),
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

  async runPhase4(runId) {
    this.wsHub.publish(runId, { type: "phase_start", phase: 4 });
    const runState = this.runStore.getRun(runId);
    const phase4Prompts = this.promptService.loadPhasePrompts("phase4");

    const editSpecText = await this.geminiClient.callGemini(phase4Prompts.editor_expert, {
      scenario: runState.phase1Result.scenario,
      sourceVideo: runState.phase3Result.finalVideo,
      ffmpeg: runState.configSnapshot.ffmpeg,
    });

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
