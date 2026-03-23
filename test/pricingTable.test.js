const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FALLBACK_INPUT_RATE_PER_TOKEN,
  FALLBACK_OUTPUT_RATE_PER_TOKEN,
  resolveGeminiTokenRates,
} = require("../src/config/pricingTable");

test("모델 단가가 없으면 fallback 단가를 반환한다", () => {
  const resolvedRates = resolveGeminiTokenRates({ geminiModel: "unknown-model" });
  assert.equal(resolvedRates.inputRatePerToken, FALLBACK_INPUT_RATE_PER_TOKEN);
  assert.equal(resolvedRates.outputRatePerToken, FALLBACK_OUTPUT_RATE_PER_TOKEN);
  assert.equal(resolvedRates.modelRateFound, false);
});

test("환경변수 override가 있으면 모델 단가보다 우선한다", () => {
  const resolvedRates = resolveGeminiTokenRates({
    geminiModel: "gemini-3.1-pro-preview",
    inputRatePerTokenOverride: 0.123,
    outputRatePerTokenOverride: 0.456,
  });
  assert.equal(resolvedRates.inputRatePerToken, 0.123);
  assert.equal(resolvedRates.outputRatePerToken, 0.456);
  assert.equal(resolvedRates.modelRateFound, true);
});
