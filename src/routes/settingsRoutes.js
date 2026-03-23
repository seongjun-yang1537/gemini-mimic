const express = require("express");
const { AppError } = require("../http/errors/AppError");
const { validateRequest } = require("../http/middlewares/validateRequest");
const { asyncRoute } = require("../http/middlewares/errorHandler");

function getValueByPath(sourceObject, keyPath) {
  return keyPath.split(".").reduce((currentValue, keyPart) => {
    if (currentValue === undefined || currentValue === null) {
      return undefined;
    }
    return currentValue[keyPart];
  }, sourceObject);
}

function deleteValueByPath(targetObject, keyPath) {
  const keyParts = keyPath.split(".");
  let currentNode = targetObject;
  for (let index = 0; index < keyParts.length - 1; index += 1) {
    const keyPart = keyParts[index];
    if (!currentNode[keyPart] || typeof currentNode[keyPart] !== "object") {
      return;
    }
    currentNode = currentNode[keyPart];
  }
  delete currentNode[keyParts[keyParts.length - 1]];
}

function sanitizeSettingsPayload({ settings, defaults, schema }) {
  const sanitizedSettings = JSON.parse(JSON.stringify(settings));
  const sanitizedDefaults = JSON.parse(JSON.stringify(defaults));
  const sanitizedSchema = {};

  for (const [keyPath, schemaEntry] of Object.entries(schema)) {
    if (schemaEntry.hidden) {
      deleteValueByPath(sanitizedSettings, keyPath);
      deleteValueByPath(sanitizedDefaults, keyPath);
      continue;
    }

    const sanitizedSchemaEntry = { ...schemaEntry };
    if (sanitizedSchemaEntry.sensitive) {
      deleteValueByPath(sanitizedSettings, keyPath);
      deleteValueByPath(sanitizedDefaults, keyPath);
      sanitizedSchemaEntry.masked = true;
    }

    sanitizedSchema[keyPath] = sanitizedSchemaEntry;
  }

  return { settings: sanitizedSettings, defaults: sanitizedDefaults, schema: sanitizedSchema };
}

function createSettingsRoutes({ settingsService }) {
  const settingsRouter = express.Router();
  const supportedCategoryList = ["gemini", "pipeline", "experts", "video", "safety"];

  settingsRouter.get("/api/settings", (_request, response) => {
    const responsePayload = sanitizeSettingsPayload({
      settings: settingsService.getSettings(),
      defaults: settingsService.getDefaults(),
      schema: settingsService.getSchema(),
    });

    response.json(responsePayload);
  });

  settingsRouter.get("/api/settings/defaults", (_request, response) => {
    const responsePayload = sanitizeSettingsPayload({
      settings: settingsService.getSettings(),
      defaults: settingsService.getDefaults(),
      schema: settingsService.getSchema(),
    });

    response.json({ defaults: responsePayload.defaults, schema: responsePayload.schema });
  });

  settingsRouter.patch(
    "/api/settings",
    validateRequest({
      body: (bodyPayload) => {
        if (!bodyPayload || typeof bodyPayload !== "object" || Array.isArray(bodyPayload)) {
          return { field: "body", message: "요청 본문은 객체여야 합니다." };
        }

        for (const [patchKeyPath] of Object.entries(bodyPayload)) {
          const schemaEntry = settingsService.getSchema()[patchKeyPath];
          if (!schemaEntry) {
            continue;
          }
          if (schemaEntry.hidden || schemaEntry.sensitive) {
            return { field: patchKeyPath, message: "운영자 전용 또는 민감 설정은 수정할 수 없습니다." };
          }
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

      const responsePayload = sanitizeSettingsPayload({
        settings: settingsService.getSettings(),
        defaults: settingsService.getDefaults(),
        schema: settingsService.getSchema(),
      });

      response.json({
        settings: responsePayload.settings,
        savedAt: new Date().toISOString(),
        hasApiKey: Boolean(getValueByPath(updatedConfig, "gemini.apiKey")),
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

      const responsePayload = sanitizeSettingsPayload({
        settings: settingsService.getSettings(),
        defaults: settingsService.getDefaults(),
        schema: settingsService.getSchema(),
      });

      response.json({
        settings: responsePayload.settings,
        hasApiKey: Boolean(getValueByPath(resetConfig, "gemini.apiKey")),
      });
    }),
  );

  return settingsRouter;
}

module.exports = { createSettingsRoutes };
