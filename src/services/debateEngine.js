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
      rounds = 3,
      videoPath,
    } = config;

    const expertOpinions = await Promise.all(
      experts.map(async (expert) => {
        await emitEvent({ type: "expert_start", expert: expert.name });
        const opinion = await this.geminiClient.callGemini(expert.prompt, context, { videoPath });
        await emitEvent({ type: "expert_done", expert: expert.name, response: opinion });
        return { name: expert.name, role: expert.role, initialOpinion: opinion };
      }),
    );

    const debateRounds = [];
    let debateHistory = "";

    for (let round = 1; round <= rounds; round += 1) {
      const facilitation = await this.geminiClient.callGemini(
        facilitatorPrompt,
        { expertOpinions, debateHistory, round },
      );
      await emitEvent({
        type: "debate_message",
        round,
        speaker: "진행자",
        role: "facilitator",
        content: facilitation,
      });

      const roundResponses = await Promise.all(
        experts.map(async (expert) => {
          const response = await this.geminiClient.callGemini(expert.prompt, {
            facilitation,
            debateHistory,
            round,
          });
          await emitEvent({
            type: "debate_message",
            round,
            speaker: expert.name,
            role: "expert",
            content: response,
          });
          return { expert: expert.name, content: response };
        }),
      );

      debateRounds.push({
        roundNumber: round,
        facilitation,
        responses: roundResponses,
      });
      debateHistory += `\n[Round ${round}]\n${facilitation}\n${JSON.stringify(roundResponses)}`;
      await emitEvent({ type: "debate_round_end", round });
    }

    const summary = await this.geminiClient.callGemini(summarizerPrompt, debateHistory);
    await emitEvent({ type: "summary_done", content: summary });

    return {
      experts: expertOpinions,
      rounds: debateRounds,
      summary,
    };
  }
}

module.exports = { DebateEngine };
