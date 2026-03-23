const path = require("node:path");
const express = require("express");

function createWebRoutes({ publicDirectory }) {
  const webRouter = express.Router();

  webRouter.get("/run/:id", (_request, response) => {
    response.sendFile(path.resolve(publicDirectory, "run.html"));
  });

  webRouter.get("/run/:id/result", (_request, response) => {
    response.sendFile(path.resolve(publicDirectory, "result.html"));
  });

  webRouter.get("/prompts", (_request, response) => {
    response.sendFile(path.resolve(publicDirectory, "prompts.html"));
  });

  webRouter.get("/assets", (_request, response) => {
    response.sendFile(path.resolve(publicDirectory, "assets.html"));
  });

  webRouter.get("/settings", (_request, response) => {
    response.sendFile(path.resolve(publicDirectory, "settings.html"));
  });

  webRouter.get("/{*fallbackPath}", (_request, response) => {
    response.sendFile(path.resolve(publicDirectory, "index.html"));
  });

  return webRouter;
}

module.exports = {
  createWebRoutes,
};
