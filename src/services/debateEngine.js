class DebateEngine {
  constructor(dependencies) {
    this.geminiClient = dependencies.geminiClient;
  }

  async collectExpertOpinions(experts, context, emitEvent, videoPath, parallelExperts) {
    if (parallelExperts) {
      return Promise.all(
        experts.map(async (expertDefinition) => {
          await emitEvent({ type: "expert_start", expert: expertDefinition.name });
          const expertOpinion = await this.geminiClient.callGemini(expertDefinition.prompt, context, { videoPath });
          await emitEvent({ type: "expert_done", expert: expertDefinition.name, response: expertOpinion });
          return { name: expertDefinition.name, role: expertDefinition.role, initialOpinion: expertOpinion };
        }),
      );
    }

    const collectedOpinions = [];
    for (const expertDefinition of experts) {
      await emitEvent({ type: "expert_start", expert: expertDefinition.name });
      const expertOpinion = await this.geminiClient.callGemini(expertDefinition.prompt, context, { videoPath });
      await emitEvent({ type: "expert_done", expert: expertDefinition.name, response: expertOpinion });
      collectedOpinions.push({
        name: expertDefinition.name,
        role: expertDefinition.role,
        initialOpinion: expertOpinion,
      });
    }
    return collectedOpinions;
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
      parallelExperts = true,
    } = config;

    const expertOpinions = await this.collectExpertOpinions(experts, context, emitEvent, videoPath, parallelExperts);

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
        experts.map(async (expertDefinition) => {
          const expertResponse = await this.geminiClient.callGemini(expertDefinition.prompt, {
            facilitation,
            debateHistory,
            round,
          });
          await emitEvent({
            type: "debate_message",
            round,
            speaker: expertDefinition.name,
            role: "expert",
            content: expertResponse,
          });
          return { expert: expertDefinition.name, content: expertResponse };
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
