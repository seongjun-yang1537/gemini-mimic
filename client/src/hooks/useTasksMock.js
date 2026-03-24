import { useMemo, useState } from 'react';
import { MOCK_TASKS } from '../debug/mockTasks';
function createPhaseStatuses(status) {
    if (status === 'completed') {
        return [
            { phase: 1, status: 'completed' },
            { phase: 2, status: 'completed' },
            { phase: 3, status: 'completed' },
            { phase: 4, status: 'completed' }
        ];
    }
    if (status === 'failed') {
        return [
            { phase: 1, status: 'completed' },
            { phase: 2, status: 'completed' },
            { phase: 3, status: 'failed' },
            { phase: 4, status: 'pending' }
        ];
    }
    return [
        { phase: 1, status: 'completed' },
        { phase: 2, status: 'running' },
        { phase: 3, status: 'pending' },
        { phase: 4, status: 'pending' }
    ];
}
function createMockTask(status) {
    const uniqueValue = Date.now();
    if (status === 'completed') {
        return {
            id: `debug-completed-${uniqueValue}`,
            title: `디버그 완료 작업 ${uniqueValue}`,
            status,
            currentPhase: 4,
            phaseStatuses: createPhaseStatuses(status),
            costUsd: 1.18,
            tokenCount: 65410,
            createdAt: '방금 전',
            statusLabel: '완료',
            expertDots: []
        };
    }
    if (status === 'failed') {
        return {
            id: `debug-failed-${uniqueValue}`,
            title: `디버그 실패 작업 ${uniqueValue}`,
            status,
            currentPhase: 3,
            phaseStatuses: createPhaseStatuses(status),
            costUsd: 0.48,
            tokenCount: 19400,
            createdAt: '방금 전',
            statusLabel: 'Veo3 실패',
            expertDots: []
        };
    }
    return {
        id: `debug-running-${uniqueValue}`,
        title: `디버그 진행 작업 ${uniqueValue}`,
        status: 'running',
        currentPhase: 2,
        phaseStatuses: createPhaseStatuses('running'),
        costUsd: 0.31,
        tokenCount: 16700,
        createdAt: '방금 전',
        statusLabel: '토론 2라운드 진행 중',
        expertDots: ['purple', 'teal', 'coral']
    };
}
export function useTasksMock() {
    const [taskItems, setTaskItems] = useState(MOCK_TASKS);
    const taskCount = useMemo(() => taskItems.length, [taskItems.length]);
    const prependTask = (taskTitle) => {
        const normalizedTaskTitle = taskTitle.trim();
        if (!normalizedTaskTitle) {
            return;
        }
        const createdTask = createMockTask('running');
        setTaskItems((currentTaskItems) => [{ ...createdTask, title: normalizedTaskTitle }, ...currentTaskItems]);
    };
    const appendTaskByStatus = (status) => {
        const createdTask = createMockTask(status);
        setTaskItems((currentTaskItems) => [createdTask, ...currentTaskItems]);
    };
    const resetTaskItems = () => {
        setTaskItems(MOCK_TASKS);
    };
    return { taskItems, taskCount, prependTask, appendTaskByStatus, resetTaskItems, isLoading: false };
}
