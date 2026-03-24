import { useEffect, useState } from 'react';

function getApiBaseUrl() {
    if (typeof window === 'undefined') {
        return '';
    }
    const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (configuredApiBaseUrl) {
        return configuredApiBaseUrl;
    }
    const apiPort = import.meta.env.VITE_API_PORT || '4000';
    if (window.location.port && window.location.port !== apiPort) {
        return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
    }
    return '';
}

async function parseJsonResponse(response) {
    const responseText = await response.text();
    try {
        return responseText ? JSON.parse(responseText) : {};
    } catch (_error) {
        throw new Error('API가 JSON 대신 HTML을 반환했습니다. 개발 서버와 API 서버 포트를 확인하세요.');
    }
}

function createPlaceholderRunDetail(runId) {
    return {
        id: runId,
        title: `작업 ${runId}`,
        status: 'pending',
        elapsedSeconds: 0,
        phases: [
            { phase: 1, name: '밈 분석 + 감상', status: 'pending', elapsedSeconds: 0 },
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
            promptText: '',
            attachments: []
        },
        artifacts: [],
        summary: '파이프라인 시작 대기 중',
        phase1: {
            impression: ''
        },
        logs: []
    };
}

export function useRunDetail(runId) {
    const [runDetail, setRunDetail] = useState(runId ? createPlaceholderRunDetail(runId) : null);
    const [isLoading, setIsLoading] = useState(Boolean(runId));
    const apiBaseUrl = getApiBaseUrl();

    useEffect(() => {
        if (!runId) {
            setRunDetail(null);
            setIsLoading(false);
            return;
        }

        let isDisposed = false;
        setIsLoading(true);

        async function fetchRunDetail() {
            try {
                const response = await fetch(`${apiBaseUrl}/api/run/${runId}`);
                const payload = await parseJsonResponse(response);
                if (!response.ok) {
                    throw new Error(payload?.error || '작업 정보를 불러오지 못했습니다.');
                }
                if (!isDisposed) {
                    setRunDetail(payload.run);
                }
            } catch (error) {
                if (!isDisposed) {
                    console.error(error);
                    setRunDetail(null);
                }
            } finally {
                if (!isDisposed) {
                    setIsLoading(false);
                }
            }
        }

        fetchRunDetail();

        return () => {
            isDisposed = true;
        };
    }, [apiBaseUrl, runId]);

    return {
        runDetail,
        elapsedSeconds: runDetail?.elapsedSeconds ?? 0,
        isLoading
    };
}
