export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface PhaseInfo {
  phase: number;
  status: PhaseStatus;
}

export type ExpertDotColor = 'purple' | 'teal' | 'coral' | 'pink';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  currentPhase: number;
  phaseStatuses: PhaseInfo[];
  costUsd: number;
  tokenCount: number;
  createdAt: string;
  statusLabel: string;
  expertDots?: ExpertDotColor[];
}
