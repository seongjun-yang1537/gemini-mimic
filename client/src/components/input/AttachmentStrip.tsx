import type { AttachedFile } from '../../types/attachment';
import AttachmentCard from './AttachmentCard';

interface AttachmentStripProps {
  attachments: AttachedFile[];
  fallbackIcon: string;
  onRemoveAttachment: (attachmentId: number) => void;
}

export default function AttachmentStrip({ attachments, fallbackIcon, onRemoveAttachment }: AttachmentStripProps) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="attachment-preview-list">
      {attachments.map((attachmentItem) => (
        <AttachmentCard
          key={attachmentItem.id}
          attachment={attachmentItem}
          fallbackIcon={fallbackIcon}
          onRemove={onRemoveAttachment}
        />
      ))}
    </div>
  );
}
