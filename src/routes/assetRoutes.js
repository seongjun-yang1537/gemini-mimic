const path = require("node:path");
const express = require("express");

function createAssetRoutes({ assetService, uploadMiddleware }) {
  const assetRouter = express.Router();

  assetRouter.get("/api/assets", (request, response) => {
    const filteredAssets = assetService.listAssets({
      category: request.query.category,
      queryText: request.query.q,
    });
    response.json(filteredAssets);
  });

  assetRouter.get("/api/assets/resolve/:tagId", (request, response) => {
    try {
      const resolvedAsset = assetService.resolveTag(request.params.tagId);
      response.json(resolvedAsset);
    } catch (error) {
      response.status(404).json({ error: error.message });
    }
  });

  assetRouter.post("/api/assets/resolve-prompt", (request, response) => {
    const { prompt } = request.body;
    if (typeof prompt !== "string") {
      response.status(400).json({ error: "prompt는 문자열이어야 합니다." });
      return;
    }
    response.json(assetService.resolvePrompt(prompt));
  });

  assetRouter.get("/api/assets/:id/file", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.id);
    if (!assetItem) {
      response.status(404).json({ error: "asset not found" });
      return;
    }
    response.type(assetItem.mimeType);
    response.sendFile(path.resolve(assetItem.filePath));
  });

  assetRouter.get("/api/assets/:id/thumbnail", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.id);
    if (!assetItem) {
      response.status(404).json({ error: "asset not found" });
      return;
    }
    response.type(assetItem.mimeType);
    response.sendFile(path.resolve(assetItem.filePath));
  });

  assetRouter.get("/api/assets/:id", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.id);
    if (!assetItem) {
      response.status(404).json({ error: "asset not found" });
      return;
    }
    response.json(assetItem);
  });

  assetRouter.post("/api/assets/upload", uploadMiddleware.single("file"), (request, response) => {
    if (!request.file?.path) {
      response.status(400).json({ error: "업로드 파일이 필요합니다." });
      return;
    }

    const uploadedAsset = assetService.registerAssetFromFile(request.file.path, {
      category: "reference",
      tagSeed: request.body?.tagId || request.file.originalname,
      originalFileName: request.file.originalname,
    });
    response.status(201).json(uploadedAsset);
  });

  assetRouter.patch("/api/assets/:id", (request, response) => {
    try {
      const updatedAsset = assetService.updateAsset(request.params.id, {
        tagId: request.body?.tagId,
        fileName: request.body?.fileName,
      });
      response.json(updatedAsset);
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  assetRouter.delete("/api/assets/:id", (request, response) => {
    const deletedAsset = assetService.deleteAsset(request.params.id);
    if (!deletedAsset) {
      response.status(404).json({ error: "asset not found" });
      return;
    }
    response.status(204).send();
  });

  return assetRouter;
}

module.exports = {
  createAssetRoutes,
};
