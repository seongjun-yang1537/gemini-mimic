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

app.patch("/api/settings", (request, response) => {
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

app.post("/api/settings/reset", (request, response) => {
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

app.post("/api/run", uploadMiddleware.single("video"), async (request, response) => {
  try {
    const currentConfig = settingsService.readConfig();
    if (!currentConfig.gemini.apiKey) {
      response.status(400).json({ error: "Gemini API 키를 먼저 설정하세요." });
      return;
    }

    const uploadedVideoPath = request.file?.path;
    if (!uploadedVideoPath) {
      response.status(400).json({ error: "video 파일이 필요합니다." });
      return;
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
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/run", async (_request, response) => {
  try {
    response.json(await runStore.listRuns());
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/run/:id", async (request, response) => {
  try {
    const foundRun = await runStore.getRun(request.params.id);
    if (!foundRun) {
      response.status(404).json({ error: "run not found" });
      return;
    }
    response.json(foundRun);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/run/:id/logs", async (request, response) => {
  try {
    const foundRun = await runStore.getRun(request.params.id);
    if (!foundRun) {
      response.status(404).json({ error: "run not found" });
      return;
    }
    response.json({
      phase1: foundRun.phase1Result?.debateLog || null,
      phase3: foundRun.phase3Result?.iterations?.map((iteration) => iteration.evaluation) || [],
    });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.delete("/api/run/:id", async (request, response) => {
  try {
    await runStore.deleteRun(request.params.id);
    response.status(204).send();
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/prompts", async (_request, response) => {
  try {
    response.json(await promptService.listPrompts());
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/prompts/:phase/:expert", async (request, response) => {
  try {
    const promptContent = await promptService.getPrompt(request.params.phase, request.params.expert);
    response.json({ content: promptContent });
  } catch (error) {
    response.status(404).json({ error: error.message });
  }
});

app.put("/api/prompts/:phase/:expert", async (request, response) => {
  const { content } = request.body;
  if (typeof content !== "string") {
    response.status(400).json({ error: "content는 문자열이어야 합니다." });
    return;
  }
  try {
    const updateResult = await promptService.updatePrompt(request.params.phase, request.params.expert, content);
    response.json(updateResult);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.post("/api/prompts/ai-update", async (request, response) => {
  const { feedback } = request.body;
  if (!feedback) {
    response.status(400).json({ error: "feedback이 필요합니다." });
    return;
  }

  try {
    const promptList = await promptService.listPrompts();
    const promptSnapshot = await Promise.all(
      promptList.map(async (prompt) => ({
        phase: prompt.phase,
        expert: prompt.expert,
        content: await promptService.getPrompt(prompt.phase, prompt.expert),
      })),
    );

    const updaterPrompt = await promptService.getPrompt("meta", "prompt_updater");
    const updateSuggestion = await geminiClient.callGemini(updaterPrompt, {
      feedback,
      prompts: promptSnapshot,
      format: "JSON array: [{phase,expert,before,after,reason}]",
    });

    response.json({ suggestion: updateSuggestion });
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/run/:id/result", async (request, response) => {
  try {
    const foundRun = await runStore.getRun(request.params.id);
    if (!foundRun) {
      response.status(404).json({ error: "run not found" });
      return;
    }
    response.json(foundRun);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/assets", (request, response) => {
  const filteredAssets = assetService.listAssets({
    category: request.query.category,
    queryText: request.query.q,
  });
  response.json(filteredAssets);
});

app.get("/api/assets/resolve/:tagId", (request, response) => {
  try {
    const resolvedAsset = assetService.resolveTag(request.params.tagId);
    response.json(resolvedAsset);
  } catch (error) {
    response.status(404).json({ error: error.message });
  }
});

app.post("/api/assets/resolve-prompt", (request, response) => {
  const { prompt } = request.body;
  if (typeof prompt !== "string") {
    response.status(400).json({ error: "prompt는 문자열이어야 합니다." });
    return;
  }
  response.json(assetService.resolvePrompt(prompt));
});

app.get("/api/assets/:id/file", (request, response) => {
  const assetItem = assetService.getAssetById(request.params.id);
  if (!assetItem) {
    response.status(404).json({ error: "asset not found" });
    return;
  }
  response.type(assetItem.mimeType);
  response.sendFile(path.resolve(assetItem.filePath));
});

app.get("/api/assets/:id/thumbnail", (request, response) => {
  const assetItem = assetService.getAssetById(request.params.id);
  if (!assetItem) {
    response.status(404).json({ error: "asset not found" });
    return;
  }
  response.type(assetItem.mimeType);
  response.sendFile(path.resolve(assetItem.filePath));
});

app.get("/api/assets/:id", (request, response) => {
  const assetItem = assetService.getAssetById(request.params.id);
  if (!assetItem) {
    response.status(404).json({ error: "asset not found" });
    return;
  }
  response.json(assetItem);
});

app.post("/api/assets/upload", uploadMiddleware.single("file"), (request, response) => {
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

app.patch("/api/assets/:id", (request, response) => {
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

app.delete("/api/assets/:id", (request, response) => {
  const deletedAsset = assetService.deleteAsset(request.params.id);
  if (!deletedAsset) {
    response.status(404).json({ error: "asset not found" });
    return;
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

server.listen(portNumber, () => {
  console.log(`Mimic server started on port ${portNumber}`);
});
