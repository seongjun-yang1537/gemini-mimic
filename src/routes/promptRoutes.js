const express = require("express");
const { validateRequest } = require("../http/middlewares/validateRequest");
const { asyncRoute } = require("../http/middlewares/errorHandler");

function createPromptRoutes({ promptService, geminiClient }) {
  const promptRouter = express.Router();
  const slugPattern = /^[a-zA-Z0-9_-]+$/;

  const validatePromptParams = (routeParams = {}) => {
    const validationErrors = [];
    if (!routeParams.phase || !slugPattern.test(routeParams.phase)) {
      validationErrors.push({ field: "params.phase", message: "phase는 영문/숫자/_/-만 허용됩니다." });
    }
    if (!routeParams.expert || !slugPattern.test(routeParams.expert)) {
      validationErrors.push({ field: "params.expert", message: "expert는 영문/숫자/_/-만 허용됩니다." });
    }
    return validationErrors;
  };

  promptRouter.get(
    "/api/prompts",
    asyncRoute(async (_request, response) => {
      response.json(await promptService.listPrompts());
    }),
  );

  promptRouter.get(
    "/api/prompts/:phase/:expert",
    validateRequest({ params: validatePromptParams }),
    asyncRoute(async (request, response) => {
      const promptContent = await promptService.getPrompt(request.params.phase, request.params.expert);
      response.json({ content: promptContent });
    }),
  );

  promptRouter.put(
    "/api/prompts/:phase/:expert",
    validateRequest({
      params: validatePromptParams,
      body: (bodyPayload = {}) => {
        if (typeof bodyPayload.content !== "string") {
          return { field: "body.content", message: "content는 문자열이어야 합니다." };
        }
        return null;
      },
    }),
    asyncRoute(async (request, response) => {
      const promptUpdateResult = await promptService.updatePrompt(
        request.params.phase,
        request.params.expert,
        request.body.content,
      );
      response.json(promptUpdateResult);
    }),
  );

  promptRouter.post(
    "/api/prompts/ai-update",
    validateRequest({
      body: (bodyPayload = {}) => {
        if (typeof bodyPayload.feedback !== "string" || !bodyPayload.feedback.trim()) {
          return { field: "body.feedback", message: "feedback이 필요합니다." };
        }
        return null;
      },
    }),
    asyncRoute(async (request, response) => {
      const feedbackText = request.body.feedback;
      const promptMetadataList = await promptService.listPrompts();
      const promptSnapshot = promptMetadataList.map((promptMetadata) => ({
        phase: promptMetadata.phase,
        expert: promptMetadata.expert,
        content: promptService.getPrompt(promptMetadata.phase, promptMetadata.expert),
      }));

      const resolvedPromptSnapshot = await Promise.all(
        promptSnapshot.map(async (snapshotItem) => ({
          ...snapshotItem,
          content: await snapshotItem.content,
        })),
      );

      const updaterPrompt = await promptService.getPrompt("meta", "prompt_updater");
      const updateSuggestion = await geminiClient.callGemini(updaterPrompt, {
        feedback: feedbackText,
        prompts: resolvedPromptSnapshot,
        format: "JSON array: [{phase,expert,before,after,reason}]",
      });

      response.json({ suggestion: updateSuggestion });
    }),
  );

  return promptRouter;
}

module.exports = { createPromptRoutes };
