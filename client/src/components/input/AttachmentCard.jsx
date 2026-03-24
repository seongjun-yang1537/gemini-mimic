export default function AttachmentCard({ attachment, fallbackIcon, onRemove }) {
    return (<article className="attachment-preview-card">
      <div className="attachment-thumb">
        <img src={attachment.thumbnailUrl || fallbackIcon} alt={attachment.file.name}/>
        {attachment.type === 'video' ? <span className="attachment-play-indicator">▶</span> : null}
      </div>
      <div className="attachment-tag">{attachment.tag}</div>
      <div className="attachment-file-row">
        <span className="attachment-filename" title={attachment.file.name}>{attachment.file.name}</span>
        <button className="attachment-remove" type="button" onClick={() => onRemove(attachment.id)} aria-label="첨부 제거">×</button>
      </div>
    </article>);
}
