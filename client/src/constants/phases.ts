export const PHASE_LABELS = ['1', '2', '3', '4'];

export const DASHBOARD_TABS = [
  { key: 'tasks', label: '작업' },
  { key: 'prompts', label: '프롬프트' },
  { key: 'assets', label: '에셋' },
  { key: 'settings', label: '설정' }
] as const;

export type DashboardTabKey = (typeof DASHBOARD_TABS)[number]['key'];
