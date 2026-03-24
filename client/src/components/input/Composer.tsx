import type { KeyboardEvent } from 'react';
import type { AttachedFile } from '../../types/attachment';
import PromptEditor from './PromptEditor';
import TagAutocomplete from './TagAutocomplete';
import AttachmentStrip from './AttachmentStrip';
import ComposerToolbar from './ComposerToolbar';

interface ComposerProps {
  attachments: AttachedFile[];
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

export default function Composer({
  attachments,
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
}: ComposerProps) {
  return (
    <section className="composer" aria-label="입력 영역">
      <PromptEditor editorRef={editorRef} onInput={onEditorInput} onKeyDown={onEditorKeyDown} />
      <TagAutocomplete
        isOpen={autocompleteOpen}
        candidates={autocompleteCandidates}
        selectedIndex={selectedAutocompleteIndex}
        onSelect={onSelectAutocompleteCandidate}
      />
      <AttachmentStrip
        attachments={attachments}
        fallbackIcon={fallbackImageIcon}
        onRemoveAttachment={onRemoveAttachment}
      />
      <ComposerToolbar isSendEnabled={isSendEnabled} onAttachFiles={onAttachFiles} onSend={onSend} />
    </section>
  );
}
