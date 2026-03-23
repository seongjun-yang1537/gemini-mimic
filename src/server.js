// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const multer = require("multer");
const { GeminiClient } = require("./services/geminiClient");
const { DebateEngine } = require("./services/debateEngine");
const { PromptService } = require("./services/promptService");
const { RunStore } = require("./store/runStore");
const { AssetStore } = require("./store/assetStore");
const { AssetService } = require("./services/assetService");
const { PipelineOrchestrator } = require("./services/pipelineOrchestrator");
const { RunWebSocketHub } = require("./services/wsHub");
const { SettingsService } = require("./services/settingsService");
const { getLoadedGeminiApiKey } = require("./config/environment");
const { AppError } = require("./http/errors/AppError");
const { validateRequest } = require("./http/middlewares/validateRequest");
const { asyncRoute, errorHandler } = require("./http/middlewares/errorHandler");

const portNumber = Number(process.env.PORT || 3000);
const uploadsDirectory = path.resolve(process.env.UPLOADS_DIR || "./uploads");
const promptsDirectory = path.resolve(process.env.PROMPTS_DIR || "./prompts");
const assetsDirectory = path.resolve(process.env.ASSETS_DIR || "./assets");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const uploadMiddleware = multer({ dest: uploadsDirectory });
const app = express();
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(uploadsDirectory));
app.use("/outputs", express.static(path.resolve(process.env.OUTPUTS_DIR || "./outputs")));
app.use(express.static(path.resolve("public")));

const runStore = new RunStore();
const assetStore = new AssetStore();
const assetService = new AssetService({ assetStore, assetsRootPath: assetsDirectory });
const settingsService = new SettingsService({ envApiKey: getLoadedGeminiApiKey() });
const activeSettings = settingsService.readConfig();
if (!activeSettings.gemini.apiKey) {
  throw new Error("Gemini API 키가 필요합니다. .env 또는 /settings에서 설정하세요.");
}

const geminiClient = new GeminiClient({
  apiKey: activeSettings.gemini.apiKey,
  model: activeSettings.gemini.model,
  temperature: activeSettings.gemini.temperature,
  maxOutputTokens: activeSettings.gemini.maxOutputTokens,
  assetService,
});
const debateEngine = new DebateEngine({ geminiClient });
const promptService = new PromptService(promptsDirectory);

const server = http.createServer(app);
const wsHub = new RunWebSocketHub(server);
const pipelineOrchestrator = new PipelineOrchestrator({
  runStore,
  promptService,
  debateEngine,
  geminiClient,
  wsHub,
  assetService,
  settingsService,
});

const categoryList = ["gemini", "pipeline", "experts", "video", "safety"];
const assetCategoryList = ["input", "reference", "generated_image", "generated_video", "export"];
const slugPattern = /^[a-zA-Z0-9_-]+$/;

function validatePromptParams(routeParams = {}) {
  const validationErrors = [];
  if (!routeParams.phase || !slugPattern.test(routeParams.phase)) {
    validationErrors.push({ field: "params.phase", message: "phase는 영문/숫자/_/-만 허용됩니다." });
  }
  if (!routeParams.expert || !slugPattern.test(routeParams.expert)) {
    validationErrors.push({ field: "params.expert", message: "expert는 영문/숫자/_/-만 허용됩니다." });
  }
  return validationErrors;
}

app.get("/api/settings", (_request, response) => {
  response.json({
    settings: settingsService.getSettings(),
    defaults: settingsService.getDefaults(),
    schema: settingsService.getSchema(),
  });
});

app.get("/api/settings/defaults", (_request, response) => {
  response.json({ defaults: settingsService.getDefaults(), schema: settingsService.getSchema() });
});

app.patch(
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

app.post(
  "/api/settings/reset",
  validateRequest({
    body: (bodyPayload) => {
      if (bodyPayload === undefined) {
        return null;
      }
      if (!bodyPayload || typeof bodyPayload !== "object" || Array.isArray(bodyPayload)) {
        return { field: "body", message: "요청 본문은 객체여야 합니다." };
      }
      if (bodyPayload.category !== undefined && !categoryList.includes(bodyPayload.category)) {
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

app.post(
  "/api/run",
  uploadMiddleware.single("video"),
  asyncRoute(async (request, response) => {
    const currentConfig = settingsService.readConfig();
    if (!currentConfig.gemini.apiKey) {
      throw AppError.badRequest("Gemini API 키를 먼저 설정하세요.", null, "MISSING_API_KEY");
    }

    const uploadedVideoPath = request.file?.path;
    if (!uploadedVideoPath) {
      throw AppError.badRequest("video 파일이 필요합니다.", [{ field: "video", message: "multipart 파일이 없습니다." }], "VIDEO_FILE_REQUIRED");
    }

    const registeredInputAsset = assetService.registerAssetFromFile(uploadedVideoPath, {
      category: "input",
      tagSeed: request.file.originalname,
      originalFileName: request.file.originalname,
    });

    const createdRun = await runStore.createRun(registeredInputAsset.filePath, currentConfig);
    await runStore.updateRun(createdRun.id, { inputAssetId: registeredInputAsset.id });
    pipelineOrchestrator.execute(createdRun.id).catch(() => {});

    response.status(201).json(await runStore.getRun(createdRun.id));
  }),
);

app.get("/api/run", asyncRoute(async (_request, response) => {
  response.json(await runStore.listRuns());
}));

app.get("/api/run/:id", asyncRoute(async (request, response) => {
  const foundRun = await runStore.getRun(request.params.id);
  if (!foundRun) {
    throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
  }
  response.json(foundRun);
}));

app.get("/api/run/:id/logs", asyncRoute(async (request, response) => {
  const foundRun = await runStore.getRun(request.params.id);
  if (!foundRun) {
    throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
  }
  response.json({
    phase1: foundRun.phase1Result?.debateLog || null,
    phase3: foundRun.phase3Result?.iterations?.map((iteration) => iteration.evaluation) || [],
  });
}));

app.delete("/api/run/:id", asyncRoute(async (request, response) => {
  await runStore.deleteRun(request.params.id);
  response.status(204).send();
}));

app.get("/api/prompts", asyncRoute(async (_request, response) => {
  response.json(await promptService.listPrompts());
}));

app.get(
  "/api/prompts/:phase/:expert",
  validateRequest({ params: validatePromptParams }),
  asyncRoute(async (request, response) => {
    const promptContent = await promptService.getPrompt(request.params.phase, request.params.expert);
    response.json({ content: promptContent });
  }),
);

app.put(
  "/api/prompts/:phase/:expert",
  validateRequest({
    params: validatePromptParams,
    body: (bodyPayload = {}) => {
      if (typeof bodyPayload.content !== "string") {
        return { field: "body.content", message: "content는 문자열이어야 합니다." };
      }
      return null;
    },
  }),
  asyncRoute(async (request, response) => {
    const updateResult = await promptService.updatePrompt(request.params.phase, request.params.expert, request.body.content);
    response.json(updateResult);
  }),
);

app.post(
  "/api/prompts/ai-update",
  validateRequest({
    body: (bodyPayload = {}) => {
      if (typeof bodyPayload.feedback !== "string" || !bodyPayload.feedback.trim()) {
        return { field: "body.feedback", message: "feedback이 필요합니다." };
      }
      return null;
    },
  }),
  asyncRoute(async (request, response) => {
    const feedbackText = request.body.feedback;

    const promptList = await promptService.listPrompts();
    const promptSnapshot = await Promise.all(
      promptList.map(async (promptItem) => ({
        phase: promptItem.phase,
        expert: promptItem.expert,
        content: await promptService.getPrompt(promptItem.phase, promptItem.expert),
      })),
    );

    const updaterPrompt = await promptService.getPrompt("meta", "prompt_updater");
    const updateSuggestion = await geminiClient.callGemini(updaterPrompt, {
      feedback: feedbackText,
      prompts: promptSnapshot,
      format: "JSON array: [{phase,expert,before,after,reason}]",
    });

    response.json({ suggestion: updateSuggestion });
  }),
);

app.get("/api/run/:id/result", asyncRoute(async (request, response) => {
  const foundRun = await runStore.getRun(request.params.id);
  if (!foundRun) {
    throw AppError.notFound("run not found", { id: request.params.id }, "RUN_NOT_FOUND");
  }
  response.json(foundRun);
}));

app.get(
  "/api/assets",
  validateRequest({
    query: (queryPayload = {}) => {
      const validationErrors = [];
      if (queryPayload.category !== undefined && !assetCategoryList.includes(queryPayload.category)) {
        validationErrors.push({ field: "query.category", message: "지원하지 않는 category입니다." });
      }
      if (queryPayload.q !== undefined && typeof queryPayload.q !== "string") {
        validationErrors.push({ field: "query.q", message: "q는 문자열이어야 합니다." });
      }
      return validationErrors;
    },
  }),
  (request, response) => {
    const filteredAssets = assetService.listAssets({
      category: request.query.category,
      queryText: request.query.q,
    });
    response.json(filteredAssets);
  },
);

app.get(
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

app.post(
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

app.get("/api/assets/:id/file", (request, response) => {
  const assetItem = assetService.getAssetById(request.params.id);
  if (!assetItem) {
    throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
  }
  response.type(assetItem.mimeType);
  response.sendFile(path.resolve(assetItem.filePath));
});

app.get("/api/assets/:id/thumbnail", (request, response) => {
  const assetItem = assetService.getAssetById(request.params.id);
  if (!assetItem) {
    throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
  }
  response.type(assetItem.mimeType);
  response.sendFile(path.resolve(assetItem.filePath));
});

app.get("/api/assets/:id", (request, response) => {
  const assetItem = assetService.getAssetById(request.params.id);
  if (!assetItem) {
    throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
  }
  response.json(assetItem);
});

app.post(
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

app.patch(
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

app.delete("/api/assets/:id", (request, response) => {
  const deletedAsset = assetService.deleteAsset(request.params.id);
  if (!deletedAsset) {
    throw AppError.notFound("asset not found", { id: request.params.id }, "ASSET_NOT_FOUND");
  }
  response.status(204).send();
});

app.get("/run/:id", (_request, response) => {
  response.sendFile(path.resolve("public/run.html"));
});

app.get("/run/:id/result", (_request, response) => {
  response.sendFile(path.resolve("public/result.html"));
});

app.get("/prompts", (_request, response) => {
  response.sendFile(path.resolve("public/prompts.html"));
});

app.get("/assets", (_request, response) => {
  response.sendFile(path.resolve("public/assets.html"));
});

app.get("/settings", (_request, response) => {
  response.sendFile(path.resolve("public/settings.html"));
});

app.get("/{*fallbackPath}", (_request, response) => {
  response.sendFile(path.resolve("public/index.html"));
});

app.use((error, request, response, next) => {
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

server.listen(portNumber, () => {
  console.log(`Mimic server started on port ${portNumber}`);
});
