const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { RunStore } = require("../src/store/runStore");

test("RunStore create/update/delete 동작", () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "run-store-"));
  const storagePath = path.join(tempDirectory, "runs.json");
  const runStore = new RunStore(storagePath);

  const createdRun = runStore.createRun("/tmp/input.mp4", { video: { maxIterations: 3 } });
  assert.equal(createdRun.status, "running");
  assert.equal(runStore.listRuns().length, 1);

  const updatedRun = runStore.updateRun(createdRun.id, { status: "completed", outputVideo: "done.mp4" });
  assert.equal(updatedRun.status, "completed");
  assert.equal(updatedRun.outputVideo, "done.mp4");

  const fetchedRun = runStore.getRun(createdRun.id);
  assert.equal(fetchedRun.status, "completed");

  runStore.deleteRun(createdRun.id);
  assert.equal(runStore.listRuns().length, 0);
});

test("RunStore.updateRun 은 없는 runId에 대해 오류를 던진다", () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "run-store-"));
  const storagePath = path.join(tempDirectory, "runs.json");
  const runStore = new RunStore(storagePath);

  assert.throws(() => runStore.updateRun("missing", { status: "failed" }), /Run not found/);
});
