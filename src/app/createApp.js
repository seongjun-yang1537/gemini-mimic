const express = require("express");

function createApp({
  uploadsDirectory,
  outputsDirectory,
  publicDirectory,
  runRoutes,
  promptRoutes,
  assetRoutes,
  settingsRoutes,
  webRoutes,
}) {
  const app = express();

  app.use(express.json({ limit: "20mb" }));
  app.use("/uploads", express.static(uploadsDirectory));
  app.use("/outputs", express.static(outputsDirectory));
  app.use(express.static(publicDirectory));

  if (runRoutes) {
    app.use(runRoutes);
  }
  if (promptRoutes) {
    app.use(promptRoutes);
  }
  if (assetRoutes) {
    app.use(assetRoutes);
  }
  if (settingsRoutes) {
    app.use(settingsRoutes);
  }
  if (webRoutes) {
    app.use(webRoutes);
  }

  return app;
}

module.exports = {
  createApp,
};
