const path = require("node:path");
const express = require("express");
const { AppError } = require("../http/errors/AppError");
const { errorHandler } = require("../http/middlewares/errorHandler");
const { createRunRoutes } = require("../routes/runRoutes");
const { createPromptRoutes } = require("../routes/promptRoutes");
const { createAssetRoutes } = require("../routes/assetRoutes");
const { createSettingsRoutes } = require("../routes/settingsRoutes");
const { createWebRoutes } = require("../routes/webRoutes");
const { createDriveRoutes } = require("../routes/driveRoutes");

function createApp({ uploadsDirectory, outputsDirectory, promptService, geminiClient, runStore, settingsService, assetService, pipelineOrchestrator, uploadMiddleware }) {
  const app = express();

  app.use(express.json({ limit: "20mb" }));
  app.use("/uploads", express.static(uploadsDirectory));
  app.use("/outputs", express.static(outputsDirectory));
  app.use(express.static(path.resolve("public")));

  app.use(createSettingsRoutes({ settingsService }));
  app.use(createRunRoutes({ runStore, settingsService, assetService, pipelineOrchestrator, uploadMiddleware }));
  app.use(createPromptRoutes({ promptService, geminiClient }));
  app.use(createAssetRoutes({ assetService, uploadMiddleware }));
  app.use(createDriveRoutes({ assetService, uploadMiddleware, runStore, pipelineOrchestrator }));
  app.use(createWebRoutes());

  app.use((error, _request, _response, next) => {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    const messageText = String(error?.message || "");
    if (messageText.includes("not found")) {
      next(AppError.notFound(error.message, null, "RESOURCE_NOT_FOUND"));
      return;
    }
    if (messageText.includes("찾을 수 없습니다") || messageText.includes("지원하지 않는")) {
      next(AppError.badRequest(error.message, null, "REQUEST_REJECTED"));
      return;
    }
    next(error);
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
