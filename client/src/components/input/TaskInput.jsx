import { useRef } from 'react';
import AttachmentList from './AttachmentList';
import RichTextInput from './RichTextInput';
import TagAutocomplete from './TagAutocomplete';
export default function TaskInput({ attachmentItems, fallbackImageIcon, isSendEnabled, autocompleteOpen, selectedAutocompleteIndex, autocompleteCandidates, onAttachFiles, onRemoveAttachment, onSend, onEditorInput, onEditorKeyDown, onSelectAutocompleteCandidate, editorRef }) {
    const hiddenFileInputRef = useRef(null);
    return (<section className="composer" aria-label="입력 영역">
      <RichTextInput editorRef={editorRef} onInput={onEditorInput} onKeyDown={onEditorKeyDown}/>
      <TagAutocomplete isOpen={autocompleteOpen} candidates={autocompleteCandidates} selectedIndex={selectedAutocompleteIndex} onSelect={onSelectAutocompleteCandidate}/>
      <AttachmentList attachmentItems={attachmentItems} fallbackImageIcon={fallbackImageIcon} onRemoveAttachment={onRemoveAttachment}/>
      <div className="composer-toolbar">
        <div className="toolbar-left">
          <input ref={hiddenFileInputRef} type="file" accept="video/*,image/*" multiple hidden onChange={(event) => {
            onAttachFiles(event.target.files);
            event.target.value = '';
        }}/>
          <button className="attach-button" type="button" onClick={() => hiddenFileInputRef.current?.click()}>+ 첨부</button>
        </div>
        <div className="toolbar-right">
          <button className={`send-button${isSendEnabled ? ' active' : ''}`} type="button" aria-label="전송" onClick={onSend}>→</button>
        </div>
      </div>
    </section>);
}
