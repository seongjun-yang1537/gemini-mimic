const express = require("express");

function createRunRoutes({ runStore, executePipeline, assetService, settingsService, uploadMiddleware }) {
  const runRouter = express.Router();

  runRouter.post("/api/run", uploadMiddleware.single("video"), (request, response) => {
    try {
      const currentConfig = settingsService.readConfig();
      if (!currentConfig.gemini.apiKey) {
        response.status(400).json({ error: "Gemini API 키를 먼저 설정하세요." });
        return;
      }

      const uploadedVideoPath = request.file?.path;
      if (!uploadedVideoPath) {
        response.status(400).json({ error: "video 파일이 필요합니다." });
        return;
      }

      const registeredInputAsset = assetService.registerAssetFromFile(uploadedVideoPath, {
        category: "input",
        tagSeed: request.file.originalname,
        originalFileName: request.file.originalname,
      });

      const createdRun = runStore.createRun(registeredInputAsset.filePath, currentConfig);
      runStore.updateRun(createdRun.id, { inputAssetId: registeredInputAsset.id });
      executePipeline(createdRun.id).catch(() => {});

      response.status(201).json(runStore.getRun(createdRun.id));
    } catch (error) {
      response.status(500).json({ error: error.message });
    }
  });

  runRouter.get("/api/run", (_request, response) => {
    response.json(runStore.listRuns());
  });

  runRouter.get("/api/run/:id", (request, response) => {
    const foundRun = runStore.getRun(request.params.id);
    if (!foundRun) {
      response.status(404).json({ error: "run not found" });
      return;
    }
    response.json(foundRun);
  });

  runRouter.get("/api/run/:id/logs", (request, response) => {
    const foundRun = runStore.getRun(request.params.id);
    if (!foundRun) {
      response.status(404).json({ error: "run not found" });
      return;
    }
    response.json({
      phase1: foundRun.phase1Result?.debateLog || null,
      phase3: foundRun.phase3Result?.iterations?.map((iteration) => iteration.evaluation) || [],
    });
  });

  runRouter.get("/api/run/:id/result", (request, response) => {
    const foundRun = runStore.getRun(request.params.id);
    if (!foundRun) {
      response.status(404).json({ error: "run not found" });
      return;
    }
    response.json(foundRun);
  });

  runRouter.delete("/api/run/:id", (request, response) => {
    runStore.deleteRun(request.params.id);
    response.status(204).send();
  });

  return runRouter;
}

module.exports = {
  createRunRoutes,
};
