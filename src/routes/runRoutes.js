const express = require("express");
const { AppError } = require("../http/errors/AppError");
const { asyncRoute } = require("../http/middlewares/errorHandler");

function normalizeReferenceAssetIds(rawReferenceAssetIds) {
  if (!rawReferenceAssetIds) {
    return [];
  }
  if (Array.isArray(rawReferenceAssetIds)) {
    return rawReferenceAssetIds.map((referenceAssetId) => String(referenceAssetId).trim()).filter(Boolean);
  }
  if (typeof rawReferenceAssetIds === "string") {
    const trimmedReferenceAssetIds = rawReferenceAssetIds.trim();
    if (!trimmedReferenceAssetIds) {
      return [];
    }
    if (trimmedReferenceAssetIds.startsWith("[")) {
      try {
        const parsedReferenceAssetIds = JSON.parse(trimmedReferenceAssetIds);
        if (Array.isArray(parsedReferenceAssetIds)) {
          return parsedReferenceAssetIds.map((referenceAssetId) => String(referenceAssetId).trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return trimmedReferenceAssetIds.split(",").map((referenceAssetId) => referenceAssetId.trim()).filter(Boolean);
  }
  return [];
}

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
      const inputText = typeof request.body?.inputText === "string" ? request.body.inputText.trim() : "";
      const existingInputAssetId = typeof request.body?.inputAssetId === "string" ? request.body.inputAssetId.trim() : "";
      const referenceAssetIdList = normalizeReferenceAssetIds(request.body?.referenceAssetIds);

      let inputVideoPath = null;
      let inputAssetId = null;

      if (uploadedVideoPath) {
        const registeredInputAsset = assetService.registerAssetFromFile(uploadedVideoPath, {
          category: "input",
          tagSeed: request.file.originalname,
          originalFileName: request.file.originalname,
        });
        inputVideoPath = registeredInputAsset.filePath;
        inputAssetId = registeredInputAsset.id;
      } else if (existingInputAssetId) {
        const selectedInputAsset = assetService.getAssetById(existingInputAssetId);
        if (!selectedInputAsset) {
          throw AppError.badRequest("선택한 입력 에셋이 존재하지 않습니다.", [{ field: "inputAssetId", message: "asset not found" }], "INPUT_ASSET_NOT_FOUND");
        }
        if (!selectedInputAsset.mimeType.startsWith("video/")) {
          throw AppError.badRequest("입력 에셋은 영상 파일이어야 합니다.", [{ field: "inputAssetId", message: "video/* mime type required" }], "INPUT_ASSET_NOT_VIDEO");
        }
        inputVideoPath = selectedInputAsset.filePath;
        inputAssetId = selectedInputAsset.id;
      }

      if (!inputVideoPath && !inputText) {
        throw AppError.badRequest(
          "영상 또는 텍스트 입력이 필요합니다.",
          [{ field: "video|inputText|inputAssetId", message: "최소 1개 입력이 필요합니다." }],
          "RUN_INPUT_REQUIRED",
        );
      }

      const resolvedReferenceAssets = referenceAssetIdList.map((referenceAssetId) => {
        const referenceAsset = assetService.getAssetById(referenceAssetId);
        if (!referenceAsset) {
          throw AppError.badRequest(
            "선택한 레퍼런스 에셋이 존재하지 않습니다.",
            [{ field: "referenceAssetIds", message: `${referenceAssetId}: asset not found` }],
            "REFERENCE_ASSET_NOT_FOUND",
          );
        }
        if (!referenceAsset.mimeType.startsWith("image/")) {
          throw AppError.badRequest(
            "레퍼런스 에셋은 이미지 파일이어야 합니다.",
            [{ field: "referenceAssetIds", message: `${referenceAssetId}: image/* mime type required` }],
            "REFERENCE_ASSET_NOT_IMAGE",
          );
        }
        return referenceAsset;
      });

      const createdRun = await runStore.createRun({
        inputVideo: inputVideoPath || undefined,
        inputText: inputText || undefined,
        inputAssetId: inputAssetId || undefined,
        selectedReferenceAssets: resolvedReferenceAssets.map((referenceAsset) => ({
          id: referenceAsset.id,
          filePath: referenceAsset.filePath,
          fileName: referenceAsset.fileName,
          tagId: referenceAsset.tagId,
        })),
      }, currentConfig);
      pipelineOrchestrator.execute(createdRun.id).catch(() => {});

      response.status(201).json(await runStore.getRun(createdRun.id));
    }),
  );

  runRouter.get(
    "/api/run",
    asyncRoute(async (_request, response) => {
      response.json(await runStore.listRuns());
    }),
  );

  runRouter.get("/api/run/:id", asyncRoute(async (request, response) => {
    const foundRun = await runStore.getRun(request.params.id);
    if (!foundRun) {
      throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
    }
    response.json(foundRun);
  }));

  runRouter.get("/api/run/:id/logs", asyncRoute(async (request, response) => {
    const foundRun = await runStore.getRun(request.params.id);
    if (!foundRun) {
      throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
    }
    response.json({
      phase1: foundRun.phase1Result?.debateLog || null,
      phase3: foundRun.phase3Result?.iterations?.map((iterationResult) => iterationResult.evaluation) || [],
    });
  }));

  runRouter.get("/api/run/:id/result", asyncRoute(async (request, response) => {
    const foundRun = await runStore.getRun(request.params.id);
    if (!foundRun) {
      throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
    }
    response.json(foundRun);
  }));

  runRouter.delete("/api/run/:id", asyncRoute(async (request, response) => {
    await runStore.deleteRun(request.params.id);
    response.status(204).send();
  }));

  return runRouter;
}

module.exports = { createRunRoutes };
