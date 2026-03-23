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
    this.assetService = config.assetService;
    this.runtimeConfig = {
      apiKey: this.apiKey,
      model: this.model,
      temperature: 0.7,
      maxOutputTokens: 8192,
    };
  }

  setRuntimeConfig(runtimeOverrides = {}) {
    this.runtimeConfig = {
      ...this.runtimeConfig,
      ...runtimeOverrides,
    };
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
    const parts = this.buildPartsFromContent(content);
    if (options.videoPath) {
      parts.push(buildVideoPart(options.videoPath));
    }

    const resolvedApiKey = options.apiKey || this.runtimeConfig.apiKey || this.apiKey;
    const resolvedModel = options.model || this.runtimeConfig.model || this.model;
    const resolvedTemperature = options.temperature ?? this.runtimeConfig.temperature;
    const resolvedMaxOutputTokens = options.maxOutputTokens ?? this.runtimeConfig.maxOutputTokens;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${resolvedApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: resolvedTemperature,
            maxOutputTokens: resolvedMaxOutputTokens,
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
