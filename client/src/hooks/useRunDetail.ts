import { useMemo } from 'react';
import type { RunDetail } from '../types/runDetail';

function createPlaceholderRunDetail(runId: string): RunDetail {
  return {
    id: runId,
    title: `작업 ${runId}`,
    status: 'pending',
    elapsedSeconds: 0,
    phases: [
      { phase: 1, name: '밈 분석 + 토론', status: 'pending', elapsedSeconds: 0 },
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
    artifacts: [],
    summary: '파이프라인 시작 대기 중'
  };
}

export function useRunDetail(runId: string | undefined) {
  const productionRunDetail = useMemo<RunDetail | null>(() => {
    if (!runId) {
      return null;
    }

    return createPlaceholderRunDetail(runId);
  }, [runId]);

  return {
    runDetail: productionRunDetail,
    elapsedSeconds: productionRunDetail?.elapsedSeconds ?? 0,
    isLoading: false
  };
}
