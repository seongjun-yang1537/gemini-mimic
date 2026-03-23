const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { SettingsService } = require("../src/services/settingsService");

function createService() {
  const configDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "settings-service-"));
  return new SettingsService({ configDirectory, envApiKey: "api-key-for-test" });
}

test("SettingsService.validateConfig 경계값을 허용한다", () => {
  const settingsService = createService();
  const validConfig = settingsService.getDefaultConfig();
  validConfig.gemini.temperature = 0;
  validConfig.gemini.maxOutputTokens = 65536;
  validConfig.video.pollInterval = 60000;
  validConfig.video.pollTimeoutMs = 60000;
  validConfig.safety.pipelineTimeoutMinutes = 10;
  settingsService.validateConfig(validConfig);
});

test("SettingsService.validateConfig 는 전문가가 0명이면 실패한다", () => {
  const settingsService = createService();
  const invalidConfig = settingsService.getDefaultConfig();
  invalidConfig.experts.phase1.hook = false;
  invalidConfig.experts.phase1.story = false;
  invalidConfig.experts.phase1.cta = false;
  invalidConfig.experts.phase1.actionDesc = false;
  invalidConfig.experts.phase1.characterDesc = false;
  invalidConfig.experts.phase3.actionEval = false;
  invalidConfig.experts.phase3.characterEval = false;
  invalidConfig.experts.phase3.scenarioEval = false;

  assert.throws(() => settingsService.validateConfig(invalidConfig), /최소 1명/);
});

test("SettingsService.validateConfig 는 pollTimeoutMs가 pollInterval보다 작으면 실패한다", () => {
  const settingsService = createService();
  const invalidConfig = settingsService.getDefaultConfig();
  invalidConfig.video.pollInterval = 5000;
  invalidConfig.video.pollTimeoutMs = 4999;

  assert.throws(() => settingsService.validateConfig(invalidConfig), /pollTimeoutMs/);
});

test("SettingsService.validateConfig 는 schema 최대값을 넘으면 실패한다", () => {
  const settingsService = createService();
  const invalidConfig = settingsService.getDefaultConfig();
  invalidConfig.safety.maxApiCallsPerRun = 501;

  assert.throws(() => settingsService.validateConfig(invalidConfig), /이하여야/);
});
