import AttachmentCard from './AttachmentCard';
export default function AttachmentStrip({ attachments, fallbackIcon, onRemoveAttachment }) {
    if (!attachments.length) {
        return null;
    }
    return (<div className="attachment-preview-list">
      {attachments.map((attachmentItem) => (<AttachmentCard key={attachmentItem.id} attachment={attachmentItem} fallbackIcon={fallbackIcon} onRemove={onRemoveAttachment}/>))}
    </div>);
}
