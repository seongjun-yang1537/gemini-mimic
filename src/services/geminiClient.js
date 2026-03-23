// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const { getRequiredGeminiApiKey } = require("../config/environment");

function buildTextPart(content) {
  if (typeof content === "string") {
    return { text: content };
  }
  return { text: JSON.stringify(content) };
}

function buildVideoPart(videoPath) {
  const videoBytes = fs.readFileSync(videoPath).toString("base64");
  return {
    inline_data: {
      mime_type: "video/mp4",
      data: videoBytes,
    },
  };
}

class GeminiClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || getRequiredGeminiApiKey();
    this.model = config.model || "gemini-3-pro";
    this.temperature = config.temperature ?? 0.7;
    this.maxOutputTokens = config.maxOutputTokens ?? 8192;
    this.assetService = config.assetService;
  }

  setRuntimeConfig(runtimeConfig = {}) {
    if (typeof runtimeConfig.apiKey === "string" && runtimeConfig.apiKey.trim()) {
      this.apiKey = runtimeConfig.apiKey.trim();
    }
    if (typeof runtimeConfig.model === "string" && runtimeConfig.model.trim()) {
      this.model = runtimeConfig.model.trim();
    }
    if (typeof runtimeConfig.temperature === "number") {
      this.temperature = runtimeConfig.temperature;
    }
    if (typeof runtimeConfig.maxOutputTokens === "number") {
      this.maxOutputTokens = runtimeConfig.maxOutputTokens;
    }
  }

  buildPartsFromContent(content) {
    if (typeof content !== "string") {
      return [buildTextPart(content)];
    }

    if (!this.assetService || !content.includes("@")) {
      return [buildTextPart(content)];
    }

    const resolvedPromptPayload = this.assetService.buildGeminiPartsFromPrompt(content);
    return resolvedPromptPayload.parts;
  }

  async callGemini(systemPrompt, content, options = {}) {
    const modelName = options.model || this.model;
    const apiKey = options.apiKey || this.apiKey;
    const temperatureValue = options.temperature ?? this.temperature;
    const maxOutputTokensValue = options.maxOutputTokens ?? this.maxOutputTokens;
    const parts = this.buildPartsFromContent(content);
    if (options.videoPath) {
      parts.push(buildVideoPart(options.videoPath));
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: temperatureValue,
            maxOutputTokens: maxOutputTokensValue,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const responsePayload = await response.json();
    return responsePayload?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}

module.exports = { GeminiClient };
