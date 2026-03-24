export const MOCK_TASKS = [
    {
        id: 'debug-1',
        title: '고양이 밈 — 놀란 표정 리액션',
        promptText: '고양이 밈의 놀란 표정을 유지하면서 Backpack Arena 리런칭용 9:16 광고 시나리오로 바꿔줘. 첫 3초 훅은 강하게, CTA는 마지막에 넣어줘. @영상1과 @이미지1 캐릭터 디자인을 참고해.',
        attachments: [
            { id: 1, tag: '@영상1', type: 'video', name: 'cat-reaction-source.mp4', thumbnailUrl: null },
            { id: 2, tag: '@이미지1', type: 'image', name: 'hero-reference-sheet.png', thumbnailUrl: null }
        ],
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
        promptText: 'GTA 스타일 진입 연출을 템빨용사 세계관으로 옮겨서 용사 등장 광고를 만들어줘. 세 장의 레퍼런스를 일관되게 쓰고, 과장된 줌 인과 텍스트 오버레이를 포함해.',
        attachments: [
            { id: 1, tag: '@영상1', type: 'video', name: 'gta-arrival-meme.mp4', thumbnailUrl: null },
            { id: 2, tag: '@이미지1', type: 'image', name: 'westel-face.png', thumbnailUrl: null },
            { id: 3, tag: '@이미지2', type: 'image', name: 'backpack-arena-ui.png', thumbnailUrl: null }
        ],
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
        promptText: 'This is fine 밈의 무심한 감정을 살리되 보스전 실패 직전 상황으로 바꿔줘. 캐릭터 외형은 @이미지1 기준으로 고정하고 화염 효과는 과하지 않게.',
        attachments: [
            { id: 1, tag: '@영상1', type: 'video', name: 'this-is-fine.mp4', thumbnailUrl: null },
            { id: 2, tag: '@이미지1', type: 'image', name: 'boss-character-reference.jpg', thumbnailUrl: null }
        ],
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
