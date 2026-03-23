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
    this.fileOperationQueue = Promise.resolve();
  }

  enqueueFileOperation(fileOperationTask) {
    const queuedOperation = this.fileOperationQueue.then(() => fileOperationTask());
    this.fileOperationQueue = queuedOperation.catch(() => {});
    return queuedOperation;
  }

  async readRuns() {
    const jsonText = await fs.promises.readFile(this.storagePath, "utf8");
    return JSON.parse(jsonText);
  }

  async saveRuns(runList) {
    await fs.promises.writeFile(this.storagePath, JSON.stringify(runList, null, 2), "utf8");
  }

  async createRun(inputVideoPath, configSnapshot = null) {
    return this.enqueueFileOperation(async () => {
      const runList = await this.readRuns();
      const pipelineRun = {
        id: randomUUID(),
        status: "running",
        createdAt: new Date().toISOString(),
        inputVideo: inputVideoPath,
        tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0 },
        apiCallUsage: { callCount: 0, maxCalls: 0 },
        configSnapshot: configSnapshot ? JSON.parse(JSON.stringify(configSnapshot)) : null,
      };
      runList.unshift(pipelineRun);
      await this.saveRuns(runList);
      return pipelineRun;
    });
  }

  async updateRun(runId, updates) {
    return this.enqueueFileOperation(async () => {
      const runList = await this.readRuns();
      const runIndex = runList.findIndex((run) => run.id === runId);
      if (runIndex === -1) {
        throw new Error("Run not found");
      }
      runList[runIndex] = { ...runList[runIndex], ...updates };
      await this.saveRuns(runList);
      return runList[runIndex];
    });
  }

  async getRun(runId) {
    return this.enqueueFileOperation(async () => (await this.readRuns()).find((run) => run.id === runId));
  }

  async listRuns() {
    return this.enqueueFileOperation(async () => this.readRuns());
  }

  async deleteRun(runId) {
    return this.enqueueFileOperation(async () => {
      const runList = await this.readRuns();
      const filteredRuns = runList.filter((run) => run.id !== runId);
      await this.saveRuns(filteredRuns);
    });
  }
}

module.exports = { RunStore };
