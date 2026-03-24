import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { AttachedFile } from '../../types/attachment';
import AttachmentList from './AttachmentList';
import RichTextInput from './RichTextInput';
import TagAutocomplete from './TagAutocomplete';

interface TaskInputProps {
  attachmentItems: AttachedFile[];
  fallbackImageIcon: string;
  isSendEnabled: boolean;
  autocompleteOpen: boolean;
  selectedAutocompleteIndex: number;
  autocompleteCandidates: AttachedFile[];
  onAttachFiles: (selectedFiles: FileList | null) => void;
  onRemoveAttachment: (attachmentId: number) => void;
  onSend: () => void;
  onEditorInput: () => void;
  onEditorKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onSelectAutocompleteCandidate: (attachmentItem: AttachedFile) => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export default function TaskInput({
  attachmentItems,
  fallbackImageIcon,
  isSendEnabled,
  autocompleteOpen,
  selectedAutocompleteIndex,
  autocompleteCandidates,
  onAttachFiles,
  onRemoveAttachment,
  onSend,
  onEditorInput,
  onEditorKeyDown,
  onSelectAutocompleteCandidate,
  editorRef
}: TaskInputProps) {
  const hiddenFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="composer" aria-label="입력 영역">
      <RichTextInput
        editorRef={editorRef}
        onInput={onEditorInput}
        onKeyDown={onEditorKeyDown}
      />
      <TagAutocomplete
        isOpen={autocompleteOpen}
        candidates={autocompleteCandidates}
        selectedIndex={selectedAutocompleteIndex}
        onSelect={onSelectAutocompleteCandidate}
      />
      <AttachmentList
        attachmentItems={attachmentItems}
        fallbackImageIcon={fallbackImageIcon}
        onRemoveAttachment={onRemoveAttachment}
      />
      <div className="composer-toolbar">
        <div className="toolbar-left">
          <input
            ref={hiddenFileInputRef}
            type="file"
            accept="video/*,image/*"
            multiple
            hidden
            onChange={(event) => {
              onAttachFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <button className="attach-button" type="button" onClick={() => hiddenFileInputRef.current?.click()}>+ 첨부</button>
        </div>
        <div className="toolbar-right">
          <button className={`send-button${isSendEnabled ? ' active' : ''}`} type="button" aria-label="전송" onClick={onSend}>→</button>
        </div>
      </div>
    </section>
  );
}
