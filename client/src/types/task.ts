import type { ExpertKey } from './expert';

export type TaskStatus = 'running' | 'completed' | 'failed';

export interface TaskAttachment {
  name: string;
  type: 'video' | 'image';
}

export interface Task {
  id: string;
  title: string;
  input: string;
  inputType: 'video' | 'image';
  attachments: TaskAttachment[];
  status: TaskStatus;
  phase: number;
  phaseDetail: string;
  activeExperts: ExpertKey[];
  createdAt: string;
  tokens: number;
  cost: number;
}
