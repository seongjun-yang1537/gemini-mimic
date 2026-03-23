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

module.exports = { getRequiredGeminiApiKey, getLoadedGeminiApiKey };
