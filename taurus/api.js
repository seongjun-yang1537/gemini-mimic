const fs = require("node:fs");
const path = require("node:path");
const { GoogleGenAI } = require("@google/genai");

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

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

function detectImageMimeType(filePath) {
  const fileExtension = path.extname(filePath).toLowerCase();
  if (fileExtension === ".png") return "image/png";
  if (fileExtension === ".jpg" || fileExtension === ".jpeg") return "image/jpeg";
  if (fileExtension === ".webp") return "image/webp";
  return null;
}

function loadImageAsInlineData(imagePath) {
  const resolvedImagePath = path.resolve(imagePath);
  if (!fs.existsSync(resolvedImagePath)) {
    throw new Error(`Image not found: ${resolvedImagePath}`);
  }

  const mimeType = detectImageMimeType(resolvedImagePath);
  if (!mimeType) {
    throw new Error("Unsupported image type. Use png, jpg, jpeg, or webp.");
  }

  const imageBytes = fs.readFileSync(resolvedImagePath).toString("base64");
  return { imageBytes, mimeType };
}

function calculateSegments(totalDuration) {
  if (!Number.isInteger(totalDuration)) {
    throw new Error("Duration must be an integer in seconds.");
  }

  if (totalDuration < 4 || totalDuration > MAX_TOTAL_SECONDS) {
    throw new Error(`Duration must be between 4 and ${MAX_TOTAL_SECONDS}.`);
  }

  if (totalDuration <= 8) {
    const initialDuration = [4, 6, 8].reduce((previousDuration, currentDuration) =>
      Math.abs(currentDuration - totalDuration) < Math.abs(previousDuration - totalDuration)
        ? currentDuration
        : previousDuration,
    );

    return { initialDuration, extensionCount: 0, finalDuration: initialDuration };
  }

  let bestSegmentPlan = null;
  for (const initialDuration of [4, 6, 8]) {
    const remainingDuration = totalDuration - initialDuration;
    const lowerExtensionCount = Math.floor(remainingDuration / EXTENSION_SECONDS);
    const upperExtensionCount = Math.ceil(remainingDuration / EXTENSION_SECONDS);

    for (const extensionCount of [lowerExtensionCount, upperExtensionCount]) {
      if (extensionCount < 1 || extensionCount > MAX_EXTENSIONS) {
        continue;
      }

      const finalDuration = initialDuration + extensionCount * EXTENSION_SECONDS;
      const differenceFromTarget = Math.abs(finalDuration - totalDuration);

      if (
        !bestSegmentPlan ||
        differenceFromTarget < bestSegmentPlan.differenceFromTarget ||
        (differenceFromTarget === bestSegmentPlan.differenceFromTarget &&
          initialDuration > bestSegmentPlan.initialDuration)
      ) {
        bestSegmentPlan = {
          initialDuration,
          extensionCount,
          finalDuration,
          differenceFromTarget,
        };
      }
    }
  }

  if (!bestSegmentPlan) {
    throw new Error(`Cannot calculate segments for ${totalDuration}s.`);
  }

  return {
    initialDuration: bestSegmentPlan.initialDuration,
    extensionCount: bestSegmentPlan.extensionCount,
    finalDuration: bestSegmentPlan.finalDuration,
  };
}

async function splitScenario(aiClient, scenarioText, initialDuration, extensionCount, splitModel = SPLIT_MODEL) {
  const totalSegments = 1 + extensionCount;
  const segmentDurations = [initialDuration, ...Array(extensionCount).fill(EXTENSION_SECONDS)];

  const segmentListText = segmentDurations
    .map((segmentDuration, segmentIndex) => `  Segment ${segmentIndex + 1}: ${segmentDuration} seconds`)
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
    segmentListText,
    "",
    `Scenario: ${scenarioText}`,
  ].join("\n");

  const splitResponse = await aiClient.models.generateContent({
    model: splitModel,
    config: { systemInstruction: systemPrompt },
    contents: userPrompt,
  });

  const splitResponseText = splitResponse.text.replace(/```json|```/g, "").trim();

  let parsedSegments;
  try {
    parsedSegments = JSON.parse(splitResponseText);
  } catch {
    throw new Error(`Failed to parse segment JSON from LLM:\n${splitResponseText}`);
  }

  if (!Array.isArray(parsedSegments) || parsedSegments.length !== totalSegments) {
    throw new Error(
      `Expected ${totalSegments} segments, got ${Array.isArray(parsedSegments) ? parsedSegments.length : "non-array"}.`,
    );
  }

  return parsedSegments;
}

function buildReferenceImages(referenceImagePaths) {
  if (!referenceImagePaths || referenceImagePaths.length === 0) {
    return null;
  }

  if (!Array.isArray(referenceImagePaths)) {
    throw new Error("referenceImages must be an array of image paths.");
  }

  if (referenceImagePaths.length > 3) {
    throw new Error("Veo 3.1 supports up to 3 reference images.");
  }

  return referenceImagePaths.map((referenceImagePath) => ({
    image: loadImageAsInlineData(referenceImagePath),
    referenceType: "asset",
  }));
}

function validateAspectRatio(aspectRatio) {
  if (!ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    throw new Error("Invalid aspectRatio. Allowed values: 16:9, 9:16.");
  }
}

async function pollOperation(aiClient, operation, callbacks = {}) {
  const onPolling = callbacks.onPolling || (() => {});
  let currentOperation = operation;

  while (!currentOperation.done) {
    await onPolling(currentOperation);
    await sleep(10_000);
    currentOperation = await aiClient.operations.getVideosOperation({ operation: currentOperation });
  }

  if (currentOperation.error) {
    throw new Error(currentOperation.error.message || "Video generation failed.");
  }

  const generatedVideoFile = currentOperation.response?.generatedVideos?.[0]?.video;
  if (!generatedVideoFile) {
    throw new Error("No video returned in response.");
  }

  return generatedVideoFile;
}

async function generateInitialVideo(aiClient, options) {
  const generationOperation = await aiClient.models.generateVideos({
    model: MODEL,
    prompt: options.prompt,
    image: options.firstFrameImage || undefined,
    config: {
      aspectRatio: options.aspectRatio,
      resolution: DEFAULT_RESOLUTION,
      durationSeconds: options.initialDuration,
      ...(options.lastFrameImage ? { lastFrame: options.lastFrameImage } : {}),
      ...(options.referenceImages ? { referenceImages: options.referenceImages } : {}),
    },
  });

  return pollOperation(aiClient, generationOperation, { onPolling: options.onPolling });
}

async function extendVideo(aiClient, options) {
  if (!options.videoFileId) {
    throw new Error("videoFileId is required.");
  }

  if (typeof options.onStatus === "function") {
    await options.onStatus("extending");
  }

  await sleep(30_000);

  const extensionOperation = await aiClient.models.generateVideos({
    model: MODEL,
    prompt: options.prompt,
    video: options.videoFileId,
    config: {
      aspectRatio: options.aspectRatio,
      resolution: DEFAULT_RESOLUTION,
      numberOfVideos: 1,
    },
  });

  return pollOperation(aiClient, extensionOperation, { onPolling: options.onPolling });
}

async function downloadVideo(aiClient, videoFileId, outputPath) {
  if (!videoFileId) {
    throw new Error("videoFileId is required.");
  }

  if (!outputPath) {
    throw new Error("outputPath is required.");
  }

  const resolvedOutputPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  await aiClient.files.download({ file: videoFileId, downloadPath: resolvedOutputPath });
  return resolvedOutputPath;
}

function createTaurusApi(apiConfig = {}) {
  const geminiApiKey = apiConfig.apiKey || process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY.");
  }

  const aiClient = new GoogleGenAI({ apiKey: geminiApiKey });

  async function generateVideo(prompt, options = {}) {
    if (!prompt || !prompt.trim()) {
      throw new Error("prompt is required.");
    }

    const targetDuration = options.duration ?? DEFAULT_DURATION_SECONDS;
    const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO;
    validateAspectRatio(aspectRatio);

    const segmentPlan = calculateSegments(targetDuration);
    if (!ALLOWED_INITIAL_DURATIONS.has(segmentPlan.initialDuration)) {
      throw new Error("Calculated invalid initial duration.");
    }

    const referenceImages = buildReferenceImages(options.referenceImages);
    const firstFrameImage = options.firstImagePath
      ? loadImageAsInlineData(options.firstImagePath)
      : null;
    const lastFrameImage = options.lastImagePath
      ? loadImageAsInlineData(options.lastImagePath)
      : null;

    if (referenceImages && firstFrameImage) {
      throw new Error("Use either referenceImages or firstImagePath, not both.");
    }

    if (lastFrameImage && !firstFrameImage) {
      throw new Error("lastImagePath requires firstImagePath.");
    }

    const totalSegments = 1 + segmentPlan.extensionCount;
    const onStatus = typeof options.onStatus === "function" ? options.onStatus : async () => {};

    const segmentedPrompts =
      segmentPlan.extensionCount === 0
        ? [prompt]
        : await splitScenario(
            aiClient,
            prompt,
            segmentPlan.initialDuration,
            segmentPlan.extensionCount,
            options.splitModel || SPLIT_MODEL,
          );

    await onStatus("polling", { segment: 1, totalSegments });

    let currentVideoFileId = await generateInitialVideo(aiClient, {
      prompt: segmentedPrompts[0],
      firstFrameImage,
      lastFrameImage,
      aspectRatio,
      initialDuration: segmentPlan.initialDuration,
      referenceImages,
      onPolling: async () => onStatus("polling", { segment: 1, totalSegments }),
    });

    for (let extensionIndex = 0; extensionIndex < segmentPlan.extensionCount; extensionIndex += 1) {
      const segmentNumber = extensionIndex + 2;

      await onStatus("extending", { segment: segmentNumber, totalSegments });

      currentVideoFileId = await extendVideo(aiClient, {
        videoFileId: currentVideoFileId,
        prompt: segmentedPrompts[segmentNumber - 1],
        aspectRatio,
        onStatus: async () => onStatus("extending", { segment: segmentNumber, totalSegments }),
        onPolling: async () => onStatus("polling", { segment: segmentNumber, totalSegments }),
      });
    }

    const generationResult = {
      videoFileId: currentVideoFileId,
      initialDuration: segmentPlan.initialDuration,
      extensionCount: segmentPlan.extensionCount,
      totalDuration: segmentPlan.finalDuration,
      segments: segmentedPrompts,
    };

    if (options.outputPath) {
      await onStatus("downloading", { segment: totalSegments, totalSegments });
      generationResult.outputPath = await downloadVideo(aiClient, currentVideoFileId, options.outputPath);
    }

    return generationResult;
  }

  return {
    generateVideo,
    extendVideo: async (videoFileId, prompt, options = {}) => {
      const aspectRatio = options.aspectRatio ?? DEFAULT_ASPECT_RATIO;
      validateAspectRatio(aspectRatio);

      return extendVideo(aiClient, {
        videoFileId,
        prompt,
        aspectRatio,
        onStatus: options.onStatus,
        onPolling: options.onPolling,
      });
    },
    downloadVideo: async (videoFileId, outputPath) => downloadVideo(aiClient, videoFileId, outputPath),
    splitScenario: async (scenarioText, initialDuration, extensionCount, splitModel = SPLIT_MODEL) =>
      splitScenario(aiClient, scenarioText, initialDuration, extensionCount, splitModel),
    pollOperation: async (operation, callbacks = {}) => pollOperation(aiClient, operation, callbacks),
    calculateSegments,
  };
}

module.exports = {
  MODEL,
  SPLIT_MODEL,
  EXTENSION_SECONDS,
  MAX_TOTAL_SECONDS,
  MAX_EXTENSIONS,
  calculateSegments,
  splitScenario,
  pollOperation,
  downloadVideo,
  createTaurusApi,
};
