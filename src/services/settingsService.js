const fs = require("node:fs");
const path = require("node:path");
const { getOptionalGeminiApiKey } = require("../config/environment");

const settingSchema = {
  "gemini.apiKey": { type: "string", sensitive: true },
  "gemini.model": { type: "select", options: ["gemini-3-pro", "gemini-2.5-pro", "gemini-2.5-flash"] },
  "gemini.temperature": { type: "number", min: 0, max: 2 },
  "gemini.maxOutputTokens": { type: "number", min: 1 },
  "debate.rounds": { type: "number", min: 1, max: 10 },
  "debate.parallelExperts": { type: "boolean" },
  "video.model": { type: "string" },
  "video.defaultDuration": { type: "select", options: [4, 6, 8] },
  "video.aspectRatio": { type: "select", options: ["16:9", "9:16"] },
  "video.resolution": { type: "select", options: ["720p"] },
  "video.maxIterations": { type: "number", min: 1, max: 10 },
  "video.extensionSeconds": { type: "number", readOnly: true },
  "video.maxTotalSeconds": { type: "number", readOnly: true },
  "video.postProcessingWait": { type: "number", min: 0 },
  "video.pollInterval": { type: "number", min: 1000 },
  "video.splitModel": { type: "select", options: ["gemini-3-flash-preview", "gemini-2.5-flash"] },
  "image.model": { type: "string" },
  "image.maxReferenceSheets": { type: "number", min: 1, max: 3 },
  "ffmpeg.path": { type: "string" },
  "ffmpeg.defaultCodec": { type: "select", options: ["libx264", "libx265"] },
  "ffmpeg.defaultCrf": { type: "number", min: 0, max: 51 },
  "ffmpeg.defaultPreset": {
    type: "select",
    options: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"],
  },
  "experts.phase1.hook": { type: "boolean" },
  "experts.phase1.story": { type: "boolean" },
  "experts.phase1.cta": { type: "boolean" },
  "experts.phase1.actionDesc": { type: "boolean" },
  "experts.phase1.characterDesc": { type: "boolean" },
  "experts.phase3.actionEval": { type: "boolean" },
  "experts.phase3.characterEval": { type: "boolean" },
  "experts.phase3.scenarioEval": { type: "boolean" },
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getValueByPath(targetObject, keyPath) {
  return keyPath.split(".").reduce((currentValue, keyPart) => currentValue?.[keyPart], targetObject);
}

function setValueByPath(targetObject, keyPath, value) {
  const keyParts = keyPath.split(".");
  let currentObject = targetObject;
  for (let index = 0; index < keyParts.length - 1; index += 1) {
    const currentKey = keyParts[index];
    if (!currentObject[currentKey] || typeof currentObject[currentKey] !== "object") {
      currentObject[currentKey] = {};
    }
    currentObject = currentObject[currentKey];
  }
  currentObject[keyParts[keyParts.length - 1]] = value;
}

function maskApiKey(apiKeyValue) {
  if (!apiKeyValue || typeof apiKeyValue !== "string") {
    return "";
  }
  const visibleLength = Math.min(4, apiKeyValue.length);
  return `${"*".repeat(Math.max(0, apiKeyValue.length - visibleLength))}${apiKeyValue.slice(-visibleLength)}`;
}

function buildDefaultSettings() {
  return {
    gemini: {
      apiKey: getOptionalGeminiApiKey(),
      model: "gemini-3-pro",
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
    debate: {
      rounds: 3,
      parallelExperts: true,
    },
    video: {
      model: "veo-3.1-generate-preview",
      defaultDuration: 8,
      aspectRatio: "16:9",
      resolution: "720p",
      maxIterations: 3,
      extensionSeconds: 7,
      maxTotalSeconds: 148,
      postProcessingWait: 30000,
      pollInterval: 10000,
      splitModel: "gemini-3-flash-preview",
    },
    image: {
      model: "imagen-4.0-generate-001",
      maxReferenceSheets: 3,
    },
    ffmpeg: {
      path: "ffmpeg",
      defaultCodec: "libx264",
      defaultCrf: 23,
      defaultPreset: "medium",
    },
    experts: {
      phase1: {
        hook: true,
        story: true,
        cta: true,
        actionDesc: true,
        characterDesc: true,
      },
      phase3: {
        actionEval: true,
        characterEval: true,
        scenarioEval: true,
      },
    },
  };
}

function validateSettingValue(settingKey, settingValue) {
  const schemaRule = settingSchema[settingKey];
  if (!schemaRule) {
    throw new Error(`지원하지 않는 설정 키입니다: ${settingKey}`);
  }

  if (schemaRule.type === "string") {
    if (typeof settingValue !== "string") {
      throw new Error(`${settingKey}는 문자열이어야 합니다.`);
    }
    return;
  }

  if (schemaRule.type === "boolean") {
    if (typeof settingValue !== "boolean") {
      throw new Error(`${settingKey}는 boolean이어야 합니다.`);
    }
    return;
  }

  if (schemaRule.type === "number") {
    if (typeof settingValue !== "number" || Number.isNaN(settingValue)) {
      throw new Error(`${settingKey}는 숫자여야 합니다.`);
    }
    if (schemaRule.min !== undefined && settingValue < schemaRule.min) {
      throw new Error(`${settingKey}는 ${schemaRule.min} 이상이어야 합니다.`);
    }
    if (schemaRule.max !== undefined && settingValue > schemaRule.max) {
      throw new Error(`${settingKey}는 ${schemaRule.max} 이하여야 합니다.`);
    }
    return;
  }

  if (schemaRule.type === "select") {
    if (!schemaRule.options.includes(settingValue)) {
      throw new Error(`${settingKey}는 허용된 값만 사용할 수 있습니다.`);
    }
  }
}

function validateExpertsEnabled(settingsObject) {
  const phase1Flags = Object.values(settingsObject.experts.phase1);
  const phase3Flags = Object.values(settingsObject.experts.phase3);
  if (!phase1Flags.some(Boolean)) {
    throw new Error("Phase 1 전문가는 최소 1명 이상 활성화되어야 합니다.");
  }
  if (!phase3Flags.some(Boolean)) {
    throw new Error("Phase 3 전문가는 최소 1명 이상 활성화되어야 합니다.");
  }
}

class SettingsService {
  constructor(options = {}) {
    this.storagePath = path.resolve(options.storagePath || "./config/config.json");
    fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
    this.ensureSettingsFile();
  }

  ensureSettingsFile() {
    const defaultSettings = buildDefaultSettings();
    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(this.storagePath, JSON.stringify(defaultSettings, null, 2), "utf8");
      return;
    }

    const persistedSettings = this.readRawSettings();
    const mergedSettings = this.mergeWithDefaults(persistedSettings);
    this.writeSettings(mergedSettings);
  }

  mergeWithDefaults(partialSettings) {
    const defaultSettings = buildDefaultSettings();
    const mergedSettings = deepClone(defaultSettings);

    for (const settingKey of Object.keys(settingSchema)) {
      const incomingValue = getValueByPath(partialSettings, settingKey);
      if (incomingValue === undefined) {
        continue;
      }
      setValueByPath(mergedSettings, settingKey, incomingValue);
    }

    return mergedSettings;
  }

  readRawSettings() {
    const jsonText = fs.readFileSync(this.storagePath, "utf8");
    return JSON.parse(jsonText);
  }

  readSettings() {
    const loadedSettings = this.readRawSettings();
    return this.mergeWithDefaults(loadedSettings);
  }

  writeSettings(nextSettings) {
    fs.writeFileSync(this.storagePath, JSON.stringify(nextSettings, null, 2), "utf8");
  }

  getSettings() {
    return this.readSettings();
  }

  getSettingsForResponse() {
    const settingsData = this.readSettings();
    return this.maskSensitiveSettings(settingsData);
  }

  getDefaults() {
    return buildDefaultSettings();
  }

  getDefaultsForResponse() {
    return this.maskSensitiveSettings(this.getDefaults());
  }

  maskSensitiveSettings(settingsObject) {
    const safeSettings = deepClone(settingsObject);
    safeSettings.gemini.apiKey = maskApiKey(settingsObject.gemini.apiKey);
    return safeSettings;
  }

  updateSettings(flatUpdates) {
    if (!flatUpdates || typeof flatUpdates !== "object" || Array.isArray(flatUpdates)) {
      throw new Error("PATCH 본문은 객체여야 합니다.");
    }

    const currentSettings = this.readSettings();
    const nextSettings = deepClone(currentSettings);

    for (const [settingKey, settingValue] of Object.entries(flatUpdates)) {
      if (!settingSchema[settingKey]) {
        throw new Error(`지원하지 않는 설정 키입니다: ${settingKey}`);
      }
      if (settingSchema[settingKey].readOnly) {
        throw new Error(`${settingKey}는 읽기 전용입니다.`);
      }
      if (settingKey === "gemini.apiKey" && typeof settingValue === "string" && settingValue.startsWith("***")) {
        continue;
      }
      validateSettingValue(settingKey, settingValue);
      setValueByPath(nextSettings, settingKey, settingValue);
    }

    validateExpertsEnabled(nextSettings);
    this.writeSettings(nextSettings);
    return this.maskSensitiveSettings(nextSettings);
  }

  resetSettings(categoryName) {
    const defaultSettings = this.getDefaults();
    if (!categoryName) {
      this.writeSettings(defaultSettings);
      return this.maskSensitiveSettings(defaultSettings);
    }

    const allowedCategories = ["gemini", "debate", "video", "image", "ffmpeg", "experts"];
    if (!allowedCategories.includes(categoryName)) {
      throw new Error("유효하지 않은 카테고리입니다.");
    }

    const currentSettings = this.readSettings();
    currentSettings[categoryName] = deepClone(defaultSettings[categoryName]);
    validateExpertsEnabled(currentSettings);
    this.writeSettings(currentSettings);
    return this.maskSensitiveSettings(currentSettings);
  }
}

module.exports = { SettingsService, settingSchema };
