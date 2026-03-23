const fs = require("node:fs");
const path = require("node:path");
const { PHASE3_MAX_ITERATIONS_HARD_LIMIT } = require("./constants");

async function runPhase3({ runId, services, runtimeConfig, runSafetyContext }) {
  const { runStore, promptService, debateEngine, assetService, outputsDirectory, taurusApi, emitEvent } = services;
  const runState = runStore.getRun(runId);
  const phase3Prompts = promptService.loadPhasePrompts("phase3");

  const iterationList = [];
  let currentIteration = 1;
  let passDecision = false;
  let finalVideoPath = "";
  const maxIterations = Math.min(runtimeConfig.video.maxIterations, PHASE3_MAX_ITERATIONS_HARD_LIMIT);

  while (!passDecision && currentIteration <= maxIterations) {
    const generatedVideoPath = path.join(outputsDirectory, `${runId}-iteration-${currentIteration}.mp4`);
    const referenceImagePaths = Array.isArray(runState.phase2Result?.referenceSheets)
      ? runState.phase2Result.referenceSheets.filter((referencePathItem) => fs.existsSync(referencePathItem))
      : [];

    const taurusGenerationOptions = {
      duration: runtimeConfig.video.defaultDuration,
      aspectRatio: runtimeConfig.video.aspectRatio,
      splitModel: runtimeConfig.video.splitModel,
      pollIntervalMs: runtimeConfig.video.pollInterval,
      maxPollAttempts: runtimeConfig.video.maxPollAttempts,
      maxPollMs: runtimeConfig.video.pollTimeoutMs,
      postProcessingWait: runtimeConfig.video.postProcessingWait,
      outputPath: generatedVideoPath,
      onApiCall: () => {
        runSafetyContext.apiGuard.check();
        runSafetyContext.updateUsage();
      },
      onStatus: async (status, payload) => {
        await emitEvent({
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

    await emitEvent({ type: "media_ready", mediaType: "video", url: taurusResult.outputPath });

    let generatedVideoAsset = null;
    if (assetService) {
      generatedVideoAsset = assetService.registerAssetFromFile(taurusResult.outputPath, {
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

    const evaluationDebate = await debateEngine.runDebate({
      experts: evaluatorDefinitions,
      facilitatorPrompt: phase3Prompts.facilitator,
      summarizerPrompt: phase3Prompts.summarizer,
      context: runState.phase1Result.scenario,
      videoPath: taurusResult.outputPath,
      rounds: runtimeConfig.debate.rounds,
      parallelExperts: runtimeConfig.debate.parallelExperts,
      emitEvent,
      safetyContext: runSafetyContext,
      onUsage: runSafetyContext.onUsage,
    });

    const verdictText = evaluationDebate.summary.toLowerCase();
    passDecision = verdictText.includes("pass") || verdictText.includes("합격");

    await emitEvent({
      type: "verdict",
      result: passDecision ? "pass" : "fail",
      iteration: currentIteration,
    });

    if (generatedVideoAsset) {
      generatedVideoAsset = assetService.updateAsset(generatedVideoAsset.id, {
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

  return {
    phase3Result: {
      iterations: iterationList,
      finalVideo: finalVideoPath,
    },
  };
}

module.exports = { runPhase3 };
