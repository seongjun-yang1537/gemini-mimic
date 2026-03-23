// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class RunStore {
  constructor(storagePath) {
    this.storagePath = path.resolve(storagePath || "./outputs/runs.json");
    this.fileAccessQueue = Promise.resolve();
    this.initializationPromise = this.initializeStorage();
  }

  async initializeStorage() {
    await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
    try {
      await fs.access(this.storagePath);
    } catch (_error) {
      await fs.writeFile(this.storagePath, JSON.stringify([], null, 2), "utf8");
    }
  }

  async ensureInitialized() {
    await this.initializationPromise;
  }

  enqueueFileAccess(operation) {
    const scheduledOperation = this.fileAccessQueue.then(operation);
    this.fileAccessQueue = scheduledOperation.catch(() => {});
    return scheduledOperation;
  }

  async readRunsInternal() {
    const jsonText = await fs.readFile(this.storagePath, "utf8");
    return JSON.parse(jsonText);
  }

  async writeRunsInternal(runList) {
    await fs.writeFile(this.storagePath, JSON.stringify(runList, null, 2), "utf8");
  }

  async readRuns() {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => this.readRunsInternal());
  }

  async saveRuns(runList) {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => this.writeRunsInternal(runList));
  }

  async createRun(inputVideoPath, configSnapshot = null) {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => {
      const runList = await this.readRunsInternal();
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
      await this.writeRunsInternal(runList);
      return pipelineRun;
    });
  }

  async updateRun(runId, updates) {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => {
      const runList = await this.readRunsInternal();
      const runIndex = runList.findIndex((run) => run.id === runId);
      if (runIndex === -1) {
        throw new Error("Run not found");
      }
      runList[runIndex] = { ...runList[runIndex], ...updates };
      await this.writeRunsInternal(runList);
      return runList[runIndex];
    });
  }

  async getRun(runId) {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => {
      const runList = await this.readRunsInternal();
      return runList.find((run) => run.id === runId);
    });
  }

  async listRuns() {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => this.readRunsInternal());
  }

  async deleteRun(runId) {
    await this.ensureInitialized();
    return this.enqueueFileAccess(async () => {
      const runList = await this.readRunsInternal();
      const filteredRuns = runList.filter((run) => run.id !== runId);
      await this.writeRunsInternal(filteredRuns);
    });
  }
}

module.exports = { RunStore };
