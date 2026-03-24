const path = require('path');
const fs = require('fs/promises');
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectoryPath = path.join(__dirname, '..', 'public');
const promptsDirectoryPath = path.join(__dirname, '..', 'prompts');
const clientDistDirectoryPath = path.join(__dirname, '..', 'client', 'dist');
const isProductionMode = process.env.NODE_ENV === 'production';
const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

if (isProductionMode) {
  app.use(express.static(clientDistDirectoryPath));
} else {
  app.use('/public', express.static(publicDirectoryPath));
}

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

app.get('/{*fallbackPath}', (request, response) => {
  if (isProductionMode) {
    response.sendFile(path.join(clientDistDirectoryPath, 'index.html'));
    return;
  }

  const requestPath = request.originalUrl === '/' ? '/' : request.originalUrl;
  response.status(200).type('html').send(`<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Mimic Dev</title></head><body><p>개발 모드는 Vite dev server(${viteDevServerUrl})를 사용합니다.</p><p><a href="${viteDevServerUrl}${requestPath}">${viteDevServerUrl}${requestPath}</a></p></body></html>`);
});

app.listen(port, () => {
  const modeLabel = isProductionMode ? 'production(client/dist)' : `development(vite: ${viteDevServerUrl})`;
  console.log(`[mimic] server listening on http://localhost:${port} (${modeLabel})`);
});
