import type { KeyboardEvent } from 'react';

interface RichTextInputProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  onInput: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export default function RichTextInput({ editorRef, onInput, onKeyDown }: RichTextInputProps) {
  return (
    <div
      ref={editorRef}
      className="prompt-editor"
      contentEditable
      role="textbox"
      aria-multiline="true"
      data-placeholder="밈 영상을 업로드하거나, 만들고 싶은 크리에이티브를 설명해주세요"
      onInput={onInput}
      onKeyDown={onKeyDown}
      suppressContentEditableWarning
    />
  );
}
