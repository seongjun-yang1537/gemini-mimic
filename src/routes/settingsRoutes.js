const express = require("express");
const { AppError } = require("../http/errors/AppError");
const { validateRequest } = require("../http/middlewares/validateRequest");
const { asyncRoute } = require("../http/middlewares/errorHandler");

function createSettingsRoutes({ settingsService }) {
  const settingsRouter = express.Router();
  const supportedCategoryList = ["gemini", "pipeline", "experts", "video", "safety"];

  settingsRouter.get("/api/settings", (_request, response) => {
    response.json({
      settings: settingsService.getSettings(),
      defaults: settingsService.getDefaults(),
      schema: settingsService.getSchema(),
    });
  });

  settingsRouter.get("/api/settings/defaults", (_request, response) => {
    response.json({ defaults: settingsService.getDefaults(), schema: settingsService.getSchema() });
  });

  settingsRouter.patch(
    "/api/settings",
    validateRequest({
      body: (bodyPayload) => {
        if (!bodyPayload || typeof bodyPayload !== "object" || Array.isArray(bodyPayload)) {
          return { field: "body", message: "요청 본문은 객체여야 합니다." };
        }
        return null;
      },
    }),
    asyncRoute(async (request, response) => {
      let updatedConfig;
      try {
        updatedConfig = settingsService.patchSettings(request.body || {});
      } catch (error) {
        throw AppError.badRequest(error.message, null, "SETTINGS_PATCH_FAILED");
      }
      response.json({
        settings: settingsService.getSettings(),
        savedAt: new Date().toISOString(),
        hasApiKey: Boolean(updatedConfig.gemini.apiKey),
      });
    }),
  );

  settingsRouter.post(
    "/api/settings/reset",
    validateRequest({
      body: (bodyPayload) => {
        if (bodyPayload === undefined) {
          return null;
        }
        if (!bodyPayload || typeof bodyPayload !== "object" || Array.isArray(bodyPayload)) {
          return { field: "body", message: "요청 본문은 객체여야 합니다." };
        }
        if (bodyPayload.category !== undefined && !supportedCategoryList.includes(bodyPayload.category)) {
          return { field: "body.category", message: "지원하지 않는 category입니다." };
        }
        return null;
      },
    }),
    asyncRoute(async (request, response) => {
      let resetConfig;
      try {
        resetConfig = settingsService.resetSettings(request.body?.category);
      } catch (error) {
        throw AppError.badRequest(error.message, null, "SETTINGS_RESET_FAILED");
      }
      response.json({
        settings: settingsService.getSettings(),
        hasApiKey: Boolean(resetConfig.gemini.apiKey),
      });
    }),
  );

  return settingsRouter;
}

module.exports = { createSettingsRoutes };
