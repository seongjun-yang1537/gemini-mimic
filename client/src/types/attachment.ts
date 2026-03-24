export type AttachmentType = 'video' | 'image';

export interface AttachedFile {
  id: number;
  file: File;
  type: AttachmentType;
  index: number;
  tag: string;
  thumbnailUrl: string;
}
