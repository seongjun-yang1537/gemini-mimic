// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");

class PromptService {
  constructor(promptsDirectory) {
    this.promptsDirectory = path.resolve(promptsDirectory || process.env.PROMPTS_DIR || "./prompts");
  }

  async listPrompts() {
    const phaseEntries = await fs.promises.readdir(this.promptsDirectory, { withFileTypes: true });
    const promptGroups = await Promise.all(
      phaseEntries
        .filter((entry) => entry.isDirectory())
        .map(async (phaseEntry) => {
          const phaseDirectoryPath = path.join(this.promptsDirectory, phaseEntry.name);
          const promptEntries = await fs.promises.readdir(phaseDirectoryPath, { withFileTypes: true });
          const promptMetadataList = await Promise.all(
            promptEntries
              .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
              .map(async (promptEntry) => {
                const filePath = path.join(phaseDirectoryPath, promptEntry.name);
                const fileStats = await fs.promises.stat(filePath);
                return {
                  phase: phaseEntry.name,
                  expert: promptEntry.name.replace(".md", ""),
                  fileName: promptEntry.name,
                  updatedAt: fileStats.mtime.toISOString(),
                };
              }),
          );
          return promptMetadataList;
        }),
    );
    return promptGroups.flat();
  }

  async getPrompt(phase, expert) {
    const promptFilePath = path.join(this.promptsDirectory, phase, `${expert}.md`);
    try {
      await fs.promises.access(promptFilePath, fs.constants.F_OK);
    } catch (_error) {
      throw new Error("Prompt not found");
    }
    return fs.promises.readFile(promptFilePath, "utf8");
  }

  async updatePrompt(phase, expert, content) {
    const phaseDirectoryPath = path.join(this.promptsDirectory, phase);
    await fs.promises.mkdir(phaseDirectoryPath, { recursive: true });
    const promptFilePath = path.join(phaseDirectoryPath, `${expert}.md`);
    await fs.promises.writeFile(promptFilePath, content, "utf8");
    return { phase, expert };
  }

  async loadPhasePrompts(phase) {
    const phaseDirectoryPath = path.join(this.promptsDirectory, phase);
    const promptFileNames = (await fs.promises.readdir(phaseDirectoryPath)).filter((fileName) => fileName.endsWith(".md"));

    const phasePrompts = {};
    for (const promptFileName of promptFileNames) {
      const promptPath = path.join(phaseDirectoryPath, promptFileName);
      phasePrompts[promptFileName.replace(".md", "")] = await fs.promises.readFile(promptPath, "utf8");
    }
    return phasePrompts;
  }
}

module.exports = { PromptService };
