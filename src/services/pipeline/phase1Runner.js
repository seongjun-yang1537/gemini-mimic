async function runPhase1({ runId, services, runtimeConfig, runSafetyContext }) {
  const { runStore, promptService, debateEngine, emitEvent } = services;
  const runState = await runStore.getRun(runId);
  const phasePrompts = await promptService.loadPhasePrompts("phase1");

  const candidateExperts = [
    { name: "훅 전문가", role: "hook", prompt: phasePrompts.hook_expert, settingKey: "hook" },
    { name: "스토리 전문가", role: "story", prompt: phasePrompts.story_expert, settingKey: "story" },
    { name: "CTA 전문가", role: "cta", prompt: phasePrompts.cta_expert, settingKey: "cta" },
    { name: "행동 묘사 전문가", role: "action", prompt: phasePrompts.action_desc_expert, settingKey: "actionDesc" },
    {
      name: "캐릭터 묘사 전문가",
      role: "character",
      prompt: phasePrompts.character_desc_expert,
      settingKey: "characterDesc",
    },
  ];

  const expertDefinitions = candidateExperts.filter((expertItem) => runtimeConfig.experts.phase1[expertItem.settingKey]);

  const phase1DebateResult = await debateEngine.runDebate({
    experts: expertDefinitions,
    facilitatorPrompt: phasePrompts.facilitator,
    summarizerPrompt: phasePrompts.summarizer,
    context: "입력 밈 영상을 분석해서 마케팅 크리에이티브 시나리오를 확정해 주세요.",
    videoPath: runState.inputVideo,
    rounds: runtimeConfig.debate.rounds,
    parallelExperts: runtimeConfig.debate.parallelExperts,
    emitEvent,
    safetyContext: runSafetyContext,
    onUsage: runSafetyContext.onUsage,
  });

  return {
    phase1Result: {
      scenario: phase1DebateResult.summary,
      debateLog: phase1DebateResult,
    },
  };
}

module.exports = { runPhase1 };
