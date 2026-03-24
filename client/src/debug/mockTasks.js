export const MOCK_TASKS = [
    {
        id: 'debug-1',
        title: '고양이 밈 — 놀란 표정 리액션',
        status: 'running',
        currentPhase: 2,
        phaseStatuses: [
            { phase: 1, status: 'completed' },
            { phase: 2, status: 'running' },
            { phase: 3, status: 'pending' },
            { phase: 4, status: 'pending' }
        ],
        costUsd: 0.24,
        tokenCount: 12482,
        createdAt: '3분 전',
        statusLabel: '토론 2라운드 진행 중',
        expertDots: ['purple', 'teal', 'coral']
    },
    {
        id: 'debug-2',
        title: 'GTA 웨스텔 — 용사 등장씬',
        status: 'completed',
        currentPhase: 4,
        phaseStatuses: [
            { phase: 1, status: 'completed' },
            { phase: 2, status: 'completed' },
            { phase: 3, status: 'completed' },
            { phase: 4, status: 'completed' }
        ],
        costUsd: 1.42,
        tokenCount: 78342,
        createdAt: '28분 전',
        statusLabel: '완료',
        expertDots: []
    },
    {
        id: 'debug-3',
        title: 'This is fine — 보스전 밈',
        status: 'failed',
        currentPhase: 3,
        phaseStatuses: [
            { phase: 1, status: 'completed' },
            { phase: 2, status: 'completed' },
            { phase: 3, status: 'failed' },
            { phase: 4, status: 'pending' }
        ],
        costUsd: 0.56,
        tokenCount: 28731,
        createdAt: '2시간 전',
        statusLabel: 'Veo3 실패',
        expertDots: []
    }
];
