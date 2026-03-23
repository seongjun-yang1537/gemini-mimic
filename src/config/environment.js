// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const path = require("node:path");
const dotenv = require("dotenv");

const dotenvResult = dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getLoadedGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

function parseNumberEnv(rawValue, fallbackValue) {
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
    return fallbackValue;
  }
  const parsedNumber = Number(rawValue);
  if (Number.isNaN(parsedNumber)) {
    return fallbackValue;
  }
  return parsedNumber;
}

function getOperatorSettingsEnvOverrides() {
  const operatorOverrides = {};

  if (process.env.VIDEO_MODEL?.trim()) {
    operatorOverrides.video = { ...(operatorOverrides.video || {}), model: process.env.VIDEO_MODEL.trim() };
  }

  if (process.env.VIDEO_SPLIT_MODEL?.trim()) {
    operatorOverrides.video = {
      ...(operatorOverrides.video || {}),
      splitModel: process.env.VIDEO_SPLIT_MODEL.trim(),
    };
  }

  if (process.env.IMAGE_MODEL?.trim()) {
    operatorOverrides.image = { ...(operatorOverrides.image || {}), model: process.env.IMAGE_MODEL.trim() };
  }

  if (process.env.FFMPEG_PATH?.trim()) {
    operatorOverrides.ffmpeg = { ...(operatorOverrides.ffmpeg || {}), path: process.env.FFMPEG_PATH.trim() };
  }

  const maxApiCallsPerRun = parseNumberEnv(process.env.SAFETY_MAX_API_CALLS, null);
  const maxCostPerRunUsd = parseNumberEnv(process.env.SAFETY_MAX_COST_USD, null);
  const pipelineTimeoutMinutes = parseNumberEnv(process.env.SAFETY_PIPELINE_TIMEOUT_MINUTES, null);

  if (maxApiCallsPerRun !== null || maxCostPerRunUsd !== null || pipelineTimeoutMinutes !== null) {
    operatorOverrides.safety = {
      ...(operatorOverrides.safety || {}),
      ...(maxApiCallsPerRun !== null ? { maxApiCallsPerRun } : {}),
      ...(maxCostPerRunUsd !== null ? { maxCostPerRunUsd } : {}),
      ...(pipelineTimeoutMinutes !== null ? { pipelineTimeoutMinutes } : {}),
    };
  }

  return operatorOverrides;
}

function getRequiredGeminiApiKey() {
  const geminiApiKey = getLoadedGeminiApiKey();
  if (geminiApiKey) {
    return geminiApiKey;
  }

  const dotenvError = dotenvResult.error ? ` (${dotenvResult.error.message})` : "";
  throw new Error(`GEMINI_API_KEY가 필요합니다. 프로젝트 루트의 .env 파일에 설정하세요${dotenvError}`);
}

module.exports = { getRequiredGeminiApiKey, getLoadedGeminiApiKey, getOperatorSettingsEnvOverrides };
