import PromptEditor from './PromptEditor';
import TagAutocomplete from './TagAutocomplete';
import AttachmentStrip from './AttachmentStrip';
import ComposerToolbar from './ComposerToolbar';
export default function Composer({ attachments, fallbackImageIcon, isSendEnabled, autocompleteOpen, selectedAutocompleteIndex, autocompleteCandidates, onAttachFiles, onRemoveAttachment, onSend, onEditorInput, onEditorKeyDown, onSelectAutocompleteCandidate, editorRef }) {
    return (<section className="composer" aria-label="입력 영역">
      <PromptEditor editorRef={editorRef} onInput={onEditorInput} onKeyDown={onEditorKeyDown}/>
      <TagAutocomplete isOpen={autocompleteOpen} candidates={autocompleteCandidates} selectedIndex={selectedAutocompleteIndex} onSelect={onSelectAutocompleteCandidate}/>
      <AttachmentStrip attachments={attachments} fallbackIcon={fallbackImageIcon} onRemoveAttachment={onRemoveAttachment}/>
      <ComposerToolbar isSendEnabled={isSendEnabled} onAttachFiles={onAttachFiles} onSend={onSend}/>
    </section>);
}
