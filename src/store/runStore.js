// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class RunStore {
  constructor(storagePath) {
    this.storagePath = path.resolve(storagePath || "./outputs/runs.json");
    this.fileAccessQueue = Promise.resolve();
    this.readyPromise = this.ensureStorageReady();
  }

  async ensureStorageReady() {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.writeFile(this.storagePath, JSON.stringify([], null, 2), "utf8");
    }
  }

  async runWithSerializedFileAccess(operation) {
    const operationPromise = this.fileAccessQueue.then(operation, operation);
    this.fileAccessQueue = operationPromise.catch(() => {});
    return operationPromise;
  }

  async readRuns() {
    await this.readyPromise;
    return this.runWithSerializedFileAccess(async () => {
      const runsJsonText = await fs.readFile(this.storagePath, "utf8");
      return JSON.parse(runsJsonText);
    });
  }

  async saveRuns(runList) {
    await this.readyPromise;
    return this.runWithSerializedFileAccess(async () => {
      await fs.writeFile(this.storagePath, JSON.stringify(runList, null, 2), "utf8");
    });
  }

  async createRun(inputVideoPath, configSnapshot = null) {
    await this.readyPromise;
    return this.runWithSerializedFileAccess(async () => {
      const runsJsonText = await fs.readFile(this.storagePath, "utf8");
      const runList = JSON.parse(runsJsonText);
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
      await fs.writeFile(this.storagePath, JSON.stringify(runList, null, 2), "utf8");
      return pipelineRun;
    });
  }

  async updateRun(runId, updates) {
    await this.readyPromise;
    return this.runWithSerializedFileAccess(async () => {
      const runsJsonText = await fs.readFile(this.storagePath, "utf8");
      const runList = JSON.parse(runsJsonText);
      const runIndex = runList.findIndex((run) => run.id === runId);
      if (runIndex === -1) {
        throw new Error("Run not found");
      }
      runList[runIndex] = { ...runList[runIndex], ...updates };
      await fs.writeFile(this.storagePath, JSON.stringify(runList, null, 2), "utf8");
      return runList[runIndex];
    });
  }

  async getRun(runId) {
    const runList = await this.readRuns();
    return runList.find((run) => run.id === runId);
  }

  async listRuns() {
    return this.readRuns();
  }

  async deleteRun(runId) {
    await this.readyPromise;
    return this.runWithSerializedFileAccess(async () => {
      const runsJsonText = await fs.readFile(this.storagePath, "utf8");
      const runList = JSON.parse(runsJsonText);
      const filteredRuns = runList.filter((run) => run.id !== runId);
      await fs.writeFile(this.storagePath, JSON.stringify(filteredRuns, null, 2), "utf8");
    });
  }
}

module.exports = { RunStore };
