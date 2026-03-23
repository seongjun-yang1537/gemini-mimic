const { DEBATE_ROUNDS_DEFAULT, DEBATE_ROUNDS_HARD_LIMIT } = require("../config/runtimeConstants");

// Generated under Codex compliance with AGENTS.md (gemini-mimic)
class DebateEngine {
  constructor(dependencies) {
    this.geminiClient = dependencies.geminiClient;
  }

  async runDebate(config) {
    const {
      experts,
      facilitatorPrompt,
      summarizerPrompt,
      context,
      emitEvent,
      rounds = DEBATE_ROUNDS_DEFAULT,
      videoPath,
      parallelExperts = true,
      safetyContext,
      onUsage,
    } = config;
    const safeRoundCount = Math.min(rounds, DEBATE_ROUNDS_HARD_LIMIT);

    const runExpertCalls = async (expertList, callFn) => {
      if (parallelExperts) {
        return Promise.all(expertList.map((expertItem) => callFn(expertItem)));
      }
      const resultList = [];
      for (const expertItem of expertList) {
        resultList.push(await callFn(expertItem));
      }
      return resultList;
    };

    const expertOpinions = await runExpertCalls(experts, async (expert) => {
      await emitEvent({ type: "expert_start", expert: expert.name });
      const opinion = await this.geminiClient.callGemini(expert.prompt, context, { videoPath, safetyContext, onUsage });
      await emitEvent({ type: "expert_done", expert: expert.name, response: opinion });
      return { name: expert.name, role: expert.role, initialOpinion: opinion };
    });

    const debateRounds = [];
    let debateHistory = "";

    for (let round = 1; round <= safeRoundCount; round += 1) {
      const facilitation = await this.geminiClient.callGemini(
        facilitatorPrompt,
        { expertOpinions, debateHistory, round },
        { safetyContext, onUsage },
      );
      await emitEvent({
        type: "debate_message",
        round,
        speaker: "진행자",
        role: "facilitator",
        content: facilitation,
      });

      const roundResponses = await runExpertCalls(experts, async (expert) => {
        const response = await this.geminiClient.callGemini(expert.prompt, {
          facilitation,
          debateHistory,
          round,
        }, { safetyContext, onUsage });
        await emitEvent({
          type: "debate_message",
          round,
          speaker: expert.name,
          role: "expert",
          content: response,
        });
        return { expert: expert.name, content: response };
      });

      debateRounds.push({
        roundNumber: round,
        facilitation,
        responses: roundResponses,
      });
      debateHistory += `\n[Round ${round}]\n${facilitation}\n${JSON.stringify(roundResponses)}`;
      await emitEvent({ type: "debate_round_end", round });
    }

    const summary = await this.geminiClient.callGemini(summarizerPrompt, debateHistory, { safetyContext, onUsage });
    await emitEvent({ type: "summary_done", content: summary });

    return {
      experts: expertOpinions,
      rounds: debateRounds,
      summary,
    };
  }
}

module.exports = { DebateEngine };
