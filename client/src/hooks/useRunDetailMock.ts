import { useMemo } from 'react';
import { MOCK_RUN_DETAILS } from '../debug/mockRunDetails';
import type { RunDetail } from '../types/runDetail';

export function useRunDetailMock(runId: string | undefined) {
  const mockRunDetail = useMemo<RunDetail | null>(() => {
    if (!runId) {
      return null;
    }

    return MOCK_RUN_DETAILS[runId] ?? null;
  }, [runId]);

  return {
    runDetail: mockRunDetail,
    elapsedSeconds: mockRunDetail?.elapsedSeconds ?? 0,
    isLoading: false
  };
}
