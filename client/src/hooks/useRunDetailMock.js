import { useMemo } from 'react';
import { MOCK_RUN_DETAILS } from '../debug/mockRunDetails';
export function useRunDetailMock(runId) {
    const mockRunDetail = useMemo(() => {
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
