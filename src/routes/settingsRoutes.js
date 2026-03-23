const express = require("express");

function createSettingsRoutes({ settingsService }) {
  const settingsRouter = express.Router();

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

  settingsRouter.patch("/api/settings", (request, response) => {
    try {
      const updatedConfig = settingsService.patchSettings(request.body || {});
      response.json({
        settings: settingsService.getSettings(),
        savedAt: new Date().toISOString(),
        hasApiKey: Boolean(updatedConfig.gemini.apiKey),
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  settingsRouter.post("/api/settings/reset", (request, response) => {
    try {
      const resetConfig = settingsService.resetSettings(request.body?.category);
      response.json({
        settings: settingsService.getSettings(),
        hasApiKey: Boolean(resetConfig.gemini.apiKey),
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  return settingsRouter;
}

module.exports = {
  createSettingsRoutes,
};
