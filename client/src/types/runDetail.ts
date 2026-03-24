export type RunDetailStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type RunPhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PhaseDetail {
  phase: number;
  name: string;
  status: RunPhaseStatus;
  elapsedSeconds: number;
}

export interface CostInfo {
  apiCalls: number;
  maxApiCalls: number;
  tokenCount: number;
  costUsd: number;
}

export interface ArtifactInfo {
  name: string;
  type: 'document' | 'image' | 'video' | 'audio';
}

export interface RunDetail {
  id: string;
  title: string;
  status: RunDetailStatus;
  elapsedSeconds: number;
  phases: PhaseDetail[];
  cost: CostInfo;
  artifacts: ArtifactInfo[];
  summary: string;
  errorMessage?: string;
}

export type RunDetailTabKey = 'debate' | 'scenario' | 'artifacts' | 'logs';
