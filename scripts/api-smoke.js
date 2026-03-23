const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

async function waitForServer(baseUrl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/settings`);
      if (response.ok) {
        return;
      }
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("서버 시작 대기 시간 초과");
}

async function run() {
  const tempRootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "api-smoke-"));
  const uploadsDirectory = path.join(tempRootDirectory, "uploads");
  const outputsDirectory = path.join(tempRootDirectory, "outputs");
  const assetsDirectory = path.join(tempRootDirectory, "assets");
  const configDirectory = path.join(tempRootDirectory, "config");
  fs.mkdirSync(uploadsDirectory, { recursive: true });
  fs.mkdirSync(outputsDirectory, { recursive: true });
  fs.mkdirSync(assetsDirectory, { recursive: true });
  fs.mkdirSync(configDirectory, { recursive: true });

  const portNumber = 39000 + Math.floor(Math.random() * 1000);
  const baseUrl = `http://127.0.0.1:${portNumber}`;
  const serverProcess = spawn(process.execPath, [path.resolve(__dirname, "..", "src/server.js")], {
    cwd: tempRootDirectory,
    env: {
      ...process.env,
      PORT: String(portNumber),
      GEMINI_API_KEY: "smoke-test-key",
      CONFIG_DIR: configDirectory,
      UPLOADS_DIR: uploadsDirectory,
      OUTPUTS_DIR: outputsDirectory,
      ASSETS_DIR: assetsDirectory,
      PROMPTS_DIR: path.resolve(__dirname, "..", "prompts"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderrBuffer = "";
  serverProcess.stderr.on("data", (chunk) => {
    stderrBuffer += chunk.toString();
  });

  try {
    await waitForServer(baseUrl, 10000);

    const settingsResponse = await fetch(`${baseUrl}/api/settings`);
    if (!settingsResponse.ok) {
      throw new Error(`/api/settings 실패: ${settingsResponse.status}`);
    }

    const promptsResponse = await fetch(`${baseUrl}/api/prompts`);
    if (!promptsResponse.ok) {
      throw new Error(`/api/prompts 실패: ${promptsResponse.status}`);
    }

    const runListResponse = await fetch(`${baseUrl}/api/run`);
    if (!runListResponse.ok) {
      throw new Error(`/api/run 실패: ${runListResponse.status}`);
    }
  } finally {
    serverProcess.kill("SIGTERM");
    await new Promise((resolve) => {
      serverProcess.once("exit", () => resolve());
      setTimeout(() => resolve(), 1000);
    });
  }

  if (stderrBuffer.trim()) {
    throw new Error(`서버 stderr 출력 감지: ${stderrBuffer.trim()}`);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
