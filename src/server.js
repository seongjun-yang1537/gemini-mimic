const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const express = require('express');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectoryPath = path.join(__dirname, '..', 'public');
const promptsDirectoryPath = path.join(__dirname, '..', 'prompts');
const clientDistDirectoryPath = path.join(__dirname, '..', 'client', 'dist');
const outputsDirectoryPath = path.join(__dirname, '..', 'outputs');
const runsFilePath = path.join(outputsDirectoryPath, 'runs.json');
const isProductionMode = process.env.NODE_ENV === 'production';
const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const geminiModel = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';

let runFileAccessQueue = Promise.resolve();

function isAllowedDevelopmentOrigin(requestOrigin) {
  if (!requestOrigin) {
    return false;
  }

  try {
    const parsedOrigin = new URL(requestOrigin);
    return ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname);
  } catch (_error) {
    return false;
  }
}

app.use((request, response, next) => {
  const requestOrigin = request.headers.origin;
  const isAllowedOrigin = isProductionMode
    ? requestOrigin === `http://localhost:${port}`
    : isAllowedDevelopmentOrigin(requestOrigin);

  if (requestOrigin && isAllowedOrigin) {
    response.header('Access-Control-Allow-Origin', requestOrigin);
    response.header('Vary', 'Origin');
  }
  response.header('Access-Control-Allow-Headers', 'Content-Type');
  response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

if (isProductionMode) {
  app.use(express.static(clientDistDirectoryPath));
} else {
  app.use('/public', express.static(publicDirectoryPath));
}

function serializeAttachmentInput(attachments = []) {
  return attachments.map((attachmentItem, attachmentIndex) => ({
    id: attachmentItem.id ?? attachmentIndex + 1,
    tag: String(attachmentItem.tag || '').trim(),
    type: attachmentItem.type === 'video' ? 'video' : 'image',
    name: String(attachmentItem.name || `attachment-${attachmentIndex + 1}`),
    thumbnailUrl: attachmentItem.thumbnailUrl || null
  }));
}

function createPhaseStatuses(status) {
  if (status === 'completed') {
    return [
      { phase: 1, status: 'completed' },
      { phase: 2, status: 'pending' },
      { phase: 3, status: 'pending' },
      { phase: 4, status: 'pending' }
    ];
  }

  if (status === 'failed') {
    return [
      { phase: 1, status: 'failed' },
      { phase: 2, status: 'pending' },
      { phase: 3, status: 'pending' },
      { phase: 4, status: 'pending' }
    ];
  }

  return [
    { phase: 1, status: 'running' },
    { phase: 2, status: 'pending' },
    { phase: 3, status: 'pending' },
    { phase: 4, status: 'pending' }
  ];
}

function getStatusLabel(status) {
  if (status === 'completed') {
    return 'Phase 1 감상 완료';
  }
  if (status === 'failed') {
    return 'Phase 1 실패';
  }
  return 'Phase 1 실행 중';
}

function toTaskSummary(runRecord) {
  return {
    id: runRecord.id,
    title: runRecord.title,
    promptText: runRecord.input.promptText,
    attachments: runRecord.input.attachments,
    status: runRecord.status,
    currentPhase: runRecord.currentPhase,
    phaseStatuses: createPhaseStatuses(runRecord.status),
    costUsd: runRecord.cost.costUsd,
    tokenCount: runRecord.cost.tokenCount,
    createdAt: runRecord.createdAtLabel,
    statusLabel: getStatusLabel(runRecord.status),
    expertDots: runRecord.status === 'running' ? ['purple'] : []
  };
}

async function ensureRunsFile() {
  await fs.mkdir(outputsDirectoryPath, { recursive: true });
  try {
    await fs.access(runsFilePath);
  } catch (_error) {
    await fs.writeFile(runsFilePath, '[]', 'utf8');
  }
}

async function readRuns() {
  await ensureRunsFile();
  const rawContent = await fs.readFile(runsFilePath, 'utf8');
  const parsedContent = JSON.parse(rawContent);
  return Array.isArray(parsedContent) ? parsedContent : [];
}

async function writeRuns(runItems) {
  await ensureRunsFile();
  await fs.writeFile(runsFilePath, `${JSON.stringify(runItems, null, 2)}\n`, 'utf8');
}

function queueRunFileOperation(operation) {
  const queuedOperation = runFileAccessQueue.then(operation);
  runFileAccessQueue = queuedOperation.catch(() => {});
  return queuedOperation;
}

async function listRuns() {
  return queueRunFileOperation(async () => {
    const runItems = await readRuns();
    return runItems.sort((leftRun, rightRun) => {
      return new Date(rightRun.createdAt).getTime() - new Date(leftRun.createdAt).getTime();
    });
  });
}

async function saveRun(runRecord) {
  return queueRunFileOperation(async () => {
    const runItems = await readRuns();
    const existingIndex = runItems.findIndex((savedRun) => savedRun.id === runRecord.id);
    if (existingIndex >= 0) {
      runItems[existingIndex] = runRecord;
    } else {
      runItems.unshift(runRecord);
    }
    await writeRuns(runItems);
    return runRecord;
  });
}

async function findRunById(runId) {
  const runItems = await listRuns();
  return runItems.find((runItem) => runItem.id === runId) ?? null;
}

function buildRunTitle(promptText, attachments) {
  if (promptText) {
    return promptText.length > 48 ? `${promptText.slice(0, 48)}...` : promptText;
  }
  if (attachments.length) {
    return attachments.map((attachmentItem) => attachmentItem.tag || attachmentItem.name).join(' ');
  }
  return '새로운 크리에이티브 요청';
}

function buildGeminiPrompt(promptText, attachments) {
  const attachmentText = attachments.length
    ? attachments.map((attachmentItem) => `- ${attachmentItem.tag || attachmentItem.name} (${attachmentItem.type}, ${attachmentItem.name})`).join('\n')
    : '- 첨부 자료 없음';

  return [
    '너는 밈 기반 마케팅 크리에이티브를 빠르게 검토하는 phase 1 분석가다.',
    '사용자 입력을 읽고 아래 형식으로 한국어 감상을 써라.',
    '1. 한 줄 요약',
    '2. 왜 흥미로운지',
    '3. 어떤 방향으로 영상화하면 좋을지',
    '전체 3~5문장, 과장 없이 간결하게 쓴다.',
    '',
    '[사용자 프롬프트]',
    promptText || '프롬프트 없음',
    '',
    '[첨부 자료]',
    attachmentText
  ].join('\n');
}

async function generatePhase1Impression(promptText, attachments) {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다. 프로젝트 루트 .env를 확인하세요.');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  const response = await ai.models.generateContent({
    model: geminiModel,
    contents: buildGeminiPrompt(promptText, attachments)
  });

  return {
    text: String(response.text || '').trim(),
    tokenCount: response.usageMetadata?.totalTokenCount || 0
  };
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/run', async (_request, response, next) => {
  try {
    const runItems = await listRuns();
    response.json({ runs: runItems.map(toTaskSummary) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/run/:id', async (request, response, next) => {
  try {
    const runRecord = await findRunById(request.params.id);
    if (!runRecord) {
      response.status(404).json({
        error: '작업 정보를 찾을 수 없습니다.',
        code: 'RUN_NOT_FOUND'
      });
      return;
    }
    response.json({ run: runRecord });
  } catch (error) {
    next(error);
  }
});

app.post('/api/run', async (request, response, next) => {
  const promptText = String(request.body?.promptText || '').trim();
  const attachments = serializeAttachmentInput(Array.isArray(request.body?.attachments) ? request.body.attachments : []);

  if (!promptText && attachments.length === 0) {
    response.status(400).json({
      error: '프롬프트나 첨부 자료 중 하나는 필요합니다.',
      code: 'INVALID_RUN_INPUT'
    });
    return;
  }

  const startedAt = Date.now();
  const runId = randomUUID();
  const baseRun = {
    id: runId,
    title: buildRunTitle(promptText, attachments),
    status: 'running',
    currentPhase: 1,
    elapsedSeconds: 0,
    phases: [
      { phase: 1, name: '밈 분석 + 감상', status: 'running', elapsedSeconds: 0 },
      { phase: 2, name: '레퍼런스 생성', status: 'pending', elapsedSeconds: 0 },
      { phase: 3, name: '영상 생성', status: 'pending', elapsedSeconds: 0 },
      { phase: 4, name: '편집', status: 'pending', elapsedSeconds: 0 }
    ],
    cost: {
      apiCalls: 0,
      maxApiCalls: 200,
      tokenCount: 0,
      costUsd: 0
    },
    input: {
      promptText,
      attachments
    },
    artifacts: [],
    summary: 'Phase 1 실행 중',
    phase1: {
      impression: '',
      model: geminiModel
    },
    logs: ['Phase 1 실행을 시작했습니다.'],
    errorMessage: '',
    createdAt: new Date().toISOString(),
    createdAtLabel: '방금 전',
    updatedAt: new Date().toISOString()
  };

  try {
    const phase1Result = await generatePhase1Impression(promptText, attachments);
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const completedRun = {
      ...baseRun,
      status: 'completed',
      elapsedSeconds,
      phases: [
        { phase: 1, name: '밈 분석 + 감상', status: 'completed', elapsedSeconds },
        { phase: 2, name: '레퍼런스 생성', status: 'pending', elapsedSeconds: 0 },
        { phase: 3, name: '영상 생성', status: 'pending', elapsedSeconds: 0 },
        { phase: 4, name: '편집', status: 'pending', elapsedSeconds: 0 }
      ],
      cost: {
        ...baseRun.cost,
        apiCalls: 1,
        tokenCount: phase1Result.tokenCount
      },
      summary: phase1Result.text || 'Phase 1 감상을 생성했지만 텍스트가 비어 있습니다.',
      phase1: {
        impression: phase1Result.text || '감상 결과가 비어 있습니다.',
        model: geminiModel
      },
      logs: [
        'Phase 1 실행을 시작했습니다.',
        `Gemini 모델(${geminiModel})로 사용자 입력 감상을 생성했습니다.`
      ],
      updatedAt: new Date().toISOString()
    };

    await saveRun(completedRun);
    response.status(201).json({ run: completedRun, task: toTaskSummary(completedRun) });
  } catch (error) {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const failedRun = {
      ...baseRun,
      status: 'failed',
      elapsedSeconds,
      phases: [
        { phase: 1, name: '밈 분석 + 감상', status: 'failed', elapsedSeconds },
        { phase: 2, name: '레퍼런스 생성', status: 'pending', elapsedSeconds: 0 },
        { phase: 3, name: '영상 생성', status: 'pending', elapsedSeconds: 0 },
        { phase: 4, name: '편집', status: 'pending', elapsedSeconds: 0 }
      ],
      summary: 'Phase 1 감상 생성에 실패했습니다.',
      logs: [
        'Phase 1 실행을 시작했습니다.',
        `실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      ],
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
      updatedAt: new Date().toISOString()
    };

    await saveRun(failedRun);
    response.status(500).json({
      error: failedRun.errorMessage,
      code: 'PHASE1_FAILED',
      run: failedRun,
      task: toTaskSummary(failedRun)
    });
  }
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
