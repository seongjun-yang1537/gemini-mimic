import { FALLBACK_ICON } from '../../utils/fallbackIcons';

function getAttachmentTypeLabel(type) {
    if (type === 'video') {
        return '영상';
    }
    if (type === 'image') {
        return '이미지';
    }
    return '자료';
}

function getAttachmentPreviewSource(attachment) {
    if (attachment.thumbnailUrl) {
        return attachment.thumbnailUrl;
    }
    return attachment.type === 'video' ? FALLBACK_ICON.video : FALLBACK_ICON.image;
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderPromptWithChips(promptText, attachments) {
    if (!promptText) {
        return null;
    }

    const availableTags = attachments
        .map((attachmentItem) => attachmentItem.tag)
        .filter(Boolean)
        .sort((leftValue, rightValue) => rightValue.length - leftValue.length);

    if (!availableTags.length) {
        return promptText;
    }

    const splitPattern = new RegExp(`(${availableTags.map((tagValue) => escapeRegExp(tagValue)).join('|')})`, 'g');
    const promptParts = promptText.split(splitPattern).filter((part) => part.length > 0);

    return promptParts.map((part, index) => {
        if (availableTags.includes(part)) {
            return <span key={`${part}-${index}`} className="tag-chip">{part}</span>;
        }
        return <span key={`text-${index}`}>{part}</span>;
    });
}

export default function RunInputSummary({ input }) {
    const promptText = input?.promptText?.trim() ?? '';
    const attachments = input?.attachments ?? [];

    return (
        <section className="run-section">
          <h2 className="section-title">입력 정보</h2>
          <div className="run-input-block">
            <span className="run-input-label">프롬프트</span>
            {promptText ? <p className="run-input-prompt">{renderPromptWithChips(promptText, attachments)}</p> : <p className="run-placeholder">입력된 프롬프트가 없습니다.</p>}
          </div>
          <div className="run-input-block">
            <span className="run-input-label">자료</span>
            {attachments.length ? (
                <ul className="run-input-attachment-list">
                  {attachments.map((attachmentItem) => (
                      <li key={attachmentItem.id ?? `${attachmentItem.tag}-${attachmentItem.name}`} className="run-input-attachment-item">
                        <div className="run-input-attachment-preview">
                          <img src={getAttachmentPreviewSource(attachmentItem)} alt={attachmentItem.name} className="run-input-attachment-image" />
                          {attachmentItem.type === 'video' ? <span className="run-input-attachment-play">▶</span> : null}
                        </div>
                        <div className="run-input-attachment-meta">
                          <span className="run-input-attachment-tag">{attachmentItem.tag}</span>
                          <span className="run-input-attachment-name">{attachmentItem.name}</span>
                          <span className="run-input-attachment-type">{getAttachmentTypeLabel(attachmentItem.type)}</span>
                        </div>
                      </li>
                  ))}
                </ul>
            ) : (
                <p className="run-placeholder">첨부된 자료가 없습니다.</p>
            )}
          </div>
        </section>
    );
}
