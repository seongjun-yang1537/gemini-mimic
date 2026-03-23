// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const FALLBACK_INPUT_RATE_PER_TOKEN = 2.0 / 1_000_000;
const FALLBACK_OUTPUT_RATE_PER_TOKEN = 12.0 / 1_000_000;

const GEMINI_MODEL_TOKEN_RATE_TABLE = {
  "gemini-3.1-pro-preview": {
    inputRatePerToken: FALLBACK_INPUT_RATE_PER_TOKEN,
    outputRatePerToken: FALLBACK_OUTPUT_RATE_PER_TOKEN,
  },
  "gemini-3.1-flash-lite-preview": {
    inputRatePerToken: FALLBACK_INPUT_RATE_PER_TOKEN,
    outputRatePerToken: FALLBACK_OUTPUT_RATE_PER_TOKEN,
  },
  "gemini-2.5-pro": {
    inputRatePerToken: FALLBACK_INPUT_RATE_PER_TOKEN,
    outputRatePerToken: FALLBACK_OUTPUT_RATE_PER_TOKEN,
  },
  "gemini-2.5-flash": {
    inputRatePerToken: FALLBACK_INPUT_RATE_PER_TOKEN,
    outputRatePerToken: FALLBACK_OUTPUT_RATE_PER_TOKEN,
  },
};

function resolveGeminiTokenRates({ geminiModel, inputRatePerTokenOverride, outputRatePerTokenOverride } = {}) {
  const selectedModelRates = GEMINI_MODEL_TOKEN_RATE_TABLE[geminiModel] || {};
  const inputRatePerToken = inputRatePerTokenOverride ?? selectedModelRates.inputRatePerToken ?? FALLBACK_INPUT_RATE_PER_TOKEN;
  const outputRatePerToken = outputRatePerTokenOverride ?? selectedModelRates.outputRatePerToken ?? FALLBACK_OUTPUT_RATE_PER_TOKEN;

  return {
    inputRatePerToken,
    outputRatePerToken,
    modelRateFound: Boolean(GEMINI_MODEL_TOKEN_RATE_TABLE[geminiModel]),
  };
}

module.exports = {
  FALLBACK_INPUT_RATE_PER_TOKEN,
  FALLBACK_OUTPUT_RATE_PER_TOKEN,
  GEMINI_MODEL_TOKEN_RATE_TABLE,
  resolveGeminiTokenRates,
};
