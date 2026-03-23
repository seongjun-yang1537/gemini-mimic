// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const multer = require("multer");
require("dotenv").config();

const { GeminiClient } = require("./services/geminiClient");
const { DebateEngine } = require("./services/debateEngine");
const { PromptService } = require("./services/promptService");
const { RunStore } = require("./store/runStore");
const { PipelineOrchestrator } = require("./services/pipelineOrchestrator");
const { RunWebSocketHub } = require("./services/wsHub");

const portNumber = Number(process.env.PORT || 3000);
const uploadsDirectory = path.resolve(process.env.UPLOADS_DIR || "./uploads");
const promptsDirectory = path.resolve(process.env.PROMPTS_DIR || "./prompts");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const uploadMiddleware = multer({ dest: uploadsDirectory });
const app = express();
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(uploadsDirectory));
app.use("/outputs", express.static(path.resolve(process.env.OUTPUTS_DIR || "./outputs")));
app.use(express.static(path.resolve("public")));

const geminiClient = new GeminiClient();
const debateEngine = new DebateEngine({ geminiClient });
const promptService = new PromptService(promptsDirectory);
const runStore = new RunStore();

const server = http.createServer(app);
const wsHub = new RunWebSocketHub(server);
const pipelineOrchestrator = new PipelineOrchestrator({
  runStore,
  promptService,
  debateEngine,
  geminiClient,
  wsHub,
});

app.post("/api/run", uploadMiddleware.single("video"), async (request, response) => {
  try {
    const uploadedVideoPath = request.file?.path;
    if (!uploadedVideoPath) {
      response.status(400).json({ error: "video 파일이 필요합니다." });
      return;
    }

    const createdRun = runStore.createRun(uploadedVideoPath);
    pipelineOrchestrator.execute(createdRun.id).catch(() => {});

    response.status(201).json(createdRun);
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

app.get("*", (_request, response) => {
  response.sendFile(path.resolve("public/index.html"));
});

server.listen(portNumber, () => {
  console.log(`Mimic server started on port ${portNumber}`);
});
