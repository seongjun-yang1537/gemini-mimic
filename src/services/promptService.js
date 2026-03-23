// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");

class PromptService {
  constructor(promptsDirectory) {
    this.promptsDirectory = path.resolve(promptsDirectory || process.env.PROMPTS_DIR || "./prompts");
  }

  listPrompts() {
    const phaseEntries = fs.readdirSync(this.promptsDirectory, { withFileTypes: true });
    return phaseEntries
      .filter((entry) => entry.isDirectory())
      .flatMap((phaseEntry) => {
        const phaseDirectoryPath = path.join(this.promptsDirectory, phaseEntry.name);
        return fs
          .readdirSync(phaseDirectoryPath, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
          .map((promptEntry) => {
            const filePath = path.join(phaseDirectoryPath, promptEntry.name);
            const fileStats = fs.statSync(filePath);
            return {
              phase: phaseEntry.name,
              expert: promptEntry.name.replace(".md", ""),
              fileName: promptEntry.name,
              updatedAt: fileStats.mtime.toISOString(),
            };
          });
      });
  }

  getPrompt(phase, expert) {
    const promptFilePath = path.join(this.promptsDirectory, phase, `${expert}.md`);
    if (!fs.existsSync(promptFilePath)) {
      throw new Error("Prompt not found");
    }
    return fs.readFileSync(promptFilePath, "utf8");
  }

  updatePrompt(phase, expert, content) {
    const phaseDirectoryPath = path.join(this.promptsDirectory, phase);
    fs.mkdirSync(phaseDirectoryPath, { recursive: true });
    const promptFilePath = path.join(phaseDirectoryPath, `${expert}.md`);
    fs.writeFileSync(promptFilePath, content, "utf8");
    return { phase, expert };
  }

  loadPhasePrompts(phase) {
    const phaseDirectoryPath = path.join(this.promptsDirectory, phase);
    const promptFileNames = fs
      .readdirSync(phaseDirectoryPath)
      .filter((fileName) => fileName.endsWith(".md"));

    const phasePrompts = {};
    for (const promptFileName of promptFileNames) {
      const promptPath = path.join(phaseDirectoryPath, promptFileName);
      phasePrompts[promptFileName.replace(".md", "")] = fs.readFileSync(promptPath, "utf8");
    }
    return phasePrompts;
  }
}

module.exports = { PromptService };
