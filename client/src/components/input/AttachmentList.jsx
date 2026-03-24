import AttachmentPreview from './AttachmentPreview';
export default function AttachmentList({ attachmentItems, fallbackImageIcon, onRemoveAttachment }) {
    if (!attachmentItems.length) {
        return null;
    }
    return (<div className="attachment-preview-list">
      {attachmentItems.map((attachmentItem) => (<AttachmentPreview key={attachmentItem.id} attachmentItem={attachmentItem} fallbackIcon={fallbackImageIcon} onRemove={onRemoveAttachment}/>))}
    </div>);
}
