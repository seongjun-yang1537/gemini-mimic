import { useMemo, useState } from 'react';
import type { Task } from '../types/task';

const MOCK_TASKS: Task[] = [
  {
    id: 'run-001',
    title: '고양이 밈 — 놀란 표정 리액션',
    input: 'cat_reaction.mp4',
    inputType: 'video',
    attachments: [],
    status: 'running',
    phase: 2,
    phaseDetail: '토론 2라운드 진행 중',
    activeExperts: ['hook', 'story', 'cta'],
    createdAt: '3분 전',
    tokens: 12482,
    cost: 0.24
  },
  {
    id: 'run-002',
    title: 'GTA 워스텔 — 용사 등장씬',
    input: 'gta_intro.mp4',
    inputType: 'video',
    attachments: [],
    status: 'completed',
    phase: 4,
    phaseDetail: '완료',
    activeExperts: [],
    createdAt: '28분 전',
    tokens: 78342,
    cost: 1.42
  },
  {
    id: 'run-003',
    title: 'This is fine — 보스전 밈',
    input: 'this_is_fine.gif',
    inputType: 'image',
    attachments: [],
    status: 'failed',
    phase: 3,
    phaseDetail: 'Veo3 실패',
    activeExperts: [],
    createdAt: '2시간 전',
    tokens: 28731,
    cost: 0.56
  }
];

export function useTasks() {
  const [taskItems, setTaskItems] = useState<Task[]>(MOCK_TASKS);

  const taskCount = useMemo(() => taskItems.length, [taskItems.length]);

  const prependTask = (taskTitle: string) => {
    const normalizedTitle = taskTitle.trim();
    if (!normalizedTitle) {
      return;
    }

    const createdTask: Task = {
      id: `run-${Date.now()}`,
      title: normalizedTitle,
      input: 'manual-input.txt',
      inputType: 'image',
      attachments: [],
      status: 'running',
      phase: 1,
      phaseDetail: '전문가 분석 준비 중',
      activeExperts: ['hook'],
      createdAt: '방금 전',
      tokens: 0,
      cost: 0
    };

    setTaskItems((currentTaskItems) => [createdTask, ...currentTaskItems]);
  };

  return { taskItems, taskCount, prependTask };
}
