import { useMemo, useState } from 'react';
import type { Task } from '../types/task';

function createNewTask(taskTitle: string): Task {
  return {
    id: `run-${Date.now()}`,
    title: taskTitle,
    status: 'running',
    currentPhase: 1,
    phaseStatuses: [
      { phase: 1, status: 'running' },
      { phase: 2, status: 'pending' },
      { phase: 3, status: 'pending' },
      { phase: 4, status: 'pending' }
    ],
    costUsd: 0,
    tokenCount: 0,
    createdAt: '방금 전',
    statusLabel: '전문가 분석 준비 중',
    expertDots: ['purple']
  };
}

export function useTasks() {
  const [taskItems, setTaskItems] = useState<Task[]>([]);
  const taskCount = useMemo(() => taskItems.length, [taskItems.length]);

  const prependTask = (taskTitle: string) => {
    const normalizedTaskTitle = taskTitle.trim();
    if (!normalizedTaskTitle) {
      return;
    }

    const createdTask = createNewTask(normalizedTaskTitle);
    setTaskItems((currentTaskItems) => [createdTask, ...currentTaskItems]);
  };

  return { taskItems, taskCount, prependTask, isLoading: false };
}
