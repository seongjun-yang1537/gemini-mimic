const fs = require("node:fs");
const path = require("node:path");

async function runPhase4({ runId, services, runSafetyContext }) {
  const { runStore, promptService, geminiClient, assetService, outputsDirectory } = services;
  const runState = runStore.getRun(runId);
  const phase4Prompts = promptService.loadPhasePrompts("phase4");

  const editSpecText = await geminiClient.callGemini(
    phase4Prompts.editor_expert,
    {
      scenario: runState.phase1Result.scenario,
      sourceVideo: runState.phase3Result.finalVideo,
    },
    { safetyContext: runSafetyContext, onUsage: runSafetyContext.onUsage },
  );

  const finalCreativePath = path.join(outputsDirectory, `${runId}-final-creative.mp4`);

  let exportAsset = null;
  if (assetService && fs.existsSync(finalCreativePath)) {
    exportAsset = assetService.registerAssetFromFile(finalCreativePath, {
      category: "export",
      tagSeed: `${runId}_final_creative`,
      sourceRunId: runId,
      sourcePhase: 4,
    });
  }

  return {
    phase4Result: {
      editSpec: editSpecText,
      finalCreative: finalCreativePath,
      exportAssetId: exportAsset?.id,
    },
    emittedEvents: [{ type: "media_ready", mediaType: "video", url: finalCreativePath }],
  };
}

module.exports = { runPhase4 };
