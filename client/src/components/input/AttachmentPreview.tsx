import type { AttachedFile } from '../../types/attachment';

interface AttachmentPreviewProps {
  attachmentItem: AttachedFile;
  fallbackIcon: string;
  onRemove: (attachmentId: number) => void;
}

export default function AttachmentPreview({ attachmentItem, fallbackIcon, onRemove }: AttachmentPreviewProps) {
  return (
    <article className="attachment-preview-card">
      <div className="attachment-thumb">
        <img src={attachmentItem.thumbnailUrl || fallbackIcon} alt={attachmentItem.file.name} />
        {attachmentItem.type === 'video' ? <span className="attachment-play-indicator">▶</span> : null}
      </div>
      <div className="attachment-tag">{attachmentItem.tag}</div>
      <div className="attachment-file-row">
        <span className="attachment-filename" title={attachmentItem.file.name}>{attachmentItem.file.name}</span>
        <button className="attachment-remove" type="button" onClick={() => onRemove(attachmentItem.id)} aria-label="첨부 제거">×</button>
      </div>
    </article>
  );
}
