const express = require("express");

function createPromptRoutes({ promptService, geminiClient }) {
  const promptRouter = express.Router();

  promptRouter.get("/api/prompts", (_request, response) => {
    response.json(promptService.listPrompts());
  });

  promptRouter.get("/api/prompts/:phase/:expert", (request, response) => {
    try {
      const promptContent = promptService.getPrompt(request.params.phase, request.params.expert);
      response.json({ content: promptContent });
    } catch (error) {
      response.status(404).json({ error: error.message });
    }
  });

  promptRouter.put("/api/prompts/:phase/:expert", (request, response) => {
    const { content } = request.body;
    if (typeof content !== "string") {
      response.status(400).json({ error: "content는 문자열이어야 합니다." });
      return;
    }
    const updateResult = promptService.updatePrompt(request.params.phase, request.params.expert, content);
    response.json(updateResult);
  });

  promptRouter.post("/api/prompts/ai-update", async (request, response) => {
    const { feedback } = request.body;
    if (!feedback) {
      response.status(400).json({ error: "feedback이 필요합니다." });
      return;
    }

    const promptList = promptService.listPrompts();
    const promptSnapshot = promptList.map((promptItem) => ({
      phase: promptItem.phase,
      expert: promptItem.expert,
      content: promptService.getPrompt(promptItem.phase, promptItem.expert),
    }));

    const updaterPrompt = promptService.getPrompt("meta", "prompt_updater");
    const updateSuggestion = await geminiClient.callGemini(updaterPrompt, {
      feedback,
      prompts: promptSnapshot,
      format: "JSON array: [{phase,expert,before,after,reason}]",
    });

    response.json({ suggestion: updateSuggestion });
  });

  return promptRouter;
}

module.exports = {
  createPromptRoutes,
};
