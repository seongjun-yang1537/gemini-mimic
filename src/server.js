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
const { getRequiredGeminiApiKey } = require("./config/environment");

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
const geminiClient = new GeminiClient({ apiKey: getRequiredGeminiApiKey(), assetService });
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
});

app.post("/api/run", uploadMiddleware.single("video"), async (request, response) => {
  try {
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

    const createdRun = runStore.createRun(registeredInputAsset.filePath);
    runStore.updateRun(createdRun.id, { inputAssetId: registeredInputAsset.id });
    pipelineOrchestrator.execute(createdRun.id).catch(() => {});

    response.status(201).json(runStore.getRun(createdRun.id));
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
});

app.get("/api/run", (_request, response) => {
  response.json(runStore.listRuns());
});

app.get("/api/run/:id", (request, response) => {
  const foundRun = runStore.getRun(request.params.id);
  if (!foundRun) {
    response.status(404).json({ error: "run not found" });
    return;
  }
  response.json(foundRun);
});

app.get("/api/run/:id/logs", (request, response) => {
  const foundRun = runStore.getRun(request.params.id);
  if (!foundRun) {
    response.status(404).json({ error: "run not found" });
    return;
  }
  response.json({
    phase1: foundRun.phase1Result?.debateLog || null,
    phase3: foundRun.phase3Result?.iterations?.map((iteration) => iteration.evaluation) || [],
  });
});

app.delete("/api/run/:id", (request, response) => {
  runStore.deleteRun(request.params.id);
  response.status(204).send();
});

app.get("/api/prompts", (_request, response) => {
  response.json(promptService.listPrompts());
});

app.get("/api/prompts/:phase/:expert", (request, response) => {
  try {
    const promptContent = promptService.getPrompt(request.params.phase, request.params.expert);
    response.json({ content: promptContent });
  } catch (error) {
    response.status(404).json({ error: error.message });
  }
});

app.put("/api/prompts/:phase/:expert", (request, response) => {
  const { content } = request.body;
  if (typeof content !== "string") {
    response.status(400).json({ error: "content는 문자열이어야 합니다." });
    return;
  }
  const updateResult = promptService.updatePrompt(request.params.phase, request.params.expert, content);
  response.json(updateResult);
});

app.post("/api/prompts/ai-update", async (request, response) => {
  const { feedback } = request.body;
  if (!feedback) {
    response.status(400).json({ error: "feedback이 필요합니다." });
    return;
  }

  const promptList = promptService.listPrompts();
  const promptSnapshot = promptList.map((prompt) => ({
    phase: prompt.phase,
    expert: prompt.expert,
    content: promptService.getPrompt(prompt.phase, prompt.expert),
  }));

  const updaterPrompt = promptService.getPrompt("meta", "prompt_updater");
  const updateSuggestion = await geminiClient.callGemini(updaterPrompt, {
    feedback,
    prompts: promptSnapshot,
    format: "JSON array: [{phase,expert,before,after,reason}]",
  });

  response.json({ suggestion: updateSuggestion });
});

app.get("/api/run/:id/result", (request, response) => {
  const foundRun = runStore.getRun(request.params.id);
  if (!foundRun) {
    response.status(404).json({ error: "run not found" });
    return;
  }
  response.json(foundRun);
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

app.get("/{*fallbackPath}", (_request, response) => {
  response.sendFile(path.resolve("public/index.html"));
});

server.listen(portNumber, () => {
  console.log(`Mimic server started on port ${portNumber}`);
});
