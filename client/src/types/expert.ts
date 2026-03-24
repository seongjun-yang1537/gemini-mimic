export type ExpertKey = 'hook' | 'story' | 'cta' | 'action' | 'character';

export interface ExpertDescriptor {
  key: ExpertKey;
  label: string;
  dotClassName: string;
}
