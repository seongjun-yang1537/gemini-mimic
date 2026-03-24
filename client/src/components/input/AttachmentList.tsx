import type { AttachedFile } from '../../types/attachment';
import AttachmentPreview from './AttachmentPreview';

interface AttachmentListProps {
  attachmentItems: AttachedFile[];
  fallbackImageIcon: string;
  onRemoveAttachment: (attachmentId: number) => void;
}

export default function AttachmentList({ attachmentItems, fallbackImageIcon, onRemoveAttachment }: AttachmentListProps) {
  if (!attachmentItems.length) {
    return null;
  }

  return (
    <div className="attachment-preview-list">
      {attachmentItems.map((attachmentItem) => (
        <AttachmentPreview
          key={attachmentItem.id}
          attachmentItem={attachmentItem}
          fallbackIcon={fallbackImageIcon}
          onRemove={onRemoveAttachment}
        />
      ))}
    </div>
  );
}
