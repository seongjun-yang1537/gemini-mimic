const fs = require("node:fs");
const path = require("node:path");

async function runPhase2({ runId, services, runSafetyContext }) {
  const { runStore, promptService, geminiClient, assetService, outputsDirectory } = services;
  const runState = await runStore.getRun(runId);
  const phase2Prompts = await promptService.loadPhasePrompts("phase2");

  const assetListText = await geminiClient.callGemini(
    phase2Prompts.reference_expert,
    runState.phase1Result.scenario,
    { safetyContext: runSafetyContext, onUsage: runSafetyContext.onUsage },
  );

  const generatedReferencePath = path.join(outputsDirectory, `${runId}-reference-1.png`);
  const hasGeneratedReference = fs.existsSync(generatedReferencePath);
  const referenceSheets = hasGeneratedReference ? [generatedReferencePath] : [];
  const generatedReferenceAssets = [];

  if (assetService && hasGeneratedReference) {
    const storedReferenceAsset = assetService.registerAssetFromFile(generatedReferencePath, {
      category: "generated_image",
      tagSeed: `${runId}_reference_1`,
      sourceRunId: runId,
      sourcePhase: 2,
    });
    generatedReferenceAssets.push(storedReferenceAsset);
  }

  const emittedEvents = hasGeneratedReference
    ? [{ type: "media_ready", mediaType: "image", url: generatedReferencePath }]
    : [{ type: "pipeline_error", error: "레퍼런스 이미지 파일 없음" }];

  return {
    phase2Result: {
      referenceSheets,
      referenceAssetIds: generatedReferenceAssets.map((assetItem) => assetItem.id),
      assetList: assetListText,
    },
    emittedEvents,
  };
}

module.exports = { runPhase2 };
