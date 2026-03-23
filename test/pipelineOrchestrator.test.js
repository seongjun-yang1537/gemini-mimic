const test = require("node:test");
const assert = require("node:assert/strict");
const { PipelineOrchestrator } = require("../src/services/pipelineOrchestrator");

function createOrchestrator() {
  return new PipelineOrchestrator({
    runStore: {},
    promptService: {},
    debateEngine: {},
    geminiClient: {},
    wsHub: {},
    assetService: {},
    settingsService: {},
  });
}

test("executeWithTimeout 성공 시 결과를 반환한다", async () => {
  const pipelineOrchestrator = createOrchestrator();
  const resultValue = await pipelineOrchestrator.executeWithTimeout(1, async () => "ok", 1000);
  assert.equal(resultValue, "ok");
});

test("executeWithTimeout 실패 시 failedPhase를 주입한다", async () => {
  const pipelineOrchestrator = createOrchestrator();
  const expectedError = new Error("phase error");

  await assert.rejects(
    () => pipelineOrchestrator.executeWithTimeout(3, async () => {
      throw expectedError;
    }, 1000),
    (actualError) => {
      assert.equal(actualError, expectedError);
      assert.equal(actualError.failedPhase, 3);
      return true;
    },
  );
});

test("executeWithTimeout 기존 failedPhase는 유지한다", async () => {
  const pipelineOrchestrator = createOrchestrator();
  const expectedError = new Error("phase error");
  expectedError.failedPhase = 2;

  await assert.rejects(
    () => pipelineOrchestrator.executeWithTimeout(4, async () => {
      throw expectedError;
    }, 1000),
    (actualError) => {
      assert.equal(actualError.failedPhase, 2);
      return true;
    },
  );
});

test("executeWithTimeout 타임아웃 오류에도 failedPhase를 주입한다", async () => {
  const pipelineOrchestrator = createOrchestrator();

  await assert.rejects(
    () => pipelineOrchestrator.executeWithTimeout(
      2,
      async () => new Promise((resolve) => {
        setTimeout(() => resolve("late"), 100);
      }),
      20,
    ),
    (actualError) => {
      assert.match(actualError.message, /타임아웃/);
      assert.equal(actualError.failedPhase, 2);
      return true;
    },
  );
});
