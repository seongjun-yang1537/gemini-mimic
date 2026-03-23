const PIPELINE_TIMEOUT_MINUTES_HARD_LIMIT = 60;

const PHASE_TIMEOUT_MAP = {
  1: { defaultMs: 5 * 60_000, hardLimitMs: 10 * 60_000 },
  2: { defaultMs: 5 * 60_000, hardLimitMs: 10 * 60_000 },
  3: { defaultMs: 20 * 60_000, hardLimitMs: 40 * 60_000 },
  4: { defaultMs: 3 * 60_000, hardLimitMs: 5 * 60_000 },
};

const PHASE3_MAX_ITERATIONS_HARD_LIMIT = 10;

module.exports = {
  PIPELINE_TIMEOUT_MINUTES_HARD_LIMIT,
  PHASE_TIMEOUT_MAP,
  PHASE3_MAX_ITERATIONS_HARD_LIMIT,
};
