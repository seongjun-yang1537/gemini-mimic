export const MOCK_RUN_DETAILS = {
    'debug-1': {
        id: 'debug-1',
        title: '고양이 밈 — 놀란 표정 리액션',
        status: 'running',
        elapsedSeconds: 337,
        phases: [
            { phase: 1, name: '밈 분석 + 토론', status: 'completed', elapsedSeconds: 192 },
            { phase: 2, name: '레퍼런스 생성', status: 'running', elapsedSeconds: 105 },
            { phase: 3, name: '영상 생성', status: 'pending', elapsedSeconds: 0 },
            { phase: 4, name: '편집', status: 'pending', elapsedSeconds: 0 }
        ],
        input: {
            promptText: '고양이 밈의 놀란 표정을 유지하면서 Backpack Arena 리런칭용 9:16 광고 시나리오로 바꿔줘. 첫 3초 훅은 강하게, CTA는 마지막에 넣어줘. @영상1과 @이미지1 캐릭터 디자인을 참고해.',
            attachments: [
                { id: 1, tag: '@영상1', type: 'video', name: 'cat-reaction-source.mp4', thumbnailUrl: null },
                { id: 2, tag: '@이미지1', type: 'image', name: 'hero-reference-sheet.png', thumbnailUrl: null }
            ]
        },
        cost: { apiCalls: 12, maxApiCalls: 200, tokenCount: 12482, costUsd: 0.24 },
        artifacts: [],
        summary: 'Phase 1 완료: 전문가 5명 분석 후 3라운드 토론 진행. 훅 전문가 의견이 최종 시나리오에 가장 크게 반영됨.'
    },
    'debug-2': {
        id: 'debug-2',
        title: 'GTA 웨스텔 — 용사 등장씬',
        status: 'completed',
        elapsedSeconds: 1680,
        phases: [
            { phase: 1, name: '밈 분석 + 토론', status: 'completed', elapsedSeconds: 245 },
            { phase: 2, name: '레퍼런스 생성', status: 'completed', elapsedSeconds: 180 },
            { phase: 3, name: '영상 생성', status: 'completed', elapsedSeconds: 1140 },
            { phase: 4, name: '편집', status: 'completed', elapsedSeconds: 115 }
        ],
        input: {
            promptText: 'GTA 스타일 진입 연출을 템빨용사 세계관으로 옮겨서 용사 등장 광고를 만들어줘. 세 장의 레퍼런스를 일관되게 쓰고, 과장된 줌 인과 텍스트 오버레이를 포함해.',
            attachments: [
                { id: 1, tag: '@영상1', type: 'video', name: 'gta-arrival-meme.mp4', thumbnailUrl: null },
                { id: 2, tag: '@이미지1', type: 'image', name: 'westel-face.png', thumbnailUrl: null },
                { id: 3, tag: '@이미지2', type: 'image', name: 'backpack-arena-ui.png', thumbnailUrl: null }
            ]
        },
        cost: { apiCalls: 34, maxApiCalls: 200, tokenCount: 78342, costUsd: 1.42 },
        artifacts: [
            { name: 'scenario_final.md', type: 'document' },
            { name: 'reference_sheet_1.png', type: 'image' },
            { name: 'reference_sheet_2.png', type: 'image' },
            { name: 'output_creative.mp4', type: 'video' }
        ],
        summary: '전체 파이프라인 완료. 영상 1회 생성으로 합격 판정. 편집 단계에서 16:9 → 9:16 세로 변환 적용.'
    },
    'debug-3': {
        id: 'debug-3',
        title: 'This is fine — 보스전 밈',
        status: 'failed',
        elapsedSeconds: 720,
        phases: [
            { phase: 1, name: '밈 분석 + 토론', status: 'completed', elapsedSeconds: 210 },
            { phase: 2, name: '레퍼런스 생성', status: 'completed', elapsedSeconds: 165 },
            { phase: 3, name: '영상 생성', status: 'failed', elapsedSeconds: 345 },
            { phase: 4, name: '편집', status: 'pending', elapsedSeconds: 0 }
        ],
        input: {
            promptText: 'This is fine 밈의 무심한 감정을 살리되 보스전 실패 직전 상황으로 바꿔줘. 캐릭터 외형은 @이미지1 기준으로 고정하고 화염 효과는 과하지 않게.',
            attachments: [
                { id: 1, tag: '@영상1', type: 'video', name: 'this-is-fine.mp4', thumbnailUrl: null },
                { id: 2, tag: '@이미지1', type: 'image', name: 'boss-character-reference.jpg', thumbnailUrl: null }
            ]
        },
        cost: { apiCalls: 28, maxApiCalls: 200, tokenCount: 28731, costUsd: 0.56 },
        artifacts: [
            { name: 'scenario_final.md', type: 'document' },
            { name: 'reference_sheet_1.png', type: 'image' }
        ],
        summary: 'Phase 3에서 Veo3 생성 타임아웃. 3회 재시도 후 실패.',
        errorMessage: 'Veo3 generation timed out after 3 attempts (pollTimeoutMs: 180000)'
    }
};
