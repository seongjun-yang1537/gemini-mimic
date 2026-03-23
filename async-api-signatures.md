<!-- Generated under Codex compliance with AGENTS.md (gemini-mimic) -->
# 비동기 전환 시그니처 및 호출 지점 추적

## 1) 메서드 시그니처 전환 목록

### `src/store/runStore.js`
- `async readRuns()`
- `async saveRuns(runList)`
- `async createRun(inputVideoPath, configSnapshot = null)`
- `async updateRun(runId, updates)`
- `async getRun(runId)`
- `async listRuns()`
- `async deleteRun(runId)`

### `src/services/promptService.js`
- `async listPrompts()`
- `async getPrompt(phase, expert)`
- `async updatePrompt(phase, expert, content)`
- `async loadPhasePrompts(phase)`

## 2) 호출 지점 추적 명령 및 결과

실행 명령:

```bash
rg "createRun\(|updateRun\(|listPrompts\(" -n src
```

추적 결과:

```text
src/services/pipelineOrchestrator.js:33:    await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:59:      const runState = await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:68:      await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:91:      await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:193:    await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:229:    await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:378:    await this.runStore.updateRun(runId, {
src/services/pipelineOrchestrator.js:410:    await this.runStore.updateRun(runId, {
src/server.js:120:    const createdRun = await runStore.createRun(registeredInputAsset.filePath, currentConfig);
src/server.js:121:    await runStore.updateRun(createdRun.id, { inputAssetId: registeredInputAsset.id });
src/server.js:178:    response.json(await promptService.listPrompts());
src/server.js:215:    const promptList = await promptService.listPrompts();
src/services/promptService.js:10:  async listPrompts() {
src/store/runStore.js:51:  async createRun(inputVideoPath, configSnapshot = null) {
src/store/runStore.js:70:  async updateRun(runId, updates) {
```
