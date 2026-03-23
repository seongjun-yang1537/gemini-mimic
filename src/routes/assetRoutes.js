const path = require("node:path");
const express = require("express");
const { AppError } = require("../http/errors/AppError");
const { validateRequest } = require("../http/middlewares/validateRequest");
const { asyncRoute } = require("../http/middlewares/errorHandler");

function createAssetRoutes({ assetService, uploadMiddleware }) {
  const assetRouter = express.Router();
  const allowedAssetCategoryList = ["input", "reference", "generated_image", "generated_video", "export"];
  const slugPattern = /^[a-zA-Z0-9_-]+$/;

  assetRouter.get(
    "/api/assets",
    validateRequest({
      query: (queryPayload = {}) => {
        const validationErrors = [];
        if (queryPayload.category !== undefined && !allowedAssetCategoryList.includes(queryPayload.category)) {
          validationErrors.push({ field: "query.category", message: "지원하지 않는 category입니다." });
        }
        if (queryPayload.q !== undefined && typeof queryPayload.q !== "string") {
          validationErrors.push({ field: "query.q", message: "q는 문자열이어야 합니다." });
        }
        return validationErrors;
      },
    }),
    (request, response) => {
      const filteredAssetList = assetService.listAssets({
        category: request.query.category,
        queryText: request.query.q,
      });
      response.json(filteredAssetList);
    },
  );

  assetRouter.get(
    "/api/assets/resolve/:tagId",
    validateRequest({
      params: (routeParams = {}) => {
        if (!routeParams.tagId || !slugPattern.test(routeParams.tagId)) {
          return { field: "params.tagId", message: "tagId 형식이 올바르지 않습니다." };
        }
        return null;
      },
    }),
    asyncRoute(async (request, response) => {
      const resolvedAsset = assetService.resolveTag(request.params.tagId);
      response.json(resolvedAsset);
    }),
  );

  assetRouter.post(
    "/api/assets/resolve-prompt",
    validateRequest({
      body: (bodyPayload = {}) => {
        if (typeof bodyPayload.prompt !== "string") {
          return { field: "body.prompt", message: "prompt는 문자열이어야 합니다." };
        }
        return null;
      },
    }),
    (request, response) => {
      response.json(assetService.resolvePrompt(request.body.prompt));
    },
  );

  assetRouter.get("/api/assets/:id/file", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.id);
    if (!assetItem) {
      throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
    }
    response.type(assetItem.mimeType);
    response.sendFile(path.resolve(assetItem.filePath));
  });

  assetRouter.get("/api/assets/:id/thumbnail", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.id);
    if (!assetItem) {
      throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
    }
    response.type(assetItem.mimeType);
    response.sendFile(path.resolve(assetItem.filePath));
  });

  assetRouter.get("/api/assets/:id", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.id);
    if (!assetItem) {
      throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
    }
    response.json(assetItem);
  });

  assetRouter.post(
    "/api/assets/upload",
    uploadMiddleware.single("file"),
    validateRequest({
      body: (bodyPayload = {}, requestContext) => {
        const validationErrors = [];
        if (bodyPayload.tagId !== undefined && (!bodyPayload.tagId || !slugPattern.test(bodyPayload.tagId))) {
          validationErrors.push({ field: "body.tagId", message: "tagId는 영문/숫자/_/-만 허용됩니다." });
        }
        if (!requestContext.file?.path) {
          validationErrors.push({ field: "file", message: "업로드 파일이 필요합니다." });
        }
        return validationErrors;
      },
    }),
    (request, response) => {
      const uploadedAsset = assetService.registerAssetFromFile(request.file.path, {
        category: "reference",
        tagSeed: request.body?.tagId || request.file.originalname,
        originalFileName: request.file.originalname,
      });
      response.status(201).json(uploadedAsset);
    },
  );

  assetRouter.patch(
    "/api/assets/:id",
    validateRequest({
      params: (routeParams = {}) => {
        if (!routeParams.id || !slugPattern.test(routeParams.id)) {
          return { field: "params.id", message: "id 형식이 올바르지 않습니다." };
        }
        return null;
      },
      body: (bodyPayload = {}) => {
        if (!bodyPayload || typeof bodyPayload !== "object" || Array.isArray(bodyPayload)) {
          return { field: "body", message: "요청 본문은 객체여야 합니다." };
        }
        if (bodyPayload.tagId !== undefined && (!bodyPayload.tagId || !slugPattern.test(bodyPayload.tagId))) {
          return { field: "body.tagId", message: "tagId는 영문/숫자/_/-만 허용됩니다." };
        }
        if (bodyPayload.fileName !== undefined && typeof bodyPayload.fileName !== "string") {
          return { field: "body.fileName", message: "fileName은 문자열이어야 합니다." };
        }
        return null;
      },
    }),
    asyncRoute(async (request, response) => {
      const updatedAsset = assetService.updateAsset(request.params.id, {
        tagId: request.body?.tagId,
        fileName: request.body?.fileName,
      });
      response.json(updatedAsset);
    }),
  );

  assetRouter.delete("/api/assets/:id", (request, response) => {
    const deletedAsset = assetService.deleteAsset(request.params.id);
    if (!deletedAsset) {
      throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
    }
    response.status(204).send();
  });

  return assetRouter;
}

module.exports = { createAssetRoutes };
