const path = require('path');
const fs = require('fs/promises');
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectoryPath = path.join(__dirname, '..', 'public');
const promptsDirectoryPath = path.join(__dirname, '..', 'prompts');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDirectoryPath));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/prompts', async (_request, response, next) => {
  const promptItems = [];
  async function collectPrompts(currentDirectoryPath) {
    const directoryEntries = await fs.readdir(currentDirectoryPath, { withFileTypes: true });
    await Promise.all(
      directoryEntries.map(async (directoryEntry) => {
        const entryPath = path.join(currentDirectoryPath, directoryEntry.name);
        if (directoryEntry.isDirectory()) {
          await collectPrompts(entryPath);
          return;
        }
        if (!directoryEntry.isFile() || !directoryEntry.name.endsWith('.md')) {
          return;
        }
        promptItems.push({
          id: path.relative(promptsDirectoryPath, entryPath).replace(/\\/g, '/'),
          name: directoryEntry.name
        });
      })
    );
  }

  try {
    await collectPrompts(promptsDirectoryPath);
    promptItems.sort((firstPromptItem, secondPromptItem) => firstPromptItem.id.localeCompare(secondPromptItem.id));
    response.json({ prompts: promptItems });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    error: error instanceof Error ? error.message : '서버 오류',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

app.get('/{*fallbackPath}', (_request, response) => {
  response.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[mimic] server listening on http://localhost:${port}`);
});
