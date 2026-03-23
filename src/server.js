const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const multer = require("multer");
const { createApp } = require("./app/createApp");
const { createRunRoutes } = require("./routes/runRoutes");
const { createPromptRoutes } = require("./routes/promptRoutes");
const { createAssetRoutes } = require("./routes/assetRoutes");
const { createSettingsRoutes } = require("./routes/settingsRoutes");
const { createWebRoutes } = require("./routes/webRoutes");
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
const outputsDirectory = path.resolve(process.env.OUTPUTS_DIR || "./outputs");
const assetsDirectory = path.resolve(process.env.ASSETS_DIR || "./assets");
const publicDirectory = path.resolve("public");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const uploadMiddleware = multer({ dest: uploadsDirectory });
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

let pipelineOrchestrator;
const runRoutes = createRunRoutes({
  runStore,
  executePipeline: (runId) => pipelineOrchestrator.execute(runId),
  assetService,
  settingsService,
  uploadMiddleware,
});

const app = createApp({
  uploadsDirectory,
  outputsDirectory,
  publicDirectory,
  runRoutes,
  promptRoutes: createPromptRoutes({ promptService, geminiClient }),
  assetRoutes: createAssetRoutes({ assetService, uploadMiddleware }),
  settingsRoutes: createSettingsRoutes({ settingsService }),
  webRoutes: createWebRoutes({ publicDirectory }),
});

const server = http.createServer(app);
const wsHub = new RunWebSocketHub(server);
pipelineOrchestrator = new PipelineOrchestrator({
  runStore,
  promptService,
  debateEngine,
  geminiClient,
  wsHub,
  assetService,
  settingsService,
});

server.listen(portNumber, () => {
  console.log(`Mimic server started on port ${portNumber}`);
});
