// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");
const { SETTINGS_DEFAULTS, SETTINGS_SCHEMA, SETTINGS_CATEGORIES } = require("../config/settingsDefaults");

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeObjects(baseObject, overrideObject) {
  if (!overrideObject || typeof overrideObject !== "object" || Array.isArray(overrideObject)) {
    return baseObject;
  }

  const mergedObject = { ...baseObject };
  for (const [overrideKey, overrideValue] of Object.entries(overrideObject)) {
    if (
      overrideValue &&
      typeof overrideValue === "object" &&
      !Array.isArray(overrideValue) &&
      mergedObject[overrideKey] &&
      typeof mergedObject[overrideKey] === "object" &&
      !Array.isArray(mergedObject[overrideKey])
    ) {
      mergedObject[overrideKey] = mergeObjects(mergedObject[overrideKey], overrideValue);
      continue;
    }
    mergedObject[overrideKey] = overrideValue;
  }

  return mergedObject;
}

function getValueByPath(sourceObject, keyPath) {
  return keyPath.split(".").reduce((currentValue, keyPart) => {
    if (currentValue === undefined || currentValue === null) {
      return undefined;
    }
    return currentValue[keyPart];
  }, sourceObject);
}

function setValueByPath(targetObject, keyPath, nextValue) {
  const pathParts = keyPath.split(".");
  let currentNode = targetObject;
  for (let pathIndex = 0; pathIndex < pathParts.length - 1; pathIndex += 1) {
    const pathPart = pathParts[pathIndex];
    if (!currentNode[pathPart] || typeof currentNode[pathPart] !== "object") {
      currentNode[pathPart] = {};
    }
    currentNode = currentNode[pathPart];
  }
  currentNode[pathParts[pathParts.length - 1]] = nextValue;
}

function maskApiKey(apiKeyValue) {
  if (!apiKeyValue) {
    return "";
  }
  if (apiKeyValue.length <= 4) {
    return "*".repeat(apiKeyValue.length);
  }
  return `${"*".repeat(Math.max(0, apiKeyValue.length - 4))}${apiKeyValue.slice(-4)}`;
}

class SettingsService {
  constructor(options = {}) {
    this.configDirectory = path.resolve(options.configDirectory || "./config");
    this.configFilePath = path.join(this.configDirectory, "config.json");
    this.envApiKey = (options.envApiKey || "").trim();
    this.operatorEnvOverrides = deepClone(options.operatorEnvOverrides || {});
    fs.mkdirSync(this.configDirectory, { recursive: true });
    this.ensureConfigFile();
  }

  ensureConfigFile() {
    if (fs.existsSync(this.configFilePath)) {
      return;
    }
    const initialConfig = this.getDefaultConfig();
    fs.writeFileSync(this.configFilePath, JSON.stringify(initialConfig, null, 2), "utf8");
  }

  getDefaultConfig() {
    const codeDefaultConfig = deepClone(SETTINGS_DEFAULTS);
    codeDefaultConfig.gemini.apiKey = this.envApiKey;
    return mergeObjects(codeDefaultConfig, this.operatorEnvOverrides);
  }

  readConfig() {
    const codeDefaultConfig = deepClone(SETTINGS_DEFAULTS);
    codeDefaultConfig.gemini.apiKey = this.envApiKey;
    const fileText = fs.readFileSync(this.configFilePath, "utf8");
    const parsedConfig = JSON.parse(fileText);
    const codeAndFileMergedConfig = mergeObjects(codeDefaultConfig, parsedConfig);
    return mergeObjects(codeAndFileMergedConfig, this.operatorEnvOverrides);
  }

  writeConfig(nextConfig) {
    fs.writeFileSync(this.configFilePath, JSON.stringify(nextConfig, null, 2), "utf8");
  }

  getSettings(options = {}) {
    const includeSensitive = options.includeSensitive === true;
    const loadedConfig = this.readConfig();
    if (includeSensitive) {
      return loadedConfig;
    }
    return {
      ...loadedConfig,
      gemini: {
        ...loadedConfig.gemini,
        apiKey: "",
        apiKeyMasked: maskApiKey(loadedConfig.gemini.apiKey),
      },
    };
  }

  getDefaults(options = {}) {
    const includeSensitive = options.includeSensitive === true;
    const defaults = this.getDefaultConfig();
    if (includeSensitive) {
      return defaults;
    }
    return {
      ...defaults,
      gemini: {
        ...defaults.gemini,
        apiKey: "",
        apiKeyMasked: maskApiKey(defaults.gemini.apiKey),
      },
    };
  }

  getSchema() {
    return SETTINGS_SCHEMA;
  }

  patchSettings(flatPatchObject) {
    const currentConfig = this.readConfig();
    const writableConfig = deepClone(currentConfig);

    for (const [keyPath, nextValue] of Object.entries(flatPatchObject || {})) {
      if (!SETTINGS_SCHEMA[keyPath]) {
        continue;
      }
      if (SETTINGS_SCHEMA[keyPath].readOnly) {
        continue;
      }
      if (keyPath === "gemini.apiKey" && typeof nextValue === "string" && !nextValue.trim()) {
        continue;
      }
      if (keyPath === "gemini.apiKey" && typeof nextValue === "string" && nextValue.includes("*")) {
        throw new Error("마스킹된 API 키는 저장할 수 없습니다.");
      }
      setValueByPath(writableConfig, keyPath, nextValue);
    }

    this.validateConfig(writableConfig);
    this.writeConfig(writableConfig);
    return writableConfig;
  }

  resetSettings(categoryName) {
    const currentConfig = this.readConfig();
    const defaultConfig = this.getDefaultConfig();

    if (!categoryName) {
      this.writeConfig(defaultConfig);
      return defaultConfig;
    }

    if (!SETTINGS_CATEGORIES.includes(categoryName)) {
      throw new Error("지원하지 않는 category입니다.");
    }

    const resetConfig = deepClone(currentConfig);
    resetConfig[categoryName] = deepClone(defaultConfig[categoryName]);
    this.validateConfig(resetConfig);
    this.writeConfig(resetConfig);
    return resetConfig;
  }

  validateConfig(configObject) {
    const totalExpertsEnabled = Object.values(configObject.experts.phase1).filter(Boolean).length +
      Object.values(configObject.experts.phase3).filter(Boolean).length;

    if (totalExpertsEnabled < 1) {
      throw new Error("전문가는 최소 1명 이상 활성화되어야 합니다.");
    }

    if (configObject.video.pollTimeoutMs < configObject.video.pollInterval) {
      throw new Error("video.pollTimeoutMs는 video.pollInterval 이상이어야 합니다.");
    }

    for (const [keyPath, schemaItem] of Object.entries(SETTINGS_SCHEMA)) {
      const settingValue = getValueByPath(configObject, keyPath);
      if (schemaItem.type === "number" || schemaItem.type === "slider") {
        if (typeof settingValue !== "number" || Number.isNaN(settingValue)) {
          throw new Error(`${keyPath}는 숫자여야 합니다.`);
        }
        if (schemaItem.min !== undefined && settingValue < schemaItem.min) {
          throw new Error(`${keyPath}는 ${schemaItem.min} 이상이어야 합니다.`);
        }
        if (schemaItem.max !== undefined && settingValue > schemaItem.max) {
          throw new Error(`${keyPath}는 ${schemaItem.max} 이하여야 합니다.`);
        }
      }
      if (schemaItem.type === "boolean" && typeof settingValue !== "boolean") {
        throw new Error(`${keyPath}는 boolean이어야 합니다.`);
      }
      if ((schemaItem.type === "string" || schemaItem.type === "select") && typeof settingValue !== "string" && typeof settingValue !== "number") {
        throw new Error(`${keyPath}는 문자열 또는 숫자여야 합니다.`);
      }
      if (schemaItem.options && !schemaItem.options.includes(settingValue)) {
        throw new Error(`${keyPath} 값이 허용 범위를 벗어났습니다.`);
      }
    }
  }
}

module.exports = { SettingsService, maskApiKey };
