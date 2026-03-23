const path = require("node:path");
const express = require("express");

function createWebRoutes() {
  const webRouter = express.Router();

  webRouter.get("/run/:id", (_request, response) => {
    response.sendFile(path.resolve("public/run.html"));
  });

  webRouter.get("/run/:id/result", (_request, response) => {
    response.sendFile(path.resolve("public/result.html"));
  });

  webRouter.get("/prompts", (_request, response) => {
    response.sendFile(path.resolve("public/prompts.html"));
  });

  webRouter.get("/assets", (_request, response) => {
    response.sendFile(path.resolve("public/assets.html"));
  });

  webRouter.get("/settings", (_request, response) => {
    response.sendFile(path.resolve("public/settings.html"));
  });

  webRouter.get("/{*fallbackPath}", (_request, response) => {
    response.sendFile(path.resolve("public/index.html"));
  });

  return webRouter;
}

module.exports = { createWebRoutes };
