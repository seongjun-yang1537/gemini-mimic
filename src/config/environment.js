// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const path = require("node:path");
const dotenv = require("dotenv");

const dotenvResult = dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getLoadedGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

function getRequiredGeminiApiKey() {
  const geminiApiKey = getLoadedGeminiApiKey();
  if (geminiApiKey) {
    return geminiApiKey;
  }

  const dotenvError = dotenvResult.error ? ` (${dotenvResult.error.message})` : "";
  throw new Error(`GEMINI_API_KEY가 필요합니다. 프로젝트 루트의 .env 파일에 설정하세요${dotenvError}`);
}

function parseOptionalNonNegativeNumber(environmentVariableName) {
  const rawEnvironmentValue = process.env[environmentVariableName];
  if (rawEnvironmentValue === undefined || rawEnvironmentValue === null || !rawEnvironmentValue.trim()) {
    return { value: undefined, source: "unset", rawValue: rawEnvironmentValue ?? "" };
  }

  const parsedEnvironmentValue = Number(rawEnvironmentValue);
  if (!Number.isFinite(parsedEnvironmentValue) || parsedEnvironmentValue < 0) {
    return { value: undefined, source: "invalid", rawValue: rawEnvironmentValue };
  }

  return { value: parsedEnvironmentValue, source: "env", rawValue: rawEnvironmentValue };
}

function getLoadedCostRateConfig() {
  const inputRateResult = parseOptionalNonNegativeNumber("COST_INPUT_RATE_PER_TOKEN");
  const outputRateResult = parseOptionalNonNegativeNumber("COST_OUTPUT_RATE_PER_TOKEN");

  return {
    inputRatePerToken: inputRateResult.value,
    outputRatePerToken: outputRateResult.value,
    inputRateSource: inputRateResult.source,
    outputRateSource: outputRateResult.source,
    inputRateRawValue: inputRateResult.rawValue,
    outputRateRawValue: outputRateResult.rawValue,
  };
}

module.exports = { getRequiredGeminiApiKey, getLoadedGeminiApiKey, getLoadedCostRateConfig };
