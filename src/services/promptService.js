// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs/promises");
const path = require("node:path");

class PromptService {
  constructor(promptsDirectory) {
    this.promptsDirectory = path.resolve(promptsDirectory || process.env.PROMPTS_DIR || "./prompts");
  }

  async listPrompts() {
    const phaseEntries = await fs.readdir(this.promptsDirectory, { withFileTypes: true });
    const promptsByPhase = await Promise.all(
      phaseEntries.filter((entry) => entry.isDirectory()).map(async (phaseEntry) => {
        const phaseDirectoryPath = path.join(this.promptsDirectory, phaseEntry.name);
        const promptEntries = await fs.readdir(phaseDirectoryPath, { withFileTypes: true });
        const promptMetadata = await Promise.all(
          promptEntries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .map(async (promptEntry) => {
              const filePath = path.join(phaseDirectoryPath, promptEntry.name);
              const fileStats = await fs.stat(filePath);
              return {
                phase: phaseEntry.name,
                expert: promptEntry.name.replace(".md", ""),
                fileName: promptEntry.name,
                updatedAt: fileStats.mtime.toISOString(),
              };
            }),
        );
        return promptMetadata;
      }),
    );

    return promptsByPhase.flat();
  }

  async getPrompt(phase, expert) {
    const promptFilePath = path.join(this.promptsDirectory, phase, `${expert}.md`);
    try {
      return await fs.readFile(promptFilePath, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error("Prompt not found");
      }
      throw error;
    }
  }

  async updatePrompt(phase, expert, content) {
    const phaseDirectoryPath = path.join(this.promptsDirectory, phase);
    await fs.mkdir(phaseDirectoryPath, { recursive: true });
    const promptFilePath = path.join(phaseDirectoryPath, `${expert}.md`);
    await fs.writeFile(promptFilePath, content, "utf8");
    return { phase, expert };
  }

  async loadPhasePrompts(phase) {
    const phaseDirectoryPath = path.join(this.promptsDirectory, phase);
    const promptFileNames = (await fs.readdir(phaseDirectoryPath)).filter((fileName) => fileName.endsWith(".md"));

    const promptContentEntries = await Promise.all(
      promptFileNames.map(async (promptFileName) => {
        const promptPath = path.join(phaseDirectoryPath, promptFileName);
        const promptContent = await fs.readFile(promptPath, "utf8");
        return [promptFileName.replace(".md", ""), promptContent];
      }),
    );

    return Object.fromEntries(promptContentEntries);
  }
}

module.exports = { PromptService };
