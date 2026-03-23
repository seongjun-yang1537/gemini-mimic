// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class RunStore {
  constructor(storagePath) {
    this.storagePath = path.resolve(storagePath || "./outputs/runs.json");
    fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2), "utf8");
    }
  }

  readRuns() {
    const jsonText = fs.readFileSync(this.storagePath, "utf8");
    return JSON.parse(jsonText);
  }

  saveRuns(runList) {
    fs.writeFileSync(this.storagePath, JSON.stringify(runList, null, 2), "utf8");
  }

  createRun(inputVideoPath) {
    const runList = this.readRuns();
    const pipelineRun = {
      id: randomUUID(),
      status: "running",
      createdAt: new Date().toISOString(),
      inputVideo: inputVideoPath,
      tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0 },
    };
    runList.unshift(pipelineRun);
    this.saveRuns(runList);
    return pipelineRun;
  }

  updateRun(runId, updates) {
    const runList = this.readRuns();
    const runIndex = runList.findIndex((run) => run.id === runId);
    if (runIndex === -1) {
      throw new Error("Run not found");
    }
    runList[runIndex] = { ...runList[runIndex], ...updates };
    this.saveRuns(runList);
    return runList[runIndex];
  }

  getRun(runId) {
    return this.readRuns().find((run) => run.id === runId);
  }

  listRuns() {
    return this.readRuns();
  }

  deleteRun(runId) {
    const runList = this.readRuns();
    const filteredRuns = runList.filter((run) => run.id !== runId);
    this.saveRuns(filteredRuns);
  }
}

module.exports = { RunStore };
