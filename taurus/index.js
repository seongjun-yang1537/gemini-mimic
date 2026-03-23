import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const DEFAULT_ASPECT_RATIO = "16:9";
const DEFAULT_RESOLUTION = "720p";
const DEFAULT_DURATION_SECONDS = 8;
const ALLOWED_INITIAL_DURATIONS = new Set([4, 6, 8]);
const ALLOWED_ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const MODEL = "veo-3.1-generate-preview";
const SPLIT_MODEL = "gemini-3-flash-preview";
const EXTENSION_SECONDS = 7;
const MAX_TOTAL_SECONDS = 148;
const MAX_EXTENSIONS = 20;

function usage() {
  return [
    "Usage:",
    "  node src/index.js --prompt \"...\" [options]",
    "",
    "Required:",
    "  --prompt       Text prompt or full scenario for the video.",
    "",
    "Video generation options:",
    "  --image        Reference image path (png/jpg/jpeg/webp). Repeat up to 3 times.",
    "  --first-image  First frame image path.",
    "  --last-image   Last frame image path (requires --first-image).",
    "  --out          Output path for the mp4 file. Defaults to outputs/<timestamp>.mp4",
    "  --duration     Target video duration in seconds.",
    "                   4, 6, 8      → single generation (default: 8)",
    "                   9 ~ 148      → auto-split scenario + extend mode",
    "  --aspect       Aspect ratio: 16:9 or 9:16 (default: 16:9).",
    "  --split-model  Gemini model for scenario splitting (default: gemini-2.0-flash).",
    "",
    "Manual extension:",
    "  --extend       Extend a previous video by history index or file id.",
    "                 Requires --prompt for the extension segment.",
    "",
    "History:",
    "  --history              List locally saved generated video records.",
    "  --history-download     Download a previously generated video by index or file id.",
    "",
    "Examples:",
    "  # Simple 8s video",
    "  node src/index.js --prompt \"A cat on a table\"",
    "",
    "  # 15s video with auto scenario splitting",
    "  node src/index.js --prompt \"A butterfly flies through a garden...\" --duration 15",
    "",
    "  # 30s video",
    "  node src/index.js --prompt \"Full scenario description...\" --duration 30",
    "",
    "  # Manually extend the last generated video",
    "  node src/index.js --extend last --prompt \"The camera pulls back...\"",
  ].join("\n");
}

// ─── Arg helpers ───────────────────────────────────────────────

function getArgValue(args, flags) {
  for (const flag of flags) {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      const value = args[index + 1];
      if (!value.startsWith("-")) return value;
    }
  }
  return null;
}

function getArgValues(args, flags) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (flags.includes(args[i]) && i + 1 < args.length) {
      const value = args[i + 1];
      if (!value.startsWith("-")) {
        values.push(value);
        i += 1;
      }
    }
  }
  return values;
}

// ─── File / path helpers ───────────────────────────────────────

function resolveOutputPath(value) {
  if (!value) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return path.resolve("outputs", `video-${stamp}.mp4`);
  }
  const resolved = path.resolve(value);
  return path.extname(resolved) ? resolved : `${resolved}.mp4`;
}

function toMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return null;
  }
}

function readImageData(imagePath) {
  const resolvedImagePath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedImagePath)) {
    console.error(`Image not found: ${resolvedImagePath}`);
    process.exit(1);
  }
  const mimeType = toMimeType(resolvedImagePath);
  if (!mimeType) {
    console.error("Unsupported image type. Use png, jpg, jpeg, or webp.");
    process.exit(1);
  }
  const imageBytes = fs.readFileSync(resolvedImagePath).toString("base64");
  return { imageBytes, mimeType };
}

// ─── History ───────────────────────────────────────────────────

function getHistoryPath() {
  return path.resolve("outputs", "history.json");
}

function readHistory() {
  const historyPath = getHistoryPath();
  if (!fs.existsSync(historyPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(historyPath, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecord(record) {
  const historyPath = getHistoryPath();
  const history = readHistory();
  history.push(record);
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), "utf8");
}

function resolveHistoryEntry(value) {
  const history = readHistory();
  if (value === "last") {
    const entry = history[history.length - 1];
    if (!entry) {
      console.error("No history entries found.");
      process.exit(1);
    }
    return entry;
  }
  const maybeIndex = Number.parseInt(value, 10);
  const entry =
    Number.isInteger(maybeIndex) && history[maybeIndex]
      ? history[maybeIndex]
      : history.find((item) => item?.file === value);
  if (!entry || !entry.file) {
    console.error("History entry not found.");
    process.exit(1);
  }
  return entry;
}

// ─── Segment calculation ───────────────────────────────────────

function calculateSegments(totalDuration) {
  if (totalDuration <= 8) {
    // Snap to nearest allowed initial duration
    const initial = [4, 6, 8].reduce((prev, curr) =>
      Math.abs(curr - totalDuration) < Math.abs(prev - totalDuration) ? curr : prev,
    );
    return { initialDuration: initial, extensionCount: 0 };
  }

  // Try all initial durations and pick the combo closest to target
  let best = null;
  for (const init of [4, 6, 8]) {
    const remaining = totalDuration - init;
    // Try both floor and ceil extension counts
    const lo = Math.floor(remaining / EXTENSION_SECONDS);
    const hi = Math.ceil(remaining / EXTENSION_SECONDS);
    for (const ext of [lo, hi]) {
      if (ext < 1 || ext > MAX_EXTENSIONS) continue;
      const actual = init + ext * EXTENSION_SECONDS;
      const diff = Math.abs(actual - totalDuration);
      if (!best || diff < best.diff || (diff === best.diff && init > best.init)) {
        best = { init, ext, actual, diff };
      }
    }
  }

  if (!best) {
    console.error(`Cannot calculate segments for ${totalDuration}s.`);
    process.exit(1);
  }

  return { initialDuration: best.init, extensionCount: best.ext };
}

// ─── Scenario splitting via Gemini ─────────────────────────────

async function splitScenario(ai, scenario, initialDuration, extensionCount, splitModel) {
  const totalSegments = 1 + extensionCount;
  const durations = [
    initialDuration,
    ...Array(extensionCount).fill(EXTENSION_SECONDS),
  ];

  const segmentList = durations
    .map((d, i) => `  Segment ${i + 1}: ${d} seconds`)
    .join("\n");

  const systemPrompt = [
    "You are a video production assistant. Your job is to split a scenario into sequential segments for AI video generation.",
    "",
    "Rules:",
    "- Each segment prompt must be a self-contained, detailed video generation prompt.",
    "- Describe camera movement, subject actions, lighting, and visual details.",
    "- Each segment must flow naturally from the previous one.",
    "- Write in the SAME LANGUAGE as the input scenario.",
    "- Respond ONLY with a JSON array of strings. No markdown fences, no explanation.",
  ].join("\n");

  const userPrompt = [
    `Split the following scenario into ${totalSegments} segments:`,
    "",
    segmentList,
    "",
    `Scenario: ${scenario}`,
  ].join("\n");

  console.log(`Splitting scenario into ${totalSegments} segments using ${splitModel}...`);

  const response = await ai.models.generateContent({
    model: splitModel,
    config: { systemInstruction: systemPrompt },
    contents: userPrompt,
  });

  const raw = response.text.replace(/```json|```/g, "").trim();
  let segments;
  try {
    segments = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse segment JSON from LLM:\n${raw}`);
  }

  if (!Array.isArray(segments) || segments.length !== totalSegments) {
    throw new Error(
      `Expected ${totalSegments} segments, got ${Array.isArray(segments) ? segments.length : "non-array"}.`,
    );
  }

  segments.forEach((seg, i) => {
    const dur = durations[i];
    console.log(`  [Segment ${i + 1}] (${dur}s) ${seg.slice(0, 80)}${seg.length > 80 ? "..." : ""}`);
  });

  return segments;
}

// ─── Veo generation helpers ────────────────────────────────────

async function pollOperation(ai, operation) {
  while (!operation.done) {
    console.log("  Waiting for video generation...");
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  if (operation.error) {
    throw new Error(operation.error.message || "Video generation failed.");
  }
  const generatedVideo = operation.response?.generatedVideos?.[0];
  const video = generatedVideo?.video;
  if (!video) {
    throw new Error("No video returned in response.");
  }
  console.log(`  Video object type: ${typeof video}`);
  console.log(`  Video value: ${typeof video === "string" ? video : JSON.stringify(video, null, 2)}`);
  return video;
}

async function generateInitialVideo(ai, { prompt, image, config, referenceImages }) {
  const fullConfig = referenceImages ? { ...config, referenceImages } : config;
  const operation = await ai.models.generateVideos({
    model: MODEL,
    prompt,
    image: image || undefined,
    config: fullConfig,
  });
  return pollOperation(ai, operation);
}

async function extendVideo(ai, { video, prompt, aspectRatio }) {
  // Wait for post-processing before extending
  console.log("  Waiting 30s for video post-processing...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  const operation = await ai.models.generateVideos({
    model: MODEL,
    prompt,
    video,
    config: { aspectRatio, resolution: DEFAULT_RESOLUTION, numberOfVideos: 1 },
  });
  return pollOperation(ai, operation);
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    process.exit(0);
  }

  // ── History list ──
  if (args.includes("--history")) {
    const history = readHistory();
    if (history.length === 0) {
      console.log("No saved history found.");
      process.exit(0);
    }
    history.forEach((item, index) => {
      const file = item?.file ?? "unknown";
      const createdAt = item?.createdAt ?? "unknown";
      const outputPath = item?.outputPath ?? "unknown";
      const dur = item?.totalDuration ? `${item.totalDuration}s` : "";
      console.log(`[${index}] ${file} | ${createdAt} | ${dur} | ${outputPath}`);
    });
    process.exit(0);
  }

  // ── History download ──
  const historyDownloadValue = getArgValue(args, ["--history-download"]);
  if (historyDownloadValue) {
    const entry = resolveHistoryEntry(historyDownloadValue);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY in environment or .env.");
      process.exit(1);
    }
    const outputPath = resolveOutputPath(getArgValue(args, ["--out", "-o"]));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const ai = new GoogleGenAI({ apiKey });
    await ai.files.download({ file: entry.file, downloadPath: outputPath });
    console.log(`Downloaded video to ${outputPath}`);
    process.exit(0);
  }

  // ── Common args ──
  const prompt = getArgValue(args, ["--prompt", "-p"]);
  const outputPath = resolveOutputPath(getArgValue(args, ["--out", "-o"]));
  const aspectRatio = getArgValue(args, ["--aspect", "--ar"]) || DEFAULT_ASPECT_RATIO;
  const splitModel = getArgValue(args, ["--split-model"]) || SPLIT_MODEL;

  if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    console.error("Invalid --aspect. Allowed values: 16:9, 9:16.");
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment or .env.");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey });

  // ── Manual extend ──
  const extendValue = getArgValue(args, ["--extend"]);
  if (extendValue) {
    if (!prompt) {
      console.error("--extend requires --prompt for the extension segment.");
      process.exit(1);
    }
    const entry = resolveHistoryEntry(extendValue);
    console.log(`Extending video: ${entry.file}`);

    const video = await extendVideo(ai, { video: entry.file, prompt, aspectRatio });

    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });

    saveRecord({
      file: video,
      prompt,
      parentFile: entry.file,
      outputPath,
      createdAt: new Date().toISOString(),
    });

    await ai.files.download({ file: video, downloadPath: outputPath });
    console.log(`Extended video saved to ${outputPath}`);
    process.exit(0);
  }

  // ── Generate (single or auto-split) ──
  if (!prompt) {
    console.error("Missing required arguments.\n");
    console.error(usage());
    process.exit(1);
  }

  const imagePaths = getArgValues(args, ["--image", "-i"]);
  const firstImagePath = getArgValue(args, ["--first-image", "--first-frame"]);
  const lastImagePath = getArgValue(args, ["--last-image", "--last-frame"]);
  const durationArg = getArgValue(args, ["--duration", "-d"]);
  const targetDuration = durationArg
    ? Number.parseInt(durationArg, 10)
    : DEFAULT_DURATION_SECONDS;

  if (imagePaths.length > 0 && firstImagePath) {
    console.error("Use either --image or --first-image, not both.");
    process.exit(1);
  }
  if (lastImagePath && !firstImagePath) {
    console.error("--last-image requires --first-image.");
    process.exit(1);
  }
  if (imagePaths.length > 3) {
    console.error("Veo 3.1 supports up to 3 reference images.");
    process.exit(1);
  }

  if (targetDuration < 4 || targetDuration > MAX_TOTAL_SECONDS) {
    console.error(`--duration must be between 4 and ${MAX_TOTAL_SECONDS}.`);
    process.exit(1);
  }

  const { initialDuration, extensionCount } = calculateSegments(targetDuration);

  // Validate initial duration is in allowed set
  if (!ALLOWED_INITIAL_DURATIONS.has(initialDuration)) {
    console.error("Invalid initial duration. This shouldn't happen.");
    process.exit(1);
  }

  const referenceImages =
    imagePaths.length > 0
      ? imagePaths.map((imagePath) => ({
          image: readImageData(imagePath),
          referenceType: "asset",
        }))
      : null;
  const firstImage = firstImagePath ? readImageData(firstImagePath) : null;
  const lastImage = lastImagePath ? readImageData(lastImagePath) : null;

  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  const finalDuration = initialDuration + extensionCount * EXTENSION_SECONDS;

  // ── Single generation (no extension needed) ──
  if (extensionCount === 0) {
    console.log(`Generating ${initialDuration}s video...`);
    const config = {
      aspectRatio,
      resolution: DEFAULT_RESOLUTION,
      durationSeconds: initialDuration,
    };
    if (lastImage) config.lastFrame = lastImage;

    const video = await generateInitialVideo(ai, {
      prompt,
      image: firstImage,
      config,
      referenceImages,
    });

    saveRecord({
      file: video,
      prompt,
      outputPath,
      totalDuration: initialDuration,
      createdAt: new Date().toISOString(),
    });

    await ai.files.download({ file: video, downloadPath: outputPath });
    console.log(`Generated video saved to ${outputPath}`);
    return;
  }

  // ── Auto-split + extend pipeline ──
  console.log(
    `Target: ~${targetDuration}s → ${initialDuration}s initial + ${extensionCount} extension(s) = ${finalDuration}s`,
  );

  const segments = await splitScenario(ai, prompt, initialDuration, extensionCount, splitModel);

  // Step 1: Generate initial video
  console.log(`\n[1/${1 + extensionCount}] Generating initial ${initialDuration}s video...`);
  const initialConfig = {
    aspectRatio,
    resolution: DEFAULT_RESOLUTION,
    durationSeconds: initialDuration,
  };
  if (lastImage) initialConfig.lastFrame = lastImage;

  let video = await generateInitialVideo(ai, {
    prompt: segments[0],
    image: firstImage,
    config: initialConfig,
    referenceImages,
  });

  saveRecord({
    file: video,
    prompt: segments[0],
    outputPath: `${outputPath}.segment-0`,
    totalDuration: initialDuration,
    segment: 0,
    createdAt: new Date().toISOString(),
  });
  console.log(`  Initial video ready.`);

  // Step 2: Extend N times
  for (let i = 0; i < extensionCount; i++) {
    const segIndex = i + 1;
    const elapsed = initialDuration + (i + 1) * EXTENSION_SECONDS;

    console.log(
      `\n[${segIndex + 1}/${1 + extensionCount}] Extending video (segment ${segIndex + 1}, ~${elapsed}s total)...`,
    );

    video = await extendVideo(ai, { video, prompt: segments[segIndex], aspectRatio });

    saveRecord({
      file: video,
      prompt: segments[segIndex],
      outputPath: `${outputPath}.segment-${segIndex}`,
      totalDuration: elapsed,
      segment: segIndex,
      createdAt: new Date().toISOString(),
    });
    console.log(`  Extension ${segIndex} complete.`);
  }

  // Step 3: Download final combined video
  await ai.files.download({ file: video, downloadPath: outputPath });

  saveRecord({
    file: video,
    prompt,
    outputPath,
    totalDuration: finalDuration,
    segments: segments.length,
    createdAt: new Date().toISOString(),
  });

  console.log(`\nFinal ${finalDuration}s video saved to ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

