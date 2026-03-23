const express = require("express");
const { AppError } = require("../http/errors/AppError");
const { asyncRoute } = require("../http/middlewares/errorHandler");

function createRunRoutes({ runStore, settingsService, assetService, pipelineOrchestrator, uploadMiddleware }) {
  const runRouter = express.Router();

  runRouter.post(
    "/api/run",
    uploadMiddleware.single("video"),
    asyncRoute(async (request, response) => {
      const currentConfig = settingsService.readConfig();
      if (!currentConfig.gemini.apiKey) {
        throw AppError.badRequest("Gemini API 키를 먼저 설정하세요.", null, "MISSING_API_KEY");
      }

      const uploadedVideoPath = request.file?.path;
      if (!uploadedVideoPath) {
        throw AppError.badRequest("video 파일이 필요합니다.", [{ field: "video", message: "multipart 파일이 없습니다." }], "VIDEO_FILE_REQUIRED");
      }

      const registeredInputAsset = assetService.registerAssetFromFile(uploadedVideoPath, {
        category: "input",
        tagSeed: request.file.originalname,
        originalFileName: request.file.originalname,
      });

      const createdRun = runStore.createRun(registeredInputAsset.filePath, currentConfig);
      runStore.updateRun(createdRun.id, { inputAssetId: registeredInputAsset.id });
      pipelineOrchestrator.execute(createdRun.id).catch(() => {});

      response.status(201).json(runStore.getRun(createdRun.id));
    }),
  );

  runRouter.get("/api/run", (_request, response) => {
    response.json(runStore.listRuns());
  });

  runRouter.get("/api/run/:id", (request, response) => {
    const foundRun = runStore.getRun(request.params.id);
    if (!foundRun) {
      throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
    }
    response.json(foundRun);
  });

  runRouter.get("/api/run/:id/logs", (request, response) => {
    const foundRun = runStore.getRun(request.params.id);
    if (!foundRun) {
      throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
    }
    response.json({
      phase1: foundRun.phase1Result?.debateLog || null,
      phase3: foundRun.phase3Result?.iterations?.map((iterationResult) => iterationResult.evaluation) || [],
    });
  });

  runRouter.get("/api/run/:id/result", (request, response) => {
    const foundRun = runStore.getRun(request.params.id);
    if (!foundRun) {
      throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
    }
    response.json(foundRun);
  });

  runRouter.delete("/api/run/:id", (request, response) => {
    runStore.deleteRun(request.params.id);
    response.status(204).send();
  });

  return runRouter;
}

module.exports = { createRunRoutes };
